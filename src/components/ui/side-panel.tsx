/**
 * Side Panel — AIMS OS DS · node 14423:32215
 * Inline layout panel: part of the flex row, not an overlay.
 * Opening shifts main content; closing shows a 48px strip (showCollapsedStrip).
 *
 * Side          : right (default) | left
 * Width presets : 350px (default) · 450px · half-screen (window.innerWidth / 2)
 * Resize handle : absolute on open edge — 1px blue line + grip dots, drag-to-snap
 * Collapsed     : 48px strip with panel-toggle icon + optional nav icons with Tooltip labels
 *
 * showCollapsedStrip   : show 48px strip on close (default true — set false for 0-width collapse)
 * showCollapsedIcons   : show nav icon list inside the strip (default true)
 * collapsedIcons       : { icon, label }[] — nav icons + tooltip label for each
 *
 * Header icons  : Button variant="tertiary" size="sm" iconPosition="alone"
 * Search        : Input leftIcon={Search} rightIcon={null}
 * Footer slot   : pass Button primary + secondary via footer prop
 */
import { cn } from "@/lib/utils"
import { useState, useRef, type ReactNode } from "react"
import { Search, MoreVertical, PanelRight, PanelLeft, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip } from "@/components/ui/tooltip"
import { HighlightIcon, type HighlightIconVariant } from "@/components/ui/highlight-icon"
import { Tag, type TagVariant } from "@/components/ui/tag"

// ── Types ─────────────────────────────────────────────────────────────────────

export type SidePanelSide = "left" | "right"

/** Color variant for the title icon highlight box — maps to --hi-{variant}-bg/icon tokens */
export type TitleIconVariant =
  | "informative" | "success" | "alert" | "error"
  | "neutral" | "yellow" | "lime" | "purple" | "lightblue"

/** Color variant for the title tag badge — maps to --tag-{variant}-* tokens */
export type TitleTagVariant =
  | "informative" | "success" | "alert" | "error"
  | "primary" | "secondary" | "neutral"
  | "limegreen" | "yellow" | "purple" | "lightblue"

export interface CollapsedIcon {
  /** The icon element to render */
  icon: ReactNode
  /** Tooltip text shown on hover — use the section name, e.g. "Configuration" */
  label: string
  /** Optional click handler — navigate to this section */
  onClick?: () => void
}

// ── Variant-name maps ────────────────────────────────────────────────────────
// TitleIconVariant/TitleTagVariant predate the shared HighlightIcon/Tag atoms
// and used slightly different casing for two colors — kept as-is here (it's
// public API other code may already call) and mapped to the atoms' own
// variant names instead of re-deriving --hi-*/--tag-* colors by hand.

const HI_VARIANT_MAP: Record<TitleIconVariant, HighlightIconVariant> = {
  informative: "informative", success: "success", alert: "alert", error: "error",
  neutral: "neutral", yellow: "yellow", lime: "lime", purple: "purple",
  lightblue: "light-blue",
}

const TAG_VARIANT_MAP: Record<TitleTagVariant, TagVariant> = {
  informative: "informative", success: "success", alert: "alert", error: "error",
  primary: "primary", secondary: "secondary", neutral: "neutral",
  limegreen: "limeGreen", yellow: "yellow", purple: "purple", lightblue: "lightBlue",
}

export interface SidePanelProps {
  open: boolean
  /** Called when collapse button is clicked. Wire as toggle: () => setOpen(o => !o) */
  onClose?: () => void
  side?: SidePanelSide
  title?: string
  description?: string
  /**
   * Optional icon shown in a 24×24 highlight box to the left of the title.
   * Use a 14–16px Lucide icon. The box color is controlled by titleIconVariant.
   */
  titleIcon?: ReactNode
  /**
   * Color variant for the icon highlight box. Default "informative" (blue).
   * Maps to --hi-{variant}-bg (background) and --hi-{variant}-icon (icon color).
   */
  titleIconVariant?: TitleIconVariant
  /**
   * Optional tag text shown inline next to the title (e.g. "Active", "Beta", "Draft").
   * Color is controlled by titleTagVariant.
   */
  titleTag?: string
  /**
   * Color / state variant for the title tag badge. Default "informative" (blue).
   * Maps to --tag-{variant}-* tokens.
   */
  titleTagVariant?: TitleTagVariant
  showSearch?: boolean
  searchPlaceholder?: string
  showMenu?: boolean
  /** Sticky footer — pass <Button primary> + <Button secondary> */
  footer?: ReactNode
  children?: ReactNode
  /** Starting width in px. Default 350. */
  defaultWidth?: number
  /** Snap presets for drag-to-resize (excluding half-screen, which is always a snap). Default [350, 450]. */
  widthPresets?: number[]
  /** Called when width snaps to a new preset via drag. */
  onWidthChange?: (width: number) => void
  /**
   * Show 48px strip when panel is closed. Default true.
   * Set false if you want the panel to fully collapse to 0.
   */
  showCollapsedStrip?: boolean
  /**
   * Show nav icons inside the collapsed strip. Default true.
   * Set false to only show the panel-toggle button.
   */
  showCollapsedIcons?: boolean
  /** Nav icons for collapsed strip. Each needs an icon + label for tooltip. */
  collapsedIcons?: CollapsedIcon[]
  className?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SidePanel({
  open,
  onClose,
  side = "right",
  title,
  description,
  titleIcon,
  titleIconVariant = "informative",
  titleTag,
  titleTagVariant = "informative",
  showSearch = false,
  searchPlaceholder = "Search…",
  showMenu = false,
  footer,
  children,
  defaultWidth = 350,
  widthPresets,
  onWidthChange,
  showCollapsedStrip = true,
  showCollapsedIcons = true,
  collapsedIcons,
  className,
}: SidePanelProps) {
  const [searchValue, setSearchValue]   = useState("")
  const [isActiveDrag, setIsActiveDrag] = useState(false)
  const [currentWidth, setCurrentWidth] = useState(defaultWidth)
  const dragRef = useRef<{ startX: number; startWidth: number; active: boolean }>({
    startX: 0, startWidth: 0, active: false,
  })

  const isRight     = side === "right"
  const presets     = widthPresets ?? [350, 450]
  const COLLAPSED_W = 48
  // ── Drag-to-resize — 3 snap points: presets[0] · presets[1] · half-screen ───
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const snapHalf  = Math.floor(window.innerWidth / 2)
    const snapPoints = [...presets, snapHalf]
    const snapMin   = presets[0]
    dragRef.current = { startX: e.clientX, startWidth: currentWidth, active: true }
    setIsActiveDrag(true)

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current.active) return
      document.body.style.cursor     = "col-resize"
      document.body.style.userSelect = "none"
      const delta = isRight
        ? dragRef.current.startX - ev.clientX
        : ev.clientX - dragRef.current.startX
      const newW = Math.max(snapMin, Math.min(snapHalf, dragRef.current.startWidth + delta))
      setCurrentWidth(newW)
      onWidthChange?.(newW)
    }

    const onMouseUp = (ev: MouseEvent) => {
      dragRef.current.active         = false
      document.body.style.cursor     = ""
      document.body.style.userSelect = ""
      setIsActiveDrag(false)
      const delta  = isRight
        ? dragRef.current.startX - ev.clientX
        : ev.clientX - dragRef.current.startX
      const finalW  = Math.max(snapMin, Math.min(snapHalf, dragRef.current.startWidth + delta))
      const closest = snapPoints.reduce((prev, curr) =>
        Math.abs(curr - finalW) < Math.abs(prev - finalW) ? curr : prev
      )
      setCurrentWidth(closest)
      onWidthChange?.(closest)
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup",   onMouseUp)
    }

    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup",   onMouseUp)
  }

  // ── Shared visual style ────────────────────────────────────────────────────
  const sharedStyle = {
    background:   "var(--side-panel-bg)",
    borderTop:    "1px solid var(--side-panel-border)",
    borderBottom: "1px solid var(--side-panel-border)",
    borderLeft:    isRight  ? "1px solid var(--side-panel-border)" : "none",
    borderRight:  !isRight  ? "1px solid var(--side-panel-border)" : "none",
  }
  const sharedRadius = isRight
    ? "rounded-tl-[24px] rounded-bl-[24px]"
    : "rounded-tr-[24px] rounded-br-[24px]"

  const outerWidth = open
    ? currentWidth
    : showCollapsedStrip ? COLLAPSED_W : 0

  return (
    <div
      className="flex-shrink-0 h-full overflow-hidden"
      style={{
        width: outerWidth,
        transition: isActiveDrag ? "none" : "width 300ms ease-in-out",
      }}
    >

      {/* ── Collapsed strip ──────────────────────────────────────────────────── */}
      {!open && showCollapsedStrip && (
        <div
          className={cn(
            "flex flex-col items-center pt-[10px] gap-[6px] h-full",
            sharedRadius,
          )}
          style={{ width: COLLAPSED_W, ...sharedStyle }}
        >
          {/* Panel-toggle icon — always shown */}
          <Tooltip content={title ?? "Open panel"} side="cursor">
            <Button
              variant="tertiary"
              size="sm"
              iconPosition="alone"
              icon={isRight ? <PanelRight size={14} /> : <PanelLeft size={14} />}
              aria-label="Open panel"
              onClick={onClose}
            />
          </Tooltip>

          {/* Nav icons — only shown when showCollapsedIcons = true */}
          {showCollapsedIcons && collapsedIcons?.map((item, i) => (
            <Tooltip key={i} content={item.label} side="cursor" triggerClassName="flex">
              <Button
                variant="tertiary"
                size="sm"
                iconPosition="alone"
                icon={item.icon}
                aria-label={item.label}
                onClick={item.onClick}
              />
            </Tooltip>
          ))}
        </div>
      )}

      {/* ── Full panel ──────────────────────────────────────────────────────── */}
      {open && (
        <div
          className={cn(
            "relative flex flex-col h-full backdrop-blur-[5px]",
            sharedRadius,
            className,
          )}
          style={{ width: currentWidth, ...sharedStyle }}
        >
          {/* Drag handle — absolute on open edge, same visual as Slide Out */}
          <div
            className="absolute top-0 bottom-0 z-10 group/rz flex items-center"
            style={{
              [isRight ? "left" : "right"]: 0,
              width: 12,
              cursor: "col-resize",
            }}
            onMouseDown={handleResizeMouseDown}
          >
            <div
              className="absolute inset-y-0 opacity-0 group-hover/rz:opacity-100 transition-opacity duration-150"
              style={{ [isRight ? "left" : "right"]: 0, width: 1, background: "var(--primary)" }}
            />
            <div
              className="absolute flex flex-col gap-[3px] opacity-0 group-hover/rz:opacity-100 transition-opacity duration-150"
              style={{
                [isRight ? "left" : "right"]: 4,
                top: "50%", transform: "translateY(-50%)",
              }}
            >
              {[0, 1, 2].map(i => (
                <div key={i} className="rounded-full" style={{ width: 3, height: 3, background: "var(--primary)" }} />
              ))}
            </div>
          </div>

          {/* ── Header ── */}
          <div className="flex flex-col gap-[16px] p-[24px] pb-0 flex-shrink-0">
            <div className="flex items-start gap-[8px] w-full">
              {/* Title section: optional icon highlight + title/tag/description */}
              <div className="flex flex-1 items-start gap-[8px] min-w-0">
                {/* Icon highlight box — color controlled by titleIconVariant */}
                {titleIcon && (
                  <HighlightIcon size="sm" variant={HI_VARIANT_MAP[titleIconVariant]} icon={titleIcon} />
                )}
                {/* Title + tag row + description */}
                <div className="flex flex-1 flex-col gap-[8px] min-w-0">
                  {/* Title row: truncates with tooltip on overflow (same as Slide Out) */}
                  <div className="flex items-start gap-[8px] w-full">
                    {title && (
                      <Tooltip content={title} side="cursor" triggerClassName="flex-1 min-w-0 block">
                        <p
                          className="font-semibold truncate block"
                          style={{ fontSize: 18, letterSpacing: "0.25px", lineHeight: 1.2, color: "var(--foreground)" }}
                        >
                          {title}
                        </p>
                      </Tooltip>
                    )}
                    {titleTag && (
                      <Tag size="sm" variant={TAG_VARIANT_MAP[titleTagVariant]} className="shrink-0 whitespace-nowrap">
                        {titleTag}
                      </Tag>
                    )}
                  </div>
                  {/* Description: clamps to 2 lines, tooltip shows full text on overflow */}
                  {description && (
                    <Tooltip content={description} side="cursor" triggerClassName="block min-w-0">
                      <p
                        className="text-sm font-medium"
                        style={{
                          color: "var(--field-supporting)",
                          lineHeight: "20px",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {description}
                      </p>
                    </Tooltip>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-[2px] flex-shrink-0">
                {showMenu && (
                  <Button
                    variant="tertiary"
                    size="sm"
                    iconPosition="alone"
                    icon={<MoreVertical size={14} />}
                    aria-label="Panel menu"
                  />
                )}
                {/* Collapse or close: with no strip to collapse into, the
                    control dismisses the panel outright, so it says X. */}
                <Tooltip content={showCollapsedStrip ? "Collapse panel" : "Close panel"}>
                  <Button
                    variant="tertiary"
                    size="sm"
                    iconPosition="alone"
                    icon={
                      showCollapsedStrip
                        ? (isRight ? <PanelRight size={14} /> : <PanelLeft size={14} />)
                        : <X size={14} />
                    }
                    aria-label={showCollapsedStrip ? "Collapse panel" : "Close panel"}
                    onClick={onClose}
                  />
                </Tooltip>
              </div>
            </div>

            {showSearch && (
              <Input
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                leftIcon={<Search size={16} />}
                rightIcon={null}
              />
            )}
          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto p-[24px] min-h-0">
            {children}
          </div>

          {/* ── Footer ── */}
          {footer && (
            <div className="flex items-center justify-end gap-[8px] px-[24px] pb-[24px] pt-0 flex-shrink-0">
              {footer}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
