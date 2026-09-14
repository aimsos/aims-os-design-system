/**
 * The per-type model for the UCP — what a Customer, an Employee and a Company
 * each publish, read by both surfaces: the profile takes its tabs and its own
 * Overview widget from here, the roster takes its filter facets.
 *
 * One module for both because they are one fact. A type that publishes a
 * Department field should be filterable by it and should show it on the record;
 * splitting that across two files is how the list and the profile end up
 * disagreeing about what a type is.
 *
 * ── Ported from the entity-workspace experiment ───────────────────────────
 * The experiment's central claim was that a profile should be driven by the
 * MODEL rather than by the screen: the same code renders a vehicle and a
 * customer, and they differ only in what their type published. That claim does
 * not need twelve types to be worth having — it is already true of three.
 *
 * The evidence was sitting in the fixtures the whole time. `UcpContact.subtitle`
 * is documented as "role · department, or industry · size · HQ", which is three
 * different field sets wearing one string:
 *
 *   Customer   Head of Compliance · Legal · Meridian Corp
 *   Employee   Account Director · Revenue · Chicago, IL
 *   Company    Automotive Retail · 640 employees · Tampa, FL
 *
 * Flattening those into one metadata line was the screen deciding that every
 * type has the same shape. It does not. This gives each type back its own
 * fields and, where the data supports it, its own tab.
 *
 * ── The spine stays universal ─────────────────────────────────────────────
 * Overview · Snapshot · Activity · Drives are the same on every type, because
 * they are about KNOWLEDGE rather than about the thing: every record is
 * ingested, claimed about, interacted with and documented. What the type adds
 * is the domain.
 *
 * ── A type with nothing to add still renders ──────────────────────────────
 * Customer and Employee get no extra tab, and that asymmetry is the point
 * rather than an omission: a company's roster of people is real data the
 * fixtures already carry, and a customer has no equivalent. Inventing one to
 * make the three types symmetric would be the screen deciding the model's
 * shape again, in the other direction.
 */

import type { MetricVariant, UcpContact } from "./ucpShared"

export interface ProfileWidgetRow {
  label:   string
  value:   string
  icon:    string
  variant: MetricVariant
  /** What this field means, on hover and on focus. A label and a value say
   *  what it is; the tooltip says why anyone would care. Required, so a new
   *  field cannot ship without one. */
  tooltip: string
}

/**
 * ── What a type's Overview is made of ──────────────────────────────────────
 *
 * Michael, 2026-09-10: "usar diferentes widgets para cada caso para que no se
 * muestren siempre los mismos".
 *
 * Every type used to draw the same canvas in the same order — the type's own
 * field widget, then Governance, then Risk, then Connections, then Recent
 * activity, each one column wide. Only the CONTENT of the first one changed,
 * so a fleet asset and a VP of Operations opened to the same page furniture,
 * and the widget that mattered most for each of them sat in whichever slot the
 * loop happened to reach.
 *
 * So the composition is published by the type, the way its fields and tabs
 * already are. A `CanvasEntry` is a widget the screen knows how to build plus
 * the span it gets HERE — the same Risk study is one column on a customer,
 * where the relationship carries the risk, and two on an asset, where the
 * asset's own condition IS the record.
 *
 * `self` means the type's own field widget, so a type can place it rather than
 * always leading with it. Studies named here still disappear when the record
 * has nothing for them (`contact.governance === "empty"` and friends) — the
 * order is the type's, the presence is the record's.
 */
/**
 * ── The widget shapes a canvas can place ───────────────────────────────────
 *
 * Michael, 2026-09-11: vary the TYPES of widget so the same ones do not show
 * up every time. The composition already differed per entity type, but it was
 * drawn from four renderers and two of them — Governance and Risk — were the
 * same three-counter row with different numbers. A canvas of three widgets
 * where two are the same shape reads as one widget repeated.
 *
 * These map onto the widget catalog's own shapes rather than being invented
 * here: `profile-card`, `stat-row`, `alerts`, `board`, `kpi`, `connections`
 * and `feed` are all entries in src/lib/widget-catalog.ts. A prototype that
 * shows a shape the catalog has never heard of is the hallucination the
 * catalog exists to prevent.
 */
export type CanvasWidget =
  | "self"        // profile-card — the type's own fields
  | "governance"  // stat-row     — three counters
  | "risk"        // stat-row     — three counters
  | "connections" // connections  — who else is on this record
  | "activity"    // feed         — what happened, newest first
  | "alerts"      // alerts       — open problems, worst first
  | "planes"      // board        — counts grouped by knowledge plane
  | "kpi"         // kpi          — one headline number with its context

export interface CanvasEntry {
  widget: CanvasWidget
  /** 1, 2 or 3 columns. */
  span:   1 | 2 | 3
}

export interface UcpProfileSpec {
  /** Beyond the universal four. Empty when the type has nothing to add. */
  extraTabs: { id: string; label: string }[]
  /** The type's own Overview widget — the fields only this type carries. */
  widget:    { uid: string; title: string; rows: ProfileWidgetRow[] }
  /** The Overview canvas, in order, with each widget's span. */
  canvas:    CanvasEntry[]
}

/**
 * Split `subtitle` without assuming how many parts it has. Person subtitles
 * carry two in some fixtures and three in others — "VP of Operations ·
 * Meridian Corp" against "Head of Compliance · Legal · Meridian Corp" — so a
 * positional read would silently label a company as a department.
 */
function parts(c: UcpContact): string[] {
  return c.subtitle.split("·").map(s => s.trim()).filter(Boolean)
}

export function specForContact(c: UcpContact): UcpProfileSpec {
  const p = parts(c)

  if (c.type === "company") {
    const [industry, headcount, hq] = p
    return {
      extraTabs: [{ id: "people", label: "People" }],
      /* The org leads and takes two columns — industry, headcount and HQ are
         what every other widget here gets read against. Governance sits
         beside it because a company is where policy attaches. Connections
         goes full width: on a company they are the PEOPLE, and a column of
         three names with the rest hidden is the widget failing. */
      /* profile-card · board · connections · feed — four different shapes.
         The board replaces a second counter row: a company's knowledge is a
         composition (how much is attested vs proposed vs raw material), and a
         composition is what a board shows. */
      canvas: [
        { widget: "self",        span: 2 },
        { widget: "planes",      span: 1 },
        { widget: "connections", span: 3 },
        { widget: "activity",    span: 3 },
      ],
      widget: {
        uid: "organization", title: "Organization",
        rows: [
          { label: "Industry",      value: industry  ?? "—", icon: "Factory",   variant: "informative",
            tooltip: `Industry · ${industry ?? "not recorded"}. Published by the organization model, and what the risk study benchmarks against.` },
          { label: "Headcount",     value: headcount ?? "—", icon: "Users",     variant: "neutral",
            tooltip: `Headcount · ${headcount ?? "not recorded"}. From the account record, not from the people in AIMS — the Connections widget shows those.` },
          { label: "Headquarters",  value: hq        ?? "—", icon: "MapPin",    variant: "neutral",
            tooltip: `Headquarters · ${hq ?? "not recorded"}. Where the account is registered, which decides the data residency rules that apply.` },
          { label: "Account owner", value: c.owner,          icon: "UserRound", variant: "informative",
            tooltip: `Account owner · ${c.owner}. Holds this relationship on our side; escalations go here first.` },
        ],
      },
    }
  }

  if (c.type === "employee") {
    const [role, department, location] = p
    return {
      extraTabs: [],
      /* Governance takes two columns and Risk is absent. An employee record
         exists so somebody can answer "is this person trained, cleared and
         signed off" — that is the Governance study, and a risk score on a
         colleague is a thing this product should not be computing. */
      /* profile-card · stat-row · feed. Governance keeps the counter row here
         because "12 of 12 policies signed" IS three counters — it is the one
         place that shape is the right answer rather than the default one. */
      canvas: [
        { widget: "self",       span: 1 },
        { widget: "governance", span: 2 },
        { widget: "activity",   span: 3 },
      ],
      widget: {
        uid: "employment", title: "Employment",
        rows: [
          { label: "Role",       value: role       ?? "—", icon: "BriefcaseBusiness", variant: "informative",
            tooltip: `Role · ${role ?? "not recorded"}. Decides which policies and training the Governance study checks for.` },
          { label: "Department", value: department ?? "—", icon: "Building2",         variant: "neutral",
            tooltip: `Department · ${department ?? "not recorded"}. From the HR system of record.` },
          { label: "Location",   value: location   ?? "—", icon: "MapPin",            variant: "neutral",
            tooltip: `Location · ${location ?? "not recorded"}. Where this person works, which decides the employment rules that apply.` },
          { label: "Manager",    value: c.owner,           icon: "UserRound",         variant: "informative",
            tooltip: `Manager · ${c.owner}. Reporting line inside the tenant; approvals route here.` },
        ],
      },
    }
  }

  if (c.type === "policy") {
    const [scope, cycle, effective] = p
    return {
      extraTabs: [],
      /* The policy\u0027s own fields ARE the record — scope, review cycle,
         effective date — so they take two columns, and Governance beside them
         says how the tenant is doing against it. Nothing else applies: a
         policy has no relationships and no risk of its own. */
      /* profile-card · board · feed. A policy's question is how much evidence
         stands behind it, which is a composition, not three counters. */
      canvas: [
        { widget: "self",   span: 2 },
        { widget: "planes", span: 1 },
        { widget: "activity", span: 3 },
      ],
      widget: {
        uid: "policy", title: "Policy",
        rows: [
          { label: "Scope",      value: scope     ?? "—", icon: "Globe",      variant: "informative",
            tooltip: `Scope · ${scope ?? "not recorded"}. How far this policy reaches, which decides who has to evidence it.` },
          { label: "Review",     value: cycle     ?? "—", icon: "RefreshCw",  variant: "neutral",
            tooltip: `Review cycle · ${cycle ?? "not recorded"}. How often governance re-opens it.` },
          { label: "Effective",  value: effective ?? "—", icon: "CalendarCheck", variant: "neutral",
            tooltip: `Effective · ${effective ?? "not recorded"}. Anything before this date was governed by the previous version.` },
          { label: "Owner",      value: c.owner,          icon: "UserRound",  variant: "informative",
            tooltip: `Owner · ${c.owner}. Signs the review off; escalations go here.` },
        ],
      },
    }
  }

  if (c.type === "asset") {
    const [cls, site, acquired] = p
    return {
      extraTabs: [],
      /* Risk takes two columns here, and it is the only type where it does.
         On a person a risk score is a read of a relationship; on a vehicle it
         is the service interval, the overdue mileage and the condition — the
         asset\u0027s own state, which is most of what the record is for. */
      /* profile-card · kpi · stat-row · feed — four shapes, and the only
         canvas with a KPI. An asset has ONE number that decides what happens
         to it next, and a headline figure is what that deserves; the risk
         counters sit beside it as the detail behind it. */
      canvas: [
        { widget: "self",     span: 1 },
        { widget: "kpi",      span: 1 },
        { widget: "risk",     span: 1 },
        { widget: "activity", span: 3 },
      ],
      widget: {
        uid: "asset", title: "Asset",
        rows: [
          { label: "Class",     value: cls      ?? "—", icon: "Truck",     variant: "informative",
            tooltip: `Class · ${cls ?? "not recorded"}. What kind of asset this is, which decides its service interval.` },
          { label: "Site",      value: site     ?? "—", icon: "Store",     variant: "neutral",
            tooltip: `Assigned site · ${site ?? "not recorded"}. Where it lives when it is not in use.` },
          { label: "Acquired",  value: acquired ?? "—", icon: "Calendar",  variant: "neutral",
            tooltip: `Acquired · ${acquired ?? "not recorded"}. The start of its depreciation and of its service history.` },
          { label: "Custodian", value: c.owner,         icon: "UserRound", variant: "informative",
            tooltip: `Custodian · ${c.owner}. Accountable for the asset, which is not the same as owning it.` },
        ],
      },
    }
  }

  // Customer. The last part is the account; anything between it and the role is
  // the department, which only some records carry.
  const role    = p[0] ?? "—"
  const account = p.length > 1 ? p[p.length - 1] : c.company
  const dept    = p.length > 2 ? p[1] : undefined
  const rows: ProfileWidgetRow[] = [
    { label: "Role",    value: role,    icon: "BriefcaseBusiness", variant: "informative",
      tooltip: `Role · ${role}. What this person decides on the account, which is what makes them worth contacting.` },
    { label: "Account", value: account, icon: "Building2",         variant: "neutral",
      tooltip: `Account · ${account}. The organization record this contact belongs to.` },
  ]
  if (dept) rows.push({ label: "Department", value: dept, icon: "Users", variant: "neutral",
    tooltip: `Department · ${dept}. Their side of the account, not ours.` })
  rows.push({ label: "Account owner", value: c.owner, icon: "UserRound", variant: "informative",
    tooltip: `Account owner · ${c.owner}. Holds this relationship on our side; escalations go here first.` })

  /* A customer's three columns each answer a different question and none of
     them is bigger than the others: who they are, how the relationship is
     going, and who else is in it. Risk earns a column on a person because it
     is a read of the RELATIONSHIP — Intelligence carries the reasoning, this
     is the number. Governance is absent: a contact is not a policy subject. */
  return {
    extraTabs: [],
    /* profile-card · alerts · connections · feed. Four shapes, no repeats.
       Risk's counter row gave way to the alerts list: the counters restated a
       score whose reasoning now lives in Intelligence, while the alerts show
       WHICH conditions are open on this person — the same data the Intelligence
       signals block ranks, in the place somebody lands first. */
    canvas: [
      { widget: "self",        span: 1 },
      { widget: "alerts",      span: 1 },
      { widget: "connections", span: 1 },
      { widget: "activity",    span: 3 },
    ],
    widget: { uid: "account", title: "Account", rows },
  }
}

/**
 * The full tab strip — Michael's structure, 2026-09-10:
 *
 *   Overview | Activity | Intelligence | Knowledge | + industry modules
 *
 * Four universal tabs, in that order, because each answers a different
 * question and they get asked in that sequence:
 *
 *   Overview      what matters about this record right now (the canvas)
 *   Activity      what happened — communications, notes, events, tasks
 *   Intelligence  what the system THINKS: reads, signals, recommendations,
 *                 deductions. One AI tab rather than a tab per AI feature
 *   Knowledge     what the system HOLDS: documents, pending claims, verified
 *                 facts. The entity's own mini-governance
 *
 * The previous strip had `Snapshot` and `Drives`, and the split ran along the
 * wrong seam: the facts table (verified knowledge) sat with nothing, while
 * documents had a tab of their own. Intelligence is what the system inferred,
 * Knowledge is what it can prove — and Drive, Sandbox and Truth are three
 * shelves of the same cupboard.
 */
/**
 * INTELLIGENCE IS OFF FOR THIS VERSION — Michael, 2026-09-14.
 *
 * A flag, not a deletion. The tab, `IntelligenceTab`, the signal catalogue,
 * the suggestion model and the profile layer are all still here and all still
 * compile; the strip simply does not offer the tab. Deleting it would throw
 * away a build that took four passes to get right, and turning it back on
 * should be this one line rather than an archaeology exercise.
 *
 * Two places read it, and both have to: the strip, so the tab is not offered,
 * and the Overview's Open Signals widget, whose rows link INTO Intelligence.
 * A live link to a hidden tab is worse than no link — it is a dead click on
 * the first screen of the record.
 */
export const INTELLIGENCE_ENABLED = false

export function tabsForContact(c: UcpContact): { id: string; label: string }[] {
  return [
    { id: "overview",     label: "Overview"     },
    { id: "activity",     label: "Activity"     },
    ...(INTELLIGENCE_ENABLED ? [{ id: "intelligence", label: "Intelligence" }] : []),
    { id: "knowledge",    label: "Knowledge"    },
    // Industry modules last. A type's own tab is the domain layer on top of
    // the spine — a Company brings People — and it sits after the four
    // because the spine is what every record has and the module is what this
    // one adds.
    ...specForContact(c).extraTabs,
  ]
}

/**
 * What the agent trigger should say. The component's default takes the first
 * token of the name, which identifies a person and misreads an organisation —
 * "Ask about Riverbend" for Riverbend Auto Group is close enough to be
 * confusing, and it is the account's name doing work the record's name should.
 * Companies get the type instead; people keep their first name, which is what
 * you would actually say out loud.
 */
export function assistantLabelFor(c: UcpContact): string | undefined {
  return c.type === "company" ? "Ask about this company" : undefined
}

// ── Filter facets, published by the type ─────────────────────────────────────

/**
 * A facet the roster can filter on. `inline` earns a slot in the visible filter
 * line rather than a row behind All filters, and the criterion is frequency —
 * FILTERS_SPEC's own rule for what stays out of the slideout.
 */
export interface UcpFacet {
  id:      string
  label:   string
  inline?: boolean
}

/**
 * Facets per tab. The All tab gets the common floor rather than the union,
 * because a facet that only some rows can answer filters the rest out by
 * accident: filtering a mixed list by Department would silently drop every
 * customer and company, which reads as "no results" rather than "not
 * applicable". Microsoft derives the same restriction for Dataverse's mixed
 * search, and it is the one place the union is the wrong answer.
 */
const FACETS: Record<string, UcpFacet[]> = {
  all: [
    { id: "status", label: "Status", inline: true },
    { id: "owner",  label: "Owner",  inline: true },
    { id: "source", label: "Source" },
  ],
  person: [
    { id: "status",  label: "Status",  inline: true },
    { id: "account", label: "Account", inline: true },
    { id: "owner",   label: "Owner" },
    { id: "source",  label: "Source" },
  ],
  employee: [
    { id: "status",     label: "Status",     inline: true },
    { id: "department", label: "Department", inline: true },
    { id: "location",   label: "Location" },
    { id: "owner",      label: "Manager" },
    { id: "source",     label: "Source" },
  ],
  company: [
    { id: "status",   label: "Status",       inline: true },
    { id: "industry", label: "Industry",     inline: true },
    { id: "hq",       label: "Headquarters" },
    { id: "owner",    label: "Account owner" },
    { id: "source",   label: "Source" },
  ],
  // The three that are not people. Their facets are not a variation on a
  // contact's — a repair order filters by store, a policy by scope. Which is
  // the argument for the type publishing its own rather than the screen
  // guessing from a shared shape.
  policy: [
    { id: "status", label: "Status", inline: true },
    { id: "scope",  label: "Scope",  inline: true },
    { id: "owner",  label: "Owner" },
    { id: "source", label: "Source" },
  ],
  asset: [
    { id: "status", label: "Status", inline: true },
    { id: "store",  label: "Site",   inline: true },
    { id: "class",  label: "Class" },
    { id: "owner",  label: "Custodian" },
    { id: "source", label: "Source" },
  ],
}

export function facetsForType(type: string): UcpFacet[] {
  return FACETS[type] ?? FACETS.all
}

/**
 * This record's value for a facet, or "" when the type does not carry it.
 * Reading it off the same `subtitle` split the profile uses is deliberate: one
 * parser, so a record cannot be filed under a Department the profile never
 * shows.
 */
export function facetValue(c: UcpContact, facetId: string): string {
  const p = parts(c)
  switch (facetId) {
    case "status":  return c.status
    case "owner":   return c.owner
    case "source":  return c.source.label
    case "account": return p.length > 1 ? p[p.length - 1] : c.company
    case "department": return c.type === "employee" ? (p[1] ?? "") : ""
    case "location":   return c.type === "employee" ? (p[2] ?? "") : ""
    case "industry":   return c.type === "company"  ? (p[0] ?? "") : ""
    case "hq":         return c.type === "company"  ? (p[2] ?? "") : ""
    // The non-people types. Same parser, different position — each type says
    // what its subtitle means, and nothing else has to know.
    case "store":      return c.type === "asset" ? (p[1] ?? "") : ""
    case "scope":      return c.type === "policy" ? (p[0] ?? "") : ""
    case "class":      return c.type === "asset"  ? (p[0] ?? "") : ""
    default: return ""
  }
}

/** Every value a facet actually takes across a set of records, sorted. */
export function facetOptions(rows: UcpContact[], facetId: string): string[] {
  return Array.from(new Set(rows.map(c => facetValue(c, facetId)).filter(Boolean))).sort()
}
