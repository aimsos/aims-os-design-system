import { forwardRef, type ReactNode } from "react"
import { ChevronDown, ChevronUp, X, CircleAlert } from "lucide-react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Select — AIMS OS Design System
 * Source: Figma v6rmYKA2zmyXWOahlxLOeI · node 14405:9600 (Node Config / Select)
 *
 * A non-editable trigger field that opens a Menu/Dropdown panel.
 * Shares all visual tokens with Input (Text Field) — same border, bg, label,
 * supporting text, and icon styles.
 *
 * States (DS exact):
 *   default  → gray border 0.5px · ChevronDown · placeholder text
 *   selected → blue border 1px   · X (clear)   · value text
 *              …but ONLY when `onClear` is supplied. Without a handler the X
 *              renders, invites a click and does nothing, which is worse than
 *              no affordance at all — 76 of the 80 Select call sites in this
 *              repo were in exactly that state. No handler → ChevronDown, the
 *              same glyph the field shows when it has no value, because in
 *              both cases the only thing the right side can do is open.
 *   open     → blue border 1px   · ChevronUp   · value or placeholder
 *   error    → red border 0.5px  · CircleAlert · placeholder or value
 *   disabled → light border 1px  · ChevronDown · opacity 40%
 *
 * Layout (DS exact, Node Config / Select):
 *   height 40px (M) / 32px (S)  ·  padding 16px H, 4px V  ·  radius 8px
 *   Label: 12px Inter Semi Bold, floats on top border (same as Input)
 *   Supporting text: 12px Inter Medium, below the field
 *
 * All colors via --field-* CSS custom properties (defined in index.css).
 * No dark: prefix needed — token layer handles light/dark automatically.
 */

// ── Types ─────────────────────────────────────────────────────────────────

export type SelectState = "default" | "error" | "disabled"

export type SelectProps = {
  /** Currently selected value text. When set, shows blue border + clear button */
  value?: string
  placeholder?: string
  /** Validation state — controls border and supporting text color */
  state?: SelectState
  /** Whether the dropdown panel is currently open */
  open?: boolean
  /** DS Size — M=40px (default), S=32px */
  size?: "default" | "sm"
  /** Floating label rendered on the top border */
  label?: string
  /** Helper/validation text below the field */
  supportingText?: string
  /** Optional leading icon (left slot) */
  leadingIcon?: ReactNode
  /** Fired when the trigger is clicked */
  onClick?: () => void
  /** Fired when the clear (×) button is clicked */
  onClear?: () => void
  className?: string
}

// ── CVA ───────────────────────────────────────────────────────────────────

const triggerCva = cva(
  [
    "relative flex items-center gap-[4px]",
    "w-full rounded-[8px]",
    "bg-[var(--field-bg)]",
    "cursor-pointer select-none",
    "transition-colors duration-150",
    "outline-none focus-visible:ring-2 focus-visible:ring-[var(--field-border-focus)]",
  ],
  {
    variants: {
      visualState: {
        default:  "border-[0.5px] border-[var(--field-border)] hover:border-[var(--color-border-neutral-black)]",
        active:   "border border-[var(--field-border-focus)]",
        error:    "border-[0.5px] border-[var(--field-border-error)]",
        disabled: "border border-[var(--field-border)] opacity-40 pointer-events-none",
      },
      size: {
        default: "h-[40px] px-[12px]",
        sm:      "h-[32px] px-[12px]",
      },
    },
    defaultVariants: { visualState: "default", size: "default" },
  }
)

const supportingCva = cva("text-xs font-medium leading-[1.5]", {
  variants: {
    state: {
      default:  "text-[var(--field-supporting)]",
      error:    "text-[var(--field-text-error)]",
      disabled: "text-[var(--field-supporting)]",
    },
  },
  defaultVariants: { state: "default" },
})

// ── Component ─────────────────────────────────────────────────────────────

/**
 * The combobox row forwards its ref and any extra props.
 *
 * Select is a trigger with no list of its own, so a screen supplies the list.
 * Two compositions work; `dropdown-anchor` + `Menu` is the default, and a
 * wrapper-anchored base-ui Popover is the alternative for a Select's own
 * options (`PgInteractiveSelect` in App.tsx is the live reference).
 *
 * `Popover.Trigger render={<Select/>}` is the one thing that cannot be built —
 * Select renders a div and the Trigger has nowhere to attach. This docblock
 * used to go further and say a wrapper div was dismissed as an outside click
 * too; that was wrong, corrected 2026-09-10 by clicking the deployed example.
 */
const Select = forwardRef<HTMLDivElement, SelectProps & React.HTMLAttributes<HTMLDivElement>>(function Select({
  value,
  placeholder = "Select an option",
  state = "default",
  open = false,
  size = "default",
  label,
  supportingText,
  leadingIcon,
  onClick,
  onClear,
  className,
  ...rest
}, ref) {
  const isDisabled = state === "disabled"
  const hasValue   = Boolean(value)

  // Visual state drives border/color:
  //   open OR hasValue → "active" (blue border)
  //   error            → "error"
  //   disabled         → "disabled"
  //   otherwise        → "default"
  const visualState =
    isDisabled     ? "disabled" :
    state === "error" ? "error"    :
    open || hasValue  ? "active"   : "default"

  // Right icon logic (DS spec):
  //   open          → ChevronUp (blue)
  //   hasValue      → X/clear button (blue)
  //   error         → CircleAlert (red)
  //   default       → ChevronDown (gray)
  const rightIconColor =
    visualState === "active"   ? "text-[var(--field-border-focus)]" :
    visualState === "error"    ? "text-[var(--field-text-error)]"   :
    "text-[var(--field-icon)]"

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClear?.()
  }

  return (
    <div
      className={cn(
        "relative flex flex-col gap-[4px] w-full",
        label && "mt-[6px]",
      )}
    >
      {/* Floating label — overlaps the top border */}
      {label && (
        <span
          className={cn(
            "absolute top-[-6px] left-[16px] z-[1]",
            "inline-flex items-center px-[4px] rounded-sm",
            "text-xs font-semibold leading-normal whitespace-nowrap select-none",
            isDisabled
              ? "text-[var(--field-placeholder)]"
              : "text-[var(--field-label)]"
          )}
          style={{
            background: "color-mix(in srgb, var(--field-bg) 80%, transparent)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          {label}
        </span>
      )}

      {/* Trigger */}
      <div
        ref={ref}
        {...rest}
        role="combobox"
        aria-expanded={open}
        aria-disabled={isDisabled}
        tabIndex={isDisabled ? -1 : 0}
        onClick={!isDisabled ? onClick : undefined}
        onKeyDown={(e) => {
          if (!isDisabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault()
            onClick?.()
          }
        }}
        className={cn(triggerCva({ visualState, size }), className)}
      >
        {/* Leading icon */}
        {leadingIcon && (
          <span className="shrink-0 flex items-center text-[var(--field-icon)] [&_svg]:w-[16px] [&_svg]:h-[16px]">
            {leadingIcon}
          </span>
        )}

        {/* Value / placeholder text */}
        <span
          className={cn(
            "flex-1 min-w-0 truncate text-sm font-medium leading-[1.5]",
            hasValue
              ? "text-[var(--field-text)]"
              : "text-[var(--field-placeholder)]"
          )}
        >
          {hasValue ? value : placeholder}
        </span>

        {/* Right icon */}
        <span className={cn("shrink-0 flex items-center", rightIconColor)}>
          {open ? (
            <ChevronUp size={16} strokeWidth={1.75} />
          ) : hasValue && onClear ? (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Clear selection"
              onClick={handleClear}
              className="flex items-center cursor-pointer hover:opacity-70 transition-opacity"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          ) : state === "error" ? (
            <CircleAlert size={16} strokeWidth={1.75} />
          ) : (
            <ChevronDown size={16} strokeWidth={1.75} />
          )}
        </span>
      </div>

      {/* Supporting text */}
      {supportingText && (
        <span className={supportingCva({ state: isDisabled ? "disabled" : state })}>
          {supportingText}
        </span>
      )}
    </div>
  )
})

export { Select }
