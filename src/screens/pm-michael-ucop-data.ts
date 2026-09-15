/**
 * ── Unified Company Profile + Unified Contact Profile — the data ────────────
 *
 * Michael, 2026-09-15. Built from Lex Paniagua's spec (2026-09) plus the
 * shared Claude artifact it references. Every record below is that document's
 * own sample data, unchanged: Meridian Corp's ARR is $2.4M there and $2.4M
 * here, ticket 4471 is the governance addendum in both. Where the spec gave a
 * field shape and one example rather than a table — Engagements, Signals — the
 * rows are written to that shape and stay inside what the examples imply.
 *
 * WHY THIS IS NOT `ucpShared.ts`. That file models AIMS OS's own governance
 * layer: Truth, Sandbox and Sources planes, drives, claims, verification. This
 * one models HUBSPOT — Companies, Contacts, Deals, Tickets, Engagements — plus
 * one synthesised entity, Signals. They answer different questions about the
 * same screen, and folding them together would mean every field carrying a
 * plane it does not have. The spec is explicit that the Knowledge tab and its
 * planes are out of scope here.
 *
 * SIGNALS ARE THE ONE ENTITY WITH NO SOURCE SYSTEM. The spec says so plainly:
 * not a HubSpot object, synthesised by an AI Worker reading the other four.
 * That is why a Signal carries `generatedBy` and the rest do not — the reader
 * should be able to tell which rows a system delivered from which rows
 * something inferred.
 */

// ── Companies ───────────────────────────────────────────────────────────────

export type HealthStatus = "Healthy" | "At Risk" | "Escalation"
export type Tier = "Enterprise" | "Mid-Market" | "SMB"

export interface UcopCompany {
  id:            string
  name:          string
  industry:      string
  employees:     number
  /** Annual recurring revenue. The spec renames the existing MRR label. */
  arr:           number
  tier:          Tier
  owner:         string
  createdAt:     string
  domain:        string
  phone:         string
  city:          string
  lifecycle:     string
  /** Drives the header's "Renewal in N days". */
  renewalDate:   string
  health:        HealthStatus
}

export const COMPANIES: UcopCompany[] = [
  {
    id: "CMP-001", name: "Meridian Corp",
    industry: "Industrial Manufacturing", employees: 1200, arr: 2_400_000,
    tier: "Enterprise", owner: "Priya Nair", createdAt: "2023-03-01",
    domain: "meridiancorp.com", phone: "+1 (312) 555-0199", city: "Chicago, IL",
    lifecycle: "Customer", renewalDate: "2026-10-04", health: "At Risk",
  },
  {
    id: "CMP-002", name: "Riverbend Auto Group",
    industry: "Automotive Retail", employees: 640, arr: 860_000,
    tier: "Mid-Market", owner: "Daniel Ruiz", createdAt: "2024-01-22",
    domain: "riverbendauto.com", phone: "+1 (813) 555-0164", city: "Tampa, FL",
    lifecycle: "Customer", renewalDate: "2026-10-13", health: "Healthy",
  },
  {
    id: "CMP-003", name: "Brightline Health Partners",
    industry: "Healthcare Services", employees: 310, arr: 410_000,
    tier: "SMB", owner: "Marcus Webb", createdAt: "2025-02-10",
    domain: "brightlinehealth.org", phone: "+1 (512) 555-0143", city: "Austin, TX",
    lifecycle: "Customer", renewalDate: "2027-01-20", health: "Healthy",
  },
]

// ── Contacts ────────────────────────────────────────────────────────────────

export interface UcopContact {
  id:         string
  name:       string
  /** New in the spec, and required: the header and the Account card read it. */
  jobTitle:   string
  email:      string
  phone:      string
  city:       string
  region:     string
  /** Empty for a contact with no tier yet — the spec leaves two blank. */
  tier:       string
  score:      number
  leadSource: string
  createdAt:  string
  /** New in the spec, and required: nothing linked a Contact to a Company. */
  companyId:  string
  owner:      string
}

export const CONTACTS: UcopContact[] = [
  {
    id: "CON-001", name: "Sandra Torres", jobTitle: "VP of Operations",
    email: "sandra.torres@meridiancorp.com", phone: "+1 (212) 555-0155",
    city: "New York", region: "NY", tier: "Champion", score: 82,
    leadSource: "Referral", createdAt: "2023-03-01",
    companyId: "CMP-001", owner: "Priya Nair",
  },
  {
    id: "CON-002", name: "Sarah Chen", jobTitle: "Head of Compliance",
    email: "sarah.chen@meridiancorp.com", phone: "+1 (212) 555-0188",
    city: "New York", region: "NY", tier: "", score: 64,
    leadSource: "Inbound", createdAt: "2023-06-14",
    companyId: "CMP-001", owner: "Priya Nair",
  },
  {
    id: "CON-003", name: "David Park", jobTitle: "IT Director",
    email: "david.park@meridiancorp.com", phone: "+1 (212) 555-0163",
    city: "Chicago", region: "IL", tier: "", score: 58,
    leadSource: "Event", createdAt: "2023-09-02",
    companyId: "CMP-001", owner: "Priya Nair",
  },
  {
    id: "CON-004", name: "Marcus Delgado", jobTitle: "Fixed Operations Director",
    email: "marcus.delgado@riverbendauto.com", phone: "+1 (813) 555-0171",
    city: "Tampa", region: "FL", tier: "Champion", score: 71,
    leadSource: "Referral", createdAt: "2024-02-05",
    companyId: "CMP-002", owner: "Daniel Ruiz",
  },
]

// ── Deals ───────────────────────────────────────────────────────────────────

/** The funnel's stages, in order. A deal's stage is one of these. */
export const DEAL_STAGES = ["Qualified", "Proposal", "Contract Review", "Negotiation", "Closed Won"] as const
export type DealStage = typeof DEAL_STAGES[number]

export interface UcopDeal {
  id:               string
  name:             string
  stage:            DealStage
  amount:           number
  closeDate:        string
  owner:            string
  companyId:        string
  createdAt:        string
  /** New in the spec — without it a Deal shows on the Company only. */
  primaryContactId: string
}

export const DEALS: UcopDeal[] = [
  {
    id: "DEA-001", name: "Meridian Corp — Platform Renewal FY27",
    stage: "Contract Review", amount: 480_000, closeDate: "2026-09-29",
    owner: "Priya Nair", companyId: "CMP-001", createdAt: "2026-06-01",
    primaryContactId: "CON-001",
  },
  {
    id: "DEA-002", name: "Riverbend — Multi-Store Expansion",
    stage: "Negotiation", amount: 210_000, closeDate: "2026-10-15",
    owner: "Daniel Ruiz", companyId: "CMP-002", createdAt: "2026-07-18",
    primaryContactId: "CON-004",
  },
  /* Two more on Meridian so the Deals tab has a funnel worth drawing. The spec
     lists two deals because it is showing the SHAPE of the entity, not the
     volume — a funnel built from one row per stage is a bar chart with extra
     steps. These carry the same fields and nothing the spec did not define. */
  {
    id: "DEA-003", name: "Meridian Corp — Governance Studio add-on",
    stage: "Proposal", amount: 96_000, closeDate: "2026-11-20",
    owner: "Priya Nair", companyId: "CMP-001", createdAt: "2026-08-04",
    primaryContactId: "CON-002",
  },
  {
    id: "DEA-004", name: "Meridian Corp — Copilot seats expansion",
    stage: "Qualified", amount: 54_000, closeDate: "2026-12-11",
    owner: "Priya Nair", companyId: "CMP-001", createdAt: "2026-08-27",
    primaryContactId: "CON-003",
  },
  {
    id: "DEA-005", name: "Meridian Corp — Data Studio FY26",
    stage: "Closed Won", amount: 312_000, closeDate: "2026-02-14",
    owner: "Priya Nair", companyId: "CMP-001", createdAt: "2025-11-03",
    primaryContactId: "CON-001",
  },
]

// ── Tickets ─────────────────────────────────────────────────────────────────

export type TicketStatus   = "Open" | "In Progress" | "Resolved"
export type TicketPriority = "High" | "Medium" | "Low"

export interface UcopTicket {
  id:          string
  /** The ticket number the spec shows as "#" — 4471, 4502, 4390. */
  number:      string
  subject:     string
  status:      TicketStatus
  priority:    TicketPriority
  assignee:    string
  requesterId: string
  createdAt:   string
  /** New in the spec — a direct link, rather than hopping through Requester. */
  companyId:   string
  /** Days from open to resolved. Absent while the ticket is still open. */
  resolvedInDays?: number
}

export const TICKETS: UcopTicket[] = [
  {
    id: "TIC-4471", number: "4471", subject: "Governance addendum missing signature",
    status: "Open", priority: "High", assignee: "Jordan Lee",
    requesterId: "CON-001", createdAt: "2026-08-28", companyId: "CMP-001",
  },
  {
    id: "TIC-4502", number: "4502", subject: "SSO login failures for finance team",
    status: "In Progress", priority: "Medium", assignee: "Jordan Lee",
    requesterId: "CON-003", createdAt: "2026-09-03", companyId: "CMP-001",
  },
  {
    id: "TIC-4390", number: "4390", subject: "Service bay scheduling sync delay",
    status: "Resolved", priority: "Low", assignee: "Ava Thompson",
    requesterId: "CON-004", createdAt: "2026-07-11", companyId: "CMP-002",
    resolvedInDays: 4,
  },
  /* Two resolved ones on Meridian, so the Tickets tab's "avg resolution time"
     has something to average and the priority donut has more than one slice
     per colour. Same fields, same shape. */
  {
    id: "TIC-4318", number: "4318", subject: "Bulk export timing out over 50k rows",
    status: "Resolved", priority: "Medium", assignee: "Ava Thompson",
    requesterId: "CON-003", createdAt: "2026-06-19", companyId: "CMP-001",
    resolvedInDays: 6,
  },
  {
    id: "TIC-4256", number: "4256", subject: "Renewal quote PDF missing line items",
    status: "Resolved", priority: "High", assignee: "Jordan Lee",
    requesterId: "CON-001", createdAt: "2026-05-30", companyId: "CMP-001",
    resolvedInDays: 2,
  },
]

// ── Engagements ─────────────────────────────────────────────────────────────

export type EngagementType = "Call" | "Email" | "Meeting" | "Note" | "Task"
export type Sentiment      = "Positive" | "Neutral" | "Negative"

export interface UcopEngagement {
  id:        string
  type:      EngagementType
  subject:   string
  contactId: string
  companyId: string
  dealId?:   string
  owner:     string
  /** ISO, so one parser orders the feed and no row disagrees with another. */
  timestamp: string
  /** Call and Email only. */
  direction?: "Inbound" | "Outbound"
  /** Minutes. Call and Meeting only. */
  duration?: number
  status:    "Completed" | "Scheduled" | "Open" | "Sent"
  /** The line the Activity Feed expands to show under the row. */
  aiSummary?: string
  sentiment?: Sentiment
  /** Task only. */
  dueDate?:  string
}

export const ENGAGEMENTS: UcopEngagement[] = [
  {
    id: "ENG-1001", type: "Call", subject: "Outbound Call · +1 (212) 555-0155",
    contactId: "CON-001", companyId: "CMP-001", dealId: "DEA-001", owner: "Priya Nair",
    timestamp: "2026-09-02T14:05", direction: "Outbound", duration: 18, status: "Completed",
    aiSummary: "Sandra confirmed the evaluation is still funded and asked for a written migration timeline. No pricing objection was raised — the timeline is the one open commitment from this call.",
    sentiment: "Positive",
  },
  {
    id: "ENG-1002", type: "Note", subject: "Discovery follow-up — call wrap-up",
    contactId: "CON-001", companyId: "CMP-001", dealId: "DEA-001", owner: "Priya Nair",
    timestamp: "2026-09-02T14:40", status: "Completed",
    aiSummary: "Written up while the call was fresh: the timeline is the only open commitment, and it was asked for in writing rather than on a call.",
    sentiment: "Neutral",
  },
  {
    id: "ENG-1003", type: "Email", subject: "Governance addendum for review",
    contactId: "CON-001", companyId: "CMP-001", dealId: "DEA-001", owner: "Priya Nair",
    timestamp: "2026-08-28T09:40", direction: "Outbound", status: "Sent",
    aiSummary: "Sent the redlined addendum for Legal to countersign. Opened twice, no reply, and nothing in the thread says it was forwarded on.",
    sentiment: "Neutral",
  },
  {
    id: "ENG-1004", type: "Meeting", subject: "Quarterly business review",
    contactId: "CON-001", companyId: "CMP-001", owner: "Priya Nair",
    timestamp: "2026-08-22T11:00", duration: 52, status: "Completed",
    aiSummary: "Usage and roadmap were covered in full. Two escalations from July were raised again without a resolution date — the thread most likely to carry into the next conversation.",
    sentiment: "Negative",
  },
  {
    id: "ENG-1005", type: "Task", subject: "Send the written migration timeline",
    contactId: "CON-001", companyId: "CMP-001", dealId: "DEA-001", owner: "Priya Nair",
    timestamp: "2026-09-02T14:45", status: "Open", dueDate: "2026-09-15",
    aiSummary: "The one commitment made on the Sep 2 call, and the thing the security review is waiting on.",
  },
  {
    id: "ENG-1006", type: "Email", subject: "SSO failures — escalation thread",
    contactId: "CON-003", companyId: "CMP-001", owner: "Jordan Lee",
    timestamp: "2026-09-04T08:12", direction: "Inbound", status: "Completed",
    aiSummary: "David reported the finance team is locked out intermittently. Second report this quarter on the same integration.",
    sentiment: "Negative",
  },
  {
    id: "ENG-1007", type: "Call", subject: "Inbound Call · +1 (212) 555-0188",
    contactId: "CON-002", companyId: "CMP-001", dealId: "DEA-003", owner: "Priya Nair",
    timestamp: "2026-08-19T16:20", direction: "Inbound", duration: 24, status: "Completed",
    aiSummary: "Sarah walked through the Governance Studio scope and asked who signs off on data residency.",
    sentiment: "Positive",
  },
  {
    id: "ENG-1008", type: "Meeting", subject: "Multi-store rollout planning",
    contactId: "CON-004", companyId: "CMP-002", dealId: "DEA-002", owner: "Daniel Ruiz",
    timestamp: "2026-09-08T10:00", duration: 45, status: "Completed",
    aiSummary: "Four stores confirmed for phase one. Marcus wants the scheduling sync fixed before phase two starts.",
    sentiment: "Positive",
  },
  {
    id: "ENG-1009", type: "Email", subject: "Phase one rollout dates",
    contactId: "CON-004", companyId: "CMP-002", dealId: "DEA-002", owner: "Daniel Ruiz",
    timestamp: "2026-09-10T11:30", direction: "Outbound", status: "Sent",
    sentiment: "Neutral",
  },
  {
    id: "ENG-1010", type: "Task", subject: "Confirm data residency sign-off owner",
    contactId: "CON-002", companyId: "CMP-001", owner: "Priya Nair",
    timestamp: "2026-08-19T16:45", status: "Open", dueDate: "2026-09-18",
  },
]

// ── Signals ─────────────────────────────────────────────────────────────────

export type SignalType     = "Risk" | "Opportunity" | "NextBestAction"
export type SignalSeverity = "High" | "Medium" | "Low"

export interface UcopSignal {
  id:          string
  /** Which kind of record this hangs off — the spec's polymorphic lookup. */
  relatedType: "Contact" | "Company" | "Deal"
  relatedId:   string
  type:        SignalType
  text:        string
  detail:      string
  severity:    SignalSeverity
  since:       string
  status:      "Open" | "Resolved"
  /** Signals have no source system. This says which worker inferred it. */
  generatedBy: string
}

export const SIGNALS: UcopSignal[] = [
  {
    id: "SIG-01", relatedType: "Contact", relatedId: "CON-001", type: "Risk",
    text: "Two escalations raised again at the QBR",
    detail: "the governance addendum is outstanding",
    severity: "High", since: "2026-08-27", status: "Open",
    generatedBy: "AI Worker: Deal Concierge",
  },
  {
    id: "SIG-02", relatedType: "Contact", relatedId: "CON-001", type: "Risk",
    text: "No written answer since Sep 2",
    detail: "the migration timeline was asked for in writing and has not been sent",
    severity: "High", since: "2026-09-02", status: "Open",
    generatedBy: "AI Worker: Deal Concierge",
  },
  {
    id: "SIG-03", relatedType: "Company", relatedId: "CMP-001", type: "Risk",
    text: "Single-threaded on one contact",
    detail: "82% of engagements on this account are with Sandra Torres, 24 days before renewal",
    severity: "High", since: "2026-08-14", status: "Open",
    generatedBy: "AI Worker: Deal Concierge",
  },
  {
    id: "SIG-04", relatedType: "Contact", relatedId: "CON-003", type: "Risk",
    text: "Second SSO escalation this quarter",
    detail: "the same integration failed in June and was closed without a root cause",
    severity: "Medium", since: "2026-09-04", status: "Open",
    generatedBy: "AI Worker: Support Concierge",
  },
  {
    id: "SIG-05", relatedType: "Contact", relatedId: "CON-001", type: "NextBestAction",
    text: "Send the migration timeline she asked for",
    detail: "It is the only open commitment on the renewal, and the security review cannot start without a date.",
    severity: "High", since: "2026-09-02", status: "Open",
    generatedBy: "AI Worker: Deal Concierge",
  },
  {
    id: "SIG-06", relatedType: "Company", relatedId: "CMP-001", type: "NextBestAction",
    text: "Introduce a second champion before renewal",
    detail: "Sarah Chen has the highest engagement after Sandra and owns the compliance sign-off.",
    severity: "Medium", since: "2026-08-14", status: "Open",
    generatedBy: "AI Worker: Deal Concierge",
  },
  {
    id: "SIG-07", relatedType: "Contact", relatedId: "CON-004", type: "Opportunity",
    text: "Asking about phase two before phase one closes",
    detail: "four more stores were named on the Sep 8 call without being quoted",
    severity: "Low", since: "2026-09-08", status: "Open",
    generatedBy: "AI Worker: Deal Concierge",
  },
  {
    id: "SIG-08", relatedType: "Contact", relatedId: "CON-004", type: "NextBestAction",
    text: "Quote phase two while the rollout is live",
    detail: "Four additional stores were named on the Sep 8 call and have not been priced.",
    severity: "Low", since: "2026-09-08", status: "Open",
    generatedBy: "AI Worker: Deal Concierge",
  },
]

// ── Derivations ─────────────────────────────────────────────────────────────

/**
 * "Now", fixed rather than read from the clock.
 *
 * Every "in N days" on these screens is measured from here, so a reader and a
 * screenshot agree, and so the fixture does not quietly change meaning as the
 * real date moves past the spec's renewal dates.
 */
export const UCOP_NOW = new Date("2026-09-15")

export function daysUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - UCOP_NOW.getTime()) / 86_400_000)
}

export const companyOf   = (c: UcopContact) => COMPANIES.find(x => x.id === c.companyId)!
export const contactsOf  = (companyId: string) => CONTACTS.filter(c => c.companyId === companyId)
export const dealsOf     = (companyId: string) => DEALS.filter(d => d.companyId === companyId)
export const ticketsOf   = (companyId: string) => TICKETS.filter(t => t.companyId === companyId)

export const dealsForContact   = (contactId: string) => DEALS.filter(d => d.primaryContactId === contactId)
export const ticketsForContact = (contactId: string) => TICKETS.filter(t => t.requesterId === contactId)

export const engagementsForCompany = (companyId: string) =>
  ENGAGEMENTS.filter(e => e.companyId === companyId).sort(byNewest)
export const engagementsForContact = (contactId: string) =>
  ENGAGEMENTS.filter(e => e.contactId === contactId).sort(byNewest)

function byNewest(a: UcopEngagement, b: UcopEngagement) {
  return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
}

/** Open signals on a record, most severe first — the Alerts widget's order. */
const SEVERITY_RANK: Record<SignalSeverity, number> = { High: 0, Medium: 1, Low: 2 }
export function openSignalsFor(kind: "Contact" | "Company", id: string): UcopSignal[] {
  return SIGNALS
    .filter(s => s.relatedType === kind && s.relatedId === id && s.status === "Open" && s.type !== "NextBestAction")
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
}

/**
 * A company's signals INCLUDE its contacts', which the spec asks for directly:
 * "Signals, filtered Related Record = this Company (or via its
 * Contacts/Deals)". An escalation on a person is an escalation on the account.
 */
export function companySignals(companyId: string): UcopSignal[] {
  const ids = new Set<string>([companyId, ...contactsOf(companyId).map(c => c.id), ...dealsOf(companyId).map(d => d.id)])
  return SIGNALS
    .filter(s => ids.has(s.relatedId) && s.status === "Open" && s.type !== "NextBestAction")
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
}

/** The single recommendation a record carries, or null. Never a list. */
export function nextBestAction(kind: "Contact" | "Company", id: string): UcopSignal | null {
  return SIGNALS.find(s => s.relatedType === kind && s.relatedId === id && s.type === "NextBestAction" && s.status === "Open") ?? null
}

/**
 * The conversion funnel's stages, CUMULATIVE.
 *
 * Counting the deals sitting AT each stage is a distribution, not a funnel:
 * it draws four bars of one deal each and says nothing about conversion. A
 * funnel asks how many deals ever REACHED a stage, so each bar is every deal
 * at that stage or beyond — which is why it narrows, and why the drop between
 * two bars is a number worth reading.
 *
 * It also means the entry stage is the whole population, which is what the
 * chart's own percentages are measured against.
 */
export function funnelStages(deals: UcopDeal[]): { label: string; value: number }[] {
  return DEAL_STAGES.map((stage, i) => ({
    label: stage,
    value: deals.filter(d => DEAL_STAGES.indexOf(d.stage) >= i).length,
  }))
}

export const money = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  : n >= 1_000   ? `$${Math.round(n / 1_000)}K`
  : `$${n}`

export const HEALTH_VARIANT: Record<HealthStatus, "success" | "alert" | "error"> = {
  "Healthy":    "success",
  "At Risk":    "alert",
  "Escalation": "error",
}

export const TICKET_VARIANT: Record<TicketStatus, "error" | "alert" | "success"> = {
  "Open":        "error",
  "In Progress": "alert",
  "Resolved":    "success",
}

export const SENTIMENT_VARIANT: Record<Sentiment, "success" | "neutral" | "error"> = {
  "Positive": "success",
  "Neutral":  "neutral",
  "Negative": "error",
}

/** The icon each engagement type carries, everywhere it appears. */
export const ENGAGEMENT_ICON: Record<EngagementType, string> = {
  Call:    "Phone",
  Email:   "Mail",
  Meeting: "Users",
  Note:    "StickyNote",
  Task:    "CheckSquare",
}

/** Activity's filter chips, and what each one lets through. */
export const ACTIVITY_GROUPS: { id: string; label: string; types: EngagementType[] }[] = [
  { id: "all",   label: "All",            types: ["Call", "Email", "Meeting", "Note", "Task"] },
  { id: "comms", label: "Communications", types: ["Call", "Email"] },
  { id: "notes", label: "Notes",          types: ["Note"] },
  { id: "events", label: "Events",        types: ["Meeting"] },
  { id: "tasks", label: "Tasks",          types: ["Task"] },
]

/** `Sep 2, 2026 · 14:05` from an ISO stamp — one formatter for every surface. */
export function formatStamp(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
  return `${date} · ${time}`
}
