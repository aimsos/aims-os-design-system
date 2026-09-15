// DS-GAP: real content for the ten widget types a prototype offers that
// WIDGET_DEFS does not document yet. Closest DS components: the fourteen
// renderers in widget-content.tsx, which these are modelled on.
//
// ── Why these exist ─────────────────────────────────────────────────────────
//
// The Widget Builder's live preview renders the real component for any type the
// DS documents. The ten candidates had nothing to render, so they fell through
// to an abstract shape — and an abstract shape has no text in it, so picking
// Cost KPI or Profile Card showed a widget with no content at all. Michael:
// "no mostrar un widget genérico".
//
// A shape is honest about being a drawing when it sits at 52px on a catalog
// card. At 120px in a live preview, next to nine siblings showing real numbers,
// it just reads as broken.
//
// Every one of these is composed from real DS components — Tag, HighlightIcon,
// Chip, AvatarCircle, ProgressBar — with token colours only. That is deliberate:
// when Michael writes the spec for one of these, promoting it is a move, not a
// rewrite, and whatever it looked like in the prototype is already DS-shaped.
//
// The sample data is plausible, never live. Same contract as widget-content.

import { useState } from "react"
import { Tag } from "@/components/ui/tag"
import { Chip } from "@/components/ui/chip"
import { HighlightIcon } from "@/components/ui/highlight-icon"
import { AvatarCircle } from "@/components/ui/avatar"
import { ProgressBar } from "@/components/ui/progress-bar"
import { NextBestActionCard } from "@/components/ui/next-best-action-card"
import { AiSummaryWidget } from "@/components/experimental/ai-summary-widget"
import { Button } from "@/components/ui/button"
import { useWidgetSize } from "@/components/layouts/widget-canvas-view"
import * as LucideIcons from "lucide-react"

const TXT  = "var(--color-text-title)"
const SUB  = "var(--color-text-subtitle)"
const LINE = "var(--field-border)"

const row: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, padding: "7px 0",
  borderBottom: `1px solid ${LINE}`,
}

/**
 * A written read of the data, not the data.
 *
 * HOMOLOGATED with the UCP's own Overview widget on 2026-09-09: both render
 * `AiSummaryWidget`, so the AI Summary a PM previews in the Widget Builder is
 * the same object they get on a record. This used to be a purple paragraph
 * drawn here — one anatomy in the builder, another on the profile, and no way
 * to tell which one was the widget.
 *
 * Two sample reads rather than one, because the carousel and the area Tag are
 * the parts a preview needs to show: they are what says a record has several
 * reads and what each one is about.
 */
function AiSummaryContent() {
  const { isNarrow } = useWidgetSize()
  return (
    <AiSummaryWidget
      compact={isNarrow}
      items={[
        {
          id: "read-1", agent: "Deal Concierge", category: "Renewal",
          headline: "Pipeline is concentrated in three accounts.",
          detail: "Three accounts carry 61% of open value and two of them slipped a stage this month. Win rate holds at 34%, but the median deal is 11 days older than last quarter.",
          confidence: 84,
          drawnFrom: [
            { label: "Truth · 5",   variant: "success" },
            { label: "Sandbox · 3", variant: "alert"   },
          ],
        },
        {
          id: "read-2", agent: "Deal Concierge", category: "Risk",
          headline: "The slippage is in one segment, not across the board.",
          detail: "Both stalled deals are mid-market renewals with the same integration dependency. Enterprise and SMB moved on schedule.",
          confidence: 71,
          drawnFrom: [{ label: "Truth · 4", variant: "success" }],
        },
      ]}
    />
  )
}

/** Scannable items, one status each. */
function ListContent() {
  const items: [string, string, "success" | "alert" | "neutral"][] = [
    ["Acme renewal",            "In review",  "alert"],
    ["Northwind expansion",     "Approved",   "success"],
    ["Globex pilot",            "Draft",      "neutral"],
    ["Initech migration",       "Approved",   "success"],
  ]
  return (
    <div>
      {items.map(([label, status, variant], i) => (
        <div key={label} style={{ ...row, borderBottom: i === items.length - 1 ? "none" : row.borderBottom }}>
          <span style={{ fontSize: 12, color: TXT, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
          <Tag variant={variant} size="sm">{status}</Tag>
        </div>
      ))}
    </div>
  )
}

/** The key fields of one record. */
function ProfileCardContent() {
  const fields: [string, string][] = [
    ["Owner",  "Sarah Chen"],
    ["Stage",  "Negotiation"],
    ["Value",  "$84,200"],
  ]
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <AvatarCircle name="Meridian Corp" sizeKey="md" />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: TXT }}>Meridian Corp</div>
          <div style={{ fontSize: 11, color: SUB, marginTop: 1 }}>Financial Services · 2,400 employees</div>
        </div>
      </div>
      <div>
        {fields.map(([k, v], i) => (
          <div key={k} style={{ ...row, padding: "5px 0", borderBottom: i === fields.length - 1 ? "none" : row.borderBottom }}>
            <span style={{ fontSize: 11, color: SUB, flex: 1 }}>{k}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: TXT }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** A few rich items, browsed sideways. The cut-off third card is the point —
 *  it says "there is more" without needing an arrow. */
function CarouselContent() {
  const cards: [string, string][] = [["Q3 Review", "12 slides"], ["Renewal deck", "8 slides"], ["Pricing", "5 slides"]]
  return (
    <div style={{ display: "flex", gap: 8, overflow: "hidden" }}>
      {cards.map(([title, meta], i) => (
        <div key={title} style={{
          flex: i === 2 ? "0 0 34%" : "1 1 0", minWidth: 0,
          border: `1px solid ${LINE}`, borderRadius: 8, padding: 10,
          display: "flex", flexDirection: "column", gap: 6,
          opacity: i === 2 ? 0.5 : 1,
        }}>
          <HighlightIcon iconName="FileText" variant="informative" size="sm" />
          <div style={{ fontSize: 12, fontWeight: 600, color: TXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
          <div style={{ fontSize: 11, color: SUB }}>{meta}</div>
        </div>
      ))}
    </div>
  )
}

/** Counts grouped by lifecycle state. */
function BoardContent() {
  const cols: [string, number, "success" | "neutral" | "alert"][] = [
    ["Active", 12, "success"], ["Idle", 4, "neutral"], ["Paused", 2, "alert"],
  ]
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {cols.map(([label, n, variant]) => (
        <div key={label} style={{
          flex: 1, border: `1px solid ${LINE}`, borderRadius: 8, padding: "10px 8px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
        }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: TXT, lineHeight: 1 }}>{n}</span>
          <Tag variant={variant} size="sm">{label}</Tag>
        </div>
      ))}
    </div>
  )
}

/** Open problems ranked by severity. Semantic colour, because these ARE states. */
function AlertsContent() {
  const rows: [string, string, number, "error" | "alert" | "informative"][] = [
    ["ShieldAlert", "Critical", 2,  "error"],
    ["TriangleAlert", "Warning", 5, "alert"],
    ["Info", "Info", 11, "informative"],
  ]
  return (
    <div>
      {rows.map(([icon, label, n, variant], i) => (
        <div key={label} style={{ ...row, borderBottom: i === rows.length - 1 ? "none" : row.borderBottom }}>
          <HighlightIcon iconName={icon} variant={variant} size="sm" />
          <span style={{ fontSize: 12, color: TXT, flex: 1 }}>{label}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: TXT }}>{n}</span>
        </div>
      ))}
    </div>
  )
}

/** One spend figure, with its unit and its movement. */
function CostKpiContent() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <span style={{ fontSize: 28, fontWeight: 700, color: TXT, lineHeight: 1, letterSpacing: "-0.5px" }}>$12,480</span>
          <span style={{ fontSize: 12, color: SUB, marginLeft: 6 }}>/ $15,000</span>
        </div>
        <HighlightIcon iconName="DollarSign" variant="success" size="lg" />
      </div>
      <ProgressBar value={83} style="success" size="s" />
      <span style={{ fontSize: 11, color: SUB }}>83% of monthly budget · 9 days left</span>
    </div>
  )
}

/** When consumption peaks across a period. */
function UsageHeatmapContent() {
  const cells = [0.2,0.5,0.8,0.4,0.9,0.3,0.1, 0.6,0.7,1,0.5,0.8,0.2,0.1, 0.3,0.6,0.9,0.7,0.5,0.4,0.2]
  const days = ["M","T","W","T","F","S","S"]
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {cells.map((o, i) => (
          <div key={i} style={{
            aspectRatio: "1", borderRadius: 3,
            background: "var(--color-surface-primary-default)", opacity: 0.12 + o * 0.78,
          }} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {days.map((d, i) => (
          <span key={i} style={{ fontSize: 9, color: SUB, textAlign: "center" }}>{d}</span>
        ))}
      </div>
    </div>
  )
}

/** Where the budget actually goes. */
function SpendBreakdownContent() {
  const parts: [string, string, string][] = [
    ["Inference",  "$7,120", "var(--color-surface-primary-default)"],
    ["Storage",    "$3,040", "var(--color-surface-purple-default)"],
    ["Egress",     "$1,480", "var(--color-surface-light-blue-default)"],
    ["Other",        "$840", "var(--field-border)"],
  ]
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{
        width: 68, height: 68, borderRadius: "50%", flexShrink: 0,
        background: `conic-gradient(${parts[0][2]} 0deg 205deg, ${parts[1][2]} 205deg 293deg, ${parts[2][2]} 293deg 336deg, ${parts[3][2]} 336deg 360deg)`,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {parts.map(([label, amount, colour]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 7, padding: "3px 0" }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: colour, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: SUB, flex: 1, minWidth: 0 }}>{label}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: TXT }}>{amount}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Credits, tokens and cost in one row — the three figures that only mean
 *  something together. */
function CompositeStatContent() {
  const stats: [string, string, string][] = [
    ["Credits", "18.2K", "Zap"],
    ["Tokens",  "4.1M",  "Binary"],
    ["Cost",    "$980",  "DollarSign"],
  ]
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {stats.map(([label, value, icon], i) => (
        <div key={label} style={{
          flex: 1, display: "flex", flexDirection: "column", gap: 4,
          paddingLeft: i === 0 ? 0 : 10,
          borderLeft: i === 0 ? "none" : `1px solid ${LINE}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <HighlightIcon iconName={icon} variant="informative" size="sm" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: TXT, lineHeight: 1 }}>{value}</span>
          <span style={{ fontSize: 10, color: SUB }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

/** Chip row shown under a couple of the content types that offer their own
 *  in-widget controls. Kept here so the ten stay self-contained. */
/**
 * The engine's one recommendation, as widget content.
 *
 * It renders the REAL NextBestActionCard with `unstyled`, not a second drawing
 * of it: a widget slot supplies its own surface, and the recommendation should
 * not look like two different objects depending on whether it sits below an
 * Entity Header or in a canvas.
 *
 * Three sizes, read off the slot rather than declared:
 *
 *   S  narrow (1/3)  — label, title, two lines of reasoning, View details.
 *                      The timestamp drops; the reasoning is what earns space.
 *   M  half / wide   — everything, one column.
 *   L  full (3/3)    — the same, with the reasoning on one or two lines.
 *
 * There is no fourth arrangement and nothing is added at L: a recommendation
 * that needs a wider layout to be understood is a recommendation that has
 * stopped being one thing.
 */
const NBA_QUEUE: { title: string; timeAgo: string; description: string }[] = [
  {
    title: "Send the renewal timeline Meridian asked for",
    timeAgo: "30m ago",
    description: "They raised it on the last two calls without a written answer, and the renewal closes in 12 days.",
  },
  {
    title: "Rebalance the service load across four stores",
    timeAgo: "5h ago",
    description: "Tampa North holds 26 of the 41 late repair orders while Brandon runs at 60% bay capacity.",
  },
  {
    title: "Escalate the overdue performance review",
    timeAgo: "6h ago",
    description: "Three reviews are waiting on approval and the oldest has been open 12 days, holding two promotion cycles.",
  },
]

function NextBestActionWidgetContent() {
  const { isNarrow } = useWidgetSize()
  const [i, setI] = useState(0)
  const item = NBA_QUEUE[i]
  const go = (d: number) => setI(prev => (prev + d + NBA_QUEUE.length) % NBA_QUEUE.length)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/*
        The carousel controls sit in their own row at the top, right-aligned —
        the widget's chrome, above the recommendation rather than stacked under
        it. Michael (2026-09-09) asked for both: a carousel of NBAs, and
        controls that do not end up at the bottom of the stack.

        A CAROUSEL DOES NOT BREAK "ONE AT A TIME". Figma's rule 2 is that the
        card never STACKS — the engine has already prioritised, so showing five
        at once is not trusting it. One visible with a way to page to the next
        keeps that: the reader still sees one recommendation, and the counter is
        what says there are others rather than a second card competing with the
        first.
      */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
        <span style={{ fontSize: 11, color: "var(--color-text-subtitle)" }}>
          {i + 1} of {NBA_QUEUE.length}
        </span>
        <Button
          variant="tertiary" size="sm" iconPosition="alone"
          icon={<LucideIcons.ChevronLeft size={14} strokeWidth={1.75} />}
          aria-label="Previous recommendation"
          onClick={() => go(-1)}
        />
        <Button
          variant="tertiary" size="sm" iconPosition="alone"
          icon={<LucideIcons.ChevronRight size={14} strokeWidth={1.75} />}
          aria-label="Next recommendation"
          onClick={() => go(1)}
        />
      </div>
      <NextBestActionCard
        unstyled
        size={isNarrow ? "sm" : "default"}
        item={{
          id: `nba-${i}`,
          title: item.title,
          timeAgo: item.timeAgo,
          description: item.description,
          onViewDetails: () => {},
        }}
      />
    </div>
  )
}

/**
 * How a record hangs off other records. Related ENTITIES, each with the
 * relationship named — never a status, which is what separates this from List.
 *
 * The sample is AIMS OS's own vocabulary, not a generic CRM's: an employer, an
 * account owner, a deal the record participates in, and the agent that handles
 * it. An agent is a first-class relation here because every record has one.
 */
function ConnectionsContent() {
  const items: [string, string, string][] = [
    ["Meridian Corp",          "Organization · employer",  "Building2"],
    ["Priya Nair",             "Account owner",            "UserRound"],
    ["Enterprise Renewal 2026","Deal · participant",       "Handshake"],
    ["Deal Concierge",         "Assigned agent",           "Bot"],
  ]
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map(([name, relation, icon]) => (
        <div key={name} style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <HighlightIcon iconName={icon} variant="neutral" size="sm" />
          <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: TXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
            <span style={{ fontSize: 11, color: SUB, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{relation}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function CandidateFilterHint({ labels }: { labels: string[] }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {labels.map(l => <Chip key={l} size="s" variant="secondary">{l}</Chip>)}
    </div>
  )
}

const BY_ID: Record<string, () => React.ReactElement> = {
  "ai-summary":      AiSummaryContent,
  "next-best-action": NextBestActionWidgetContent,
  "connections":     ConnectionsContent,
  "list":            ListContent,
  "profile-card":    ProfileCardContent,
  "carousel":        CarouselContent,
  "board":           BoardContent,
  "alerts":          AlertsContent,
  "cost-kpi":        CostKpiContent,
  "usage-heatmap":   UsageHeatmapContent,
  "spend-breakdown": SpendBreakdownContent,
  "composite-stat":  CompositeStatContent,
}

/** Real content for a candidate type, or null when there is none — the caller
 *  falls back to the shape, which is still the right answer for a chart mode. */
export function CandidateWidgetContent({ id }: { id: string }) {
  const C = BY_ID[id]
  return C ? <C /> : null
}

export const hasCandidateContent = (id: string) => id in BY_ID
