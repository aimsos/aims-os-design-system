// ────────────────────────────────────────────────────────────────────────
// Widget content shapes for the Playbook Overview.
//
// EVERY WIDGET ON THIS SCREEN IS ONE OF THE SHAPES THE PRODUCT ALREADY HAS A
// NAME FOR — the six the widget builder offers (KPI · Line · Bar · Table ·
// Gauge · List, `WIDGET_TYPES` in pm-thomas-composable-dashboards.tsx) and the
// DS widget catalog they file under (`WIDGET_DEFS` in App.tsx: kpi,
// status-warning, timeline, charts, table, notes).
//
// That is the whole point of this file. The Overview used to carry four
// one-off chart shapes — a circular progress ring, a phase funnel, a ranked
// bar list and a 3-segment distribution bar — each marked `// DS-GAP: not yet
// in catalog`. A DS-GAP is for something the product genuinely cannot express
// yet; none of these were. A ring is the builder's Gauge. A funnel and a
// ranked list are both its Bar. A three-way split of one total is the
// catalog's own Status Warning: three columns, a label and a number each.
// Four gaps that were really four existing shapes, so a PM reading this
// Overview saw four charts they could not then rebuild in the builder.
//
// The components here own NO chrome: `WidgetFather` (via WidgetCanvasView)
// draws the card, the title and the handles. So none of them is a
// CardContainer, and none of them sets horizontal padding — the widget already
// insets its card 24px, and adding more lands the content past its own title.
// ────────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react"
import { HighlightIcon, type HighlightIconVariant } from "@/components/ui/highlight-icon"
import { ProgressBar, type ProgressBarStyle } from "@/components/ui/progress-bar"

const TXT = "var(--color-text-title)"
const SUB = "var(--color-text-subtitle)"

// ── KPI — catalog `kpi` / builder `kpi` ─────────────────────────────────
// The shape CLAUDE.md prescribes for a KPI slot: value left, HighlightIcon
// right, one line of feedback underneath.

export function KpiContent({ value, unit, feedback, iconName, iconVariant = "informative" }: {
  value:        string | number
  unit?:        string
  feedback:     string
  iconName:     string
  iconVariant?: HighlightIconVariant
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, color: TXT }}>
          {value}
          {unit && <span style={{ fontSize: 13, fontWeight: 500, color: SUB, marginLeft: 4 }}>{unit}</span>}
        </span>
        <HighlightIcon size="lg" variant={iconVariant} iconName={iconName} />
      </div>
      <span style={{ fontSize: 12, color: SUB, marginTop: 6, display: "block" }}>{feedback}</span>
    </div>
  )
}

// ── Gauge — builder `gauge` ("Monitoring against a target") ─────────────
// A single ratio read against 100%. The arc is drawn here because the DS has
// no Gauge component yet, but the SHAPE is a named builder type, not an
// invention: value in the middle, caption under it, nothing else.

export function GaugeContent({ pct, caption, sub, style = "success", size = 104 }: {
  pct:      number
  caption:  string
  sub?:     string
  style?:   ProgressBarStyle
  size?:    number
}) {
  const strokeWidth = 10
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, pct))
  const RING_TOKEN: Record<ProgressBarStyle, string> = {
    primary:      "var(--color-surface-primary-default)",
    success:      "var(--color-surface-success-default)",
    alert:        "var(--color-surface-alert-default)",
    error:        "var(--color-surface-error-default)",
    yellow:       "var(--color-surface-yellow-default)",
    "light-blue": "var(--color-surface-light-blue-default)",
    purple:       "var(--color-surface-purple-default)",
  }
  return (
    <div className="flex flex-col items-center gap-[10px]">
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }} aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--field-border)" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={RING_TOKEN[style]} strokeWidth={strokeWidth} strokeLinecap="round"
            strokeDasharray={`${c * (clamped / 100)} ${c}`}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: TXT }}>{clamped}%</span>
        </div>
      </div>
      <div className="flex flex-col items-center" style={{ textAlign: "center" }}>
        <span style={{ fontSize: 12, color: TXT }}>{caption}</span>
        {sub && <span style={{ fontSize: 12, color: SUB, marginTop: 4 }}>{sub}</span>}
      </div>
    </div>
  )
}

// ── Bar — builder `bar` ("Comparing groups or stages") ──────────────────
// One row per group: label, the real DS ProgressBar, the value. Both the
// phase funnel and the ranked blocked-reasons list are this, which is why
// there is one component rather than two.

export interface BarRow {
  label:  string
  /** 0–100 — how long the bar is. */
  pct:    number
  /** What the bar is counting, shown at the end of the row. */
  value:  string
  style?: ProgressBarStyle
}

export function BarContent({ rows, labelWidth = 150, size = "m" }: {
  rows:        BarRow[]
  labelWidth?: number
  size?:       "s" | "m"
}) {
  return (
    <div className="flex flex-col gap-[10px]">
      {rows.map(row => (
        <div key={row.label} className="flex items-center gap-[10px]">
          <span
            title={row.label}
            style={{ fontSize: 12, color: SUB, width: labelWidth, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {row.label}
          </span>
          <ProgressBar className="flex-1 min-w-0" value={row.pct} style={row.style ?? "primary"} size={size} label={`${row.label} — ${row.value}`} />
          <span style={{ fontSize: 12, fontWeight: 600, color: TXT, width: 76, textAlign: "right", flexShrink: 0 }}>{row.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Status Warning — catalog `status-warning` ───────────────────────────
// "Three-column status counter … equal-width columns, icon + label header,
// large number below." Exactly the shape for a total split three ways, and
// the replacement for the 3-segment bar that used to draw approvals.

export interface StatColumn {
  label:       string
  value:       number | string
  iconName:    string
  iconVariant: HighlightIconVariant
  sub?:        string
}

export function StatusCounterContent({ columns, footnote }: {
  columns:   StatColumn[]
  footnote?: string
}) {
  return (
    <div className="flex flex-col gap-[14px]">
      <div className="grid gap-[12px]" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
        {columns.map(col => (
          <div key={col.label} className="flex flex-col gap-[8px]">
            <div className="flex items-center gap-[8px]">
              <HighlightIcon size="sm" variant={col.iconVariant} iconName={col.iconName} />
              <span style={{ fontSize: 12, fontWeight: 600, color: SUB }}>{col.label}</span>
            </div>
            <span style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, color: TXT }}>{col.value}</span>
            {col.sub && <span style={{ fontSize: 12, color: SUB }}>{col.sub}</span>}
          </div>
        ))}
      </div>
      {footnote && <span style={{ fontSize: 12, color: SUB }}>{footnote}</span>}
    </div>
  )
}

// ── Line — builder `line` / catalog `charts` ────────────────────────────

export function LineContent({ values, labels, delta }: {
  values: number[]
  labels: string[]
  delta?: ReactNode
}) {
  const max = Math.max(...values, 1)
  const path = values.map((v, i) => `${(i / (values.length - 1)) * 100},${100 - (v / max) * 100}`).join(" L ")

  return (
    <div>
      {delta && <div className="flex items-center justify-end" style={{ marginBottom: 8 }}>{delta}</div>}
      <div style={{ height: 120 }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {Array.from({ length: 4 }).map((_, i) => (
            <line key={i} x1="0" x2="100" y1={(i * 100) / 4} y2={(i * 100) / 4}
              stroke="var(--field-border)" strokeWidth="0.5" strokeDasharray="2,4" vectorEffect="non-scaling-stroke" />
          ))}
          <line x1="0" x2="100" y1="100" y2="100" stroke="var(--field-border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <path d={`M ${path}`} fill="none" stroke="var(--color-surface-primary-default)" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="flex justify-between" style={{ marginTop: 6 }}>
        {labels.map(l => <span key={l} style={{ fontSize: 10, color: SUB }}>{l}</span>)}
      </div>
    </div>
  )
}

// ── List — builder `list` ("Tracking recent items and activity") ────────
// A label/value stack. Used for the facts that are read rather than
// compared: the trust settings, where a moment comes from.

export function FactListContent({ facts }: { facts: { label: string; value: ReactNode }[] }) {
  return (
    <div className="flex flex-col gap-[12px]">
      {facts.map(fact => (
        <div key={fact.label} className="flex flex-col gap-[3px]">
          <span style={{ fontSize: 11, fontWeight: 600, color: SUB, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {fact.label}
          </span>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: TXT }}>{fact.value}</div>
        </div>
      ))}
    </div>
  )
}

// ── Timeline — catalog `timeline` ───────────────────────────────────────
// "A color-coded horizontal strip of event cards … Each card shows an icon,
// value and label", with a 1px connector between cards and horizontal scroll
// when the widget is narrow. Same anatomy as TimelineWidgetContent in
// components/experimental/widget-content.tsx, taking real data instead of the
// catalog's demo array — the playbook's sequential phases are exactly this
// shape, and drawing them as a wall of CardContainers was what made the
// Overview read as cards-inside-cards.

export interface TimelineCard {
  /** Short — the catalog caps this at 4 characters. */
  value:  string
  label:  string
  /** One line under the label: duration, attempts, channels. */
  meta?:  string
  tint:   "primary" | "purple" | "light-blue" | "yellow" | "success"
}

const TIMELINE_TINT: Record<TimelineCard["tint"], { bg: string; line: string }> = {
  primary:      { bg: "var(--color-surface-primary-subtle)",    line: "var(--color-border-primary-default)" },
  purple:       { bg: "var(--color-surface-purple-subtle)",     line: "var(--color-surface-purple-default)" },
  "light-blue": { bg: "var(--color-surface-light-blue-subtle)", line: "var(--color-surface-light-blue-default)" },
  yellow:       { bg: "var(--color-surface-yellow-subtle)",     line: "var(--color-surface-yellow-default)" },
  success:      { bg: "var(--color-surface-success-subtle)",    line: "var(--color-surface-success-default)" },
}

export function TimelineContent({ cards }: { cards: TimelineCard[] }) {
  return (
    <div className="flex items-stretch w-full" style={{ overflowX: "auto", gap: 0 }}>
      {cards.map((card, i) => {
        const tint = TIMELINE_TINT[card.tint]
        return (
          <div key={card.label + i} className="flex items-stretch" style={{ flex: "1 0 150px", minWidth: 0 }}>
            {i > 0 && (
              <div style={{ width: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: "100%", height: 1, background: "var(--field-border)" }} />
              </div>
            )}
            <div
              className="flex flex-col gap-[2px] min-w-0 flex-1"
              style={{ padding: "8px 12px", background: tint.bg, border: `1px solid ${tint.line}`, borderRadius: 8 }}
            >
              <span style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.2, color: tint.line }}>{card.value}</span>
              <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4, color: "var(--color-text-body)" }}>{card.label}</span>
              {card.meta && <span style={{ fontSize: 11, color: SUB, lineHeight: 1.4 }}>{card.meta}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
