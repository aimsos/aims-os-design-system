/**
 * UCP — Unified Contact Profile (detail view).
 *
 * Read-only by design: the record is assembled by ingestion and agents, not
 * typed in here, so there is no create CTA. The one always-present entry point
 * is Ask — RecordHeader's own agent trigger — which opens the record's
 * assigned concierge in a side panel.
 *
 * The identity card is the DS's own RecordHeader. An earlier build of this
 * screen used a purpose-built EntityHeader instead, on three arguments: that
 * RecordHeader branched on three closed record shapes, that it carried the Next
 * Best Action inside itself where the Figma spec wanted a separate card below,
 * and that it had no state coverage. All three stopped being true. RecordHeader's
 * agnosticism pass dropped the closed variants, its redesign reintroduced the
 * Next Best Action deliberately as a protagonist block, and it now carries
 * per-zone loading and per-field masking. So this screen was rebuilt around what
 * the design system has rather than beside it, and the second component is gone.
 *
 * Two things that used to be ours belong to the component now, and both are
 * better there: the Next Best Action, which no longer needs placing, and the
 * card-width reflow, which RecordHeader measures on its own box.
 *
 * What stays ours is the chrome around it. The identity card and the tabs pin in
 * ScreenLayout's header zone, outside the scroll container, so the record stays
 * identified while its content scrolls.
 *
 * One deviation from CLAUDE.md's generic detail-page rule, and it is deliberate:
 * the page Header does NOT repeat the entity name, status tag and breadcrumb.
 * The Entity Header spec makes its own title the page subject ("the title
 * carries the profile heading level"), and the Figma view for this surface
 * shows only the parent list above the card. Printing the name and state twice,
 * 40px apart, is the thing that spec is avoiding.
 *
 * The states are exercised here rather than described:
 *   Loading     → the first paint of a record fetch, re-armed per record id.
 *   Restricted  → a record whose values sit behind a scope the viewer does not
 *                 hold. Decided by the session against the record, never by a
 *                 flag on the record: `locked` on the header, `masked` on each
 *                 governed field, and a body that follows. Leaving the facts on
 *                 screen under a header that says the values are governed would
 *                 be the page contradicting the header.
 *
 * Tabs: Overview · Snapshot · Activity · Drives
 *   Overview  → WidgetCanvasView (DS rule: any tab named Overview is a canvas)
 *   Snapshot  → this record's facts by knowledge plane (Truth / Sandbox / Sources)
 *   Activity  → interaction timeline, paginated
 *   Drives    → the Source Drives attached to this record
 */

import { useEffect, useMemo, useState } from "react"
import { ScreenLayout }      from "@/components/layouts/screen-layout"
import { WidgetCanvasView }  from "@/components/layouts/widget-canvas-view"
import type { CanvasSlot }   from "@/components/layouts/widget-canvas-view"
import { useWidgetSize }     from "@/components/layouts/widget-canvas-view"
import type { SidebarItem }  from "@/components/ui/sidebar"
import { Header }            from "@/components/ui/header"
import { Tabs }              from "@/components/ui/tabs"
import { Filters }           from "@/components/ui/filters"
import { Menu, MenuItem }    from "@/components/ui/menu-item"
import { ModalDialog }       from "@/components/ui/modal-dialog"
import { useToast }          from "@/components/ui/toast"
import { anchorFromEvent, useDropdownPosition } from "@/lib/dropdown-anchor"
import type { DropdownAnchor } from "@/lib/dropdown-anchor"
import { Tag }               from "@/components/ui/tag"
import { Chip }              from "@/components/ui/chip"
import { SwitchTab }         from "@/components/ui/switch-tab"
import { Button }            from "@/components/ui/button"
import { Input }             from "@/components/ui/input"
import { CardContainer }     from "@/components/ui/card-container"
import { EntityList }        from "@/components/ui/entity-list"
import type { EntityListItemData } from "@/components/ui/entity-list"
import { EmptyState }        from "@/components/ui/empty-state"
import { HighlightIcon }     from "@/components/ui/highlight-icon"
import { AvatarCircle }      from "@/components/ui/avatar"
import { AdaptiveMetricGrid } from "@/components/ui/adaptive-metric-grid"
import type { HighlightIconVariant } from "@/components/ui/highlight-icon"
import { Pagination }        from "@/components/ui/pagination"
import { SlideOut }          from "@/components/ui/slide-out"
import { SidePanel }         from "@/components/ui/side-panel"
import { Skeleton }          from "@/components/ui/skeleton"
import { Tooltip }           from "@/components/ui/tooltip"
import { EntityHeader }      from "@/components/ui/entity-header"
import type { EntityHeaderTag, RecordField, SecondaryMetadataItem } from "@/components/ui/entity-header"
import { SECONDARY_METADATA_MAX } from "@/components/ui/entity-header"
import * as LucideIcons from "lucide-react"
import { Sparkle, Send, ScanLine, Inbox, HardDrive, FileSearch, Lock } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { specForContact, tabsForContact } from "./ucpTypeModel"
import type { CanvasEntry, ProfileWidgetRow } from "./ucpTypeModel"
import {
  PANEL_CONTENT_CLASS,
  KNOWLEDGE_NOW,
  getVerdict, getSignals, getSuggestions, getAgentReads, renewalInDays,
  renderableSignals, renderableReads, sortSuggestions, confirmLabel,
  SUGGESTION_SORTS, SUGGESTION_STATUS_LABEL,
  RESOLVED_STATUSES, DISMISS_REASONS, TRAIN_ME_REASON, emitIntelligence,
  defaultExpandedRow, sincePhrase, QUEUE_DEFAULT_ROWS, mostUrgentSignal,
  getProfile, renderableTraits, renderableBullets, getThread,
  ACTIVITY_PERIODS, elapsedGroupLabel, parseActivityAt, withinPeriod,
  DRIVE_MODIFIED_OPTIONS, TRUTH_STATUSES, RISK_LEVELS, ATTENTION_FLAGS, SANDBOX_STATES, SANDBOX_SCOPES,
  PLANE_META, PLANE_ORDER, CHANNEL_META, CHANNEL_GROUP, ACTIVITY_GROUPS, COMMUNICATION_CHANNELS, CONCIERGE_PROMPTS,
  CONTACTS,
  AVATAR_TYPES, TYPE_ICON, TYPE_LABEL, entityState, restrictionFor, getRecordFields,
  getActivity, getConciergeOpening, getConnections, getDrives,
  getFacts, getGovernance, getRisk,
} from "./ucpShared"
import type {
  MetricVariant, StudyRow,
  ActivityChannel, ActivityGroup, UcpActivity, ConciergeTurn, KnowledgePlane, StudyState, UcpContact, UcpDrive, UcpFact,
  UcpNote, TagVariantLite, CommsThread, ThreadEntry, CommsAttachment,
  VerdictEntity, SignalSeverity, ConfidenceState, SuggestionSort, SuggestionStatus, UcpSuggestion,
  UcpProfile, ProfileBullet, UcpVerdict, UcpSignal,
} from "./ucpShared"

export const UCP_SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "home",       label: "Home",       icon: "Home"      },
  { id: "work",       label: "My Work",    icon: "Inbox"     },
  { id: "contacts",   label: "Contacts",   icon: "Contact"   },
  { id: "agents",     label: "Agents",     icon: "Bot"       },
  { id: "workflows",  label: "Workflows",  icon: "Zap"       },
  { id: "knowledge",  label: "Knowledge",  icon: "BookOpen"  },
  { id: "governance", label: "Governance", icon: "Shield"    },
  { id: "admin",      label: "Admin",      icon: "Settings"  },
]

const ACTIVITY_PAGE_SIZE = 8

// ── Study widget — hidden when the study returned nothing, retry when it failed ─

function StudyWidget({ title, state, children }: { title: string; state: StudyState; children: React.ReactNode }) {
  if (state === "empty") return null
  if (state === "error") {
    // EmptyState, not a hand-rolled div. This screen shipped the hand-rolled
    // version; the design system fixed the same mistake in the sibling profile
    // (#95) before this one was rebased onto it, so the correction is adopted
    // here rather than rediscovered. CLAUDE.md is explicit that any section with
    // no content to show uses EmptyState — a failed load is exactly that.
    return (
      <EmptyState
        compact
        icon={LucideIcons.AlertCircle}
        title="Failed to load"
        description={`${title} data couldn't be retrieved for this record.`}
        ctaLabel="Retry"
        onCta={() => {}} // DS-GAP: wire to a real retry handler
      />
    )
  }
  return <>{children}</>
}

/**
 * Profile Card (catalog type `profile-card` — "key fields of one entity
 * record"). The type's own fields: label, value, and an icon that says what
 * KIND of fact it is.
 *
 * Every row carries a Tooltip on hover AND on focus. A label plus a value says
 * what the field is; the tooltip says why it matters — "Headquarters · Tampa,
 * FL. Where the account is registered, which decides the data residency rules
 * that apply." The DS asks for this on secondary metadata for the same reason,
 * and a field row is the same problem: an icon and two words cannot carry it.
 */
function MetricRows({ rows }: { rows: ProfileWidgetRow[] }) {
  const { availableHeight } = useWidgetSize()
  // 37px pitch per row now that each carries its own divider, 70px for the
  // widget's title chrome + padding.
  const maxRows = availableHeight ? Math.max(2, Math.floor((availableHeight - 70) / 37)) : rows.length
  const visible = rows.slice(0, maxRows)
  return (
    <div style={{ paddingBottom: 16, display: "flex", flexDirection: "column" }}>
      {visible.map((row, i) => (
        // Icon, then label, then value — left to right, in the order the eye
        // scans. The icon used to sit beside the value on the right, which meant
        // reading across the whole row to find out what kind of thing the number
        // was. Same arrangement the sibling profile settled on.
        //
        // The divider is --color-border-neutral-subtle, the same token the
        // SlideOut and Side Panel use for their internal separators. The last
        // row drops it: a rule under the final item draws a line to nothing.
        <Tooltip key={row.label} content={row.tooltip} side="cursor" triggerClassName="block min-w-0 w-full">
          <div
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
              borderBottom: i === visible.length - 1 ? "none" : "1px solid var(--color-border-neutral-subtle)",
            }}
          >
            <HighlightIcon size="sm" variant={row.variant} iconName={row.icon} />
            {/* One line, always. A wrapped label turns a 37px row into 55px, and
                the widget's fixed height then swallows the rows below it. */}
            <span
              style={{
                fontSize: 12, color: "var(--field-supporting)", flex: 1, minWidth: 0,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}
            >
              {row.label}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", whiteSpace: "nowrap" }}>
              {row.value}
            </span>
          </div>
        </Tooltip>
      ))}
    </div>
  )
}

/**
 * Stat Row (catalog id `status-warning`, the DS's "Status Warning Widget").
 *
 * Governance and Risk publish counters and scores — a compliance score, open
 * reviews, a risk score, open flags. They used to render through the same
 * MetricRows helper as Account and Employment, which made a *score* look like
 * a *field*: the widget catalog separates those on purpose, and reusing one
 * renderer for both is how the distinction stopped being visible.
 *
 * Three counters, which is what the DS widget is for, in the arrangement its
 * own renderer uses: HighlightIcon, the label in the counter's semantic colour,
 * the value at 14px. The fourth item every study carries is a DATE — last
 * audit, last scan — and a date is not a counter, so it goes underneath as the
 * line that says when this was last checked rather than into a fourth box.
 *
 * The icon sits beside the value when there is room and above it when there is
 * not: three boxes in a narrow slot leave about 94px each, and at that width an
 * icon on the left takes the space the number needs.
 */
function StatRowContent({ counters, checked }: {
  counters: StudyRow[]
  checked?: StudyRow
}) {
  const { isNarrow } = useWidgetSize()
  const labelColor: Record<MetricVariant, string> = {
    success:     "var(--color-text-success)",
    alert:       "var(--color-text-alert)",
    error:       "var(--color-text-error)",
    informative: "var(--color-text-info)",
    neutral:     "var(--color-text-subtitle)",
  }
  return (
    <div style={{ paddingBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        {counters.slice(0, 3).map(c => (
          // The tooltip is the point of the hover, not a fallback for
          // truncation: "0" is not information, "no flags have been raised
          // since the last scan" is. On focus too, so it is not mouse-only.
          <Tooltip key={c.label} content={c.tooltip} side="cursor" triggerClassName="block min-w-0 w-full">
            <div
              style={{
                display: "flex",
                flexDirection: isNarrow ? "column" : "row",
                alignItems: isNarrow ? "flex-start" : "center",
                gap: isNarrow ? 8 : 12,
                padding: "12px 14px", borderRadius: 8, minWidth: 0, height: "100%",
                border: "1px solid var(--field-border)",
                background: "var(--widget-bg)",
              }}
            >
              <HighlightIcon size="md" variant={c.variant} iconName={c.icon} />
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span
                  style={{
                    fontSize: 10, fontWeight: 500, lineHeight: 1.2, color: labelColor[c.variant],
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}
                >
                  {c.label}
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1, color: "var(--color-text-title)", whiteSpace: "nowrap" }}>
                  {c.value}
                </span>
              </div>
            </div>
          </Tooltip>
        ))}
      </div>
      {checked && (
        <Tooltip content={checked.tooltip} side="cursor" triggerClassName="block min-w-0">
          <span style={{ fontSize: 11, color: "var(--field-supporting)" }}>
            {checked.label} · {checked.value}
          </span>
        </Tooltip>
      )}
    </div>
  )
}

/**
 * ── Three widget shapes the canvas was missing ─────────────────────────────
 *
 * Michael, 2026-09-11: vary the widget types so the same ones do not appear
 * every time. The canvas had four renderers and two of them — Governance and
 * Risk — were the same three-counter row, so a three-widget canvas read as one
 * widget repeated.
 *
 * All three take the RECORD's own data. The Widget Builder's
 * `CandidateWidgetContent` renders every catalogued shape already, and it was
 * the obvious thing to reach for — but it renders SAMPLE data, which is right
 * for a builder preview and wrong on a real record. A profile showing a
 * stranger's numbers is worse than a profile showing one shape twice.
 */

/** `alerts` — open problems, worst first. Fed by the record's own signals, so
 *  Overview and Intelligence cannot disagree about what is wrong. */
function AlertsContent({ contact, onGoTab }: { contact: UcpContact; onGoTab: (id: string) => void }) {
  const signals = useMemo(() => renderableSignals(getSignals(contact)), [contact])
  if (signals.length === 0) {
    return (
      <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>No open signals on this record.</span>
    )
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {signals.slice(0, 4).map(sig => (
        <button
          key={sig.type}
          className="appearance-none bg-transparent border-0 p-0 cursor-pointer text-left"
          onClick={() => onGoTab("intelligence")}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", font: "inherit" }}
        >
          <span
            style={{
              width: 6, height: 6, borderRadius: 999, flexShrink: 0,
              background: sig.severity === "critical" ? "var(--color-text-error)"
                : sig.severity === "attention" ? "var(--color-text-alert)"
                : "var(--color-border-neutral-default)",
            }}
          />
          <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {sig.detail}
          </span>
          <span style={{ fontSize: 11, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{sig.since}</span>
        </button>
      ))}
      {signals.length > 4 && (
        <Button variant="tertiary" size="sm" className="self-start !px-0" onClick={() => onGoTab("intelligence")}>
          {`${signals.length - 4} more in Intelligence`}
        </Button>
      )}
    </div>
  )
}

/** `board` — counts grouped by lifecycle state. Here the state is the
 *  knowledge plane, which is the one composition this record actually has:
 *  how much of what is known about it is attested, proposed, or raw material. */
function PlanesBoardContent({ contact, onGoTab }: { contact: UcpContact; onGoTab: (id: string) => void }) {
  const facts = useMemo(() => getFacts(contact), [contact])
  const total = facts.length || 1
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {PLANE_ORDER.map(plane => {
        const n = facts.filter(f => f.plane === plane).length
        return (
          <button
            key={plane}
            className="appearance-none bg-transparent border-0 p-0 cursor-pointer text-left"
            onClick={() => onGoTab("knowledge")}
            style={{ display: "flex", flexDirection: "column", gap: 4, font: "inherit" }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-title)" }}>{n}</span>
              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{PLANE_META[plane].label}</span>
            </div>
            {/* The bar is the composition — the thing a board shows that three
                counters side by side do not. */}
            <div style={{ height: 4, borderRadius: 999, background: "var(--color-surface-neutral-subtle)", overflow: "hidden" }}>
              <div style={{ width: `${Math.round((n / total) * 100)}%`, height: "100%", background: PLANE_BAR[plane] }} />
            </div>
          </button>
        )
      })}
    </div>
  )
}

const PLANE_BAR: Record<KnowledgePlane, string> = {
  truth:   "var(--color-text-success)",
  sandbox: "var(--color-text-alert)",
  sources: "var(--primary)",
}

/**
 * `kpi` — one headline number with the sentence that makes it matter.
 *
 * The shape CLAUDE.md documents for a KPI slot, and the only canvas that uses
 * it is the asset's: a vehicle has ONE number that decides what happens to it
 * next, and a headline figure is what that deserves.
 */
function KpiContent({ value, feedback, iconName, iconVariant }: {
  value:       string
  feedback:    string
  iconName:    string
  iconVariant: HighlightIconVariant
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, color: "var(--color-text-title)" }}>{value}</span>
        <HighlightIcon size="lg" variant={iconVariant} iconName={iconName} />
      </div>
      <span style={{ fontSize: 12, color: "var(--color-text-subtitle)", marginTop: 6, display: "block" }}>{feedback}</span>
    </div>
  )
}

/**
 * Last Activity Widget (catalog id `activity`, class 3 — Heavy, 9 GU).
 *
 * THE SAME ANATOMY THE LIBRARY DRAWS, which is the point: this used to be a
 * list with bottom dividers, a status Tag per row and a tertiary "View full
 * timeline" button under it — recognisably not the DS widget, which is what
 * Michael caught (2026-09-09). The catalogued widget is a stack of BORDERED,
 * CLICKABLE rows: a tinted icon tile, the title, then the time and a chevron
 * on the right, the description on its own line indented past the tile, and a
 * metadata row that appears on hover. 4px between rows, and the whole thing
 * scrolls inside the slot.
 *
 * Two deliberate differences from the library's renderer, both because this
 * one has real data behind it:
 *   · the tile is HighlightIcon rather than a hand-drawn 26px square — the
 *     audit's own rule, and it keeps a channel the same colour everywhere
 *   · the row opens the Activity tab, where this record's full trace lives,
 *     instead of a SlideOut with sample tabs
 *
 * Communication channels only, which is the widget's own rule — *"Don't mix
 * non-communication activity types in this widget: use Timeline for lifecycle
 * events."* Agent and system events are lifecycle, so they stay on the
 * Activity tab. Empty is a real state: a record whose only events are the
 * robot's own has genuinely never been contacted, and saying so is more useful
 * than a feed padded to look busy.
 */
// The Last Activity widget shows communications only — its own rule, "don't
// mix non-communication activity types in this widget". That set is now
// published by the data layer rather than restated here, so adding SMS did
// not need this line changed and adding the next kind will not either.
const COMMS: ActivityChannel[] = COMMUNICATION_CHANNELS

function LastActivityContent({ contact, onViewAll }: { contact: UcpContact; onViewAll: () => void }) {
  const { availableHeight } = useWidgetSize()
  const [hovered, setHovered] = useState<string | null>(null)
  const items = useMemo(
    () => getActivity(contact).filter(a => COMMS.includes(a.channel)),
    [contact],
  )

  if (items.length === 0) {
    return (
      <EmptyState
        compact
        icon={Inbox}
        title="No interactions yet"
        description="Calls, emails and meetings with this contact will appear here."
      />
    )
  }

  // 74px pitch per row (two lines plus its border and the 4px gap), 70px for
  // the widget's title chrome and padding. Anything past that scrolls inside
  // the slot rather than being cut — WidgetFather owns that now.
  const maxItems = availableHeight ? Math.max(1, Math.floor((availableHeight - 70) / 74)) : items.length

  return (
    <div style={{ paddingBottom: 16, display: "flex", flexDirection: "column", gap: 4 }}>
      {items.slice(0, maxItems).map(a => {
        const meta = CHANNEL_META[a.channel]
        const showMeta = hovered === a.id
        return (
          <div
            key={a.id}
            role="button"
            tabIndex={0}
            onClick={onViewAll}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onViewAll() } }}
            onMouseEnter={() => setHovered(a.id)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(a.id)}
            onBlur={() => setHovered(null)}
            className="cursor-pointer rounded-[8px] px-[12px] py-[8px] transition-colors duration-150 hover:bg-[var(--color-surface-neutral-subtle)]"
            style={{ border: "0.5px solid var(--field-border)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <HighlightIcon size="sm" variant="neutral" iconName={meta.icon} />
              <span
                title={a.title}
                style={{
                  fontSize: 13, fontWeight: 500, color: "var(--color-text-title)",
                  flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
              >
                {a.title}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                {/* The alert only — a badge on every row says nothing. */}
                {a.state.variant === "alert" && <LucideIcons.AlertTriangle size={11} style={{ color: "var(--color-text-alert)" }} />}
                {a.state.variant === "error" && <LucideIcons.XCircle       size={11} style={{ color: "var(--color-text-error)" }} />}
                <span style={{ fontSize: 11, color: "var(--color-text-subtitle)", whiteSpace: "nowrap" }}>{a.timestamp}</span>
                <LucideIcons.ChevronRight size={11} style={{ color: "var(--color-text-subtitle)" }} />
              </div>
            </div>
            <p
              title={a.meta}
              style={{
                fontSize: 12, color: "var(--color-text-body)", lineHeight: 1.4, margin: 0,
                paddingLeft: 34, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {a.meta}
            </p>
            <div style={{
              paddingLeft: 34,
              maxHeight: showMeta ? 20 : 0,
              opacity: showMeta ? 1 : 0,
              overflow: "hidden",
              transition: "max-height 200ms ease, opacity 180ms ease",
            }}>
              <span style={{ fontSize: 10, color: "var(--color-text-subtitle)" }}>
                {meta.label} · {a.state.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Connections (catalog type `connections` — related contacts).
 *
 * People only, each with the relationship named and a Tooltip saying why they
 * are here. The data layer resolves every row against the roster, so a name
 * on this card is always a record you can open.
 */
function ConnectionsContent({ contact }: { contact: UcpContact }) {
  const { availableHeight } = useWidgetSize()
  const connections  = getConnections(contact)
  // 44px pitch per icon + two-line row, 70px for the widget's title chrome +
  // padding. At the default 4-row slot height that lands on 3 without clipping.
  const maxRows      = availableHeight ? Math.max(2, Math.floor((availableHeight - 70) / 44)) : 3
  const visible      = connections.slice(0, maxRows)
  const hidden       = connections.length - visible.length

  if (connections.length === 0) {
    return (
      <EmptyState
        compact
        icon={LucideIcons.Users}
        title="No related contacts"
        description="People connected to this record — coworkers, family — appear here once AIMS holds a record for them."
      />
    )
  }

  return (
    <div style={{ paddingTop: 4, paddingBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      {visible.map(c => (
        <Tooltip key={c.id} content={c.tooltip} side="cursor" triggerClassName="block min-w-0 w-full">
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <HighlightIcon size="sm" variant="neutral" iconName={c.icon} />
            <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
              <span style={{ fontSize: 11, color: "var(--field-supporting)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.relation}</span>
            </div>
          </div>
        </Tooltip>
      ))}
      {hidden > 0 && (
        <Button variant="tertiary" size="sm" className="self-start !px-0" onClick={() => {}}>
          {`View ${hidden} more`}
        </Button>
      )}
    </div>
  )
}

/*
  AiSummaryContent lived here — the full-width purple card at the top of every
  Overview, "<Agent> — read on this record". Michael removed it on 2026-09-10
  and the component went with it: nothing else rendered it, so keeping it would
  have left a dead export and an unused AiSummaryWidget import behind, which is
  the orphan the DS audit exists to catch.

  Where its content went, and why that is not a loss: Intelligence is the tab
  that holds the agent's read of a record, with the signals, the evidence and
  the queue that follow from it. A paragraph-length version of the same
  interpretation on Overview meant one fact rendered in two tabs, and the
  Overview copy was the one you could not act on — a summary whose only
  affordance is "Ask the concierge" is a summary that could not finish its own
  sentence. The concierge is untouched and still opens from the Entity Header's
  Ask, and toAiInsights still feeds the roster's own preview panel and the
  Widget Builder's AI Summary preview, so neither is orphaned.
*/

// ── Snapshot (Truth Facts) ────────────────────────────────────────────────────

/**
 * ── One fact, as a list row ────────────────────────────────────────────────
 *
 * This replaces FACT_COLUMNS, the six-column Table the two fact shelves used
 * to render. The columns are not gone, they are RE-RANKED — a table gives
 * every column the same weight because a reader scans down one at a time, and
 * a list has to decide what matters first.
 *
 * The order is Governance's own, read off its views:
 *
 *   title          the fact, and its value beside it — "Renewal date ·
 *                  Sep 22, 2026". A label with no value is a column header,
 *                  not a row.
 *   state badge    Verified / Pending review / Due to expire. Governance's
 *                  three, and the same three the Status filter offers.
 *   primaryMeta    risk level, and the attention flag when there is one. The
 *                  flag is the reason somebody opens the row, so it outranks
 *                  the provenance below it.
 *   secondaryMeta  where it came from, when it was last verified, and how far
 *                  it reaches.
 *
 * THE CONFIDENCE PERCENTAGE IS GONE. It was a column reading "~80%" for every
 * Sandbox claim and "100%" for every Truth fact — a number derived from the
 * plane, restating the plane, next to the plane's own Tag. A figure that
 * cannot vary between two rows is not data about either of them.
 */
const FACT_STATUS_TAG: Record<string, TagVariantLite> = {
  "Verified":       "success",
  "Pending review": "alert",
  "Due to expire":  "error",
}

const RISK_ICON: Record<string, string> = {
  Low:    "ShieldCheck",
  Medium: "ShieldAlert",
  High:   "ShieldX",
}

/* EntityList publishes a narrower tint set than HighlightIcon — it has no
   `informative`, it calls that one `info`. Mapped here rather than widening
   the component: the plane's identity colour is the same either way, and this
   is the only place in the file that needs the list's spelling. */
const PLANE_ROW_VARIANT: Record<KnowledgePlane, NonNullable<EntityListItemData["iconVariant"]>> = {
  truth:   "success",
  sandbox: "yellow",
  sources: "info",
}

function factRow(f: UcpFact, onPreview: (f: UcpFact) => void): EntityListItemData {
  return {
    id:          f.id,
    title:       `${f.label} · ${f.value}`,
    iconName:    PLANE_ICON[f.plane],
    iconVariant: PLANE_ROW_VARIANT[f.plane],
    primaryMeta: [
      { iconName: RISK_ICON[f.risk] ?? "Shield", label: `${f.risk} risk` },
      /* Only when there is one. An empty attention slot rendered as "None"
         is a row asserting the absence of a flag, which reads as a fourth
         flag called None. */
      ...(f.attention.length > 0
        ? [{ iconName: "Flag", label: f.attention.join(" · ") }]
        : []),
    ],
    secondaryMeta: [
      { iconName: "FileText",  label: f.source                     },
      { iconName: "CheckCheck", label: `Verified ${f.verifiedAt}`   },
      { iconName: "Share2",    label: f.scope                      },
    ],
    tags:    [{ label: PLANE_META[f.plane].label }],
    state:   { label: f.status, variant: FACT_STATUS_TAG[f.status] ?? "neutral" },
    actions: [{ label: "Preview", variant: "tertiary", icon: "Eye", onClick: () => onPreview(f) }],
  }
}

/**
 * One icon AND one tint per knowledge plane, so a plane looks the same
 * wherever it is counted. Truth is verified, Sandbox is provisional, Sources
 * is material.
 *
 * The tint is the same colour the plane's own Tag carries in the facts table
 * below (`PLANE_META[p].tag`) — Truth green, Sandbox yellow, Sources blue.
 * Three cards counting three different KINDS of knowledge all read
 * informative blue before this, so the only thing separating them was the
 * word in the label. Michael, 2026-09-09.
 */
const PLANE_ICON: Record<KnowledgePlane, string> = {
  truth:   "ShieldCheck",
  sandbox: "FlaskConical",
  sources: "Files",
}
const PLANE_ICON_VARIANT: Record<KnowledgePlane, HighlightIconVariant> = {
  truth:   "success",
  sandbox: "yellow",
  sources: "informative",
}

/**
 * ── Intelligence ───────────────────────────────────────────────────────────
 *
 * One AI tab for what the system THINKS about this record (Michael,
 * 2026-09-10). The content is modelled on where the industry landed, checked
 * rather than remembered:
 *
 * · SALESFORCE EINSTEIN shows a score as a TIER with a DIRECTION — "High",
 *   "Medium", "Low" plus an arrow when it moves a tier — never a bare number,
 *   and it publishes how the score was computed. It also has KEY MOMENTS:
 *   notifications for the handful of things that actually changed the picture,
 *   like a competitor being mentioned or a sponsor leaving.
 * · GAINSIGHT's Customer 360 leads with a health scorecard and then names
 *   RISKS AND OPPORTUNITIES as separate lists, so the two are found rather
 *   than inferred, and hangs CTAs off them.
 *
 * Both put the same three things first: where does this stand, what should I
 * do, what changed. So the order here is score → recommended action → key
 * moments → the reasoning → the drivers behind the score. "Why" comes after
 * "what to do", because a reader who agrees with the recommendation never
 * needs the reasoning and a reader who disagrees needs all of it.
 *
 * WHAT AIMS OS ADDS, and what makes this more than a scorecard: every read
 * carries the AREA it is about, a CONFIDENCE, and a destination — and the
 * knowledge behind it is auditable one tab over, on Knowledge. Einstein tells
 * you the score; this tells you which plane the claim came from.
 *
 * Every number is computed from THIS record. Nothing here is a placeholder,
 * and each card says what it was derived from — a score whose derivation is
 * invisible is a score nobody can argue with, which is the same as one nobody
 * trusts.
 */

/* OPPORTUNITY_AREAS and riskTier lived here, and both went with the rebuild.
   riskTier turned a 0–100 score into High / Elevated / Low for a card at the
   top of this tab — the tiering was the right instinct and the SUBJECT was
   wrong. There is no aggregate risk score on a contact any more: a number
   computed on a human being is a judgement wearing a decimal point, it cannot
   be verified and it cannot be disputed. Named signals replaced it, each one
   with a duration and a link to its evidence. Where a score exists at the
   OPPORTUNITY level it can be shown here as an inherited, linked value —
   an opportunity is a commercial object and can carry one. */

/* ══════════════════════════════════════════════════════════════════════════
   INTELLIGENCE — rebuilt 2026-09-10 to Michael's spec.

   A rep opens a contact and needs to decide what to do about that person,
   NOW. This is a working surface, not a reading surface: work is resolved
   here, not just displayed. Every block earns its place against that.

   Block order is fixed and nothing sits above the verdict:

     1 Verdict          two sentences — who they are, and the imperative
     2 Signals          named, verifiable conditions, one line each
     3 Suggestion queue prioritised, workable, items leave when resolved
     4 Agent reads      candidate claims, and what can be attested

   WHAT WAS REMOVED, and why each removal is a subtraction of noise rather
   than of information:

   · The Risk / Opportunities / Recommendations metric cards. A card that
     counts to one is worse than naming the thing it counted — "Opportunities
     1" tells you less than the opportunity's own title would have. Risk
     became signals; the other two became the queue.
   · "Recommended next" as its own block. It is row one of the queue.
   · The duplicate rendering. One item used to appear in four places — as a
     risk factor, as a recommendation, as "recommended next", and as a key
     moment. Each fact now renders in exactly one block and the others link
     to it.
   · "See it as a task" as a link. It is Accept, a primary action, and it is
     the gesture that creates a task.
   · Every confidence percentage. A number with no scale answers a question
     nobody asked.
   · The aggregate risk score ON THE CONTACT. A number computed on a human
     being is a judgement wearing a decimal point. Where a score exists at
     the opportunity level it is shown as an inherited, linked value.

   COMPONENT INVENTORY, taken before anything was written:

     list rows          EntityList                       reused
     expandable rows    EntityList — description and aiInsight expand
                        internally; no caller slot        EXTENDED (below)
     status pills       Tag                               reused
     callout blocks     InformativeCard                   reused
     inline empty state EmptyState                        reused
     disclosure         none in ui/; ProcessItem has showExpand but is a
                        timeline step                     used EntityList's
                                                          new slot instead
     confirmation       ModalDialog variant="confirmation" reused

   THE ONE EXTENSION: `EntityListItemData.expandable` — a controlled
   `{ expanded, onToggle, content }` slot. The two existing expansions own
   their state internally and render text only; a queue's expanded row is a
   drafted reply, its grounding links and its actions, and the queue has to
   be able to open a row programmatically. Extended, not forked.
   ══════════════════════════════════════════════════════════════════════════ */

/* SIGNAL_TAG and CONFIDENCE_TAG were both pill-variant maps, and there are no
   pills left for them to colour. Severity is now a text colour on the signal's
   grey label (SIGNAL_LABEL_COLOR below), and an attestation state is said in
   words — "— inferred", "Draft · in review". A pill for each would have been
   two different meanings wearing one shape, which is the thing that stops a
   reader trusting either. */

/**
 * Text with its evidence spans rendered as links.
 *
 * Spans are located by substring AND occurrence rather than by re-parsing,
 * because the same words legitimately appear twice — "12 days" in the
 * imperative and "12 days" inside a quoted fragment are not the same link.
 */
function LinkedText({ text, entities, onGo }: {
  text:     string
  entities: VerdictEntity[]
  onGo:     (destination: string) => void
}) {
  type Piece = { text: string; entity?: VerdictEntity }
  const pieces: Piece[] = [{ text }]

  for (const entity of entities) {
    const want = entity.occurrence ?? 0
    let seen = 0
    for (let i = 0; i < pieces.length; i++) {
      if (pieces[i].entity) continue
      const at = pieces[i].text.indexOf(entity.text)
      if (at === -1) continue
      if (seen++ < want) continue
      const before = pieces[i].text.slice(0, at)
      const after  = pieces[i].text.slice(at + entity.text.length)
      pieces.splice(i, 1,
        ...(before ? [{ text: before }] : []),
        { text: entity.text, entity },
        ...(after ? [{ text: after }] : []),
      )
      break
    }
  }

  return (
    <>
      {pieces.map((piece, i) => piece.entity ? (
        <Tooltip key={i} content={piece.entity.tooltip} side="cursor">
          {/*
            A RAW <button>, AND IT SHOULD STAY ONE. This is a span of words
            inside a sentence — "$480K" in the middle of the verdict — so no
            Button variant applies: every one of them draws a control with its
            own box, and a control cannot sit mid-paragraph without breaking
            the line it is part of. It is a button rather than a span because
            it does something on click, and a keyboard has to be able to reach
            it.

            The reset comes from classes, not from a style object, so the
            audit's "a <button> that sets its own padding and a surface is a
            Button" check reads it correctly: those declarations UNSET the
            chrome rather than draw it, which is the opposite of what the check
            is looking for.
          */}
          <button
            className="appearance-none bg-transparent border-0 p-0 font-[inherit] cursor-pointer"
            onClick={() => onGo(piece.entity!.destination)}
            style={{
              color: "var(--primary)", textDecoration: "underline",
              textDecorationStyle: "dotted", textUnderlineOffset: 3,
            }}
          >
            {piece.text}
          </button>
        </Tooltip>
      ) : (
        <span key={i}>{piece.text}</span>
      ))}
    </>
  )
}

/**
 * ── Progressive disclosure ─────────────────────────────────────────────────
 *
 * Michael, 2026-09-11. The spec this section was built to said WHAT to show
 * and never said what is visible AT ONCE, so all four blocks rendered
 * expanded and the section read as a wall. Nothing was removed here — what
 * changed is what is open when you arrive.
 *
 * THE GOVERNING RULE: one thing open at a time, and nothing hides silently.
 * Every collapsed block states its weight in its own header — an exact count
 * plus its most significant item — so a reader can skip it on purpose rather
 * than by accident. A collapsed section has to tell you whether the click is
 * worth it.
 *
 * DEFAULT ON LOAD
 *   Verdict          open, always, never collapsible
 *   Suggestions      three rows, exactly one expanded
 *   Signals          one line
 *   Agent reads      one line
 *
 * THE ACCORDION HAS TWO SCOPES, and the difference is the point. Between
 * blocks, opening Signals closes Agent reads and vice versa — but neither
 * touches the queue, because the queue is the working surface and work you
 * cannot see is work you will not do. Inside a list, one row at a time.
 *
 * IT RESETS ON EVERY VISIT. This state is component-local and the tab
 * unmounts when you leave it, which is the implementation of "focal state is
 * a guarantee, not a user preference" — a reader who expanded four things
 * last time should still arrive at one.
 *
 * ── COMPONENT INVENTORY, taken before anything was written ──
 *
 *   collapsible section  NOTHING in src/components/ui/. No Accordion, no
 *                        Disclosure, no Collapsible. ProcessItem has
 *                        showExpand but it is a timeline step with a
 *                        connector line, not a section header.
 *   expandable rows      EntityList.expandable — the controlled slot added
 *                        for the queue on 2026-09-10. REUSED for signals and
 *                        agent reads, which is why all three lists now open
 *                        the same way and none of them needed a chevron of
 *                        its own.
 *   clickable surface    CardContainer's own `onClick`, which already sets
 *                        role="button" and tabIndex. The block header is a
 *                        CardContainer, so the disclosure control is a DS
 *                        component rather than a <div> with a handler.
 *   counters             Tag, existing semantic variants.
 *
 * WHAT I ADDED: `DisclosureBlock` below — a local composition, not a new
 * component file. It is a CardContainer header plus a conditional body, which
 * is exactly the case CLAUDE.md says to compose in the screen rather than put
 * in ui/. If a third screen needs it, that is when it earns a file.
 *
 * SUPERSEDED 2026-09-11. DisclosureBlock wrapped each collapsed block in a
 * CardContainer, which is a box drawn around a sentence. Signals and Agent
 * reads are now a line of text with a chevron and no container at all — the
 * disclosure behaviour survives, its chrome does not.
 */
/* QUEUE_SORT_MIN_ROWS and READS_FILTER_MIN went with the controls they
   guarded: the sort shows above one visible row inline now, and Agent reads
   lost its search and area filter entirely — four reads never needed either,
   and the chrome budget has no room for controls over a list this short. */

/**
 * ── Profile and verdict, as one block of prose ─────────────────────────────
 *
 * Michael, 2026-09-11. The content was right and the CHROME was the problem:
 * seven nested containers and fourteen pills in the default state. At that
 * density a pill stops meaning anything — it is just the shape text comes in —
 * and the page reads as a wall however good the words are.
 *
 * The reference is Lightfield, Fibery and Tana: a record sheet is plain text,
 * grey labels and plain values, no boxes. A container is reserved for the
 * thing you can act on, which here is exactly one thing — the expanded
 * suggestion.
 *
 * SO THE TRAITS ARE PROSE. Chips are for filtering; prose is for
 * understanding, and nobody filters a contact by "quiet on calls". Five chips
 * became one sentence, and the sentence is shorter than the chips were.
 *
 * ATTESTATION IS SAID IN WORDS, NOT COLOUR. "— inferred" in grey at the end of
 * the archetype line. Colour alone communicates nothing without a legend, and
 * this block has no room for one; a trait that IS attested gets an underline
 * on its own words, which is an affordance rather than a paint job.
 */
function ProfileProse({ profile, verdict, contact, expanded, onToggle, onGo, onReject, onConfirm, confirmed }: {
  profile:  UcpProfile | null
  verdict:  UcpVerdict | null
  contact:  UcpContact
  expanded: boolean
  onToggle: () => void
  onGo:     (destination: string) => void
  onReject: (field: string) => void
  onConfirm:(field: string) => void
  confirmed: string[]
}) {
  if (profile === null) {
    return (
      <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
        Not enough history to read a profile yet.
      </span>
    )
  }

  const traits = renderableTraits(profile.traits)
  const lands  = renderableBullets(profile.lands)
  const doesnt = renderableBullets(profile.doesntLand)
  const lights = renderableBullets(profile.highlights)

  return (
    /* NO CONTAINER. This is the whole point of the block. */
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>

      {/* Line 1 — the archetype, and its state in words. */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-title)" }}>
          {`${profile.archetype.primary} · ${profile.archetype.style}`}
        </span>
        <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
          {confirmed.includes("archetype.primary") ? "— proposed as fact" : "— inferred"}
        </span>
        <div style={{ flex: 1 }} />
        <Button
          variant="tertiary" size="sm"
          aria-expanded={expanded}
          aria-label={expanded ? "Hide how to work with this contact" : "Show how to work with this contact"}
          onClick={onToggle}
        >
          {expanded
            ? <LucideIcons.ChevronUp   size={16} />
            : <LucideIcons.ChevronDown size={16} />}
        </Button>
      </div>

      {/* Line 2 — the traits, as one sentence. An attested trait underlines
          its own words and links to the evidence; an inferred one is plain
          text. That is the affordance replacing the colour. */}
      <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--foreground)", margin: 0 }}>
        {traits.map((t, i) => (
          <span key={t.label}>
            {/* Commas throughout, no final "and". Five clauses with a
                conjunction reads as a sentence being wound up; five with
                commas reads as a list of observations, which is what it is. */}
            {i > 0 && ", "}
            {t.source === "attested" ? (
              <Tooltip side="cursor" content={`Attested · ${t.evidence.label}. The organisation stands behind this one — open it.`}>
                <button
                  className="appearance-none bg-transparent border-0 p-0 cursor-pointer"
                  onClick={() => onGo(t.evidence.destination)}
                  style={{ font: "inherit", color: "inherit", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3 }}
                >
                  {i === 0 ? t.prose.charAt(0).toUpperCase() + t.prose.slice(1) : t.prose}
                </button>
              </Tooltip>
            ) : (
              <span>{i === 0 ? t.prose.charAt(0).toUpperCase() + t.prose.slice(1) : t.prose}</span>
            )}
            {i === traits.length - 1 && "."}
          </span>
        ))}
      </p>

      {/* Line 3 — the channel, same register. */}
      <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--foreground)", margin: 0 }}>
        {profile.channel?.prose ?? "Not enough contact history to read a channel preference."}
      </p>

      {/* Line 4 — the verdict. The imperative carries the weight, and the
          clock is gone: it is a pill in the record header and appears there
          once. */}
      {verdict && (
        <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.6, color: "var(--color-text-title)", margin: "2px 0 0" }}>
          <LinkedText text={verdict.text} entities={verdict.entities} onGo={onGo} />
        </p>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
          {`Generated ${verdict?.generatedAt.toLowerCase() ?? "—"}`}
        </span>
        <div style={{ flex: 1 }} />
        <Tooltip content="This reads right" side="cursor">
          <Button variant="tertiary" size="sm" aria-label="This reads right"
            onClick={() => { emitIntelligence({ name: "verdict_rated", contactId: contact.id, rating: "up" }) }}>
            <LucideIcons.ThumbsUp size={14} />
          </Button>
        </Tooltip>
        <Tooltip content="This is off — tell us why" side="cursor">
          <Button variant="tertiary" size="sm" aria-label="This is off" onClick={() => onReject("verdict")}>
            <LucideIcons.ThumbsDown size={14} />
          </Button>
        </Tooltip>
        <Tooltip content="Regenerate this verdict" side="cursor">
          <Button variant="tertiary" size="sm" aria-label="Regenerate"
            onClick={() => emitIntelligence({ name: "verdict_regenerated", contactId: contact.id })}>
            <LucideIcons.RefreshCw size={14} />
          </Button>
        </Tooltip>
      </div>

      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 10, marginTop: 4, borderTop: "0.5px solid var(--field-border)" }}>
          <ProfileBullets title="What lands"   bullets={lands}  onGo={onGo} />
          <ProfileBullets title="What doesn't" bullets={doesnt} onGo={onGo} />
          <ProfileBullets title="Highlights"   bullets={lights} onGo={onGo} />

          {/* NAMED ACTIONS, not a loose link at the end of a line. "Propose as
              fact" on its own never said WHAT it would propose. */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {!confirmed.includes("channel.preferred") && profile.channel && (
              <Button variant="primary" size="sm" onClick={() => onConfirm("channel.preferred")}>
                Propose channel preference as fact
              </Button>
            )}
            {!confirmed.includes("archetype.primary") && (
              <Button variant="secondary" size="sm" onClick={() => onConfirm("archetype.primary")}>
                {`Propose ${profile.archetype.primary.toLowerCase()} as fact`}
              </Button>
            )}
            <Button variant="tertiary" size="sm" onClick={() => onReject("trait:archetype.primary")}>
              This is wrong
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * One signal, one line, no container.
 *
 * THE REAL CASE IS THE LINE AND THE CATALOG NAME IS THE LABEL. It used to be
 * the other way round — "Something was promised and not delivered" in the
 * prominent slot, "Two escalations raised again at the QBR" small and to the
 * right. The generic sentence is true of every open commitment that has ever
 * existed; the reader learns it once and then needs the other one.
 *
 * SEVERITY IS THE LABEL'S COLOUR, not a pill beside it. Three levels, and the
 * lowest absorbed what used to be a fourth.
 */
const SIGNAL_LABEL_COLOR: Record<SignalSeverity, string> = {
  critical:  "var(--color-text-error)",
  attention: "var(--color-text-alert)",
  watch:     "var(--muted-foreground)",
}

function SignalLine({ signal, canResolve, onGo, onResolve }: {
  signal:     UcpSignal
  canResolve: boolean
  onGo:       (destination: string) => void
  onResolve:  () => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        padding: "7px 0",
        borderBottom: "0.5px solid var(--field-border)",
      }}
    >
      <span style={{ width: 132, flexShrink: 0, fontSize: 12, fontWeight: 600, color: SIGNAL_LABEL_COLOR[signal.severity] }}>
        {signal.label}
      </span>
      <button
        className="appearance-none bg-transparent border-0 p-0 cursor-pointer text-left"
        onClick={() => onGo(signal.evidence!.destination.toLowerCase())}
        style={{ font: "inherit", fontSize: 12, color: "var(--foreground)", flex: 1, minWidth: 180 }}
      >
        {`${signal.detail} · ${signal.since}`}
      </button>
      {/* Only where there is one, and only on hover or focus — an action that
          is always visible on every row is five actions competing. */}
      {canResolve && (
        <span style={{ visibility: hover ? "visible" : "hidden" }}>
          <Button variant="tertiary" size="sm" onClick={onResolve}>Resolve</Button>
        </span>
      )}
    </div>
  )
}

/** One expanded group. Every bullet carries its evidence — a statement about
 *  how to treat a person with nothing observable behind it does not render. */
function ProfileBullets({ title, bullets, onGo }: {
  title:   string
  bullets: ProfileBullet[]
  onGo:    (destination: string) => void
}) {
  if (bullets.length === 0) return null
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <SectionLabel>{title}</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {bullets.map(b => (
          <div key={b.text} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--foreground)" }}>{`· ${b.text}`}</span>
            <Button variant="tertiary" size="sm" className="!px-0" onClick={() => onGo(b.evidence.destination)}>
              {b.evidence.label}
              <LucideIcons.ArrowUpRight size={11} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

function IntelligenceTab({ contact, onGoTab, onAsk }: {
  contact: UcpContact
  onGoTab: (id: string) => void
  onAsk:   () => void
}) {
  const profile     = useMemo(() => getProfile(contact), [contact])
  const verdict     = useMemo(() => getVerdict(contact), [contact])
  const signals     = useMemo(() => renderableSignals(getSignals(contact)), [contact])
  const allReads    = useMemo(() => renderableReads(getAgentReads(contact)), [contact])
  const [suggestions, setSuggestions] = useState(() => getSuggestions(contact))

  const [sort,     setSort]     = useState<SuggestionSort>("impact-urgency")
  const [sortOpen, setSortOpen] = useState(false)
  const [sortAnchor, setSortAnchor] = useState<DropdownAnchor | null>(null)
  const sortDrop = useDropdownPosition(sortAnchor)

  const [openBlock, setOpenBlock] = useState<"signals" | "reads" | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [openRow,  setOpenRow]  = useState<string | null>(
    () => defaultExpandedRow(getSuggestions(contact)),
  )
  const [openRead,   setOpenRead]   = useState<string | null>(null)
  const [showAllRows, setShowAllRows] = useState(false)
  const [reasonFor, setReasonFor] = useState<{ id: string; kind: "suggestion" | "read" } | null>(null)
  const [supplyFor, setSupplyFor] = useState<string | null>(null)
  const [supplied,  setSupplied]  = useState("")
  const [confirmed, setConfirmed] = useState<string[]>([])

  const [readState, setReadState] = useState<Record<string, ConfidenceState>>({})
  const [rejected,  setRejected]  = useState<string[]>([])

  const toast = useToast()
  const canAttest = false

  const setStatus = (id: string, status: SuggestionStatus, patch?: Partial<UcpSuggestion>) =>
    setSuggestions(list => list.map(s => s.id === id ? { ...s, status, ...patch } : s))

  const live     = suggestions.filter(s => !RESOLVED_STATUSES.includes(s.status))
  const accepted = suggestions.filter(s => s.status === "accepted")
  const sorted   = sortSuggestions(live, sort)
  const visible  = showAllRows ? sorted : sorted.slice(0, QUEUE_DEFAULT_ROWS)
  const hidden   = sorted.length - visible.length
  const sortLabel = SUGGESTION_SORTS.find(s => s.id === sort)?.label ?? ""

  const reads = allReads
    .filter(r => !rejected.includes(r.id))
  const unreviewed = reads.filter(r => (readState[r.id] ?? r.state) === "Inferred").length

  const toggleBlock = (block: "signals" | "reads", count: number) => {
    const opening = openBlock !== block
    setOpenBlock(opening ? block : null)
    if (opening) emitIntelligence({ name: "block_expanded", block, count })
  }

  const confirmField = (field: string) => {
    emitIntelligence({ name: "trait_confirmed", field, proposed: !canAttest })
    setConfirmed(list => [...list, field])
    toast.success(canAttest ? "Confirmed" : "Proposed as fact", {
      description: canAttest
        ? "It is on the Truth Plane now, and it moves to Overview."
        : "Sent to the domain owner to attest. It graduates to Overview once it lands.",
    })
  }

  /* THE TIE-BREAK IS EXPLICIT. Two signals are critical; the collapsed line
     names one, and it is the one that has been running longest. */
  const worst = mostUrgentSignal(signals)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── 1 · Profile and verdict, one block, no container ─────────────── */}
      <ProfileProse
        profile={profile}
        verdict={verdict}
        contact={contact}
        expanded={profileOpen}
        onToggle={() => {
          const opening = !profileOpen
          setProfileOpen(opening)
          if (opening) emitIntelligence({ name: "profile_expanded", contactId: contact.id })
        }}
        onGo={onGoTab}
        onReject={field => setReasonFor({ id: field === "verdict" ? "verdict" : field, kind: "read" })}
        onConfirm={confirmField}
        confirmed={confirmed}
      />

      {/* ── 2 · Signals — a line of text, no container, no pill ──────────── */}
      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          className="appearance-none bg-transparent border-0 p-0 cursor-pointer text-left"
          aria-expanded={openBlock === "signals"}
          onClick={() => signals.length > 0 && toggleBlock("signals", signals.length)}
          style={{ display: "flex", alignItems: "center", gap: 8, font: "inherit" }}
        >
          <span style={{ fontSize: 13, color: signals.length ? "var(--color-text-title)" : "var(--muted-foreground)" }}>
            {signals.length === 0
              ? "No signals"
              : `${signals.length} signals — most urgent: ${worst!.label.toLowerCase()} ${sincePhrase(worst!.since)}`}
          </span>
          {signals.length > 0 && (openBlock === "signals"
            ? <LucideIcons.ChevronUp   size={15} style={{ color: "var(--muted-foreground)" }} />
            : <LucideIcons.ChevronDown size={15} style={{ color: "var(--muted-foreground)" }} />)}
        </button>

        {openBlock === "signals" && (
          <div style={{ display: "flex", flexDirection: "column", borderTop: "0.5px solid var(--field-border)" }}>
            {signals.map(sig => (
              <SignalLine
                key={sig.type}
                signal={sig}
                canResolve={!!sig.suggestionId && live.some(s => s.id === sig.suggestionId)}
                onGo={onGoTab}
                onResolve={() => { setShowAllRows(true); setOpenRow(sig.suggestionId!) }}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── 3 · Suggestions — the section's ONE container, on the open row ── */}
      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <SectionLabel>{`Suggestions · ${live.length}`}</SectionLabel>
          {visible.length > 1 && (
            <div onClickCapture={e => setSortAnchor(anchorFromEvent(e))}>
              <Button variant="tertiary" size="sm" onClick={() => setSortOpen(v => !v)}>
                <LucideIcons.ArrowDownUp size={12} />
                {`Sorted by ${sortLabel.toLowerCase()}`}
              </Button>
            </div>
          )}
        </div>

        {live.length === 0 ? (
          <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Nothing pending on this contact.</span>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visible.map(s => (
              <SuggestionRow
                key={s.id}
                suggestion={s}
                expanded={openRow === s.id}
                onToggle={() => setOpenRow(id => id === s.id ? null : s.id)}
                onGo={onGoTab}
                onSend={variant => {
                  emitIntelligence({ name: "draft_sent", suggestionId: s.id, variant })
                  if (variant === "without_commitment" && s.held) {
                    emitIntelligence({ name: "fact_supplied", suggestionId: s.id, value: "(requested)", owner: s.held.owner })
                    setStatus(s.id, "pending_confirmation", { held: { ...s.held, withOwnerFor: "just now" } })
                    toast.success("Sent without a commitment", {
                      description: `${s.held.owner} has been asked to confirm ${s.held.missing} so the full reply can go out next time.`,
                    })
                    return
                  }
                  setStatus(s.id, "done")
                  toast.success("Sent", { description: `${s.title} — the row has left the queue.` })
                }}
                onAccept={() => {
                  emitIntelligence({ name: "suggestion_accepted", suggestionId: s.id })
                  setStatus(s.id, "accepted")
                  toast.success("Accepted", { description: `${s.title} is now a task in your inbox.` })
                }}
                onSupply={() => { setSupplyFor(s.id); setSupplied("") }}
                onDismiss={() => setReasonFor({ id: s.id, kind: "suggestion" })}
                onAsk={onAsk}
              />
            ))}

            {hidden > 0 && (
              <Button variant="tertiary" size="sm" className="self-start !px-0" onClick={() => setShowAllRows(true)}>
                {`Show all ${sorted.length}`}
              </Button>
            )}
          </div>
        )}

        {accepted.length > 0 && (
          <Button variant="tertiary" size="sm" className="self-start !px-0" onClick={() => toast.success("Opening your inbox", { description: `${accepted.length} accepted from this contact.` })}>
            {`${accepted.length} accepted`}
            <LucideIcons.ArrowUpRight size={12} />
          </Button>
        )}
      </section>

      {/* ── 4 · Agent reads — a line of text until opened ────────────────── */}
      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          className="appearance-none bg-transparent border-0 p-0 cursor-pointer text-left"
          aria-expanded={openBlock === "reads"}
          onClick={() => reads.length > 0 && toggleBlock("reads", reads.length)}
          style={{ display: "flex", alignItems: "center", gap: 8, font: "inherit" }}
        >
          <span style={{ fontSize: 13, color: reads.length ? "var(--color-text-title)" : "var(--muted-foreground)" }}>
            {reads.length === 0 ? "No agent reads yet" : `${reads.length} agent reads — ${unreviewed} unreviewed`}
          </span>
          {reads.length > 0 && (openBlock === "reads"
            ? <LucideIcons.ChevronUp   size={15} style={{ color: "var(--muted-foreground)" }} />
            : <LucideIcons.ChevronDown size={15} style={{ color: "var(--muted-foreground)" }} />)}
        </button>

        {openBlock === "reads" && (
          <div style={{ display: "flex", flexDirection: "column", borderTop: "0.5px solid var(--field-border)" }}>
            {reads.map(r => {
              const state = readState[r.id] ?? r.state
              const open  = openRead === r.id
              return (
                <div key={r.id} style={{ padding: "8px 0", borderBottom: "0.5px solid var(--field-border)", display: "flex", flexDirection: "column", gap: 8 }}>
                  <button
                    className="appearance-none bg-transparent border-0 p-0 cursor-pointer text-left"
                    aria-expanded={open}
                    onClick={() => setOpenRead(id => id === r.id ? null : r.id)}
                    style={{ display: "flex", alignItems: "center", gap: 12, font: "inherit" }}
                  >
                    <span style={{ flex: 1, fontSize: 12, color: "var(--foreground)" }}>{r.headline}</span>
                    <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{state.toLowerCase()}</span>
                    {open
                      ? <LucideIcons.ChevronUp   size={14} style={{ color: "var(--muted-foreground)" }} />
                      : <LucideIcons.ChevronDown size={14} style={{ color: "var(--muted-foreground)" }} />}
                  </button>

                  {open && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <span style={{ fontSize: 12, lineHeight: 1.6, color: "var(--muted-foreground)" }}>{r.body}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{`${r.agent} · ${r.area}`}</span>
                        {r.evidence.map(e => (
                          <Button key={e.label} variant="tertiary" size="sm" className="!px-0" onClick={() => onGoTab(e.destination.toLowerCase())}>
                            {e.label}
                            <LucideIcons.ArrowUpRight size={11} />
                          </Button>
                        ))}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        {r.kind === "structural" ? (
                          state === "Verified" ? (
                            <span style={{ fontSize: 11, color: "var(--color-text-success)" }}>Attested — now a Truth Plane fact.</span>
                          ) : (
                            <Button
                              variant="primary" size="sm"
                              onClick={() => {
                                emitIntelligence({ name: "read_confirmed", readId: r.id, proposed: !canAttest })
                                setReadState(m => ({ ...m, [r.id]: canAttest ? "Verified" : "In review" }))
                                toast.success(canAttest ? "Confirmed" : "Proposed as fact")
                              }}
                            >
                              {confirmLabel(canAttest)}
                            </Button>
                          )
                        ) : (
                          <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Interpretive — expires, never attested.</span>
                        )}
                        <Button variant="tertiary" size="sm" onClick={() => setReasonFor({ id: r.id, kind: "read" })}>Reject</Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {sortOpen && sortAnchor && (
        <div ref={sortDrop.ref} style={{ position: "fixed", zIndex: 10001, ...sortDrop.style }}>
          <Menu>
            {SUGGESTION_SORTS.map(opt => (
              <MenuItem key={opt.id} size="sm" label={opt.label}
                onClick={() => { setSort(opt.id); setSortOpen(false) }} />
            ))}
          </Menu>
        </div>
      )}

      <ModalDialog
        isOpen={supplyFor !== null}
        onClose={() => setSupplyFor(null)}
        variant="content"
        iconName="CalendarCheck"
        iconVariant="informative"
        title="Supply the date"
        description="It enters the Sandbox Plane as a candidate claim and goes to the domain owner to attest. The draft releases on its own once it lands."
        slotUnstyled
        slot={<Input placeholder="e.g. 14 November 2026" value={supplied} onChange={e => setSupplied(e.target.value)} />}
        ctaPrimary={{
          label: "Send for confirmation",
          disabled: supplied.trim() === "",
          onClick: () => {
            const s = suggestions.find(x => x.id === supplyFor)
            if (s?.held) {
              emitIntelligence({ name: "fact_supplied", suggestionId: s.id, value: supplied.trim(), owner: s.held.owner })
              setStatus(s.id, "pending_confirmation", { held: { ...s.held, withOwnerFor: "just now" } })
              toast.success("Sent for confirmation", { description: `With ${s.held.owner}. The draft releases here as soon as it is attested.` })
            }
            setSupplyFor(null)
          },
        }}
        ctaSecondary={{ label: "Cancel", onClick: () => setSupplyFor(null) }}
      />

      <ModalDialog
        isOpen={reasonFor !== null}
        onClose={() => setReasonFor(null)}
        variant="content"
        iconName="MessageSquareWarning"
        iconVariant="yellow"
        title={reasonFor?.kind === "suggestion" ? "Why is this not right?"
          : reasonFor?.id.startsWith("trait:") ? "Why is this profile wrong?"
          : "Why is this read wrong?"}
        description="Required. It is the only thing that stops the same suggestion coming back."
        slotUnstyled
        slot={
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {DISMISS_REASONS.map(reason => (
              <CardContainer
                key={reason}
                size="sm"
                onClick={() => {
                  if (!reasonFor) return
                  if (reasonFor.id === "verdict") {
                    emitIntelligence({ name: "verdict_rated", contactId: contact.id, rating: "down" })
                  } else if (reasonFor.id.startsWith("trait:")) {
                    emitIntelligence({ name: "trait_rejected", field: reasonFor.id.slice(6), reason })
                  } else if (reasonFor.kind === "suggestion") {
                    emitIntelligence({ name: "suggestion_dismissed", suggestionId: reasonFor.id, reason })
                    setStatus(reasonFor.id, "dismissed")
                    setOpenRow(id => id === reasonFor.id ? null : id)
                  } else {
                    emitIntelligence({ name: "read_rejected", readId: reasonFor.id, reason })
                    setRejected(list => [...list, reasonFor.id])
                  }
                  setReasonFor(null)
                  toast.success(
                    reason === TRAIN_ME_REASON ? "Sent to Train Me" : "Noted",
                    { description: reason === TRAIN_ME_REASON
                        ? "A correction carries further than a dismissal — it changes what the agent proposes next."
                        : `Dismissed as “${reason.toLowerCase()}”.` },
                  )
                }}
              >
                <div style={{ pointerEvents: "none", display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-title)" }}>{reason}</span>
                  {reason === TRAIN_ME_REASON && (
                    <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                      Goes to Train Me — a correction, not a triage decision.
                    </span>
                  )}
                </div>
              </CardContainer>
            ))}
          </div>
        }
        ctaSecondary={{ label: "Cancel", onClick: () => setReasonFor(null) }}
      />
    </div>
  )
}

/**
 * One row of the queue — and the section's ONE container, on the open row.
 *
 * A COLLAPSED ROW IS A LINE OF TEXT, not a card. It used to be a
 * CardContainer wrapping an EntityList, which meant three containers on
 * screen for three rows of which two showed a title and a clause. The chrome
 * budget allows exactly one container in the default state and spends it
 * here, on the row you can act on.
 *
 * NOTHING NESTS INSIDE IT EITHER. The held state was an InformativeCard and
 * the draft was a bordered box, so the expanded row was three boxes deep. The
 * held state is one line with the explanation behind `Why?`, and the draft is
 * a typographic quote — a rule down its left edge, no border, no fill. It is
 * already inside the row's container; a second border says nothing the first
 * one did not.
 */
function SuggestionRow({
  suggestion: s, expanded, onToggle, onGo, onSend, onAccept, onSupply, onDismiss, onAsk,
}: {
  suggestion: UcpSuggestion
  expanded:   boolean
  onToggle:   () => void
  onGo:       (destination: string) => void
  onSend:     (variant: "full" | "without_commitment") => void
  onAccept:   () => void
  onSupply:   () => void
  onDismiss:  () => void
  onAsk:      () => void
}) {
  const held  = s.status === "held" ? s.held : undefined
  const draft = s.draft
  const [showFullDraft, setShowFullDraft] = useState(false)
  const [showWhy,       setShowWhy]       = useState(false)

  const statusVariant: TagVariantLite =
    s.status === "held" ? "alert"
    : s.status === "pending_confirmation" ? "informative"
    : s.status === "ready" ? "success"
    : "neutral"

  /* The one line every row shows, open or shut. */
  const header = (
    <button
      className="appearance-none bg-transparent border-0 p-0 cursor-pointer text-left w-full"
      aria-expanded={expanded}
      onClick={onToggle}
      style={{ display: "flex", alignItems: "center", gap: 10, font: "inherit" }}
    >
      {/* A pill HERE and nowhere else in the section — this is an actionable
          row, which is the one place the spec keeps them. Nothing else on
          screen shares its shape. */}
      <Tag variant={statusVariant} size="sm">{SUGGESTION_STATUS_LABEL[s.status]}</Tag>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-title)" }}>{s.title}</span>
      <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{`· ${s.reason}`}</span>
      <div style={{ flex: 1 }} />
      {expanded
        ? <LucideIcons.ChevronUp   size={15} style={{ color: "var(--muted-foreground)" }} />
        : <LucideIcons.ChevronDown size={15} style={{ color: "var(--muted-foreground)" }} />}
    </button>
  )

  if (!expanded) {
    return (
      <div style={{ padding: "6px 0", borderBottom: "0.5px solid var(--field-border)" }}>
        {header}
      </div>
    )
  }

  return (
    <CardContainer size="sm">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {header}

        <span style={{ fontSize: 12, lineHeight: 1.6, color: "var(--muted-foreground)" }}>
          <LinkedText text={s.reasonFull} entities={s.reasonEntities} onGo={onGo} />
        </span>

        {/* ONE LINE. The three-line explanation of what The Council is and why
            it holds is right during onboarding and noise on visit forty, so it
            lives behind Why? and is not lost. */}
        {held && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "var(--color-text-alert)" }}>
                {`Held — ${held.missing} is not attested yet.`}
              </span>
              <Button variant="tertiary" size="sm" className="!px-0" onClick={() => setShowWhy(v => !v)}>
                {showWhy ? "Hide" : "Why?"}
              </Button>
            </div>
            {showWhy && (
              <span style={{ fontSize: 12, lineHeight: 1.6, color: "var(--muted-foreground)" }}>
                The draft references {held.missing} that is not attested in the Truth Plane. The Council
                holds anything that commits to an unattested fact — that is what stops an agent promising
                something nobody has verified.
              </span>
            )}
          </div>
        )}

        {s.status === "pending_confirmation" && s.held && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
              {`With ${s.held.owner} · ${s.held.withOwnerFor ?? "just now"} — the draft releases here once it is attested.`}
            </span>
            <Button variant="tertiary" size="sm" className="!px-0" onClick={onAsk}>
              {`Chase ${s.held.owner.split(" ")[0]}`}
            </Button>
          </div>
        )}

        {draft && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {/* No pill. The draft's "in review" and the profile's state used to
                be the same component meaning two different things, which is
                what stops a reader trusting either. */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--field-label)" }}>
                {`Draft · ${s.confidence.toLowerCase()}`}
              </span>
              <div style={{ flex: 1 }} />
              <Button variant="tertiary" size="sm" className="!px-0" onClick={() => setShowFullDraft(v => !v)}>
                {showFullDraft ? "Show less" : `Show all ${draft.body.length} lines`}
              </Button>
            </div>

            {/* A quote, not a box: a rule down the left edge and nothing else. */}
            <div
              style={{
                paddingLeft: 12,
                borderLeft: "2px solid var(--field-border)",
                ...(showFullDraft ? {} : {
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical" as const,
                  overflow: "hidden",
                }),
              }}
            >
              {draft.body.map((line, i) => (
                <span key={i} style={{ fontSize: 12, lineHeight: 1.6, color: "var(--foreground)", display: showFullDraft ? "block" : "inline" }}>
                  {line}{showFullDraft ? "" : " "}
                </span>
              ))}
            </div>

            {draft.grounding.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Grounded in</span>
                {draft.grounding.map(g => (
                  <Button key={g.factId} variant="tertiary" size="sm" className="!px-0" onClick={() => onGo("knowledge")}>
                    {g.label}
                    <LucideIcons.ArrowUpRight size={11} />
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {s.expired && <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{s.expired}</span>}

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {held ? (
            <>
              <Button variant="primary" size="sm" onClick={onSupply}>Supply the date</Button>
              <Button variant="secondary" size="sm" onClick={() => onSend("without_commitment")}>
                Reply without committing
              </Button>
            </>
          ) : s.status === "ready" ? (
            <Button variant="primary" size="sm" onClick={() => onSend("full")}>Review and send</Button>
          ) : s.status === "pending_confirmation" ? null : (
            <Button variant="primary" size="sm" onClick={onAccept}>Accept</Button>
          )}
          {s.status !== "pending_confirmation" && (
            <Button variant="tertiary" size="sm" onClick={onAsk}>Edit</Button>
          )}
          <Button variant="tertiary" size="sm" onClick={onDismiss}>Dismiss</Button>
        </div>
      </div>
    </CardContainer>
  )
}

/** The section label the panel-content page defines — 11px, semibold, upper,
 *  `--field-label`. Used here so Intelligence and Knowledge stack sections the
 *  same way a SlideOut body does. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--field-label)" }}>
      {children}
    </span>
  )
}

/**
 * The two-column key-value table from the SlideOut/SidePanel — Content page,
 * zone 7 — as ONE function rather than a shape each panel redraws.
 *
 * The drive preview already had it inline; the note preview needed the same
 * thing, and a second copy is how the 120px label column and the 1px divider
 * drift apart. The page's own anatomy: bordered 8px container, rows at
 * `py-8 px-12`, a fixed 120px label, dividers between rows and never after
 * the last one.
 *
 * `null` values are DROPPED, not rendered blank — that page is explicit that
 * a cell is never left empty, and a row for a fact the record does not have
 * ("Edited: never") is a row that says nothing. A value the record *should*
 * have and is missing is a different case and reads as italic Unknown.
 */
function DetailTable({ rows }: { rows: [string, React.ReactNode | null][] }) {
  const shown = rows.filter(([, value]) => value !== null && value !== undefined)
  return (
    <div className="flex flex-col rounded-[8px]" style={{ border: "1px solid var(--field-border)" }}>
      {shown.map(([label, value], i) => (
        <div key={label}>
          <div className="flex items-center gap-[19px] py-[8px] px-[12px]">
            <span className="w-[120px] shrink-0 text-[12px] font-medium leading-[20px]" style={{ color: "var(--foreground)" }}>{label}</span>
            <span className="flex-1 text-[12px] font-medium leading-[20px]" style={{ color: "var(--field-supporting)" }}>{value}</span>
          </div>
          {i < shown.length - 1 && <div className="w-full h-[1px]" style={{ background: "var(--color-border-neutral-lighter)" }} />}
        </div>
      ))}
    </div>
  )
}

/**
 * ── The communication preview ──────────────────────────────────────────────
 *
 * Figma: Unified Customer Profile → Email (7698:2032), SMS (7698:2033),
 * Call (7698:2034). Michael, 2026-09-11: that design, adapted to the DS with
 * its own tokens and components.
 *
 * WHAT CAME FROM FIGMA and what came from the DS, because the two are
 * different questions and the answer to the second is "everything it has":
 *
 *   Figma gave     the structure — header, Conversation | Details tabs, a
 *                  purple summary, an asymmetric thread, a details sheet with
 *                  Details / Timeline / Attachments.
 *   The DS gave    SlideOut (header, tabs, close, the CTA footer),
 *                  HighlightIcon, AvatarCircle, Tag, Button, and every colour
 *                  through a token. Nothing here is a hex.
 *
 * THE ASYMMETRY IS THE POINT. Outbound sits right, tinted, with a delivery
 * receipt; inbound sits left with no fill at all. That is what makes a thread
 * read as a conversation instead of a log, and it is the one thing that would
 * be lost by rendering both sides the same.
 *
 * WHAT I DID NOT COPY. Figma's bubbles carry a radial-gradient background and
 * a drop shadow. Both are decoration the DS has no token for, and CLAUDE.md is
 * explicit that a value not on the scale is a conversation rather than a new
 * token — so the bubble takes the flat surface tint its tone already
 * publishes. The shape, the spacing and the hierarchy are Figma's; the
 * material is the DS's.
 */
const RECEIPT_LABEL: Record<NonNullable<ThreadEntry["receipt"]>, string> = {
  sent:      "Sent",
  delivered: "Delivered",
  opened:    "Opened",
}

const ATTACHMENT_ICON: Record<CommsAttachment["kind"], { icon: string; variant: HighlightIconVariant }> = {
  doc:   { icon: "FileText",  variant: "light-blue" },
  txt:   { icon: "FileType2", variant: "informative" },
  image: { icon: "Image",     variant: "lime" },
}

const CHANNEL_ICON: Record<CommsThread["channel"], string> = {
  email: "Mail",
  sms:   "MessageSquare",
  call:  "Phone",
}

function ThreadMessage({ entry }: { entry: ThreadEntry }) {
  const outbound = entry.direction === "outbound"
  const bubble = (
    <div
      style={{
        flex: 1, minWidth: 0,
        display: "flex", flexDirection: "column", gap: 4,
        padding: "12px",
        borderRadius: 8,
        /* Outbound is tinted, inbound is bare. The tint is the DS's own
           surface token, not Figma's gradient — see the note above. */
        background: outbound ? "var(--color-surface-primary-subtle)" : "transparent",
      }}
    >
      <span style={{ fontSize: 13, lineHeight: 1.6, color: "var(--foreground)" }}>{entry.body}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: outbound ? "flex-end" : "flex-start" }}>
        <span style={{ fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--color-text-caption)" }}>
          {entry.at}
        </span>
        {/* Only what the channel can actually report. */}
        {entry.receipt && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--color-text-caption)" }}>
            <LucideIcons.Check size={12} />
            {RECEIPT_LABEL[entry.receipt]}
          </span>
        )}
      </div>
    </div>
  )

  const avatar = (
    <AvatarCircle name={entry.author ?? ""} sizeKey="md" avatarStyle="text" />
  )

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 8, width: "100%",
      paddingLeft:  outbound ? 40 : 0,
      paddingRight: outbound ? 0  : 40,
    }}>
      {!outbound && avatar}
      {bubble}
      {outbound && avatar}
    </div>
  )
}

function CommsPreview({ thread, contact, open, onClose, onGo }: {
  thread:  CommsThread | null
  contact: UcpContact
  open:    boolean
  onClose: () => void
  onGo:    (destination: string) => void
}) {
  const [tab, setTab] = useState(0)
  const [showSummary, setShowSummary] = useState(true)

  return (
    <SlideOut
      open={open}
      onClose={onClose}
      type="with-variants"
      size="m"
      /* MEDIUM, 450px — Michael, 2026-09-11. A thread is a column of bubbles
         and the title is often a phone number, which is the one string that
         must not be truncated: "+1 (212) 5…" identifies nobody. At 350 the
         header cut it mid-area-code with the status tag beside it. Not half,
         the way the note preview is: a note is paragraphs and wants the
         width, a chat bubble past ~400px stops reading as a message. */
      initialSnap="medium"
      title={thread?.title ?? ""}
      subtitle={thread?.when ?? ""}
      showIcon
      iconContent={thread
        ? <HighlightIcon size="sm" variant="light-blue" iconName={CHANNEL_ICON[thread.channel]} />
        : undefined}
      showStatus
      statusLabel={thread?.status.label}
      showTopButton={false}
      showTabs
      showTab3={false}
      tabLabels={["Conversation", "Details", ""]}
      activeTab={tab}
      onTabChange={setTab}
      showSearchBar={false}
      showChips={false}
      /* Figma's own actions row: reply to the thread, or leave a note only the
         team sees. Small buttons — the footer sizes from the panel width and
         an M button truncates its own label in a narrow one. */
      showCta={!!thread}
      ctaSize="sm"
      ctaPrimaryLabel="Reply"
      onCtaPrimary={() => onGo("activity")}
      showCtaSecondary={!!thread}
      ctaSecondaryLabel="Internal note"
      onCtaSecondary={() => onGo("activity")}
    >
      {thread && (
        <div className={PANEL_CONTENT_CLASS}>
          {tab === 0 ? (
            <>
              {/* The purple summary, dismissible exactly as in Figma. Absent
                  when there is nothing worth summarising — a two-message SMS
                  exchange is shorter than any summary of it. */}
              {thread.summary && showSummary && (
                <div
                  className="flex flex-col gap-[8px] rounded-[8px] p-[12px]"
                  style={{ background: "var(--color-surface-purple-more-subtle)", border: "0.5px solid var(--card-purple-border)" }}
                >
                  <div className="flex items-center gap-[6px]">
                    <Sparkle size={12} style={{ color: "var(--color-text-purple)" }} />
                    <span className="text-[13px] font-semibold" style={{ color: "var(--color-text-purple)" }}>Summary</span>
                    <div style={{ flex: 1 }} />
                    <Button variant="tertiary" size="sm" className="!px-0" aria-label="Hide the summary" onClick={() => setShowSummary(false)}>
                      <LucideIcons.X size={14} />
                    </Button>
                  </div>
                  <p className="text-[12px] leading-[1.6] m-0" style={{ color: "var(--color-text-purple)" }}>
                    {thread.summary}
                  </p>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {thread.entries.map((entry, i) => {
                  if (entry.kind === "separator") {
                    /* The same device the Activity feed uses. One separator in
                       the product, not two that drift. */
                    return <ElapsedSeparator key={i} label={entry.body} />
                  }
                  if (entry.kind === "system") {
                    return (
                      <div
                        key={i}
                        style={{
                          display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                          padding: 12, borderRadius: 8,
                          background: "var(--color-surface-success-more-subtle)",
                          border: "0.5px solid var(--field-border)",
                        }}
                      >
                        <LucideIcons.Check size={14} style={{ color: "var(--color-text-success)" }} />
                        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "var(--color-text-success)" }}>{entry.body}</span>
                        <span style={{ fontSize: 10, color: "var(--color-text-success)" }}>{entry.at}</span>
                      </div>
                    )
                  }
                  if (entry.kind === "note") {
                    /* An internal note must NOT look like a message. It is
                       visible to the team and never to the contact, and the
                       alert tint is what stops somebody reading it as
                       something that was sent. */
                    return (
                      <div
                        key={i}
                        style={{
                          display: "flex", flexDirection: "column", gap: 4,
                          padding: 12, borderRadius: 8,
                          background: "var(--color-surface-alert-more-subtle)",
                          border: "0.5px solid var(--field-border)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-alert)" }}>Internal note</span>
                          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{entry.author}</span>
                          <div style={{ flex: 1 }} />
                          <span style={{ fontSize: 10, color: "var(--color-text-alert)" }}>{entry.at}</span>
                        </div>
                        <span style={{ fontSize: 12, lineHeight: 1.6, color: "var(--color-text-alert)" }}>{entry.body}</span>
                      </div>
                    )
                  }
                  return <ThreadMessage key={i} entry={entry} />
                })}
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-[8px]">
                <SectionLabel>Details</SectionLabel>
                <DetailTable rows={[
                  ["Status",   <Tag variant={thread.status.variant} size="sm">{thread.status.label}</Tag>],
                  ["Assigned", thread.assigned],
                  ["Due by",   thread.dueBy
                    ? <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        {thread.dueBy.at}
                        <Tag variant="alert" size="sm">{thread.dueBy.overdueIn}</Tag>
                      </span>
                    : null],
                  ["Sentiment", thread.sentiment ?? null],
                  ["Duration",  thread.duration ?? null],
                  ["Recording", thread.recording ?? null],
                ]} />
              </div>

              <div className="flex flex-col gap-[8px]">
                <SectionLabel>Timeline</SectionLabel>
                <DetailTable rows={[
                  ["Created",       thread.created],
                  ["Last activity", thread.lastActivity],
                ]} />
              </div>

              <div className="flex flex-col gap-[8px]">
                <SectionLabel>{`Attachments (${thread.attachments.length})`}</SectionLabel>
                {thread.attachments.length === 0 ? (
                  <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Nothing attached to this one.</span>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {thread.attachments.map(f => (
                      <CardContainer key={f.name} size="sm" className="!p-0 overflow-hidden">
                        <EntityList items={[{
                          id:          f.name,
                          title:       f.name,
                          iconName:    ATTACHMENT_ICON[f.kind].icon,
                          iconVariant: f.kind === "image" ? "success" : f.kind === "txt" ? "info" : "light-blue",
                          actions:     [{ label: "Open", variant: "tertiary", icon: "ArrowUpRight", onClick: () => onGo("knowledge") }],
                        }]} />
                      </CardContainer>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-[8px]">
                <SectionLabel>How this is used</SectionLabel>
                <span className="text-[12px] leading-[1.6]" style={{ color: "var(--field-supporting)" }}>
                  {`${contact.agent.name} can quote anything in this thread with its citation. An internal note is never sent and never leaves the team.`}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </SlideOut>
  )
}

/**
 * ── The Governance preview, as one component ───────────────────────────────
 *
 * Michael, 2026-09-11: the Sandbox, Truth Plane and Drives previews should
 * carry the same information Governance's own item previews carry, expressed
 * with the components from the SlideOut/SidePanel — Content page.
 *
 * READ OFF THE REAL THING this time, not off a filter bar. The Governance
 * Studio prototype is public — lexpaniagua-prod.github.io/governance-studio-V1
 * — so the earlier note in this file about working from screenshots is
 * settled. Its item preview is four sections under two tabs:
 *
 *   Overview │ Details
 *
 *   AI SUMMARY            a generated paragraph, then an arrow line that is
 *                         the imperative: "→ Review 8 pending claims and renew
 *                         5 expiring facts before the next audit cycle."
 *   WHAT NEEDS ATTENTION  counts with a link each — Facts expiring soon 5
 *                         Review →, Pending human review 8 Open queue →,
 *                         Active proposals 9 View →
 *   GOVERNANCE HEALTH     confidence distribution, human-validated share,
 *                         audit completeness, conflict rate
 *   ACTIONS & SHORTCUTS   Open Review Queue, View Expiring Facts, Go to
 *                         Promotions, Open Knowledge, View Activity Log
 *
 * HOW IT MAPS ONTO THE DS PAGE'S ZONES, which is the part that is a decision
 * rather than a transcription:
 *
 *   AI Summary           → zone 1, the purple card. Same position, and that
 *                          page also puts it first, so nothing had to move.
 *   Governance health    → zone 2, the HighlightCard grid, three cards.
 *   What needs attention → zone 3, a list section: EntityList rows, each with
 *                          its own action. Governance renders these as counts
 *                          with a link each — "Facts expiring soon 5 Review →"
 *                          — and a link is the whole point of the row, so the
 *                          grid was the wrong home for it: HighlightCard has
 *                          no onClick, and giving one a click target the
 *                          component does not own is how a card becomes a
 *                          button nobody can style consistently.
 *
 * THE TWO ARE SWAPPED relative to Governance, which leads with attention. The
 * DS page's order is explicit — "content always follows this fixed order,
 * never rearrange" — and it puts the metric grid above list sections. Michael
 * asked for Governance's INFORMATION in that page's components, so where the
 * two disagree the page wins on layout and Governance wins on content.
 *   Actions & shortcuts  → tertiary Buttons under a section header.
 *   Details tab          → zone 7, the two-column DetailTable.
 *
 * ONE HONEST DIFFERENCE, and it is the reason this is not a copy. Governance's
 * rows are PLANES — "12 facts, 5 expiring, 8 in review, 9 proposals". Ours are
 * single facts, claims and drives, one level down. A single fact has no count
 * of itself, so where Governance shows a number this shows the thing: the
 * attention flags the fact actually carries, from the same three-word
 * vocabulary Governance filters on. The sections, the order and the language
 * are theirs; the scope is this record's.
 *
 * THE CONFIDENCE PERCENTAGE IS NOT COPIED. Governance shows "95% confidence"
 * and this does not, for the same reason Intelligence dropped it and the
 * Knowledge rows dropped it: it was derived from the plane, restating the
 * plane. A state label carries the same meaning and can be argued with.
 */

/** One card in the health grid. */
interface HealthRow {
  label: string
  value: string
  note?: string
  icon: string
  variant: HighlightIconVariant
  feedbackType?: "positive" | "negative" | "neutral"
}

/** Everything the panel needs, resolved by the caller from a fact or a drive
 *  so the panel itself never branches on which one it is holding. */
interface GovernancePreviewData {
  title:      string
  subtitle:   string
  statusLabel: string
  icon:       string
  iconVariant: HighlightIconVariant
  /** Zone 1 — the generated paragraph, then the imperative. */
  summary:    string
  imperative: string
  /** Zone 3 — what to act on, each with the link that acts on it. */
  attention:  { label: string; detail: string; icon: string; rowVariant: NonNullable<EntityListItemData["iconVariant"]>; cta: string; destination: string }[]
  /** Zone 2 — three named measures, the page's grid ceiling being four. */
  health:     HealthRow[]
  /** The flat attributes, on the Details tab. */
  details:    [string, React.ReactNode | null][]
  /* THE PANEL'S TWO ACTIONS, and they live in the CTA footer rather than in
     the body — Michael, 2026-09-11. CLAUDE.md is explicit: "the panel's main
     action goes in the CTA footer — never a Button under the title", and a
     preview whose only real action is a tertiary link halfway down the scroll
     is exactly how three previews in People & Access hid theirs. The footer
     is also FIXED, so the action stays reachable on a panel whose body
     scrolls, which a link in the body is not.

     Primary is what the panel is asking you to do; secondary is the other
     thing a reader plausibly came for. Anything past those two stays a
     tertiary link in the body — a footer with three buttons has no primary. */
  ctaPrimary:   { label: string; destination: string }
  ctaSecondary: { label: string; destination: string }
  /** Whatever is left after the two actions. Often empty. */
  shortcuts:  { label: string; destination: string }[]
}

function GovernancePreview({ data, open, onClose, onGo }: {
  data:    GovernancePreviewData | null
  open:    boolean
  onClose: () => void
  onGo:    (destination: string) => void
}) {
  const [tab, setTab] = useState(0)

  return (
    <SlideOut
      open={open}
      onClose={onClose}
      type="with-variants"
      size="m"
      title={data?.title ?? ""}
      subtitle={data?.subtitle ?? ""}
      showIcon
      iconContent={data ? <HighlightIcon size="sm" variant={data.iconVariant} iconName={data.icon} /> : undefined}
      showStatus
      statusLabel={data?.statusLabel}
      showTopButton={false}
      /* Two tabs, the same two Governance uses. Overview is what to do about
         this item; Details is what it is. Somebody who opened the panel to
         act should not walk past an attributes table to reach the verdict. */
      showTabs
      showTab3={false}
      tabLabels={["Overview", "Details", ""]}
      activeTab={tab}
      onTabChange={setTab}
      showSearchBar={false}
      showChips={false}
      /* Gated on `data`, not left on. The panel stays mounted with data null
         while it is closed, and SlideOut's ctaPrimaryLabel defaults to the
         literal string "Button" — so an always-on footer renders two buttons
         labelled Button into the DOM of every record. */
      showCta={!!data}
      /* S, not M. Two M buttons in a 350px footer truncate — "View the
         activity log" came out as "iew the activity log". Small buttons and
         short labels, both. */
      ctaSize="sm"
      ctaPrimaryLabel={data?.ctaPrimary.label}
      onCtaPrimary={() => data && onGo(data.ctaPrimary.destination)}
      showCtaSecondary={!!data}
      ctaSecondaryLabel={data?.ctaSecondary.label}
      onCtaSecondary={() => data && onGo(data.ctaSecondary.destination)}
    >
      {data && (
        <div className={PANEL_CONTENT_CLASS}>
          {tab === 0 ? (
            <>
              {/* Zone 1 — AI Summary. Always first when present. */}
              <div
                className="flex flex-col gap-[8px] rounded-[8px] p-[12px]"
                style={{ background: "var(--color-surface-purple-more-subtle)", border: "0.5px solid var(--card-purple-border)" }}
              >
                <div className="flex items-center gap-[6px]">
                  <Sparkle size={11} style={{ color: "var(--color-text-purple)" }} />
                  <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-purple)" }}>
                    AI summary
                  </span>
                </div>
                <p className="text-[12px] leading-[1.6] m-0" style={{ color: "var(--foreground)" }}>{data.summary}</p>
                {/* The arrow line is Governance's own device, and it earns its
                    place: the paragraph says what is true, this says what to
                    do about it. Keeping them in one paragraph is how an
                    imperative gets read as description. */}
                <p className="text-[12px] leading-[1.6] m-0 font-semibold" style={{ color: "var(--color-text-purple)" }}>
                  {`→ ${data.imperative}`}
                </p>
              </div>

              {/* Zone 2 — the metric grid. Three cards, inside the page's
                  own 2–4 ceiling; the measures that did not fit are on the
                  Details tab rather than crammed into a fourth and fifth. */}
              <div className="flex flex-col gap-[8px]">
                <SectionLabel>Governance health</SectionLabel>
                <AdaptiveMetricGrid
                  cards={data.health.map(row => ({
                    label:        row.label,
                    value:        row.value,
                    feedback:     row.note,
                    feedbackType: row.feedbackType ?? "neutral",
                    iconName:     row.icon,
                    iconVariant:  row.variant,
                  }))}
                />
              </div>

              {/* Zone 3 — a list section. Each row carries the action that is
                  the reason it is on screen. */}
              <div className="flex flex-col gap-[8px]">
                <SectionLabel>What needs attention</SectionLabel>
                {data.attention.length === 0 ? (
                  <CardContainer size="sm">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <HighlightIcon size="sm" variant="success" iconName="Check" />
                      <span style={{ fontSize: 12, color: "var(--color-text-title)" }}>Nothing needs attention here.</span>
                    </div>
                  </CardContainer>
                ) : (
                  <div className="flex flex-col gap-[8px]">
                    {data.attention.map(a => (
                      <CardContainer key={a.label} size="sm" className="!p-0 overflow-hidden">
                        <EntityList items={[{
                          id:          a.label,
                          title:       a.label,
                          iconName:    a.icon,
                          iconVariant: a.rowVariant,
                          primaryMeta: [{ iconName: "Info", label: a.detail }],
                          actions:     [{ label: a.cta, variant: "tertiary", onClick: () => onGo(a.destination) }],
                        }]} />
                      </CardContainer>
                    ))}
                  </div>
                )}
              </div>

              {/* Whatever the footer did not take. Governance lists five
                  shortcuts; two of ours are now buttons at the bottom, and
                  these are the rest — tertiary, because they are places to go
                  rather than things the panel is asking for. */}
              {data.shortcuts.length > 0 && (
                <div className="flex flex-col gap-[8px]">
                  <SectionLabel>More in this record</SectionLabel>
                  <div className="flex flex-col items-start gap-[2px]">
                    {data.shortcuts.map(s => (
                      <Button key={s.label} variant="tertiary" size="sm" className="!px-0" onClick={() => onGo(s.destination)}>
                        {s.label}
                        <LucideIcons.ArrowUpRight size={12} />
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-[8px]">
              <SectionLabel>Details</SectionLabel>
              <DetailTable rows={data.details} />
            </div>
          )}
        </div>
      )}
    </SlideOut>
  )
}

/** Days between a fixture date and the record's "now". */
function daysSince(date: string): number | null {
  const then = new Date(date)
  if (Number.isNaN(then.getTime())) return null
  return Math.round((KNOWLEDGE_NOW.getTime() - then.getTime()) / 86_400_000)
}

/** A fact or a claim, in Governance's language. */
function factPreviewData(f: UcpFact, contact: UcpContact): GovernancePreviewData {
  const age  = daysSince(f.verifiedAt)
  const days = age === null ? "—" : `${age}d`

  /* Governance's three attention categories, and ours carry the same three
     words. Each gets the destination its own link would have. */
  const attention = f.attention.map(flag => ({
    label:      flag,
    detail:     flag === "Due to expire"
      ? `Last verified ${f.verifiedAt}${age === null ? "" : ` · ${age} days ago`}`
      : flag === "Needs review"
        ? "Waiting on a person to attest it"
        : "An agent has proposed a change to this",
    icon:       flag === "Due to expire" ? "Timer" : flag === "Needs review" ? "Eye" : "Sparkles",
    rowVariant: (flag === "Due to expire" ? "error" : flag === "Needs review" ? "yellow" : "info") as NonNullable<EntityListItemData["iconVariant"]>,
    cta:        flag === "Due to expire" ? "Renew" : flag === "Needs review" ? "Open queue" : "View",
    destination: "knowledge",
  }))

  return {
    title:       f.label,
    subtitle:    `${PLANE_META[f.plane].label} Plane · ${f.scope}`,
    statusLabel: f.status,
    icon:        PLANE_ICON[f.plane],
    iconVariant: PLANE_ICON_VARIANT[f.plane],
    summary: f.plane === "truth"
      ? `This ${f.scope.toLowerCase()} fact on the Truth Plane governs ${f.value}. It is ${f.status.toLowerCase()} at ${f.risk.toLowerCase()} risk, attested from ${f.source} and last verified ${f.verifiedAt}.`
      : f.plane === "sandbox"
        ? `This claim proposes ${f.value}. It sits on the Sandbox Plane at ${f.risk.toLowerCase()} risk, drawn from ${f.source} and not yet corroborated by a second source.`
        : `This source material records ${f.value}. It is reference rather than a claim — ${contact.agent.name} can quote it with its citation and nothing in it is asserted as true on its own.`,
    imperative: f.attention.includes("Due to expire")
      ? `Re-verify it before the next audit cycle — ${contact.agent.name} can no longer commit to it.`
      : f.plane === "sandbox"
        ? "Find a corroborating source, or send it to the domain owner to attest."
        : "Nothing is required. It stays attested until its window closes.",
    attention,
    health: [
      { label: "Risk level", value: f.risk, note: "Governance risk level",
        icon: f.risk === "High" ? "ShieldX" : f.risk === "Medium" ? "ShieldAlert" : "ShieldCheck",
        variant: f.risk === "High" ? "error" : f.risk === "Medium" ? "alert" : "success",
        feedbackType: f.risk === "Low" ? "positive" : "negative" },
      { label: "Attested", value: days,
        note: age !== null && age > 60 ? "Past the 60-day window" : "Inside the 60-day window",
        icon: "CalendarCheck",
        variant: age !== null && age > 60 ? "alert" : "success",
        feedbackType: age !== null && age > 60 ? "negative" : "positive" },
      { label: "Reach", value: f.scope, note: "How far this carries",
        icon: "Share2", variant: "neutral" },
    ],
    details: [
      ["Plane",         <Tag variant={PLANE_META[f.plane].tag} size="sm">{PLANE_META[f.plane].label}</Tag>],
      ["Status",        <Tag variant={FACT_STATUS_TAG[f.status] ?? "neutral"} size="sm">{f.status}</Tag>],
      ["Value",         f.value],
      ["Risk level",    f.risk],
      ["State",         f.state],
      ["Scope",         f.scope],
      ["Human validated", f.plane === "truth" ? "Yes — a person attested it" : "Not yet — proposed by an agent"],
      ["Source",        f.source],
      ["Last verified", f.verifiedAt],
    ],
    /* The primary follows what the fact NEEDS, not a fixed label. A fact
       past its window needs re-verifying; a Sandbox claim needs a source;
       an attested fact needs nothing, so its primary is the thing a reader
       most often came for instead. */
    ctaPrimary: f.attention.includes("Due to expire")
      ? { label: "Re-verify",     destination: "knowledge" }
      : f.plane === "sandbox"
        ? { label: "Send to attest", destination: "knowledge" }
        : { label: "Review queue",  destination: "knowledge" },
    ctaSecondary: { label: "Where it is cited", destination: "activity" },
    shortcuts: [
      { label: "See where it was cited", destination: "activity" },
    ],
  }
}

/** A drive, in the same language. Governance's Sandbox item counts Sources,
 *  Bundles, Claims and Promotions; a drive's equivalent is what it holds and
 *  what has been drawn out of it. */
function drivePreviewData(d: UcpDrive, citedCount: number, contact: UcpContact): GovernancePreviewData {
  const healthy = d.state.label.toLowerCase().includes("sync")
    && !d.state.label.toLowerCase().includes("partial")
    && !d.state.label.toLowerCase().includes("fail")

  return {
    title:       d.name,
    subtitle:    `${d.kind} · ${d.provider}`,
    statusLabel: d.state.label,
    icon:        DRIVE_ICON[d.kind] ?? "Folder",
    iconVariant: DRIVE_ICON_VARIANT[d.state.variant] ?? "light-blue",
    /* `scope` is already a full phrase on a drive — "Shared with 3 networks",
       not a one-word Governance scope — so it is dropped in rather than
       prefixed. The earlier version read "shared shared with 3 networks". */
    summary: `This ${d.kind.toLowerCase()} feeds the Sources plane with ${d.items}, owned by ${d.owner} in ${d.department}. ${d.scope}. `
      + `${citedCount} fact${citedCount === 1 ? " has" : "s have"} been cited out of it onto this record.`,
    imperative: healthy
      ? `Nothing is required. ${contact.agent.name} can cite anything here, and cannot promote it to Truth without a verification step.`
      : `Resolve the ${d.state.label.toLowerCase()} state — anything ${contact.agent.name} cannot read, it cannot cite.`,
    attention: healthy ? [] : [{
      label:      d.state.label,
      detail:     `Last sync ${d.lastSync} · owned by ${d.owner}`,
      icon:       "AlertTriangle",
      rowVariant: (d.state.variant === "error" ? "error" : "yellow") as NonNullable<EntityListItemData["iconVariant"]>,
      cta:        "Review access",
      destination: "knowledge",
    }],
    health: [
      { label: "Contents", value: d.items, note: "What this drive holds",
        icon: "Files", variant: "informative" },
      { label: "Cited", value: String(citedCount), note: "Facts drawn out of it",
        icon: "Quote", variant: citedCount > 0 ? "success" : "neutral",
        feedbackType: citedCount > 0 ? "positive" : "neutral" },
      { label: "Reach", value: d.scope, note: "Who it is shared with",
        icon: "Share2", variant: "neutral" },
    ],
    details: [
      ["Provider",   d.provider],
      ["Kind",       d.kind],
      ["Contents",   d.items],
      ["Owner",      d.owner],
      ["Department", d.department],
      ["Scope",      d.scope],
      ["Sync",       <Tag variant={d.state.variant} size="sm">{d.state.label}</Tag>],
      ["Last sync",  d.lastSync],
    ],
    ctaPrimary: healthy
      ? { label: "Open citations", destination: "knowledge" }
      : { label: "Review access",  destination: "knowledge" },
    ctaSecondary: { label: "Activity log", destination: "activity" },
    shortcuts: [],
  }
}

/**
 * ── The note preview ───────────────────────────────────────────────────────
 *
 * Michael, 2026-09-10: a note opened from the Activity feed gets a preview
 * built from the SlideOut/SidePanel — Content page's vocabulary. Two columns
 * since 2026-09-11; it had tabs before, and why it does not is below.
 *
 * WHY A NOTE IS THE ONE ACTIVITY ROW WITH A PREVIEW. Every other row in that
 * feed is already whole: a call row carries its duration, its outcome and the
 * agent's read of it, and opening it would show the same four facts again. A
 * note row carries a FIRST LINE. The note is somewhere else, and so is the
 * thing that makes it matter on this record — the claims it pushed into the
 * Sandbox plane, each now waiting on a source. That is content the row has
 * nowhere to put, which is what earns the Eye.
 *
 * THE SPLIT BETWEEN THE COLUMNS is what was written versus what is true of
 * it. The left column is the note: the agent's read, the body as typed, the
 * claims it produced, and the comments people left on it. The right column is
 * the note's metadata: who wrote it, where, when, who can see it, what it is
 * attached to. Somebody who opened this to read the note should not have to
 * walk past a provenance table to reach the first sentence, and somebody
 * auditing the scope should not have to scroll three paragraphs to find it —
 * which a tab also solved, at the cost of a click and of never showing the
 * two at once. Side by side, the provenance qualifies the sentence you are
 * reading instead of waiting behind it.
 *
 * ORDER INSIDE THE LEFT COLUMN follows that page's fixed content order — AI
 * Summary first, then list sections — with one deliberate departure: the BODY
 * sits second, between the summary and the lists. The body is not a zone in that
 * vocabulary at all; it is the record itself, and a panel that puts a
 * three-card metric grid above the thing the reader opened it to read has the
 * order backwards. The claims are the list section, and they come after.
 *
 * CONSISTENCY WITH GOVERNANCE. `scope` is one of SANDBOX_SCOPES — the same
 * word, with the same meaning, as the Sandbox shelf in the Knowledge tab and
 * as the live Governance views it came from. A note is a Sandbox artefact, so
 * it is described in Sandbox's language rather than in a vocabulary this panel
 * invented for itself.
 *
 * THE CLAIMS LIST IS GONE — Michael, 2026-09-11: "borra Claims for this note."
 * It listed each claim with its Truth status, which is the Knowledge tab's own
 * job done a second time in a preview: the same three statuses, the same
 * words, against a list this panel cannot act on. What survives is the Details
 * row that COUNTS them ("3 in the Sandbox plane") — enough to know the note
 * had consequences, without restating the plane's own shelf. Anyone who needs
 * the claims themselves is going to Knowledge either way.
 */
function NotePreview({
  note, title, agentName, comments, onComment, open, onClose,
}: {
  note:      UcpNote | null
  title:     string
  agentName: string
  comments:  UcpNote["comments"]
  onComment: (text: string) => void
  open:      boolean
  onClose:   () => void
}) {
  const [draft, setDraft] = useState("")

  /* A new note clears whatever was half-typed against the previous one. A
     draft that follows the reader into a different note is how a comment
     lands on the wrong record. */
  useEffect(() => { setDraft("") }, [note])

  const submit = () => {
    const text = draft.trim()
    if (!text) return
    onComment(text)
    setDraft("")
  }

  return (
    <SlideOut
      open={open}
      onClose={onClose}
      type="with-variants"
      size="m"
      /* HALF-SCREEN — Michael, 2026-09-11. Every other preview here is a
         skim: a fact, a drive, a signal, all of them a value and a few
         attributes that read fine in 350px. A note is PROSE somebody wrote,
         three paragraphs of it, and at 350 every sentence wraps three times.
         The panel that exists to be read gets the width to read in — and it
         is the width the second column is paid for out of. */
      initialSnap="half"
      title={title}
      subtitle={note ? `Note · ${note.author}` : ""}
      showIcon
      /* Purple, and the same StickyNote glyph the row carries — the Activity
         list already colours a note purple because a note is somebody
         writing. A preview that opened under a different mark than the row it
         came from is the drive-preview bug over again. */
      iconContent={<HighlightIcon size="sm" variant="purple" iconName="StickyNote" />}
      showStatus
      statusLabel={note?.scope}
      showTopButton={false}
      showTabs={false}
      showSearchBar={false}
      showChips={false}
      showCta={false}
    >
      {note && (
        <div className={PANEL_CONTENT_CLASS}>
          {/* TWO COLUMNS, NO TABS — Michael, 2026-09-11: "elimina el tab de
              details y ese contenido muestralo a la derecha teniendo dos
              columnas de contenido, las notas y sus detalles a la derecha."

              The tab was paying for itself only at 350px. At half-screen the
              panel has room for both, and a tab there costs a click to learn
              something — who wrote this, what scope it carries — that changes
              how you read the sentence you are already looking at. Provenance
              beside the prose is the point; provenance one tab away is a
              footnote nobody opens.

              It WRAPS rather than committing to two columns: drag the panel
              back to 350 and the rail falls under the note instead of
              squeezing both into unreadable measures. `flex-[N_1_basis]`, not
              a media query — the panel is resizable, so the breakpoint has to
              be the container's, and flex-wrap is the one that already is.

              The bases add up to 500 against a half-screen panel's ~670 of
              content, so two columns hold with room to spare and the 350px
              default still wraps. They are NOT equal by weight: the rail has
              to fit "Call wrap-up · outbound call at 14:05" in a key/value
              table without turning it into four lines, so it grows at 2 to
              the note's 3 rather than taking only what is left over.

              ONLY the note and its details are in the row. Claims and
              comments sit below it at full width — a claim row carries a
              title and a status Tag and truncates the title to nothing at
              300px, and a comment is prose. Everything that needs a measure
              gets the whole panel; everything that is a lookup gets a
              column. */}
          <div className="flex flex-wrap items-start gap-[24px]">

            {/* ── Left: the note ─────────────────────────────────────────── */}
            <div className="flex flex-col gap-[16px] flex-[3_1_280px] min-w-0">

              {/* Zone 1 — AI Summary. Always first when present. */}
              <div
                className="flex flex-col gap-[6px] rounded-[8px] p-[12px]"
                style={{ background: "var(--color-surface-purple-more-subtle)", border: "0.5px solid var(--card-purple-border)" }}
              >
                <div className="flex items-center gap-[6px]">
                  <Sparkle size={11} style={{ color: "var(--color-text-purple)" }} />
                  <span className="text-[10px] font-semibold" style={{ color: "var(--color-text-purple)" }}>
                    {agentName}&rsquo;s read
                  </span>
                </div>
                <p className="text-[12px] leading-[1.6]" style={{ color: "var(--foreground)" }}>
                  {note.claims.length === 0
                    ? "Nothing in this note produced a claim — it is context, not evidence."
                    : `${note.claims.length} claim${note.claims.length === 1 ? "" : "s"} came out of this note. ` +
                      `${note.claims.filter(c => c.status === "Verified").length} of them found a corroborating source; ` +
                      "the rest are still in the Sandbox plane."}
                </p>
              </div>

              {/* The note itself, as written. */}
              <div className="flex flex-col gap-[8px]">
                <SectionLabel>Note</SectionLabel>
                <div className="flex flex-col gap-[10px]">
                  {note.body.map((para, i) => (
                    <p key={i} className="text-[12px] leading-[1.7]" style={{ color: "var(--field-supporting)" }}>
                      {para}
                    </p>
                  ))}
                </div>
              </div>


              {/* ── Comments ───────────────────────────────────────────────
                  Michael, 2026-09-11, revised the same day: they belong in
                  the LEFT column, under the note, because a comment is a
                  reply to the prose. Filing them in the metadata rail would
                  make a conversation an attribute of the note, and putting
                  them below both columns — where they were for an hour —
                  detached them from the thing being replied to.

                  They are deliberately NOT claims and cannot become one. A
                  claim is what the note asserts about the record and it goes
                  to the Sandbox plane to be sourced; a comment is a
                  colleague arguing with the author. The note's own scope
                  decides who can see the thread — a comment cannot be more
                  visible than the thing it hangs off, so there is no
                  per-comment audience control to get wrong. */}
              <div className="flex flex-col gap-[8px]">
                <div className="flex flex-col gap-[2px]">
                  <SectionLabel>
                    Comments{comments.length > 0 ? ` · ${comments.length}` : ""}
                  </SectionLabel>
                  <span className="text-[11px]" style={{ color: "var(--field-supporting)" }}>
                    Visible to everyone the note is — {note.scope.toLowerCase()}. A comment is not a claim
                    and never reaches the Truth plane.
                  </span>
                </div>

                {comments.length === 0 ? (
                  <span className="text-[12px]" style={{ color: "var(--field-supporting)" }}>
                    No comments yet.
                  </span>
                ) : (
                  <div className="flex flex-col gap-[12px]">
                    {comments.map((cm, i) => (
                      <div key={`${cm.author}-${i}`} className="flex items-start gap-[8px]">
                        <AvatarCircle name={cm.author} sizeKey="md" avatarStyle="text" />
                        <div className="flex flex-col gap-[2px] min-w-0 flex-1">
                          <div className="flex items-baseline gap-[6px] flex-wrap">
                            <span className="text-[12px] font-semibold" style={{ color: "var(--color-text-title)" }}>
                              {cm.author}
                            </span>
                            <span className="text-[11px]" style={{ color: "var(--field-supporting)" }}>
                              {cm.role} · {cm.at}
                            </span>
                          </div>
                          <p className="text-[12px] leading-[1.6]" style={{ color: "var(--field-supporting)" }}>
                            {cm.text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right: the details ─────────────────────────────────────── */}
            <div className="flex flex-col gap-[16px] flex-[2_1_220px] min-w-0">
              <div className="flex flex-col gap-[8px]">
                <SectionLabel>Details</SectionLabel>
                <DetailTable rows={[
                  ["Author",     note.author],
                  ["Role",       note.authorRole],
                  ["Written in", note.writtenIn],
                  ["Created",    note.createdAt],
                  ["Edited",     note.editedAt ?? null],
                  ["Scope",      <Tag variant="neutral" size="sm">{note.scope}</Tag>],
                  ["Claims",     `${note.claims.length} in the Sandbox plane`],
                ]} />
              </div>

              {/* LINKED RECORDS ARE NOT ENTITY ROWS HERE — Michael,
                  2026-09-11: "usa una card que use menos espacio interno,
                  título más pequeño."

                  They were one `CardContainer` + `EntityList` per record,
                  which is the roster row's shape: a 14px title, an icon tile,
                  a second metadata line and the padding to hold all three.
                  That is the right weight for a list you are browsing and the
                  wrong one for a rail beside the note, where two of them took
                  more height than the Details table above them.

                  So: ONE card holding all of them, `size="sm"`, rows of icon +
                  12px title + 11px kind. Still `CardContainer` and still
                  `HighlightIcon` — the thing that shrank is the composition
                  inside, not the vocabulary. The type colour survives, which
                  is what keeps an email here the same blue it is everywhere
                  else. One card for a set of pointers is not the "one card
                  per item" rule being broken: these are references, not
                  records you act on — the click is what opens the record. */}
              {note.linked.length > 0 && (
                <div className="flex flex-col gap-[8px]">
                  <SectionLabel>Linked records</SectionLabel>
                  <CardContainer size="sm" className="!p-[8px]">
                    <div className="flex flex-col gap-[2px]">
                      {note.linked.map(l => {
                        const LinkIcon = (LucideIcons[l.icon as keyof typeof LucideIcons] ?? LucideIcons.CircleDot) as LucideIcon
                        return (
                          <Tooltip key={l.title} content={`${l.title} · ${l.kind}`}>
                            <div
                              className="flex items-center gap-[8px] rounded-[6px] px-[6px] py-[5px] cursor-pointer min-w-0"
                              onMouseEnter={e => { e.currentTarget.style.background = "var(--el-row-hover)" }}
                              onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
                            >
                              <LinkIcon size={13} strokeWidth={1.75} style={{ color: "var(--hi-informative-icon)", flexShrink: 0 }} />
                              <div className="flex flex-col min-w-0">
                                <span className="block truncate text-[12px] font-medium leading-[1.35]" style={{ color: "var(--color-text-title)" }}>
                                  {l.title}
                                </span>
                                <span className="block truncate text-[11px] leading-[1.35]" style={{ color: "var(--field-supporting)" }}>
                                  {l.kind}
                                </span>
                              </div>
                            </div>
                          </Tooltip>
                        )
                      })}
                    </div>
                  </CardContainer>
                </div>
              )}

              {note.attachments.length > 0 && (
                <div className="flex flex-col gap-[8px]">
                  <SectionLabel>Attachments</SectionLabel>
                  <div className="flex flex-col gap-[8px]">
                    {note.attachments.map(a => (
                      <CardContainer key={a.name} size="sm" className="!p-0 overflow-hidden">
                        <EntityList items={[{
                          id:            a.name,
                          title:         a.name,
                          iconName:      "Paperclip",
                          iconVariant:   "neutral",
                          secondaryMeta: [{ iconName: "Info", label: a.meta }],
                        }]} />
                      </CardContainer>
                    ))}
                  </div>
                </div>
              )}

              {/* The same closing section the drive preview carries, saying
                  the equivalent thing for a note. Both previews answer "what
                  does this do to the record" in the same place, in the same
                  words as the Knowledge tab's own shelves. */}
              <div className="flex flex-col gap-[8px]">
                <SectionLabel>How this is used</SectionLabel>
                <span className="text-[12px] leading-[1.6]" style={{ color: "var(--field-supporting)" }}>
                  A note is a Sandbox artefact. {agentName} can cite it and can act on what it says,
                  but nothing in it counts as verified until a claim it produced finds a source.
                  Scope decides who sees the note; it does not change what the claims are worth.
                </span>
              </div>
            </div>
          </div>

          {/* ── The composer, STUCK TO THE BOTTOM ────────────────────────────
              Michael, 2026-09-11: "el add comment que sea sticky para que no
              se oculte."

              It is the one control in this panel and it was at the end of the
              longest column — three paragraphs of note plus every comment
              already left. Anyone who read the thread to the end was already
              past it, and anyone who wanted to reply first had to scroll to
              find it. Sticky at `bottom: 0` it is reachable at any scroll
              position without becoming a second footer: the panel's own CTA
              footer is off for this preview (`showCta={false}`), so there is
              nothing underneath it to collide with.

              The negative inline margin cancels the scroller's own 16px
              padding so the bar spans the full panel and the content behind
              it is covered rather than showing through at the edges — the
              padding is what lets CardContainer's hover halo escape the clip,
              so it has to stay, and this is the one element that has to
              ignore it. The 16px back as padding puts the field at the same
              left edge as everything above it. */}
          <div
            className="sticky bottom-0 flex items-center gap-[8px] pt-[12px] pb-[8px] px-[16px] -mx-[16px]"
            style={{
              background: "var(--slide-out-bg)",
              borderTop:  "0.5px solid var(--field-border)",
            }}
          >
            <div className="flex-1 min-w-0">
              <Input
                placeholder="Add a comment"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                /* Enter sends. The only other control in reach is the panel's
                   own close, and a comment lost to a stray Esc is worse than
                   one sent a sentence early. */
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); submit() } }}
                rightIcon={null}
              />
            </div>
            <Button variant="primary" size="sm" onClick={submit} disabled={!draft.trim()}>
              Comment
            </Button>
          </div>
        </div>
      )}
    </SlideOut>
  )
}

/**
 * The elapsed-time separator between activity cards — Michael, 2026-09-10.
 *
 * A divider with the subtle border and a left-aligned label in Caption S, so a
 * reader scrolling a long feed knows how far back they are without doing
 * arithmetic on timestamps.
 *
 * The label is the DS's own DATE-GROUP LABEL, taken off the Notification
 * Center's spec rather than invented here: 12px, 600, line-height 1,
 * `--color-text-caption`, ALL CAPS. Caption S Bold is documented as all-caps
 * only, which is also why the buckets read "A WEEK AGO" and not "Hace una
 * semana" — the copy is uppercase because the style is, and the screen is in
 * English.
 *
 * The rule takes the remaining width rather than sitting under the text: one
 * separator reads as one object, where a full-width line with a label above it
 * reads as two.
 */
function ElapsedSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-[12px]" role="separator" aria-label={label}>
      <span
        className="text-xs font-semibold leading-none shrink-0"
        style={{ color: "var(--color-text-caption)" }}
      >
        {label}
      </span>
      <span className="flex-1 h-px" style={{ background: "var(--color-border-neutral-subtle)" }} />
    </div>
  )
}

/** The one place activity rows are filtered — read by the tab and by the
 *  Pagination total in the parent. */
function filterActivity(
  rows: ReturnType<typeof getActivity>,
  group: ActivityGroup | "all",
  kind: string | undefined,
  search: string,
  status: string | undefined,
  period: string | undefined,
  now: Date,
): ReturnType<typeof getActivity> {
  const q = search.trim().toLowerCase()
  return rows
    .filter(a => group === "all" || CHANNEL_GROUP[a.channel] === group)
    .filter(a => !kind || CHANNEL_META[a.channel].label === kind)
    .filter(a => q === "" || [a.title, a.meta, a.timestamp].some(v => v.toLowerCase().includes(q)))
    .filter(a => !status || a.state.label === status)
    .filter(a => withinPeriod(parseActivityAt(a.timestamp, now), period, now))
}

function ActivityTab({
  contact, group, onGroupChange, kind, onKindChange, search, onSearchChange,
  status, onStatusChange, period, onPeriodChange, now, page, pageSize, onPreview, onPreviewThread,
}: {
  contact:  UcpContact
  /** The four kinds of thing an activity row can be. */
  group:    ActivityGroup | "all"
  onGroupChange: (g: ActivityGroup | "all") => void
  /** Which communication kind, when Communications is the selected group.
   *  Undefined means all of them. */
  kind:     string | undefined
  onKindChange: (value: string | undefined) => void
  /** Held by the parent, not here — all of them. The parent owns the
   *  Pagination and its total has to count the same rows this list renders;
   *  two sources for one number is how a paginator ends up offering a page
   *  that is empty. */
  search:   string
  onSearchChange: (value: string) => void
  status:   string | undefined
  onStatusChange: (value: string | undefined) => void
  period:   string | undefined
  onPeriodChange: (value: string | undefined) => void
  now:      Date
  page:     number
  pageSize: number
  /** Opens the note preview. Only note rows carry one. */
  onPreview: (n: UcpNote, title: string) => void
  /** Opens the conversation preview. Communications only. */
  onPreviewThread: (a: UcpActivity) => void
}) {
  const all      = useMemo(() => getActivity(contact), [contact])
  const filtered = useMemo(
    () => filterActivity(all, group, kind, search, status, period, now),
    [all, group, kind, search, status, period, now],
  )
  const paged    = filtered.slice((page - 1) * pageSize, page * pageSize)

  const items: EntityListItemData[] = paged.map(a => ({
    id:          a.id,
    title:       a.title,
    iconName:    CHANNEL_META[a.channel].icon,
    // The GROUP carries the colour, so every communication looks like a
    // communication whichever kind it is: a task is what needs doing (alert),
    // an event is the system acting on its own (neutral), a note is somebody
    // writing (purple, the same mark interpretation carries elsewhere).
    iconVariant: (CHANNEL_GROUP[a.channel] === "task" ? "alert"
      : CHANNEL_GROUP[a.channel] === "event" ? "neutral"
      : CHANNEL_GROUP[a.channel] === "note"  ? "purple"
      : "info") as EntityListItemData["iconVariant"],
    primaryMeta: [{ iconName: "Clock", label: a.timestamp }],
    /*
      THOM'S CONTENT, IN THE SLOTS ENTITYLIST ALREADY HAS — Michael,
      2026-09-11: the content of each item, not the UI and not the components.

      His rows carry three things ours did not, and each lands in a prop the
      component already publishes, so nothing here is new furniture:

        metaChips → secondaryMeta   what it cost and who handled it
        smsBody   → description     the message, verbatim
        sentiment → tags            how it went, on calls only

      The meta line stays first in secondaryMeta because it is the sentence;
      the chips are the facts hanging off it.
    */
    secondaryMeta: [
      { iconName: "Info", label: a.meta },
      ...(a.metaChips ?? []).map(chip => ({ iconName: "Dot", label: chip })),
    ],
    /* An SMS is short enough to read in full. EntityList's own description
       handles the expansion past its threshold, so a long one is not a
       layout problem. */
    description: a.smsBody,
    /* Sentiment is NOT the state. The state says what happened — Resolved,
       Escalated, Read; sentiment says how it went, and a call can be resolved
       and still tense. Only where it was actually read. */
    tags:        a.sentiment
      ? [{ label: a.sentiment.charAt(0).toUpperCase() + a.sentiment.slice(1) }]
      : undefined,
    state:       { label: a.state.label, variant: a.state.variant },
    aiInsight:   a.aiSummary
      ? { action: "summary", detail: a.aiSummary, viewMore: a.aiSummary.length > 160 }
      : undefined,
    /* The Eye is conditional on the NOTE, not on the channel. Every other row
       in this feed is already showing everything it has — a call row's whole
       content is its title, its duration and the agent's read of it, all three
       visible without opening anything. A note row is the one case where the
       row is a first line and the thing itself is somewhere else, so it is the
       one row that earns a preview. CLAUDE.md: omit the button entirely rather
       than render a disabled one. */
    /* A NOTE opens its own panel; a COMMUNICATION opens the conversation.
       Everything else — an event, a task — is already whole in its row and
       gets no Eye, which is the rule that has governed this list since the
       note preview: a button with nothing behind it is worse than none. */
    actions: a.note
      ? [{ label: "Preview", variant: "tertiary" as const, icon: "Eye", onClick: () => onPreview(a.note!, a.title) }]
      : CHANNEL_GROUP[a.channel] === "communication"
        ? [{ label: "Preview", variant: "tertiary" as const, icon: "Eye", onClick: () => onPreviewThread(a) }]
        : undefined,
  }))

  const q = search.trim().toLowerCase()

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Filters
        showSearch
        searchPlaceholder="Search activity by title, detail or date…"
        searchValue={search}
        onSearchChange={onSearchChange}
        /* `options` + `onSelect`, so Filters renders and positions the menu
           itself. CLAUDE.md is explicit that a screen never hand-rolls a Menu
           beside a Filters bar, and the two things these dropdowns filter on —
           what state a touchpoint is in, and how far back to look — are the
           two questions a feed this long actually gets asked.

           The options are derived from the rows, never a hardcoded list: a new
           state in the fixtures shows up here without anyone remembering to
           add it, and a state that no longer occurs stops being offered. */
        slots={[
          // Only while Communications is selected: email, SMS, call, meeting.
          ...(group === "communication" ? [{
            placeholder: "Channel",
            value:       kind,
            options:     COMMUNICATION_CHANNELS.map(ch => CHANNEL_META[ch].label),
            onSelect:    onKindChange,
            onRemove:    () => onKindChange(undefined),
          }] : []),
          {
            placeholder: "Status",
            value:       status,
            options:     Array.from(new Set(all.map(a => a.state.label))).sort(),
            onSelect:    onStatusChange,
            onRemove:    () => onStatusChange(undefined),
          },
          {
            placeholder: "Period",
            value:       period,
            options:     ACTIVITY_PERIODS.map(p => p.label),
            onSelect:    onPeriodChange,
            onRemove:    () => onPeriodChange(undefined),
          },
        ]}
        showClearFilters={!!status || !!period || !!kind || search !== ""}
        onClearFilters={() => { onStatusChange(undefined); onPeriodChange(undefined); onKindChange(undefined); onSearchChange("") }}
        /* `Filters` turns ALL THREE of these on by default — the view toggle,
           the All-filters button and the sort control. Off here, every one:
           the view toggle switches to a second view none of these tabs has
           (Michael's "sin view mode variant"), All filters opens a
           FiltersSlideout that does not exist for them, and sort has nothing
           wired behind it. A control that cannot do anything is worse than a
           missing one — it reads as broken rather than as absent. */
        showViewToggle={false}
        showAllFilters={false}
        showSort={false}
      />

      {/* Four chips, not seven — Communications · Notes · Events · Tasks. The
          communication KINDS refine that one group from the Filters bar above,
          which is where a second level belongs: a flat row of every leaf is a
          filter nobody reads, and three of the seven would sit at zero on most
          records. */}
      {/*
        THE COUNT MOVED INTO THE TOOLTIP — Michael, 2026-09-11.

        "Communications (6)" is two things in one label, and the number is the
        half that changes while you type in the search box beside it — so the
        chip row appeared to twitch as you filtered, and a control that moves
        while you use it reads as unstable. A chip says WHICH slice you are
        choosing; how big the slice is belongs to the answer, not the question.

        It is not hidden, it is moved. Hovering or focusing any chip states the
        count in words, so nothing became unavailable — and the reader who
        wants it asks for it once rather than being shown five numbers they
        did not ask for.
      */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Tooltip side="cursor" content={`${all.length} item${all.length === 1 ? "" : "s"} on this record`}>
          <Chip size="s" variant={group === "all" ? "primary" : "secondary"} onClick={() => { onGroupChange("all"); onKindChange(undefined) }}>
            All
          </Chip>
        </Tooltip>
        {ACTIVITY_GROUPS.map(g => {
          const n = all.filter(a => CHANNEL_GROUP[a.channel] === g.id).length
          return (
            <Tooltip
              key={g.id}
              side="cursor"
              /* Zero is worth saying out loud. A chip that leads nowhere is
                 better known before the click than after it. */
              content={n === 0 ? `No ${g.label.toLowerCase()} on this record` : `${n} ${n === 1 ? "item" : "items"}`}
            >
              <Chip
                size="s"
                variant={group === g.id ? "primary" : "secondary"}
                // Leaving Communications drops the kind with it — a kind that
                // cannot apply to the selected group is a filter still narrowing
                // something the reader can no longer see.
                onClick={() => { onGroupChange(g.id); if (g.id !== "communication") onKindChange(undefined) }}
              >
                {g.label}
              </Chip>
            </Tooltip>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={q ? `No activity for “${search}”` : "Nothing of this kind yet"}
          description={q
            ? "Try a shorter term, or clear the search to see the full timeline."
            : "Try another kind, or clear the filter to see the full timeline."}
          ctaLabel={q ? "Clear search" : "Clear filter"}
          onCta={() => { if (q) onSearchChange(""); else { onGroupChange("all"); onKindChange(undefined) } }}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((item, i) => {
            // The separator appears when the row's age band changes — and on
            // the FIRST row of the page too, because a page that opens
            // mid-band would otherwise show rows with no idea how old they
            // are. The bands come from one function so the label a separator
            // shows and the order the rows sit in cannot disagree.
            const label = elapsedGroupLabel(parseActivityAt(paged[i].timestamp, now), now)
            const prev  = i === 0 ? null : elapsedGroupLabel(parseActivityAt(paged[i - 1].timestamp, now), now)
            return (
              <div key={item.id} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {label !== prev && <ElapsedSeparator label={label} />}
                <CardContainer size="sm" className="!p-0 overflow-hidden">
                  <EntityList items={[item]} />
                </CardContainer>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Drives ────────────────────────────────────────────────────────────────────

/**
 * One drive → one glyph and one tint, read by BOTH the row and its preview.
 * They were two separate expressions before, which is how a Document opened a
 * preview headed by a hard drive.
 */
const DRIVE_ICON: Record<string, string> = {
  Document: "FileText",
  Drive:    "HardDrive",
  Folder:   "Folder",
}
const DRIVE_ICON_VARIANT: Record<string, "error" | "yellow" | "light-blue"> = {
  error: "error",
  alert: "yellow",
}

/**
 * ── Knowledge (was Drives) ─────────────────────────────────────────────────
 *
 * The entity's own mini-governance — what the system HOLDS about it, on three
 * shelves of the same cupboard (Michael, 2026-09-10):
 *
 *   Documents  folders and files, and what has been cited out of them
 *   Sandbox    claims pending or in processing — not yet verified
 *   Truth      verified facts
 *
 * The facts table used to live in Snapshot and the documents had a tab of
 * their own, which put a verified fact and the document it came from two tabs
 * apart. They are the same question — "what do we actually know, and can we
 * prove it" — so they are one tab with a shelf selector.
 *
 * The plane counts lead here, and this is the one place they should: on
 * Intelligence they were plumbing, and on a governance tab counting the
 * shelves IS the summary.
 */
type Shelf = "documents" | "sandbox" | "truth"

/** Governance's "Modificar" buckets, resolved from a drive's last sync. The
 *  fixtures write it as "Today, 06:00" or "Aug 4, 2026", so both shapes are
 *  read — the same parser the Activity separators use would be overkill for
 *  six rows, but the buckets are the ones Governance offers, in its order. */
function modifiedBucket(lastSync: string): string {
  if (/^Today/i.test(lastSync))     return "Today"
  if (/^Yesterday/i.test(lastSync)) return "Yesterday"
  const d = new Date(lastSync.split("·")[0].trim())
  if (Number.isNaN(d.getTime())) return "Older"
  const days = Math.round((new Date("2026-09-10").getTime() - d.getTime()) / 86_400_000)
  if (days <= 7)  return "Last 7 days"
  if (days <= 30) return "Last 30 days"
  return "Older"
}

function KnowledgeTab({ contact, onPreview, onPreviewFact }: {
  contact: UcpContact
  onPreview: (d: UcpDrive) => void
  onPreviewFact: (f: UcpFact) => void
}) {
  const [shelf,    setShelf]    = useState<Shelf>("sandbox")
  const [search,   setSearch]   = useState("")
  /** Drives — Governance's two: Modificar and Todos los departamentos. */
  const [modified,   setModified]   = useState<string | undefined>(undefined)
  const [department, setDepartment] = useState<string | undefined>(undefined)
  /** Truth Plane — Estado · Nivel de riesgo · Atención requerida. */
  const [status,     setStatus]     = useState<string | undefined>(undefined)
  const [risk,       setRisk]       = useState<string | undefined>(undefined)
  const [attention,  setAttention]  = useState<string | undefined>(undefined)
  /** Sandbox — Todos los estados · Todos los ámbitos. */
  const [claimState, setClaimState] = useState<string | undefined>(undefined)
  const [scope,      setScope]      = useState<string | undefined>(undefined)

  const allDrives = useMemo(() => getDrives(contact), [contact])
  const facts     = useMemo(() => getFacts(contact), [contact])
  const q         = search.trim().toLowerCase()

  const drives = allDrives
    .filter(d => q === "" || [d.name, d.provider, d.owner, d.kind, d.scope, d.department].some(v => v.toLowerCase().includes(q)))
    .filter(d => !department || d.department === department)
    // "Modificar" reads the drive's own last sync, which is the only date it
    // has — the same field the row shows, so the filter and the row agree.
    .filter(d => !modified || modifiedBucket(d.lastSync) === modified)

  const factsOn = (plane: KnowledgePlane) => facts
    .filter(f => f.plane === plane)
    .filter(f => q === "" || [f.label, f.value, f.source].some(v => v.toLowerCase().includes(q)))

  const truthFacts = factsOn("truth")
    .filter(f => !status    || f.status === status)
    .filter(f => !risk      || f.risk === risk)
    .filter(f => !attention || f.attention.includes(attention))

  const sandboxFacts = factsOn("sandbox")
    .filter(f => !claimState || f.state === claimState)
    .filter(f => !scope      || f.scope === scope)

  const sourceFacts  = factsOn("sources")
  const shelfFacts   = shelf === "sandbox" ? sandboxFacts : truthFacts
  const hasFilters   = q !== "" || !!modified || !!department || !!status || !!risk || !!attention || !!claimState || !!scope
  const clearAll = () => {
    setSearch(""); setModified(undefined); setDepartment(undefined)
    setStatus(undefined); setRisk(undefined); setAttention(undefined)
    setClaimState(undefined); setScope(undefined)
  }

  /** Michael's three chips, in his order and with his labels (2026-09-10):
   *  Sandbox · Truth Plane · Drives. "Drives" rather than "Documents" because
   *  that is what the platform calls the thing — a Source Drive — and the
   *  chip should say what the reader will click into. */
  const SHELVES: { id: Shelf; label: string; count: number }[] = [
    { id: "sandbox",   label: "Sandbox",     count: facts.filter(f => f.plane === "sandbox").length },
    { id: "truth",     label: "Truth Plane", count: facts.filter(f => f.plane === "truth").length },
    { id: "documents", label: "Drives",      count: allDrives.length },
  ]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/*
        THE THREE HIGHLIGHT CARDS ARE GONE — Michael, 2026-09-10: "usan mucho
        espacio en comparación al valor informativo que aportan".

        He is right, and the reason is structural rather than a matter of
        taste: the SwitchTab immediately below already carried every number
        those cards did — Sandbox (3) · Truth Plane (5) · Drives (6) — so the
        grid was a third of the tab's height spent restating its labels. A
        card that counts to three, beside a control that counts to three, is
        not a summary of the section; it is the section's own navigation drawn
        twice, once in a form you cannot click.

        What the cards did carry and the tabs do not is the confidence line
        ("agents treat as absolute"). That is a property of the PLANE, not of
        this record, and it belongs where a reader meets a plane for the first
        time — it is on each shelf's own empty state and in the preview
        panels. Nothing was lost by deleting the grid.
      */}
      {/*
        THE SHELF SELECTOR IS A SwitchTab, TO THE LEFT OF THE FILTERS
        (Michael, 2026-09-10) — because each shelf brings a DIFFERENT filter
        set, and a chip row that changes the controls beside it reads as the
        page rearranging itself. A segmented control reads as "I am in this
        one", which is what makes the filters next to it obviously its own.

        The filter sets are Governance's, read off the real views rather than
        invented: Drives filters by Modificar and department, Truth Plane by
        Estado / Nivel de riesgo / Atención requerida, Sandbox by state and
        ámbito. Their UI is not copied — these are DS `Filters` slots.
      */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <SwitchTab
          size="s"
          value={shelf}
          onChange={id => { setShelf(id as Shelf); clearAll() }}
          aria-label="Knowledge shelf"
          /* NO COUNTS IN THE LABEL — Michael, 2026-09-11: "para no ensuciar
             el componente". "Sandbox (3)" is two things in one label, and the
             number is the one that changes as you type in the search box
             beside it, so the control appeared to flicker while you filtered.
             The list underneath is where a count belongs; a segmented control
             says where you are. */
          items={SHELVES.map(sh => ({ id: sh.id, label: sh.label }))}
        />
        <div style={{ flex: 1, minWidth: 320 }}>
          <Filters
            showSearch
            searchPlaceholder={
              shelf === "documents" ? "Search drives by name, provider or owner…"
              : shelf === "sandbox" ? "Search claims by label, value or source…"
              : "Search facts by label, value or source…"}
            searchValue={search}
            onSearchChange={setSearch}
            slots={
              shelf === "documents" ? [
                { placeholder: "Modified",   value: modified,   options: DRIVE_MODIFIED_OPTIONS,                        onSelect: setModified,   onRemove: () => setModified(undefined) },
                { placeholder: "Department", value: department, options: Array.from(new Set(allDrives.map(d => d.department))).sort(), onSelect: setDepartment, onRemove: () => setDepartment(undefined) },
              ] : shelf === "sandbox" ? [
                { placeholder: "State", value: claimState, options: SANDBOX_STATES, onSelect: setClaimState, onRemove: () => setClaimState(undefined) },
                { placeholder: "Scope", value: scope,      options: SANDBOX_SCOPES, onSelect: setScope,      onRemove: () => setScope(undefined) },
              ] : [
                { placeholder: "Status",    value: status,    options: TRUTH_STATUSES, onSelect: setStatus,    onRemove: () => setStatus(undefined) },
                { placeholder: "Risk",      value: risk,      options: RISK_LEVELS,    onSelect: setRisk,      onRemove: () => setRisk(undefined) },
                { placeholder: "Attention", value: attention, options: ATTENTION_FLAGS, onSelect: setAttention, onRemove: () => setAttention(undefined) },
              ]
            }
            showClearFilters={hasFilters}
            onClearFilters={clearAll}
            showViewToggle={false}
            showAllFilters={false}
            showSort={false}
          />
        </div>
      </div>

      {shelf === "documents" ? (
        allDrives.length === 0 ? (
          <EmptyState
            icon={HardDrive}
            title="No drives attached"
            description="Source Drives connected to this record will appear here."
          />
        ) : drives.length === 0 ? (
          <EmptyState
            icon={HardDrive}
            title={q ? `No drives for “${search}”` : "No drives match these filters"}
            description={q
              ? "Try a shorter term, or clear the search to see every drive on this record."
              : "Try a different type, provider or status — or clear the filters."}
            ctaLabel="Clear filters"
            onCta={clearAll}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {drives.map(d => (
                <CardContainer key={d.id} size="sm" className="!p-0 overflow-hidden">
                  <EntityList
                    items={[{
                      id:          d.id,
                      title:       d.name,
                      iconName:    DRIVE_ICON[d.kind] ?? "Folder",
                      iconVariant: DRIVE_ICON_VARIANT[d.state.variant] ?? "light-blue",
                      primaryMeta: [
                        { iconName: "Cloud",  label: d.provider },
                        { iconName: "Files",  label: d.items    },
                      ],
                      secondaryMeta: [
                        { iconName: "User",      label: `Owner · ${d.owner}` },
                        { iconName: "RefreshCw", label: `Last sync · ${d.lastSync}` },
                        { iconName: "Share2",    label: d.scope },
                      ],
                      tags:    [{ label: d.kind }],
                      state:   { label: d.state.label, variant: d.state.variant },
                      actions: [{ label: "Preview", variant: "tertiary", icon: "Eye", onClick: () => onPreview(d) }],
                    }]}
                  />
                </CardContainer>
              ))}
            </div>

            {/* What has been cited OUT of these documents. The Sources plane is
                fed by the drives — the preview panel says so — so its facts
                belong on this shelf rather than in a fourth chip nobody would
                connect to the documents above them. */}
            {sourceFacts.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <SectionLabel>Cited from these drives</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {sourceFacts.map(f => (
                    <CardContainer key={f.id} size="sm" className="!p-0 overflow-hidden">
                      <EntityList items={[factRow(f, onPreviewFact)]} />
                    </CardContainer>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      ) : shelfFacts.length === 0 ? (
        <EmptyState
          icon={ScanLine}
          title={q ? `No claims for “${search}”` : `Nothing on the ${shelf} plane`}
          description={q
            ? "Try a shorter term, or clear the search to see this whole plane."
            : shelf === "sandbox"
              ? "No claim is waiting on verification for this record."
              : "Nothing has been verified onto the Truth plane for this record yet."}
          ctaLabel={q ? "Clear search" : undefined}
          onCta={q ? () => setSearch("") : undefined}
        />
      ) : (
        /* ALL THREE SHELVES ARE LISTS NOW — Michael, 2026-09-10: "muestra los
           3 casos del Switch tab como lista".

           The facts were a Table and the drives were an EntityList, which made
           one segmented control switch between two different kinds of object:
           a table is columns you compare down, a list is items you act on one
           at a time. On this shelf you act — a claim gets previewed, chased,
           and eventually attested — so the list is the right shape and the
           table was the odd one out.

           What the columns carried is not lost, it is re-ranked. A row leads
           with the fact and its value, then Governance's own axes: status,
           risk and, when there is one, the attention flag that is the reason
           somebody would open it. */
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {shelfFacts.map(f => (
            <CardContainer key={f.id} size="sm" className="!p-0 overflow-hidden">
              <EntityList items={[factRow(f, onPreviewFact)]} />
            </CardContainer>
          ))}
        </div>
      )}
    </div>
  )
}

function ConciergeChat({
  contact, open, onClose,
}: {
  contact: UcpContact
  open:    boolean
  onClose: () => void
}) {
  const [turns, setTurns] = useState<ConciergeTurn[]>(() => getConciergeOpening(contact))
  const [draft, setDraft] = useState("")

  const ask = (question: string) => {
    if (!question.trim()) return
    setTurns(prev => [
      ...prev,
      { id: `u-${prev.length}`, from: "user", text: question },
      {
        id: `a-${prev.length + 1}`, from: "agent",
        text: `Here's what this record supports for that. Everything below is drawn from ${contact.name}'s own planes — nothing inferred from outside this profile.`,
        sources: [
          { label: "Interaction history", plane: "truth"   },
          { label: "Call notes — Aug 28", plane: "sandbox" },
        ],
      },
    ])
    setDraft("")
  }

  /*
    ── A SidePanel, not a SlideOut ──────────────────────────────────────────
    Michael, 2026-09-11: Ask opens the chat as a SidePanel.

    It is the rule CLAUDE.md already states, applied to the one surface that
    had it backwards. "Is the panel overlapping a browsable list? → SlideOut.
    Is it embedded alongside the thing the user is working in? → SidePanel."
    The concierge answers about THIS record from THIS record's planes, and
    half the reason to ask is to check what it says against what is on the
    page — which a SlideOut's backdrop is specifically designed to prevent.

    Three things follow from the swap, and all three are improvements rather
    than costs:

    · NO BACKDROP, so the record stays readable and clickable while the chat
      is open. That is the whole point.
    · A COLLAPSED STRIP, which a SlideOut has no equivalent of. Closing the
      chat used to lose the conversation; now it parks at the edge and comes
      back with its turns intact.
    · THE COMPOSER IS THE PANEL'S FOOTER rather than a row the body has to
      pin itself, so it stays put while the transcript scrolls.
  */
  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title="Concierge"
      description={`${contact.agent.name} · ${contact.name}`}
      titleIcon={<Sparkle size={14} />}
      titleTag="Online"
      titleTagVariant="success"
      /*
        A CLOSE, NOT A COLLAPSE. The collapsed strip keeps a sliver of the
        panel on screen for ever, and this is a surface somebody opens to ask
        one question — a permanent 48px reminder of a chat nobody is having is
        the panel refusing to leave. Ask is what brings it back, and it is one
        click away in the record header.
      */
      showCollapsedStrip={false}
      showMenu={false}
      showSearch={false}
      footer={
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12, borderTop: "1px solid var(--field-border)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {CONCIERGE_PROMPTS.map(p => (
              <Chip key={p} size="s" variant="secondary" onClick={() => ask(p)}>{p}</Chip>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Input
              placeholder={`Ask about ${contact.name}…`}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") ask(draft) }}
            />
            <Button
              variant="primary"
              size="default"
              iconPosition="alone"
              icon={<Send size={16} />}
              aria-label="Send"
              onClick={() => ask(draft)}
            />
          </div>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Vertical padding only, and the 16/-16 pair so the scroller does not
            clip the message cards' hover glow flat against its edge — the
            clip-boundary trick from the guardrails, which is net zero so the
            content still lands on the panel's own 24px. */}
        <div style={{ flex: 1, overflowY: "auto", paddingTop: 20, paddingBottom: 8, paddingInline: 16, marginInline: -16, display: "flex", flexDirection: "column", gap: 12 }}>
          {turns.map(turn => (
            <div
              key={turn.id}
              style={{
                alignSelf: turn.from === "user" ? "flex-end" : "flex-start",
                maxWidth: "90%",
                display: "flex", flexDirection: "column", gap: 6,
              }}
            >
              <div
                style={{
                  background: turn.from === "user" ? "var(--field-bg)" : "var(--tag-purple-bg)",
                  border: `1px solid ${turn.from === "user" ? "var(--field-border)" : "var(--tag-purple-bd)"}`,
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: turn.from === "user" ? "var(--foreground)" : "var(--color-text-purple)",
                }}
              >
                {turn.text}
              </div>
              {turn.sources && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {turn.sources.map(s => (
                    <Tag key={s.label} variant={PLANE_META[s.plane].tag} size="sm">
                      {PLANE_META[s.plane].label} · {s.label}
                    </Tag>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </SidePanel>
  )
}

// ── Body states ───────────────────────────────────────────────────────────────

/**
 * The body while the record is in flight. It exists so the loading header is
 * not a skeleton sitting on top of finished content — a screen that says
 * "loading" in one place and shows real values in another is stating two
 * different things about the same record.
 *
 * Not an EmptyState: "nothing here" is untrue while data is on the wire.
 */
function LoadingBody() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }} aria-busy="true">
      <CardContainer size="lg" variant="default" className="w-full">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Skeleton shape="text" width={220} height={16} />
          <Skeleton shape="text" width="100%" height={12} />
          <Skeleton shape="text" width="82%"  height={12} />
        </div>
      </CardContainer>
      <div style={{ display: "flex", gap: 12 }}>
        {[0, 1, 2].map(i => (
          <CardContainer key={i} size="lg" variant="default" className="flex-1">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Skeleton shape="text" width={120} height={14} />
              {[0, 1, 2].map(r => (
                <div key={r} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <Skeleton shape="text" width={96} height={12} />
                  <Skeleton shape="text" width={48} height={12} />
                </div>
              ))}
            </div>
          </CardContainer>
        ))}
      </div>
    </div>
  )
}

/**
 * A company's people — the records that name it as their account.
 *
 * This is the tab the type publishes, and the reason it is worth having: it is
 * built from a relationship the fixtures already carry, not from a field
 * invented so that Company would have a third tab like the others. A Customer
 * has no equivalent list, so a Customer gets no equivalent tab.
 */
function PeopleTab({
  company, onOpen,
}: { company: UcpContact; onOpen?: (c: UcpContact) => void }) {
  const people = useMemo(
    () => CONTACTS.filter(c => c.type !== "company" && c.company === company.name),
    [company.name],
  )

  if (people.length === 0) {
    return (
      <EmptyState
        icon={LucideIcons.Users}
        title="No people on this account"
        description={`No contact or employee record names ${company.name} as its account yet. They appear here as soon as one does.`}
      />
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {people.map(person => {
        const state = entityState(person)
        return (
          <CardContainer key={person.id} size="sm" className="!p-0 overflow-hidden">
            <EntityList
              items={[{
                id: person.id,
                title: person.name,
                avatarName: person.name,
                primaryMeta: [
                  { iconName: "Hash", label: person.id },
                  { iconName: person.source.iconName, label: person.source.label },
                ],
                secondaryMeta: [
                  { iconName: "Info",      label: person.subtitle, tooltip: `Role and account · ${person.subtitle}` },
                  { iconName: "UserRound", label: person.owner,    tooltip: `Account owner · ${person.owner}` },
                ],
                state: { label: state.label, variant: state.variant },
                tags: [{ label: TYPE_LABEL[person.type] }],
                onClick: onOpen ? () => onOpen(person) : undefined,
              }]}
            />
          </CardContainer>
        )
      })}
    </div>
  )
}

/**
 * The body for a record the viewer cannot read. It replaces the tab content
 * rather than sitting beside it: leaving the facts, timeline and drives on
 * screen under a header that says the values are governed would be the header
 * telling the truth and the page contradicting it.
 *
 * The tabs stay mounted and switchable. They are part of the record's shape,
 * and hiding them would misrepresent what the tenant holds — the restriction is
 * on the values, not on the structure.
 */
function RestrictedBody({ name, scope }: { name: string; scope: string }) {
  return (
    <EmptyState
      icon={Lock}
      title={`Governed by ${scope}`}
      description={`${name}'s record is intact and indexed. Reading its values needs the ${scope} scope, which your role does not hold — nothing here is missing or broken.`}
      ctaLabel="Request access"
      onCta={() => {}}
    />
  )
}

// ── Profile view ──────────────────────────────────────────────────────────────

export function UcpProfileView({
  contact, onBack, onSidebarItemClick, onOpenRecord,
}: {
  contact: UcpContact
  onBack?: () => void
  onSidebarItemClick?: (id: string) => void
  /** Opening a person from a company's People tab. The roster owns navigation. */
  onOpenRecord?: (c: UcpContact) => void
}) {
  const [tab,        setTab]        = useState("overview")
  const [actGroup,   setActGroup]   = useState<ActivityGroup | "all">("all")
  const [actKind,    setActKind]    = useState<string | undefined>(undefined)
  const [actSearch,  setActSearch]  = useState("")
  const [actStatus,  setActStatus]  = useState<string | undefined>(undefined)
  const [actPeriod,  setActPeriod]  = useState<string | undefined>(undefined)
  /**
   * "Now", captured once per mount rather than read inside the grouping.
   * A list that regroups itself because a minute ticked over while the reader
   * was looking at it is a bug, and every band and every period filter has to
   * be measured from the same instant or two rows can disagree about which
   * week they are in.
   */
  const now = useMemo(() => new Date(), [])
  const [actPage,    setActPage]    = useState(1)
  const [actSize,    setActSize]    = useState(ACTIVITY_PAGE_SIZE)
  const [chatOpen,   setChatOpen]   = useState(false)
  const [infoOpen,   setInfoOpen]   = useState(false)
  const [drivePeek,  setDrivePeek]  = useState<UcpDrive | null>(null)
  const [notePeek,   setNotePeek]   = useState<{ note: UcpNote; title: string } | null>(null)
  /* Comments added in this session, keyed by the note's title — the fixtures
     are read-only, so anything typed here lives beside them rather than in
     them. Held at SCREEN level, not inside the preview: a comment that
     vanished because you closed the panel and opened the same note again
     would read as the comment having failed to post. */
  const [noteComments, setNoteComments] = useState<Record<string, UcpNote["comments"]>>({})
  const [factPeek,   setFactPeek]   = useState<UcpFact | null>(null)
  const [threadPeek, setThreadPeek] = useState<CommsThread | null>(null)

  // Ask and Information both open on the side — opening one closes the other,
  // and the panel requested last wins.
  const openChat = () => { setInfoOpen(false); setDrivePeek(null); setChatOpen(true) }
  const openInfo = () => { setChatOpen(false); setDrivePeek(null); setInfoOpen(true) }

  const state = entityState(contact)

  // A record is fetched, so there is a first paint where it does not exist yet,
  // and the header's Loading state is what belongs there. Re-armed per record:
  // navigating from one contact to another is a new fetch, not a re-render of
  // the old one.
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => setLoading(false), 700)
    return () => clearTimeout(timer)
  }, [contact.id])

  // Restricted is decided by what the viewer holds against what the record
  // needs — never by a flag on the record itself. null when nothing is gated.
  const restriction = restrictionFor(contact)

  // The entity type is host-defined — EntityHeader enumerates nothing. With an
  // avatar as the visual, the type arrives as a classification tag, and it is
  // read from TYPE_LABEL rather than stored per record: the roster chip reads
  // the same map, so the two cannot drift. They had — the same person was a
  // "Customer" in the list and a "Person" in her own header, and one record
  // out of seven disagreed with the other six. One source of truth removes
  // the class of bug, not just the instances.
  //
  // The component sorts (signals first, then classification) and caps the
  // visible set itself, so the order here is only the order they arrive in. A
  // tone of "neutral" is the absence of a tone, not a third colour.
  const headerTags = useMemo<EntityHeaderTag[]>(
    () => [
      /*
        Only when the visual is an avatar — a highlight icon already names the
        type, so a tag repeating it is the same fact twice.

        AND ONLY WHEN THE RECORD HAS NO PROFILE BLOCK (2026-09-11). Intelligence
        now names this person's role in the decision — "Economic Buyer" — and a
        "Customer" pill in the header beside it is a second taxonomy for the
        same question, with no way for a reader to tell which one is
        authoritative. The condition is `getProfile`, not the type, so a company
        or an employee keeps its classification: there is no profile block up
        there to have said it already.
      */
      ...(AVATAR_TYPES.includes(contact.type) && getProfile(contact) === null
        ? [{ label: TYPE_LABEL[contact.type], role: "classification" as const }]
        : []),
      ...contact.tags.map(t => ({
        label: t.label,
        role:  t.role,
        tone:  t.tone === "error" || t.tone === "alert" ? t.tone : undefined,
      })),
    ],
    [contact],
  )

  // The attribute row under the title — display-only, always visible, and a
  // different thing from recordFields, which carry provenance and a masking
  // state and are reached through the ⓘ panel. The component caps this at six.
  /**
   * THE COMMERCIAL CLOCK IS IN THE HEADER NOW — Michael, 2026-09-10, and it
   * is the one header change the Intelligence rebuild asked for.
   *
   * "Renewal in 12 days" was living inside body copy on the Intelligence tab,
   * which made the most decision-relevant value on the page something you had
   * to read a paragraph to find, on a tab you had to click to reach. It is a
   * fact somebody could act on, which is exactly what secondaryMetadata is
   * for, and it is now visible on every tab of the record.
   *
   * It goes FIRST, and it is the one item here that is time-bound — everything
   * else in this row is a count or a status that will read the same next week.
   *
   * EMAIL AND PHONE COME NEXT — Michael, 2026-09-11. They are the two facts on
   * a contact record that someone actually leaves the page to use, and until
   * now they were only inside the ⓘ Information panel, two clicks from a
   * record whose entire subject is a person you are trying to reach.
   *
   * They sit above the counts because reaching someone outranks knowing how
   * many facts they have. They sit below the clock because the clock is the
   * only thing here that expires.
   *
   * THE COMPONENT ALREADY OWNS THE TRUNCATION. `secondaryMetadata` caps each
   * item at `24ch` and truncates with an ellipsis — never an abbreviation,
   * which would look like the real value — and its Tooltip shows on hover AND
   * on focus whether or not the text was cut. So the answer to "what about
   * sandra.torres@meridian.com" is to pass the whole address and let the row
   * cut it: the full value is one hover away, always, and no call site has to
   * invent a character budget of its own. What the call site DOES owe is a
   * tooltip that repeats the value in full — a tooltip saying only "Email"
   * next to a cut-off address is the one way to make this worse.
   *
   * THE AGENT TIER COMES OUT to pay for them. The cap is six and it is
   * enforced by the component, so without a deliberate cut the seventh item
   * would vanish silently and a different one would vanish on each record.
   * The tier is the right one to lose: the assigned agent is already the Ask
   * button in this card's own action cluster, with the agent named in its
   * tooltip, and it is on the roster row this page was opened from. It was
   * the only item here that was pure duplication.
   */
  const secondaryMetadata = useMemo<SecondaryMetadataItem[]>(
    () => {
      const days = renewalInDays(contact)
      const base = contact.meta
        /* The agent-tier item, dropped — see above. Matched on its icon
           because that is what the fixtures agree on; the label differs
           ("Tier 1", "Tier 3") and the tooltip is prose. */
        .filter(m => m.iconName !== "Bot")
        .map(m => ({
          icon:    (LucideIcons[m.iconName as keyof typeof LucideIcons] ?? LucideIcons.CircleDot) as LucideIcon,
          text:    m.label,
          tooltip: m.tooltip,
        }))

      const reach: SecondaryMetadataItem[] = [
        {
          icon:    LucideIcons.Mail as LucideIcon,
          text:    contact.email,
          tooltip: `Email · ${contact.email}. The address every thread on this record was sent to or from.`,
        },
        {
          icon:    LucideIcons.Phone as LucideIcon,
          text:    contact.phone,
          tooltip: `Phone · ${contact.phone}. The number every call and SMS on this record used.`,
        },
      ]

      const head: SecondaryMetadataItem[] = days === null
        ? reach
        : [
            {
              icon:    LucideIcons.CalendarClock as LucideIcon,
              text:    `Renewal in ${days} days`,
              tooltip: `Renewal · closes in ${days} days. The dated commercial event every open question on this record is measured against.`,
            },
            ...reach,
          ]

      /* The cut is made HERE, not left to the component.
         `SECONDARY_METADATA_MAX` is enforced by EntityHeader, so an
         over-budget array still renders six items — it just renders a
         different six on each record, and which fact disappeared is decided
         by the order a fixture happened to be written in. Slicing the tail
         off `base` makes it one rule: the clock and the two ways to reach
         this person are never what goes, and the counts yield from the end. */
      return [...head, ...base.slice(0, SECONDARY_METADATA_MAX - head.length)]
    },
    [contact],
  )

  // Masking is a state of a field, not the absence of one: the viewer sees the
  // same labels and the same provenance badges either way, and only the values
  // are withheld. The component never resolves entitlements itself, so the
  // caller hands it the state each field is in.
  const recordFields = useMemo<RecordField[]>(
    () => getRecordFields(contact).map(f => ({
      label: f.label,
      icon: (LucideIcons[f.iconName as keyof typeof LucideIcons] ?? LucideIcons.CircleDot) as LucideIcon,
      provenance: {
        system:       f.system,
        systemAbbr:   f.systemAbbr,
        modelVersion: f.modelVersion,
        syncedAgo:    f.syncedAgo,
      },
      state:       f.masked ? "masked" : "hydrated",
      value:       f.value,
      maskedValue: f.masked ? "•••• (restricted)" : undefined,
    })),
    [contact],
  )

  // The `nba` memo lived here, shaping the record's recommendation for
  // NextBestActionCard. It went with the card — a memo whose only consumer is
  // gone is dead code, and `contact.nba` is still read by the roster row.

  // The same filter the tab runs, so the paginator counts the rows the reader
  // is actually looking at — including the search.
  const activityCount = useMemo(
    () => filterActivity(getActivity(contact), actGroup, actKind, actSearch, actStatus, actPeriod, now).length,
    [contact, actGroup, actKind, actSearch, actStatus, actPeriod, now],
  )

  const spec = useMemo(() => specForContact(contact), [contact])

  // Declared before the slots that close over it — the AI Summary widget's
  // destination button calls it, and a useMemo runs during render.
  const goTab = (id: string) => {
    setTab(id)
    setActPage(1)
  }

  /**
   * ── The Overview canvas ──────────────────────────────────────────────────
   *
   * TWO CHANGES ON 2026-09-10, both Michael's, and they are the same change
   * seen from two sides.
   *
   * THE AI SUMMARY WIDGET IS GONE, from every type. It was the full-width
   * card at the top — "Deal Concierge — read on this record" — and it was the
   * first thing anybody saw on every record in the product. The reason to
   * remove it is not that it was bad; it is that the tab restructure gave its
   * content a home. Intelligence exists to hold the agent's read of this
   * record, with the evidence, the signals and the queue that follow from it.
   * A one-paragraph version of that on Overview meant the same interpretation
   * rendered in two tabs, and the Overview copy was the one with no way to
   * act on it — a summary that ends in "Ask the concierge" is a summary that
   * could not finish its own sentence. The concierge itself is untouched; it
   * opens from the Entity Header's Ask, where it belongs.
   *
   * WHICH WIDGETS APPEAR, AND HOW WIDE, NOW COMES FROM THE TYPE. This loop
   * used to push the same five in the same order at the same width for every
   * record, so only the first widget's contents ever differed and a fleet
   * asset opened to the same furniture as a VP of Operations. `spec.canvas`
   * is the type's own composition — see the reasoning per type in
   * ucpTypeModel.ts, which is where a designer would look for it.
   *
   * A study named in the canvas still disappears when the record has nothing
   * for it. The ORDER is the type's; the PRESENCE is the record's.
   */
  const overviewSlots = useMemo<CanvasSlot[]>(() => {
    const widthOf = (span: 1 | 2 | 3) => (span === 3 ? "full" : span === 2 ? "wide" : undefined)

    /* NO REFRESH AND NO ⋯ ON ANY OF THESE — Michael, 2026-09-11: neither has
       a clear action yet. WidgetFather defaults both to on, and a control that
       does nothing is worse than a missing one: it reads as broken rather than
       as absent, and a reader who presses Refresh and sees nothing change
       learns not to trust the data either. CanvasSlot already carries the two
       flags, so this is a call-site decision and not a DS change — another
       screen that HAS wired them keeps them. */
    const chrome = { showRefresh: false, showMenu: false }

    const build = (entry: CanvasEntry): CanvasSlot | null => {
      const width = widthOf(entry.span)
      switch (entry.widget) {
        case "self":
          return {
            ...chrome,
            uid: spec.widget.uid, title: spec.widget.title,
            colSpan: entry.span, widthClass: width, rowSpan: 4,
            content: <MetricRows rows={spec.widget.rows} />,
          }
        case "alerts":
          if (getSignals(contact).length === 0) return null
          return {
            ...chrome,
            uid: "alerts", title: "Open signals",
            colSpan: entry.span, widthClass: width, rowSpan: 4,
            content: <AlertsContent contact={contact} onGoTab={goTab} />,
          }
        case "planes":
          return {
            ...chrome,
            uid: "planes", title: "Knowledge",
            colSpan: entry.span, widthClass: width, rowSpan: 4,
            content: <PlanesBoardContent contact={contact} onGoTab={goTab} />,
          }
        case "kpi": {
          /* The asset's own number, read off its metadata rather than
             invented — and the sentence under it is the next best action this
             record already carries, so the widget and the NBA cannot disagree. */
          const odometer = contact.meta.find(m => /km|mi\b/.test(m.label))?.label
          if (!odometer) return null
          return {
            ...chrome,
            uid: "kpi", title: "Odometer",
            colSpan: entry.span, widthClass: width, rowSpan: 3, maxRowSpan: 3,
            content: (
              <KpiContent
                value={odometer}
                feedback={contact.nba?.title ?? "No service due."}
                iconName="Gauge"
                iconVariant={contact.nba ? "alert" : "success"}
              />
            ),
          }
        }
        case "governance": {
          if (contact.governance === "empty") return null
          const gov = getGovernance(contact)
          return {
            ...chrome,
            uid: "governance", title: "Governance",
            colSpan: entry.span, widthClass: width, rowSpan: 4,
            content: (
              <StudyWidget title="Governance" state={contact.governance}>
                <StatRowContent counters={gov.slice(0, 3)} checked={gov[3]} />
              </StudyWidget>
            ),
          }
        }
        case "risk": {
          if (contact.risk === "empty") return null
          const risk = getRisk(contact)
          return {
            ...chrome,
            uid: "risk", title: "Risk",
            colSpan: entry.span, widthClass: width, rowSpan: 4,
            content: (
              <StudyWidget title="Risk" state={contact.risk}>
                {/* Score, flags and trend are the counters; the scan date is
                    the date. getRisk returns them in that order. */}
                <StatRowContent counters={risk.slice(0, 3)} checked={risk[3]} />
              </StudyWidget>
            ),
          }
        }
        case "connections":
          if (contact.connections === "empty") return null
          return {
            ...chrome,
            uid: "connections", title: "Connections",
            colSpan: entry.span, widthClass: width, rowSpan: 4,
            content: (
              <StudyWidget title="Connections" state={contact.connections}>
                <ConnectionsContent contact={contact} />
              </StudyWidget>
            ),
          }
        case "activity":
          return {
            ...chrome,
            uid: "recent-activity", title: "Recent activity",
            colSpan: entry.span, widthClass: width, rowSpan: 5,
            content: (
              <LastActivityContent
                contact={contact}
                onViewAll={() => { setTab("activity"); setActPage(1) }}
              />
            ),
          }
      }
    }

    return spec.canvas.map(build).filter((slot): slot is CanvasSlot => slot !== null)
  }, [contact, spec])


  return (
    <ScreenLayout
      workspaceName="Acme Corp"
      userName="Thomas González"
      userEmail="thomas.gonzalez@aimsos.ai"
      sidebarItems={UCP_SIDEBAR_ITEMS}
      activeSidebarId="contacts"
      onSidebarItemClick={onSidebarItemClick}
      /*
        THE CONCIERGE DIVIDES THE PAGE — Michael, 2026-09-11: it should be the
        height of the whole page, not of whatever content happens to be under
        the header, the way Gmail runs its Gemini panel.

        It lived in `children` before, which put it inside the scroll container
        and below the header zone — so it started where the content started and
        scrolled with it. ScreenLayout's `sidePanel` slot renders it beside the
        main column instead, and everything else on the page yields its width.
      */
      sidePanel={
        <ConciergeChat contact={contact} open={chatOpen} onClose={() => setChatOpen(false)} />
      }
      header={isScrolled => (
        <>
          <Header
            size={isScrolled ? "compress" : "size-m"}
            title="Contacts"
            backButton
            showBackInCompress
            onBack={() => onBack?.()}
          />
          {/* THE PINNED ZONE CARRIES THE PAGE BAR AND NOTHING ELSE.

              A duplicate EntityHeader — with the Export action and the Next
              Best Action card still on it — survived here through a rebase:
              main had moved the card into the scroll container the same day
              this branch was editing it in place, and the replay kept both
              copies. Two identity cards rendered, and the stale one crashed
              on a `nba` binding that no longer exists.

              The live one is below, in the content, where Michael put it —
              it sticks itself with `compressOnScroll`, so pinning it here
              would spend header height on something that already knows how
              to hold its own position. */}
        </>
      )}
      pagination={
        tab === "activity" && !loading && !restriction && activityCount > actSize
          ? (
              <Pagination
                currentPage={actPage}
                totalItems={activityCount}
                itemsPerPage={actSize}
                onPageChange={setActPage}
                onItemsPerPageChange={n => { setActSize(n); setActPage(1) }}
                rowsPerPageOptions={[8, 25, 50]}
              />
            )
          : undefined
      }
    >
      {/* THE HEADER LIVES IN THE CONTENT, NOT IN THE PINNED ZONE
          (Michael, 2026-09-10). It used to sit in ScreenLayout's header
          zone together with the Next Best Action and the Tabs — four
          things holding the top of the screen, none of which gave any
          height back on the way down.

          Now only the page bar is pinned, exactly as the Universal
          Profile does it, and the EntityHeader sticks itself: it is
          inside the scroll container, so `compressOnScroll` gives it
          both halves — it stays at the top AND it compresses. The NBA
          and the Tabs scroll away with the content, which is what they
          should do: a proposal and a nav bar are not worth permanent
          screen height on a record you are reading. */}
      <EntityHeader
        /* Sticks itself to the top of the scroll container and compresses
           on the way down: the metadata row and the description drop, the
           visual goes L to M, and scrolling back up restores all three.
           One prop, because a card that compresses without sticking would
           just scroll out of view. */
        compressOnScroll
        name={contact.name}
        /*
          AVATAR OR ICON, decided by the type — not hardcoded.
          A face or a brand gets an avatar: customers, employees,
          companies. Everything else gets an icon, and a record titled
          with a code has no choice: "RO-48291" has no initials, so an
          avatar there renders nonsense. That is the Entity Header's own
          rule, and it only became visible once the roster had types that
          are not people in it (2026-09-09).

          The avatar types are also the ones that carry a classification
          tag, because an avatar cannot say what kind of thing this is
          and a highlight icon already does.
        */
        visual={AVATAR_TYPES.includes(contact.type)
          ? { kind: "avatar" }
          : { kind: "icon", icon: (LucideIcons[TYPE_ICON[contact.type] as keyof typeof LucideIcons] ?? LucideIcons.CircleDot) as LucideIcon, variant: "informative" }}
        tags={headerTags}
        stateBadge={{ label: state.label, variant: state.variant }}
        source={contact.source.label}
        secondaryMetadata={secondaryMetadata}
        recordFields={recordFields}
        showInformation
        onInformationOpen={openInfo}
        assignedAgent={{
          id: contact.agent.id,
          name: contact.agent.name,
          onOpenChat: openChat,
        }}
        locked={restriction !== null}
        /* The record is fetched, so there is a first paint where it does
           not exist yet, and the component's own skeleton is what belongs
           there — never an empty header, never withholding the card. */
        state={loading ? "loading" : "default"}
        /* NO secondaryAction. "Export record" was here and Michael took it out
           (2026-09-10): it does not apply to this record type. The slot is off
           by default for exactly this reason — most records have no second
           action, and the header is better with an empty slot than with a
           button nobody asked for. `Ask` remains the one CTA. */
        /* Destructive and secondary only — Archive is never one click away. */
        menuActions={[{ label: "Archive", onClick: () => {} }]}
      />
      {/* NO Next Best Action card. It sat here, below the header and in its own
          container, which is where the DS says a recommendation goes. Michael
          took it out on 2026-09-10 — it does not apply to this flow yet.

          The DATA stays: `contact.nba` still feeds the roster row's own AI
          insight block, so removing the card here does not remove the
          recommendation from the prototype, only from this surface. When it
          comes back it is `NextBestActionCard` again, in its own container,
          never inside the header. */}
      {/* 24px from the last nav layer to the content, per the DS. */}
      <div className="mt-[16px] mb-[24px]">
        <Tabs
          activeId={tab}
          onChange={goTab}
          // Published by the type, not by this screen. A Company brings a
          // People tab; a Customer and an Employee bring none, and render
          // perfectly well without one.
          items={tabsForContact(contact)}
        />
      </div>

      {/* The body follows the header's state. Three mutually exclusive cases,
          in the order the header resolves them: in flight, governed, readable. */}
      {loading ? (
        <LoadingBody />
      ) : restriction ? (
        <RestrictedBody name={contact.name} scope={restriction.scope} />
      ) : (
        <>
          {tab === "overview" && <WidgetCanvasView initialSlots={overviewSlots} />}
          {tab === "people"   && <PeopleTab company={contact} onOpen={onOpenRecord} />}
          {tab === "intelligence" && <IntelligenceTab contact={contact} onGoTab={goTab} onAsk={openChat} />}
          {tab === "activity" && (
            <ActivityTab
              contact={contact}
              group={actGroup}
              onGroupChange={g => { setActGroup(g); setActPage(1) }}
              kind={actKind}
              onKindChange={k => { setActKind(k); setActPage(1) }}
              search={actSearch}
              // Any filter change resets to page 1 — the DS rule, and a search
              // that leaves you on page 3 of 1 looks like an empty tab.
              onSearchChange={v => { setActSearch(v); setActPage(1) }}
              status={actStatus}
              onStatusChange={v => { setActStatus(v); setActPage(1) }}
              period={actPeriod}
              onPeriodChange={v => { setActPeriod(v); setActPage(1) }}
              now={now}
              page={actPage}
              pageSize={actSize}
              onPreview={(note, title) => setNotePeek({ note, title })}
              onPreviewThread={a => setThreadPeek(getThread(contact, a))}
            />
          )}
          {tab === "knowledge" && <KnowledgeTab contact={contact} onPreview={setDrivePeek} onPreviewFact={setFactPeek} />}
        </>
      )}


      {/* Information — where the fields in the header came from. Not the
          Overview and not the Knowledge tab: it explains what is on screen
          right now, nothing more. */}
      <SlideOut
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        type="with-variants"
        size="m"
        title="Field sources"
        subtitle={`Entity header · ${contact.name}`}
        showIcon
        iconContent={<FileSearch size={14} />}
        showStatus={false}
        showTopButton={false}
        showTabs={false}
        showSearchBar={false}
        showChips={false}
        showCta={false}
      >
        {/* Law 2 — every governed answer carries provenance reachable without
            leaving the record. This is what RecordHeader's onProvenanceOpen is
            for, and it now prints the real thing: the system each field came
            from, the model version it was shaped by, and when it last synced.
            A masked field keeps its whole row — label, system, version, sync —
            and withholds only the value. That is the point of masking: the
            viewer can see that the field exists and is governed, which is a
            different statement from the field not being there. */}
        <div className={PANEL_CONTENT_CLASS}>
          <span style={{ fontSize: 12, color: "var(--field-supporting)", lineHeight: 1.6 }}>
            {restriction
              ? `Every field on this record, and where it came from. ${restriction.note}`
              : "Every field on this record, and where it came from."}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--field-label)" }}>
            Fields
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {getRecordFields(contact).map((f, i) => (
              <div key={`${f.label}-${i}`} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--field-supporting)" }}>
                  {f.label}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: f.masked ? "var(--field-supporting)" : "var(--foreground)" }}>
                  {f.masked ? "•••• (restricted)" : f.value}
                </span>
                <span style={{ fontSize: 12, color: "var(--field-supporting)", lineHeight: 1.5 }}>
                  {f.system} · {f.modelVersion} · synced {f.syncedAgo}
                </span>
              </div>
            ))}
          </div>
        </div>
      </SlideOut>

      {/* Both previews are the same panel — see GovernancePreview. One
          component, because "the same information" across Sandbox, Truth
          Plane and Drives is a promise that a second implementation quietly
          breaks. The caller resolves a fact or a drive into the shape; the
          panel never branches on which it is holding. */}
      <GovernancePreview
        open={drivePeek !== null}
        onClose={() => setDrivePeek(null)}
        onGo={id => { setDrivePeek(null); goTab(id) }}
        data={drivePeek ? drivePreviewData(drivePeek, getFacts(contact).filter(f => f.plane === "sources").length, contact) : null}
      />

      <GovernancePreview
        open={factPeek !== null}
        onClose={() => setFactPeek(null)}
        onGo={id => { setFactPeek(null); goTab(id) }}
        data={factPeek ? factPreviewData(factPeek, contact) : null}
      />

      <CommsPreview
        thread={threadPeek}
        contact={contact}
        open={threadPeek !== null}
        onClose={() => setThreadPeek(null)}
        onGo={id => { setThreadPeek(null); goTab(id) }}
      />

      <NotePreview
        note={notePeek?.note ?? null}
        title={notePeek?.title ?? ""}
        agentName={contact.agent.name}
        comments={notePeek ? [...notePeek.note.comments, ...(noteComments[notePeek.title] ?? [])] : []}
        onComment={text => {
          if (!notePeek) return
          const key = notePeek.title
          setNoteComments(prev => ({
            ...prev,
            [key]: [...(prev[key] ?? []), {
              author: "Michael Orellana",
              role:   "Product Design",
              at:     "Just now",
              text,
            }],
          }))
        }}
        open={notePeek !== null}
        onClose={() => setNotePeek(null)}
      />

    </ScreenLayout>
  )
}

// No default export on purpose: the profile is not its own prototype card. It
// is reached by opening a row in the Contacts roster, which is the real flow —
// one card, one entry point.
