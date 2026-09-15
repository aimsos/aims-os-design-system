/**
 * ScrollArea — AIMS OS DS · node 4838:8343
 *
 * Scrollable container with DS-branded 4px custom scrollbar (Size S, only supported size).
 * Thumb is hidden by default and appears on container hover — never persistently visible.
 * Maintain Spacing/2x (8px) between the scrollbar and the scrollable content via padding.
 *
 * States:
 *   Default      → thumb transparent (hidden)
 *   Container hover → thumb visible · --field-scrollbar-thumb
 *   Thumb hover  → thumb darker · --scrollbar-thumb-hover
 *
 * Tokens: --field-scrollbar-thumb · --scrollbar-thumb-hover
 */

import { cn } from "@/lib/utils"
import { type ReactNode } from "react"

// ── Types ────────────────────────────────────────────────────────────────────

export interface ScrollAreaProps {
  children:   ReactNode
  /** Scroll axis. Default: "y" */
  axis?:      "y" | "x" | "both"
  /**
   * How far a child may paint OUTSIDE the cross axis before it is clipped, in
   * px. Default 16 — enough for CardContainer's hover halo
   * (`0 0 4px 1px` + `0 0 14px`), which is otherwise sliced off flat on both
   * sides for any card that fills the scroller's width.
   *
   * A scroll container clips at its PADDING box, so the fix is padding plus an
   * equal negative margin: the clip boundary moves out by `m`, the content box
   * stays exactly where it was, and children keep their full width and their
   * own padding. Nothing is given up.
   *
   * Not `overflow-x: clip` + `overflow-clip-margin`, which is the obvious
   * answer and does not work — measured in Chrome, `clip` on one axis beside
   * `auto` on the other computes back to `hidden`, and the clip margin then
   * applies to nothing. `overflow-x: visible` is coerced to `auto` for the same
   * reason and would add a horizontal scrollbar.
   *
   * Pass 0 to clip flush at the content box.
   */
  crossAxisClipMargin?: number
  className?: string
  style?:     React.CSSProperties
}

// ── Component ────────────────────────────────────────────────────────────────

export function ScrollArea({ children, axis = "y", crossAxisClipMargin = 16, className, style }: ScrollAreaProps) {
  return (
    <div
      className={cn(
        "aims-scroll",
        axis === "y"    && "overflow-y-auto",
        axis === "x"    && "overflow-x-auto",
        axis === "both" && "overflow-auto",
        className,
      )}
      style={{
        // Padding and negative margin are one unit: the padding is what moves
        // the clip boundary, the margin is what stops the content shifting.
        // `width/height: auto` is needed because a w-full/h-full caller sizes
        // the BORDER box, so padding would eat the content box instead.
        ...(axis === "y" && crossAxisClipMargin > 0
          ? { paddingInline: crossAxisClipMargin, marginInline: -crossAxisClipMargin, width: "auto" }
          : null),
        ...(axis === "x" && crossAxisClipMargin > 0
          ? { paddingBlock: crossAxisClipMargin, marginBlock: -crossAxisClipMargin, height: "auto" }
          : null),
        ...style,
      }}
    >
      {children}
    </div>
  )
}
