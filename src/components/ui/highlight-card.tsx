/**
 * Highlight Card — AIMS OS DS · node 6399:21296
 * KPI metric card for dashboards. 9 background styles × 2 states (Default / Disabled).
 * Tokens: --hc-* family aliases canonical --color-* tokens; auto-responds to dark mode.
 * Always use HighlightIcon size="lg" (40px) as the icon slot.
 */
import { cn } from "@/lib/utils"
import { HighlightIcon, type HighlightIconVariant } from "@/components/ui/highlight-icon"
import { Tooltip } from "@/components/ui/tooltip"

// ── Types ─────────────────────────────────────────────────────────────────────

export type HighlightCardStyle =
  | "default"
  | "primary-bg"
  | "green-bg"
  | "orange-bg"
  | "yellow-bg"
  | "purple-bg"
  | "light-blue-bg"
  | "lime-bg"
  | "red"

export type HighlightCardFeedback = "positive" | "negative" | "neutral"

export interface HighlightCardProps {
  /** Metric name label shown above the value */
  label: string
  /** Main KPI figure (e.g. "22", "1,243", "$45,000") */
  value: string | number
  /** Optional unit label shown next to the value (e.g. "Models", "USD") */
  unit?: string
  /** Optional trend/context text shown below the value */
  feedback?: string
  /** Controls feedback text color. Default: "neutral" */
  feedbackType?: HighlightCardFeedback
  /** Lucide icon name rendered inside the HighlightIcon circle */
  iconName?: string
  /**
   * The icon's tint. Defaults to whatever `style` implies, which for the
   * default (and only non-deprecated) style is `informative`.
   *
   * This exists because colour on this card belongs to the ICON: the coloured
   * `style` backgrounds are deprecated, and the guide is explicit that "colour
   * differentiation goes only in the iconName and feedbackType props". Until
   * now `iconName` could say WHAT the metric is and nothing could say what
   * KIND it is, so three cards counting three different things — a verified
   * fact, a provisional claim, a raw document — all read informative blue.
   * Michael, 2026-09-09.
   */
  iconVariant?: HighlightIconVariant
  /** Background style variant. Default: "default" */
  style?: HighlightCardStyle
  /** Disables interaction and reduces opacity to 40% */
  disabled?: boolean
  className?: string
}

// ── Token maps ────────────────────────────────────────────────────────────────

const STYLE_BG: Record<HighlightCardStyle, string> = {
  "default":        "var(--hc-bg)",
  "primary-bg":     "var(--color-surface-primary-subtle)",
  "green-bg":       "var(--color-surface-success-subtle)",
  "orange-bg":      "var(--color-surface-alert-subtle)",
  "yellow-bg":      "var(--color-surface-yellow-subtle)",
  "purple-bg":      "var(--color-surface-purple-subtle)",
  "light-blue-bg":  "var(--color-surface-light-blue-subtle)",
  "lime-bg":        "var(--color-surface-lime-subtle)",
  "red":            "var(--color-surface-error-subtle)",
}

const STYLE_BORDER: Record<HighlightCardStyle, string> = {
  "default":        "0.5px solid var(--color-border-neutral-lighter)",
  "primary-bg":     "0.5px solid var(--color-border-primary-default)",
  "green-bg":       "0.5px solid var(--color-border-success-default)",
  "orange-bg":      "0.5px solid var(--color-border-alert-default)",
  "yellow-bg":      "0.5px solid var(--color-border-yellow-default)",
  "purple-bg":      "0.5px solid var(--color-border-purple-default)",
  "light-blue-bg":  "0.5px solid var(--color-border-light-blue-default)",
  "lime-bg":        "0.5px solid var(--color-border-lime-green-default)",
  "red":            "0.5px solid var(--color-border-error-default)",
}

const STYLE_ICON_VARIANT: Record<HighlightCardStyle, HighlightIconVariant> = {
  "default":        "informative",
  "primary-bg":     "informative",
  "green-bg":       "success",
  "orange-bg":      "alert",
  "yellow-bg":      "yellow",
  "purple-bg":      "purple",
  "light-blue-bg":  "light-blue",
  "lime-bg":        "lime",
  "red":            "error",
}

const FEEDBACK_COLOR: Record<HighlightCardFeedback, string> = {
  positive: "var(--hc-text-feedback)",
  negative: "var(--hc-text-feedback)",
  neutral:  "var(--hc-text-feedback)",
}

// ── Component ─────────────────────────────────────────────────────────────────

export function HighlightCard({
  label,
  value,
  unit,
  feedback,
  feedbackType = "neutral",
  iconName = "TrendingUp",
  iconVariant,
  style = "default",
  disabled = false,
  className,
}: HighlightCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-4 rounded-[12px] w-[236px]",
        disabled && "opacity-40 pointer-events-none",
        className,
      )}
      style={{
        background: STYLE_BG[style],
        border: STYLE_BORDER[style],
      }}
    >
      {/* Row 1: label + icon */}
      <div className="flex items-center justify-between gap-[4px]">
        <div className="min-w-0 flex-1 overflow-hidden">
          <Tooltip content={label} side="top">
            <span
              className="text-sm font-medium leading-none truncate block"
              style={{ color: "var(--hc-text-label)" }}
            >
              {label}
            </span>
          </Tooltip>
        </div>
        <HighlightIcon
          iconName={iconName}
          variant={iconVariant ?? STYLE_ICON_VARIANT[style]}
          size="lg"
          iconColor="dark"
          className="shrink-0"
        />
      </div>

      {/* Row 2: value + unit */}
      <div className="flex items-baseline gap-1">
        <span
          className="text-xl font-semibold leading-none"
          style={{ color: "var(--hc-text-value)" }}
        >
          {value}
        </span>
        {unit && (
          <span
            className="text-xs font-medium self-end pb-0.5"
            style={{ color: "var(--hc-text-unit)" }}
          >
            {unit}
          </span>
        )}
      </div>

      {/* Row 3: feedback */}
      {feedback && (
        <span
          className="text-xs font-medium"
          style={{ color: FEEDBACK_COLOR[feedbackType] }}
        >
          {feedback}
        </span>
      )}
    </div>
  )
}
