import { ArrowLeft } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { HighlightIcon, type HighlightIconVariant, type HighlightIconSize } from "@/components/ui/highlight-icon"
import { Menu, MenuItem } from "@/components/ui/menu-item"
import { MoreHorizontal } from "lucide-react"
import { useState, useRef, useEffect } from "react"

export type HeaderSize = "size-l" | "size-m" | "compress"
export type { HighlightIconVariant }

/**
 * Rank of a Header action. The DS maps it to a Button variant — screens never
 * name the variant themselves.
 *
 *   primary   → variant="main"       the one action the screen is for
 *   secondary → variant="secondary"  a supporting action
 *   tertiary  → variant="tertiary"   low-emphasis, e.g. a debug toggle
 */
export type HeaderActionPriority = "primary" | "secondary" | "tertiary"

export interface HeaderAction {
  label: string
  /** Lucide icon rendered before the label. */
  icon?: LucideIcon
  onClick?: () => void
  disabled?: boolean
  /** Defaults to "primary" on primaryAction and "secondary" on secondaryAction. */
  priority?: HeaderActionPriority
}

export interface HeaderProps {
  /** Page title — always required, always visible */
  title: string
  /** Subtitle below the title. Hidden in compress. */
  description?: string
  /**
   * Size variant. "size-m" = 18px title. "compress" = 18px, description/tag/icon
   * hidden; back button hidden unless showBackInCompress is true.
   *
   * "size-l" = 24px title + full padding, AND ONLY AT XL (≥1920px). Below that
   * it renders as "size-m" — the tall bar is for a Wide screen, and anywhere
   * narrower it spends height the content needs. Ask for it freely; the
   * component decides whether the screen has earned it.
   */
  size?: HeaderSize
  /** Tag node rendered inline after the title. Hidden in compress. */
  tag?: React.ReactNode
  /**
   * Breadcrumb trail, rendered above the title. From L2 onwards this is how a
   * page states where it sits — `Workers › Meridian`, parent plus current page,
   * not the whole path. It survives compress on purpose: losing the way back
   * the moment someone scrolls is the failure this replaces.
   *
   * A page with a breadcrumb does not also take a `backButton`: at L2 the first
   * crumb IS the way back, so an arrow beside it is two affordances pointing at
   * the same place.
   */
  breadcrumb?: React.ReactNode
  /** Shows an ArrowLeft back-navigation button. This is the ONLY thing that controls visibility. Hidden in compress unless showBackInCompress is also true. Do not combine with `breadcrumb`. */
  backButton?: boolean
  /** Click handler for the back button. Never affects visibility — use backButton for that. */
  onBack?: () => void
  /** Keep the back button visible in compress mode (requires backButton={true}). */
  showBackInCompress?: boolean
  /** Optional Lucide icon shown in a HighlightIcon (size sm by default). Hidden in compress. */
  icon?: LucideIcon
  /** HighlightIcon color variant for the icon slot. Defaults to "informative". */
  iconVariant?: HighlightIconVariant
  /** HighlightIcon box size for the icon slot. Default "sm" (24px), unchanged for every existing caller. Set "md"/"lg" to sit closer to a size-l title's visual height. */
  iconSize?: HighlightIconSize
  /**
   * The screen's one prioritised action. Declare WHAT the action is; the DS
   * decides how it looks.
   *
   * This used to take a ReactNode, which meant every screen wrote
   * `<Button variant="main">` itself — and nothing stopped it writing that
   * variant anywhere else. "One main per screen, only in the Header" lived in
   * CLAUDE.md and was broken 6 times in one PR and 7 in another. Screens no
   * longer choose the variant, so the rule cannot be broken.
   *
   * `priority` is about rank, not appearance: "primary" is the one action this
   * screen is for, and the DS renders it as main. Measured before this change,
   * 60% of Headers were NOT passing main — plenty of screens have a lower-rank
   * action or none at all — so the prop has to express that rather than force
   * the top variant on everyone.
   */
  primaryAction?: HeaderAction
  /** A second, lower-rank action beside the primary one. Defaults to "secondary" priority. */
  secondaryAction?: HeaderAction
  /** Actions behind a "···" overflow menu, placed before the CTAs.
   *
   *  Three screens had already written `DS-GAP: Header has no overflow slot`
   *  and put a kebab in a row underneath instead. CLAUDE.md documents the
   *  pattern in detail — Archive and Duplicate as defaults, icon + text, size S
   *  — so it is a real pattern the Header simply had nowhere to put.
   *
   *  Destructive actions belong here, not in `primaryAction`: an overflow menu
   *  is the one place a Delete is not one stray click away. */
  overflowActions?: HeaderAction[]
  /** Controls that are not actions: a notification bell, an inline rename, a
   *  split button, a saved-at indicator. Rendered before the overflow and the
   *  CTAs, right-aligned.
   *
   *  Untyped on purpose. `primaryAction` and `secondaryAction` are objects
   *  because the DS knows exactly what a CTA is and must own its variant — that
   *  is the whole reason no screen writes `variant="main"` any more. It does not
   *  know what a bell with a badge is, and pretending otherwise would produce a
   *  worse API than admitting it. Five call sites needed this and had to
   *  improvise a row under the Header instead.
   *
   *  Not a loophole for a CTA. If it is the page's main action, it is
   *  `primaryAction`. */
  aux?: React.ReactNode
  /**
   * Sticky filters row — shown only in compress mode, directly below the title row.
   * No border between the title row and this row. Renders after the gradient fade.
   * Use to keep Filters always visible when the header is compressed on scroll.
   */
  filters?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

const TITLE_PX: Record<HeaderSize, number> = {
  "size-l": 24,
  "size-m": 18,
  "compress": 18,
}

const PADDING: Record<HeaderSize, string> = {
  "size-l": "12px 24px",
  "size-m": "10px 24px",
  "compress": "8px 24px",
}

/** priority → Button variant. The one place this mapping lives. */
const VARIANT_BY_PRIORITY: Record<HeaderActionPriority, "main" | "secondary" | "tertiary"> = {
  primary:   "main",
  secondary: "secondary",
  tertiary:  "tertiary",
}

/** The "···" menu. Closes on outside click and on Escape — a menu that traps
 *  you is worse than no menu. */
function OverflowMenu({ actions }: { actions: HeaderAction[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", away)
    document.addEventListener("keydown", esc)
    return () => {
      document.removeEventListener("mousedown", away)
      document.removeEventListener("keydown", esc)
    }
  }, [open])

  return (
    <div ref={ref} className="relative shrink-0">
      <Button
        variant="tertiary"
        size="sm"
        aria-label="More actions"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen(v => !v)}
        icon={<MoreHorizontal size={16} strokeWidth={1.75} />}
        iconPosition="alone"
      />
      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] z-[10001]">
          <Menu className="w-auto min-w-[180px]">
            {actions.map(a => (
              <MenuItem
                key={a.label}
                label={a.label}
                size="sm"
                state={a.disabled ? "disabled" : "default"}
                leadingIcon={a.icon ? <a.icon size={14} strokeWidth={1.75} /> : undefined}
                onClick={() => { if (!a.disabled) { a.onClick?.(); setOpen(false) } }}
              />
            ))}
          </Menu>
        </div>
      )}
    </div>
  )
}

function renderAction(action: HeaderAction, fallback: HeaderActionPriority) {
  const { label, icon: Icon, onClick, disabled, priority = fallback } = action
  return (
    <Button
      variant={VARIANT_BY_PRIORITY[priority]}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      icon={Icon ? <Icon size={13} strokeWidth={1.75} /> : undefined}
      iconPosition={Icon ? "left" : undefined}
    >
      {label}
    </Button>
  )
}

/**
 * `size-l` IS A CEILING, NOT A SETTING (Michael, 2026-09-09).
 *
 * The 24px title and its taller padding are for a Wide screen. Everywhere
 * else that height is spent on a bar the reader has already read, and it is
 * spent at the top of the page where it costs the content most. So a caller
 * asking for `size-l` gets `size-m` until the viewport is genuinely wide, and
 * `size-l` only at XL.
 *
 * XL is 1920px — the DS breakpoint table (Figma node 6729:35011), tier `xl`,
 * "Wide". Not a number invented here.
 *
 * MEASURED ON THE VIEWPORT, not on a container, which is the opposite of the
 * EntityHeader's reflow and correct for the opposite reason: that card can
 * sit in a narrow panel on a wide screen, while this bar always spans the
 * page. The DS breakpoints are defined in viewport terms, so this is the one
 * place a media query is the honest instrument.
 *
 * `compress` is untouched — it is scroll state, not a size, and the screen
 * still owns it.
 */
const XL_MIN_WIDTH = 1920

function useIsWide() {
  const [wide, setWide] = useState(
    () => typeof window !== "undefined" && window.matchMedia(`(min-width: ${XL_MIN_WIDTH}px)`).matches
  )
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${XL_MIN_WIDTH}px)`)
    const onChange = () => setWide(mq.matches)
    onChange()
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])
  return wide
}

export function Header({
  title,
  description,
  size = "size-l",
  tag,
  breadcrumb,
  backButton = false,
  onBack,
  showBackInCompress = false,
  icon: Icon,
  iconVariant = "informative",
  iconSize = "sm",
  primaryAction,
  secondaryAction,
  overflowActions,
  aux,
  filters,
  className,
  style,
}: HeaderProps) {
  // `size` is what the caller asked for; `resolved` is what renders. The only
  // difference is the L→M downgrade below XL — see useIsWide.
  const isWide = useIsWide()
  const resolved: HeaderSize = size === "size-l" && !isWide ? "size-m" : size

  const isCompress = resolved === "compress"
  const hasFilters = isCompress && !!filters

  return (
    <div className={cn("flex flex-col w-full", className)} style={style}>
      {/* Title row */}
      <div
        className="flex items-center justify-between gap-[16px]"
        style={{ padding: hasFilters ? "8px 24px 8px" : PADDING[resolved] }}
      >
        {/* Left zone: back button + icon + title + tag + description */}
        <div className="flex items-start gap-[8px] min-w-0 flex-1">
          {backButton && (!isCompress || showBackInCompress) && (
            <Button
              variant="tertiary"
              size="sm"
              iconPosition="alone"
              aria-label="Back"
              className="mt-[3px]"
              onClick={onBack}
              icon={<ArrowLeft size={16} strokeWidth={1.75} style={{ color: "var(--header-back-icon)" }} />}
            />
          )}
          {!isCompress && Icon && (
            <HighlightIcon
              size={iconSize}
              variant={iconVariant}
              iconColor="dark"
              icon={<Icon size={iconSize === "sm" ? 14 : 21} strokeWidth={1.75} />}
              className="shrink-0 mt-[1px]"
            />
          )}
          <div className="flex flex-col gap-[4px] min-w-0">
            {/* Breadcrumb row — above the title, visible in every size including
                compress. 4px of separation is what keeps the two rows reading as
                path + page rather than as one wrapped title. */}
            {breadcrumb && <div className="min-w-0">{breadcrumb}</div>}
            <div className="flex items-center gap-[8px]">
              <h1
                className="font-semibold leading-tight m-0"
                style={{ fontSize: TITLE_PX[resolved], color: "var(--header-title)" }}
              >
                {title}
              </h1>
              {tag}
            </div>
            {!isCompress && description && (
              <p className="text-sm leading-[20px] m-0" style={{ color: "var(--header-desc)" }}>
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right zone: secondary + primary CTAs. The Header builds the buttons,
            so no screen has to name a variant — see HeaderAction. */}
        {(primaryAction || secondaryAction || overflowActions?.length || aux) && (
          <div className="flex items-center gap-[8px] shrink-0">
            {aux}
            {overflowActions?.length ? <OverflowMenu actions={overflowActions} /> : null}
            {secondaryAction && renderAction(secondaryAction, "secondary")}
            {primaryAction && renderAction(primaryAction, "primary")}
          </div>
        )}
      </div>

      {/* Sticky filters row — only in compress when filters prop is provided. No border. */}
      {hasFilters && (
        <div style={{ padding: "0 24px 10px" }}>
          {filters}
        </div>
      )}
    </div>
  )
}
