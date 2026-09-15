// ────────────────────────────────────────────────────────────────────────
// Overview → "Activity" sub-view.
//
// Every widget here is one of the shapes the product already names — KPI,
// Gauge, Line, Bar and the catalog's Status Warning counter. The four
// one-off charts this file used to carry (progress ring, phase funnel,
// ranked bar list, 3-segment distribution bar) were each marked
// `// DS-GAP: not yet in catalog`, and none of them actually was a gap: see
// the header of ./widget-content.tsx for which existing shape each one
// turned out to be.
//
// Nothing about the DATA changed — every number still comes from
// playbook.activity, and the one derived series (the 8-week trend) is
// derived the same deterministic way it always was.
// ────────────────────────────────────────────────────────────────────────

import { WidgetCanvasView, type CanvasSlot } from "@/components/layouts/widget-canvas-view"
import { KpiContent, GaugeContent, BarContent, StatusCounterContent, LineContent, type BarRow } from "./widget-content"
import type { Playbook } from "./playbooks-data"

const SUB = "var(--color-text-subtitle)"

function deltaLabel(pct: number, suffix: string): string {
  return `${pct >= 0 ? "+" : ""}${pct}% ${suffix}`
}

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

// Phases shrink left-to-right, so the funnel is a Bar whose rows are already
// percentages of the first phase. Colour rotates rather than repeating one
// style down the column.
const FUNNEL_STYLES = ["primary", "purple", "light-blue", "yellow"] as const

function phaseRows(pb: Playbook): BarRow[] {
  return pb.phases.flatMap((phase, i) => {
    const step = pb.activity.phaseFunnel.find(f => f.phase === phase.name)
    if (!step) return []
    return [{
      label: `${i + 1}. ${phase.name}`,
      pct:   step.pct,
      value: `${step.pct}% · ${step.count}`,
      style: FUNNEL_STYLES[i % FUNNEL_STYLES.length],
    }]
  })
}

function blockedRows(pb: Playbook): BarRow[] {
  const reasons = pb.activity.blockedReasons
  const max = Math.max(...reasons.map(r => r.count), 1)
  return reasons.map(r => ({
    label: r.reason,
    pct:   (r.count / max) * 100,
    value: String(r.count),
    style: "error" as const,
  }))
}

export function ActivityUsage({ playbook }: { playbook: Playbook }) {
  const a = playbook.activity
  const weekly = deriveWeeklySeries(playbook)
  const weekLabels = weekly.map((_, i) => `W${i + 1}`)

  return (
    <WidgetCanvasView
      initialSlots={[
        // ── Row 1 — volume, as three KPI widgets ──
        // Three, not four tiles bundled into one widget: colSpan 1 is 4 of the
        // canvas's 12 columns, so three narrow widgets fill a row exactly. The
        // old version packed four CardContainers inside ONE widget, which put a
        // card inside a card and made the fourth tile the reason the row could
        // not divide evenly in the first place.
        {
          uid: "kpi-moments", title: "Moments Triggered", colSpan: 1, rowSpan: 3, minRowSpan: 3, maxRowSpan: 3,
          content: (
            <KpiContent
              value={a.momentsTriggered}
              feedback={deltaLabel(a.momentsTriggeredDeltaPct, "vs last week")}
              iconName="Zap"
              iconVariant="informative"
            />
          ),
        },
        {
          uid: "kpi-plans", title: "Plans Instantiated", colSpan: 1, rowSpan: 3, minRowSpan: 3, maxRowSpan: 3,
          content: (
            <KpiContent
              value={a.plansInstantiated}
              feedback={`${a.conversionRatePct}% conversion rate`}
              iconName="PlayCircle"
              iconVariant="light-blue"
            />
          ),
        },
        {
          uid: "kpi-accounts", title: "Accounts Reached", colSpan: 1, rowSpan: 3, minRowSpan: 3, maxRowSpan: 3,
          content: (
            <KpiContent
              value={a.accountsReached}
              feedback={`${a.avgPlanDurationDays} days average plan duration`}
              iconName="Users"
              iconVariant="purple"
            />
          ),
        },

        // ── Row 2 — the two ratios read against a target, as Gauges ──
        {
          uid: "gauge-success", title: "Plan Success Rate", colSpan: 1, rowSpan: 5,
          content: (
            <GaugeContent
              pct={a.planSuccessRatePct}
              style="success"
              caption={`${a.successCount} plans reached the primary success event`}
              sub={`${a.exitedWithoutSuccessPct}% exited without success`}
            />
          ),
        },
        {
          uid: "gauge-nba", title: "NBA Selection Rate", colSpan: 1, rowSpan: 5,
          content: (
            <GaugeContent
              pct={a.nbaSelectionRatePct}
              style="primary"
              caption="Of eligible moments, NBA chose this playbook"
            />
          ),
        },
        // How the plans that ran were governed — three ways one total splits,
        // which is the catalog's Status Warning counter.
        {
          uid: "execution-mode", title: "How Plans Executed", colSpan: 1, rowSpan: 5,
          content: (
            <StatusCounterContent
              columns={[
                { label: "Auto",     value: a.autoExecuted,     iconName: "Bot",       iconVariant: "purple",      sub: `${a.autoExecutedPct}%` },
                { label: "Approval", value: a.approvalsRequired, iconName: "UserCheck", iconVariant: "alert",       sub: `${a.approvalsRequiredPct}%` },
                { label: "Blocked",  value: a.blockedTotal,      iconName: "Ban",       iconVariant: "error",       sub: "total" },
              ]}
            />
          ),
        },

        // ── Row 3 — trend over time (Line) beside the funnel (Bar) ──
        {
          uid: "trend", title: "Moments Triggered — Last 8 Weeks", colSpan: 2, rowSpan: 5,
          content: (
            <LineContent
              values={weekly}
              labels={weekLabels}
              delta={
                <span style={{ fontSize: 12, fontWeight: 600, color: a.momentsTriggeredDeltaPct >= 0 ? "var(--tag-success-fg)" : "var(--tag-error-fg)" }}>
                  {deltaLabel(a.momentsTriggeredDeltaPct, "vs last week")}
                </span>
              }
            />
          ),
        },
        {
          uid: "phase-funnel", title: "Phase Completion", colSpan: 1, rowSpan: 5,
          content: <BarContent rows={phaseRows(playbook)} labelWidth={130} />,
        },

        // ── Row 4 — what stopped plans (Bar) beside approval outcomes ──
        {
          uid: "blocked-reasons", title: "Top Blocked Reasons", colSpan: 2, rowSpan: 6,
          content: (
            <div className="flex flex-col gap-[10px]">
              <span style={{ fontSize: 12, fontWeight: 600, color: SUB }}>{a.blockedTotal} blocked total</span>
              <BarContent rows={blockedRows(playbook)} labelWidth={190} size="s" />
            </div>
          ),
        },
        {
          uid: "approvals", title: "Approval Outcomes", colSpan: 1, rowSpan: 5,
          content: (
            <StatusCounterContent
              columns={[
                { label: "Approved", value: a.approvals.approved, iconName: "Check",   iconVariant: "success" },
                { label: "Rejected", value: a.approvals.rejected, iconName: "X",       iconVariant: "error"   },
                { label: "Pending",  value: a.approvals.pending,  iconName: "Clock",   iconVariant: "alert"   },
              ]}
              footnote={`Average resolution time: ${a.approvals.avgResolutionHours} hours`}
            />
          ),
        },
      ] satisfies CanvasSlot[]}
    />
  )
}
