// ────────────────────────────────────────────────────────────────────────
// Overview → "Activity / Usage" sub-tab.
//
// DS Health currently lists chart-shaped widgets (trend lines, funnels, stat
// tiles, progress rings) as awaiting a spec — src/ds-health.json's
// "widget-vocab" check exists specifically because screens kept inventing
// their own parallel widget-type lists instead of using the one catalog
// (WIDGET_DEFS in src/App.tsx, surfaced as Patterns → Widgets). This file
// does not declare a second vocabulary: where a shape here matches an
// existing WIDGET_DEFS entry (kpi, charts) that's noted in a comment: where
// it doesn't (progress ring, funnel, ranked bar list, distribution bar),
// it's a local component marked `// DS-GAP: not yet in catalog`, same
// convention as src/components/experimental/widget-chart-content.tsx (whose
// FunnelChart/GaugeChart this borrows visual language from — dashed grid,
// ProgressBar per row, arc-based ring).
// ────────────────────────────────────────────────────────────────────────

import { Zap, PlayCircle, Bot, UserCheck } from "lucide-react"
import { CardContainer, type CardVariant } from "@/components/ui/card-container"
import { HighlightIcon } from "@/components/ui/highlight-icon"
import type { HighlightIconVariant } from "@/components/ui/highlight-icon"
import { ProgressBar, type ProgressBarStyle } from "@/components/ui/progress-bar"
import { WidgetCanvasView, type CanvasSlot } from "@/components/layouts/widget-canvas-view"

import type { Playbook } from "./playbooks-data"

const TXT = "var(--foreground)"
const SUB = "var(--field-supporting)"

// ── Row 1 — stat tiles ("kpi" in WIDGET_DEFS: single metric + feedback text) ──

// Product feedback 2026-09-15: plain grey CardContainer read as unfinished.
// Tinting the tile itself to the same semantic color as its icon (rather
// than leaving every tile "default" grey) — reuses CardContainer's own
// color variants, no new tokens.
const ICON_VARIANT_TO_CARD_VARIANT: Record<HighlightIconVariant, CardVariant> = {
  informative: "lightBlue", success: "green", alert: "orange", error: "reed",
  neutral: "default", yellow: "yellow", lime: "limeGreen", purple: "purple", "light-blue": "lightBlue",
}

export function ActivityStatTile({ label, value, sub, icon, iconVariant = "informative", tone }: {
  label: string
  value: string | number
  sub: string
  icon: React.ComponentType<{ size?: number }>
  iconVariant?: HighlightIconVariant
  tone?: CardVariant // explicit override; defaults to iconVariant's own tint
}) {
  const Icon = icon
  return (
    <CardContainer size="sm" variant={tone ?? ICON_VARIANT_TO_CARD_VARIANT[iconVariant]} className="flex flex-col gap-[10px]">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 12, fontWeight: 600, color: SUB }}>{label}</span>
        <HighlightIcon icon={<Icon size={14} />} variant={iconVariant} size="sm" />
      </div>
      <span style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: TXT }}>{value}</span>
      <span style={{ fontSize: 12, color: SUB }}>{sub}</span>
    </CardContainer>
  )
}

function deltaLabel(pct: number, suffix: string): string {
  return `${pct >= 0 ? "+" : ""}${pct}% ${suffix}`
}

// ── Row 2a — Plan Success Rate ── DS-GAP: not yet in catalog (circular progress ring)

export function ProgressRing({ pct, size = 96, strokeWidth = 10, style = "success" as ProgressBarStyle }: {
  pct: number
  size?: number
  strokeWidth?: number
  style?: ProgressBarStyle
}) {
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
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
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
  )
}

// ── Row 2b — NBA Selection Rate (uses the real DS ProgressBar) ──

// ── Row 3a — 8-week trend ── closest WIDGET_DEFS match: "charts" (Charts
// Widget — "linear performance trend visualization... W1–W4/weekly periods").
// Visual language (dashed grid, axis labels) mirrors ChartsWidgetContent /
// widget-chart-content.tsx's LineChart.

// The data model (playbooks-data.ts ActivityMetrics) carries only the
// aggregate momentsTriggered total and one week-over-week delta — no full
// weekly series. This derives a deterministic 8-point series from those two
// fields (seeded by playbook.id so it's stable across re-renders) rather
// than inventing a new data field.
function deriveWeeklySeries(pb: Playbook): number[] {
  const total = pb.activity.momentsTriggered
  const deltaPct = pb.activity.momentsTriggeredDeltaPct
  let seed = 0
  for (const ch of pb.id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0
  function rand() { seed = (seed * 1103515245 + 12345) >>> 0; return (seed % 1000) / 1000 }
  const base = total / 8
  const raw = Array.from({ length: 8 }, () => Math.max(1, base * (0.7 + rand() * 0.6)))
  raw[7] = Math.max(1, raw[6] * (1 + deltaPct / 100))
  const sum = raw.reduce((a, b) => a + b, 0)
  return raw.map(v => Math.max(1, Math.round((v * total) / sum)))
}

function TrendLineChart({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(...values, 1)
  const toPath = (pts: number[]) =>
    pts.map((v, i) => `${(i / (pts.length - 1)) * 100},${100 - (v / max) * 100}`).join(" L ")

  return (
    <div>
      <div style={{ height: 120 }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          {Array.from({ length: 4 }).map((_, i) => (
            <line key={i} x1="0" x2="100" y1={(i * 100) / 4} y2={(i * 100) / 4}
              stroke="var(--field-border)" strokeWidth="0.5" strokeDasharray="2,4" vectorEffect="non-scaling-stroke" />
          ))}
          <line x1="0" x2="100" y1="100" y2="100" stroke="var(--field-border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <path d={`M ${toPath(values)}`} fill="none" stroke="var(--color-surface-primary-default)" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="flex justify-between" style={{ marginTop: 6 }}>
        {labels.map(l => <span key={l} style={{ fontSize: 10, color: SUB }}>{l}</span>)}
      </div>
    </div>
  )
}

// ── Row 3b — Phase Completion Funnel ── DS-GAP: not yet in catalog.
// Composed from the real ProgressBar (same pattern as
// widget-chart-content.tsx's FunnelChart) — the funnel shape itself, one bar
// per phase shrinking left-to-right, has no catalog entry yet.

const FUNNEL_STYLES: ProgressBarStyle[] = ["primary", "purple", "light-blue", "yellow"]

function PhaseFunnel({ playbook }: { playbook: Playbook }) {
  return (
    <div className="flex flex-col gap-[10px]">
      {playbook.phases.map((phase, i) => {
        const step = playbook.activity.phaseFunnel.find(f => f.phase === phase.name)
        if (!step) return null
        return (
          <div key={phase.id} className="flex items-center gap-[10px]">
            <span style={{ fontSize: 11, color: SUB, width: 120, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {phase.name}
            </span>
            <ProgressBar className="flex-1 min-w-0" value={step.pct} style={FUNNEL_STYLES[i % FUNNEL_STYLES.length]} size="m" label={`${phase.name} — ${step.pct}%`} />
            <span style={{ fontSize: 11, fontWeight: 600, color: TXT, width: 34, textAlign: "right" }}>{step.pct}%</span>
            <span style={{ fontSize: 11, color: SUB, width: 68, textAlign: "right", flexShrink: 0 }}>{step.count} plans</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Row 4a — Top Blocked Reasons ── DS-GAP: not yet in catalog (ranked bar list)

function BlockedReasonsList({ playbook }: { playbook: Playbook }) {
  const reasons = playbook.activity.blockedReasons
  const max = Math.max(...reasons.map(r => r.count), 1)
  return (
    <div className="flex flex-col gap-[10px]">
      <span style={{ fontSize: 12, fontWeight: 600, color: SUB }}>{playbook.activity.blockedTotal} blocked total</span>
      {reasons.map(r => (
        <div key={r.reason} className="flex items-center gap-[10px]">
          <span style={{ fontSize: 12, color: TXT, width: 160, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {r.reason}
          </span>
          <ProgressBar className="flex-1 min-w-0" value={(r.count / max) * 100} style="error" size="s" label={`${r.reason} — ${r.count}`} />
          <span style={{ fontSize: 12, fontWeight: 600, color: TXT, width: 24, textAlign: "right", flexShrink: 0 }}>{r.count}</span>
        </div>
      ))}
    </div>
  )
}

// ── Row 4b — Approval Metrics ── DS-GAP: not yet in catalog (3-segment
// distribution bar — ProgressBar only fills a single segment).

function DistributionBar({ segments }: { segments: { label: string; count: number; token: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.count, 0) || 1
  return (
    <div className="flex flex-col gap-[8px]">
      <div className="flex w-full overflow-hidden" style={{ height: 8, borderRadius: "var(--pb-radius)", background: "var(--field-border)" }}>
        {segments.map(seg => (
          <div key={seg.label} style={{ width: `${(seg.count / total) * 100}%`, background: seg.token }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-[12px]">
        {segments.map(seg => (
          <span key={seg.label} className="inline-flex items-center gap-[6px]" style={{ fontSize: 12, color: SUB }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: seg.token, flexShrink: 0 }} />
            {seg.label} · {seg.count} ({Math.round((seg.count / total) * 100)}%)
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Layout ────────────────────────────────────────────────────────────────
// Every widget is its own WidgetCanvasView slot — draggable, resizable
// (horizontally and vertically), repositionable, same interaction the real
// dashboard builder gives every other widget in this app. `tone` (added to
// CanvasSlot for this — see widget-canvas-view.tsx) tints each slot's real
// CardContainer to its semantic role instead of every widget reading as the
// same grey.

export function ActivityUsage({ playbook }: { playbook: Playbook }) {
  const a = playbook.activity
  const weekly = deriveWeeklySeries(playbook)
  const weekLabels = weekly.map((_, i) => `W${i + 1}`)

  return (
    <WidgetCanvasView
      initialSlots={[
        // One combined widget (not 4 separate ones): 4 equal-width items
        // don't divide evenly into the canvas's 12-column grid (narrow =
        // 4 cols, so 4×narrow = 16), which left a 4th tile spilling into
        // the next row. Same precedent as pm-lex-htl-work-queue.tsx's
        // "kpi-summary" slot. The widget itself is still one full
        // drag/resize unit — the 4 numbers are its content, not 4 widgets.
        {
          uid: "activity-stats", title: "Activity Summary", colSpan: 3, rowSpan: 4, minRowSpan: 4, autoExpand: false,
          content: (
            <div className="grid gap-[12px]" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              <ActivityStatTile label="Moments Triggered"   value={a.momentsTriggered}   sub={deltaLabel(a.momentsTriggeredDeltaPct, "vs last week")} icon={Zap}        iconVariant="informative" />
              <ActivityStatTile label="Plans Instantiated"  value={a.plansInstantiated}  sub={`${a.conversionRatePct}% conversion rate`}               icon={PlayCircle} iconVariant="light-blue" />
              <ActivityStatTile label="Auto-Executed"       value={a.autoExecuted}       sub={`${a.autoExecutedPct}% of total plans`}                  icon={Bot}        iconVariant="purple" />
              <ActivityStatTile label="Approvals Required"  value={a.approvalsRequired}  sub={`${a.approvalsRequiredPct}% of total plans`}             icon={UserCheck}  iconVariant="alert" tone="yellow" />
            </div>
          ),
        },

        // ── Row 2 — success rate ring · NBA rate bar · duration/accounts ──
        {
          uid: "success-rate", title: "Plan Success Rate", tone: "green", colSpan: 1, rowSpan: 5, minRowSpan: 4,
          content: (
            <div className="flex flex-col items-center gap-[10px]">
              <ProgressRing pct={a.planSuccessRatePct} style="success" />
              <div className="flex flex-col items-center" style={{ textAlign: "center" }}>
                <span style={{ fontSize: 12, color: TXT }}>{a.successCount} plans reached the primary success event</span>
                <span style={{ fontSize: 12, color: SUB, marginTop: 4 }}>{a.exitedWithoutSuccessPct}% exited without success</span>
              </div>
            </div>
          ),
        },
        {
          uid: "nba-rate", title: "NBA Selection Rate", tone: "purple", colSpan: 1, rowSpan: 5, minRowSpan: 4,
          content: (
            <div className="flex flex-col gap-[10px]">
              <span style={{ fontSize: 28, fontWeight: 700, color: TXT }}>{a.nbaSelectionRatePct}%</span>
              <ProgressBar value={a.nbaSelectionRatePct} style="primary" size="m" label="NBA selection rate" />
              <div className="flex justify-between">
                <span style={{ fontSize: 10, color: SUB }}>0%</span>
                <span style={{ fontSize: 10, color: SUB }}>100%</span>
              </div>
              <span style={{ fontSize: 12, color: SUB }}>Of eligible moments, NBA chose this playbook</span>
            </div>
          ),
        },
        {
          uid: "duration-accounts", title: "Avg Plan Duration & Accounts Reached", tone: "lightBlue", colSpan: 1, rowSpan: 5, minRowSpan: 4,
          content: (
            <div className="flex flex-col gap-[16px]">
              <div>
                <span style={{ fontSize: 28, fontWeight: 700, color: TXT }}>{a.avgPlanDurationDays}</span>
                <span style={{ fontSize: 13, color: SUB, marginLeft: 6 }}>days avg duration</span>
              </div>
              <div>
                <span style={{ fontSize: 28, fontWeight: 700, color: TXT }}>{a.accountsReached}</span>
                <span style={{ fontSize: 13, color: SUB, marginLeft: 6 }}>accounts reached</span>
              </div>
            </div>
          ),
        },

        // ── Row 3 — trend chart · phase funnel ──
        {
          uid: "trend", title: "Moments Triggered — Last 8 Weeks", tone: "lightBlue", colSpan: 2, rowSpan: 6, minRowSpan: 4,
          content: (
            <div>
              <div className="flex items-center justify-end" style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: a.momentsTriggeredDeltaPct >= 0 ? "var(--tag-success-fg)" : "var(--tag-error-fg)" }}>
                  {deltaLabel(a.momentsTriggeredDeltaPct, "vs last week")}
                </span>
              </div>
              <TrendLineChart values={weekly} labels={weekLabels} />
            </div>
          ),
        },
        {
          uid: "phase-funnel", title: "Phase Completion Funnel", tone: "green", colSpan: 1, rowSpan: 6, minRowSpan: 4,
          content: <PhaseFunnel playbook={playbook} />,
        },

        // ── Row 4 — blocked reasons · approval metrics ──
        {
          uid: "blocked-reasons", title: "Top Blocked Reasons", tone: "orange", widthClass: "half", rowSpan: 6, minRowSpan: 4,
          content: (
            <div className="flex flex-col gap-[10px]">
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--hi-alert-icon)" }}>{a.blockedTotal} total blocks</span>
              <BlockedReasonsList playbook={playbook} />
            </div>
          ),
        },
        {
          uid: "approval-metrics", title: "Approval Metrics", tone: "lightBlue", widthClass: "half", rowSpan: 6, minRowSpan: 4,
          content: (
            <div className="flex flex-col gap-[14px]">
              <div className="flex gap-[20px]">
                <div><div style={{ fontSize: 22, fontWeight: 700, color: TXT }}>{a.approvals.approved}</div><div style={{ fontSize: 11, color: SUB }}>Approved</div></div>
                <div><div style={{ fontSize: 22, fontWeight: 700, color: TXT }}>{a.approvals.rejected}</div><div style={{ fontSize: 11, color: SUB }}>Rejected</div></div>
                <div><div style={{ fontSize: 22, fontWeight: 700, color: TXT }}>{a.approvals.pending}</div><div style={{ fontSize: 11, color: SUB }}>Pending</div></div>
              </div>
              <DistributionBar segments={[
                { label: "Approved", count: a.approvals.approved, token: "var(--color-surface-success-default)" },
                { label: "Rejected", count: a.approvals.rejected, token: "var(--color-surface-error-default)" },
                { label: "Pending",  count: a.approvals.pending,  token: "var(--color-surface-alert-default)" },
              ]} />
              <span style={{ fontSize: 12, color: SUB }}>Avg approval resolution time: {a.approvals.avgResolutionHours} hours</span>
            </div>
          ),
        },
      ] satisfies CanvasSlot[]}
    />
  )
}
