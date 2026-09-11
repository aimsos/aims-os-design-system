/**
 * Slide Out — AIMS OS DS · node 5066:9783
 * Frosted-glass overlay panel from the right.
 * type="with-variants" | "full-slot"  ×  size="m" | "s"
 * Default width : 350px · Expands to 450px → half-screen via drag-to-resize
 *
 * Panel surface : Surface/Floating/Default — rgba(255,255,255,0.92) light | rgba(16,22,40,0.92) dark
 * Backdrop-blur : 30px
 * Shadow        : -24px -24px 60px 0px rgba(0,0,0,0.08)
 * Radius        : Radius-XL 24px (M) | Radius-L 16px (S) — top-left + bottom-left only
 *
 * Resize handle : hover left edge → blue 2px line + grip dots → drag snaps to 350 / 450 / half-screen
 */
import { useEffect, useState, useRef } from "react"
import { createPortal } from "react-dom"
import { X, Pencil, Search, ChevronRight, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tabs, type TabItem } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip } from "@/components/ui/tooltip"
import { Chip } from "@/components/ui/chip"

// ── Types ─────────────────────────────────────────────────────────────────────

export type SlideOutType = "with-variants" | "full-slot"
export type SlideOutSize = "m" | "s"
/**
 * Which edge of the viewport the panel is anchored to.
 * - "right"  (default): full-height panel, slides in from the right edge.
 *                       Rounded on the left corners only. Resizable.
 * - "bottom": full-width bottom sheet, slides in from the bottom edge.
 *                       Rounded on the top corners only. Fixed height (80vh
 *                       capped at 720px). Not resizable — the drag-to-resize
 *                       gesture is specific to the right-anchor.
 */
export type SlideOutAnchor = "right" | "bottom"

export interface SlideOutProps {
  open: boolean
  onClose: () => void
  /** Panel type. Default: "with-variants" */
  type?: SlideOutType
  /** Width + radius variant. Default: "m" */
  size?: SlideOutSize
  /** Viewport edge the panel is anchored to. Default: "right" */
  anchor?: SlideOutAnchor
  /** Close panel when backdrop is clicked. Default: true */
  closeOnBackdrop?: boolean
  /**
   * When true, renders the panel inline without portal or backdrop.
   * Used for playground previews. Default: false
   */
  previewMode?: boolean
  /**
   * Whether the left edge drag-to-resize handle is shown.
   * Only applies in portal mode, right-anchored. Default: true
   */
  resizable?: boolean

  // ── Header (with-variants only) ──────────────────────────────────────────
  title?: string
  /** DS prop: description. Optional subtitle below title. */
  subtitle?: string
  /** DS prop: icon. Show purple highlight icon in header. Default: true */
  showIcon?: boolean
  /** Custom content for the header icon container. Default: <Sparkles/> */
  iconContent?: React.ReactNode
  /**
   * Background of the header icon container. Default: purple (unchanged
   * behavior for every existing caller). Set this whenever `iconContent`
   * represents a specific colored source elsewhere in the UI (e.g. a
   * workflow/agent item's own HighlightIcon) — the panel should read as
   * "the same item, now in detail," not switch to an unrelated color.
   */
  iconBg?: string
  /** DS prop: status. Show green status tag. Default: true */
  showStatus?: boolean
  statusLabel?: string
  /** DS prop: topButton. Show edit/action button in header. Default: true */
  showTopButton?: boolean
  /**
   * Custom icon for the top button — swap per context.
   * Examples: <MoreHorizontal/> for a menu, <ExternalLink/> for a page redirect.
   * Default: <Pencil size={14}/>
   */
  topButtonIcon?: React.ReactNode
  /**
   * Receives the native click event so callers can anchor a contextual
   * menu (e.currentTarget.getBoundingClientRect()) — additive, backward
   * compatible: existing `() => {...}` callbacks that ignore the argument
   * still work unchanged.
   */
  onTopButtonClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  /** Optional Tooltip content for the top button — explains what it does before the click. Additive/optional; omitted = no Tooltip (unchanged default). */
  topButtonTooltip?: string
  /** DS prop: close. Show X close button. Default: true */
  showClose?: boolean

  // ── Tabs (with-variants only) ─────────────────────────────────────────────
  /** DS prop: tabs. Default: true */
  showTabs?: boolean
  /** DS prop: tab3. Show third tab. Default: true */
  showTab3?: boolean
  tabLabels?: [string, string, string]
  activeTab?: number
  onTabChange?: (i: number) => void

  // ── Search (with-variants only) ───────────────────────────────────────────
  /** DS prop: searchBar. Default: true */
  showSearchBar?: boolean

  // ── Chips (with-variants only) ────────────────────────────────────────────
  /** DS prop: chips. Default: true */
  showChips?: boolean
  chipLabels?: string[]
  activeChip?: number
  onChipChange?: (i: number) => void

  // ── Slot ──────────────────────────────────────────────────────────────────
  /** Replaces the "Replace content here" placeholder when provided */
  children?: React.ReactNode

  // ── CTA footer (with-variants only) ──────────────────────────────────────
  /** DS prop: cta. Show bottom action buttons. Default: true */
  showCta?: boolean
  /**
   * Additive — a footer with a single action (nothing to reject/skip,
   * e.g. a read-only recommendation's own "Apply") omits the secondary
   * button instead of forcing a placeholder one just to fill the pair.
   * Default: true (unchanged 2-button footer).
   */
  showCtaSecondary?: boolean
  /**
   * Footer button size, when the panel's own size is the wrong thing to derive
   * it from. Added 2026-09-11.
   *
   * The footer took `isM ? "default" : "sm"`, which couples the BUTTON's size
   * to the PANEL's width — and those answer different questions. A 350px
   * panel is a width decision; whether its footer needs 40px buttons is a
   * density decision, and at 350px two M buttons with real labels run out of
   * room and truncate ("iew the activity log"). Optional, and the default is
   * the old derivation, so no existing panel moves.
   */
  /**
   * WHICH SNAP THE PANEL OPENS ON. Added 2026-09-11.
   *
   * The drag already snaps to 350 / 450 / half-screen; what was missing was a
   * way to START on one of them. Content decides this, not the caller's taste:
   * a preview you skim belongs at 350, and a panel whose job is to let you
   * READ something — a note somebody wrote in full paragraphs — wastes the
   * reader's time at a width that wraps every sentence three times.
   *
   * Named snaps rather than a pixel width, because the whole point of the
   * snap system is that a panel is never at an arbitrary width. "half" is
   * computed at open time, so it follows the window rather than freezing a
   * number from whatever the viewport was on first render.
   *
   * Optional, defaulting to the panel's own 350 — no existing caller moves.
   */
  initialSnap?: "default" | "medium" | "half"
  ctaSize?: "default" | "sm"
  ctaPrimaryLabel?: string
  ctaSecondaryLabel?: string
  onCtaPrimary?: () => void
  onCtaSecondary?: () => void

  /** DS prop: scrollbar. Show scrollbar in the panel. Default: false */
  showScrollbar?: boolean
  className?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SlideOut({
  open,
  onClose,
  type = "with-variants",
  size = "m",
  anchor = "right",
  closeOnBackdrop = true,
  previewMode = false,
  resizable = true,
  title = "Title of section",
  subtitle = "Subtitle with a short description of what the user can do here",
  showIcon = true,
  iconContent,
  iconBg = "var(--color-surface-purple-more-subtle)",
  showStatus = true,
  statusLabel = "Status",
  showTopButton = true,
  topButtonIcon,
  onTopButtonClick,
  topButtonTooltip,
  showClose = true,
  showTabs = true,
  showTab3 = true,
  tabLabels = ["Tab 1", "Tab 2", "Tab 3"],
  activeTab = 0,
  onTabChange,
  showSearchBar = true,
  showChips = true,
  chipLabels = ["All", "Category 1", "Category 2", "Category 3", "Category 4"],
  activeChip = 0,
  onChipChange,
  children,
  showCta = true,
  showCtaSecondary = true,
  initialSnap = "default",
  ctaSize,
  ctaPrimaryLabel = "Button",
  ctaSecondaryLabel = "Button",
  onCtaPrimary,
  onCtaSecondary,
  showScrollbar = false,
  className,
}: SlideOutProps) {
  const isM = size === "m"
  const isWithVariants = type === "with-variants"
  // The CTA footer used to be with-variants only, so a full-slot panel had
  // nowhere to put its main action and every screen put a small secondary
  // Button under its own title instead — a page-level control masquerading as
  // body content. full-slot has no DS-default footer, so it opts in by wiring
  // an action: no existing full-slot call site passes onCtaPrimary, which is
  // what makes this additive rather than a footer appearing on five screens.
  const showFooter = showCta && (isWithVariants || (type === "full-slot" && !!onCtaPrimary))
  const isBottom = anchor === "bottom"

  // ── Drag-to-resize state ────────────────────────────────────────────────
  const [dragWidth, setDragWidth] = useState<number | null>(null)
  const [isActiveDrag, setIsActiveDrag] = useState(false)
  const dragRef = useRef<{ startX: number; startWidth: number; active: boolean }>({
    startX: 0, startWidth: 0, active: false,
  })

  const defaultWidth = 350
  const SNAP_MEDIUM  = 450

  /* The opening width, recomputed each time the panel opens so "half" tracks
     the window instead of freezing whatever it was on first render. A drag
     always wins: once the reader has chosen a width, the caller's preference
     is no longer the authority on it. */
  const [snapWidth, setSnapWidth] = useState<number | null>(null)
  useEffect(() => {
    if (!open) { setSnapWidth(null); return }
    if (initialSnap === "default") { setSnapWidth(null); return }
    setSnapWidth(initialSnap === "medium" ? SNAP_MEDIUM : Math.floor(window.innerWidth / 2))
  }, [open, initialSnap])

  const panelWidth = dragWidth ?? snapWidth ?? defaultWidth

  // ── Chips scroll ref ────────────────────────────────────────────────────
  const chipsContainerRef = useRef<HTMLDivElement>(null)
  const scrollChips = () => {
    chipsContainerRef.current?.scrollBy({ left: 200, behavior: "smooth" })
  }

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (previewMode) return
    e.preventDefault()
    e.stopPropagation()
    const snapHalf  = Math.floor(window.innerWidth / 2)
    const snapPoints = [defaultWidth, SNAP_MEDIUM, snapHalf]
    const startWidth = dragWidth ?? snapWidth ?? defaultWidth
    dragRef.current = { startX: e.clientX, startWidth, active: true }
    setIsActiveDrag(true)

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current.active) return
      document.body.style.cursor     = "col-resize"
      document.body.style.userSelect = "none"
      const delta = dragRef.current.startX - ev.clientX
      const newW  = Math.max(defaultWidth, Math.min(snapHalf, dragRef.current.startWidth + delta))
      setDragWidth(newW)
    }

    const onMouseUp = (ev: MouseEvent) => {
      dragRef.current.active         = false
      document.body.style.cursor     = ""
      document.body.style.userSelect = ""
      setIsActiveDrag(false)
      const delta  = dragRef.current.startX - ev.clientX
      const finalW = Math.max(defaultWidth, Math.min(snapHalf, dragRef.current.startWidth + delta))
      const closest = snapPoints.reduce((prev, curr) =>
        Math.abs(curr - finalW) < Math.abs(prev - finalW) ? curr : prev
      )
      setDragWidth(closest === defaultWidth ? null : closest)
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup",   onMouseUp)
    }

    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup",   onMouseUp)
  }

  // ── Escape key ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (previewMode || !open) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onClose, previewMode])

  // ── Body scroll lock ────────────────────────────────────────────────────
  useEffect(() => {
    if (previewMode) return
    if (open) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [open, previewMode])

  const headerIcon = iconContent ?? <Sparkles size={isM ? 24 : 18} style={{ color: "var(--primary)" }} />

  const visibleTabItems: TabItem[] = (showTab3 ? tabLabels : [tabLabels[0], tabLabels[1]]).map(
    (label, i) => ({ id: String(i), label }),
  )

  // ── Icon buttons (topButton + close) ──────────────────────────────────
  const topBtnButton = showTopButton ? (
    <Button
      variant="tertiary"
      size="sm"
      iconPosition="alone"
      icon={topButtonIcon ?? <Pencil size={14} />}
      onClick={onTopButtonClick}
      aria-label={topButtonTooltip ?? "Top action"}
    />
  ) : null
  const TopBtn = topBtnButton && topButtonTooltip ? (
    <Tooltip content={topButtonTooltip} side="cursor">{topBtnButton}</Tooltip>
  ) : topBtnButton

  const CloseBtn = showClose ? (
    <Button
      variant="tertiary"
      size="sm"
      iconPosition="alone"
      icon={<X size={14} />}
      onClick={onClose}
      aria-label="Close panel"
    />
  ) : null

  // ── Panel aside ────────────────────────────────────────────────────────
  // Anchor-specific geometry:
  //   right-anchored (default): full-height, panelWidth wide, rounded-left,
  //                             slides in via translate-x.
  //   bottom-anchored:          full-width, ~80vh (max 720px) tall, rounded-top,
  //                             slides in via translate-y. Not resizable — the
  //                             drag handle is a right-anchor gesture.
  const asideStyle: React.CSSProperties = isBottom
    ? {
        width:        "100%",
        height:       "min(80vh, 720px)",
        padding:      "24px 24px 32px",
        gap:          isWithVariants ? 16 : isM ? 32 : 24,
        background:   "var(--slide-out-bg)",
        boxShadow:    "var(--slide-out-shadow)",
        borderRadius: isM ? "24px 24px 0 0" : "16px 16px 0 0",
        display:      "flex",
        flexDirection: "column",
        transition:   !previewMode
          ? "transform 300ms ease-out"
          : undefined,
      }
    : {
        width:        panelWidth,
        padding:      "32px 24px",
        gap:          isWithVariants ? 16 : isM ? 32 : 24,
        background:   "var(--slide-out-bg)",
        boxShadow:    "var(--slide-out-shadow)",
        borderRadius: isM ? "24px 0 0 24px" : "16px 0 0 16px",
        display:      "flex",
        flexDirection: "column",
        transition:   !previewMode && !isActiveDrag
          ? "width 220ms ease, transform 300ms ease-out"
          : undefined,
      }

  const aside = (
    <aside
      className={cn(
        "relative flex flex-col shrink-0 backdrop-blur-[30px]",
        // Height/width claim per anchor; the styles above pin the specific dimension
        isBottom ? "w-full" : "h-full",
        !previewMode && !isActiveDrag && "transition-transform duration-300 ease-out",
        // Slide direction per anchor
        !previewMode && (
          isBottom
            ? (open ? "translate-y-0" : "translate-y-full")
            : (open ? "translate-x-0" : "translate-x-full")
        ),
        showScrollbar ? "overflow-y-auto" : "overflow-hidden",
        className,
      )}
      style={asideStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "slide-out-title" : undefined}
    >
      {/* ── Drag-to-resize handle (portal mode, right-anchor only) ─────── */}
      {!previewMode && resizable && !isBottom && (
        <div
          className="absolute left-0 top-0 bottom-0 z-10 group/rz flex items-center"
          style={{ width: 12, cursor: "col-resize" }}
          onMouseDown={handleResizeMouseDown}
        >
          {/* Blue edge line — 1px per spec */}
          <div
            className="absolute inset-y-0 left-0 opacity-0 group-hover/rz:opacity-100 transition-opacity duration-150"
            style={{ width: 1, background: "var(--primary)" }}
          />
          {/* Grip dots */}
          <div
            className="absolute left-[5px] flex flex-col gap-[3px] opacity-0 group-hover/rz:opacity-100 transition-opacity duration-150"
            style={{ top: "50%", transform: "translateY(-50%)" }}
          >
            {[0, 1, 2].map(i => (
              <div key={i} className="rounded-full" style={{ width: 3, height: 3, background: "var(--primary)" }} />
            ))}
          </div>
        </div>
      )}

      {/* ── Header group (with-variants only) ─────────────────────────────── */}
      {isWithVariants && (
        <div
          className="flex flex-col items-start shrink-0 w-full"
          style={{ gap: isM ? 16 : 12 }}
        >
          {/* Size M header row */}
          {isM && (
            <div className="flex items-start gap-[4px] w-full">
              <div className="flex gap-[8px] items-start flex-1 min-w-0">
                {showIcon && (
                  <div
                    className="flex items-center justify-center shrink-0 rounded-[8px]"
                    style={{ width: 40, height: 40, padding: 8, background: iconBg }}
                  >
                    {headerIcon}
                  </div>
                )}
                <div className="flex flex-col gap-[8px] flex-1 min-w-0">
                  <div className="flex gap-[8px] items-center min-w-0">
                    <Tooltip content={title} side="cursor" triggerClassName="block min-w-0 flex-1">
                      <p
                        id="slide-out-title"
                        className="font-semibold truncate block"
                        style={{ fontSize: 24, letterSpacing: "0.25px", lineHeight: 1, color: "var(--color-text-title)" }}
                      >
                        {title}
                      </p>
                    </Tooltip>
                    {showStatus && (
                      <div
                        className="flex gap-[4px] items-center px-[8px] py-[4px] rounded-[8px] shrink-0"
                        style={{ height: 24, background: "var(--color-surface-success-more-subtle)", border: "1px solid var(--color-border-success-lighter)" }}
                      >
                        <span className="font-medium whitespace-nowrap leading-[20px]" style={{ fontSize: 14, color: "var(--color-text-success)" }}>
                          {statusLabel}
                        </span>
                      </div>
                    )}
                  </div>
                  {subtitle && (
                    <Tooltip content={subtitle} side="cursor" triggerClassName="block min-w-0">
                      <p
                        className="font-medium"
                        style={{
                          fontSize: 14,
                          color: "var(--slide-out-body)",
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        } as React.CSSProperties}
                      >
                        {subtitle}
                      </p>
                    </Tooltip>
                  )}
                </div>
              </div>
              <div className="flex gap-[4px] items-center shrink-0">
                {TopBtn}
                {CloseBtn}
              </div>
            </div>
          )}

          {/* Size S header row */}
          {!isM && (
            <div className="flex items-start gap-[4px] w-full">
              <div className="flex gap-[8px] items-start flex-1 min-w-0">
                {showIcon && (
                  <div
                    className="flex items-center justify-center shrink-0 rounded-[8px]"
                    style={{ width: 32, height: 32, padding: 8, background: iconBg }}
                  >
                    {headerIcon}
                  </div>
                )}
                <div className="flex flex-col gap-[4px] flex-1 min-w-0">
                  <div className="flex gap-[4px] items-center min-w-0">
                    <Tooltip content={title} side="cursor" triggerClassName="block min-w-0 flex-1">
                      <p
                        id="slide-out-title"
                        className="font-semibold truncate block"
                        style={{ fontSize: 18, letterSpacing: "0.25px", lineHeight: 1, color: "var(--color-text-title)" }}
                      >
                        {title}
                      </p>
                    </Tooltip>
                    {showStatus && (
                      <div
                        className="flex gap-[4px] items-center px-[8px] py-[4px] rounded-[8px] shrink-0"
                        style={{ height: 20, background: "var(--color-surface-success-more-subtle)", border: "1px solid var(--color-border-success-lighter)" }}
                      >
                        <span className="font-medium whitespace-nowrap leading-[20px]" style={{ fontSize: 12, color: "var(--color-text-success)" }}>
                          {statusLabel}
                        </span>
                      </div>
                    )}
                  </div>
                  {subtitle && (
                    <Tooltip content={subtitle} side="cursor" triggerClassName="block min-w-0">
                      <p
                        className="font-medium"
                        style={{
                          fontSize: 12,
                          color: "var(--slide-out-body)",
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        } as React.CSSProperties}
                      >
                        {subtitle}
                      </p>
                    </Tooltip>
                  )}
                </div>
              </div>
              <div className="flex gap-[4px] items-start shrink-0">
                {TopBtn}
                {CloseBtn}
              </div>
            </div>
          )}

          {/* DS Tabs — no border-bottom wrapper so inactive tabs have no underline */}
          {showTabs && (
            <Tabs
              items={visibleTabItems}
              activeId={String(activeTab)}
              onChange={(id) => onTabChange?.(Number(id))}
              size="s"
              className="w-full pb-[2px]"
            />
          )}

          {/* DS Input — search bar */}
          {showSearchBar && (
            <Input
              size="sm"
              leftIcon={<Search size={14} />}
              placeholder="Search"
            />
          )}
        </div>
      )}

      {/* ── Category chips (with-variants only) ───────────────────────────── */}
      {isWithVariants && showChips && (
        <div className="flex items-center gap-[6px] shrink-0 w-full">
          {/* Chip list — horizontal scroll, scrollbar hidden until hover (aims-scroll) */}
          <div
            ref={chipsContainerRef}
            className="aims-scroll flex gap-[8px] items-center flex-1 min-w-0"
            style={{ overflowX: "auto", paddingBottom: 2 }}
          >
            {chipLabels.map((label, i) => (
              <Chip
                key={i}
                variant={i === activeChip ? "primary" : "secondary"}
                size={isM ? "m" : "s"}
                className="shrink-0"
                onClick={() => onChipChange?.(i)}
              >
                {label}
              </Chip>
            ))}
          </div>
          {/* DS Button tertiary — scrolls chips right, has DS hover bg */}
          <Button
            variant="tertiary"
            size="sm"
            iconPosition="alone"
            icon={<ChevronRight size={14} />}
            onClick={scrollChips}
            aria-label="Scroll chips"
          />
        </div>
      )}

      {/* ── Content slot ─────────────────────────────────────────────────── */}
      {children ? (
        <ScrollArea axis="y" className="flex-1 min-h-0 w-full rounded-[8px]">
          {children}
        </ScrollArea>
      ) : (
        <div
          className="flex-1 min-h-0 flex flex-col items-center justify-center rounded-[8px] w-full"
          style={{ border: "1px dashed var(--color-border-primary-lighter)" }}
        >
          <span
            className="font-semibold whitespace-nowrap"
            style={{ fontSize: 18, lineHeight: 1, color: "var(--primary)" }}
          >
            Replace content here
          </span>
        </div>
      )}

      {/* ── CTA footer — DS Button component for correct hover states ─────── */}
      {showFooter && (
        <div className="flex gap-[8px] items-center justify-end shrink-0 w-full">
          {showCtaSecondary && (
            <Button
              variant="secondary"
              size={ctaSize ?? (isM ? "default" : "sm")}
              onClick={onCtaSecondary}
            >
              {ctaSecondaryLabel}
            </Button>
          )}
          <Button
            variant="primary"
            size={ctaSize ?? (isM ? "default" : "sm")}
            onClick={onCtaPrimary}
          >
            {ctaPrimaryLabel}
          </Button>
        </div>
      )}
    </aside>
  )

  // ── Inline (playground preview) ───────────────────────────────────────────
  if (previewMode) return aside

  // ── Portal (normal use) ───────────────────────────────────────────────────
  return createPortal(
    <div
      className={cn(
        // z-[10010]: SlideOut is a top-level, app-wide overlay — it portals to
        // document.body and must out-rank ANY fixed-position chrome a consuming
        // screen might have, including full-screen "live preview" wrappers in
        // this very doc site that use up to z-index 9999-10002 for their own
        // floating controls. A plain z-50 got silently buried behind those.
        "fixed inset-0 z-[10010] flex pointer-events-none",
        // Anchor: right → right column (panel hugs right edge, full height)
        //         bottom → bottom row (panel hugs bottom edge, full width)
        isBottom ? "items-end" : "justify-end",
        open && "pointer-events-auto",
      )}
      aria-hidden={!open}
    >
      {/* Scrim — semi-transparent overlay + backdrop blur for visual emphasis */}
      <div
        className={cn("absolute inset-0", open ? "opacity-100" : "opacity-0")}
        style={{
          background: "var(--slide-out-overlay)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          transition: "opacity 300ms ease",
        }}
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      {aside}
    </div>,
    document.body,
  )
}
