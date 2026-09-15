// The one list of widget types.
//
// Three lists used to disagree, and the audit had a check for exactly that:
//
//   WIDGET_DEFS         (App.tsx)                  14 documented DS widgets
//   WIDGET_TYPES        (widget-builder)           12 chart types
//   WIDGET_TYPES        (composable-dashboards)     6 chart types
//
// And a fourth lived outside the repo entirely: Thom's widget-canvas prototype
// offers 22 types in three named categories, which is the flow this repo is
// meant to be catching up to.
//
// ── Why a union, and what the two axes are ─────────────────────────────────
//
// Michael chose the union over picking a side (2026-09-07). The reason the
// three lists never reconciled is that they were never the same kind of list:
//
//   · Thom's 22 are AUTHORABLE — a person builds one in the Widget Builder by
//     pointing it at a dataset. "Bar Chart" is a way to draw a query.
//   · Nine of the catalog's 14 are SYSTEM widgets — My Work, My Team,
//     Workflows, Pending Outputs, Agent Catalog, Notes, Folder Navigation,
//     Act Now Summary, Timeline. They ship with the platform, they know their
//     own data, and you cannot build one from a dataset. They belong in the
//     catalog and must never appear in the builder's type picker.
//
// So `authorable` is not a category, it is what separates the two lists. The
// builder filters on it; the catalog and DS Health show everything.
//
// The second axis is `catalogId` — whether a type is documented in the DS yet:
//
//   · a catalogId means WIDGET_DEFS documents it (states, content variants,
//     do/don't, and in most cases a Figma node)
//   · null means it is a CANDIDATE: real in a prototype, not specified yet.
//     Ten of the 31 are candidates today. That is the queue Michael writes
//     specs from — see DS Health.
//
// Several types share one catalogId on purpose: Bar, Line, Donut, Funnel,
// Gauge, Heat Map, Correlation and Map are all the DS "Charts Widget". They
// are one documented component with eight render modes, not eight components.

import type { WidgetShape } from "@/components/experimental/widget-parts"

/** Thom's three categories, kept verbatim — they are the ones his prototype
 *  groups the type picker by, and the copy under each heading is his. */
export type WidgetCategory = "statistical" | "data-display" | "consumption" | "system"

export const WIDGET_CATEGORIES: { id: WidgetCategory; label: string; blurb: string }[] = [
  { id: "statistical",  label: "Statistical",  blurb: "Charts, KPIs, gauges" },
  { id: "data-display", label: "Data display", blurb: "Record lists, profile cards, tables" },
  { id: "consumption",  label: "Consumption",  blurb: "Credits, tokens, cost" },
  // Not one of Thom's three. System widgets are not offered in the builder at
  // all, so this category exists only so the catalog page has somewhere to
  // file them — it is never rendered as a filter in the type picker.
  { id: "system",       label: "System",       blurb: "Ship with the platform — not authorable" },
]

export type WidgetTypeDef = {
  id:        string
  label:     string
  category:  WidgetCategory
  /** Lucide icon name. The type picker shows this rather than a miniature —
   *  twenty-odd previews at tile size compete with each other and none reads. */
  icon:      string
  /** How the preview renderer draws it, for the live preview. */
  shape:     WidgetShape
  /** One line of guidance, shown beside the live preview. */
  bestFor:   string
  /** WIDGET_DEFS id in App.tsx, or null when the DS has not specified it yet. */
  catalogId: string | null
  /** Can a person create one of these in the Widget Builder from a dataset? */
  authorable: boolean
}

export const WIDGET_CATALOG: WidgetTypeDef[] = [
  // ── Statistical ───────────────────────────────────────────────────────────
  { id: "kpi",             label: "KPI",             icon: "Hash", category: "statistical",  shape: "kpi",       catalogId: "kpi",             authorable: true,  bestFor: "At-a-glance status and headline numbers." },
  { id: "stat-row",        label: "Stat Row",        icon: "Rows3", category: "statistical",  shape: "stat-row",  catalogId: "status-warning",  authorable: true,  bestFor: "Three related counters side by side." },
  { id: "gauge",           label: "Gauge",           icon: "Gauge", category: "statistical",  shape: "gauge",     catalogId: "charts",          authorable: true,  bestFor: "Monitoring against a target in real time." },
  { id: "line",            label: "Line Chart",      icon: "TrendingUp", category: "statistical",  shape: "line",      catalogId: "charts",          authorable: true,  bestFor: "Spotting trends and momentum over time." },
  { id: "bar",             label: "Bar Chart",       icon: "BarChart3", category: "statistical",  shape: "bars",      catalogId: "charts",          authorable: true,  bestFor: "Comparing groups or stages." },
  { id: "donut",           label: "Donut",           icon: "PieChart", category: "statistical",  shape: "donut",     catalogId: "charts",          authorable: true,  bestFor: "Showing composition at a glance." },
  { id: "funnel",          label: "Funnel",          icon: "Filter", category: "statistical",  shape: "funnel",    catalogId: "charts",          authorable: true,  bestFor: "Drop-off between ordered stages." },
  { id: "heatmap",         label: "Heat Map",        icon: "Grid3X3", category: "statistical",  shape: "heatmap",   catalogId: "charts",          authorable: true,  bestFor: "Finding hotspots across two dimensions." },
  { id: "correlation",     label: "Correlation",     icon: "Crosshair", category: "statistical",  shape: "scatter",   catalogId: "charts",          authorable: true,  bestFor: "Relationships and outliers, one dot per record." },
  { id: "map",             label: "Map",             icon: "Map", category: "statistical",  shape: "map",       catalogId: "charts",          authorable: true,  bestFor: "Comparing performance across regions." },
  { id: "pie",             label: "Pie",             icon: "ChartPie",     category: "statistical",  shape: "pie",       catalogId: "charts",          authorable: true,  bestFor: "Composition when every slice is named." },
  { id: "area",            label: "Area",            icon: "AreaChart",    category: "statistical",  shape: "line",      catalogId: "charts",          authorable: true,  bestFor: "A trend where the volume underneath matters." },
  { id: "stacked-bar",     label: "Stacked Bar",     icon: "BarChartBig",  category: "statistical",  shape: "bars",      catalogId: "charts",          authorable: true,  bestFor: "Totals and their make-up in one bar." },
  { id: "sparkline",       label: "Sparkline",       icon: "Activity",     category: "statistical",  shape: "line",      catalogId: "charts",          authorable: true,  bestFor: "A trend small enough to sit beside a number." },
  { id: "ai-summary",      label: "AI Summary",      icon: "Sparkles", category: "statistical",  shape: "notes",     catalogId: null,              authorable: true,  bestFor: "A written read of the data, not the data itself." },
  // The other AI surface, and the pair is the point: one INTERPRETS (a
  // written read), the other PROPOSES (the single action to take next). The
  // recommendation already has a promoted DS component —
  // NextBestActionCard in ui/ — and this type renders that same component
  // with `unstyled`, because a widget slot supplies its own surface. It is a
  // candidate because the WIDGET as a placement is not specified yet; the
  // card below an Entity Header is.
  { id: "next-best-action", label: "Next Best Action", icon: "Sparkle", category: "statistical",  shape: "notes",     catalogId: null,              authorable: true,  bestFor: "The one action the engine recommends next." },

  // ── Data display ──────────────────────────────────────────────────────────
  { id: "table",           label: "Table",           icon: "Table2", category: "data-display", shape: "table",     catalogId: "table",           authorable: true,  bestFor: "Detailed row-by-row review." },
  { id: "list",            label: "List",            icon: "List", category: "data-display", shape: "tasks",     catalogId: null,              authorable: true,  bestFor: "Scannable items with one status each." },
  { id: "profile-card",    label: "Profile Card",    icon: "IdCard", category: "data-display", shape: "roster",    catalogId: null,              authorable: true,  bestFor: "Key fields of one entity record." },
  // How a record hangs off other records — employer, account owner, deal
  // participant, the agent that handles it. NOT the List type: List is
  // items with a STATUS each, and a relationship is not a status. Named
  // from the UCP, where the profile has carried this since 2026-09 with no
  // type in this list to file it under.
  { id: "connections",     label: "Connections",     icon: "Share2", category: "data-display", shape: "roster",    catalogId: null,              authorable: true,  bestFor: "How this record relates to others." },
  { id: "carousel",        label: "Carousel",        icon: "GalleryHorizontal", category: "data-display", shape: "carousel",  catalogId: null,              authorable: true,  bestFor: "A few rich items, browsed sideways." },
  { id: "board",           label: "Board",           icon: "Kanban", category: "data-display", shape: "status",    catalogId: null,              authorable: true,  bestFor: "Counts grouped by lifecycle state." },
  { id: "feed",            label: "Feed",            icon: "Rss", category: "data-display", shape: "feed",      catalogId: "activity",        authorable: true,  bestFor: "What happened, newest first." },
  { id: "alerts",          label: "Alerts",          icon: "Bell", category: "data-display", shape: "alerts",    catalogId: null,              authorable: true,  bestFor: "Open problems ranked by severity." },

  // ── Consumption ───────────────────────────────────────────────────────────
  { id: "cost-kpi",        label: "Cost KPI",        icon: "DollarSign", category: "consumption",  shape: "cost-kpi",  catalogId: null,              authorable: true,  bestFor: "One spend figure with its unit." },
  { id: "usage-heatmap",   label: "Usage Heatmap",   icon: "CalendarRange", category: "consumption",  shape: "heatmap",   catalogId: null,              authorable: true,  bestFor: "When consumption peaks across a period." },
  { id: "spend-breakdown", label: "Spend Breakdown", icon: "ChartPie", category: "consumption",  shape: "donut",     catalogId: null,              authorable: true,  bestFor: "Where the budget actually goes." },
  { id: "composite-stat",  label: "Composite Stat",  icon: "Sigma", category: "consumption",  shape: "stat-row",  catalogId: null,              authorable: true,  bestFor: "Credits, tokens and cost in one row." },

  // ── System — catalogued, never offered in the builder ─────────────────────
  { id: "timeline",        label: "Timeline",           icon: "GitCommitHorizontal", category: "system", shape: "timeline", catalogId: "timeline",        authorable: false, bestFor: "Colour-coded activity categories in a strip." },
  { id: "notes",           label: "Notes",              icon: "StickyNote", category: "system", shape: "notes",    catalogId: "notes",           authorable: false, bestFor: "Free text someone on the team wrote." },
  { id: "folder-nav",      label: "Folder Navigation",  icon: "FolderTree", category: "system", shape: "tree",     catalogId: "folder-nav",      authorable: false, bestFor: "Drilling into a hierarchy of documents." },
  { id: "act-now-summary", label: "Act Now Summary",    icon: "Zap", category: "system", shape: "act-now",  catalogId: "act-now-summary", authorable: false, bestFor: "How many things are waiting on you, and which is worst." },
  { id: "my-work",         label: "My Work",            icon: "ListChecks", category: "system", shape: "tasks",    catalogId: "my-work",         authorable: false, bestFor: "The current user's own assigned items." },
  { id: "my-team",         label: "My Team",            icon: "Users", category: "system", shape: "roster",   catalogId: "my-team",         authorable: false, bestFor: "Who is on the team and their status." },
  { id: "workflows",       label: "Workflows",          icon: "Workflow", category: "system", shape: "flow",     catalogId: "workflows",       authorable: false, bestFor: "Automated processes and where each one is." },
  { id: "pending-outputs", label: "Pending Outputs",    icon: "Inbox", category: "system", shape: "queue",    catalogId: "pending-outputs", authorable: false, bestFor: "Agent results queued for review." },
  { id: "agent-catalog",   label: "Agent Catalog",      icon: "Bot", category: "system", shape: "agents",   catalogId: "agent-catalog",   authorable: false, bestFor: "Available agents and what each one does." },
]

/** The types the Widget Builder offers. System widgets are excluded by
 *  definition — you cannot point one at a dataset. */
export const AUTHORABLE_WIDGETS = WIDGET_CATALOG.filter(w => w.authorable)

/** Grouped for the builder's type picker, in the order the categories are
 *  declared, skipping "system" and any category with nothing in it. */
export const AUTHORABLE_BY_CATEGORY = WIDGET_CATEGORIES
  .filter(c => c.id !== "system")
  .map(c => ({ ...c, types: AUTHORABLE_WIDGETS.filter(w => w.category === c.id) }))
  .filter(g => g.types.length > 0)

/** Types that exist in a prototype but have no DS spec yet — the queue
 *  Michael writes specs from. Surfaced on the DS Health page. */
export const WIDGET_CANDIDATES = WIDGET_CATALOG.filter(w => w.catalogId === null)

export const widgetType = (id: string) => WIDGET_CATALOG.find(w => w.id === id)

// ── The library's display vocabulary ────────────────────────────────────────
//
// The Widget Library and the Marketplace filter by a coarser set of ten names
// than the builder's twenty-six types — "Chart" covers every chart, and a
// catalog you browse does not want twelve chart filters. That coarseness is a
// real product decision, so it stays.
//
// What was NOT a decision is that both screens declared the ten names locally,
// as their own union, with no way back to a catalog id. Two screens, two copies,
// and neither could render the real widget because it had nothing to look up.
// They live here now, and each one names the type it stands for.

export const LIBRARY_SKELETONS = [
  "KPI", "Chart", "Feed", "Gauge", "Donut", "Board", "Funnel", "Stat Row", "Alerts", "Cost KPI",
  // The library's "Next Best Action" was filed as a KPI, so its card drew a
  // headline number for something that is a sentence and two actions. It has
  // its own type now, and the type renders the real DS card.
  "Next Best Action",
] as const

export type LibrarySkeleton = (typeof LIBRARY_SKELETONS)[number]

/** Which catalog type a library skeleton stands for. "Chart" resolves to the
 *  line chart — the one the DS's own Charts widget draws. */
const SKELETON_TYPE: Record<LibrarySkeleton, string> = {
  "KPI":      "kpi",
  "Chart":    "line",
  "Feed":     "feed",
  "Gauge":    "gauge",
  "Donut":    "donut",
  "Board":    "board",
  "Funnel":   "funnel",
  "Stat Row": "stat-row",
  "Alerts":   "alerts",
  "Cost KPI": "cost-kpi",
  "Next Best Action": "next-best-action",
}

export const typeIdForSkeleton = (s: LibrarySkeleton): string => SKELETON_TYPE[s]

/** The same, for a label that may not be a library skeleton at all — a widget
 *  saved from the builder carries its type's own name ("Bar Chart"), which the
 *  ten-name library vocabulary does not have to contain. */
export const typeIdForLabel = (s: string | null | undefined): string | null =>
  s && s in SKELETON_TYPE ? SKELETON_TYPE[s as LibrarySkeleton] : null
