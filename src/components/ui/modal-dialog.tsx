import { useState, useEffect } from "react"
import type { ReactNode } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HighlightIcon } from "@/components/ui/highlight-icon"
import type { HighlightIconVariant } from "@/components/ui/highlight-icon"
import { InformativeCard, type InformativeCardState } from "@/components/ui/informative-card"

// ── Types ─────────────────────────────────────────────────────────────────────

export type ModalVariant = "confirmation" | "content"
export type ModalTone    = "default" | "warning" | "error" | "alert" | "success"

export type ModalDialogProps = {
  isOpen:             boolean
  onClose:            () => void
  variant?:           ModalVariant          // default: "confirmation"
  tone?:              ModalTone             // default: "default" — sets iconVariant + infoCardState together
  iconVariant?:       HighlightIconVariant  // overrides tone for the HighlightIcon circle
  infoCardState?:     InformativeCardState  // overrides tone for the InformativeCard
  showIcon?:          boolean               // default: true
  iconName?:          string                // Lucide icon name; falls back to Info
  title?:             string
  description?:       string
  slot?:              ReactNode             // custom content zone (content variant)
  slotUnstyled?:      boolean               // skip the surface wrapper on slot (no bg, no padding)
  informativeCard?:   string | boolean      // true → default text; string → custom title
  ctaPrimary?:        { label: string; destructive?: boolean; disabled?: boolean; onClick?: () => void }
  ctaSecondary?:      { label: string; disabled?: boolean; onClick?: () => void }
  /**
   * A third action, lowest in the hierarchy. Rare on purpose: a dialog with
   * three ways out is usually one that has not decided what it is asking.
   * The case it exists for is a save that can end in genuinely different
   * places — save and stay, save and start another, don't save.
   *
   * Rendered left of the other two, following the DS order
   * primary → secondary → tertiary read right to left in a right-aligned row.
   */
  ctaTertiary?:       { label: string; disabled?: boolean; onClick?: () => void }
  showClose?:         boolean               // default: true
  embedded?:          boolean               // static inline render for docs previews
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ModalDialog({
  isOpen,
  onClose,
  variant          = "confirmation",
  tone             = "default",
  iconVariant,
  infoCardState,
  showIcon         = true,
  iconName,
  title,
  description,
  slot,
  slotUnstyled,
  informativeCard,
  ctaPrimary,
  ctaSecondary,
  ctaTertiary,
  showClose        = true,
  embedded         = false,
}: ModalDialogProps) {
  const [mounted, setMounted] = useState(embedded || isOpen)
  const [show,    setShow]    = useState(embedded)

  useEffect(() => {
    if (embedded) return
    if (isOpen) {
      setMounted(true)
      // Double rAF: ensures the element is painted before transition begins
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShow(true)))
      return () => cancelAnimationFrame(id)
    } else {
      setShow(false)
      const t = setTimeout(() => setMounted(false), 220)
      return () => clearTimeout(t)
    }
  }, [isOpen, embedded])

  if (!embedded && !mounted) return null

  const isConfirmation = variant === "confirmation"

  // Tone → HighlightIconVariant (icon circle uses --hi-* tokens)
  const ICON_TONE_MAP: Record<ModalTone, HighlightIconVariant> = {
    default: "informative",
    warning: "alert",
    error:   "error",
    alert:   "alert",
    success: "success",
  }
  // Tone → InformativeCardState (card uses --ic-* tokens)
  const INFO_TONE_MAP: Record<ModalTone, InformativeCardState> = {
    default: "informative",
    warning: "alert",
    error:   "error",
    alert:   "alert",
    success: "success",
  }
  const resolvedIconVariant = iconVariant  ?? ICON_TONE_MAP[tone]
  const resolvedInfoState   = infoCardState ?? INFO_TONE_MAP[tone]

  const cardTransition = embedded ? {} : {
    transform:  show ? "scale(1) translateY(0px)" : "scale(0.96) translateY(16px)",
    opacity:    show ? 1 : 0,
    transition: show
      ? "opacity 240ms cubic-bezier(0.16, 1, 0.3, 1), transform 320ms cubic-bezier(0.16, 1, 0.3, 1)"
      : "opacity 160ms cubic-bezier(0.4, 0, 1, 1), transform 200ms cubic-bezier(0.4, 0, 1, 1)",
  }

  const card = (
    <div
      role={embedded ? undefined : "dialog"}
      aria-modal={embedded ? undefined : "true"}
      className={[
        "relative w-full rounded-[16px] flex flex-col gap-[10px] shadow-2xl",
        isConfirmation ? "p-[24px]" : "p-[32px]",
        !embedded && "max-w-[900px]",
      ].filter(Boolean).join(" ")}
      style={{
        background:           "var(--modal-surface)",
        backdropFilter:       "var(--modal-surface-blur, none)",
        WebkitBackdropFilter: "var(--modal-surface-blur, none)",
        border:               "1px solid var(--modal-border)",
        ...cardTransition,
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Close button — not a Button atom: 28×28 has no matching Button icon-alone
          size (24/40/56 only), and 28px is itself an established DS dimension
          (Chip's own "M" height, used consistently across 8+ components — see
          the 2026-08 spacing audit), not a one-off. Still fixed the JS-driven
          hover (was swapping style.color imperatively) to a plain CSS hover
          class, same two tokens as before. */}
      {showClose && (
        <button
          onClick={embedded ? undefined : onClose}
          aria-label="Close modal"
          className={[
            "absolute top-[16px] right-[16px] w-[28px] h-[28px] flex items-center justify-center rounded-[8px] transition-colors",
            !embedded && "hover:[color:var(--modal-close-hover)]",
          ].filter(Boolean).join(" ")}
          style={{ color: "var(--modal-close-icon)" }}
        >
          <X className="w-[20px] h-[20px]" />
        </button>
      )}

      {/* ── Confirmation layout: centered column ─────────────────────────── */}
      {isConfirmation && (
        <div className="flex flex-col items-center gap-[12px] text-center">
          {showIcon && (
            <HighlightIcon size="lg" variant={resolvedIconVariant} iconName={iconName || "Info"} />
          )}
          {title && (
            <h2 className="text-xl font-semibold leading-snug" style={{ color: "var(--foreground)" }}>
              {title}
            </h2>
          )}
          {description && (
            <p className="text-sm leading-relaxed" style={{ color: "var(--field-supporting)" }}>
              {description}
            </p>
          )}
        </div>
      )}

      {/* ── Content layout: inline row (icon + title left-aligned) ─────────── */}
      {!isConfirmation && (
        <div className="flex items-start gap-[12px]">
          {showIcon && (
            <HighlightIcon size="lg" variant={resolvedIconVariant} iconName={iconName || "Info"} />
          )}
          <div className="flex-1 min-w-0">
            {title && (
              <h2 className="text-xl font-semibold leading-snug" style={{ color: "var(--foreground)" }}>
                {title}
              </h2>
            )}
            {description && (
              <p className="text-[13px] mt-[4px] leading-relaxed" style={{ color: "var(--field-supporting)" }}>
                {description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Slot — custom content area ─────────────────────────────────────── */}
      {slot && (
        slotUnstyled ? slot : (
          <div
            className="rounded-[12px] p-[16px] min-h-[80px]"
            style={{ background: "var(--modal-slot-bg)" }}
          >
            {slot}
          </div>
        )
      )}

      {/* ── Informative card ──────────────────────────────────────────────── */}
      {informativeCard && (
        <InformativeCard
          state={resolvedInfoState}
          title={typeof informativeCard === "string"
            ? informativeCard
            : "This action cannot be undone. Please review carefully before confirming."}
        />
      )}

      {/* ── CTAs ──────────────────────────────────────────────────────────── */}
      {(ctaPrimary || ctaSecondary || ctaTertiary) && (
        <div className={[
          "flex items-center gap-[12px] pt-[8px]",
          isConfirmation ? "justify-center" : "justify-end",
        ].join(" ")}>
          {ctaTertiary && (
            <Button
              variant="tertiary"
              size="default"
              disabled={ctaTertiary.disabled}
              onClick={embedded ? undefined : ctaTertiary.onClick}
            >
              {ctaTertiary.label}
            </Button>
          )}
          {ctaSecondary && (
            <Button
              variant="secondary"
              size="default"
              disabled={ctaSecondary.disabled}
              onClick={embedded ? undefined : ctaSecondary.onClick}
            >
              {ctaSecondary.label}
            </Button>
          )}
          {ctaPrimary && (
            <Button
              variant={ctaPrimary.destructive ? "warning" : "primary"}
              size="default"
              disabled={ctaPrimary.disabled}
              onClick={embedded ? undefined : ctaPrimary.onClick}
            >
              {ctaPrimary.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )

  // Embedded mode: just the card, no overlay, no animation
  if (embedded) return card

  // Real modal: fixed scrim + animated card
  return (
    <div
      // z-[10020]: same reasoning as SlideOut's z-[10010] — a modal is a top-level,
      // app-wide overlay and must out-rank any fixed-position chrome, including
      // this doc site's full-screen preview wrappers (z-index up to 10002).
      className="fixed inset-0 z-[10020] flex items-center justify-center p-[16px]"
      style={{
        background:           "var(--modal-scrim)",
        backdropFilter:       "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        opacity:    show ? 1 : 0,
        transition: `opacity ${show ? "150ms" : "200ms"} ease-${show ? "out" : "in"}`,
        pointerEvents: show ? "auto" : "none",
      }}
      onClick={onClose}
      aria-hidden={embedded ? "true" : undefined}
    >
      {card}
    </div>
  )
}
