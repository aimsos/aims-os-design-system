/**
 * The real content of every catalogued widget.
 *
 * These fourteen renderers are what the DS catalog has always shown as its live
 * previews — actual DS components with plausible data, not illustrations of
 * them. They lived inside App.tsx, so nothing else could reach them: any screen
 * that wanted to show what a widget looks like had to draw its own version, and
 * the Widget Builder's live preview did exactly that.
 *
 * Moved here whole, fixtures included, so the catalog and the builder render the
 * same widget from the same code. Nothing inside changed — the region defined 35
 * symbols, only the 14 components were referenced from outside it, and it
 * referenced nothing App.tsx declares. That is what made the cut safe.
 */
import { useState, useEffect, useRef, Fragment } from "react"
import { createPortal } from "react-dom"
import * as LucideIcons from "lucide-react"
import { Button } from "@/components/ui/button"
import { AvatarCircle } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Tag } from "@/components/ui/tag"
import { Badge, type BadgeVariant } from "@/components/ui/badge"
import { HighlightIcon, type HighlightIconVariant } from "@/components/ui/highlight-icon"
import { InformativeCard } from "@/components/ui/informative-card"
import { Tabs } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip } from "@/components/ui/tooltip"
import { SlideOut } from "@/components/ui/slide-out"
import { Chip } from "@/components/ui/chip"
import { useWidgetSize } from "@/components/layouts/widget-canvas-view"

// ── Widget content components ─────────────────────────────────────────────────

export function KpiWidgetContent({ variant = 2 }: { variant?: 0 | 1 | 2 | 3 }) {
  // HighlightIcon lg (40×40) with TrendingUp — right-aligned per Figma 12661:63019
  const KpiHighlight = () => (
    <HighlightIcon size="lg" variant="informative" iconName="TrendingUp" />
  )
  // The KPI's movement, which is half of what a KPI is. This read literally
  // "Feedback text" — the component's own placeholder, shipped and never
  // replaced, showing in the catalog and in the Widget Builder's live preview.
  // The direction is coloured, the comparison is not: "+8.2%" is the finding,
  // "vs last quarter" is the context.
  const FeedbackText = () => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12 }}>
      <LucideIcons.TrendingUp size={12} style={{ color: "var(--color-surface-success-default)" }} />
      <span style={{ color: "var(--color-surface-success-default)", fontWeight: 600 }}>+8.2%</span>
      <span style={{ color: "var(--color-text-subtitle)" }}>vs last quarter</span>
    </span>
  )

  if (variant === 0) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-title)", lineHeight: 1 }}>2,401</span>
      <KpiHighlight />
    </div>
  )
  if (variant === 1) return (
    <div className="flex flex-col gap-[6px]">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-title)", lineHeight: 1 }}>2,401</span>
        <KpiHighlight />
      </div>
      <FeedbackText />
    </div>
  )
  if (variant === 2) return (
    <div className="flex flex-col gap-[6px]">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-title)", lineHeight: 1 }}>2,401</span>
          <span style={{ fontSize: 12, color: "var(--color-text-subtitle)" }}>/ 2,800</span>
        </div>
        <KpiHighlight />
      </div>
      <FeedbackText />
    </div>
  )
  // Variant 3 — with progress bar
  return (
    <div className="flex flex-col gap-[6px]">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-title)", lineHeight: 1 }}>2,401</span>
          <span style={{ fontSize: 12, color: "var(--color-text-subtitle)" }}>/ 2,800</span>
        </div>
        <KpiHighlight />
      </div>
      <div style={{ height: 4, background: "var(--color-surface-neutral-emphasis)", borderRadius: 100, overflow: "hidden" }}>
        <div style={{ width: "85%", height: "100%", background: "var(--primary)", borderRadius: 100 }} />
      </div>
      <FeedbackText />
    </div>
  )
}

const TIMELINE_CARDS = [
  {
    value: "127", label: "Contracts", icon: "FileText",
    bg: "var(--color-surface-primary-subtle)",
    border: "var(--color-border-primary-default)",
    textColor: "var(--color-border-primary-default)",
  },
  {
    value: "43",  label: "Meetings", icon: "FileText",
    bg: "var(--color-surface-yellow-subtle)",
    border: "var(--color-surface-yellow-default)",
    textColor: "var(--color-surface-yellow-default)",
  },
  {
    value: "12",  label: "Calls", icon: "FileText",
    bg: "var(--color-surface-success-subtle)",
    border: "var(--color-border-success-default)",
    textColor: "var(--color-border-success-default)",
  },
  {
    value: "28",  label: "Proposals", icon: "FileText",
    bg: "var(--color-surface-purple-subtle)",
    border: "var(--color-border-purple-default)",
    textColor: "var(--color-border-purple-default)",
  },
  {
    value: "7",   label: "Closed", icon: "FileText",
    bg: "var(--color-surface-lime-subtle)",
    border: "var(--color-border-lime-green-default)",
    textColor: "var(--color-border-lime-green-default)",
  },
  {
    value: "19",  label: "Pipeline", icon: "FileText",
    bg: "var(--color-surface-light-blue-subtle)",
    border: "var(--color-border-light-blue-default)",
    textColor: "var(--color-border-light-blue-default)",
  },
]

const TIMELINE_META = [
  { icon: "Cpu",        label: "AI Routing" },
  { icon: "Workflow",   label: "Automation" },
  { icon: "LayoutGrid", label: "Pipeline" },
]

// Weekly breakdown data for Timeline bar chart (Contracts, Meetings, Calls, Proposals, Closed)
export function TimelineWidgetContent({ showMeta = true, count = 5 }: { showMeta?: boolean; count?: 2|3|4|5|6 }) {
  type LIcon = React.FC<{ size?: number; style?: React.CSSProperties }>

  return (
    <div className="flex flex-col w-full" style={{ alignSelf: "flex-start" }}>
      {/* Cards row — natural height, horizontal scroll when narrow */}
      <div className="flex items-stretch w-full" style={{ overflowX: "auto", gap: 0 }}>
        {TIMELINE_CARDS.slice(0, count).map((card, i) => (
          <Fragment key={i}>
            {i > 0 && (
              <div style={{ width: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: "100%", height: 1, background: "var(--field-border)" }} />
              </div>
            )}
            <div
              style={{
                flex: "1 0 114px",
                padding: "8px 12px",
                background: card.bg,
                border: `1px solid ${card.border}`,
                borderRadius: 8,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: card.textColor, lineHeight: 1.2 }}>
                  {card.value}
                </span>
                <span style={{ fontSize: 14, color: "var(--color-text-body)", lineHeight: "20px" }}>
                  {card.label}
                </span>
              </div>
              {/* Icon — 16×16 with card color */}
              <div style={{ width: 24, height: 24, flexShrink: 0, opacity: 0.7, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <LucideIcons.FileText size={16} style={{ color: card.textColor }} />
              </div>
            </div>
          </Fragment>
        ))}
      </div>

      {/* MetaData row */}
      {showMeta && (
        <div className="flex items-center gap-[12px]" style={{ marginTop: 8 }}>
          {TIMELINE_META.map((m, i) => {
            const Icon = (LucideIcons as unknown as Record<string, LIcon>)[m.icon]
            return (
              <div key={i} className="flex items-center gap-[4px]">
                {Icon && <Icon size={14} style={{ color: "var(--color-text-body)" }} />}
                <span style={{ fontSize: 12, color: "var(--color-text-body)", whiteSpace: "nowrap" }}>
                  {m.label}
                </span>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}


// Lineal performance widget — matches Figma spec exactly
const PERF_SERIES = [
  { label: "Performance", color: "var(--color-border-lime-green-default)",  data: [38, 58, 65, 63] },
  { label: "Engagement",  color: "var(--color-border-light-blue-default)",  data: [30, 30, 47, 38] },
  { label: "Retention",   color: "var(--color-border-purple-default)",      data: [18, 18, 26, 24] },
]

function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return ""
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const cp1x = pts[i-1][0] + (pts[i][0] - pts[i-1][0]) / 3
    const cp1y = pts[i-1][1]
    const cp2x = pts[i][0] - (pts[i][0] - pts[i-1][0]) / 3
    const cp2y = pts[i][1]
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pts[i][0]} ${pts[i][1]}`
  }
  return d
}

export function ChartsWidgetContent() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  // Fixed viewBox: 400×140. Chart area: x 36–392, y 10–130
  const yScale = (v: number) => 130 - (v / 80) * 120
  const xAt    = (i: number) => 36 + i * (356 / 3)
  const yLabels = [0, 20, 40, 60, 80]
  const xLabels = ["W1", "W2", "W3", "W4"]

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    // Map rendered pixel X to viewBox X (0–400)
    const svgX = ((e.clientX - rect.left) / rect.width) * 400
    // Find nearest column
    let best = 0, bestDist = Infinity
    for (let i = 0; i < 4; i++) {
      const dist = Math.abs(xAt(i) - svgX)
      if (dist < bestDist) { bestDist = dist; best = i }
    }
    setHoveredIdx(best)
  }

  // Tooltip side: right when idx ≤ 1, left when idx ≥ 2
  // Percentage across the SVG width for the crosshair position
  const crosshairPct = hoveredIdx !== null ? (xAt(hoveredIdx) / 400) * 100 : 0

  return (
    <div className="flex flex-col gap-[8px]" style={{ flex: 1, minHeight: 0 }}>
      {/* Legend */}
      <div className="flex gap-[10px] flex-wrap" style={{ flexShrink: 0 }}>
        {PERF_SERIES.map(s => (
          <div key={s.label} className="flex items-center gap-[4px]">
            <div style={{ width: 12, height: 2, background: s.color, borderRadius: 1 }} />
            <span style={{ fontSize: 10, color: "var(--color-text-subtitle)" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Chart wrapper — flex:1 to fill remaining height; minHeight:120 prevents SVG from collapsing */}
      <div style={{ position: "relative", flex: 1, minHeight: 120, paddingBottom: 20 }}>

        {/* Floating insight card tooltip */}
        {hoveredIdx !== null && (
          <div
            style={{
              position: "absolute",
              top: 30,
              ...(hoveredIdx <= 1
                ? { left: `calc(${crosshairPct}% + 8px)` }
                : { right: `calc(${100 - crosshairPct}% + 8px)` }),
              background: "var(--widget-bg)",
              border: "1px solid var(--field-border)",
              borderRadius: 8,
              padding: "10px 12px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.18)", // audit-ignore: Charts widget crosshair tooltip shadow, pending Figma effect-name mapping (2026-08 audit)
              pointerEvents: "none",
              zIndex: 10,
              minWidth: 140,
              whiteSpace: "nowrap",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-title)", marginBottom: 6 }}>
              Week {xLabels[hoveredIdx]}
            </div>
            {PERF_SERIES.map(s => (
              <div key={s.label} className="flex items-center gap-[6px]" style={{ marginBottom: 3 }}>
                <span style={{ fontSize: 12, color: s.color, fontWeight: 500 }}>{s.label}:</span>
                <span style={{ fontSize: 12, color: "var(--color-text-title)", fontWeight: 500 }}>
                  {s.data[hoveredIdx]}
                </span>
              </div>
            ))}
          </div>
        )}

        <svg
          width="100%"
          viewBox="0 0 400 140"
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIdx(null)}
          style={{ display: "block", cursor: "crosshair", position: "absolute", inset: 0, height: "100%" }}
        >
          {/* Horizontal grid lines */}
          {yLabels.map(yv => (
            <line
              key={yv}
              x1="36" x2="392"
              y1={yScale(yv)} y2={yScale(yv)}
              stroke="var(--field-border)"
              strokeWidth="0.5"
              strokeDasharray="2,4"
            />
          ))}

          {/* Crosshair vertical line */}
          {hoveredIdx !== null && (
            <line
              x1={xAt(hoveredIdx)} x2={xAt(hoveredIdx)}
              y1={10} y2={130}
              stroke="var(--field-border)"
              strokeWidth="1"
            />
          )}

          {/* Series smooth lines */}
          {PERF_SERIES.map(s => {
            const pts: [number, number][] = s.data.map((v, i) => [xAt(i), yScale(v)])
            return (
              <path
                key={s.label}
                d={smoothPath(pts)}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )
          })}

          {/* Data point dots — only on hover */}
          {hoveredIdx !== null && PERF_SERIES.map(s => (
            <circle
              key={s.label}
              cx={xAt(hoveredIdx)}
              cy={yScale(s.data[hoveredIdx])}
              r={3}
              fill={s.color}
            />
          ))}
        </svg>

        {/* Y-axis labels — fixed HTML, don't scale with SVG */}
        <div style={{
          position: "absolute", top: 0, left: 0, bottom: 16,
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          pointerEvents: "none",
        }}>
          {[80, 60, 40, 20, 0].map(yv => (
            <span key={yv} style={{ fontSize: 9, color: "var(--color-text-subtitle)", lineHeight: 1 }}>
              {yv}
            </span>
          ))}
        </div>

        {/* X-axis labels — fixed HTML, positioned at percentage */}
        <div style={{
          position: "absolute", bottom: 0, left: 36, right: 8,
          display: "flex", justifyContent: "space-between",
          pointerEvents: "none",
        }}>
          {["W1","W2","W3","W4"].map(lbl => (
            <span key={lbl} style={{ fontSize: 9, color: "var(--color-text-subtitle)", textAlign: "center", lineHeight: 1 }}>
              {lbl}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// A status is a Tag, and the variant carries the meaning — a hand-drawn dot in
// a raw token colour said "green" without saying "success", and it was the only
// status in the product that did not look like every other status.
const TABLE_ROWS: { name: string; status: string; statusVariant: "success" | "neutral" | "alert"; value: string }[] = [
  { name: "Alice Johnson", status: "Active",   statusVariant: "success", value: "$12,400" },
  { name: "Bob Smith",     status: "Inactive", statusVariant: "neutral", value: "$8,200"  },
  { name: "Carol Davis",   status: "Pending",  statusVariant: "alert",   value: "$5,600"  },
  { name: "Dave Wilson",   status: "Active",   statusVariant: "success", value: "$9,100"  },
]

export function TableWidgetContent() {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
            {["Name","Status","Value"].map(h => (
              <th key={h} style={{ padding: "4px 8px", textAlign: "left", fontSize: 10, fontWeight: 600, color: "var(--field-label)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TABLE_ROWS.map((row, i) => (
            <tr key={i} style={{ borderBottom: "0.5px solid var(--field-border)" }}>
              <td style={{ padding: "7px 8px", fontSize: 12, color: "var(--foreground)" }}>{row.name}</td>
              <td style={{ padding: "7px 8px" }}>
                <Tag variant={row.statusVariant} size="sm">{row.status}</Tag>
              </td>
              <td style={{ padding: "7px 8px", fontSize: 12, color: "var(--foreground)", fontWeight: 600 }}>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const ACTIVITY_DATA = [
  { type: "call",    title: "Inbound call from Sarah Johnson",  time: "2m ago",  status: "alert" as const,
    desc: "Sarah Johnson | Confirmed demo, asked for pricing. Available Thursday 3pm.", metaCount: 4 },
  { type: "email",   title: "Email from David Kim",             time: "15m ago", status: "default" as const,
    desc: "David Kim | Re: Q3 proposal — schedule a quick sync to review numbers?",    metaCount: 2 },
  { type: "meeting", title: "Meeting — Quarterly Review",       time: "1h ago",  status: "default" as const,
    desc: "Team | QBR completed. Action items assigned to Sarah and Mike for follow-up.", metaCount: 3 },
  { type: "sms",     title: "SMS — Maria Torres",               time: "2h ago",  status: "default" as const,
    desc: "Maria Torres | Thanks for follow-up. Loop in manager before Friday.",       metaCount: 1 },
  { type: "task",    title: "Task — Contract renewal due",      time: "3h ago",  status: "alert" as const,
    desc: "System | Contract renewal deadline approaching. Priority: High.",           metaCount: 2 },
  { type: "call",    title: "Missed call from James Carter",    time: "4h ago",  status: "error" as const,
    desc: "James Carter | Called twice — likely about contract renewal.",              metaCount: 3 },
]

const ACTIVITY_TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string; accentBorder: string }> = {
  call:    { icon: "Phone",         color: "var(--primary)",                          bg: "var(--color-surface-primary-subtle)",    accentBorder: "var(--color-border-primary-default)" },
  email:   { icon: "Mail",          color: "var(--color-border-light-blue-default)",  bg: "var(--color-surface-light-blue-subtle)", accentBorder: "var(--color-border-light-blue-default)" },
  sms:     { icon: "MessageSquare", color: "var(--color-border-success-default)",     bg: "var(--color-surface-success-subtle)",    accentBorder: "var(--color-border-success-default)" },
  meeting: { icon: "CalendarDays",  color: "var(--color-border-purple-default)",      bg: "var(--color-surface-purple-subtle)",     accentBorder: "var(--color-border-purple-default)" },
  task:    { icon: "CheckSquare",   color: "var(--color-surface-yellow-default)",     bg: "var(--color-surface-yellow-subtle)",     accentBorder: "var(--color-surface-yellow-default)" },
}

export function ActivityWidgetContent({ showMeta = false }: { showMeta?: boolean }) {
  type LIcon = React.FC<{ size?: number; style?: React.CSSProperties }>
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [hoveredIdx,  setHoveredIdx]  = useState<number | null>(null)
  const [slideoutOpen, setSlideoutOpen] = useState(false)
  const [slideoutTab, setSlideoutTab] = useState(0)
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)
  const iconStyle: React.CSSProperties = { color: "var(--color-text-subtitle)" }
  const dot = (key: string) => <span key={key} style={{ fontSize: 10, color: "var(--field-supporting)" }}>·</span>

  function showTip(e: React.MouseEvent, text: string) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setTooltip({ text, x: r.left + r.width / 2, y: r.top })
  }

  const META_GROUPS = (onTip: (e: React.MouseEvent, t: string) => void): React.ReactNode[][] => [
    [<span key="uid" style={{ fontSize: 10, color: "var(--color-text-subtitle)", fontFamily: "monospace",
        background: "var(--color-surface-neutral-default)", borderRadius: 3, padding: "1px 4px" }}>{`{User-ID}`}</span>],
    [dot("d1"), <span key="smile" style={{ cursor: "default" }} onMouseEnter={e => onTip(e, "Sentiment")} onMouseLeave={() => setTooltip(null)}><LucideIcons.Smile size={10} style={iconStyle} /></span>],
    [dot("d2"), <span key="chk" style={{ display: "flex", alignItems: "center", gap: 2, cursor: "default" }} onMouseEnter={e => onTip(e, "Tasks completed")} onMouseLeave={() => setTooltip(null)}>
        <LucideIcons.CheckSquare size={10} style={iconStyle} />
        <span style={{ fontSize: 10, color: "var(--color-text-subtitle)" }}>2</span></span>],
    [dot("d3"), <span key="wave" style={{ cursor: "default" }} onMouseEnter={e => onTip(e, "Recording available")} onMouseLeave={() => setTooltip(null)}><LucideIcons.AudioWaveform size={10} style={iconStyle} /></span>],
    [dot("d4"), <span key="arrow" style={{ cursor: "default" }} onMouseEnter={e => onTip(e, "Outbound")} onMouseLeave={() => setTooltip(null)}><LucideIcons.ArrowUpRight size={10} style={iconStyle} /></span>],
    [dot("d5"), <span key="clk" style={{ display: "flex", alignItems: "center", gap: 2, cursor: "default" }} onMouseEnter={e => onTip(e, "Call duration")} onMouseLeave={() => setTooltip(null)}>
        <LucideIcons.Clock size={10} style={iconStyle} />
        <span style={{ fontSize: 10, color: "var(--color-text-subtitle)" }}>4 mins</span></span>],
    [dot("d6"), <span key="cdl" style={{ cursor: "default" }} onMouseEnter={e => onTip(e, "Ended by agent")} onMouseLeave={() => setTooltip(null)}><LucideIcons.CornerDownLeft size={10} style={iconStyle} /></span>],
    [dot("d7"), <span key="flag" style={{ cursor: "default" }} onMouseEnter={e => onTip(e, "Priority flag")} onMouseLeave={() => setTooltip(null)}><LucideIcons.Flag size={10} style={iconStyle} /></span>],
  ]

  return (
    <>
      {/* Tooltip — portaled to body so transform:scale on canvas doesn't offset position:fixed */}
      {tooltip && typeof document !== "undefined" && createPortal(
        <div style={{
          position: "fixed",
          left: tooltip.x,
          top: tooltip.y - 4,
          transform: "translateX(-50%) translateY(-100%)",
          background: "var(--color-surface-neutral-darker)",
          color: "var(--color-text-negative)",
          borderRadius: 4,
          padding: "3px 7px",
          fontSize: 10,
          pointerEvents: "none",
          zIndex: 99999,
          whiteSpace: "nowrap",
        }}>
          {tooltip.text}
        </div>,
        document.body
      )}
      {/* SlideOut — opens when an activity item is clicked */}
      {slideoutOpen && selectedIdx !== null && (() => {
        const act = ACTIVITY_DATA[selectedIdx]
        const cfg = ACTIVITY_TYPE_CONFIG[act.type] ?? ACTIVITY_TYPE_CONFIG["call"]
        const CfgIcon = (LucideIcons as unknown as Record<string, LIcon>)[cfg.icon]
        const statusVariants: Record<string, string> = {
          alert: "Alert",
          error:   "Error",
          default: "Completed",
        }
        return (
          <SlideOut
            open={slideoutOpen}
            onClose={() => { setSlideoutOpen(false); setSelectedIdx(null) }}
            type="with-variants"
            size="m"
            title={act.title}
            subtitle={`${act.type.charAt(0).toUpperCase() + act.type.slice(1)} · ${act.time}`}
            showStatus={true}
            statusLabel={statusVariants[act.status] ?? "Completed"}
            showIcon={true}
            iconContent={CfgIcon ? <CfgIcon size={20} style={{ color: cfg.color }} /> : undefined}
            showTopButton={false}
            showTabs={true}
            tabLabels={["Overview", "Context", "Related"]}
            activeTab={slideoutTab}
            onTabChange={setSlideoutTab}
          >
            {slideoutTab === 0 && (
              <div className="flex flex-col gap-[20px]">
                <div className="flex flex-col gap-[8px]">
                  <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--field-supporting)" }}>Description</p>
                  <p className="text-[14px] leading-[1.5]" style={{ color: "var(--foreground)" }}>{act.desc}</p>
                </div>
                <div className="flex flex-col gap-[8px]">
                  <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--field-supporting)" }}>Details</p>
                  <div className="flex flex-col gap-[6px]">
                    {[
                      { icon: "Clock",       label: "Time",   value: act.time },
                      { icon: "Activity",    label: "Type",   value: act.type.charAt(0).toUpperCase() + act.type.slice(1) },
                      { icon: "AlertCircle", label: "Status", value: statusVariants[act.status] ?? "Completed" },
                    ].map(row => (
                      <div key={row.label} className="flex items-center gap-[10px] h-[36px] px-[12px] rounded-[8px]"
                        style={{ border: "0.5px solid var(--color-border-neutral-lighter)", background: "var(--color-surface-neutral-subtle)" }}>
                        {(() => { const I = (LucideIcons as unknown as Record<string, LIcon>)[row.icon]; return I ? <I size={13} style={{ color: "var(--field-supporting)" }} /> : null })()}
                        <span className="text-[12px] font-medium" style={{ color: "var(--field-supporting)", width: 60 }}>{row.label}</span>
                        <span className="text-[13px] font-medium" style={{ color: "var(--foreground)" }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {slideoutTab === 1 && (
              <div className="flex flex-col gap-[16px]">
                <div className="flex flex-col gap-[8px]">
                  <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--field-supporting)" }}>Entity</p>
                  <div className="flex items-center gap-[10px] h-[40px] px-[12px] rounded-[8px]"
                    style={{ border: "0.5px solid var(--color-border-neutral-lighter)" }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {CfgIcon && <CfgIcon size={11} style={{ color: cfg.color }} />}
                    </div>
                    <span className="text-[13px] font-medium font-mono" style={{ color: "var(--foreground)" }}>{`{User-ID}`}</span>
                  </div>
                </div>
                <div className="p-[12px] rounded-[8px]" style={{ background: "var(--color-surface-neutral-subtle)", border: "0.5px solid var(--color-border-neutral-lighter)" }}>
                  <p className="text-[12px]" style={{ color: "var(--field-supporting)" }}>Full entity context will be linked here in the product — name, company, health score, contract stage, and open tasks.</p>
                </div>
              </div>
            )}
            {slideoutTab === 2 && (
              <div className="flex flex-col gap-[8px]">
                <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--field-supporting)" }}>Recent activity</p>
                {ACTIVITY_DATA.filter((_, j) => j !== selectedIdx).slice(0, 3).map((other, j) => {
                  const oc = ACTIVITY_TYPE_CONFIG[other.type] ?? ACTIVITY_TYPE_CONFIG["call"]
                  const OI = (LucideIcons as unknown as Record<string, LIcon>)[oc.icon]
                  return (
                    <div key={j} className="flex items-center gap-[10px] h-[40px] px-[12px] rounded-[8px]"
                      style={{ border: "0.5px solid var(--color-border-neutral-lighter)" }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: oc.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {OI && <OI size={11} style={{ color: oc.color }} />}
                      </div>
                      <span className="text-[12px] font-medium flex-1" style={{ color: "var(--foreground)" }}>{other.title}</span>
                      <span className="text-[11px]" style={{ color: "var(--field-supporting)" }}>{other.time}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </SlideOut>
        )
      })()}
      <ScrollArea style={{ flex: 1, minHeight: 0, paddingBottom: 12 }}>
        {ACTIVITY_DATA.map((activity, i) => {
          const cfg = ACTIVITY_TYPE_CONFIG[activity.type] ?? ACTIVITY_TYPE_CONFIG["call"]
          const CfgIcon = (LucideIcons as unknown as Record<string, LIcon>)[cfg.icon]
          const showMetaRow = showMeta || (selectedIdx === i) || (hoveredIdx === i)

          return (
            <div key={i}
              onClick={() => { setSelectedIdx(i); setSlideoutOpen(true); setSlideoutTab(0) }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`group cursor-pointer rounded-[8px] px-[12px] py-[8px] transition-colors duration-150 mb-[4px] flex-shrink-0 hover:bg-[var(--color-surface-neutral-subtle)]${selectedIdx === i ? " bg-[var(--color-surface-neutral-subtle)] !border-[var(--card-default-selected-bd)]" : ""}`}
              style={{ border: "0.5px solid var(--field-border)" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                    background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {CfgIcon && <CfgIcon size={12} style={{ color: cfg.color }} />}
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-title)",
                    flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {activity.title}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  {activity.status === "alert" && (
                    <LucideIcons.AlertTriangle size={11} style={{ color: "var(--color-surface-alert-default)" }} />
                  )}
                  {activity.status === "error" && (
                    <LucideIcons.XCircle size={11} style={{ color: "var(--color-text-error)" }} />
                  )}
                  <span style={{ fontSize: 11, color: "var(--color-text-subtitle)" }}>{activity.time}</span>
                  <LucideIcons.ChevronRight size={11} style={{ color: "var(--color-text-subtitle)" }} />
                </div>
              </div>
              <p title={activity.desc} style={{ fontSize: 12, color: "var(--color-text-body)", lineHeight: "1.4",
                  margin: 0, paddingLeft: 34, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {activity.desc}
              </p>
              {/* Metadata row — smooth reveal on select */}
              <div style={{
                paddingLeft: 34,
                maxHeight: showMetaRow ? 36 : 0,
                opacity: showMetaRow ? 1 : 0,
                overflow: "visible",
                transition: "max-height 200ms ease, opacity 180ms ease",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                  {META_GROUPS(showTip).slice(0, Math.min(activity.metaCount, META_GROUPS(showTip).length)).flat()}
                </div>
              </div>
            </div>
          )
        })}
      </ScrollArea>
    </>
  )
}

const NOTES_ITEMS_DATA = [
  { title: "Alice Johnson — Renewal",   time: "2h ago",    initial: "A",
    color: "var(--primary)", bg: "var(--color-surface-primary-subtle)", accentBorder: "var(--color-border-primary-default)",
    text: "Follow up with Alice re: renewal contract. Q3 budget reviews — custom pricing needed.", taskCount: 3, fileCount: 2 },
  { title: "Team Sync — July Campaign", time: "Yesterday", initial: "T",
    color: "var(--color-border-purple-default)", bg: "var(--color-surface-purple-subtle)", accentBorder: "var(--color-border-purple-default)",
    text: "Prioritize warm leads in the Northeast for July. Assign Sarah for Northeast, Mike for Southeast.", taskCount: 1, fileCount: 0 },
  { title: "Maria Torres — Proposal",   time: "3h ago",    initial: "M",
    color: "var(--color-border-success-default)", bg: "var(--color-surface-success-subtle)", accentBorder: "var(--color-border-success-default)",
    text: "Budget constraints flagged. Offer alternative pricing tier before Thursday meeting.", taskCount: 2, fileCount: 1 },
  { title: "Carlos Mejía — Escalation", time: "1h ago",    initial: "C",
    color: "var(--color-surface-error-default)", bg: "var(--color-surface-error-subtle)", accentBorder: "var(--color-surface-error-default)",
    text: "Escalation from support queue re: integration failure. Needs urgent follow-up before EOD.", taskCount: 1, fileCount: 0 },
  { title: "Q3 Pipeline Review",        time: "5h ago",    initial: "Q",
    color: "var(--color-surface-yellow-default)", bg: "var(--color-surface-yellow-subtle)", accentBorder: "var(--color-surface-yellow-default)",
    text: "Review Q3 forecast data. Several deals at risk — connect with regional managers by EOD.", taskCount: 4, fileCount: 3 },
  { title: "Client Onboarding — Dec",   time: "4d ago",    initial: "D",
    color: "var(--color-border-light-blue-default)", bg: "var(--color-surface-light-blue-subtle)", accentBorder: "var(--color-border-light-blue-default)",
    text: "New enterprise client starting December. Coordinate legal, technical setup and training.", taskCount: 2, fileCount: 1 },
]

export function NotesWidgetContent({ showMeta = false }: { showMeta?: boolean }) {
  const [selectedNote, setSelectedNote] = useState<number | null>(null)
  const [hoveredIdx,   setHoveredIdx]   = useState<number | null>(null)
  const [slideoutTab,  setSlideoutTab]  = useState(0)
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)
  const iconSt: React.CSSProperties = { color: "var(--color-text-subtitle)" }
  const dot = (key: string) => <span key={key} style={{ fontSize: 10, color: "var(--field-supporting)" }}>·</span>

  function showTip(e: React.MouseEvent, text: string) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setTooltip({ text, x: r.left + r.width / 2, y: r.top })
  }

  return (
    <>
    {/* Tooltip — portaled to body so transform:scale on canvas doesn't offset position:fixed */}
    {tooltip && typeof document !== "undefined" && createPortal(
      <div style={{
        position: "fixed",
        left: tooltip.x,
        top: tooltip.y - 4,
        transform: "translateX(-50%) translateY(-100%)",
        background: "var(--color-surface-neutral-darker)",
        color: "var(--color-text-negative)",
        borderRadius: 4,
        padding: "3px 7px",
        fontSize: 10,
        pointerEvents: "none",
        zIndex: 99999,
        whiteSpace: "nowrap",
      }}>
        {tooltip.text}
      </div>,
      document.body
    )}
    {/* SlideOut — opens when a note item is clicked */}
    {selectedNote !== null && (() => {
      const note = NOTES_ITEMS_DATA[selectedNote]
      return (
        <SlideOut
          open={true}
          onClose={() => { setSelectedNote(null); setSlideoutTab(0) }}
          type="with-variants"
          size="m"
          title={note.title}
          subtitle={`Note · ${note.time}`}
          showStatus={true}
          statusLabel="Note"
          showIcon={true}
          iconContent={
            <div style={{ width: 24, height: 24, borderRadius: 6, background: note.bg,
                display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: note.color }}>{note.initial}</span>
            </div>
          }
          showTopButton={false}
          showTabs={true}
          tabLabels={["Content", "Tasks & Files", "Related"]}
          activeTab={slideoutTab}
          onTabChange={setSlideoutTab}
        >
          {slideoutTab === 0 && (
            <div className="flex flex-col gap-[20px]">
              <div className="flex flex-col gap-[8px]">
                <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--field-supporting)" }}>Note</p>
                <div className="p-[14px] rounded-[10px] leading-[1.6]" style={{ background: note.bg, border: `1px solid ${note.accentBorder}`, fontSize: 14, color: "var(--foreground)" }}>
                  {note.text}
                </div>
              </div>
              <div className="flex flex-col gap-[6px]">
                {[
                  { icon: "User",     label: "Author",  value: note.initial === "A" ? "Alice Johnson" : note.initial === "T" ? "Team" : "Maria Torres" },
                  { icon: "Clock",    label: "Created", value: note.time },
                  { icon: "Link",     label: "Linked",  value: "1 entity linked" },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-[10px] h-[36px] px-[12px] rounded-[8px]"
                    style={{ border: "0.5px solid var(--color-border-neutral-lighter)", background: "var(--color-surface-neutral-subtle)" }}>
                    {(() => { const I = (LucideIcons as unknown as Record<string, React.FC<{ size?: number; style?: React.CSSProperties }>>)[row.icon]; return I ? <I size={13} style={{ color: "var(--field-supporting)" }} /> : null })()}
                    <span className="text-[12px] font-medium" style={{ color: "var(--field-supporting)", width: 60 }}>{row.label}</span>
                    <span className="text-[13px] font-medium" style={{ color: "var(--foreground)" }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {slideoutTab === 1 && (
            <div className="flex flex-col gap-[16px]">
              {note.taskCount > 0 && (
                <div className="flex flex-col gap-[8px]">
                  <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--field-supporting)" }}>Tasks ({note.taskCount})</p>
                  {Array.from({ length: note.taskCount }).map((_, j) => (
                    <div key={j} className="flex items-center gap-[10px] h-[36px] px-[12px] rounded-[8px]"
                      style={{ border: "0.5px solid var(--color-border-neutral-lighter)" }}>
                      <LucideIcons.CheckSquare size={13} style={{ color: j === 0 ? "var(--color-text-success)" : "var(--field-supporting)" }} />
                      <span className="text-[13px]" style={{ color: "var(--foreground)", textDecoration: j === 0 ? "line-through" : "none", opacity: j === 0 ? 0.5 : 1 }}>
                        {["Follow up before Thursday", "Send pricing proposal", "CC account manager"][j] ?? `Task ${j + 1}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {note.fileCount > 0 && (
                <div className="flex flex-col gap-[8px]">
                  <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--field-supporting)" }}>Files ({note.fileCount})</p>
                  {Array.from({ length: note.fileCount }).map((_, j) => (
                    <div key={j} className="flex items-center gap-[10px] h-[36px] px-[12px] rounded-[8px]"
                      style={{ border: "0.5px solid var(--color-border-neutral-lighter)" }}>
                      <LucideIcons.FileText size={13} style={{ color: "var(--field-supporting)" }} />
                      <span className="text-[13px]" style={{ color: "var(--foreground)" }}>
                        {["Renewal_Proposal_Q3.pdf", "Pricing_Tier_Options.xlsx"][j] ?? `File ${j + 1}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {note.taskCount === 0 && note.fileCount === 0 && (
                <p className="text-[13px]" style={{ color: "var(--field-supporting)" }}>No tasks or files attached to this note.</p>
              )}
            </div>
          )}
          {slideoutTab === 2 && (
            <div className="flex flex-col gap-[8px]">
              <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--field-supporting)" }}>Other notes</p>
              {NOTES_ITEMS_DATA.filter((_, j) => j !== selectedNote).map((other, j) => (
                <div key={j} className="flex items-start gap-[10px] p-[10px] rounded-[8px]"
                  style={{ border: "0.5px solid var(--color-border-neutral-lighter)" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: other.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: other.color }}>{other.initial}</span>
                  </div>
                  <div className="flex flex-col gap-[2px] flex-1 min-w-0">
                    <span className="text-[13px] font-medium truncate" style={{ color: "var(--foreground)" }}>{other.title}</span>
                    <span className="text-[11px]" style={{ color: "var(--field-supporting)" }}>{other.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SlideOut>
      )
    })()}
    <ScrollArea style={{ flex: 1, minHeight: 0, paddingBottom: 12 }}>
      {NOTES_ITEMS_DATA.map((note, i) => {
        const showExpanded = showMeta || selectedNote === i || hoveredIdx === i
        return (
          <div
            key={i}
            onClick={() => { setSelectedNote(i); setSlideoutTab(0) }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            className={`group cursor-pointer rounded-[8px] px-[12px] py-[8px] transition-colors duration-150 mb-[4px] flex-shrink-0 hover:bg-[var(--color-surface-neutral-subtle)]${selectedNote === i ? " bg-[var(--color-surface-neutral-subtle)] !border-[var(--card-default-selected-bd)]" : ""}`}
            style={{ border: "0.5px solid var(--field-border)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                  background: note.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: note.color }}>{note.initial}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-title)",
                  flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {note.title}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: "var(--color-text-subtitle)" }}>{note.time}</span>
                <LucideIcons.ChevronRight size={11} style={{ color: "var(--color-text-subtitle)" }} />
              </div>
            </div>
            <p style={{ fontSize: 12, color: "var(--color-text-body)", lineHeight: "1.4",
                margin: 0, paddingLeft: 34, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {note.text}
            </p>
            {/* Metadata row — reveals on hover or selection */}
            <div style={{
              overflow: "hidden", paddingLeft: 34,
              maxHeight: showExpanded ? 36 : 0,
              opacity: showExpanded ? 1 : 0,
              transition: "max-height 200ms ease, opacity 180ms ease",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, color: "var(--color-text-subtitle)", fontFamily: "monospace",
                    background: "var(--color-surface-neutral-default)", borderRadius: 3, padding: "1px 4px",
                    cursor: "default" }}
                  onMouseEnter={e => showTip(e, "User ID")}
                  onMouseLeave={() => setTooltip(null)}
                >{`{User-ID}`}</span>
                {note.taskCount > 0 && <>
                  {dot("dt")}
                  <span style={{ display: "flex", alignItems: "center", gap: 2, cursor: "default" }}
                    onMouseEnter={e => showTip(e, "Tasks")}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    <LucideIcons.CheckSquare size={10} style={iconSt} />
                    <span style={{ fontSize: 10, color: "var(--color-text-subtitle)" }}>{note.taskCount}</span>
                  </span>
                </>}
                {note.fileCount > 0 && <>
                  {dot("df")}
                  <span style={{ display: "flex", alignItems: "center", gap: 2, cursor: "default" }}
                    onMouseEnter={e => showTip(e, "Attachments")}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    <LucideIcons.Paperclip size={10} style={iconSt} />
                    <span style={{ fontSize: 10, color: "var(--color-text-subtitle)" }}>{note.fileCount}</span>
                  </span>
                </>}
                {dot("dl")}
                <span style={{ cursor: "default" }}
                  onMouseEnter={e => showTip(e, "Linked items")}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <LucideIcons.Link size={10} style={iconSt} />
                </span>
                {dot("dc")}
                <span style={{ display: "flex", alignItems: "center", gap: 2, cursor: "default" }}
                  onMouseEnter={e => showTip(e, "Date")}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <LucideIcons.Calendar size={10} style={iconSt} />
                  <span style={{ fontSize: 10, color: "var(--color-text-subtitle)" }}>{note.time}</span>
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </ScrollArea>
    </>
  )
}

const FOLDER_FILES_DATA = [
  { name: "Q2 Campaign Pack",  icon: "Package"  },
  { name: "Marketing Assets",  icon: "Folder"   },
  { name: "Customer Personas", icon: "FileText" },
  { name: "Sales Scripts",     icon: "FileText" },
]

export function FolderNavWidgetContent() {
  const [folderTab, setFolderTab] = useState("packs")
  type LIcon = React.FC<{ size?: number; style?: React.CSSProperties }>
  return (
    <div className="flex flex-col gap-[8px]" style={{ flex: 1, minHeight: 0 }}>
      <div style={{ flexShrink: 0 }}>
        <Tabs
          size="s"
          items={[
            { id: "packs",     label: "Packs"     },
            { id: "drives",    label: "Drives"    },
            { id: "knowledge", label: "Knowledge" },
          ]}
          activeId={folderTab}
          onChange={setFolderTab}
        />
      </div>
      <div style={{ flexShrink: 0 }}>
        <Input size="sm" placeholder="Search..." leftIcon={<LucideIcons.Search size={11} />} readOnly />
      </div>
      <ScrollArea className="flex flex-col" style={{ flex: 1, minHeight: 0, paddingBottom: 12 }}>
        {FOLDER_FILES_DATA.map((f, i) => {
          const FIcon = (LucideIcons as unknown as Record<string, LIcon>)[f.icon]
          return (
            <div key={i} className="cursor-pointer flex items-center gap-[8px] rounded-[8px] px-[10px] py-[6px] transition-colors duration-150 mb-[2px] hover:bg-[var(--color-surface-neutral-subtle)]" style={{ border: "0.5px solid var(--field-border)" }}>
              {FIcon && <FIcon size={13} style={{ color: "var(--field-supporting)", flexShrink: 0 }} />}
              <span style={{ fontSize: 12, color: "var(--foreground)", flex: 1 }}>{f.name}</span>
            </div>
          )
        })}
      </ScrollArea>
    </div>
  )
}

export function StatusWarningWidgetContent() {
  const STATUS_COLS: { label: string; value: number; iconName: string; variant: HighlightIconVariant; labelColor: string }[] = [
    { label: "Normal",   value: 1284, iconName: "Check",         variant: "success", labelColor: "var(--color-text-success)"           },
    { label: "Warnings", value: 47,   iconName: "AlertTriangle",  variant: "alert",   labelColor: "var(--color-surface-alert-default)"  },
    { label: "Critical", value: 3,    iconName: "XCircle",        variant: "error",   labelColor: "var(--color-text-error)"             },
  ]
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {STATUS_COLS.map((col, i) => (
        <div key={i} style={{
          flex: 1, display: "flex", alignItems: "flex-start", gap: 12,
          padding: "12px 16px", borderRadius: 8,
          border: "1px solid var(--field-border)",
          background: "var(--widget-bg)",
        }}>
          <HighlightIcon size="md" variant={col.variant} iconName={col.iconName} />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 500, color: col.labelColor, lineHeight: 1.2 }}>
              {col.label}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-title)", lineHeight: 1 }}>
              {col.value.toLocaleString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Act Now Summary ───────────────────────────────────────────────────────────


const ACT_NOW_CARD_DATA: Record<string, { title: string; studio: string[]; status: string; remaining: number; borderColor: string; tagVariant: "error" | "alert" | "informative" }> = {
  "Act Now":  { title: "Financial Policy PDF — DIAN approval required",    studio: ["GOV"],  status: "Blocking 14 workflows · 3 agents", remaining: 3,  borderColor: "var(--color-surface-error-default)",       tagVariant: "error"       },
  "Critical": { title: "SalesForecastPA about to send external email",     studio: ["AGNT"], status: "Paused · awaiting review",        remaining: 6,  borderColor: "var(--color-surface-alert-default)",       tagVariant: "alert"       },
  "Action":   { title: "Q3 Forecast Schema needs field remap",             studio: ["DATA"], status: "Action needed · this week",       remaining: 11, borderColor: "var(--primary)",                           tagVariant: "informative" },
}

export function ActNowSummaryWidgetContent() {
  const card = ACT_NOW_CARD_DATA["Act Now"]
  const containerRef = useRef<HTMLDivElement>(null)
  const [isNarrow, setIsNarrow] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setIsNarrow(entry.contentRect.width < 340)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const trunc = (s: string, n: number) => s.length > n ? s.slice(0, n) + "…" : s

  const bannerTitle = isNarrow ? trunc(card.status, 18) : card.status

  return (
    <div ref={containerRef} className="flex flex-col gap-[8px]">
      {/* Summary banner — fills full width */}
      {isNarrow ? (
        <Tooltip content={card.status} side="top">
          <div className="w-full">
            <InformativeCard state="error" size="sm" title={bannerTitle} className="w-full" />
          </div>
        </Tooltip>
      ) : (
        <InformativeCard state="error" size="sm" title={bannerTitle} className="w-full" />
      )}

      {/* Event card */}
      <div style={{
        background: "var(--color-surface-neutral-default)",
        border: "0.5px solid var(--field-border)",
        borderRadius: 8, padding: "10px 12px",
        display: "flex", flexDirection: "column", gap: 8,
      }}>
        <div className="flex items-center gap-[4px] flex-wrap">
          {card.studio.map(s => (
            <div key={s} style={{ display: "inline-flex" }}>
              <Tag variant="neutral" size="sm">{s}</Tag>
            </div>
          ))}
          <div style={{ display: "inline-flex" }}>
            <Tag variant={card.tagVariant} size="sm">Act Now</Tag>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--foreground)", lineHeight: 1.35 }}>
          {isNarrow ? trunc(card.title, 28) : card.title}
        </p>
        {/* Actions — horizontal row, hug content, 8px gap */}
        <div className="flex items-center flex-wrap gap-[8px]">
          <Button variant="primary" size="sm">Take action</Button>
          <Button variant="secondary" size="sm">Skip for now</Button>
          <Button variant="tertiary" size="sm">{card.remaining} more in this tier →</Button>
        </div>
      </div>
    </div>
  )
}

// ── My Work ───────────────────────────────────────────────────────────────────

const MY_WORK_GROUPS_DATA = [
  {
    id: "act-now",  label: "Act Now",  sublabel: "blocking",
    badgeVariant: "error"      as BadgeVariant,
    tagVariant:   "error"      as const,
    items: [
      { studio: "GOV",  type: "Approval", crit: true,  title: "Financial Policy PDF — DIAN approval required",  status: "Blocking · 14 workflows", time: "~10m" },
      { studio: "AGNT", type: "Review",   crit: false, title: "SalesForecastPA about to send external email",   status: "Paused · awaiting review", time: "~5m"  },
    ],
  },
  {
    id: "critical", label: "Critical", sublabel: "within 7 days",
    badgeVariant: "alert"      as BadgeVariant,
    tagVariant:   "alert"      as const,
    items: [
      { studio: "DATA", type: "Remap",   crit: false, title: "Q3 Forecast Schema needs field remap",         status: "Action needed · schema mismatch", time: "~15m" },
      { studio: "GOV",  type: "Approve", crit: false, title: "Vendor NDA batch — legal sign-off pending",    status: "Waiting on legal",               time: "~8m"  },
    ],
  },
  {
    id: "action",   label: "Action",   sublabel: "this week",
    badgeVariant: "inProgress" as BadgeVariant,
    tagVariant:   "informative" as const,
    items: [
      { studio: "TASK", type: "Respond",     crit: false, title: "Renewal contract draft v2 awaiting sign-off",    status: "Ready for review",        time: "~8m"  },
      { studio: "GOV",  type: "Acknowledge", crit: false, title: "DIAN intake package #48 compliance check",       status: "Pending acknowledgement", time: "~5m"  },
      { studio: "AGNT", type: "Review",      crit: false, title: "Agent output flagged for hallucination check",   status: "Queued · low priority",   time: "~6m"  },
    ],
  },
]

export function MyWorkWidgetContent() {
  const { isNarrow } = useWidgetSize()
  const [studioFilter, setStudioFilter] = useState<string | null>(null)
  const [typeFilter,   setTypeFilter]   = useState<string | null>(null)
  const [search,       setSearch]       = useState("")

  const allTypes    = Array.from(new Set(MY_WORK_GROUPS_DATA.flatMap(g => g.items.map(i => i.type))))
  const maxPerGroup = isNarrow ? 2 : undefined

  return (
    <ScrollArea style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 8, paddingBottom: 12 }}>
      {/* Search bar — DS Input atom, not a hand-rolled <input> */}
      <Input
        size="sm"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search events..."
        leftIcon={<LucideIcons.Search size={12} />}
      />
      {/* Filters — hidden on narrow to save space; search still available */}
      {!isNarrow && (
        <div className="[&::-webkit-scrollbar]:hidden" style={{ overflowX: "auto", scrollbarWidth: "none" as React.CSSProperties["scrollbarWidth"] }}>
          <div className="flex items-center gap-[4px]" style={{ flexWrap: "nowrap", minWidth: "max-content" }}>
            {["GOV","AGNT","DATA","TASK"].map(s => (
              <Chip key={s} variant={studioFilter === s ? "primary" : "secondary"} size="s" onClick={() => setStudioFilter(p => p === s ? null : s)}>{s}</Chip>
            ))}
            <span style={{ width: 1, height: 14, background: "var(--field-border)", flexShrink: 0, margin: "0 2px" }} />
            {allTypes.map(t => (
              <Chip key={t} variant={typeFilter === t ? "primary" : "secondary"} size="s" onClick={() => setTypeFilter(p => p === t ? null : t)}>{t}</Chip>
            ))}
          </div>
        </div>
      )}
      {/* Groups */}
      {MY_WORK_GROUPS_DATA.map(group => {
        const q = search.toLowerCase()
        const visible = group.items.filter(it =>
          (!studioFilter || it.studio === studioFilter) &&
          (!typeFilter   || it.type   === typeFilter) &&
          (!q || it.title.toLowerCase().includes(q) || it.type.toLowerCase().includes(q) || it.studio.toLowerCase().includes(q))
        ).slice(0, maxPerGroup)
        if (visible.length === 0) return null
        return (
          <div key={group.id}>
            <div className="flex items-center justify-between" style={{ padding: "4px 0", marginBottom: 4 }}>
              <div className="flex items-center gap-[6px]">
                <Badge variant={group.badgeVariant} />
                <span style={{ fontSize: 12, fontWeight: 400, color: "var(--color-text-subtitle)" }}>{group.label}</span>
                <span style={{ fontSize: 12, color: "var(--color-text-placeholder)" }}>· {group.sublabel}</span>
              </div>
              <Tag variant={group.tagVariant} size="sm">{visible.length}</Tag>
            </div>
            {visible.map((item, idx) => {
              const key = `${group.id}-${idx}`
              return (
                <div key={key} className="group cursor-pointer rounded-[8px] px-[12px] py-[8px] transition-colors duration-150 mb-[2px] hover:bg-[var(--color-surface-neutral-subtle)]" style={{ border: "0.5px solid var(--field-border)" }}>
                  <div className="flex items-center justify-between mb-[3px]">
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--foreground)", lineHeight: 1.35, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 8 }}>{item.title}</p>
                    <span style={{ fontSize: 10, color: "var(--field-supporting)", whiteSpace: "nowrap", flexShrink: 0 }}>{item.time}</span>
                  </div>
                  <div className="flex items-center gap-[4px] flex-wrap mb-[2px]">
                    <Tag variant="neutral" size="sm">{item.studio}</Tag>
                    <Tag variant="neutral" size="sm">{item.type}</Tag>
                    {item.crit && <Tag variant="error" size="sm">⚡ Critical</Tag>}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--field-supporting)" }}>{item.status}</span>
                  <div className="hidden group-hover:flex items-center gap-[6px] mt-[8px]"><Button variant="primary" size="sm">Take</Button><Button variant="secondary" size="sm">Escalate</Button><Button variant="tertiary" size="sm">Defer</Button></div>
                </div>
              )
            })}
          </div>
        )
      })}
      <Button variant="tertiary" size="sm">See all in Attention Room →</Button>
    </ScrollArea>
  )
}

// ── My Team ───────────────────────────────────────────────────────────────────

const MY_TEAM_DATA = [
  { initials: "AR", name: "Ana Restrepo", role: "Revenue Ops",  ooo: null,    dots: [{ count: 2 }, { count: 3 }, { count: 5 }, { count: 1 }] },
  { initials: "CM", name: "Carlos Mejía", role: "Governance",   ooo: null,    dots: [{ count: 1 }, { count: 3 }, { count: 4 }, { count: 0 }] },
  { initials: "DT", name: "Diana Torres", role: "Agent Ops",    ooo: "Aug 1", dots: [{ count: 1 }, { count: 2 }, { count: 1 }, { count: 2 }] },
  { initials: "FK", name: "Felipe Kim",   role: "Data Studio",  ooo: null,    dots: [{ count: 0 }, { count: 1 }, { count: 3 }, { count: 0 }] },
]
const MY_TEAM_DOT_COLORS = [
  "var(--color-surface-error-default)",
  "var(--color-surface-alert-default)",
  "var(--primary)",
  "var(--color-icon-neutral-default)",
]
const MY_TEAM_DOT_TIPS = ["Act Now · blocking", "Critical · within 7 days", "Action · this week", "Heads-up"]

export function MyTeamWidgetContent() {
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const teamContainerRef = useRef<HTMLDivElement>(null)
  const [isNarrowTeam, setIsNarrowTeam] = useState(false)

  useEffect(() => {
    const el = teamContainerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setIsNarrowTeam(entry.contentRect.width < 340)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const trunc = (s: string, n: number) => s.length > n ? s.slice(0, n) + "…" : s
  const fullAlert  = "5 blocking events across your team require immediate attention."
  const alertTitle = "5 blocking events need attention"

  return (
    <div ref={teamContainerRef} className="flex flex-col gap-[0px]" style={{ flex: 1, minHeight: 0 }}>
      {!bannerDismissed && (
        <div style={{ marginBottom: 8 }}>
          {isNarrowTeam ? (
            <Tooltip content={fullAlert} side="top">
              <div>
                <InformativeCard state="error" size="sm"
                  title={trunc(alertTitle, 22)}
                  cta={{ label: "Dismiss", onClick: () => setBannerDismissed(true) }}
                />
              </div>
            </Tooltip>
          ) : (
            <InformativeCard state="error" size="sm"
              title={alertTitle}
              cta={{ label: "Dismiss", onClick: () => setBannerDismissed(true) }}
            />
          )}
        </div>
      )}
      <ScrollArea style={{ flex: 1, minHeight: 0, paddingBottom: 12 }}>
        {MY_TEAM_DATA.map((member, i) => (
          <div key={i} className="group cursor-pointer rounded-[8px] px-[12px] py-[8px] transition-colors duration-150 mb-[4px] hover:bg-[var(--color-surface-neutral-subtle)]" style={{ border: "0.5px solid var(--field-border)" }}>
            <div className="flex items-start gap-[8px]">
              <AvatarCircle name={member.name} sizeKey="md" />
              <div className="flex flex-col flex-1 min-w-0" style={{ gap: 1 }}>
                <div className="flex items-center gap-[6px] w-full">
                  <Tooltip content={member.name} side="top">
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{member.name}</span>
                  </Tooltip>
                  {member.ooo && <span style={{ flexShrink: 0 }}><Tag variant="alert" size="sm">{`OOO · returns ${member.ooo}`}</Tag></span>}
                </div>
                <span style={{ fontSize: 10, color: "var(--field-supporting)" }}>{member.role}</span>
                <div className="flex items-center gap-[8px]" style={{ marginTop: 4 }}>
                  {member.dots.map((dot, j) => {
                    if (dot.count === 0) return null
                    return (
                      <Tooltip key={j} content={MY_TEAM_DOT_TIPS[j] ?? "Status"} side="top">
                        <div className="flex items-center gap-[4px]" style={{ cursor: "default" }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: MY_TEAM_DOT_COLORS[j], display: "inline-block", flexShrink: 0 }} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--foreground)" }}>{dot.count}</span>
                        </div>
                      </Tooltip>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="hidden group-hover:flex items-center gap-[4px] mt-[6px] ml-[36px]">
              <Button variant="secondary" size="sm">Take</Button>
              <Button variant="secondary" size="sm">Nudge</Button>
              <Button variant="secondary" size="sm">Reassign</Button>
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  )
}

// ── Workflows ─────────────────────────────────────────────────────────────────

const WORKFLOWS_DATA: { name: string; status: "running"|"done"|"failed"|"paused"; trigger: string; timeAgo: string; runsToday: number; progress?: number }[] = [
  { name: "Lead Enrichment — Inbound",   status: "running", trigger: "New form submission",         timeAgo: "4 min ago",   runsToday: 24, progress: 68 },
  { name: "Deal Stage Notifications",    status: "running", trigger: "CRM stage change",            timeAgo: "Just now",    runsToday: 17, progress: 90 },
  { name: "Nightly ETL — Salesforce",    status: "done",    trigger: "Scheduled · 02:00",           timeAgo: "6 hours ago", runsToday: 1                },
  { name: "Churn Risk Scoring",          status: "failed",  trigger: "NPS field missing",           timeAgo: "1 hour ago",  runsToday: 0                },
  { name: "CS Escalation Router",        status: "paused",  trigger: "HTL queue threshold reached", timeAgo: "2 days ago",  runsToday: 0                },
]

const WF_TAG_VARIANT: Record<string, "success"|"error"|"neutral"|"informative"> = {
  running: "success", done: "informative", failed: "error", paused: "neutral",
}
const WF_TAG_LABEL: Record<string, string> = {
  running: "Running", done: "Done", failed: "Failed", paused: "Paused",
}

export function WorkflowsWidgetContent() {
  const { isNarrow } = useWidgetSize()
  return (
    <ScrollArea className="flex flex-col gap-[0px]" style={{ flex: 1, minHeight: 0, paddingBottom: 12 }}>
      {WORKFLOWS_DATA.map((wf, i) => (
        <div key={i} className="cursor-pointer rounded-[8px] px-[12px] py-[8px] transition-colors duration-150 mb-[4px] hover:bg-[var(--color-surface-neutral-subtle)]" style={{ border: "0.5px solid var(--field-border)" }}>
          <div className="flex items-start gap-[8px]">
            <div className="flex flex-col flex-1 min-w-0" style={{ gap: 3 }}>
              <div className="flex items-center gap-[6px]">
                {wf.status === "running" && (
                  <span className="animate-pulse" style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: "var(--color-surface-success-default)", display: "inline-block" }} />
                )}
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{wf.name}</span>
                <span style={{ flexShrink: 0 }}><Tag variant={WF_TAG_VARIANT[wf.status]} size="sm">{WF_TAG_LABEL[wf.status]}</Tag></span>
              </div>
              {!isNarrow && <span style={{ fontSize: 11, color: "var(--field-supporting)" }}>{wf.trigger}</span>}
              {!isNarrow && wf.status === "running" && wf.progress !== undefined && (
                <div style={{ height: 4, background: "var(--color-surface-neutral-default)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${wf.progress}%`, background: "var(--primary)", borderRadius: 2, transition: "width 500ms ease" }} />
                </div>
              )}
              {!isNarrow && <span style={{ fontSize: 10, color: "var(--field-supporting)" }}>{wf.timeAgo}{wf.runsToday > 0 ? ` · ${wf.runsToday} runs today` : ""}</span>}
            </div>
            {wf.status === "failed" && (
              <div className="flex items-center gap-[4px]" style={{ flexShrink: 0 }}>
                <Button variant="secondary" size="sm">Retry</Button>
                {!isNarrow && <Button variant="tertiary" size="sm">Logs</Button>}
              </div>
            )}
            {wf.status === "paused" && <Button variant="secondary" size="sm" style={{ flexShrink: 0 }}>Resume</Button>}
          </div>
        </div>
      ))}
    </ScrollArea>
  )
}

// ── Pending Outputs ───────────────────────────────────────────────────────────

const PENDING_OUTPUTS_DATA = [
  { name: "Q3 Pipeline Forecast — July Revision",  source: "Monthly Forecast Roll-up", timeAgo: "12m ago",   tagVariant: "success"     as const, statusLabel: "Ready for review"   },
  { name: "Acme Corp Renewal Contract Draft v2",   source: "Renewals Outreach",        timeAgo: "1h ago",    tagVariant: "alert"       as const, statusLabel: "Adjusted — pending" },
  { name: "DIAN Intake Package #48",               source: "DIAN Compliance Intake",   timeAgo: "2h ago",    tagVariant: "error"       as const, statusLabel: "Requires approval"  },
  { name: "Support Queue Summary — Jul 22",        source: "Support Summary PA",       timeAgo: "Yesterday", tagVariant: "informative" as const, statusLabel: "Advanced"          },
]

export function PendingOutputsWidgetContent() {
  const [selected, setSelected] = useState<typeof PENDING_OUTPUTS_DATA[0] | null>(null)

  return (
    <>
      <ScrollArea className="flex flex-col gap-[6px]" style={{ flex: 1, minHeight: 0, paddingBottom: 12 }}>
        {PENDING_OUTPUTS_DATA.map((item, i) => (
          <div key={i} className="cursor-pointer rounded-[8px] px-[12px] py-[8px] transition-colors duration-150 mb-[4px] hover:bg-[var(--color-surface-neutral-subtle)]" style={{ border: "0.5px solid var(--field-border)" }} onClick={() => setSelected(item)}>
            <div className="flex items-start gap-[8px]">
              <div className="flex flex-col flex-1 min-w-0" style={{ gap: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
                <span style={{ fontSize: 11, color: "var(--field-supporting)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.source} · {item.timeAgo}</span>
              </div>
              <div style={{ flexShrink: 0 }}>
                <Tag variant={item.tagVariant} size="sm">{item.statusLabel}</Tag>
              </div>
            </div>
          </div>
        ))}
      </ScrollArea>
      {selected && (
        <SlideOut open onClose={() => setSelected(null)} title={selected.name} subtitle={selected.source}
          showTabs={false} showChips={false} showSearchBar={false}
          showCta ctaPrimaryLabel="Advance" ctaSecondaryLabel="Close" onCtaSecondary={() => setSelected(null)}>
          <div className="flex flex-col gap-[20px] pb-[12px]">

            {/* Section: Status */}
            <div className="flex flex-col gap-[8px]">
              <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--field-label)" }}>Status</span>
              <div className="self-start">
                <Tag variant={selected.tagVariant} size="sm">{selected.statusLabel}</Tag>
              </div>
              <p className="text-[12px] leading-[1.5]" style={{ margin: 0, color: "var(--foreground)" }}>
                This output was generated by your PA and is ready for your review. Verify the authority data below before advancing.
              </p>
            </div>

            {/* Section: Authority Data (detail table) */}
            <div className="flex flex-col gap-[8px]">
              <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--field-label)" }}>Authority Data</span>
              <div className="flex flex-col rounded-[8px] overflow-hidden" style={{ border: "1px solid var(--field-border)" }}>
                {([
                  ["Source",      selected.source            ],
                  ["Generated",   selected.timeAgo           ],
                  ["Status",      selected.statusLabel       ],
                  ["Verified by", "AIMS Knowledge Graph · v2"],
                ] as [string, string][]).map(([label, value], i, arr) => (
                  <div key={label}>
                    <div className="flex items-center gap-[19px] py-[8px] px-[12px]">
                      <span className="w-[100px] shrink-0 text-[12px] font-medium leading-[20px]" style={{ color: "var(--foreground)" }}>{label}</span>
                      <span className="flex-1 text-[12px] font-medium leading-[20px]" style={{ color: "var(--field-supporting)" }}>{value}</span>
                    </div>
                    {i < arr.length - 1 && <div className="w-full h-[1px]" style={{ background: "var(--color-border-neutral-lighter)" }} />}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </SlideOut>
      )}
    </>
  )
}

// ── Agent Catalog ─────────────────────────────────────────────────────────────

const AGENT_CATALOG_DATA = [
  { name: "Revenue Insight PA",       desc: "Pipeline health, quota attainment, deal forecasting.",  available: true,  isWorkflow: false, prompts: ["Summarize Q3 pipeline", "Show quota gaps", "Flag at-risk deals"]                              },
  { name: "People Ops PA",            desc: "HR policies, compliance, people communications.",        available: true,  isWorkflow: false, prompts: ["Summarize open headcount", "Draft PIP letter", "Check compliance status"]                    },
  { name: "Support Summary PA",       desc: "Ticket queue summary, escalation risk, triage notes.",   available: true,  isWorkflow: false, prompts: ["Show open P1 tickets", "Summarize yesterday's queue", "Flag escalation risk"]                },
  { name: "Lead Enrichment Workflow", desc: "Enriches inbound leads before routing to CRM.",          available: true,  isWorkflow: true,  prompts: ["Enrich new form submission", "Preview enrichment for Acme", "Show enrichment error log"]    },
  { name: "Market Intel PA",          desc: "Competitive intelligence from public sources.",           available: false, isWorkflow: false, prompts: ["Benchmark vs competitor", "Summarize recent coverage", "Flag new product launches"]          },
  { name: "Churn Risk Workflow",      desc: "Scores accounts for churn risk on a daily schedule.",     available: true,  isWorkflow: true,  prompts: ["Run churn score now", "Show accounts at risk", "Export risk report"]                        },
  { name: "DIAN Compliance PA",       desc: "Regulatory filings, intake packages, compliance checks.", available: true,  isWorkflow: false, prompts: ["Check DIAN intake #48", "Summarize pending filings", "Draft compliance memo"]               },
  { name: "CS Escalation Workflow",   desc: "Routes escalations from support queue to senior agents.", available: true,  isWorkflow: true,  prompts: ["Show escalation queue", "Route open P0 tickets", "View escalation log"]                    },
]

const AGENT_TYPE_FILTERS = [
  { label: "All",      fn: (_: typeof AGENT_CATALOG_DATA[0]) => true             },
  { label: "Single",   fn: (a: typeof AGENT_CATALOG_DATA[0]) => !a.isWorkflow    },
  { label: "Workflow", fn: (a: typeof AGENT_CATALOG_DATA[0]) => a.isWorkflow     },
]

export function AgentCatalogWidgetContent() {
  const [typeIdx,       setTypeIdx]       = useState(0)
  const [selectedAgent, setSelectedAgent] = useState<typeof AGENT_CATALOG_DATA[0] | null>(null)

  const visible = AGENT_CATALOG_DATA.filter(AGENT_TYPE_FILTERS[typeIdx].fn)

  return (
    <>
      <div className="flex flex-col gap-[0px]">
        <div className="flex items-center gap-[4px] flex-wrap mb-[10px]">
          {AGENT_TYPE_FILTERS.map((f, i) => (
            <Chip key={f.label} variant={typeIdx === i ? "primary" : "secondary"} size="s" onClick={() => setTypeIdx(i)}>
              {f.label} · {AGENT_CATALOG_DATA.filter(f.fn).length}
            </Chip>
          ))}
        </div>
        <ScrollArea style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, maxHeight: 260, paddingBottom: 12 }}>
          {visible.map((agent, i) => (
            <div key={i} className={`cursor-pointer rounded-[8px] px-[12px] py-[8px] transition-colors duration-150 mb-[4px] hover:bg-[var(--color-surface-neutral-subtle)]${!agent.available ? " opacity-60" : ""}`} style={{ border: "0.5px solid var(--field-border)" }} onClick={() => setSelectedAgent(agent)}>
              <div className="flex items-start justify-between gap-[6px]">
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", lineHeight: 1.3 }}>{agent.name}</span>
                {agent.isWorkflow && <span style={{ flexShrink: 0 }}><Tag variant="informative" size="sm">Workflow</Tag></span>}
              </div>
              <span style={{ fontSize: 11, color: "var(--field-supporting)", lineHeight: 1.4 }}>{agent.desc}</span>
              <div style={{ display: "flex" }}>
                <Tag variant={agent.available ? "success" : "neutral"} size="sm">{agent.available ? "Grounded" : "Unavailable"}</Tag>
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>
      {selectedAgent && (
        <SlideOut open onClose={() => setSelectedAgent(null)} title={selectedAgent.name} subtitle={selectedAgent.isWorkflow ? "Workflow Agent" : "Single Agent"}
          showTabs={false} showChips={false} showSearchBar={false}
          showCta={selectedAgent.available} ctaPrimaryLabel="Run" ctaSecondaryLabel="Close" onCtaSecondary={() => setSelectedAgent(null)}>
          <div className="flex flex-col gap-[16px]" style={{ padding: "4px 0" }}>
            <div className="flex items-center gap-[6px]">
              <Tag variant={selectedAgent.available ? "success" : "neutral"} size="sm">{selectedAgent.available ? "Grounded" : "Unavailable"}</Tag>
              {selectedAgent.isWorkflow && <Tag variant="informative" size="sm">Workflow</Tag>}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--foreground)", lineHeight: 1.6 }}>{selectedAgent.desc}</p>
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--field-supporting)", display: "block", marginBottom: 8 }}>Example Prompts</span>
              {selectedAgent.prompts.map((prompt, j) => (
                <div key={j} className="cursor-pointer rounded-[8px] px-[12px] py-[8px] transition-colors duration-150 mb-[6px] hover:bg-[var(--color-surface-neutral-subtle)]" style={{ border: "0.5px solid var(--field-border)", fontSize: 12, color: "var(--foreground)" }}>"{prompt}"</div>
              ))}
            </div>
          </div>
        </SlideOut>
      )}
    </>
  )
}

export function WidgetContent({ id, kpiVariant = 2 }: { id: string; kpiVariant?: 0|1|2|3 }) {
  switch (id) {
    case "kpi":        return <KpiWidgetContent variant={kpiVariant} />
    case "timeline":   return <TimelineWidgetContent />

    case "charts":     return <ChartsWidgetContent />
    case "table":      return <TableWidgetContent />
    case "activity":   return <ActivityWidgetContent />
    case "notes":      return <NotesWidgetContent />
    case "folder-nav":      return <FolderNavWidgetContent />
    case "status-warning":  return <StatusWarningWidgetContent />
    case "act-now-summary": return <ActNowSummaryWidgetContent />
    case "my-work":         return <MyWorkWidgetContent />
    case "my-team":         return <MyTeamWidgetContent />
    case "workflows":       return <WorkflowsWidgetContent />
    case "pending-outputs": return <PendingOutputsWidgetContent />
    case "agent-catalog":   return <AgentCatalogWidgetContent />
    default:
      return (
        <div className="flex items-center justify-center rounded-[6px] py-[16px]"
          style={{ background: "var(--color-surface-neutral-default)", border: "1px dashed var(--field-border)" }}>
          <span style={{ fontSize: 11, color: "var(--field-supporting)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Coming soon</span>
        </div>
      )
  }
}
