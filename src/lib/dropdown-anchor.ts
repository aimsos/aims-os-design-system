import { useLayoutEffect, useRef, useState } from "react"

/**
 * Dropdown anchoring — AIMS OS Design System
 *
 * One rule, one implementation. Confirmed by Michael (2026-09-02):
 *
 *   A dropdown's LEFT edge aligns with its trigger's LEFT edge, 4px below —
 *   never centred on the trigger, never at the mouse position. If the panel
 *   would run off the right of the viewport, it flips: RIGHT edges align
 *   instead. The flip is automatic, not a per-screen decision.
 *
 * The same holds vertically, and for the same reason. A panel opened near the
 * bottom of the window used to run past it and simply end — a nine-column list
 * showing three, with nothing to say the rest existed. It now flips ABOVE the
 * trigger when there is more room there, and whichever side it lands on, its
 * height is capped to the space actually available and the list scrolls inside
 * it. Flip alone is not enough: a short viewport has no room on either side, so
 * the cap is what makes "never cut off" true rather than usually true. This is
 * the flip + shift + size behaviour every floating-UI library converges on.
 *
 * The previous rule centred the panel (`translateX(-50%)`), which reads fine
 * on a narrow trigger and badly on a wide one, and pushes a long panel off
 * screen near the right edge. Tooltips and the Slider thumb still centre on
 * their anchor — that is correct for them, and this helper does not apply.
 *
 * Panels here are `w-auto`, so the width is not known until the panel is in
 * the DOM. The hook measures it before paint (useLayoutEffect) and flips in
 * the same frame, so the user never sees it jump.
 *
 * Usage:
 *
 *   const [anchor, setAnchor] = useState<DropdownAnchor | null>(null)
 *   const { ref, style } = useDropdownPosition(anchor)
 *
 *   onClickCapture={(e) => setAnchor(anchorFromEvent(e))}
 *
 *   {anchor && <div ref={ref} style={{ position: "fixed", zIndex: 10001, ...style }}>…</div>}
 */

export interface DropdownAnchor {
  /** Trigger's left edge, viewport coordinates. */
  left:   number
  /** Distance from the viewport's right edge to the trigger's right edge. */
  right:  number
  /** Trigger's bottom edge — the panel sits 4px below this. */
  top:    number
  /**
   * Distance from the viewport's bottom to the trigger's TOP edge — where a
   * flipped panel's bottom sits. Kept as a distance rather than a coordinate
   * for the same reason `right` is: it maps straight onto the CSS property, so
   * the panel is anchored without anyone having to know its height.
   */
  bottom: number
}

/** Gap between trigger and panel. Spacing/1x. */
const GAP = 4

/** Breathing room kept between the panel and the viewport edge. */
const EDGE_MARGIN = 16

/**
 * The anchor for an element that IS the trigger — a field, a `Select`'s row, a
 * button you already hold a ref to.
 *
 * Added 2026-09-10, because `anchorFromEvent` below only ever understood one
 * of the three trigger shapes the DS actually publishes. It looks for a
 * `<button>`, and neither of the other two is one: `Select` renders a div, and
 * a typeahead is an `<input>`. Both were silently falling through to the
 * pointer-position branch — which is not a fallback here, it is the exact
 * behaviour the rule at the top of this file forbids. A panel opened from a
 * wide field landed wherever the cursor happened to be inside it, and a field
 * focused by KEYBOARD had no pointer at all, so it landed at (0, 0).
 *
 * That is why this is a function rather than a fix inside the event helper:
 * the element is the thing that has a position, and an event only sometimes
 * knows which element that was.
 */
export function anchorFromElement(el: Element): DropdownAnchor {
  const r = el.getBoundingClientRect()
  return {
    left:   r.left,
    right:  window.innerWidth - r.right,
    top:    r.bottom,
    bottom: window.innerHeight - r.top,
  }
}

/**
 * Reads the anchor from a click on (or inside) the trigger. A `<button>` first,
 * then a field or a combobox row, and only then the pointer — which should not
 * happen in normal use and is a bug wherever it does, since a panel at the
 * cursor is what the rule at the top of this file exists to prevent.
 */
export function anchorFromEvent(e: { target: EventTarget | null; clientX: number; clientY: number }): DropdownAnchor {
  const target = e.target as HTMLElement | null
  const trigger = target?.closest("button")
    /* A Select's own row and a typeahead input. Checked after the button so
       that nothing which works today changes: a click inside a button still
       resolves to the button, exactly as before. */
    ?? target?.closest('input, textarea, [role="combobox"]')
  if (!trigger) {
    return {
      left:   e.clientX,
      right:  window.innerWidth - e.clientX,
      top:    e.clientY,
      bottom: window.innerHeight - e.clientY,
    }
  }
  return anchorFromElement(trigger)
}

/** Below this a panel is not worth showing at all — flip rather than squeeze. */
const MIN_PANEL_HEIGHT = 140

/**
 * Returns the ref to attach to the panel and the positioning style to spread
 * onto it. Left-aligned by default; flips to right-aligned when the measured
 * panel would cross the viewport's right edge.
 */
export function useDropdownPosition(anchor: DropdownAnchor | null) {
  const ref = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState({ flipX: false, flipY: false, maxHeight: 0 })

  useLayoutEffect(() => {
    if (!anchor || !ref.current) return
    const el = ref.current
    // scrollHeight, not offsetHeight: the cap from a previous open would make
    // offsetHeight report the cap back to us and the panel would never unflip.
    const wanted = el.scrollHeight
    const width  = el.offsetWidth

    const roomBelow = window.innerHeight - anchor.top    - GAP - EDGE_MARGIN
    const roomAbove = window.innerHeight - anchor.bottom - GAP - EDGE_MARGIN

    // Stay below unless it does not fit AND above is genuinely roomier. A panel
    // that fits below never moves, so the common case is stable.
    const flipY = wanted > roomBelow && roomAbove > roomBelow
    const room  = flipY ? roomAbove : roomBelow

    setPlacement({
      flipX: anchor.left + width > window.innerWidth - EDGE_MARGIN,
      flipY,
      // Only cap when the panel actually overflows — otherwise a short list
      // would get a scroll container it has no use for.
      maxHeight: wanted > room ? Math.max(MIN_PANEL_HEIGHT, room) : 0,
    })
  }, [anchor])

  const { flipX, flipY, maxHeight } = placement

  const style: React.CSSProperties = anchor
    ? {
        // Horizontal: left edges align, or right edges when the panel would
        // cross the viewport's right edge.
        ...(flipX ? { right: anchor.right } : { left: anchor.left }),
        // Vertical: below the trigger, or above it when below cannot hold it.
        ...(flipY ? { bottom: anchor.bottom + GAP } : { top: anchor.top + GAP }),
        ...(maxHeight ? { maxHeight, overflowY: "auto" as const } : null),
      }
    : {}

  return { ref, style }
}
