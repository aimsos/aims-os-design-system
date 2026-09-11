/**
 * UCP — Unified Contact Profile: shared types + mock data.
 *
 * Same role `adminShared.ts` plays for the Admin Console screens: one place
 * for the record shapes and the fixtures, so the list screen and the profile
 * screen can't drift apart on what a contact is.
 *
 * Three AIMS OS concepts are modelled here rather than invented:
 *   - Knowledge planes (Truth 100% / Sandbox ~80% / Sources ~60%) — the same
 *     three planes a TruthPack is built from. The Snapshot tab is this record's
 *     facts organised by plane, so "how sure are we" is readable at a glance.
 *   - Source Drives — drives, folders or documents attached from the company
 *     catalog. This is what the profile's Drives tab lists (it replaces the
 *     generic "Documents" tab a CRM would have).
 *   - The Entity Header content model (Figma 19815-101547) — visual, title,
 *     source, state badge, signal and classification tags, secondary metadata.
 *     Every field below maps to a named slot in that spec; nothing is a
 *     convenience field invented for this screen.
 */

import { hasScope } from "./viewerScopes"
import type { AiInsight } from "@/components/experimental/ai-summary-widget"

/**
 * These three shapes used to be imported from a pair of components in
 * `experimental/`. Those components are gone — RecordHeader absorbed both jobs —
 * so the fixtures own their shapes now. They are fixture vocabulary, not design
 * system types: the screens map them onto whatever the components ask for.
 */
export interface UcpTag {
  label:     string
  role:      "signal" | "classification"
  tone?:     "error" | "alert" | "neutral"
  severity?: number
  tooltip?:  string
}

export interface UcpMetaItem {
  iconName: string
  label:    string
  tooltip:  string
}

/** What the engine proposes for a record. `null` on a record with nothing to do. */
export interface UcpNextBestAction {
  title:     string
  timestamp: string
  rationale?: string
  variant?:  "view-details" | "accept"
}

// ── Entity ────────────────────────────────────────────────────────────────────

/**
 * The entity types this tenant publishes.
 *
 * Three of them are people-shaped and three are not, which is the point: an
 * entity type is whatever Helix Data Studio publishes, and the roster cannot
 * assume they are all contacts. What each type declares about itself lives in
 * ucpTypeModel; what they all share is this file.
 */
export type UcpEntityType =
  | "person" | "employee" | "company"
  | "policy" | "asset"

/** Types whose records are PEOPLE. Connections, coworkers and initials only
 *  make sense for these — a repair order has no colleagues and no initials. */
export const PEOPLE_TYPES: UcpEntityType[] = ["person", "employee"]

/**
 * ── What "All" means in a Contacts roster ──────────────────────────────────
 *
 * The three types this module is ABOUT. Michael, 2026-09-11, pointing at
 * AST-2290 sitting in the All tab: a service loaner whose next best action
 * reads "Book the overdue 40,000 km service".
 *
 * That is the Repair Orders problem again, wearing a different type. He had
 * already taken repair orders out for the same reason — "no hace sentido" in
 * Contacts — and the asset came back carrying repair-order CONTENT. A truck
 * with an overdue service is not something anybody scanning a contacts list
 * is looking for, and one row like it teaches the reader that this list is
 * "records" rather than "people and the organisations they belong to", which
 * is the whole premise of the module.
 *
 * POLICIES GO WITH IT, and he did not have to say so: a policy is not
 * somebody you contact either. It was in All for the same reason the asset
 * was — because All meant "every row in CONTACTS" rather than "every contact".
 *
 * WHAT THIS IS NOT: the types are not deleted, and their tabs still work. A
 * reader who deliberately opens Assets is asking for assets and gets them,
 * repair-order next-best-actions included, because there that is the record's
 * own business. The change is only that All stops mixing them in — "all" is
 * scoped to the noun in the page title, not to the fixture array.
 */
export const CONTACT_TYPES: UcpEntityType[] = ["person", "employee", "company"]

/*
  THE POLICY AND ASSET RECORDS ARE GONE — Michael, 2026-09-11: delete them
  from the Entities rail as items AND delete their rows, so the module shows
  only the kinds of contact.

  They had already been excluded from "All" for making no sense in a contacts
  roster, and from Create for not being things anybody types in. Keeping two
  records nobody could reach from All and could only see by adding a rail item
  was the last half-step; this finishes it.

  The TYPES survive in UcpEntityType, with their labels, icons and profile
  specs. That is deliberate: they are real objects in the platform and they
  will get a module of their own. What has gone is the claim that the module
  called Contacts is where they live.
*/

/** An avatar needs a face or a brand. Everything else is an icon, and a
 *  record titled with a code — RO-48291 — can only ever be an icon: there are
 *  no initials in a code. Straight from the Entity Header's own rule. */
export const AVATAR_TYPES: UcpEntityType[] = ["person", "employee", "company"]
export type UcpStatus     = "Active" | "Inactive" | "Archived"

/** A study either returned data, returned nothing, or failed. */
export type StudyState = "loaded" | "empty" | "error"

export type TagVariantLite = "success" | "error" | "alert" | "informative" | "neutral"

/**
 * One read. `category` is the area — "Renewal", "Governance", "Service" — and
 * `destination` is where in the platform to act on it, when there is such a
 * place. Both are the tenant's vocabulary, not the platform's.
 */
export interface UcpInsight {
  id:           string
  category:     string
  headline:     string
  detail:       string
  confidence:   number
  /** A section of the platform, or one of this record's own tabs. */
  destination?: string
}

export interface UcpContact {
  id:              string
  type:            UcpEntityType
  name:            string
  /** One line of "who is this" — role · department, or industry · size · HQ. */
  subtitle:        string
  email:           string
  phone:           string
  company:         string
  owner:           string
  /** Lifecycle, and what the list filters on. */
  status:          UcpStatus
  /**
   * The Entity Header's state badge — exactly one, and the most blocking status
   * wins. Defaults to `status`; set it only when something more blocking is
   * true of the record, in which case the lifecycle value moves to a tag.
   */
  stateBadge?:     { label: string; variant: TagVariantLite }
  /**
   * The system this record was pulled from. One item, never two — a job title,
   * a location or a category is not a source. Omitted when the entity was
   * created in the platform itself; the slot is removed, never refilled.
   */
  source:          { label: string; iconName: string }
  /**
   * The entitlement scope a viewer must hold to read this record's governed
   * values. Undefined means the record carries nothing scope-gated beyond the
   * access that got the viewer to the list. This is a property of the VIEWER's
   * relationship to the record, not of the record: the same row renders in full
   * for someone who holds the scope.
   */
  requiredScope?:  string
  /**
   * Signals, and any classification BEYOND the entity's own type — "Buyer",
   * "Enterprise", "Manager". The type's own tag is not stored here: the header
   * derives it from TYPE_LABEL, which is the same map the roster chip reads,
   * so a record cannot be a "Customer" in the list and a "Person" in its own
   * header. The component sorts and caps what it is given.
   */
  tags:            UcpTag[]
  /** Max 6, aim for four. Every item carries a tooltip naming its field. */
  meta:            UcpMetaItem[]
  lastInteraction: string
  /** AIMS OS is agent-first — every record has one assigned concierge. */
  agent:           { id: string; name: string }
  /**
   * Declared relationships to other records. Coworkers are derived from
   * `company` and never written here; this is for the ones no derivation can
   * reach — a family tie, most of all.
   */
  relations?:      UcpRelation[]
  /**
   * The engine's proposal, rendered as its own card BELOW the header — never
   * inside it. null when there is nothing to do: no action, no card.
   */
  nba:             UcpNextBestAction | null
  /** The agent's read on this record, shown as the Overview AI widget. */
  /**
   * The agent's reads on this record — one or many, each about a different
   * AREA. The Overview widget carousels them and names the area, so a reader
   * knows where a read is pointing before deciding to act on it.
   *
   * They are AUTHORED, never derived from the studies on the same page: a
   * sentence generated from a number the reader can already see is not an
   * interpretation, and putting a confidence on it would be inventing one.
   * A record with a single read is the normal case, and the widget's pager
   * only appears from two.
   */
  insights:        UcpInsight[]
  governance:      StudyState
  risk:            StudyState
  connections:     StudyState
}

/**
 * The display label for each type. `person` reads as "Customer": these records
 * are contacts at customer and prospect accounts, and "Person" said what the
 * row was rather than what the record is. The internal discriminator stays
 * `person` so the type union does not churn.
 */
export const TYPE_LABEL: Record<UcpEntityType, string> = {
  person:         "Customer",
  employee:       "Employee",
  company:        "Company",
  policy:         "Policy",
  asset:          "Asset",
}

/** The plural, for a tab and for an empty state. Derived labels read wrong
 *  ("Policys"), so each type says its own. */
export const TYPE_PLURAL: Record<UcpEntityType, string> = {
  person:         "Customers",
  employee:       "Employees",
  company:        "Companies",
  policy:         "Policies",
  asset:          "Assets",
}

export const TYPE_ICON: Record<UcpEntityType, string> = {
  person:         "UserRound",
  employee:       "IdCard",
  company:        "Building2",
  policy:         "FileCheck2",
  asset:          "Truck",
}

export const TYPE_TAG: Record<UcpEntityType, "informative" | "purple" | "lightBlue"> = {
  person:         "informative",
  employee:       "purple",
  company:        "lightBlue",
  policy:         "purple",
  asset:          "lightBlue",
}

export const STATUS_TAG: Record<UcpStatus, TagVariantLite> = {
  Active:   "success",
  Inactive: "neutral",
  Archived: "error",
}

/**
 * All three types here are entities with a real-world visual identity — a face
 * or a brand — so all three use an avatar. That is also why each carries a
 * classification tag: an avatar cannot communicate what kind of thing this is,
 * where a highlight icon would.
 */
export function entityState(c: UcpContact): { label: string; variant: TagVariantLite } {
  return c.stateBadge ?? { label: c.status, variant: STATUS_TAG[c.status] }
}

/**
 * The one definition of a panel body's spacing, for every SlideOut in this
 * prototype — the same constant the DS keeps in App.tsx under the same name.
 *
 * 16px between sections and NO horizontal padding: SlideOut's own `aside` is
 * already `32px / 24px` and SidePanel's body `24px`, so a panel body that adds
 * its own 20px lands the content at 44 while the header and the footer stay at
 * 24. Each half looks right on its own, which is why every panel here had it.
 */
export const PANEL_CONTENT_CLASS = "flex flex-col gap-[16px]"

// ── Entitlements ──────────────────────────────────────────────────────────────

/**
 * The scopes the signed-in viewer holds. Hardcoded here because the prototype
 * has no identity provider — in the product this comes from the session, and
 * nothing else about the code below changes.
 *
 * Thomas is a PM: he can read contacts and HR records, and he cannot read
 * finance. That last omission is the point — it is what makes the Entity
 * Header's Restricted state reachable from a real rule instead of a mock flag.
 *
 * The scopes themselves live in `viewerScopes.ts` — one owner, because the
 * entity registry asks the same question about types and the profile asks it
 * about individual fields.
 */

/**
 * Restricted is a state, not a failure, and the copy has to say so. It never
 * suggests the viewer did something wrong and never implies the record is
 * broken: the fields exist, they are governed, and here is the scope that opens
 * them. The record itself stays visible — hiding it would tell the viewer
 * something untrue about what the tenant holds.
 *
 * Returns null when the viewer holds what the record needs.
 */
export function restrictionFor(c: UcpContact): { scope: string; note: string } | null {
  if (!c.requiredScope || hasScope(c.requiredScope)) return null
  return {
    scope: c.requiredScope,
    note: `These values are governed by ${c.requiredScope}, which your role does not hold. The record exists and is intact — request the scope to read it.`,
  }
}
/**
 * Short badge label for a source system — "Salesforce" → "SF". RecordHeader
 * renders the abbreviation inline and keeps the full name for the Tooltip, so
 * both have to be real; a badge that says "SAL" helps nobody.
 */
const SYSTEM_ABBR: Record<string, string> = {
  Salesforce:  "SF",
  Workday:     "WD",
  NetSuite:    "NS",
  HubSpot:     "HS",
  "CDK Global": "CDK",
  Epic:        "EP",
}

/**
 * The record's fields in the shape RecordHeader's RECORD zone wants.
 *
 * Two things this shape gets right that the flat metadata row did not:
 *
 *   1 · Provenance is per FIELD, not per record. A contact's role comes from
 *       the CRM and their verified-fact count comes from the knowledge system;
 *       one `source` on the whole record was a simplification that stopped
 *       being true the moment two fields disagreed about where they came from.
 *
 *   2 · Masking is a STATE of a field, not the absence of one. A viewer without
 *       the scope sees the same field list, the same labels and the same
 *       provenance badges — only the values are withheld. That is the honest
 *       rendering of "the fields exist and are governed", and it is what the
 *       component means by `state: "masked"`: the same field in a different
 *       entitlement state, never a different field.
 *
 * `masked` is decided by the caller against the viewer, per the component's own
 * rule — RecordHeader never resolves entitlements itself.
 */
export interface UcpRecordField {
  label:        string
  iconName:     string
  value:        string
  system:       string
  systemAbbr:   string
  modelVersion: string
  syncedAgo:    string
  masked:       boolean
}

export function getRecordFields(c: UcpContact): UcpRecordField[] {
  const restricted = restrictionFor(c) !== null
  const abbr = SYSTEM_ABBR[c.source.label] ?? c.source.label.slice(0, 2).toUpperCase()

  // The system of record for identity-shaped fields is the one the record was
  // ingested from; anything the platform derived carries the platform instead.
  const fromSource = (label: string, iconName: string, value: string) => ({
    label, iconName, value,
    system: c.source.label, systemAbbr: abbr,
    modelVersion: c.type === "employee" ? "UEP v2.3" : "UCP v2.1",
    syncedAgo: "2h ago",
    masked: restricted,
  })
  const fromPlatform = (label: string, iconName: string, value: string) => ({
    label, iconName, value,
    system: "Helix Data Studio", systemAbbr: "HX",
    modelVersion: "Knowledge v1.4",
    syncedAgo: "18m ago",
    // Counts are structural, not personal: how many facts exist is not a
    // governed value, and hiding it would misrepresent what the tenant holds.
    masked: false,
  })

  return [
    fromSource(c.type === "company" ? "Profile" : "Role", "Info", c.subtitle),
    fromSource("Account owner", "UserRound", c.owner),
    fromSource("Last interaction", "Clock", c.lastInteraction),
    fromPlatform(
      "Verified facts",
      "ShieldCheck",
      `${getFacts(c).filter(f => f.plane === "truth").length} on the Truth plane`,
    ),
    fromPlatform("Source Drives", "HardDrive", `${getDrives(c).length} attached`),
  ]
}

// ── Knowledge planes ──────────────────────────────────────────────────────────

export type KnowledgePlane = "truth" | "sandbox" | "sources"

export const PLANE_META: Record<KnowledgePlane, {
  label:      string
  confidence: string
  tag:        TagVariantLite
  blurb:      string
}> = {
  truth:   { label: "Truth",   confidence: "100%", tag: "success",     blurb: "Verified facts. Agents treat these as absolute truth." },
  sandbox: { label: "Sandbox", confidence: "~80%", tag: "alert",       blurb: "Unverified claims and drafts. Likely true, not guaranteed." },
  sources: { label: "Sources", confidence: "~60%", tag: "informative", blurb: "Raw documents and reference material, used for lookup and citation." },
}

export const PLANE_ORDER: KnowledgePlane[] = ["truth", "sandbox", "sources"]

/**
 * ── The Governance vocabulary ──────────────────────────────────────────────
 *
 * Read off the real Governance views on 2026-09-10 (Fuentes/Drive, Plano de
 * verdad, Sandbox), not invented for this prototype. Michael's instruction was
 * to take the FILTER INFORMATION and leave their UI alone, so these are the
 * option sets, translated to the language this screen is in:
 *
 *   Drives       Modificar → All · Today · Yesterday · Last 7 days ·
 *                Last 30 days · Older     +  Todos los departamentos
 *   Truth Plane  Estado → Verified · Pending review · Due to expire
 *                Nivel de riesgo → Low · Medium · High
 *                Atención requerida → Due to expire · Needs review ·
 *                Has proposals
 *   Sandbox      Todos los estados → Active · Archived
 *                Todos los ámbitos → Private · Shared · Workspace ·
 *                Department · System
 *
 * ONE DIFFERENCE WORTH KNOWING: in Governance these filter a list of PLANES —
 * "BK Ramos 08-07-26 · Hechos: 6 · Propuestas: 244 · Riesgo bajo". Here the
 * shelves list the facts and claims of ONE record, so the same vocabulary is
 * applied one level down, to the items themselves. The words are theirs; the
 * scope is this record's.
 */
export const DRIVE_MODIFIED_OPTIONS = ["Today", "Yesterday", "Last 7 days", "Last 30 days", "Older"]
export const TRUTH_STATUSES         = ["Verified", "Pending review", "Due to expire"]
export const RISK_LEVELS            = ["Low", "Medium", "High"]
export const ATTENTION_FLAGS        = ["Due to expire", "Needs review", "Has proposals"]
export const SANDBOX_STATES         = ["Active", "Archived"]
export const SANDBOX_SCOPES         = ["Private", "Shared", "Workspace", "Department", "System"]

export interface UcpFact {
  id:         string
  label:      string
  value:      string
  plane:      KnowledgePlane
  source:     string
  verifiedAt: string
  /** Governance's own three axes, filled by `getFacts` — see `governFact`. */
  status:     string
  risk:       string
  attention:  string[]
  /** Sandbox's two: what state the claim is in and how far it reaches. */
  state:      string
  scope:      string
}

// ── Activity ──────────────────────────────────────────────────────────────────

/**
 * ── What an Activity row can be ────────────────────────────────────────────
 *
 * Michael's taxonomy, 2026-09-10:
 *
 *   Communications   email, SMS, calls — and meetings, see below
 *   Notes            what somebody wrote down
 *   Events           workflows that fired
 *   Tasks            work to do, tied to the next best action
 *
 * The channel is the LEAF; `CHANNEL_GROUP` says which of the four it belongs
 * to. Two levels rather than one flat list because a flat row of seven chips
 * plus "All" is a filter nobody reads — the four groups are the chips, and
 * the communication kinds are a dropdown that only appears while
 * Communications is the selected group.
 *
 * MEETINGS ARE A COMMUNICATION, and they are the one kind Michael's list did
 * not name. The fixtures carry a QBR and a security working session: a
 * meeting is not a workflow that fired and it is not a note, so filing it
 * under Events would have been false and deleting it would have been worse.
 * It joins email, SMS and calls rather than displacing any of them.
 */
export type ActivityChannel =
  | "call" | "email" | "sms" | "meeting"
  | "note" | "event" | "task"

export type ActivityGroup = "communication" | "note" | "event" | "task"

export const ACTIVITY_GROUPS: { id: ActivityGroup; label: string }[] = [
  { id: "communication", label: "Communications" },
  { id: "note",          label: "Notes"          },
  { id: "event",         label: "Events"         },
  { id: "task",          label: "Tasks"          },
]

export const CHANNEL_GROUP: Record<ActivityChannel, ActivityGroup> = {
  call: "communication", email: "communication", sms: "communication", meeting: "communication",
  note: "note", event: "event", task: "task",
}

export const CHANNEL_META: Record<ActivityChannel, { label: string; icon: string }> = {
  call:    { label: "Calls",    icon: "Phone"        },
  email:   { label: "Email",    icon: "Mail"         },
  sms:     { label: "SMS",      icon: "MessageSquare"},
  meeting: { label: "Meetings", icon: "Users"        },
  note:    { label: "Notes",    icon: "StickyNote"   },
  event:   { label: "Events",   icon: "Zap"          },
  task:    { label: "Tasks",    icon: "ListChecks"   },
}

/** The communication kinds, for the dropdown that refines that group. */
export const COMMUNICATION_CHANNELS: ActivityChannel[] =
  (Object.keys(CHANNEL_GROUP) as ActivityChannel[]).filter(ch => CHANNEL_GROUP[ch] === "communication")

/**
 * ── A note, in full ────────────────────────────────────────────────────────
 *
 * An activity row can only ever show a note's FIRST line — it is one row in a
 * feed of thirteen. The note itself is what somebody actually wrote, and the
 * reason it matters on this record is what the note DID: the claims it put
 * into the Sandbox plane, waiting for a source to corroborate them.
 *
 * So the preview carries three things the row cannot:
 *
 *   · the body, as written, paragraph by paragraph
 *   · what it produced — claims, each with the Governance status it now has
 *   · where it came from and who can see it, in Governance's own words
 *
 * `scope` is deliberately from SANDBOX_SCOPES rather than a scale of this
 * panel's own invention. A note is a Sandbox artefact: whoever reads
 * "Department" here has read the same word on the Sandbox shelf's Scope
 * filter, and it means the same thing in both places.
 */
export interface UcpNote {
  /** Paragraphs, in order. Rendered as written — never summarised in place. */
  body:       string[]
  author:     string
  authorRole: string
  createdAt:  string
  /** Absent when the note has never been edited, which is the common case —
   *  an "Edited" row that says "never" is a row saying nothing. */
  editedAt?:  string
  /** Where it was written: a call wrap-up, a meeting, the record itself. */
  writtenIn:  string
  /** One of SANDBOX_SCOPES. Who can see this note. */
  scope:      string
  /** Claims this note put into the Sandbox plane, with the status each one
   *  now carries — the same three words the Truth shelf filters on. */
  claims:     { label: string; status: string }[]
  /** Records the note names and is linked to. */
  linked:     { title: string; kind: string; icon: string }[]
  attachments: { name: string; meta: string }[]
  /**
   * Comments left ON the note, by people other than its author — Michael,
   * 2026-09-11: "con la opción de dejar comentarios también en las notas y
   * ver que otros comentarios han agregado."
   *
   * A comment is NOT a claim and never becomes one. A claim is something the
   * note asserts about the record, and it goes to the Sandbox plane to be
   * sourced; a comment is a colleague talking to the author about the note.
   * Keeping them apart is the whole reason this is its own field rather than
   * a fourth paragraph appended to `body` — the moment a comment could reach
   * Truth, every aside in the thread would be a governed fact.
   */
  comments:   { author: string; role: string; at: string; text: string }[]
}

export interface UcpActivity {
  id:        string
  channel:   ActivityChannel
  title:     string
  meta:      string
  timestamp: string
  state:     { label: string; variant: TagVariantLite }
  /** Written by the record's assigned agent — rendered as EntityList's aiInsight. */
  aiSummary?: string
  /**
   * ── The fields Thom's voice-channel rows carry ───────────────────────────
   *
   * Michael, 2026-09-11: apply the CONTENT of that prototype's items to this
   * list — the components and the layout stay exactly as they are.
   *
   * Read off src/screens/voice-channel/ucp-data.ts rather than the deployed
   * page, since it is the same repo. Three things its rows have and ours did
   * not, and each one answers a question ours left open:
   *
   *   metaChips  "4:12 · Sammy · 2 tools used" — what it cost and who or what
   *              handled it. Ours said a call happened and never said whether
   *              an agent or a person took it.
   *   smsBody    the message, verbatim. An SMS is short enough to read in
   *              full, and a row that summarises two sentences has summarised
   *              nothing.
   *   sentiment  how it went, on calls only. Distinct from the badge, which
   *              is what HAPPENED — a call can be Resolved and still tense.
   *
   * They land in slots EntityList already publishes: `secondaryMeta`,
   * `description` and `tags`. No new component, no new prop.
   */
  metaChips?: string[]
  /** Verbatim, for SMS. Rendered through EntityList's own `description`. */
  smsBody?:   string
  sentiment?: "positive" | "neutral" | "negative"
  /** Only on note rows, and only when there is a note to open. The Eye is
   *  rendered off THIS, not off the channel: CLAUDE.md's rule is that a
   *  preview button with nothing behind it is worse than no button. */
  note?:     UcpNote
}

/**
 * ── Elapsed time, for the Activity list ────────────────────────────────────
 *
 * The fixtures carry timestamps in three shapes, because that is what a real
 * feed looks like: relative for anything recent ("30m ago", "3d ago"), the
 * word Today for the same day at a known hour ("Today, 08:12"), and an
 * absolute date once it stops being recent ("Aug 18, 2026 · 07:55"). One
 * parser reads all three so the grouping cannot disagree with the label the
 * row itself shows.
 *
 * `now` is injected rather than read from the clock inside these functions —
 * a list that regroups itself mid-render because a minute ticked over is a
 * bug, and a caller that memoises on `now` gets a stable list.
 */
export function parseActivityAt(timestamp: string, now: Date): Date | null {
  const rel = timestamp.match(/^(\d+)\s*([mhd])\s+ago$/i)
  if (rel) {
    const n = Number(rel[1])
    const ms = rel[2].toLowerCase() === "m" ? 60_000 : rel[2].toLowerCase() === "h" ? 3_600_000 : 86_400_000
    return new Date(now.getTime() - n * ms)
  }
  const today = timestamp.match(/^Today,\s*(\d{1,2}):(\d{2})/i)
  if (today) {
    const d = new Date(now)
    d.setHours(Number(today[1]), Number(today[2]), 0, 0)
    return d
  }
  // "Aug 18, 2026 · 07:55" — the date half is what matters for grouping.
  const parsed = new Date(timestamp.split("·")[0].trim())
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/** Whole days between two instants, by calendar day rather than by 24h blocks:
 *  something logged at 23:00 yesterday is YESTERDAY at 08:00 today, not today. */
function daysBetween(then: Date, now: Date): number {
  const a = new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime()
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.round((b - a) / 86_400_000)
}

/**
 * The separator label for a row's age — ALL CAPS, because that is what the
 * DS's own date-group label is (Notification Center: "TODAY / YESTERDAY /
 * EARLIER", Caption S Bold) and because Caption S Bold is documented as
 * all-caps only.
 *
 * The ladder is deliberately coarse at the far end: past a couple of months
 * nobody is counting weeks, and a separator per month would out-number the
 * rows it separates.
 */
export function elapsedGroupLabel(at: Date | null, now: Date): string {
  if (!at) return "UNDATED"
  const days = daysBetween(at, now)
  if (days <= 0)   return "TODAY"
  if (days === 1)  return "YESTERDAY"
  if (days < 7)    return "EARLIER THIS WEEK"
  if (days < 14)   return "A WEEK AGO"
  if (days < 30)   return `${Math.floor(days / 7)} WEEKS AGO`
  if (days < 60)   return "A MONTH AGO"
  if (days < 365)  return `${Math.round(days / 30)} MONTHS AGO`
  if (days < 730)  return "A YEAR AGO"
  return `${Math.floor(days / 365)} YEARS AGO`
}

/** The options the Activity period filter offers, and what each one means.
 *  Kept together so the label a user picks and the window it applies are one
 *  fact rather than two that can drift. */
export const ACTIVITY_PERIODS: { label: string; days: number }[] = [
  { label: "Today",        days: 0   },
  { label: "Last 7 days",  days: 7   },
  { label: "Last 30 days", days: 30  },
  { label: "Last 90 days", days: 90  },
]

export function withinPeriod(at: Date | null, periodLabel: string | undefined, now: Date): boolean {
  if (!periodLabel) return true
  const period = ACTIVITY_PERIODS.find(p => p.label === periodLabel)
  if (!period) return true
  if (!at) return false
  return daysBetween(at, now) <= period.days
}

// ── Source Drives ─────────────────────────────────────────────────────────────

export interface UcpDrive {
  id:       string
  name:     string
  /** Governance's "Todos los departamentos" filter runs on this. */
  department: string
  kind:     "Drive" | "Folder" | "Document"
  provider: string
  items:    string
  owner:    string
  lastSync: string
  scope:    string
  state:    { label: string; variant: TagVariantLite }
}

// ── Connections ───────────────────────────────────────────────────────────────

export interface UcpConnection {
  id:       string
  name:     string
  relation: string
  icon:     string
  /** Why this person is on the record. Shown on hover and on focus. */
  tooltip:  string
}

/**
 * A relationship the tenant recorded explicitly — family, and anything else a
 * derivation cannot know. It points at ANOTHER RECORD by id, never at a name:
 * a relation to somebody who is not a record in AIMS has no data behind it, so
 * `getConnections` drops it rather than rendering the label on its own.
 */
export interface UcpRelation {
  id:       string
  relation: string
}

// ── Contacts ──────────────────────────────────────────────────────────────────
export const CONTACTS: UcpContact[] = [
  {
    id: "ORG-0023", type: "company", name: "Meridian Corp",
    subtitle: "Financial Services · 2,400 employees · New York",
    email: "accounts@meridian.com", phone: "+1 (212) 555-0142", company: "Meridian Corp",
    owner: "Priya Nair", status: "Active", lastInteraction: "Aug 22, 2026",
    source: { label: "Salesforce", iconName: "Cloud" },
    tags: [
      { label: "Renewal at risk", role: "signal", tone: "alert", severity: 3, tooltip: "Health dropped to 61 · renews Sep 5" },
      { label: "Enterprise",      role: "classification" },
    ],
    meta: [
      { iconName: "ShieldCheck", label: "11 facts",     tooltip: "Verified facts · 5 on the Truth plane, 6 across Sandbox and Sources." },
      { iconName: "Inbox",       label: "3 open",       tooltip: "Open items · 3 support escalations, oldest opened Jul 14." },
      { iconName: "HardDrive",   label: "6 drives",     tooltip: "Source Drives · 6 attached, 1 failing to sync since Aug 26." },
      { iconName: "Bot",         label: "Tier 1",       tooltip: "Assigned agent · Meridian Concierge, tier 1. Handling this account since Mar 3." },
    ],
    agent: { id: "AGT-01", name: "Meridian Concierge" },
    nba: {
      title: "Run the renewal outreach workflow",
      timestamp: "2h ago",
      rationale: "Usage grew 18% but three escalations are open and no proposal has been sent. The master agreement renews in 12 days.",
    },
    insights: [
      {
        id: "read-1", category: "Renewal", destination: "Workflows",
        headline: "Renewal at risk — usage is up, sentiment is down.",
        detail: "Seat usage grew 18% this quarter but three support escalations opened since July, all routing through the same integration. Sandra Torres has asked twice about the migration timeline without a written answer. The renewal call is the place to close that gap.",
        confidence: 82,
      },
      {
        id: "read-2", category: "Governance", destination: "Knowledge",
        headline: "The integration is the common thread in all three escalations.",
        detail: "Every escalation since July routes through the same integration, and the DPA on file predates it. Governance has one open review; closing it removes the blocker the renewal call would otherwise inherit.",
        confidence: 74,
      },
    ],
    governance: "loaded", risk: "loaded", connections: "loaded",
  },
  {
    id: "PER-0091", type: "person", name: "Sarah Chen",
    subtitle: "Head of Compliance · Legal · Meridian Corp",
    email: "sarah.chen@meridian.com", phone: "+1 (212) 555-0188", company: "Meridian Corp",
    owner: "Priya Nair", status: "Active", lastInteraction: "Aug 28, 2026",
    source: { label: "Salesforce", iconName: "Cloud" },
    tags: [
      { label: "Awaiting review", role: "signal", tone: "neutral", severity: 1, tooltip: "Governance addendum sent Aug 28 · no response due yet" },
      { label: "Evaluator",       role: "classification" },
    ],
    meta: [
      { iconName: "ShieldCheck", label: "10 facts", tooltip: "Verified facts · 5 on the Truth plane, 5 across Sandbox and Sources." },
      { iconName: "Inbox",       label: "1 open",   tooltip: "Open items · governance addendum awaiting her review." },
      { iconName: "Calendar",    label: "Since Jun", tooltip: "First interaction · June 9, 2026, via the account expansion." },
      { iconName: "Bot",         label: "Tier 1",   tooltip: "Assigned agent · Deal Concierge, tier 1. Handling this contact since Jun 9." },
    ],
    agent: { id: "AGT-02", name: "Deal Concierge" },
    relations: [{ id: "PER-0128", relation: "Family · sister" }],
    nba: null,
    insights: [
      {
        id: "read-1", category: "Deal", destination: "Knowledge",
        headline: "Technical evaluator, not the economic buyer.",
        detail: "Sarah has driven every compliance question on the Meridian expansion and cleared the data-residency review herself. She has never discussed price. Route commercial terms to Sandra Torres and keep Sarah on audit evidence.",
        confidence: 76,
      },
    ],
    governance: "loaded", risk: "empty", connections: "loaded",
  },
  {
    id: "EMP-00412", type: "employee", name: "James Ortega",
    subtitle: "Senior Operations Lead · Operations · Phoenix, AZ",
    email: "james.ortega@acme.com", phone: "+1 (602) 555-0100", company: "Acme Corp",
    owner: "Lisa Park", status: "Active", lastInteraction: "Sep 1, 2026",
    source: { label: "Workday", iconName: "Building" },
    tags: [
      { label: "Review overdue", role: "signal", tone: "alert", severity: 3, tooltip: "Mid-year review with Lisa Park since Aug 20 · 12 days open" },
    ],
    meta: [
      { iconName: "ShieldCheck", label: "9 facts",   tooltip: "Verified facts · 5 on the Truth plane, 4 across Sandbox and Sources." },
      { iconName: "Inbox",       label: "1 open",    tooltip: "Open items · mid-year performance review awaiting approval." },
      { iconName: "KeyRound",    label: "Standard",  tooltip: "Access role · Standard, Operations scope. Unchanged since Aug 14." },
      { iconName: "Calendar",    label: "4y 8m",     tooltip: "Tenure · started Jan 12, 2022." },
      { iconName: "Bot",         label: "Tier 2",    tooltip: "Assigned agent · People Concierge, tier 2." },
    ],
    agent: { id: "AGT-03", name: "People Concierge" },
    relations: [{ id: "PER-0091", relation: "Family · sister" }],
    nba: {
      title: "Escalate the overdue performance review",
      timestamp: "6h ago",
      rationale: "The mid-year review has sat with Lisa Park for 12 days and blocks his promotion cycle, which closes at the end of the month.",
    },
    insights: [
      {
        id: "read-1", category: "People", destination: "Workflows",
        headline: "Consistent operator, overdue on one approval.",
        detail: "James has closed every quarterly governance check on time for six quarters. The one open item is his mid-year review, waiting on Lisa Park since Aug 20. Nothing else on this record needs attention.",
        confidence: 91,
      },
    ],
    governance: "loaded", risk: "loaded", connections: "error",
  },
  {
    id: "ORG-0031", type: "company", name: "Northwind Health",
    subtitle: "Healthcare · 5,100 employees · Phoenix, AZ",
    email: "partnerships@northwindhealth.org", phone: "+1 (602) 555-0177", company: "Northwind Health",
    owner: "Daniel Ruiz", status: "Active", lastInteraction: "Aug 30, 2026",
    source: { label: "Epic", iconName: "Cross" },
    tags: [
      { label: "Sync pending", role: "signal", tone: "alert", severity: 2, tooltip: "2 of 5 new clinic sites have not completed network sync" },
      { label: "Enterprise",   role: "classification" },
    ],
    meta: [
      { iconName: "ShieldCheck", label: "11 facts",  tooltip: "Verified facts · 5 on the Truth plane, 6 across Sandbox and Sources." },
      { iconName: "MapPin",      label: "5 sites",   tooltip: "Locations · 5 clinics added under the Aug 30 expansion." },
      { iconName: "HardDrive",   label: "6 drives",  tooltip: "Source Drives · 6 attached, all syncing." },
      { iconName: "Bot",         label: "Tier 1",    tooltip: "Assigned agent · Northwind Concierge, tier 1." },
    ],
    agent: { id: "AGT-04", name: "Northwind Concierge" },
    nba: {
      title: "Finish network sync for two clinic sites",
      timestamp: "1d ago",
      rationale: "Two of the five clinics added on Aug 30 are still unsynced, so their staff cannot reach the platform and the expansion is not fully live.",
    },
    insights: [
      {
        id: "read-1", category: "Expansion",
        headline: "Healthy account, expanding on its own initiative.",
        detail: "Northwind added five clinic sites without a discount request. Two of the five have not completed network sync, which is an onboarding task rather than a commercial risk.",
        confidence: 88,
      },
    ],
    governance: "loaded", risk: "loaded", connections: "loaded",
  },
  {
    id: "PER-0104", type: "person", name: "Sandra Torres",
    subtitle: "VP of Operations · Meridian Corp",
    email: "sandra.torres@meridian.com", phone: "+1 (212) 555-0155", company: "Meridian Corp",
    owner: "Priya Nair", status: "Active", lastInteraction: "Sep 2, 2026",
    source: { label: "Salesforce", iconName: "Cloud" },
    /* TWO TAGS CAME OFF HERE on 2026-09-11, both duplicates rather than
       decoration. "Awaiting us" is a SIGNAL, and signals are a block in
       Intelligence with a duration and an evidence link — the header pill said
       the same word with neither. "Buyer" is a decision role, and the Profile
       block now names it properly as "Economic Buyer"; two taxonomies for one
       fact is how a reader ends up unsure which is authoritative. */
    tags: [],
    meta: [
      { iconName: "ShieldCheck", label: "10 facts",  tooltip: "Verified facts · 5 on the Truth plane, 5 across Sandbox and Sources." },
      { iconName: "Inbox",       label: "1 open",    tooltip: "Open items · migration timeline request, unanswered for 15 days." },
      { iconName: "Briefcase",   label: "$480K",     tooltip: "Deal value · Enterprise Renewal 2026, closes Sep 5." },
      { iconName: "Bot",         label: "Tier 1",    tooltip: "Assigned agent · Deal Concierge, tier 1." },
    ],
    agent: { id: "AGT-02", name: "Deal Concierge" },
    nba: {
      title: "Send the migration timeline she asked for",
      timestamp: "30m ago",
      rationale: "She has raised it on the last two calls without a written answer, and she owns the budget line on a renewal that closes in 12 days.",
      variant: "accept",
    },
    insights: [
      {
        id: "read-1", category: "Renewal", destination: "Workflows",
        headline: "Economic buyer on the Meridian renewal.",
        detail: "Sandra owns the budget line and has raised the migration timeline in the last two calls without getting a written answer. That single open question is the strongest predictor of how the renewal lands.",
        confidence: 84,
      },
      {
        id: "read-2", category: "Governance", destination: "Knowledge",
        headline: "Her budget authority is recorded, not inferred.",
        detail: "The Truth plane carries her as the approver on the Meridian expansion, sourced from the countersigned contract. Nothing needs to be verified before treating her as the decision point.",
        confidence: 88,
      },
    ],
    governance: "empty", risk: "loaded", connections: "loaded",
  },
  {
    id: "EMP-00518", type: "employee", name: "Lisa Park",
    subtitle: "Director of Operations · Operations · Phoenix, AZ",
    email: "lisa.park@acme.com", phone: "+1 (602) 555-0121", company: "Acme Corp",
    owner: "Marcus Webb", status: "Active", lastInteraction: "Sep 1, 2026",
    source: { label: "Workday", iconName: "Building" },
    tags: [
      { label: "3 approvals due", role: "signal", tone: "alert", severity: 3, tooltip: "Oldest has been queued for 12 days" },
      { label: "Manager",         role: "classification" },
    ],
    meta: [
      { iconName: "ShieldCheck", label: "9 facts",  tooltip: "Verified facts · 5 on the Truth plane, 4 across Sandbox and Sources." },
      { iconName: "Inbox",       label: "3 open",   tooltip: "Open items · 3 reviews queued for her approval." },
      { iconName: "Users",       label: "9 reports", tooltip: "Direct reports · 9 across Operations." },
      { iconName: "KeyRound",    label: "Manager",  tooltip: "Access role · Manager, Operations scope." },
    ],
    agent: { id: "AGT-03", name: "People Concierge" },
    relations: [{ id: "PER-0112", relation: "Family · sibling" }],
    nba: {
      title: "Clear the three reviews in her queue",
      timestamp: "4h ago",
      rationale: "Three reviews are waiting on her approval and the oldest has been open 12 days, which is holding up two promotion cycles.",
    },
    insights: [
      {
        id: "read-1", category: "People", destination: "Workflows",
        headline: "Approval queue is the bottleneck, not her workload.",
        detail: "Lisa manages nine reports and has three reviews queued, the oldest open 12 days. Her own governance and policy items are all current.",
        confidence: 79,
      },
      {
        id: "read-2", category: "Risk",
        headline: "The queue is a process problem, not a capacity one.",
        detail: "Her open items are all approvals waiting on her, while her own workload sits at the team median. The bottleneck is the routing rule, which is why adding headcount would not move it.",
        confidence: 77,
      },
    ],
    governance: "loaded", risk: "empty", connections: "loaded",
  },
  {
    id: "PER-0112", type: "person", name: "David Park",
    subtitle: "IT Director · Meridian Corp",
    email: "david.park@meridian.com", phone: "+1 (212) 555-0163", company: "Meridian Corp",
    owner: "Daniel Ruiz", status: "Active", lastInteraction: "Aug 19, 2026",
    source: { label: "Salesforce", iconName: "Cloud" },
    tags: [
      { label: "Technical", role: "classification" },
    ],
    meta: [
      { iconName: "ShieldCheck", label: "10 facts", tooltip: "Verified facts · 5 on the Truth plane, 5 across Sandbox and Sources." },
      { iconName: "CheckCheck",  label: "Cleared",  tooltip: "Reviews · signed off SSO and data residency in July. Nothing open." },
      { iconName: "Bot",         label: "Tier 1",   tooltip: "Assigned agent · Deal Concierge, tier 1." },
    ],
    agent: { id: "AGT-02", name: "Deal Concierge" },
    relations: [{ id: "EMP-00518", relation: "Family · sibling" }],
    nba: null,
    insights: [
      {
        id: "read-1", category: "Deal", destination: "Knowledge",
        headline: "Technical gatekeeper, currently unblocked.",
        detail: "David signed off on the SSO and data-residency reviews in July. No open questions since. He is the right contact if the migration timeline turns into an implementation plan.",
        confidence: 71,
      },
      {
        id: "read-2", category: "Service", destination: "Workflows",
        headline: "Unblocked now, but he owns both remaining gates.",
        detail: "The data-residency review cleared last week and the two open technical gates are both assigned to him. If he goes quiet, nothing behind him moves.",
        confidence: 73,
      },
    ],
    governance: "loaded", risk: "empty", connections: "loaded",
  },
  {
    id: "ORG-0044", type: "company", name: "Kestrel Logistics",
    subtitle: "Transportation · 890 employees · Dallas, TX",
    email: "hello@kestrellogistics.com", phone: "+1 (214) 555-0190", company: "Kestrel Logistics",
    owner: "Daniel Ruiz", status: "Inactive", lastInteraction: "Jun 14, 2026",
    stateBadge: { label: "Dormant", variant: "alert" },
    source: { label: "HubSpot", iconName: "Magnet" },
    tags: [
      { label: "80d no contact", role: "signal", tone: "error", severity: 4, tooltip: "Last interaction Jun 14, when the pilot closed" },
      { label: "Inactive",       role: "signal", tone: "neutral", severity: 1, tooltip: "Lifecycle · moved to inactive Jul 1" },
    ],
    meta: [
      { iconName: "ShieldCheck", label: "11 facts", tooltip: "Verified facts · 5 on the Truth plane, 6 across Sandbox and Sources." },
      { iconName: "CircleCheck", label: "Pilot ok", tooltip: "Pilot outcome · completed Jun 14 with all success criteria met." },
      { iconName: "Bot",         label: "Tier 3",   tooltip: "Assigned agent · Kestrel Concierge, tier 3 since the account went dormant." },
    ],
    agent: { id: "AGT-05", name: "Kestrel Concierge" },
    nba: {
      title: "Open a re-engagement on the closed pilot",
      timestamp: "3d ago",
      rationale: "The pilot met every success criterion and then contact stopped without a churn signal, which usually means a sponsor change rather than a loss.",
    },
    insights: [
      {
        id: "read-1", category: "Retention", destination: "Activity",
        headline: "Dormant since the pilot closed, no stated reason.",
        detail: "The pilot completed with all success criteria met, then contact stopped. No churn signal was ever recorded, which usually means a sponsor change rather than a lost deal.",
        confidence: 64,
      },
    ],
    governance: "empty", risk: "loaded", connections: "empty",
  },
  {
    id: "EMP-00623", type: "employee", name: "Marcus Webb",
    subtitle: "VP of Operations · Operations · Remote",
    email: "marcus.webb@acme.com", phone: "+1 (602) 555-0134", company: "Acme Corp",
    owner: "Elena Fischer", status: "Active", lastInteraction: "Aug 27, 2026",
    source: { label: "Workday", iconName: "Building" },
    tags: [
      { label: "Manager",  role: "classification" },
    ],
    meta: [
      { iconName: "ShieldCheck", label: "9 facts",  tooltip: "Verified facts · 5 on the Truth plane, 4 across Sandbox and Sources." },
      { iconName: "CheckCheck",  label: "Cleared",  tooltip: "Approval queue · cleared Aug 27, nothing pending." },
      { iconName: "FileCheck2",  label: "12 of 12", tooltip: "Policies signed · all 12, latest Data Handling v2.1." },
      { iconName: "KeyRound",    label: "Exec",     tooltip: "Access role · Executive, Operations scope." },
    ],
    agent: { id: "AGT-03", name: "People Concierge" },
    nba: null,
    insights: [
      {
        id: "read-1", category: "People",
        headline: "Clear queue, current on every policy.",
        detail: "Marcus cleared his approval queue on Aug 27 and has all twelve policies signed. Nothing on this record needs a decision this week.",
        confidence: 86,
      },
    ],
    governance: "loaded", risk: "loaded", connections: "loaded",
  },
  {
    id: "PER-0128", type: "person", name: "Amy Chen",
    subtitle: "CFO · Meridian Corp",
    email: "amy.chen@meridian.com", phone: "+1 (212) 555-0171", company: "Meridian Corp",
    owner: "Priya Nair", status: "Inactive", lastInteraction: "Apr 3, 2026",
    stateBadge: { label: "Superseded", variant: "neutral" },
    source: { label: "Salesforce", iconName: "Cloud" },
    // The only scope-gated record in the set: she is the CFO, so her values sit
    // behind finance.read, which the PM viewing this prototype does not hold.
    requiredScope: "finance.read",
    tags: [
      { label: "Inactive", role: "signal", tone: "neutral", severity: 1, tooltip: "Lifecycle · marked inactive Apr 3" },
    ],
    meta: [
      { iconName: "ShieldCheck", label: "10 facts",  tooltip: "Verified facts · 5 on the Truth plane, 5 across Sandbox and Sources." },
      { iconName: "FileText",    label: "2024 MSA",  tooltip: "Contract history · approved the original Meridian agreement in 2024." },
      { iconName: "UserRound",   label: "S. Torres", tooltip: "Superseded by · Sandra Torres, finance approvals since April." },
    ],
    agent: { id: "AGT-02", name: "Deal Concierge" },
    nba: null,
    insights: [
      {
        id: "read-1", category: "Governance", destination: "Knowledge",
        headline: "Superseded as the finance contact.",
        detail: "Amy approved the original Meridian contract in 2024. Finance approvals have routed through Sandra Torres since April. Keep the record for contract history.",
        confidence: 69,
      },
    ],
    governance: "empty", risk: "empty", connections: "loaded",
  },
  {
    id: "ORG-0052", type: "company", name: "Halden Manufacturing",
    subtitle: "Industrial · 1,600 employees · Cleveland, OH",
    email: "ops@halden-mfg.com", phone: "+1 (216) 555-0118", company: "Halden Manufacturing",
    owner: "Elena Fischer", status: "Active", lastInteraction: "Aug 25, 2026",
    stateBadge: { label: "Under review", variant: "informative" },
    source: { label: "NetSuite", iconName: "Boxes" },
    tags: [
      { label: "2 checks open", role: "signal", tone: "alert", severity: 2, tooltip: "Network segmentation evidence and sub-processor list · target Sep 12" },
    ],
    meta: [
      { iconName: "ShieldCheck", label: "11 facts", tooltip: "Verified facts · 5 on the Truth plane, 6 across Sandbox and Sources." },
      { iconName: "ClipboardList", label: "4 of 6", tooltip: "Security review · 4 of 6 checks cleared, target Sep 12." },
      { iconName: "HardDrive",   label: "6 drives", tooltip: "Source Drives · 6 attached, 1 failing to sync." },
      { iconName: "Bot",         label: "Tier 2",   tooltip: "Assigned agent · Halden Concierge, tier 2." },
    ],
    agent: { id: "AGT-06", name: "Halden Concierge" },
    nba: {
      title: "Send the two open security-review items",
      timestamp: "1d ago",
      rationale: "Four of six checks have cleared and the remaining two sit with Halden, who have answered every prior request within two business days.",
    },
    insights: [
      {
        id: "read-1", category: "Governance", destination: "Knowledge",
        headline: "Mid-review, on schedule.",
        detail: "Four of six security checks have cleared. The two open items are network segmentation evidence and the sub-processor list, both assigned to Halden's side.",
        confidence: 74,
      },
    ],
    governance: "loaded", risk: "loaded", connections: "empty",
  },
  {
    id: "PER-0133", type: "person", name: "Tomás Ferreira",
    subtitle: "Head of Data Platform · Halden Manufacturing",
    email: "tomas.ferreira@halden-mfg.com", phone: "+1 (216) 555-0126", company: "Halden Manufacturing",
    owner: "Elena Fischer", status: "Active", lastInteraction: "Aug 25, 2026",
    source: { label: "NetSuite", iconName: "Boxes" },
    tags: [
      { label: "Owns 2 blockers", role: "signal", tone: "alert", severity: 3, tooltip: "Network segmentation evidence and sub-processor list · target Sep 12" },
      { label: "Technical",      role: "classification" },
    ],
    meta: [
      { iconName: "ShieldCheck", label: "10 facts", tooltip: "Verified facts · 5 on the Truth plane, 5 across Sandbox and Sources." },
      { iconName: "Inbox",       label: "2 open",   tooltip: "Open items · both remaining security-review checks." },
      { iconName: "Clock",       label: "2d reply", tooltip: "Responsiveness · has answered every prior request within two business days." },
      { iconName: "Bot",         label: "Tier 2",   tooltip: "Assigned agent · Halden Concierge, tier 2." },
    ],
    agent: { id: "AGT-06", name: "Halden Concierge" },
    nba: {
      title: "Send Tomás the remaining checklist items",
      timestamp: "1d ago",
      rationale: "He owns both open checks and replies within two business days, so a checklist is likely enough to close the review before Sep 12.",
      variant: "accept",
    },
    insights: [
      {
        id: "read-1", category: "Service", destination: "Workflows",
        headline: "Single owner of both blockers.",
        detail: "Tomás owns network segmentation evidence and the sub-processor list. He has answered every prior request within two business days, so a checklist is likely enough.",
        confidence: 80,
      },
    ],
    governance: "loaded", risk: "empty", connections: "loaded",
  },
  {
    id: "EMP-00701", type: "employee", name: "Elena Fischer",
    subtitle: "Account Director · Revenue · Chicago, IL",
    email: "elena.fischer@acme.com", phone: "+1 (312) 555-0149", company: "Acme Corp",
    owner: "Marcus Webb", status: "Active", lastInteraction: "Sep 2, 2026",
    source: { label: "Workday", iconName: "Building" },
    tags: [
      { label: "Revenue",  role: "classification" },
    ],
    meta: [
      { iconName: "ShieldCheck", label: "9 facts",  tooltip: "Verified facts · 5 on the Truth plane, 4 across Sandbox and Sources." },
      { iconName: "Briefcase",   label: "2 accts",  tooltip: "Owned accounts · Halden Manufacturing and Kestrel Logistics." },
      { iconName: "KeyRound",    label: "Standard", tooltip: "Access role · Standard, Revenue scope." },
      { iconName: "Calendar",    label: "4y 8m",    tooltip: "Tenure · started Jan 12, 2022." },
    ],
    agent: { id: "AGT-03", name: "People Concierge" },
    nba: null,
    insights: [
      {
        id: "read-1", category: "People", destination: "Workflows",
        headline: "Owns two accounts mid-review, no personnel items open.",
        detail: "Elena carries Halden and Kestrel. Both have open account-side work, but nothing on her own employee record requires a decision.",
        confidence: 83,
      },
    ],
    governance: "loaded", risk: "empty", connections: "loaded",
  },
  {
    id: "PER-0147", type: "person", name: "Grace Okafor",
    subtitle: "Chief Nursing Officer · Northwind Health",
    email: "grace.okafor@northwindhealth.org", phone: "+1 (602) 555-0182", company: "Northwind Health",
    owner: "Daniel Ruiz", status: "Active", lastInteraction: "Aug 30, 2026",
    source: { label: "Epic", iconName: "Cross" },
    tags: [
      { label: "Sponsor",  role: "classification" },
    ],
    meta: [
      { iconName: "ShieldCheck", label: "10 facts", tooltip: "Verified facts · 5 on the Truth plane, 5 across Sandbox and Sources." },
      { iconName: "MapPin",      label: "5 sites",  tooltip: "Sponsored expansion · 5 clinic sites signed Aug 30." },
      { iconName: "Bot",         label: "Tier 1",   tooltip: "Assigned agent · Northwind Concierge, tier 1." },
    ],
    agent: { id: "AGT-04", name: "Northwind Concierge" },
    nba: null,
    insights: [
      {
        id: "read-1", category: "Expansion", destination: "Activity",
        headline: "Executive sponsor of the expansion.",
        detail: "Grace drove the five-clinic expansion internally and signed without a discount request. Two clinics still need network sync — an onboarding task her team can close.",
        confidence: 87,
      },
    ],
    governance: "loaded", risk: "empty", connections: "loaded",
  },
  {
    id: "ORG-0067", type: "company", name: "Riverbend Auto Group",
    subtitle: "Automotive Retail · 640 employees · Tampa, FL",
    email: "ops@riverbendauto.com", phone: "+1 (813) 555-0164", company: "Riverbend Auto Group",
    owner: "Daniel Ruiz", status: "Active", lastInteraction: "Sep 1, 2026",
    source: { label: "CDK Global", iconName: "Car" },
    tags: [
      { label: "Service backlog", role: "signal", tone: "alert", severity: 2, tooltip: "41 repair orders open past their promised date across 4 stores" },
      { label: "Multi-site",     role: "classification" },
    ],
    meta: [
      { iconName: "ShieldCheck", label: "11 facts",  tooltip: "Verified facts · 5 on the Truth plane, 6 across Sandbox and Sources." },
      { iconName: "Store",       label: "4 stores",  tooltip: "Locations · 4 dealerships under one master agreement." },
      { iconName: "Wrench",      label: "41 open",   tooltip: "Open repair orders · 41 past their promised date, oldest 9 days." },
      { iconName: "Bot",         label: "Tier 1",    tooltip: "Assigned agent · Riverbend Concierge, tier 1." },
    ],
    agent: { id: "AGT-07", name: "Riverbend Concierge" },
    nba: {
      title: "Rebalance the service load across four stores",
      timestamp: "5h ago",
      rationale: "Tampa North holds 26 of the 41 late repair orders while Brandon runs at 60% bay capacity, so the backlog is routing, not headcount.",
    },
    insights: [
      {
        id: "read-1", category: "Service", destination: "Workflows",
        headline: "Healthy group, one store carrying the backlog.",
        detail: "Riverbend runs four dealerships on one master agreement. Tampa North holds 26 of the 41 late repair orders while Brandon sits at 60% bay capacity — the backlog is a routing problem, not a staffing one, and it is the only thing hurting CSI scores this quarter.",
        confidence: 79,
      },
      {
        id: "read-2", category: "Governance", destination: "Knowledge",
        headline: "Four stores, one master agreement.",
        detail: "The group signs centrally, so a service commitment made for Tampa North applies to all four. The agreement in Drives is the one that governs the backlog conversation.",
        confidence: 71,
      },
    ],
    governance: "loaded", risk: "loaded", connections: "loaded",
  },
  {
    id: "PER-0158", type: "person", name: "Marcus Delgado",
    subtitle: "Fixed Operations Director · Riverbend Auto Group",
    email: "marcus.delgado@riverbendauto.com", phone: "+1 (813) 555-0171", company: "Riverbend Auto Group",
    owner: "Daniel Ruiz", status: "Active", lastInteraction: "Sep 1, 2026",
    source: { label: "CDK Global", iconName: "Car" },
    tags: [
      { label: "Owns the backlog", role: "signal", tone: "alert", severity: 3, tooltip: "Accountable for service throughput across all four stores" },
      { label: "Operator",        role: "classification" },
    ],
    meta: [
      { iconName: "ShieldCheck", label: "10 facts", tooltip: "Verified facts · 5 on the Truth plane, 5 across Sandbox and Sources." },
      { iconName: "Wrench",      label: "41 open",  tooltip: "Open repair orders · every one of them rolls up to him." },
      { iconName: "Clock",       label: "Same day", tooltip: "Responsiveness · replies same day, and prefers a phone call to email." },
      { iconName: "Bot",         label: "Tier 1",   tooltip: "Assigned agent · Riverbend Concierge, tier 1." },
    ],
    agent: { id: "AGT-07", name: "Riverbend Concierge" },
    nba: {
      title: "Walk Marcus through the routing proposal",
      timestamp: "5h ago",
      rationale: "He owns service throughput for all four stores and replies same day, so the rebalance needs his sign-off before it reaches store managers.",
      variant: "accept",
    },
    insights: [
      {
        id: "read-1", category: "Service", destination: "Workflows",
        headline: "Accountable for the one metric that is slipping.",
        detail: "Marcus owns service throughput across all four Riverbend stores, which makes him the decision point on the backlog. He replies same day and prefers a call to email — the routing proposal should reach him by phone, not in writing.",
        confidence: 81,
      },
      {
        id: "read-2", category: "People",
        headline: "He is the only accountable owner across the four stores.",
        detail: "No second name appears on service throughput in any Riverbend record. A routing change he does not agree to has nobody else to escalate to.",
        confidence: 69,
      },
    ],
    governance: "loaded", risk: "empty", connections: "loaded",
  },
// ── Types that are not people ─────────────────────────────────────────────
  // Three of them, two records each, added 2026-09-09 so the roster can be
  // seen at seven types instead of three. They are deliberately NOT
  // person-shaped: a repair order is titled with a code and has no initials,
  // a policy has no company, an asset has a custodian rather than an owner.
  // Everything the screen assumed about contacts shows up here as a bug or as
  // a slot that goes empty, which is the point of having them.
]// ── Per-record collections ────────────────────────────────────────────────────
// Built from the contact itself so every profile reads as that record's own
// data rather than one shared fixture repeated 14 times.

const COMPANY_SIZE = (c: UcpContact) => c.subtitle.split(" · ")[1] ?? "—"
const FIRST_FIELD  = (c: UcpContact) => c.subtitle.split(" · ")[0] ?? "—"

/**
 * Governance's three axes, applied to one fact.
 *
 * DERIVED, and only from things the fact already says about itself — its plane
 * and when it was last verified. That is the honest version: a Truth fact
 * verified last month is verified; one that has gone stale is due to expire;
 * a Sandbox claim has not been reviewed yet. Nothing here is a number somebody
 * made up to fill a filter.
 *
 * The staleness window is 60 days, which is the same order as the Risk study's
 * own "older than 90 days" freshness rule on this record.
 *
 * WHY THE FIXTURE DATES ARE SPREAD ACROSS FOUR MONTHS, and why they must stay
 * that way (2026-09-10). They were all clustered inside one fortnight, which
 * meant nothing was ever stale — so every Truth fact rendered Verified / Low
 * risk and every Sandbox claim Pending review / Medium, and the three
 * Governance filters the Knowledge tab offers each had exactly one value to
 * offer. A filter that cannot change what you see is worse than no filter: it
 * says the axis exists and then proves it does not.
 *
 * The dates are not decoration either. Each one is a fact that plausibly goes
 * stale: a phone number read off an email signature in June, because nobody
 * re-reads a signature; a title from a CRM sync that has not run since May; a
 * priority stated on one call and never corroborated. Do not normalise them.
 */
/** The record's "now". Exported so the preview panel measures attestation
 *  age against the same clock governFact() uses — two clocks is how a fact
 *  reads "Due to expire" in a list and "inside the window" in its own panel. */
export const KNOWLEDGE_NOW = new Date("2026-09-10")

function governFact(f: Omit<UcpFact, "status" | "risk" | "attention" | "state" | "scope">): UcpFact {
  const verified = new Date(f.verifiedAt)
  const days = Number.isNaN(verified.getTime())
    ? 0
    : Math.round((KNOWLEDGE_NOW.getTime() - verified.getTime()) / 86_400_000)
  const stale = days > 60

  const status = f.plane === "truth" ? (stale ? "Due to expire" : "Verified")
    : f.plane === "sandbox" ? "Pending review"
    : "Verified"

  const risk = f.plane === "truth" ? (stale ? "Medium" : "Low")
    : f.plane === "sandbox" ? (stale ? "High" : "Medium")
    : "Low"

  const attention = [
    ...(stale ? ["Due to expire"] : []),
    ...(f.plane === "sandbox" ? ["Needs review"] : []),
    // A claim whose source is a document has something to promote FROM, which
    // is what a proposal is in Governance's sense.
    ...(f.source.startsWith("Shared Drive") || f.source.includes("Studio") ? ["Has proposals"] : []),
  ]

  return {
    ...f,
    status, risk, attention,
    state: "Active",
    // Where the claim reaches. A fact sourced from a shared drive or a studio
    // is workspace-wide; anything read off this record's own traffic is
    // private to it.
    scope: f.source.startsWith("Shared Drive") || f.source.includes("Studio") ? "Workspace"
      : f.source.includes("CRM") || f.source.includes("Workday") || f.source.includes("Billing") ? "Department"
      : "Private",
  }
}

export function getFacts(c: UcpContact): UcpFact[] {
  if (c.type === "company") {
    return ([
      { id: "f1", label: "Legal entity",        value: `${c.name}, Inc.`,           plane: "truth",   source: "Contract · countersigned",            verifiedAt: "Aug 4, 2026"  },
      { id: "f2", label: "Industry",            value: FIRST_FIELD(c),              plane: "truth",   source: "Account record · CRM sync",           verifiedAt: "Aug 4, 2026"  },
      { id: "f3", label: "Headcount",           value: COMPANY_SIZE(c),             plane: "truth",   source: "Account record · CRM sync",           verifiedAt: "Aug 4, 2026"  },
      { id: "f4", label: "Account owner",       value: c.owner,                     plane: "truth",   source: "Territory assignment",                verifiedAt: "Jul 1, 2026"  },
      { id: "f5", label: "Billing contact",     value: c.email,                     plane: "truth",   source: "Billing system",                      verifiedAt: "Aug 4, 2026"  },
      { id: "f6", label: "Budget cycle",        value: "Calendar year, locked in Q4", plane: "sandbox", source: "Governance Studio · draft claim",   verifiedAt: "Aug 22, 2026" },
      { id: "f7", label: "Competing evaluation", value: "Evaluated one other vendor in 2024", plane: "sandbox", source: "Discovery notes",          verifiedAt: "Jun 9, 2026"  },
      { id: "f8", label: "Expansion appetite",  value: "Open to adding sites without a new RFP", plane: "sandbox", source: "Email thread — Aug 18", verifiedAt: "Aug 18, 2026" },
      { id: "f9", label: "Master agreement",    value: `MSA_${c.name.split(" ")[0]}_2026.pdf`, plane: "sources", source: "Shared Drive · Legal",     verifiedAt: "Aug 4, 2026"  },
      { id: "f10", label: "Security questionnaire", value: "SIG Lite, 214 responses", plane: "sources", source: "Shared Drive · Security",           verifiedAt: "Jul 28, 2026" },
      { id: "f11", label: "Org chart",          value: "Slide deck, 3 levels deep",  plane: "sources", source: "Shared Drive · Accounts",            verifiedAt: "May 12, 2026" },
    ] as Omit<UcpFact, "status" | "risk" | "attention" | "state" | "scope">[]).map(governFact)
  }
  if (c.type === "employee") {
    return ([
      { id: "f1", label: "Full name",       value: c.name,                    plane: "truth",   source: "Workday · HRIS sync",        verifiedAt: "Sep 1, 2026"  },
      { id: "f2", label: "Role",            value: FIRST_FIELD(c),            plane: "truth",   source: "Workday · HRIS sync",        verifiedAt: "Sep 1, 2026"  },
      { id: "f3", label: "Work email",      value: c.email,                   plane: "truth",   source: "Identity provider · SSO",    verifiedAt: "Sep 1, 2026"  },
      { id: "f4", label: "Manager",         value: c.owner,                   plane: "truth",   source: "Workday · HRIS sync",        verifiedAt: "Sep 1, 2026"  },
      { id: "f5", label: "Access role",     value: "Standard · Operations",   plane: "truth",   source: "Identity provider · SSO",    verifiedAt: "Jun 14, 2026" },
      { id: "f6", label: "Career interest", value: "Mentioned interest in a platform role", plane: "sandbox", source: "1:1 notes — Aug 5", verifiedAt: "Aug 5, 2026"  },
      { id: "f7", label: "Working pattern", value: "Prefers async review over live meetings", plane: "sandbox", source: "Team retro — Jul 22", verifiedAt: "Jul 22, 2026" },
      { id: "f8", label: "Signed policies", value: "12 of 12, latest Data Handling v2.1", plane: "sources", source: "Governance Studio",  verifiedAt: "Aug 6, 2026"  },
      { id: "f9", label: "Review history",  value: "6 quarters, all completed on time",  plane: "sources", source: "Shared Drive · People", verifiedAt: "Jul 20, 2026" },
    ] as Omit<UcpFact, "status" | "risk" | "attention" | "state" | "scope">[]).map(governFact)
  }
  return ([
    { id: "f1", label: "Full name",        value: c.name,                     plane: "truth",   source: "Account record · CRM sync",   verifiedAt: "Aug 28, 2026" },
    { id: "f2", label: "Title",            value: FIRST_FIELD(c),             plane: "truth",   source: "Account record · CRM sync",   verifiedAt: "May 30, 2026" },
    { id: "f3", label: "Company",          value: c.company,                  plane: "truth",   source: "Account record · CRM sync",   verifiedAt: "Aug 28, 2026" },
    { id: "f4", label: "Email",            value: c.email,                    plane: "truth",   source: "Verified reply — inbound",    verifiedAt: "Aug 28, 2026" },
    { id: "f5", label: "Direct line",      value: c.phone,                    plane: "truth",   source: "Email signature",             verifiedAt: "Jun 24, 2026" },
    { id: "f6", label: "Decision role",    value: "Evaluator, not budget owner", plane: "sandbox", source: "Call notes — Aug 28",      verifiedAt: "Aug 28, 2026" },
    { id: "f7", label: "Stated priority",  value: "Auditability ahead of speed", plane: "sandbox", source: "Call notes — Jun 12",      verifiedAt: "Jun 12, 2026" },
    { id: "f8", label: "Channel preference", value: "Responds fastest to email before 9am ET", plane: "sandbox", source: "Interaction history", verifiedAt: "Aug 28, 2026" },
    { id: "f9", label: "Governance addendum", value: "Addendum_v3_redlined.pdf", plane: "sources", source: "Shared Drive · Legal",     verifiedAt: "Aug 28, 2026" },
    { id: "f10", label: "Meeting transcripts", value: "4 calls, Jun–Aug 2026",  plane: "sources", source: "Communication Hub",        verifiedAt: "Aug 28, 2026" },
  ] as Omit<UcpFact, "status" | "risk" | "attention" | "state" | "scope">[]).map(governFact)
}

export function getActivity(c: UcpContact): UcpActivity[] {
  const who   = c.name.split(" ")[0]
  const agent = c.agent.name
  return [
    /**
     * A TASK, and it is the record's next best action — the two are the same
     * object seen from two places (Michael, 2026-09-10: "Tareas: relacionadas
     * con Next Best Action"). It exists only when the engine has something to
     * recommend, which is why this is spread rather than listed: a record with
     * nothing to do has no open task, and inventing one to fill the group
     * would be inventing work.
     */
    ...(c.nba ? [{
      id: "a0", channel: "task" as ActivityChannel, title: c.nba.title,
      meta: `Owner · ${c.owner} · from the next best action`, timestamp: c.nba.timestamp,
      state: { label: "Open", variant: "alert" as TagVariantLite },
      aiSummary: c.nba.rationale,
    }] : []),
    {
      id: "a1", channel: "event", title: `${agent} refreshed the record snapshot`,
      meta: "4 facts promoted to Truth plane · 1 claim expired", timestamp: "Today, 08:12",
      state: { label: "Completed", variant: "success" },
      aiSummary: `Re-verified ${who}'s contact fields against the CRM sync and promoted four Sandbox claims after a matching source appeared. One claim about budget timing expired without corroboration and was dropped back to Sandbox.`,
    },
    {
      /* Thom's row shape: direction and the number in the title, then
         "who handled it — which desk · duration · clock time" in the meta.
         Ours said "Outbound call · <number>" and then the owner's name with
         no indication of whether a person or an agent took it. */
      id: "a2", channel: "call", title: `Outbound Call · ${c.phone}`,
      meta: `${c.owner} — Deal Desk · 6:18 · 2:05 PM`, timestamp: "Sep 2, 2026 · 14:05",
      /* The badge is what HAPPENED; sentiment is how it went. A call can be
         Resolved and still tense, which is why Thom carries both. */
      state: { label: "Resolved", variant: "success" },
      sentiment: "positive",
      metaChips: ["6:18", c.owner, "2 tools used"],
      aiSummary: `${who} confirmed the evaluation is still funded and asked for a written migration timeline. No pricing objection was raised. The timeline is the one open commitment from this call.`,
    },
    {
      id: "a2b", channel: "note", title: "Discovery follow-up — call wrap-up",
      meta: `${c.owner} · 3 claims to Sandbox · Shared`, timestamp: "Sep 2, 2026 · 14:40",
      state: { label: "Saved", variant: "neutral" },
      aiSummary: `Wrote up the call while it was fresh: the timeline is the only open commitment, and ${who} asked for it in writing rather than on a call.`,
      note: {
        body: [
          `Called ${who} back on the discovery thread. Evaluation is still funded for this cycle — they were explicit about that without being asked, which is worth noting because the July call left it ambiguous.`,
          `The one thing they want is a written migration timeline. Not a call, not a deck: a document they can forward internally. They said their own security review cannot start until they can attach a date to it.`,
          `No pricing objection came up. I did not raise it either. My read is that pricing is settled and the timeline is the only thing between us and a decision.`,
        ],
        author:     c.owner,
        authorRole: "Account owner",
        createdAt:  "Sep 2, 2026 · 14:40",
        editedAt:   "Sep 2, 2026 · 16:05",
        writtenIn:  "Call wrap-up · outbound call at 14:05",
        scope:      "Shared",
        claims: [
          { label: "Evaluation is funded",          status: "Verified"       },
          { label: "Security review needs a date", status: "Pending review" },
          { label: "Pricing is not an objection",  status: "Pending review" },
        ],
        linked: [
          { title: "Migration timeline requested", kind: "Email · Aug 18",       icon: "Mail"     },
          { title: "Governance addendum",          kind: "Document · Legal",     icon: "FileText" },
        ],
        attachments: [],
        comments: [
          { author: "David Park", role: "IT Director", at: "Sep 3, 2026 · 09:12",
            text: "The security review point is right. Their reviewer told me the same thing on a separate thread — she cannot open a ticket without a date on it." },
          { author: "Amy Chen", role: "CFO", at: "Sep 3, 2026 · 11:40",
            text: "Reading “pricing is settled” as settled for THIS cycle only. The renewal uplift has not been put to them yet." },
        ],
      },
    },
    {
      id: "a3", channel: "email", title: `Outbound Email · ${c.email}`,
      meta: `${c.owner} · 9:40 AM · Subject: Governance addendum for review`,
      timestamp: "Aug 28, 2026 · 09:40",
      state: { label: "Opened", variant: "informative" },
      metaChips: ["1 attachment", "Opened twice"],
      aiSummary: `Sent the redlined addendum for Legal to countersign. ${who} opened it twice and has not replied; nothing in the thread says it was forwarded on.`,
    },
    {
      id: "a4b", channel: "note", title: "QBR — the two escalations nobody dated",
      meta: `${c.agent.name} · 1 claim to Sandbox · Department`, timestamp: "Aug 22, 2026 · 12:02",
      state: { label: "Saved", variant: "neutral" },
      aiSummary: `Written by the agent straight off the QBR transcript. The escalations from July were raised again and left without a resolution date — the same gap the record's risk score is reading.`,
      note: {
        body: [
          `Transcribed from the quarterly review. Usage and roadmap were covered in full and neither raised a concern.`,
          `The two escalations first logged in July came up again. Nobody in the room put a resolution date on either one. That is the second consecutive review where they were discussed and not closed.`,
        ],
        author:     c.agent.name,
        authorRole: "Assigned agent",
        createdAt:  "Aug 22, 2026 · 12:02",
        writtenIn:  "Meeting transcript · quarterly business review",
        scope:      "Department",
        claims: [
          { label: "Two escalations undated", status: "Due to expire" },
        ],
        linked: [
          { title: "Quarterly business review", kind: "Meeting · 52 min", icon: "Users"    },
          { title: "Meridian — Meeting transcripts", kind: "Drive · Communication Hub", icon: "Folder" },
        ],
        attachments: [
          { name: "QBR-transcript-aug26.txt", meta: "Text · 41 KB" },
        ],
        comments: [
          { author: "Sarah Chen", role: "Head of Compliance", at: "Aug 22, 2026 · 16:30",
            text: "Third review, not the second — these were also raised in April and closed without a date then too." },
        ],
      },
    },
    {
      id: "a4", channel: "meeting", title: "Quarterly business review",
      meta: `${c.owner}, ${who} · 52 min · 6 attendees`, timestamp: "Aug 22, 2026 · 11:00",
      state: { label: "Completed", variant: "success" },
      aiSummary: `Usage and roadmap were covered in full. Two escalations from July were raised again without a resolution date, which is the thread most likely to carry into the next conversation.`,
    },
    {
      id: "a5", channel: "event", title: "Record merged from duplicate",
      meta: `${c.id} absorbed a duplicate created by the inbound form`, timestamp: "Aug 19, 2026 · 16:20",
      state: { label: "Completed", variant: "success" },
    },
    {
      /* AN SMS CARRIES ITS OWN TEXT. Two sentences is short enough to read in
         full, and a row that summarises them has summarised nothing — which
         is why Thom's rows quote the body verbatim instead. */
      id: "a5b", channel: "sms", title: `Outbound SMS · ${c.phone}`,
      meta: `${c.owner} · 5:12 PM · After the timeline request`,
      timestamp: "Aug 18, 2026 · 17:12",
      /* DELIVERED, NOT READ — Michael, 2026-09-11. A read receipt needs the
         handset to send one back, and SMS gives us no such signal; the
         carrier confirms delivery and nothing after that. Thom's prototype
         carries both words because his fixture came from a channel that has
         them, and copying the vocabulary without the capability is how a
         prototype promises something the product cannot do. */
      state: { label: "Delivered", variant: "success" },
      smsBody: `Hi ${who} — picking up your note about the migration timeline. I am confirming the date internally and will come back in writing this week.`,
    },
    {
      id: "a6", channel: "email", title: `Inbound Email · ${c.email}`,
      meta: `${c.owner} · 7:55 AM · Subject: Migration timeline`,
      timestamp: "Aug 18, 2026 · 07:55",
      state: { label: "Awaiting reply", variant: "alert" },
      metaChips: ["Second ask", "Unanswered 6 days"],
      aiSummary: `${who} asked for the migration timeline in writing for the second time. The message is shorter than the first and drops the pleasantries — nothing hostile, but she has asked already.`,
    },
    {
      id: "a7", channel: "task", title: `${agent} drafted a follow-up`,
      meta: "Draft held for review · not sent", timestamp: "Aug 18, 2026 · 08:02",
      state: { label: "Needs review", variant: "alert" },
      aiSummary: `A reply to the timeline request was drafted but held, because the delivery date it referenced was not confirmed anywhere in the Truth plane.`,
    },
    {
      id: "a8", channel: "call", title: `Inbound Call · ${c.phone}`,
      meta: `${agent} — Front Desk · 6:41 · 10:42 AM`, timestamp: "Aug 12, 2026 · 10:42",
      /* Escalated, not Resolved: the agent did not close this, it handed the
         call to a person. Thom's vocabulary separates the two, and ours was
         calling a hand-off a resolution. */
      state: { label: "Escalated", variant: "alert" },
      sentiment: "neutral",
      metaChips: ["6:41", `${agent} → ${c.owner}`, "Identity verified"],
      aiSummary: `${who} called about audit evidence and was routed after the agent confirmed identity. The requested evidence pack was sent the same day.`,
    },
    {
      id: "a9", channel: "meeting", title: "Security review working session",
      meta: `${who} · 45 min · 4 attendees`, timestamp: "Jul 28, 2026 · 15:30",
      state: { label: "Completed", variant: "success" },
    },
    {
      id: "a10", channel: "event", title: "Source Drive attached",
      meta: "Legal · shared folder connected to this record", timestamp: "Jul 28, 2026 · 15:58",
      state: { label: "Completed", variant: "success" },
    },
    {
      id: "a11", channel: "email", title: "Evidence pack delivered",
      meta: `${c.owner} → ${c.email} · 3 attachments`, timestamp: "Jul 22, 2026 · 12:10",
      state: { label: "Opened", variant: "informative" },
    },
    {
      id: "a12", channel: "event", title: `${agent} flagged a stale fact`,
      meta: "Budget cycle claim older than 90 days", timestamp: "Jul 20, 2026 · 06:00",
      state: { label: "Resolved", variant: "success" },
      aiSummary: `The budget-cycle claim passed its freshness window. It was re-confirmed on the Aug 22 review call and returned to the Sandbox plane with a new timestamp.`,
    },
    {
      id: "a12b", channel: "note", title: `Note · ${c.owner}`,
      meta: "Before the security review", timestamp: "Jul 26, 2026 · 11:20",
      state: { label: "Saved", variant: "neutral" },
    },
    {
      id: "a13", channel: "call", title: `Outbound call · ${c.phone}`,
      meta: `${c.owner} · 9:03 · No answer, voicemail left`, timestamp: "Jul 14, 2026 · 09:15",
      state: { label: "No answer", variant: "neutral" },
    },
    {
      id: "a14", channel: "event", title: "Record created",
      meta: `${c.id} · ingested from the account sync`, timestamp: "Jun 9, 2026 · 08:00",
      state: { label: "Completed", variant: "success" },
    },
  ]
}

export function getDrives(c: UcpContact): UcpDrive[] {
  const slug = c.company.split(" ")[0]
  return [
    {
      id: "d1", department: "Legal", name: `${slug} — Legal`, kind: "Folder", provider: "Google Drive",
      items: "24 documents", owner: "Legal Ops", lastSync: "Today, 06:00",
      scope: "Shared with 3 networks", state: { label: "Synced", variant: "success" },
    },
    {
      id: "d2", department: "Security", name: `${slug} — Security & Compliance`, kind: "Folder", provider: "SharePoint",
      items: "61 documents", owner: "Security", lastSync: "Today, 06:00",
      scope: "Shared with 2 networks", state: { label: "Synced", variant: "success" },
    },
    {
      id: "d3", department: "Legal", name: `MSA_${slug}_2026.pdf`, kind: "Document", provider: "Google Drive",
      items: "1 document", owner: "Legal Ops", lastSync: "Aug 4, 2026",
      scope: "Attached to this record only", state: { label: "Synced", variant: "success" },
    },
    {
      id: "d4", department: "Communications", name: `${slug} — Meeting transcripts`, kind: "Folder", provider: "Communication Hub",
      items: "18 transcripts", owner: c.owner, lastSync: "Sep 2, 2026",
      scope: "Attached to this record only", state: { label: "Synced", variant: "success" },
    },
    {
      id: "d5", department: "Revenue Ops", name: "Revenue — Account plans", kind: "Drive", provider: "Box",
      items: "412 documents", owner: "Revenue Ops", lastSync: "Aug 30, 2026",
      scope: "Shared with 6 networks", state: { label: "Partial access", variant: "alert" },
    },
    {
      id: "d6", department: "Legal", name: `${slug} — Archive 2024`, kind: "Folder", provider: "SharePoint",
      items: "137 documents", owner: "Legal Ops", lastSync: "Failed Aug 26, 2026",
      scope: "Shared with 1 network", state: { label: "Sync failed", variant: "error" },
    },
  ]
}

export function getConnections(c: UcpContact): UcpConnection[] {
  /**
   * Related CONTACTS — people, and only people.
   *
   * Michael (2026-09-09): "ese card es de contactos relacionados. Por ejemplo:
   * familia, compañero de trabajo, etc, pero solo si están dentro del ambiente
   * de AIMS y se tienen datos."
   *
   * So every row here resolves to a record in this roster. A deal, an
   * organization, a team and the assigned agent were all in this list before
   * and none of them is a contact: the company is a FIELD on the record (the
   * Organization widget shows it), the agent is in secondary metadata, and a
   * deal is not a person. An account owner who is not a record in AIMS — Priya
   * Nair, Daniel Ruiz — stays a field too, for the same reason: there is
   * nothing to open.
   *
   * Three sources, in this order, deduped by record:
   *   1. declared relations (family) — the only ones written down
   *   2. coworkers, derived from `company`
   *   3. the manager or account owner, when they are a record themselves
   */
  const out: UcpConnection[] = []
  const seen = new Set<string>([c.id])
  const push = (p: UcpContact, relation: string, tooltip: string) => {
    if (seen.has(p.id)) return
    seen.add(p.id)
    out.push({ id: p.id, name: p.name, relation, icon: TYPE_ICON[p.type], tooltip })
  }

  // 1. Declared — a relation pointing at a record that does not exist is
  //    dropped here, which is what keeps "only if it is in AIMS" structural.
  for (const r of c.relations ?? []) {
    const p = CONTACTS.find(x => x.id === r.id)
    if (p) push(p, r.relation, `${r.relation} · ${p.name}. ${TYPE_LABEL[p.type]} record in AIMS, so their own profile opens from here.`)
  }

  // A repair order has no colleagues. Types that are not people or the company
  // they work for get no derived connections at all — the widget shows its
  // empty state, which is true, rather than the account's staff, which would
  // be a different record's data on this one.
  if (!PEOPLE_TYPES.includes(c.type) && c.type !== "company") return out

  // 2. Coworkers — same company, derived. A company's own connections are the
  //    people who work there, which is the same rule read from the other side.
  const coworkers = CONTACTS.filter(x => x.type !== "company" && x.company === (c.type === "company" ? c.name : c.company))
  for (const p of coworkers) {
    const role = p.subtitle.split("·")[0].trim()
    push(p, c.type === "company" ? `${role} · ${TYPE_LABEL[p.type].toLowerCase()}` : `Coworker · ${role}`,
      c.type === "company"
        ? `Works at ${c.name} · ${role}. One of ${coworkers.length} people on this account.`
        : `Coworker at ${c.company} · ${role}. Same account, so activity on one can explain the other.`)
  }

  // 3. The manager or the account owner, only when AIMS holds a record for
  //    them. `owner` is a name rather than an id in these fixtures, so it is
  //    matched by name and skipped when there is no match.
  const owner = CONTACTS.find(x => x.name === c.owner && x.type !== "company")
  if (owner) {
    push(owner, c.type === "employee" ? "Manager" : "Account owner",
      c.type === "employee"
        ? `Manager · ${owner.name}. Reporting line inside the tenant.`
        : `Account owner · ${owner.name}. Holds this relationship on our side.`)
  }

  return out
}

/**
 * Governance and Risk studies.
 *
 * THE COLOUR COMES FROM THE VALUE, not from the row. Michael (2026-09-09):
 * "en Risk que los estados negativos usen las variables semánticas de manera
 * correcta — risk error debería ser rojo." Every variant below is computed
 * from what the number actually says, so a risk score of 78 is red wherever it
 * appears and a score of 18 is green, rather than each row carrying a colour
 * somebody typed once.
 *
 * EVERY ROW CARRIES A TOOLTIP. A counter says the number; the tooltip says
 * what is happening — which is the difference between "0" and "no flags have
 * been raised since the last scan".
 */
/** The semantic range a metric can carry. One union, so the profile's field
 *  widgets and its study widgets cannot drift into two vocabularies. */
export type MetricVariant = "success" | "alert" | "informative" | "neutral" | "error"

export interface StudyRow {
  label:   string
  value:   string
  icon:    string
  variant: MetricVariant
  tooltip: string
}

/**
 * How exposed this record is, derived from what it already says about itself.
 * A record carrying an `error` signal is not low-risk, and the study saying so
 * while a tag says otherwise is the screen contradicting itself. Before this,
 * getRisk ignored its argument and every record read 18 / 100.
 */
function riskLevel(c: UcpContact): "high" | "medium" | "low" {
  if (c.tags.some(t => t.tone === "error"))  return "high"
  if (c.tags.some(t => t.tone === "alert"))  return "medium"
  return "low"
}

export function getRisk(c: UcpContact): StudyRow[] {
  const level = riskLevel(c)
  const score = level === "high" ? 78 : level === "medium" ? 54 : 18
  const flags = level === "high" ? 3  : level === "medium" ? 1  : 0
  const prior = level === "high" ? 54 : level === "medium" ? 48 : 24
  const rising = score > prior

  return [
    {
      label: "Risk score", value: `${score} / 100`,
      icon: rising ? "TrendingUp" : "TrendingDown",
      variant: score >= 70 ? "error" : score >= 40 ? "alert" : "success",
      tooltip: `Risk score · ${score} of 100. ${
        score >= 70 ? "Above the intervention threshold — this record needs an owner this week."
        : score >= 40 ? "Elevated. Worth watching, not yet blocking."
        : "Within the normal band for this account type."}`,
    },
    {
      label: "Open flags", value: String(flags),
      icon: "Flag",
      variant: flags === 0 ? "neutral" : flags >= 3 ? "error" : "alert",
      tooltip: flags === 0
        ? "Open flags · none. Nothing has been raised since the last scan."
        : `Open flags · ${flags}. Raised by the risk study and still unresolved.`,
    },
    {
      label: "Trend", value: `${prior} → ${score}`,
      icon: rising ? "ArrowUpRight" : "ArrowDownRight",
      variant: rising ? (score >= 70 ? "error" : "alert") : "success",
      tooltip: `Trend · ${prior} to ${score} since the previous scan. ${
        rising ? "Moving the wrong way." : "Improving."}`,
    },
    {
      label: "Last scan", value: "Aug 27, 2026",
      icon: "ScanLine", variant: "informative",
      tooltip: "Last scan · Aug 27, 2026. The risk study runs weekly; anything after this date is not reflected above.",
    },
  ]
}

export function getGovernance(c: UcpContact): StudyRow[] {
  const openReviews = c.status === "Active" ? 1 : 0
  const reviewRow: StudyRow = {
    label: "Open reviews", value: String(openReviews),
    icon: "ClipboardList",
    variant: openReviews === 0 ? "neutral" : "alert",
    tooltip: openReviews === 0
      ? "Open reviews · none. Nothing is waiting on a governance decision."
      : `Open reviews · ${openReviews}. Waiting on a governance decision before it can proceed.`,
  }

  return c.type === "employee"
    ? [
        { label: "Policies signed",  value: "12 of 12",     icon: "FileCheck2",    variant: "success",
          tooltip: "Policies signed · 12 of 12. Every policy this role requires is signed and current." },
        reviewRow,
        { label: "Training current", value: "Yes",          icon: "GraduationCap", variant: "success",
          tooltip: "Training current · yes. No mandatory course is overdue for this role." },
        { label: "Last audit",       value: "Aug 10, 2026", icon: "CalendarCheck", variant: "informative",
          tooltip: "Last audit · Aug 10, 2026. Governance audits this record quarterly." },
      ]
    : [
        { label: "Compliance score", value: "94 / 100",     icon: "ShieldCheck",   variant: "success",
          tooltip: "Compliance score · 94 of 100. Computed from signed agreements, retention settings and open reviews." },
        reviewRow,
        { label: "DPA signed",       value: "Yes · v3",     icon: "FileCheck2",    variant: "success",
          tooltip: "Data Processing Agreement · v3 signed. Personal data on this record may be processed by agents." },
        { label: "Last audit",       value: "Aug 10, 2026", icon: "CalendarCheck", variant: "informative",
          tooltip: "Last audit · Aug 10, 2026. Governance audits this record quarterly." },
      ]
}

/**
 * The record's reads, in the shape the AI Summary widget takes.
 *
 * ONE mapper for every surface that shows them — the profile's Overview
 * canvas and the roster's preview panel — so the two cannot drift into
 * different anatomies again. `onOpenDestination` is wired by the caller
 * because only the caller knows how to get there; without it the destination
 * button is omitted rather than rendered dead.
 */
export function toAiInsights(
  c: UcpContact,
  opts?: { onOpenDestination?: (destination: string) => void },
): AiInsight[] {
  const facts = getFacts(c)
  const drawnFrom = PLANE_ORDER
    .map(plane => ({
      label:   `${PLANE_META[plane].label} · ${facts.filter(f => f.plane === plane).length}`,
      variant: PLANE_META[plane].tag as TagVariantLite,
      count:   facts.filter(f => f.plane === plane).length,
    }))
    .filter(d => d.count > 0)
    .map(({ label, variant }) => ({ label, variant }))

  return c.insights.map(r => ({
    id:         r.id,
    agent:      c.agent.name,
    category:   r.category,
    headline:   r.headline,
    detail:     r.detail,
    confidence: r.confidence,
    drawnFrom,
    destination: r.destination && opts?.onOpenDestination
      ? { label: `Open in ${r.destination}`, onOpen: () => opts.onOpenDestination!(r.destination!) }
      : undefined,
  }))
}

// ── Concierge chat ────────────────────────────────────────────────────────────

export interface ConciergeTurn {
  id:      string
  from:    "agent" | "user"
  text:    string
  /** Which facts the answer leaned on — the plane is what makes it auditable. */
  sources?: { label: string; plane: KnowledgePlane }[]
}

export function getConciergeOpening(c: UcpContact): ConciergeTurn[] {
  return [
    {
      id: "t1", from: "agent",
      text: `I'm the concierge for ${c.name}. I answer from this record's Truth, Sandbox and Sources planes, and I show you which one each answer came from.`,
    },
    {
      id: "t2", from: "agent",
      text: c.insights[0].detail,
      sources: [
        { label: "Interaction history",    plane: "truth"   },
        { label: "Call notes — Aug 22",    plane: "sandbox" },
        { label: "Shared Drive · Legal",   plane: "sources" },
      ],
    },
  ]
}

export const CONCIERGE_PROMPTS = [
  "What changed on this record this week?",
  "What do we still owe them?",
  "Which facts are unverified?",
]

/**
 * ── Create: the edge cases, before anything is created ─────────────────────
 *
 * Michael, 2026-09-10: "consideremos casos borde como qué pasa si este existe,
 * como se mostrará, usando un informative card, en el caso que ya exista el
 * usuario o contactos poder mostrar los correos o contactos asociados a ese
 * mail o dato."
 *
 * WHY THIS IS THE ONE EDGE CASE WORTH BUILDING FIRST. A unified profile whose
 * whole promise is one record per person has exactly one way to break that
 * promise, and it is this form. The Activity feed on every record already
 * carries the evidence — "Record merged from duplicate · absorbed a duplicate
 * created by the inbound form" — so the duplicate is not hypothetical here,
 * it is a thing that has already happened to this data and was cleaned up
 * afterwards. Catching it before the record exists costs a lookup; catching
 * it afterwards costs a merge, and a merge is a governance event.
 *
 * WHAT IS SHOWN, AND WHY IT IS THE RECORDS THEMSELVES. "This email already
 * exists" is not actionable — the reader cannot tell whether they are about
 * to duplicate a record or whether somebody else's typo is in the way. So the
 * card carries the MATCHED RECORDS, each with the datum that collided, which
 * is the difference between a validation error and an answer.
 *
 * ONE CARD, STRONGEST SIGNAL WINS. Three stacked cards in a 900px modal is
 * noise, and the reader only ever acts on the most severe one. The order below
 * is by how certain the collision is, not by how bad it sounds:
 *
 *   email-active    An active record already holds this email. CERTAIN — an
 *                   email is the one field this data treats as unique. Blocks.
 *   email-archived  Same, but the record is archived. Also certain, and the
 *                   answer is to restore rather than create. Blocks.
 *   phone           A phone matches and the email does not. NOT certain: a
 *                   switchboard, a shared mobile, a household. Warns only.
 *   name            A name matches and nothing else does. Weak — two people
 *                   are allowed the same name. Informs only.
 *   domain          Nothing matched, but the email's domain belongs to a
 *                   company on file. This is not a duplicate at all, it is
 *                   the good case: the new contact has a parent, and saying
 *                   so before the save is how it gets linked without anyone
 *                   going back to do it. Informs only.
 *
 * The three lower cases never block. A create form that refuses a real second
 * person at the same company has stopped being a safeguard and become a wall,
 * and the person filling it in is the one who knows which it is.
 */
export type CreateMatchKind = "email-active" | "email-archived" | "phone" | "name" | "domain"

export interface CreateMatch {
  kind:    CreateMatchKind
  /** The records that matched, most relevant first. */
  records: UcpContact[]
  /** The value that collided, quoted back so the reader sees which field. */
  on:      string
  /** True for the two email cases: creating would knowingly duplicate. */
  blocks:  boolean
}

const norm = (v: string) => v.trim().toLowerCase()
/** Digits only — "+1 (212) 555-0155" and "2125550155" are the same phone. */
const digits = (v: string) => v.replace(/\D/g, "")

export function matchExistingRecords(draft: {
  name?:   string
  email?:  string
  phones?: string[]
}): CreateMatch | null {
  const email = norm(draft.email ?? "")
  const name  = norm(draft.name  ?? "")
  const phones = (draft.phones ?? []).map(digits).filter(p => p.length >= 7)

  if (email.includes("@")) {
    const hit = CONTACTS.filter(c => norm(c.email) === email)
    if (hit.length > 0) {
      const archived = hit.every(c => c.status === "Archived")
      return {
        kind:    archived ? "email-archived" : "email-active",
        records: hit,
        on:      draft.email!.trim(),
        blocks:  true,
      }
    }
  }

  if (phones.length > 0) {
    const hit = CONTACTS.filter(c => phones.includes(digits(c.phone)))
    if (hit.length > 0) {
      return { kind: "phone", records: hit, on: hit[0].phone, blocks: false }
    }
  }

  // Three characters is the floor: "Li" matches half a roster and the card
  // would fire on the second keystroke of every name.
  if (name.length >= 3) {
    const hit = CONTACTS.filter(c => norm(c.name) === name)
    if (hit.length > 0) {
      return { kind: "name", records: hit, on: draft.name!.trim(), blocks: false }
    }
  }

  // Last, and only when nothing above matched — this is the good news case.
  const domain = email.split("@")[1]
  if (domain && domain.includes(".")) {
    const hit = CONTACTS.filter(c => norm(c.email).endsWith(`@${domain}`))
    if (hit.length > 0) {
      const company = hit.find(c => c.type === "company")
      return {
        kind:    "domain",
        records: company ? [company, ...hit.filter(c => c !== company)] : hit,
        on:      domain,
        blocks:  false,
      }
    }
  }

  return null
}

/** Offices and regions the tenant operates in — the Location field's options. */
export const CREATE_LOCATIONS = [
  "Chicago, IL",
  "Detroit, MI",
  "Austin, TX",
  "New York, NY",
  "San Francisco, CA",
  "Remote — US",
]

/** Who a record can be assigned to, read off the roster so the list cannot
 *  drift from the owners the records actually have. */
export const CREATE_OWNERS = Array.from(new Set(CONTACTS.map(c => c.owner))).sort()

/* ══════════════════════════════════════════════════════════════════════════
   INTELLIGENCE
   ══════════════════════════════════════════════════════════════════════════

   Intelligence is a WORKING surface, not a reading surface. A rep opens a
   contact to decide what to do about that person now, so every block below
   earns its place by helping them decide or act, and the order is fixed:

     1 Verdict          who this is and what to do about them
     2 Signals          named, verifiable conditions
     3 Suggestion queue what the system proposes, worked and resolved here
     4 Agent reads      what agents have inferred, and what can be attested

   Nothing sits above the verdict.

   NO BACKEND. Everything here is a shape plus a fixture, and every shape is
   marked. Where a real system would compute, this derives from the record's
   own data so the fixtures cannot disagree with the rest of the profile.
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * ── 1 · The verdict ────────────────────────────────────────────────────────
 *
 * Two sentences. The first says who this person is and what they care about;
 * the second is the imperative plus the clock, and it starts with a verb.
 *
 * CACHED, NOT REGENERATED ON LOAD, which is a product rule rather than a
 * performance one: two people looking at the same contact have to read the
 * same text, or the product cannot be quoted in a conversation between them.
 * `generatedAt` is always rendered for the same reason.
 *
 * `entities` are spans in the text that link to their evidence. They are
 * ranges rather than a re-parse of the string, because the same words can
 * appear twice — "12 days" in the second sentence and "12 days" in a quoted
 * fragment are not the same link.
 */
export interface VerdictEntity {
  /** The exact substring, used to locate the span for rendering. */
  text:        string
  /** Which occurrence, when the text repeats. Zero-based. */
  occurrence?: number
  /** Where it goes: a tab on this record, or a section of the platform. */
  destination: string
  /** What the reader is about to open. Shown on hover. */
  tooltip:     string
}

export interface UcpVerdict {
  /** Hard cap 45 words, ENFORCED AT GENERATION, never by visual truncation —
   *  a sentence cut mid-clause says something the generator did not. */
  text:        string
  generatedAt: string
  entities:    VerdictEntity[]
}

/** The cap, exported so the check can live beside the copy that has to pass it. */
export const VERDICT_WORD_CAP = 45

export function verdictWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/**
 * ── 2 · Signals ────────────────────────────────────────────────────────────
 *
 * A CLOSED CATALOG. Adding a type is a deliberate change to this list, not
 * something an agent can invent at runtime — which is the whole difference
 * between a signal and a sentence about a person.
 *
 * THERE IS NO AGGREGATE RISK SCORE ON A CONTACT. A number computed on a human
 * being is a judgement wearing a decimal point: it cannot be verified, it
 * cannot be disputed, and it survives long after whatever produced it. Where a
 * score exists at the OPPORTUNITY level it may be shown here as an inherited,
 * linked value — the opportunity is a commercial object and can carry one.
 */
export type SignalType =
  | "response_debt"
  | "single_thread"
  | "engagement_velocity"
  | "contract_clock"
  | "open_commitment"
  | "role_change"

export const SIGNAL_CATALOG: Record<SignalType, { label: string; firesWhen: string; icon: string }> = {
  response_debt:       { label: "Awaiting us",         firesWhen: "We owe the contact a reply",              icon: "MailWarning"  },
  single_thread:       { label: "Single thread",       firesWhen: "Only one live contact on the account",    icon: "UserMinus"    },
  engagement_velocity: { label: "Engagement falling",  firesWhen: "Contact frequency trending down",         icon: "TrendingDown" },
  contract_clock:      { label: "Renewal window",      firesWhen: "A dated commercial event is approaching", icon: "CalendarClock"},
  open_commitment:     { label: "Open commitment",     firesWhen: "Something was promised and not delivered",icon: "Handshake"    },
  role_change:         { label: "Role change",         firesWhen: "Authority or title changed",              icon: "UserCog"      },
}

/** Exactly three. A fourth level is a fourth thing to learn and, in practice,
 *  a second name for one of these. */
export type SignalSeverity = "critical" | "attention" | "watch"

export interface UcpSignal {
  type:     SignalType
  label:    string
  /**
   * WHAT ACTUALLY HAPPENED, on this record. This is the line; `label` is the
   * grey tag beside it.
   *
   * The rows used to lead with the catalog's generic sentence — "Something was
   * promised and not delivered" — and push "Two escalations raised again at
   * the QBR" to the right in smaller type. That is backwards: the generic copy
   * is true of every open commitment ever, and the reader already knows what
   * an open commitment is by the second time they see one.
   */
  detail:   string
  severity: SignalSeverity
  /** Always present. Duration is what makes a signal actionable — "awaiting us"
   *  is a fact, "awaiting us · 6 days" is a decision. */
  since:    string
  /** Where the claim can be checked. A signal with no evidence does not render;
   *  `renderableSignals` enforces that rather than trusting the caller. */
  evidence: { label: string; destination: string } | null
  /** The queue row that resolves this, when there is one. */
  suggestionId?: string
}

/** Severity first, then recency. The strip is scanned, not read. */
const SEVERITY_ORDER: Record<SignalSeverity, number> = { critical: 0, attention: 1, watch: 2 }

/**
 * Days behind a `since` string, for the tie-break. Returns -1 when the string
 * is not a duration ("since Jun 2026"), which sorts it last — a signal that
 * cannot say how long it has been going is not the most urgent one.
 */
function sinceDays(since: string): number {
  const m = since.trim().match(/^(\d+)\s+(day|days|week|weeks|month|months)\b/)
  if (!m) return -1
  const n = Number(m[1])
  return m[2].startsWith("week") ? n * 7 : m[2].startsWith("month") ? n * 30 : n
}

/**
 * The most urgent signal, and the tie-break is EXPLICIT because there are two
 * criticals and the collapsed line names one of them.
 *
 * Severity first; at equal severity the one that has been running longest.
 * "Awaiting us for 6 days" and "Open commitment for 19 days" are both
 * critical, and the second has been true three times as long — picking by
 * array order would have been a choice nobody could see or argue with.
 */
export function mostUrgentSignal(signals: UcpSignal[]): UcpSignal | undefined {
  return [...signals].sort((a, b) =>
    SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || sinceDays(b.since) - sinceDays(a.since),
  )[0]
}

/** Drops any signal that cannot be checked. The rule is "a signal with no
 *  evidence link does not render", and a rule enforced at the call site is a
 *  rule that holds until somebody writes a second call site. */
export function renderableSignals(signals: UcpSignal[]): UcpSignal[] {
  return signals
    .filter(s => s.evidence !== null)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}

/**
 * ── 3 · The suggestion queue ───────────────────────────────────────────────
 *
 * A SUGGESTION IS NOT A TASK. A suggestion is what the system proposes; a task
 * is what the rep committed to. Accepting is the gesture that turns one into
 * the other and puts it in the platform-wide inbox — which is why nothing here
 * is ever called a task, and why this list is never mirrored into that inbox.
 * Only accepted items go there.
 */
export type SuggestionStatus =
  | "new"                  // not yet looked at
  | "ready"                // draft prepared, awaiting review
  | "held"                 // blocked by The Council — see `held` below
  | "pending_confirmation" // rep supplied a fact, awaiting KCON
  | "accepted"             // converted to a task, lives in the global inbox
  | "done"
  | "dismissed"

export const SUGGESTION_STATUS_LABEL: Record<SuggestionStatus, string> = {
  new:                  "New",
  ready:                "Ready",
  held:                 "Held",
  pending_confirmation: "Pending confirmation",
  accepted:             "Accepted",
  done:                 "Done",
  dismissed:            "Dismissed",
}

/** Rows leave the queue on these three. Accepted stays reachable as a link
 *  out, so the rep cannot accept the same thing twice. */
export const RESOLVED_STATUSES: SuggestionStatus[] = ["accepted", "done", "dismissed"]

/** A state label, never a percentage. A number with no scale tells the reader
 *  nothing — "0.82" answers a question nobody asked. */
export type ConfidenceState = "Inferred" | "In review" | "Verified"

/** Required, and this is the whole point of Dismiss. A queue that empties
 *  without saying why teaches the engine nothing. */
export const DISMISS_REASONS = ["Already done", "Not relevant", "This is wrong", "Bad timing"] as const
export type DismissReason = typeof DISMISS_REASONS[number]

/** "This is wrong" is a different act from the other three — it is a
 *  correction, not a triage decision, and it routes to Train Me. */
export const TRAIN_ME_REASON: DismissReason = "This is wrong"

export interface SuggestionDraft {
  /** Three lines shown collapsed; the rest on expand. The draft IS the asset —
   *  it is the main reason to open a row. */
  body:      string[]
  /** Truth Plane facts the draft used, as links into Knowledge. */
  grounding: { label: string; factId: string }[]
}

export interface UcpSuggestion {
  id:      string
  /** Verb plus object. Never a full sentence — this is a queue, not prose. */
  title:   string
  /** One clause. The full version lives in `reasonFull`. */
  reason:  string
  reasonFull: string
  /** Links inside `reasonFull`, same mechanism as the verdict's. */
  reasonEntities: VerdictEntity[]
  status:  SuggestionStatus
  confidence: ConfidenceState
  /** Impact and urgency, 0–1, multiplied for the default sort. Two axes rather
   *  than one score because the sort criterion has to be EXPLAINABLE — a queue
   *  whose order cannot be explained will not be trusted, so the header names
   *  it and lets the rep change it. */
  impact:  number
  urgency: number
  /** The full draft. Absent when the suggestion is scheduled work rather than
   *  a message — those get Accept instead of Review and send. */
  draft?:  SuggestionDraft
  /**
   * THE HELD STATE. A draft is held when The Council blocked it because a fact
   * it referenced is not attested in the Truth Plane. This is the product's
   * core claim working correctly, so it is written as an invitation and never
   * as an error or a log line.
   *
   * Two paths, both visible, and `withoutCommitment` is why there must be two
   * drafts per held suggestion: the fast path sends a variant that commits to
   * nothing. It ALSO fires the confirmation request, because otherwise the
   * fast path becomes the default, the fact is never attested, and the agent
   * blocks on the same gap forever.
   */
  held?: {
    /** What is missing, in the rep's words. */
    missing:     string
    /** The domain owner the confirmation routes to. */
    owner:       string
    /** How long it has been with them, once supplied. */
    withOwnerFor?: string
    /** The variant that commits to nothing. */
    withoutCommitment: SuggestionDraft
  }
  /** Set when the suggestion no longer applies. Suggestions expire; tasks do
   *  not. An expired suggestion states its reason and leaves. */
  expired?: string
}

/** Impact × urgency, and the label the header shows. */
export const SUGGESTION_SORTS = [
  { id: "impact-urgency", label: "Impact × urgency" },
  { id: "urgency",        label: "Most urgent first" },
  { id: "newest",         label: "Newest first" },
] as const
export type SuggestionSort = typeof SUGGESTION_SORTS[number]["id"]

export function sortSuggestions(items: UcpSuggestion[], sort: SuggestionSort): UcpSuggestion[] {
  const copy = [...items]
  if (sort === "urgency") return copy.sort((a, b) => b.urgency - a.urgency)
  if (sort === "newest")  return copy.reverse()
  return copy.sort((a, b) => b.impact * b.urgency - a.impact * a.urgency)
}

/**
 * ── 4 · Agent reads ────────────────────────────────────────────────────────
 *
 * Inferences agents have drawn about this relationship. These are CANDIDATE
 * CLAIMS, and confirming one promotes it through KCON.
 *
 * THE `kind` DISTINCTION IS A GUARDRAIL, NOT A NICETY.
 *
 *   structural   a verifiable relationship fact — who signs, who owns a budget
 *                line, reporting lines, system of record. Gets Confirm.
 *   interpretive a read of tone, intent or sentiment. NO confirm action, ever.
 *                These render and expire. Persisting a judgement about a
 *                person's emotional state as an attested fact is a thing this
 *                product must not be able to do, so the type is what stops it
 *                rather than a reviewer remembering.
 */
export type ReadKind = "structural" | "interpretive"

/**
 * WHAT THE READ IS ABOUT, which is a different question from whether it can
 * be attested.
 *
 *   situation    something that is happening — an escalation left undated,
 *                a tone shift on a thread. Renders in Agent reads.
 *   disposition  something stable about the person — "economic buyer on this
 *                renewal". Feeds the Profile block and does NOT render in
 *                Agent reads.
 *
 * Michael, 2026-09-11: route by kind, do not delete data. So a disposition
 * read still exists, still carries its evidence, and is simply consumed
 * somewhere else — which is also why Agent reads' counter has to count what
 * it actually shows.
 *
 * This is a SECOND axis, not a third value of `kind`. "Structural vs
 * interpretive" asks whether it can become a fact; "situation vs disposition"
 * asks where it belongs on the page. Folding them into one enum is how a
 * disposition ends up unattestable by accident.
 */
export type ReadSubject = "situation" | "disposition"

export interface UcpAgentRead {
  id:       string
  /** Defaults to "situation" at the call site; only dispositions say so. */
  subject?: ReadSubject
  headline: string
  body:     string
  agent:    string
  area:     string
  state:    ConfidenceState
  kind:     ReadKind
  /** Required. A read with no evidence does not render — same rule, same
   *  reason, same enforcement as signals. */
  evidence: { label: string; destination: string }[]
}

/** Evidence-bearing SITUATION reads. Dispositions are routed to the Profile
 *  block, not filtered out of existence — see ReadSubject. */
export function renderableReads(reads: UcpAgentRead[]): UcpAgentRead[] {
  return reads.filter(r => r.evidence.length > 0 && (r.subject ?? "situation") === "situation")
}

/**
 * PROPOSING IS NOT ATTESTING. A user who cannot attest in this domain still
 * sees the action — it reads "Propose as fact" and routes to the domain owner.
 * Hiding it would teach them the product cannot do the thing.
 */
export function confirmLabel(canAttest: boolean): string {
  return canAttest ? "Confirm" : "Propose as fact"
}

/**
 * ── Instrumentation ────────────────────────────────────────────────────────
 *
 * ACCEPTANCE RATE IS THE HEALTH METRIC FOR THIS SECTION. If it is low, nothing
 * else here matters — the queue is proposing the wrong work and every other
 * refinement is decoration on top of that.
 *
 * // STUB: console only. A real implementation posts to the analytics sink.
 */
export type IntelligenceEvent =
  | { name: "suggestion_accepted";  suggestionId: string }
  | { name: "suggestion_dismissed"; suggestionId: string; reason: DismissReason }
  | { name: "draft_sent";           suggestionId: string; variant: "full" | "without_commitment" }
  | { name: "fact_supplied";        suggestionId: string; value: string; owner: string }
  | { name: "read_confirmed";       readId: string; proposed: boolean }
  | { name: "read_rejected";        readId: string; reason: DismissReason }
  | { name: "verdict_rated";        contactId: string; rating: "up" | "down" }
  | { name: "verdict_regenerated";  contactId: string }
  /* WHICH COLLAPSED BLOCKS ANYBODY ACTUALLY OPENS. If Signals and Agent reads
     are almost never expanded they are candidates for demotion or removal in
     a later pass — but that call belongs to the data, not to the change that
     collapsed them. The count at the moment of opening is carried because
     "nobody opens Signals" and "nobody opens Signals when it says zero" are
     different findings. */
  | { name: "block_expanded";       block: string; count: number }
  /* If Profile is almost never expanded, the three-line default is doing its
     job — that is not evidence the block is surplus. */
  | { name: "profile_expanded";     contactId: string }
  | { name: "trait_confirmed";      field: string; proposed: boolean }
  | { name: "trait_rejected";       field: string; reason: DismissReason }

export function emitIntelligence(event: IntelligenceEvent): void {
  // eslint-disable-next-line no-console
  console.info("[intelligence]", event.name, event)
}

/* ── Intelligence fixtures ─────────────────────────────────────────────────
   Derived from the record so nothing here can contradict the rest of the
   profile: the verdict quotes the same renewal the Entity Header shows, the
   signals point at activity rows that exist, and the grounding links name
   facts the Knowledge tab actually holds.
   ────────────────────────────────────────────────────────────────────────── */

/** Days to the renewal, the one commercial clock this prototype models.
 *  // STUB: a real opportunity record carries this. */
export function renewalInDays(c: UcpContact): number | null {
  if (c.type !== "person" && c.type !== "company") return null
  // Deterministic per record rather than random, so two reads agree.
  const seed = c.id.split("").reduce((n, ch) => n + ch.charCodeAt(0), 0)
  return 8 + (seed % 22)
}

export function getVerdict(c: UcpContact): UcpVerdict | null {
  const days = renewalInDays(c)
  if (days === null || c.type === "company") {
    if (c.type !== "company") return null
  }
  const who   = c.name.split(" ")[0]
  const value = c.subtitle.includes("·") ? "$480K" : "$480K"

  if (c.type === "company") {
    return {
      text: "Get the governance addendum countersigned this week — it gates the renewal.",
      generatedAt: "Today, 08:12",
      entities: [
        { text: "governance addendum", destination: "Knowledge",   tooltip: "Knowledge · the addendum on the Legal drive" },
        { text: "the renewal",         destination: "Opportunity", tooltip: `Opportunity · closes in ${days} days, ${value}` },
      ],
    }
  }

  /*
    ONE SENTENCE, and it used to be two. The first said who this person is and
    what they care about — which is now the Profile block's whole job, three
    lines higher up and in a form you can act on. Saying it twice made the
    verdict the second place a reader met the same fact, and the weaker one.

    What is left is the imperative plus the clock, which is the only thing
    here that is not true of this person tomorrow.
  */
  return {
    /* NO CLOCK AND NO FIGURE. Both live in the record header — "Renewal in 19
       days" as a pill, "$480K" in the metadata row — and repeating them here
       made this the second and third place the same two numbers appeared. The
       verdict's job is the imperative; the header already carries the stakes. */
    text: `Answer ${who === c.name ? "them" : "her"} today — it is the only open question before the renewal.`,
    generatedAt: "Today, 08:12",
    /* One entity left. "migration timeline" went with the first sentence and
       the two figures went to the header, so linking either here would target
       a phrase the text no longer contains — which renders nothing and reads
       as a bug. */
    entities: [
      { text: "the renewal", destination: "Opportunity", tooltip: `Opportunity · closes in ${days} days, ${value}` },
    ],
  }
}

export function getSignals(c: UcpContact): UcpSignal[] {
  if (c.type !== "person" && c.type !== "company") return []
  const days  = renewalInDays(c) ?? 0
  const conns = getConnections(c).length
  const who   = c.name.split(" ")[0]

  /* The renewal's REAL DATE, not "in N days". The days figure lives in the
     record header and appears exactly once in the whole view; a signal row
     that repeated it was the third place the same number showed up. */
  const closes = new Date(KNOWLEDGE_NOW.getTime() + days * 86_400_000)
    .toLocaleDateString("en-GB", { day: "numeric", month: "short" })

  return [
    {
      type: "open_commitment", label: SIGNAL_CATALOG.open_commitment.label,
      detail: "Two escalations raised again at the QBR",
      severity: "critical", since: "19 days",
      evidence: { label: "Quarterly business review", destination: "Activity" },
      suggestionId: "s2",
    },
    {
      type: "response_debt", label: SIGNAL_CATALOG.response_debt.label,
      detail: "No written answer since Sep 2",
      severity: "critical", since: "6 days",
      evidence: { label: "Migration timeline requested · Aug 18", destination: "Activity" },
      suggestionId: "s1",
    },
    {
      type: "contract_clock", label: SIGNAL_CATALOG.contract_clock.label,
      detail: `Closes ${closes}`,
      severity: "attention", since: "the governance addendum is outstanding",
      evidence: { label: "Governance addendum · Legal drive", destination: "Knowledge" },
    },
    ...(conns <= 3 ? [{
      type: "single_thread" as SignalType, label: SIGNAL_CATALOG.single_thread.label,
      detail: `${who} is the only live contact`,
      severity: "attention" as SignalSeverity, since: "since Jun 2026",
      evidence: { label: `${conns} live contact${conns === 1 ? "" : "s"} on this account`, destination: "Overview" },
    }] : []),
    {
      type: "engagement_velocity", label: SIGNAL_CATALOG.engagement_velocity.label,
      detail: "Contact frequency down since Jul",
      severity: "watch", since: "2 months",
      evidence: { label: "4 touchpoints in Aug, 2 in Sep", destination: "Activity" },
    },
  ]
}

export function getSuggestions(c: UcpContact): UcpSuggestion[] {
  if (c.type !== "person" && c.type !== "company") return []
  const owner = "Priya Nair"

  return [
    {
      id: "s1", title: "Send the migration timeline",
      /* "renewal in N days" came off — it is in the record header, and a
         subtitle that repeats the header is the reader reading it twice. */
      reason: "asked twice",
      reasonFull: `${c.name.split(" ")[0]} asked for a written migration timeline on Aug 18 and again on the Sep 2 call. `
        + `Nothing has gone out. Their own security review cannot start without a date, so this is the only open question before the renewal.`,
      reasonEntities: [
        { text: "Aug 18",      destination: "Activity", tooltip: "Activity · Migration timeline requested" },
        { text: "Sep 2 call",  destination: "Activity", tooltip: "Activity · Outbound call, discovery follow-up" },
      ],
      status: "held", confidence: "In review", impact: 0.95, urgency: 0.9,
      draft: {
        body: [
          `Hi ${c.name.split(" ")[0]},`,
          `Thanks for your patience on this. The migration would complete by 14 November, with the cutover window in the first week of that month.`,
          `That gives your security review a fixed date to work back from. Happy to walk the plan through with your team if that helps.`,
        ],
        grounding: [
          { label: "Company · " + c.company,        factId: "f3" },
          { label: "Decision role · Evaluator",     factId: "f6" },
        ],
      },
      held: {
        missing: "a migration delivery date",
        owner,
        withoutCommitment: {
          body: [
            `Hi ${c.name.split(" ")[0]},`,
            `Thanks for your patience. I am confirming the migration date internally and will come back to you with it this week.`,
            `In the meantime, everything else in the plan is settled — happy to walk your team through the sequence so the security review can start on the parts that do not depend on the date.`,
          ],
          grounding: [{ label: "Decision role · Evaluator", factId: "f6" }],
        },
      },
    },
    {
      id: "s2", title: "Put a date on the two open escalations",
      reason: "raised at two consecutive reviews · no owner",
      reasonFull: "The escalations first logged in July were raised again at the August QBR and left without a resolution date. "
        + "That is the second consecutive review where they were discussed and not closed, and it is the thread most likely to carry into the renewal conversation.",
      reasonEntities: [
        { text: "August QBR", destination: "Activity", tooltip: "Activity · Quarterly business review" },
      ],
      // Scheduled work, not a message — so no draft, and Accept is the action.
      status: "new", confidence: "Inferred", impact: 0.8, urgency: 0.7,
    },
    {
      id: "s3", title: "Re-verify the direct line",
      reason: "read off an email signature in June · due to expire",
      reasonFull: "The phone number on this record was read off an email signature on Jun 24 and has not been confirmed since. "
        + "It is past the 60-day attestation window, so an agent can no longer commit to it.",
      reasonEntities: [
        { text: "Jun 24", destination: "Knowledge", tooltip: "Knowledge · Direct line, Truth Plane" },
      ],
      status: "ready", confidence: "Verified", impact: 0.4, urgency: 0.55,
      draft: {
        body: [
          `Hi ${c.name.split(" ")[0]},`,
          `Quick housekeeping — is ${c.phone} still the best direct line for you?`,
          `Happy to update our records either way.`,
        ],
        grounding: [{ label: "Direct line · " + c.phone, factId: "f5" }],
      },
    },
    {
      id: "s4", title: "Introduce a second contact on the account",
      reason: "single-threaded since June",
      reasonFull: "Every live thread on this account runs through one person. If they change role or go on leave, the relationship has no second point of contact, "
        + "and the renewal is inside that window.",
      reasonEntities: [],
      status: "accepted", confidence: "Inferred", impact: 0.6, urgency: 0.4,
    },
    {
      id: "s5", title: "Chase the signed order form",
      reason: "no longer applies",
      reasonFull: "The order form was countersigned on Sep 4, so there is nothing left to chase.",
      reasonEntities: [],
      status: "done", confidence: "Verified", impact: 0.3, urgency: 0.2,
      expired: "No longer applies — the order form came back signed.",
    },
  ]
}

export function getAgentReads(c: UcpContact): UcpAgentRead[] {
  const agent = c.agent.name
  const who   = c.name.split(" ")[0]

  return [
    {
      id: "r1",
      headline: `${who} controls the budget line, not just the evaluation`,
      body: `Two calls and one email thread put ${who} as the person approving spend rather than recommending it. `
        + "The account record still lists them as an evaluator, which is what the drafts have been assuming.",
      /* A DISPOSITION, and it is the archetype. It said the same thing the
         Profile block now leads with, one screen further down and in longer
         words — which is the duplicate rendering this section keeps growing
         back. Routed, not deleted. */
      subject: "disposition",
      agent, area: "Commercial", state: "In review", kind: "structural",
      evidence: [
        { label: "Outbound call · Sep 2",       destination: "Activity"  },
        { label: "Decision role · Sandbox",     destination: "Knowledge" },
      ],
    },
    {
      id: "r2",
      headline: "Legal signs, not procurement",
      body: "The governance addendum went to Legal directly and came back redlined by their counsel. "
        + "Procurement has not appeared in any thread on this account.",
      agent, area: "Governance", state: "Verified", kind: "structural",
      evidence: [
        { label: "Governance addendum · Legal drive", destination: "Knowledge" },
        { label: "Addendum sent for review · Aug 28", destination: "Activity"  },
      ],
    },
    {
      id: "r3",
      headline: "Patience is thinning on the timeline",
      body: "The second ask for the migration timeline was shorter than the first and dropped the pleasantries. "
        + "Nothing in it is hostile; the tone is somebody who has asked already.",
      agent, area: "Relationship", state: "Inferred", kind: "interpretive",
      evidence: [
        { label: "Migration timeline requested · Aug 18", destination: "Activity" },
      ],
    },
    {
      id: "r4",
      headline: "Auditability is the deciding criterion",
      body: `${who} has raised evidence, attestation and audit trails in every substantive conversation, and never raised price. `
        + "A pitch that leads on speed is answering a question they are not asking.",
      /* Also a disposition — it is "what lands" on this person, which is a
         Profile bullet rather than a read of a situation. */
      subject: "disposition",
      agent, area: "Commercial", state: "In review", kind: "interpretive",
      evidence: [
        { label: "Stated priority · Sandbox",  destination: "Knowledge" },
        { label: "Security review session",    destination: "Activity"  },
      ],
    },
  ]
}

/** The areas the read filter offers, derived so a new read cannot be
 *  unreachable. */
export function readAreas(reads: UcpAgentRead[]): string[] {
  return Array.from(new Set(reads.map(r => r.area))).sort()
}


/**
 * ── Progressive disclosure: which row is open when the section loads ───────
 *
 * Michael, 2026-09-11. One row expanded, never zero and never two, and a
 * `held` row among the first three wins.
 *
 * The held row wins because it is the only row in the queue that is BLOCKED
 * on the reader: everything else is work they can choose to do later, and a
 * held draft is work that is finished and cannot go out. Opening the section
 * on anything else hides the one row where a single click changes the state
 * of the system.
 *
 * "Among the first three" and not "anywhere" is deliberate. The queue shows
 * three rows by default, so a held row at position seven is not on screen —
 * expanding it would scroll the reader to a row they cannot see the context
 * of, which is worse than opening the top one.
 */
export function defaultExpandedRow(items: UcpSuggestion[], sort: SuggestionSort = "impact-urgency"): string | null {
  const live = sortSuggestions(items.filter(s => !RESOLVED_STATUSES.includes(s.status)), sort)
  const top  = live.slice(0, QUEUE_DEFAULT_ROWS)
  return (top.find(s => s.status === "held") ?? top[0])?.id ?? null
}

/** How many queue rows the section opens with. Three, because the default
 *  state has to fit one screen without scrolling and the expanded row is
 *  most of that budget. */
export const QUEUE_DEFAULT_ROWS = 3

/**
 * A duration, phrased for a collapsed summary line.
 *
 * "most severe: awaiting us for 6 days" reads; "awaiting us for 19 days out"
 * does not. `since` carries three shapes in these fixtures — a bare duration,
 * a duration with a qualifier ("19 days out"), and a date ("since Jun 2026") —
 * so only the bare one takes "for".
 */
export function sincePhrase(since: string): string {
  return /^\d+\s+\w+$/.test(since.trim()) ? `for ${since}` : since
}

/* ══════════════════════════════════════════════════════════════════════════
   PROFILE — the dispositional layer
   ══════════════════════════════════════════════════════════════════════════

   Michael, 2026-09-11. Intelligence answered what is happening and what to
   do, and never answered WHO THIS PERSON IS. Everything sat at one level of
   abstraction — events and actions — so every signal read as a loose fact and
   the reader had to assemble the model themselves. That, not the volume, is
   what made the section feel complex.

   THE ARCHITECTURAL RULE, and it is the one that keeps this honest:

     A trait INFERRED from behaviour lives in Intelligence.
     A trait ATTESTED through KCON lives in Overview.

   When a trait is attested onto the Truth Plane it stops rendering here and
   graduates. Intelligence shows what the system BELIEVES; Overview shows what
   the organisation STANDS BEHIND. That is why `source` exists on a trait and
   why it is not cosmetic.

   THE COPY TEST, which governs every string below: if Sandra read her own
   profile, she would have to RECOGNISE herself, not feel diagnosed. So these
   are observations in the third person and the present tense — "Asks for
   written proof", never "Prefers documentation" and never anything about what
   she feels. No personality framework, no clinical language, no emotional
   state. A profile of a person is a thing that person should be able to read.

   NOTHING IS SCORED. An archetype is a NAME — "Cautious Evaluator" — never
   "Caution: 72". A number on a person is a judgement wearing a decimal point,
   which is the same reason there is no risk score on a contact.
   ══════════════════════════════════════════════════════════════════════════ */

/** Closed catalog. The role this person occupies in the decision. */
export const ARCHETYPES = [
  "Economic Buyer", "Champion", "Technical Evaluator",
  "Blocker", "End User", "Gatekeeper", "Executive Sponsor",
] as const
export type Archetype = typeof ARCHETYPES[number]

/** Closed catalog. How they decide — not who they are. */
export const DECISION_STYLES = [
  "Cautious Evaluator", "Fast Mover", "Consensus Builder", "Detail Seeker", "Delegator",
] as const
export type DecisionStyle = typeof DECISION_STYLES[number]

/**
 * Where a trait came from, and it is the whole architecture in one field.
 * `inferred` — the system's read of observed behaviour. Renders here.
 * `attested` — passed KCON, on the Truth Plane. Renders in Overview.
 */
export type TraitSource = "inferred" | "attested"

/** Four categories, and an agent picks FROM them rather than inventing. */
export type TraitCategory = "decision-style" | "response-pattern" | "format-preference" | "escalation"

/**
 * The closed trait catalog. An agent selects from this list; it cannot write a
 * new sentence about a person and put it on their record. That is the
 * difference between a profile and an opinion.
 */
export const TRAIT_CATALOG: Record<TraitCategory, string[]> = {
  "decision-style":    ["Asks for written proof", "Decides after one review", "Waits for consensus", "Reads the appendix"],
  "response-pattern":  ["Replies within 2 days", "Replies same day", "Goes quiet between milestones", "Quiet on calls"],
  "format-preference": ["Prefers email over calls", "Asks for documents, not decks", "Wants numbers first"],
  "escalation":        ["Escalates to finance", "Escalates to legal", "Brings a second decision-maker"],
}

export interface ProfileEvidence { label: string; destination: string }

export interface ProfileTrait {
  label:    string
  /**
   * The same trait as a clause inside a sentence. "Quiet on calls" is a chip;
   * "stays quiet on calls" is English, and the block reads as prose now.
   *
   * Stored rather than derived, because turning a label into a clause is a
   * writing job — a rule that lowercases and prefixes produces "asks for
   * written proof" correctly and "escalates to finance" only by luck.
   */
  prose:    string
  category: TraitCategory
  source:   TraitSource
  /** Required. A trait with nothing behind it does not render — `renderable`
   *  below enforces it rather than trusting each call site. */
  evidence: ProfileEvidence
}

export interface ProfileBullet { text: string; evidence: ProfileEvidence }

/**
 * How to reach this person, DERIVED FROM WHERE THEY ACTUALLY REPLY rather
 * than from a declared preference field. A contact record's "preferred
 * channel" is whatever somebody typed into a form once; this is the channel
 * that has produced answers.
 */
export interface ProfileChannel {
  preferred:    string
  window:       string
  /** Observed median, always explicit. "~2 days", never "quickly". */
  responseTime: string
  lastTouch:    string
  /** The same four facts as one sentence, for the prose block. A middot-
   *  separated run of metadata is a different register from the line above it,
   *  and mixing the two is most of why the block read as a data dump. */
  prose:        string
}

export interface UcpProfile {
  archetype: {
    primary:      Archetype
    primaryState: ConfidenceState
    style:        DecisionStyle
    styleState:   ConfidenceState
  }
  traits:     ProfileTrait[]
  /** Null when there is not enough history to read one. The line then says so
   *  rather than guessing. */
  channel:    ProfileChannel | null
  lands:      ProfileBullet[]
  doesntLand: ProfileBullet[]
  highlights: ProfileBullet[]
}

/** Five in the default state. Past that the line stops being a line. */
export const PROFILE_TRAITS_MAX = 5

/** Same rule as signals and reads: no evidence, no render, enforced here. */
export function renderableTraits(traits: ProfileTrait[]): ProfileTrait[] {
  return traits.filter(t => !!t.evidence && !!t.evidence.label)
}
export function renderableBullets(bullets: ProfileBullet[]): ProfileBullet[] {
  return bullets.filter(b => !!b.evidence && !!b.evidence.label)
}

/**
 * WHICH PARTS OF A PROFILE CAN BECOME A FACT.
 *
 * The same structural/interpretive guardrail that governs Agent reads, applied
 * one level up. Structural claims are observable, checkable and promotable;
 * interpretive ones are a reading, and a reading about a person is never
 * persisted as an attested fact about them.
 *
 *   structural    archetype.primary, channel.preferred, channel.responseTime
 *   interpretive  archetype.style, What lands, What doesn't
 *
 * Only the structural ones carry Confirm.
 */
export const PROFILE_STRUCTURAL = ["archetype.primary", "channel.preferred", "channel.responseTime"] as const
export type ProfileStructuralField = typeof PROFILE_STRUCTURAL[number]

export function getProfile(c: UcpContact): UcpProfile | null {
  /* A company is not an interlocutor and has no decision style. Employees and
     assets are not people you are selling to. The profile is a customer thing
     until the product says otherwise. */
  if (c.type !== "person") return null

  const who = c.name.split(" ")[0]

  return {
    archetype: {
      primary:      "Economic Buyer",
      /* Structural and observable — two calls and an email thread put her
         approving spend rather than recommending it — but nobody has attested
         it, so it reads Inferred and carries Confirm. */
      primaryState: "In review",
      style:        "Cautious Evaluator",
      /* Interpretive. It never reaches Verified because it is never attested. */
      styleState:   "Inferred",
    },
    traits: [
      { label: "Asks for written proof",  prose: "asks for written proof",     category: "decision-style",    source: "attested",
        evidence: { label: "Migration timeline requested · Aug 18", destination: "activity" } },
      { label: "Replies within 2 days",   prose: "replies within two days",    category: "response-pattern",  source: "inferred",
        evidence: { label: "11 replies, median 1.8 days",          destination: "activity" } },
      { label: "Escalates to finance",    prose: "escalates to finance",       category: "escalation",        source: "inferred",
        evidence: { label: "Finance joined the last two calls",    destination: "activity" } },
      { label: "Quiet on calls",          prose: "stays quiet on calls",       category: "response-pattern",  source: "inferred",
        evidence: { label: "QBR · 52 min, 6 attendees",            destination: "activity" } },
      { label: "Prefers email over calls", prose: "prefers email over calls",  category: "format-preference", source: "attested",
        evidence: { label: "Channel preference · Sandbox",         destination: "knowledge" } },
    ],
    channel: {
      preferred:    "Email",
      window:       "mornings",
      responseTime: "~2 days",
      lastTouch:    "30m ago",
      prose:        "Email, mornings, replies in about two days.",
    },
    lands: [
      { text: "Written timelines",          evidence: { label: "Asked twice, in writing both times", destination: "activity" } },
      { text: "Numbers before narrative",   evidence: { label: "Opened the QBR on usage figures",    destination: "activity" } },
      { text: "Short emails with one ask",  evidence: { label: "Replied same day to the 2-line note", destination: "activity" } },
    ],
    doesntLand: [
      { text: "Calls without an agenda",         evidence: { label: "Declined two ad-hoc invites",      destination: "activity" } },
      { text: "Vague commitments",               evidence: { label: "Asked for a date, not a quarter",  destination: "activity" } },
      { text: "Long threads with multiple asks", evidence: { label: "Answered 1 of 3 questions in Aug", destination: "activity" } },
    ],
    highlights: [
      { text: `Owns the budget line on ${c.company}`,   evidence: { label: "Decision role · Sandbox",     destination: "knowledge" } },
      { text: "Brought finance into the last two calls", evidence: { label: "Outbound call · Sep 2",      destination: "activity" } },
      { text: `Blocked on one date, not on price`,       evidence: { label: `${who}'s security review`,   destination: "activity" } },
    ],
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   COMMUNICATION THREADS — the Email / SMS / Call preview
   ══════════════════════════════════════════════════════════════════════════

   Figma: Unified Customer Profile, sections Email (7698:2032), SMS
   (7698:2033) and Call (7698:2034). Michael, 2026-09-11: build that design,
   adapted to the design system, using its tokens and components.

   ONE SHAPE, THREE CHANNELS. The three Figma sections are the same panel with
   different content — a header, Conversation | Details tabs, an AI summary, a
   thread, and a details sheet. Building three components would have meant
   three places to fix the next thing, so the model is one type with a
   `channel` discriminator and the panel branches on content, never on layout.

   WHAT THE THREAD CAN CONTAIN, from the design:

     message   a bubble. Outbound sits right and tinted with a delivery
               receipt; inbound sits left with no fill. That asymmetry is the
               whole reason a thread reads as a conversation rather than a log.
     system    what the platform did, on a success tint — "Appointment booked",
               "Routed to a human".
     note      an internal note on an alert tint, with its author. Visible to
               the team and never to the contact, which is why it cannot look
               like a message.
     separator a date break. The Activity feed already has ElapsedSeparator
               and it is the same device, so the panel reuses it.
   ══════════════════════════════════════════════════════════════════════════ */

export type ThreadEntryKind = "message" | "system" | "note" | "separator"

export interface ThreadEntry {
  kind:      ThreadEntryKind
  /** Messages only. Outbound is us; inbound is them. */
  direction?: "outbound" | "inbound"
  /** Who said it — drives the avatar's initials and its colour. */
  author?:   string
  body:      string
  /** Clock time on a message, a date on a system line or a note. */
  at?:       string
  /**
   * Delivery, on outbound messages only, and ONLY what the channel can
   * actually report. Email knows it was opened; SMS knows the carrier took
   * it and nothing after that — there is no read receipt to have.
   */
  receipt?:  "sent" | "delivered" | "opened"
}

export interface CommsAttachment { name: string; kind: "doc" | "txt" | "image" }

export interface CommsThread {
  channel:   "email" | "sms" | "call"
  /** The panel's title — a subject for email, the number for SMS and calls. */
  title:     string
  /** Under the title. */
  when:      string
  /** The purple summary card. Null when there is nothing worth summarising —
   *  a two-line SMS exchange is shorter than any summary of it. */
  summary:   string | null
  entries:   ThreadEntry[]
  /** The Details tab, in the design's own order. */
  status:    { label: string; variant: TagVariantLite }
  assigned:  string
  dueBy?:    { at: string; overdueIn: string }
  sentiment?: "Positive" | "Neutral" | "Negative"
  created:   string
  lastActivity: string
  attachments: CommsAttachment[]
  /** Calls only: what the transcript and the recording say. */
  duration?: string
  recording?: string
}

/**
 * The thread behind one Activity row. Returns null for anything that is not a
 * communication — an event or a task has no conversation to open.
 */
export function getThread(c: UcpContact, a: UcpActivity): CommsThread | null {
  if (CHANNEL_GROUP[a.channel] !== "communication") return null
  const who   = c.name.split(" ")[0]
  const agent = c.agent.name

  if (a.channel === "email") {
    const inbound = a.title.startsWith("Inbound")
    return {
      channel: "email",
      title:   inbound ? "Migration timeline" : "Governance addendum for review",
      when:    a.timestamp,
      summary: a.aiSummary ?? null,
      entries: inbound ? [
        { kind: "separator", body: "August 2026" },
        { kind: "message", direction: "inbound", author: c.name, at: "7:55 AM",
          body: `Following up on the migration timeline — could you send it in writing? Our security review cannot start until we can attach a date to it.` },
        { kind: "note", author: c.owner, at: "Aug 18, 2026",
          body: "Second ask. I do not have a date I can commit to yet — checking with delivery before replying." },
        { kind: "system", at: "Aug 18, 2026", body: `${agent} drafted a reply and held it — no attested delivery date` },
      ] : [
        { kind: "separator", body: "August 2026" },
        { kind: "message", direction: "outbound", author: c.owner, at: "9:40 AM", receipt: "opened",
          body: `Hi ${who} — the redlined addendum is attached for Legal to countersign. Shout if anything in clause 7 needs another pass.` },
        { kind: "system", at: "Aug 28, 2026", body: `Opened twice by ${who}. No reply yet.` },
      ],
      status:   inbound ? { label: "Awaiting reply", variant: "alert" } : { label: "Sent", variant: "success" },
      assigned: c.owner,
      dueBy:    inbound ? { at: "Sep 12, 17:00", overdueIn: "Due in 2d" } : undefined,
      sentiment: "Neutral",
      created:  a.timestamp,
      lastActivity: "6 days ago",
      attachments: inbound ? [] : [
        { name: "Addendum_v3_redlined.pdf", kind: "doc" },
        { name: "Clause-7-changes.txt",     kind: "txt" },
      ],
    }
  }

  if (a.channel === "sms") {
    return {
      channel: "sms",
      title:   c.phone,
      when:    a.timestamp,
      /* No summary. The whole exchange is two messages — a summary of it
         would be longer than it is. */
      summary: null,
      entries: [
        { kind: "message", direction: "outbound", author: c.owner, at: "5:12 PM", receipt: "delivered",
          body: a.smsBody ?? "" },
      ],
      status:   { label: "Delivered", variant: "success" },
      assigned: c.owner,
      created:  a.timestamp,
      lastActivity: "3 weeks ago",
      attachments: [],
    }
  }

  // Call
  const inbound = a.title.startsWith("Inbound")
  return {
    channel: "call",
    title:   c.phone,
    when:    a.timestamp,
    summary: a.aiSummary ?? null,
    entries: inbound ? [
      { kind: "system", at: a.timestamp, body: `${agent} answered · identity verified` },
      { kind: "message", direction: "inbound", author: c.name, at: "10:42 AM",
        body: "I need the audit evidence pack for the Q3 review — can someone send it today?" },
      { kind: "message", direction: "outbound", author: agent, at: "10:44 AM",
        body: "I can see the pack on the Legal drive. Putting you through to the account owner to release it." },
      { kind: "system", at: a.timestamp, body: `Escalated to ${c.owner}` },
      { kind: "note", author: c.owner, at: "Aug 12, 2026",
        body: "Sent the evidence pack the same afternoon. Nothing outstanding from this call." },
    ] : [
      { kind: "system", at: a.timestamp, body: `${c.owner} dialled out` },
      { kind: "message", direction: "inbound", author: c.name, at: "2:07 PM",
        body: "The evaluation is still funded for this cycle. What I need is the migration timeline in writing." },
      { kind: "message", direction: "outbound", author: c.owner, at: "2:09 PM",
        body: "Understood — I will confirm the date internally and send it through this week." },
    ],
    status:   inbound ? { label: "Escalated", variant: "alert" } : { label: "Resolved", variant: "success" },
    assigned: inbound ? agent : c.owner,
    sentiment: inbound ? "Neutral" : "Positive",
    created:  a.timestamp,
    lastActivity: inbound ? "4 weeks ago" : "1 week ago",
    attachments: [{ name: "call-recording.mp3", kind: "doc" }],
    duration:  inbound ? "6:41" : "6:18",
    recording: "Available · 90-day retention",
  }
}
