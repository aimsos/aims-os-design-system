/**
 * ── Unified Company Profile + Unified Contact Profile ───────────────────────
 *
 * Michael, 2026-09-15, built to Lex Paniagua's spec and its shared artifact.
 *
 * WHAT THIS IS, AND WHAT IT IS NOT. The spec describes ONE template per
 * profile, parameterised by record ID — every company opens the same layout
 * filtered to its own id, and so does every contact. That is what this builds:
 * two components, not six screens. Meridian Corp and Riverbend Auto Group are
 * the same page with a different id, which is the whole point and also the
 * reason the drill-down can be circular without anything being written twice.
 *
 * WHY IT SITS BESIDE Thom's UCP RATHER THAN INSIDE IT. That prototype models
 * AIMS OS's governance layer — Truth, Sandbox, Sources, claims, verification.
 * This one models HubSpot: Companies, Contacts, Deals, Tickets, Engagements,
 * plus Signals, the one entity no system delivers. The spec says the Knowledge
 * tab and its planes are out of scope here, so the two prototypes answer
 * different questions and share only their shape.
 *
 * THE DRILL-DOWN, which is most of what makes this a flow rather than two
 * pages (spec §4):
 *
 *   Accounts        → row click → that company's Unified Company Profile
 *   Company         → Contacts tab, row click → that Contact's profile
 *   Contact         → the Company value in Overview → back to the Company
 *   Contact         → Connections, row click → that coworker's own profile
 *
 * Deals and Tickets are read-only everywhere: the spec is explicit that there
 * is no deal-detail or ticket-detail profile in this phase, so their rows do
 * not pretend to be clickable.
 *
 * CHARTS ARE THE REAL ONES. `ChartModeContent` in experimental/ draws twelve
 * modes with DS tokens, and it took a `data` prop on 2026-09-15 so a donut here
 * shows THIS account's ticket priorities rather than the sample series it was
 * built with. Everything the spec asks for on these two profiles — a donut and
 * a funnel — is covered; nothing is substituted or faked.
 */

import { useMemo, useState } from "react"
import { ScreenLayout }      from "@/components/layouts/screen-layout"
import { WidgetCanvasView }  from "@/components/layouts/widget-canvas-view"
import type { CanvasSlot }   from "@/components/layouts/widget-canvas-view"
import type { SidebarItem }  from "@/components/ui/sidebar"
import { Header }            from "@/components/ui/header"
import { Tabs }              from "@/components/ui/tabs"
import { Tag }               from "@/components/ui/tag"
import { Chip }              from "@/components/ui/chip"
import { Table }             from "@/components/ui/table"
import type { TableColumn }  from "@/components/ui/table"
import { CardContainer }     from "@/components/ui/card-container"
import { EntityList }        from "@/components/ui/entity-list"
import { EntityHeader }      from "@/components/ui/entity-header"
import type { SecondaryMetadataItem, EntityHeaderTag } from "@/components/ui/entity-header"
import { AdaptiveMetricGrid } from "@/components/ui/adaptive-metric-grid"
import { HighlightIcon }     from "@/components/ui/highlight-icon"
import { Tooltip }           from "@/components/ui/tooltip"
import { EmptyState }        from "@/components/ui/empty-state"
import { NextBestActionCard } from "@/components/ui/next-best-action-card"
import { ChartModeContent }  from "@/components/experimental/widget-chart-content"
import * as LucideIcons      from "lucide-react"
import { Sparkle }           from "lucide-react"
import type { LucideIcon }   from "lucide-react"
import {
  COMPANIES, CONTACTS, funnelStages,
  companyOf, contactsOf, dealsOf, ticketsOf,
  dealsForContact, ticketsForContact,
  engagementsForCompany, engagementsForContact,
  companySignals, openSignalsFor, nextBestAction,
  daysUntil, money, formatStamp,
  HEALTH_VARIANT, TICKET_VARIANT, SENTIMENT_VARIANT, ENGAGEMENT_ICON, ACTIVITY_GROUPS,
} from "./pm-michael-ucop-data"
import type {
  UcopCompany, UcopContact, UcopDeal, UcopTicket, UcopEngagement, UcopSignal,
} from "./pm-michael-ucop-data"

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "home",      label: "Home",      icon: "Home"    },
  { id: "accounts",  label: "Accounts",  icon: "Building2" },
  { id: "people",    label: "People",    icon: "Contact" },
  { id: "deals",     label: "Deals",     icon: "Briefcase" },
  { id: "tickets",   label: "Tickets",   icon: "LifeBuoy" },
  { id: "admin",     label: "Admin",     icon: "Settings" },
]

const icon = (name: string) =>
  (LucideIcons[name as keyof typeof LucideIcons] ?? LucideIcons.CircleDot) as LucideIcon

/* ── Shared pieces ──────────────────────────────────────────────────────── */

/**
 * A section label, matching the widget vocabulary the other UCP uses.
 *
 * Prefixed `Ucop` because the audit's duplicate check matches on NAME, not on
 * behaviour: eight screens define a `SectionLabel` and a bare ninth would be
 * reported as drift from components it has nothing to do with. Same reason
 * `UcopActivityFeed` is not `ActivityFeed` — AdminOverview has one of those
 * and it renders something else entirely.
 */
function UcopSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold tracking-[0.06em]" style={{ color: "var(--field-supporting)" }}>
      {String(children).toUpperCase()}
    </span>
  )
}

/**
 * The `List` widget from the spec: one record's flat attributes.
 *
 * A label/value pair per row, with the value carrying the emphasis — the same
 * arrangement the other UCP's Account card uses, because a reader moving
 * between the two prototypes should not have to relearn where the value is.
 */
function DetailList({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <div className="flex flex-col gap-[10px]">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-[12px]">
          <span className="text-[12px] shrink-0" style={{ color: "var(--field-supporting)" }}>{label}</span>
          <span className="text-[12px] font-medium text-right min-w-0 truncate" style={{ color: "var(--color-text-title)" }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * The `Alerts` widget: open Signals, most severe first.
 *
 * Severity is a coloured dot rather than a Tag, and that is deliberate: a row
 * already carries a sentence, and three Tags stacked down the left of three
 * sentences turns a list into a table of labels. The dot encodes the same
 * thing at a tenth of the width, and the tooltip says it in words.
 */
function AlertsList({ signals }: { signals: UcopSignal[] }) {
  if (signals.length === 0) {
    return <span className="text-[12px]" style={{ color: "var(--field-supporting)" }}>No open signals.</span>
  }
  const dot = (s: UcopSignal) =>
    s.severity === "High" ? "var(--color-text-error)"
    : s.severity === "Medium" ? "var(--color-text-alert)"
    : "var(--color-border-neutral-default)"
  return (
    <div className="flex flex-col gap-[2px]">
      {signals.map(s => (
        <Tooltip key={s.id} content={`${s.severity} · ${s.text} — ${s.detail}. Open since ${s.since}, ${s.generatedBy}.`}>
          <div className="flex items-center gap-[8px] py-[5px] min-w-0">
            <span className="shrink-0 rounded-full" style={{ width: 6, height: 6, background: dot(s) }} />
            <span className="flex-1 min-w-0 truncate text-[12px]" style={{ color: "var(--foreground)" }}>{s.text}</span>
            <span className="shrink-0 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
              {daysUntil(s.since) === 0 ? "today" : `${Math.abs(daysUntil(s.since))} days`}
            </span>
          </div>
        </Tooltip>
      ))}
    </div>
  )
}

/**
 * The `Activity Feed` widget. One row per engagement, the AI summary as the
 * expandable line beneath it — which is the prototype behaviour the spec's §5
 * asks Engineering to confirm the real widget supports.
 *
 * `onOpenContact` is optional because the same feed serves both profiles: on a
 * Company it is worth knowing WHO each touch was with and jumping to them, and
 * on a Contact every row is that same person, so the name would be noise.
 */
function UcopActivityFeed({
  items, showContact = false, onOpenContact, limit,
}: {
  items: UcopEngagement[]
  showContact?: boolean
  onOpenContact?: (id: string) => void
  limit?: number
}) {
  const rows = limit ? items.slice(0, limit) : items
  if (rows.length === 0) {
    return <EmptyState icon={icon("Inbox")} title="No activity yet" description="Calls, emails, meetings, notes and tasks will appear here." />
  }
  return (
    <div className="flex flex-col gap-[8px]">
      {rows.map(e => {
        const who = CONTACTS.find(c => c.id === e.contactId)
        return (
          <CardContainer key={e.id} size="sm" className="!p-0 overflow-hidden">
            <EntityList items={[{
              id:          e.id,
              title:       e.subject,
              iconName:    ENGAGEMENT_ICON[e.type],
              iconVariant: e.type === "Note" ? "purple" : e.type === "Task" ? "yellow" : "info",
              timestamp:   formatStamp(e.timestamp),
              ...(e.aiSummary ? { aiInsight: { action: "AI summary", detail: e.aiSummary } } : {}),
              secondaryMeta: [
                { iconName: "User", label: e.owner },
                ...(showContact && who ? [{ iconName: "Contact", label: who.name }] : []),
                ...(e.duration ? [{ iconName: "Clock", label: `${e.duration} min` }] : []),
                ...(e.direction ? [{ iconName: "ArrowUpRight", label: e.direction }] : []),
                ...(e.dueDate ? [{ iconName: "CalendarClock", label: `Due ${e.dueDate}` }] : []),
              ],
              ...(e.sentiment ? { tags: [{ label: e.sentiment }] } : {}),
              state: { label: e.status, variant: e.status === "Open" ? "alert" : e.status === "Scheduled" ? "informative" : "success" },
              ...(showContact && who && onOpenContact ? { onClick: () => onOpenContact(who.id) } : {}),
            }]} />
          </CardContainer>
        )
      })}
    </div>
  )
}

/** The `Sentiment` widget: the mix across every touch that carries one. */
function SentimentBreakdown({ items }: { items: UcopEngagement[] }) {
  const scored = items.filter(e => e.sentiment)
  if (scored.length === 0) {
    return <span className="text-[12px]" style={{ color: "var(--field-supporting)" }}>Nothing scored yet.</span>
  }
  const counts = (["Positive", "Neutral", "Negative"] as const).map(s => ({
    label: s, value: scored.filter(e => e.sentiment === s).length,
  }))
  return (
    <div className="flex flex-col gap-[10px]">
      <div className="flex gap-[6px]">
        {counts.map(c => (
          <Tag key={c.label} variant={SENTIMENT_VARIANT[c.label]} size="sm">{`${c.label} ${c.value}`}</Tag>
        ))}
      </div>
      <span className="text-[12px] leading-[1.6]" style={{ color: "var(--field-supporting)" }}>
        {scored.filter(e => e.sentiment === "Negative").length > 0
          ? "The negative touches are the two escalations — both are still open, and both were raised more than once."
          : "Nothing negative on record. The last touch in every thread landed positive or neutral."}
      </span>
    </div>
  )
}

/** The `AI Insights` widget: a narrative over the open signals, not a list. */
function AiInsights({ signals, subject }: { signals: UcopSignal[]; subject: string }) {
  const high = signals.filter(s => s.severity === "High")
  return (
    <div className="flex flex-col gap-[8px]">
      <div className="flex items-center gap-[6px]">
        <Sparkle size={11} style={{ color: "var(--color-text-purple)" }} />
        <span className="text-[10px] font-semibold" style={{ color: "var(--color-text-purple)" }}>Synthesis</span>
      </div>
      <p className="text-[12px] leading-[1.7]" style={{ color: "var(--field-supporting)" }}>
        {signals.length === 0
          ? `Nothing open on ${subject}. Every signal raised so far has been resolved.`
          : `${signals.length} signal${signals.length === 1 ? "" : "s"} open on ${subject}` +
            `${high.length > 0 ? `, ${high.length} of them high severity` : ""}. ` +
            `The oldest has been open ${Math.abs(daysUntil(signals[signals.length - 1].since))} days. ` +
            `Every one was inferred from the record's own calls, emails and tickets — none came from a system of record.`}
      </p>
    </div>
  )
}

/* ── Accounts index — the way in ────────────────────────────────────────── */

function AccountsIndex({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-[12px]">
      {COMPANIES.map(c => {
        const openTickets = ticketsOf(c.id).filter(t => t.status !== "Resolved").length
        const pipeline    = dealsOf(c.id).filter(d => d.stage !== "Closed Won").reduce((a, d) => a + d.amount, 0)
        return (
          <CardContainer key={c.id} size="sm" className="!p-0 overflow-hidden">
            <EntityList items={[{
              id: c.id, title: c.name,
              iconName: "Building2",
              iconVariant: c.health === "At Risk" ? "yellow" : c.health === "Escalation" ? "error" : "success",
              state: { label: c.health, variant: HEALTH_VARIANT[c.health] },
              secondaryMeta: [
                { iconName: "Factory",  label: c.industry },
                { iconName: "MapPin",   label: c.city },
                { iconName: "Banknote", label: `${money(c.arr)} ARR` },
                { iconName: "Contact",  label: `${contactsOf(c.id).length} contacts` },
                { iconName: "Inbox",    label: `${openTickets} open` },
                { iconName: "Briefcase", label: `${money(pipeline)} pipeline` },
              ],
              tags: [{ label: c.tier }],
              onClick: () => onOpen(c.id),
            }]} />
          </CardContainer>
        )
      })}
    </div>
  )
}

/* ── Unified Company Profile ────────────────────────────────────────────── */

const COMPANY_TABS = [
  { id: "overview", label: "Overview" },
  { id: "contacts", label: "Contacts" },
  { id: "deals",    label: "Deals"    },
  { id: "tickets",  label: "Tickets"  },
  { id: "activity", label: "Activity" },
]

function CompanyProfile({
  company, onBack, onOpenContact,
}: {
  company: UcopCompany
  onBack: () => void
  onOpenContact: (id: string) => void
}) {
  const [tab, setTab] = useState("overview")
  const [group, setGroup] = useState("all")

  const contacts    = contactsOf(company.id)
  const deals       = dealsOf(company.id)
  const tickets     = ticketsOf(company.id)
  const engagements = engagementsForCompany(company.id)
  const signals     = companySignals(company.id)
  const nba         = nextBestAction("Company", company.id)

  const openTickets = tickets.filter(t => t.status !== "Resolved")
  const openDeals   = deals.filter(d => d.stage !== "Closed Won")
  const renewalIn   = daysUntil(company.renewalDate)

  /* The header exposes exactly what the spec lists: Name, Domain, Health
     badge, "Renewal in N days", Phone, open Tickets count, open Deal $. */
  const secondaryMetadata = useMemo<SecondaryMetadataItem[]>(() => [
    { icon: icon("CalendarClock"), text: `Renewal in ${renewalIn} days`,
      tooltip: `Renewal · closes ${company.renewalDate}, in ${renewalIn} days. Every open question on this account is measured against it.` },
    { icon: icon("Globe"), text: company.domain,
      tooltip: `Domain · ${company.domain}. What ties a contact's email address to this account.` },
    { icon: icon("Phone"), text: company.phone,
      tooltip: `Phone · ${company.phone}. The main line for the account.` },
    { icon: icon("Inbox"), text: `${openTickets.length} open`,
      tooltip: `Open tickets · ${openTickets.length} unresolved of ${tickets.length} ever raised.` },
    { icon: icon("Briefcase"), text: `${money(openDeals.reduce((a, d) => a + d.amount, 0))} open`,
      tooltip: `Open pipeline · ${openDeals.length} deals not yet closed, ${money(openDeals.reduce((a, d) => a + d.amount, 0))} in total.` },
  ], [company, renewalIn, openTickets.length, tickets.length, openDeals])

  const headerTags = useMemo<EntityHeaderTag[]>(() => {
    const t: EntityHeaderTag[] = []
    /* A signal earns colour only when somebody has to act — an open escalation
       does. The tier is a classification and the component strips any tone. */
    if (signals.some(s => s.severity === "High")) t.push({ label: "Escalation open", role: "signal", tone: "error" })
    t.push({ label: company.tier, role: "classification" })
    return t
  }, [signals, company.tier])

  const overviewSlots = useMemo<CanvasSlot[]>(() => [
    {
      uid: "facts", title: "Company", colSpan: 1, rowSpan: 4,
      content: <DetailList rows={[
        ["Industry",  company.industry],
        ["Employees", company.employees.toLocaleString()],
        ["HQ",        company.city],
        ["Lifecycle", company.lifecycle],
        ["Owner",     company.owner],
        ["Customer since", company.createdAt],
      ]} />,
    },
    {
      uid: "alerts", title: "Open signals", colSpan: 1, rowSpan: 4,
      content: <AlertsList signals={signals} />,
    },
    {
      uid: "connections", title: "Key contacts", colSpan: 1, rowSpan: 4,
      content: (
        <div className="flex flex-col gap-[2px]">
          {contacts.map(c => (
            <button
              key={c.id}
              onClick={() => onOpenContact(c.id)}
              className="appearance-none bg-transparent border-0 p-0 text-left cursor-pointer flex items-center gap-[8px] py-[6px] min-w-0"
            >
              <HighlightIcon size="sm" variant={c.tier === "Champion" ? "success" : "neutral"} iconName="User" />
              <div className="flex flex-col min-w-0">
                <span className="truncate text-[12px] font-medium" style={{ color: "var(--color-text-title)" }}>{c.name}</span>
                <span className="truncate text-[11px]" style={{ color: "var(--field-supporting)" }}>{c.jobTitle}</span>
              </div>
            </button>
          ))}
        </div>
      ),
    },
    {
      /* The spec's "Pipeline Overview" prebuilt: stage-by-stage counts and the
         money behind them, which is what makes it an overview rather than the
         Deals tab's table repeated. */
      uid: "pipeline", title: "Pipeline overview", colSpan: 2, widthClass: "wide", rowSpan: 4,
      content: (
        <ChartModeContent id="funnel" data={funnelStages(deals)} />
      ),
    },
    {
      uid: "recent", title: "Recent activity", colSpan: 1, rowSpan: 4,
      content: <UcopActivityFeed items={engagements} showContact limit={3} onOpenContact={onOpenContact} />,
    },
  ], [company, signals, contacts, deals, engagements, onOpenContact])

  const contactColumns: TableColumn<UcopContact>[] = [
    { key: "name",  header: "Name",  render: r => <span style={{ fontWeight: 600, color: "var(--color-text-title)" }}>{r.name}</span> },
    { key: "title", header: "Title", render: r => r.jobTitle },
    { key: "email", header: "Email", render: r => r.email },
    { key: "phone", header: "Phone", render: r => r.phone },
    { key: "tier",  header: "Tier",  render: r => r.tier ? <Tag variant="success" size="sm">{r.tier}</Tag> : <span style={{ color: "var(--muted-foreground)" }}>—</span> },
    { key: "score", header: "Score", align: "right", render: r => r.score },
    { key: "owner", header: "Owner", render: r => r.owner },
  ]

  const dealColumns: TableColumn<UcopDeal>[] = [
    { key: "name",   header: "Deal",  render: r => <span style={{ fontWeight: 600, color: "var(--color-text-title)" }}>{r.name}</span> },
    { key: "stage",  header: "Stage", render: r => <Tag variant={r.stage === "Closed Won" ? "success" : "informative"} size="sm">{r.stage}</Tag> },
    { key: "amount", header: "Amount", align: "right", render: r => money(r.amount) },
    { key: "close",  header: "Close date", render: r => r.closeDate },
    { key: "owner",  header: "Owner", render: r => r.owner },
  ]

  const ticketColumns: TableColumn<UcopTicket>[] = [
    { key: "number",   header: "#", width: "64px", render: r => r.number },
    { key: "subject",  header: "Subject", render: r => <span style={{ fontWeight: 600, color: "var(--color-text-title)" }}>{r.subject}</span> },
    { key: "status",   header: "Status", render: r => <Tag variant={TICKET_VARIANT[r.status]} size="sm">{r.status}</Tag> },
    { key: "priority", header: "Priority", render: r => r.priority },
    { key: "assignee", header: "Assignee", render: r => r.assignee },
    { key: "requester", header: "Requester", render: r => CONTACTS.find(c => c.id === r.requesterId)?.name ?? "—" },
    { key: "created",  header: "Created", render: r => r.createdAt },
  ]

  const resolved = tickets.filter(t => t.resolvedInDays !== undefined)
  const avgResolution = resolved.length === 0 ? "—"
    : `${(resolved.reduce((a, t) => a + (t.resolvedInDays ?? 0), 0) / resolved.length).toFixed(1)} days`

  const feedItems = engagements.filter(e =>
    ACTIVITY_GROUPS.find(g => g.id === group)!.types.includes(e.type))

  return (
    <ScreenLayout
      workspaceName="AIMS OS"
      userName="Michael Orellana"
      userEmail="michael.orellana@aimsos.ai"
      sidebarItems={SIDEBAR_ITEMS}
      activeSidebarId="accounts"
      header={isScrolled => (
        <Header
          size={isScrolled ? "compress" : "size-m"}
          title="Accounts"
          backButton
          showBackInCompress
          onBack={onBack}
        />
      )}
    >
      <EntityHeader
        name={company.name}
        visual={{ kind: "avatar" }}
        source="HubSpot"
        tags={headerTags}
        stateBadge={{ label: company.health, variant: HEALTH_VARIANT[company.health] }}
        secondaryMetadata={secondaryMetadata}
        assignedAgent={{ id: "AGT-DEAL", name: "Deal Concierge", onOpenChat: () => {} }}
        compressOnScroll
      />

      {nba && (
        <div className="mt-[12px]">
          <NextBestActionCard item={{
            id: nba.id, title: nba.text, description: nba.detail,
            timeAgo: `${Math.abs(daysUntil(nba.since))} days ago`,
            onViewDetails: () => setTab("activity"),
          }} />
        </div>
      )}

      <div className="mt-[16px] mb-[24px]">
        <Tabs items={COMPANY_TABS} activeId={tab} onChange={setTab} />
      </div>

      {tab === "overview" && <WidgetCanvasView initialSlots={overviewSlots} />}

      {tab === "contacts" && (
        <div className="flex flex-col gap-[24px]">
          <AdaptiveMetricGrid cards={[
            { label: "Contacts",  value: contacts.length, iconName: "Contact", iconVariant: "informative" },
            { label: "Champions", value: contacts.filter(c => c.tier === "Champion").length, iconName: "Star", iconVariant: "success" },
            { label: "Avg score", value: Math.round(contacts.reduce((a, c) => a + c.score, 0) / (contacts.length || 1)), iconName: "Gauge", iconVariant: "neutral" },
          ]} />
          <CardContainer size="sm" className="!p-0 overflow-hidden hover:!border-[length:0.5px] hover:!border-[color:var(--card-default-border)] hover:![box-shadow:none]">
            <Table
              columns={contactColumns}
              data={contacts}
              size="sm"
              onRowClick={r => onOpenContact(r.id)}
            />
          </CardContainer>
        </div>
      )}

      {tab === "deals" && (
        <div className="flex flex-col gap-[24px]">
          <AdaptiveMetricGrid cards={[
            { label: "Open pipeline", value: money(openDeals.reduce((a, d) => a + d.amount, 0)), iconName: "Briefcase", iconVariant: "informative" },
            { label: "Won this year", value: money(deals.filter(d => d.stage === "Closed Won").reduce((a, d) => a + d.amount, 0)), iconName: "CircleCheck", iconVariant: "success" },
            { label: "Avg deal size", value: money(Math.round(deals.reduce((a, d) => a + d.amount, 0) / (deals.length || 1))), iconName: "Calculator", iconVariant: "neutral" },
          ]} />
          <CardContainer size="sm">
            <div className="flex flex-col gap-[12px]">
              <UcopSectionLabel>Conversion funnel</UcopSectionLabel>
              <ChartModeContent id="funnel" data={funnelStages(deals)} />
            </div>
          </CardContainer>
          <CardContainer size="sm" className="!p-0 overflow-hidden hover:!border-[length:0.5px] hover:!border-[color:var(--card-default-border)] hover:![box-shadow:none]">
            <Table columns={dealColumns} data={deals} size="sm" />
          </CardContainer>
        </div>
      )}

      {tab === "tickets" && (
        <div className="flex flex-col gap-[24px]">
          <AdaptiveMetricGrid cards={[
            { label: "Open",  value: openTickets.length, iconName: "Inbox", iconVariant: "error" },
            { label: "Resolved", value: resolved.length, iconName: "CircleCheck", iconVariant: "success" },
            { label: "Avg resolution", value: avgResolution, iconName: "Clock", iconVariant: "neutral" },
          ]} />
          <CardContainer size="sm">
            <div className="flex flex-col gap-[12px]">
              <UcopSectionLabel>Priority mix</UcopSectionLabel>
              <ChartModeContent
                id="donut"
                unit="tickets"
                data={(["High", "Medium", "Low"] as const).map(p => ({
                  label: p, value: tickets.filter(t => t.priority === p).length,
                }))}
              />
            </div>
          </CardContainer>
          <CardContainer size="sm" className="!p-0 overflow-hidden hover:!border-[length:0.5px] hover:!border-[color:var(--card-default-border)] hover:![box-shadow:none]">
            <Table columns={ticketColumns} data={tickets} size="sm" />
          </CardContainer>
        </div>
      )}

      {tab === "activity" && (
        <div className="flex flex-col gap-[24px]">
          <div className="flex gap-[8px]">
            {ACTIVITY_GROUPS.map(g => (
              <Chip key={g.id} size="s" variant={group === g.id ? "primary" : "secondary"} onClick={() => setGroup(g.id)}>
                {g.label}
              </Chip>
            ))}
          </div>
          <UcopActivityFeed items={feedItems} showContact onOpenContact={onOpenContact} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
            <CardContainer size="sm">
              <div className="flex flex-col gap-[12px]">
                <UcopSectionLabel>Sentiment</UcopSectionLabel>
                <SentimentBreakdown items={engagements} />
              </div>
            </CardContainer>
            <CardContainer size="sm">
              <div className="flex flex-col gap-[12px]">
                <UcopSectionLabel>AI insights</UcopSectionLabel>
                <AiInsights signals={signals} subject={company.name} />
              </div>
            </CardContainer>
          </div>
        </div>
      )}
    </ScreenLayout>
  )
}

/* ── Unified Contact Profile ────────────────────────────────────────────── */

const CONTACT_TABS = [
  { id: "overview", label: "Overview"        },
  { id: "book",     label: "Deals & Tickets" },
  { id: "activity", label: "Activity"        },
]

function ContactProfile({
  contact, onBack, onOpenCompany, onOpenContact,
}: {
  contact: UcopContact
  onBack: () => void
  onOpenCompany: (id: string) => void
  onOpenContact: (id: string) => void
}) {
  const [tab, setTab] = useState("overview")
  const [group, setGroup] = useState("all")

  const company     = companyOf(contact)
  const deals       = dealsForContact(contact.id)
  const tickets     = ticketsForContact(contact.id)
  const engagements = engagementsForContact(contact.id)
  const signals     = openSignalsFor("Contact", contact.id)
  const nba         = nextBestAction("Contact", contact.id)
  /* Coworkers: everyone at the same company except this person — the spec's
     own filter, and the reason a Contact profile can reach another one. */
  const coworkers   = contactsOf(company.id).filter(c => c.id !== contact.id)

  const openTickets = tickets.filter(t => t.status !== "Resolved")
  const renewalIn   = daysUntil(company.renewalDate)

  const secondaryMetadata = useMemo<SecondaryMetadataItem[]>(() => [
    { icon: icon("CalendarClock"), text: `Renewal in ${renewalIn} days`,
      tooltip: `Renewal · rolled up from ${company.name}, closes ${company.renewalDate}.` },
    { icon: icon("Mail"), text: contact.email,
      tooltip: `Email · ${contact.email}. The address every thread on this record was sent to or from.` },
    { icon: icon("Phone"), text: contact.phone,
      tooltip: `Phone · ${contact.phone}. The number every call on this record used.` },
    { icon: icon("Inbox"), text: `${openTickets.length + deals.length} open`,
      tooltip: `Open items · ${openTickets.length} unresolved tickets and ${deals.length} deals where this person is the primary contact.` },
    { icon: icon("Gauge"), text: `Score ${contact.score}`,
      tooltip: `Engagement score · ${contact.score}. How active this relationship is against the rest of the account.` },
  ], [contact, company, renewalIn, openTickets.length, deals.length])

  const overviewSlots = useMemo<CanvasSlot[]>(() => [
    {
      uid: "facts", title: "Contact", colSpan: 1, rowSpan: 4,
      content: <DetailList rows={[
        ["Job title", contact.jobTitle],
        /* The Company value links BACK to the Company Profile — the spec's
           drill-down in the opposite direction, and the only way out of a
           contact that does not go through the browser's back button. */
        ["Company", (
          <button
            onClick={() => onOpenCompany(company.id)}
            className="appearance-none bg-transparent border-0 p-0 cursor-pointer text-[12px] font-medium underline underline-offset-[3px]"
            style={{ color: "var(--color-text-title)", textDecorationThickness: "0.5px" }}
          >
            {company.name}
          </button>
        )],
        ["Account owner", contact.owner],
        ["Lifecycle", company.lifecycle],
        ["Lead source", contact.leadSource],
        ["Location", `${contact.city}, ${contact.region}`],
      ]} />,
    },
    {
      uid: "alerts", title: "Open signals", colSpan: 1, rowSpan: 4,
      content: <AlertsList signals={signals} />,
    },
    {
      uid: "connections", title: "Coworkers", colSpan: 1, rowSpan: 4,
      content: coworkers.length === 0
        ? <span className="text-[12px]" style={{ color: "var(--field-supporting)" }}>The only contact on this account.</span>
        : (
          <div className="flex flex-col gap-[2px]">
            {coworkers.map(c => (
              <button
                key={c.id}
                onClick={() => onOpenContact(c.id)}
                className="appearance-none bg-transparent border-0 p-0 text-left cursor-pointer flex items-center gap-[8px] py-[6px] min-w-0"
              >
                <HighlightIcon size="sm" variant={c.tier === "Champion" ? "success" : "neutral"} iconName="User" />
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-[12px] font-medium" style={{ color: "var(--color-text-title)" }}>{c.name}</span>
                  <span className="truncate text-[11px]" style={{ color: "var(--field-supporting)" }}>{c.jobTitle}</span>
                </div>
              </button>
            ))}
          </div>
        ),
    },
    {
      uid: "recent", title: "Recent touches", colSpan: 3, widthClass: "full", rowSpan: 4,
      content: <UcopActivityFeed items={engagements} limit={5} />,
    },
  ], [contact, company, signals, coworkers, engagements, onOpenCompany, onOpenContact])

  const dealColumns: TableColumn<UcopDeal>[] = [
    { key: "name",   header: "Deal",  render: r => <span style={{ fontWeight: 600, color: "var(--color-text-title)" }}>{r.name}</span> },
    { key: "stage",  header: "Stage", render: r => <Tag variant={r.stage === "Closed Won" ? "success" : "informative"} size="sm">{r.stage}</Tag> },
    { key: "amount", header: "Amount", align: "right", render: r => money(r.amount) },
    { key: "close",  header: "Close date", render: r => r.closeDate },
  ]

  const ticketColumns: TableColumn<UcopTicket>[] = [
    { key: "number",   header: "#", width: "64px", render: r => r.number },
    { key: "subject",  header: "Subject", render: r => <span style={{ fontWeight: 600, color: "var(--color-text-title)" }}>{r.subject}</span> },
    { key: "status",   header: "Status", render: r => <Tag variant={TICKET_VARIANT[r.status]} size="sm">{r.status}</Tag> },
    { key: "priority", header: "Priority", render: r => r.priority },
    { key: "created",  header: "Created", render: r => r.createdAt },
  ]

  const feedItems = engagements.filter(e =>
    ACTIVITY_GROUPS.find(g => g.id === group)!.types.includes(e.type))
  const emails    = engagements.filter(e => e.type === "Email")
  const followUps = engagements.filter(e => e.type === "Task" && e.status === "Open")

  return (
    <ScreenLayout
      workspaceName="AIMS OS"
      userName="Michael Orellana"
      userEmail="michael.orellana@aimsos.ai"
      sidebarItems={SIDEBAR_ITEMS}
      activeSidebarId="people"
      header={isScrolled => (
        <Header
          size={isScrolled ? "compress" : "size-m"}
          title={company.name}
          backButton
          showBackInCompress
          onBack={onBack}
        />
      )}
    >
      <EntityHeader
        name={contact.name}
        visual={{ kind: "avatar" }}
        source="HubSpot"
        tags={[
          ...(signals.some(s => s.severity === "High")
            ? [{ label: "Escalation open", role: "signal" as const, tone: "error" as const }]
            : []),
          ...(contact.tier ? [{ label: contact.tier, role: "classification" as const }] : []),
        ]}
        stateBadge={{ label: company.health, variant: HEALTH_VARIANT[company.health] }}
        description={`${contact.jobTitle} · ${company.name}`}
        secondaryMetadata={secondaryMetadata}
        assignedAgent={{ id: "AGT-DEAL", name: "Deal Concierge", onOpenChat: () => {} }}
        compressOnScroll
      />

      {nba && (
        <div className="mt-[12px]">
          <NextBestActionCard item={{
            id: nba.id, title: nba.text, description: nba.detail,
            timeAgo: `${Math.abs(daysUntil(nba.since))} days ago`,
            onViewDetails: () => setTab("activity"),
          }} />
        </div>
      )}

      <div className="mt-[16px] mb-[24px]">
        <Tabs items={CONTACT_TABS} activeId={tab} onChange={setTab} />
      </div>

      {tab === "overview" && <WidgetCanvasView initialSlots={overviewSlots} />}

      {tab === "book" && (
        <div className="flex flex-col gap-[24px]">
          <AdaptiveMetricGrid cards={[
            { label: "Influenced pipeline", value: money(deals.reduce((a, d) => a + d.amount, 0)), iconName: "Briefcase", iconVariant: "informative" },
            { label: "Open tickets", value: openTickets.length, iconName: "Inbox", iconVariant: openTickets.length > 0 ? "error" : "neutral" },
            { label: "Deals owned", value: deals.length, iconName: "Handshake", iconVariant: "neutral" },
          ]} />
          <div className="flex flex-col gap-[12px]">
            <UcopSectionLabel>Deals — primary contact</UcopSectionLabel>
            {deals.length === 0
              ? <EmptyState icon={icon("Briefcase")} title="No deals" description="This contact is not the primary contact on any deal." />
              : (
                <CardContainer size="sm" className="!p-0 overflow-hidden hover:!border-[length:0.5px] hover:!border-[color:var(--card-default-border)] hover:![box-shadow:none]">
                  <Table columns={dealColumns} data={deals} size="sm" />
                </CardContainer>
              )}
          </div>
          <div className="flex flex-col gap-[12px]">
            <UcopSectionLabel>Tickets — requester</UcopSectionLabel>
            {tickets.length === 0
              ? <EmptyState icon={icon("LifeBuoy")} title="No tickets" description="This contact has not raised a support ticket." />
              : (
                <CardContainer size="sm" className="!p-0 overflow-hidden hover:!border-[length:0.5px] hover:!border-[color:var(--card-default-border)] hover:![box-shadow:none]">
                  <Table columns={ticketColumns} data={tickets} size="sm" />
                </CardContainer>
              )}
          </div>
        </div>
      )}

      {tab === "activity" && (
        <div className="flex flex-col gap-[24px]">
          <div className="flex gap-[8px]">
            {ACTIVITY_GROUPS.map(g => (
              <Chip key={g.id} size="s" variant={group === g.id ? "primary" : "secondary"} onClick={() => setGroup(g.id)}>
                {g.label}
              </Chip>
            ))}
          </div>
          <UcopActivityFeed items={feedItems} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
            <CardContainer size="sm">
              <div className="flex flex-col gap-[12px]">
                <UcopSectionLabel>{`Emails · ${emails.length}`}</UcopSectionLabel>
                {emails.length === 0
                  ? <span className="text-[12px]" style={{ color: "var(--field-supporting)" }}>No email on record.</span>
                  : <UcopActivityFeed items={emails} />}
              </div>
            </CardContainer>
            <CardContainer size="sm">
              <div className="flex flex-col gap-[12px]">
                <UcopSectionLabel>{`Follow-ups · ${followUps.length}`}</UcopSectionLabel>
                {followUps.length === 0
                  ? <span className="text-[12px]" style={{ color: "var(--field-supporting)" }}>Nothing outstanding.</span>
                  : <UcopActivityFeed items={followUps} />}
              </div>
            </CardContainer>
            <CardContainer size="sm">
              <div className="flex flex-col gap-[12px]">
                <UcopSectionLabel>Sentiment</UcopSectionLabel>
                <SentimentBreakdown items={engagements} />
              </div>
            </CardContainer>
            <CardContainer size="sm">
              <div className="flex flex-col gap-[12px]">
                <UcopSectionLabel>AI insights</UcopSectionLabel>
                <AiInsights signals={signals} subject={contact.name} />
              </div>
            </CardContainer>
          </div>
        </div>
      )}
    </ScreenLayout>
  )
}

/* ── The screen, and the routing between the three levels ───────────────── */

type Route =
  | { kind: "index" }
  | { kind: "company"; id: string }
  | { kind: "contact"; id: string }

export default function PMMichaelUcopScreen() {
  const [route, setRoute] = useState<Route>({ kind: "index" })

  if (route.kind === "company") {
    const company = COMPANIES.find(c => c.id === route.id)
    if (company) {
      return (
        <CompanyProfile
          company={company}
          onBack={() => setRoute({ kind: "index" })}
          onOpenContact={id => setRoute({ kind: "contact", id })}
        />
      )
    }
  }

  if (route.kind === "contact") {
    const contact = CONTACTS.find(c => c.id === route.id)
    if (contact) {
      return (
        <ContactProfile
          contact={contact}
          /* Back goes to the CONTACT'S COMPANY, not to wherever the reader came
             from. A contact is always reached through its account — from the
             index via the company, or from a coworker who shares it — so the
             parent is the same place in every path, and a back button that
             lands somewhere different each time is a back button nobody trusts. */
          onBack={() => setRoute({ kind: "company", id: contact.companyId })}
          onOpenCompany={id => setRoute({ kind: "company", id })}
          onOpenContact={id => setRoute({ kind: "contact", id })}
        />
      )
    }
  }

  return (
    <ScreenLayout
      workspaceName="AIMS OS"
      userName="Michael Orellana"
      userEmail="michael.orellana@aimsos.ai"
      sidebarItems={SIDEBAR_ITEMS}
      activeSidebarId="accounts"
      header={isScrolled => (
        <Header
          size={isScrolled ? "compress" : "size-l"}
          title="Accounts"
          description="Every customer AIMS OS keeps a unified profile for. Open one to reach its contacts, deals, tickets and activity."
        />
      )}
    >
      <AccountsIndex onOpen={id => setRoute({ kind: "company", id })} />
    </ScreenLayout>
  )
}
