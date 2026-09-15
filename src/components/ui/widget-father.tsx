import { RotateCw, Info, MoreHorizontal, Pin, GripVertical, AlertCircle, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

export type WidgetCTADisposition = "horizontal" | "vertical"
export type WidgetCTAType        = "hug" | "full"
export type WidgetWidthClass     = "narrow" | "half" | "wide" | "xl" | "full"

export interface WidgetCTAProps {
  /** Number of CTA buttons (1 or 2). Default: 0 (none). */
  count?: 0 | 1 | 2
  disposition?: WidgetCTADisposition
  type?: WidgetCTAType
  primaryLabel?: string
  secondaryLabel?: string
  onPrimary?: () => void
  onSecondary?: () => void
}

export interface WidgetFatherProps {
  // ── Layout mode ────────────────────────────────────────────────────────────
  /** When true, strips the card shell (border/bg/padding/radius/shadow). Use
   *  when an outer CardContainer already provides the card shell (e.g. canvas). */
  noCard?: boolean
  // ── Header ─────────────────────────────────────────────────────────────────
  title: string
  /** Optional description line below title. Hidden when undefined. */
  description?: string
  /** Show info (ⓘ) action button. Default: false */
  showInfo?: boolean
  /** Show refresh (↺) action button. Default: true */
  showRefresh?: boolean
  /** Show overflow menu (⋮) action button. Default: true */
  showMenu?: boolean
  /** Show pin (📌) action button. Default: false */
  showPin?: boolean
  /** Drag/grab state — shows drag handle + active grab cursor. Default: false */
  isDragging?: boolean
  /** Hover state — highlights border, shadow, and shows drag handle. Default: false */
  isHovered?: boolean
  /** Override maxWidth constraint so widget fills its container. Default: false */
  fillWidth?: boolean
  /** Collapsed state — body and footer hidden with animation. Default: false */
  isCollapsed?: boolean
  /** Callback to toggle collapsed state. Only renders chevron button when defined. */
  onToggleCollapse?: () => void
  // ── Status ─────────────────────────────────────────────────────────────────
  /** Shows an error state — red border + dim content. Default: false */
  hasError?: boolean
  /** Shows a connection-problem state — warning border + message. Default: false */
  hasConnectionError?: boolean
  // ── CTA footer ─────────────────────────────────────────────────────────────
  cta?: WidgetCTAProps
  // ── Layout ─────────────────────────────────────────────────────────────────
  /** Width class for the card shell in documentation previews. Default: "narrow" */
  widthClass?: WidgetWidthClass
  className?: string
  /** The widget body content */
  children?: React.ReactNode
  onRefreshClick?: () => void
  onMenuClick?: () => void
  onInfoClick?: () => void
  onGripMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WIDTH_CLASS_PX: Record<WidgetWidthClass, number> = {
  narrow: 330,
  half:   505,
  wide:   680,
  xl:     760,
  full:   1020,
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ActionBtn({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex items-center justify-center rounded-[4px] transition-colors shrink-0"
      style={{
        width: 28, height: 28,
        padding: 4,
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "var(--widget-icon)",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--widget-action-hover-bg)" }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none" }}
    >
      {icon}
    </button>
  )
}

function WidgetCTAFooter({ cta }: { cta: WidgetCTAProps }) {
  const { count = 0, disposition = "horizontal", type = "hug", primaryLabel = "Primary action", secondaryLabel = "Secondary", onPrimary, onSecondary } = cta
  if (count === 0) return null

  const primaryBtn = (
    <button
      type="button"
      onClick={onPrimary}
      className="flex items-center justify-center transition-colors"
      style={{
        height: 28,
        padding: "4px 12px",
        background: "var(--primary)",
        border: "none",
        borderRadius: 100,
        color: "var(--color-button-primary-text-default)",
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        flex: type === "full" ? "1 0 0" : "none",
        whiteSpace: "nowrap",
      }}
    >
      {primaryLabel}
    </button>
  )

  const secondaryBtn = count === 2 ? (
    <button
      type="button"
      onClick={onSecondary}
      className="flex items-center justify-center transition-colors"
      style={{
        height: 28,
        padding: "4px 12px",
        background: "none",
        border: "1px solid var(--widget-border)",
        borderRadius: 100,
        color: "var(--widget-title)",
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        flex: type === "full" ? "1 0 0" : "none",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--widget-action-hover-bg)" }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none" }}
    >
      {secondaryLabel}
    </button>
  ) : null

  if (disposition === "vertical") {
    return (
      <div className="flex flex-col gap-[4px] w-full">
        {secondaryBtn}
        {primaryBtn}
      </div>
    )
  }

  return (
    <div className="flex gap-[4px] w-full" style={{ justifyContent: type === "hug" ? "flex-start" : "stretch" }}>
      {secondaryBtn}
      {primaryBtn}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function WidgetFather({
  noCard       = false,
  title,
  description,
  showInfo     = false,
  showRefresh  = true,
  showMenu     = true,
  showPin      = false,
  isDragging   = false,
  isHovered    = false,
  hasError     = false,
  hasConnectionError = false,
  fillWidth    = false,
  isCollapsed  = false,
  onToggleCollapse,
  cta,
  widthClass   = "narrow",
  className,
  children,
  onRefreshClick,
  onMenuClick,
  onInfoClick,
  onGripMouseDown,
}: WidgetFatherProps) {
  const borderColor = isHovered || isDragging
    ? "var(--widget-border-hover)"
    : "var(--widget-border)"

  const maxWidth = fillWidth ? "none" : WIDTH_CLASS_PX[widthClass]

  // Grip handle appears on hover (inviting drag) and while actively dragging
  const showGrip = isHovered || isDragging

  return (
    <div
      className={cn("flex flex-col gap-[12px]", className)}
      style={noCard ? {
        position: "relative",
        width: "100%",
        maxWidth: "none",
        minHeight: 0,
      } : {
        position: "relative",
        width: "100%",
        maxWidth,
        padding: 24,
        background: "var(--widget-bg)",
        border: `1px solid ${borderColor}`,
        borderRadius: 16,
        boxShadow: isHovered ? "0 4px 20px rgba(0,0,0,0.18)" : "none", // audit-ignore: Widget card hover shadow, pending Figma effect-name mapping (2026-08 audit)
        transition: "border-color 150ms, box-shadow 150ms",
        overflow: "hidden",
        minHeight: 0,
      }}
    >
      {/* ── Drag handle chip (absolutely positioned, floats left of card) ── */}
      <div
        onMouseDown={e => {
          if (!onGripMouseDown) return
          e.preventDefault()
          e.stopPropagation()
          onGripMouseDown(e)
        }}
        style={{
          position: "absolute",
          left: noCard ? -26 : -2,
          top: noCard ? 3 : 22,
          zIndex: 30,
          background: "var(--widget-bg)",
          border: "1px solid var(--widget-border)",
          boxShadow: "2px 2px 8px rgba(0,0,0,0.14)", // audit-ignore: Widget drag handle shadow, pending Figma effect-name mapping (2026-08 audit)
          borderRadius: 4,
          padding: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: isDragging ? "grabbing" : "grab",
          opacity: showGrip ? 1 : 0,
          pointerEvents: showGrip ? "auto" : "none",
          transition: "opacity 150ms",
        }}
      >
        <GripVertical size={14} style={{ color: "var(--widget-icon)" }} />
      </div>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-[8px]" style={{ minHeight: 28 }}>
        {/* Left: title + description — also the drag trigger when in canvas */}
        <div
          className="flex items-start gap-[4px] flex-1 min-w-0"
          onMouseDown={e => {
            if (!onGripMouseDown) return
            e.preventDefault()
            e.stopPropagation()
            onGripMouseDown(e)
          }}
          style={{ cursor: onGripMouseDown ? (isDragging ? "grabbing" : "grab") : "default" }}
        >
          <div className="flex flex-col gap-[2px] min-w-0">
            <span
              className="font-semibold uppercase tracking-[0.04em] truncate"
              style={{ fontSize: 12, color: "var(--widget-title)", letterSpacing: "0.48px" }}
            >
              {title}
            </span>
            {description && (
              <span
                className="text-xs leading-[1.4]"
                style={{ color: "var(--widget-subtitle)" }}
              >
                {description}
              </span>
            )}
          </div>
        </div>

        {/* Right: action buttons — max 2 visible */}
        <div className="flex items-center gap-[0px] shrink-0">
          {showPin     && <ActionBtn icon={<Pin size={14} />}          label="Pin widget"     />}
          {showInfo    && <ActionBtn icon={<Info size={14} />}         label="Widget info"   onClick={onInfoClick} />}
          {showRefresh && <ActionBtn icon={<RotateCw size={14} />}     label="Refresh"       onClick={onRefreshClick} />}
          {showMenu    && <ActionBtn icon={<MoreHorizontal size={14} />} label="More options" onClick={onMenuClick} />}
          {onToggleCollapse && (
            <ActionBtn
              icon={isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              label={isCollapsed ? "Expand widget" : "Collapse widget"}
              onClick={onToggleCollapse}
            />
          )}
        </div>
      </div>

      {/* ── Collapsible wrapper: Body + Footer CTA ──────────────────────
          flex-basis "auto" (not "0") so this hugs its content's natural
          height when the ancestor chain doesn't force a definite height
          (e.g. the Widgets Gallery preview cards) — flex-basis:0 made an
          auto-sized WidgetFather's content collapse to 0px there, since
          nothing was left to distribute via flex-grow. Still shrinks to
          fit (flex-shrink:1 + min-height:0) inside a fixed-height ancestor
          like the Live Canvas grid, so internal scroll still works. */}
      <div
        style={{
          flex: isCollapsed ? "0 0 0px" : "1 1 auto",
          maxHeight: isCollapsed ? 0 : 9999,
          overflow: "hidden",
          transition: "max-height 320ms cubic-bezier(0.4,0,0.2,1)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          minHeight: 0,
        }}
      >
        {/* ── Body ──────────────────────────────────────────────────────── */}
        {/* The content area SCROLLS rather than clipping. A widget is a fixed
            box — the canvas gives it rowSpan × 64 − 16 and nothing grows the
            slot — so content taller than the box had two possible outcomes
            and both were wrong: with overflow hidden the last row vanished
            with nothing to say it was there (a "Last scan · Aug 27" line
            disappeared exactly this way), and without it the card painted
            over the widget below and the canvas gaps stopped being real.
            Scrolling keeps the slot honest and the content reachable, which
            is also what the Last Activity widget's own spec asks for:
            "internal scroll for overflow". */}
        <div className="w-full" style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column" }}>
          {hasConnectionError ? (
            <div
              className="flex flex-col items-center justify-center rounded-[12px]"
              style={{
                width: "100%",
                border: "1px solid var(--field-border)",
                padding: "32px 24px",
                gap: 8,
              }}
            >
              <RotateCw size={32} style={{ color: "var(--primary)", flexShrink: 0 }} />
              <div className="flex flex-col items-center" style={{ gap: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-title)" }}>
                  No connection
                </span>
                <span style={{ fontSize: 12, color: "var(--color-text-subtitle)", textAlign: "center" }}>
                  Unable to connect to this widget. Check your internet connection.
                </span>
              </div>
              <div style={{ height: 8 }} />
              <button
                type="button"
                style={{
                  border: "1px solid var(--field-border)",
                  borderRadius: 100,
                  padding: "8px 16px",
                  fontSize: 12,
                  color: "var(--color-text-title)",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                Reload
              </button>
            </div>
          ) : hasError ? (
            <div
              className="flex flex-col items-center justify-center rounded-[12px]"
              style={{
                width: "100%",
                border: "1px solid var(--field-border)",
                padding: "32px 24px",
                gap: 8,
              }}
            >
              <AlertCircle size={32} style={{ color: "var(--color-surface-error-default)", flexShrink: 0 }} />
              <div className="flex flex-col items-center" style={{ gap: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-title)" }}>
                  Error loading data
                </span>
                <span style={{ fontSize: 12, color: "var(--color-text-subtitle)", textAlign: "center" }}>
                  An unexpected error occurred. Please try again.
                </span>
              </div>
              <div style={{ height: 8 }} />
              <button
                type="button"
                style={{
                  border: "1px solid var(--field-border)",
                  borderRadius: 100,
                  padding: "8px 16px",
                  fontSize: 12,
                  color: "var(--color-text-title)",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                Try again
              </button>
            </div>
          ) : (
            children ?? (
              <div
                className="flex items-center justify-center rounded-[8px]"
                style={{
                  minHeight: 80,
                  border: "1px dashed var(--color-border-primary-lighter)",
                  color: "var(--primary)",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Replace content here
              </div>
            )
          )}
        </div>

        {/* ── Footer CTA ────────────────────────────────────────────────── */}
        {cta?.count ? <WidgetCTAFooter cta={cta} /> : null}
      </div>
    </div>
  )
}
