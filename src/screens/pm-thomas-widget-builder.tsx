import { useEffect, useRef, useState } from "react"
import * as LucideIcons from "lucide-react"
import { saveWidget, takeAnnouncement, savedMessage, type SavedWidget } from "@/lib/widget-drafts"
import { useToast } from "@/components/ui/toast"
import { ScreenLayout } from "@/components/layouts/screen-layout"
import { Header } from "@/components/ui/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CardContainer } from "@/components/ui/card-container"
import { WidgetFather } from "@/components/ui/widget-father"
import { SwitchTab } from "@/components/ui/switch-tab"
import { StepperNavFooter } from "@/components/ui/stepper-nav-footer"
import { WidgetPreview } from "@/components/experimental/widget-preview"
import { AUTHORABLE_WIDGETS, AUTHORABLE_BY_CATEGORY, type WidgetCategory } from "@/lib/widget-catalog"
import { Tag } from "@/components/ui/tag"
import { Chip } from "@/components/ui/chip"
import { HighlightIcon } from "@/components/ui/highlight-icon"
import { Checkbox } from "@/components/ui/checkbox"
import { Select } from "@/components/ui/select"
import { Menu, MenuItem, MenuDivider } from "@/components/ui/menu-item"
import { anchorFromEvent, useDropdownPosition, type DropdownAnchor } from "@/lib/dropdown-anchor"
import { EmptyState } from "@/components/ui/empty-state"
import { Tooltip } from "@/components/ui/tooltip"
import { ModalDialog } from "@/components/ui/modal-dialog"
import type { SidebarItem } from "@/components/ui/sidebar"
import { OptionCard } from "@/components/experimental/widget-screen-parts"

// ── Types ─────────────────────────────────────────────────────────────────────

type OpType  = "aggregate" | "record_set"
type TabId   = "data" | "configure"

// ── Data ─────────────────────────────────────────────────────────────────────

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "home",          label: "Home",          icon: "Home" },
  { id: "dashboards",    label: "My Dashboards", icon: "LayoutDashboard" },
  { id: "widget-library",label: "Widget Library",icon: "Library" },
  { id: "marketplace",   label: "Marketplace",   icon: "Store" },
]

/**
 * Thom's entities, from the two places he keeps them.
 *
 * His published prototype shows three Salesforce entities with column counts
 * and per-column definitions. His own screen in this repo
 * (pm-thomas-composable-dashboards.tsx) carries five more across Zendesk,
 * BambooHR and AIMS OS, with the integrations each one can also come from.
 * Both are his and neither is complete on its own, so both are here: the three
 * with column definitions are the ones the page features, and the rest live
 * behind Browse all entities.
 *
 * `featured` is what the page shows. Everything else is one click away rather
 * than absent — which is also what his "More entities available" note meant.
 */
const ENTITY_SOURCES = [
  { id: "contacts_salesforce",   label: "Contacts",      icon: "Users",         desc: "CRM contact profiles and relationship history",    integration: "Salesforce", also: ["HubSpot", "Pipedrive"], columns: 9, governed: true,  hasPII: true,  featured: true },
  { id: "accounts_salesforce",   label: "Accounts",      icon: "Building2",     desc: "Organization records, domains, and account data",  integration: "Salesforce", also: ["HubSpot"],              columns: 7, governed: true,  hasPII: false, featured: true },
  { id: "deals_salesforce",      label: "Deals",         icon: "TrendingUp",    desc: "Pipeline opportunities and deal stages",           integration: "Salesforce", also: ["HubSpot", "Close"],     columns: 7, governed: true,  hasPII: false, featured: true },
  { id: "tickets_zendesk",       label: "Tickets",       icon: "HelpCircle",    desc: "Customer support requests and resolution history", integration: "Zendesk",    also: ["Intercom"],             columns: 6, governed: true,  hasPII: false, featured: true },
  { id: "conversations_zendesk", label: "Conversations", icon: "MessageSquare", desc: "Chat and email threads with CSAT scores",          integration: "Zendesk",    also: [],                       columns: 6, governed: false, hasPII: true,  featured: false },
  { id: "employees_bamboohr",    label: "Employees",     icon: "UserCheck",     desc: "HR records, roles, and people data",               integration: "BambooHR",   also: ["Rippling", "Workday"],  columns: 6, governed: true,  hasPII: true,  featured: false },
  { id: "workflows_aims",        label: "Workflows",     icon: "GitBranch",     desc: "Automated process definitions in AIMS OS",         integration: "AIMS OS",    also: [],                       columns: 6, governed: true,  hasPII: false, featured: false },
  { id: "ai_workers_aims",       label: "AI Workers",    icon: "Bot",           desc: "AI agent instances and performance metrics",       integration: "AIMS OS",    also: [],                       columns: 6, governed: true,  hasPII: false, featured: false },
]

const FEATURED_ENTITIES = ENTITY_SOURCES.filter(e => e.featured)

// Thom's seven datasets, name and description read straight off his library
// rather than written fresh — the same rule the entity columns follow.
//
// The `shape` is the part that matters: a dataset arrives already aggregated,
// and its shape says whether it is one number, a grouping, or raw rows — which
// is also why the dataset path never asks for a calculation. That question was
// answered when the dataset was built. It is also the only axis his library
// filters on, so it is the only rail the browser needs.
//
// Four are `featured`, matching the four his step shows before "Browse all".
const PRESET_DATASETS = [
  { id: "ds-contacts-by-tier",   name: "Contacts by Tier",     description: "Count of contacts grouped by tier (Gold, Silver, Bronze)",        shape: "Grouped",      integration: "Salesforce", featured: true },
  { id: "ds-deals-pipeline",     name: "Deals Pipeline",       description: "Sum of deal value grouped by stage",                              shape: "Grouped",      integration: "Salesforce", featured: true },
  { id: "ds-total-mrr",          name: "Total MRR",            description: "Sum of MRR across all active accounts",                           shape: "Single value", integration: "Salesforce", featured: true },
  { id: "ds-all-contacts",       name: "All Contacts",         description: "Full contact record set — name, email, city, tier",               shape: "Record set",   integration: "Salesforce", featured: true },
  { id: "ds-activities-week",    name: "Activities This Week", description: "Count of activities grouped by type for the current week",        shape: "Grouped",      integration: "Salesforce", featured: false },
  { id: "ds-deal-value-owner",   name: "Deal Value by Owner",  description: "Total deal value grouped by owner — shows each rep's pipeline",    shape: "Grouped",      integration: "Salesforce", featured: false },
  { id: "ds-new-accounts-30d",   name: "New Accounts (30d)",   description: "Count of accounts created in the last 30 days",                    shape: "Single value", integration: "Salesforce", featured: false },
]

const FEATURED_DATASETS = PRESET_DATASETS.filter(d => d.featured)

/** The shapes a dataset can have — the browser's only filter, same as Thom's. */
const DATASET_SHAPES: string[] = [...new Set(PRESET_DATASETS.map(d => d.shape))]

/** Every integration the entity list draws from, derived rather than typed out
 *  so adding an entity cannot leave the filter row behind. */
const INTEGRATIONS: string[] = [...new Set(ENTITY_SOURCES.map(s => s.integration))]

const FILTER_OPS = ["is", "is not", "contains", "is empty", "is not empty", "greater than", "less than"]

/**
 * A column is not just a name.
 *
 * The picker used to be a list of nine checkboxes reading "Name, Email, Phone,
 * City…" — enough to recognise a field you already knew and useless for one you
 * did not. `Tier` means nothing until something says it is Gold/Silver/Bronze,
 * and `state` and `State / Region` are the same field under two names, which is
 * the kind of thing that sends someone to ask an engineer.
 *
 * So every column carries four facts: the label a person reads, its `type`
 * (which is also what the type filter sorts on), a sentence saying what it
 * holds, and the `key` the data actually uses — the one you would search for.
 * Every label, type, sentence and key here is read off Thom's prototype rather
 * than written fresh — the copy is already validated, and two descriptions for
 * the same field is exactly the drift this table exists to prevent.
 */
type ColumnType = "Text" | "Number" | "Date"
type ColumnDef  = { label: string; type: ColumnType; desc: string; key: string }

const COLUMN_TYPES: ColumnType[] = ["Text", "Number", "Date"]

const SOURCE_COLUMN_DEFS: Record<string, ColumnDef[]> = {
  contacts_salesforce: [
    { label: "Name",           type: "Text",   desc: "Full name of the record",                        key: "name" },
    { label: "Email",          type: "Text",   desc: "Primary email address",                          key: "email" },
    { label: "Phone",          type: "Text",   desc: "Primary phone number",                           key: "phone" },
    { label: "City",           type: "Text",   desc: "City from the billing or main address",          key: "city" },
    { label: "State / Region", type: "Text",   desc: "State or region",                                key: "state" },
    { label: "Tier",           type: "Text",   desc: "Account or contact tier (Gold, Silver, Bronze)", key: "tier" },
    { label: "Score",          type: "Number", desc: "Lead or engagement score (0–100)",               key: "score" },
    { label: "Lead Source",    type: "Text",   desc: "Channel where the lead originated",              key: "lead_source" },
    { label: "Created At",     type: "Date",   desc: "Date and time the record was created",           key: "created_at" },
  ],
  accounts_salesforce: [
    { label: "Name",       type: "Text",   desc: "Full name of the record",                        key: "name" },
    { label: "Industry",   type: "Text",   desc: "Industry vertical of the account",               key: "industry" },
    { label: "Employees",  type: "Number", desc: "Headcount of the company",                       key: "employees" },
    { label: "MRR",        type: "Number", desc: "Monthly Recurring Revenue in USD",               key: "mrr" },
    { label: "Tier",       type: "Text",   desc: "Account or contact tier (Gold, Silver, Bronze)", key: "tier" },
    { label: "Owner",      type: "Text",   desc: "Team member responsible for this record",        key: "owner" },
    { label: "Created At", type: "Date",   desc: "Date and time the record was created",           key: "created_at" },
  ],
  deals_salesforce: [
    { label: "Name",       type: "Text",   desc: "Full name of the record",                 key: "name" },
    { label: "Stage",      type: "Text",   desc: "Current pipeline stage",                  key: "stage" },
    { label: "Amount",     type: "Number", desc: "Deal value in USD",                       key: "amount" },
    { label: "Close Date", type: "Date",   desc: "Expected or actual deal close date",      key: "close_date" },
    { label: "Owner",      type: "Text",   desc: "Team member responsible for this record", key: "owner" },
    { label: "Account",    type: "Text",   desc: "Reference to the associated account",     key: "account_id" },
    { label: "Created At", type: "Date",   desc: "Date and time the record was created",    key: "created_at" },
  ],
  // The five below are NOT from Thom — his prototype defines columns only for
  // the three Salesforce entities. They are written to the same rule (say what
  // the field holds, not what it is called) so the modal never dead-ends on an
  // entity with nothing to pick, and they are the first thing to replace when
  // his own definitions exist.
  tickets_zendesk: [
    { label: "Subject",    type: "Text",   desc: "What the ticket is about",                   key: "subject" },
    { label: "Status",     type: "Text",   desc: "Open, pending, solved or closed",            key: "status" },
    { label: "Priority",   type: "Text",   desc: "Urgency assigned to the ticket",             key: "priority" },
    { label: "Assignee",   type: "Text",   desc: "Agent currently responsible",                key: "assignee" },
    { label: "Requester",  type: "Text",   desc: "Person who opened the ticket",               key: "requester" },
    { label: "Created At", type: "Date",   desc: "Date and time the record was created",       key: "created_at" },
  ],
  conversations_zendesk: [
    { label: "Subject",    type: "Text",   desc: "Thread subject or first message",            key: "subject" },
    { label: "Channel",    type: "Text",   desc: "Chat, email or web form",                    key: "channel" },
    { label: "Agent",      type: "Text",   desc: "Agent who handled the thread",               key: "agent" },
    { label: "CSAT Score", type: "Number", desc: "Satisfaction rating given, 1 to 5",          key: "csat_score" },
    { label: "Messages",   type: "Number", desc: "How many messages the thread holds",         key: "message_count" },
    { label: "Created At", type: "Date",   desc: "Date and time the record was created",       key: "created_at" },
  ],
  employees_bamboohr: [
    { label: "Name",       type: "Text",   desc: "Full name of the record",                    key: "name" },
    { label: "Department", type: "Text",   desc: "Department the person belongs to",           key: "department" },
    { label: "Title",      type: "Text",   desc: "Job title as recorded in HR",                key: "title" },
    { label: "Manager",    type: "Text",   desc: "Who this person reports to",                 key: "manager" },
    { label: "Start Date", type: "Date",   desc: "First day of employment",                    key: "start_date" },
    { label: "Status",     type: "Text",   desc: "Active, on leave or departed",               key: "status" },
  ],
  workflows_aims: [
    { label: "Name",         type: "Text",   desc: "Full name of the record",                  key: "name" },
    { label: "Status",       type: "Text",   desc: "Running, paused or draft",                 key: "status" },
    { label: "Run Count",    type: "Number", desc: "Times the workflow has executed",          key: "run_count" },
    { label: "Success Rate", type: "Number", desc: "Share of runs that finished without error", key: "success_rate" },
    { label: "Last Run",     type: "Date",   desc: "When it last executed",                    key: "last_run" },
    { label: "Owner",        type: "Text",   desc: "Team member responsible for this record",  key: "owner" },
  ],
  ai_workers_aims: [
    { label: "Name",        type: "Text",   desc: "Full name of the record",                   key: "name" },
    { label: "Category",    type: "Text",   desc: "What kind of work the agent does",          key: "category" },
    { label: "Status",      type: "Text",   desc: "Running, idle, paused or error",            key: "status" },
    { label: "Tasks Today", type: "Number", desc: "Tasks completed since midnight",            key: "tasks_today" },
    { label: "Accuracy",    type: "Number", desc: "Share of outputs accepted without edits",   key: "accuracy" },
    { label: "Created At",  type: "Date",   desc: "Date and time the record was created",      key: "created_at" },
  ],
}

/**
 * What each dataset comes back with.
 *
 * A dataset arrives already aggregated, so its columns are the RESULT's
 * columns, not the source entity's: "Contacts by Tier" returns a tier and a
 * count, not the nine fields a contact has. Every one is read straight off the
 * dataset's own description in PRESET_DATASETS — that copy is Thom's and it is
 * already validated, so deriving from it is what keeps the two from drifting.
 *
 * This is also why the dataset path can be filtered at all: you filter the
 * result ("only Gold"), which is a different question from the one the dataset
 * already answered.
 */
const DATASET_COLUMN_DEFS: Record<string, ColumnDef[]> = {
  "ds-contacts-by-tier": [
    { label: "Tier",     type: "Text",   desc: "Gold, Silver or Bronze",                  key: "tier" },
    { label: "Contacts", type: "Number", desc: "How many contacts fall in that tier",     key: "contacts" },
  ],
  "ds-deals-pipeline": [
    { label: "Stage",      type: "Text",   desc: "The pipeline stage the deal sits in",   key: "stage" },
    { label: "Deal Value", type: "Number", desc: "Summed value of the deals in the stage", key: "deal_value" },
  ],
  "ds-total-mrr": [
    { label: "MRR", type: "Number", desc: "Monthly recurring revenue across active accounts", key: "mrr" },
  ],
  "ds-all-contacts": [
    { label: "Name",  type: "Text", desc: "Full name of the contact",              key: "name" },
    { label: "Email", type: "Text", desc: "Primary email address",                 key: "email" },
    { label: "City",  type: "Text", desc: "City from the billing or main address", key: "city" },
    { label: "Tier",  type: "Text", desc: "Gold, Silver or Bronze",                key: "tier" },
  ],
}

/** Every source that can be filtered, keyed the same way whichever kind it is. */
const ALL_COLUMN_DEFS: Record<string, ColumnDef[]> = { ...SOURCE_COLUMN_DEFS, ...DATASET_COLUMN_DEFS }

/** Labels only — what the filter pickers and the calc column list read. */
const SOURCE_COLUMNS: Record<string, string[]> = Object.fromEntries(
  Object.entries(ALL_COLUMN_DEFS).map(([id, cols]) => [id, cols.map(c => c.label)]),
)


const FRESHNESS_OPTIONS = [
  { value: "realtime", label: "Real-time" },
  { value: "15m",      label: "Every 15 minutes" },
  { value: "1h",       label: "Every hour" },
  { value: "24h",      label: "Every 24 hours" },
]

/**
 * The filter row an end user would get, and what each one narrows.
 *
 * Inert chips taught nothing: a preview whose controls do not respond is a
 * screenshot. Clicking one now selects it, names itself in the widget's own
 * subtitle, and re-runs the entry animation — so the preview visibly answers.
 * The numbers are fixtures and do not recompute; the tooltip says what the
 * filter WOULD narrow, which is the honest version of a live preview.
 */
const PREVIEW_FILTERS = [
  { label: "Last 30 days", hint: "Narrows to records created or updated in the last 30 days." },
  { label: "Status",       hint: "Splits the widget by each record's current status." },
  { label: "Team",         hint: "Narrows to the viewer's own team." },
]

const WIDGET_SIZES = [
  { id: "sm", label: "S" },
  { id: "md", label: "M" },
  { id: "lg", label: "L" },
]



// ── DS-GAP Components ─────────────────────────────────────────────────────────


// DS-GAP: StepLabel — numbered section heading for builder form steps. Closest DS component: none.
// A numbered step heading inside a stage. Deliberately NOT the SectionLabel the
// other screens define — theirs is an uppercase caption with no number. Renamed
// so the duplicate check stops pairing two unrelated components.
function StepLabel({ children }: { n?: number; children: React.ReactNode }) {
  // Caption S Bold from the DS type scale: 12px / 600 / uppercase with tracking.
  // The numbered blue circle went with the redesign — the Stepper above already
  // says which stage you are in, so numbering every section inside it was a
  // second counter competing with the first.
  return (
    <div style={{
      fontSize: 12, fontWeight: 600, textTransform: "uppercase" as const,
      letterSpacing: "0.06em", color: "var(--color-text-label)", marginBottom: 8,
    }}>
      {children}
    </div>
  )
}

// DS-GAP: EntitySourceCard — selectable source tile with integration tag + governance badge. Closest DS component: CardContainer.
function EntitySourceCard({ source, selected, onSelect }: { source: typeof ENTITY_SOURCES[0]; selected: boolean; onSelect: () => void }) {
  return (
    <div onClick={onSelect} style={{ cursor: "pointer" }}>
      <CardContainer selected={selected} size="sm" className="!p-0 h-full overflow-hidden">
        <div style={{ padding: 12, display: "flex", gap: 10 }}>
          {/* The entity's own icon, so the grid is scannable by shape before you
              read a word. Same slot the dataset cards use, so the two modes read
              as one family rather than two designs. */}
          <HighlightIcon iconName={source.icon} variant={selected ? "informative" : "neutral"} size="sm" />
          <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-title)" }}>{source.label}</span>
              <span style={{ fontSize: 11, color: "var(--color-text-subtitle)", whiteSpace: "nowrap" as const }}>
                · {(SOURCE_COLUMNS[source.id] ?? []).length} columns
              </span>
            </div>
            <p style={{ fontSize: 11, color: "var(--color-text-subtitle)", margin: 0, lineHeight: 1.4 }}>{source.desc}</p>
            {/* Neutral, all of them. These are attributes of the source, not
                states of it — colouring the integration blue and PII amber made
                a grid of eight cards read as a warning board. Governance still
                shows, it just stops shouting. */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" as const }}>
              <Tag variant="neutral" size="sm">{source.integration}</Tag>
              {!source.governed && <Tag variant="neutral" size="sm">Ungoverned</Tag>}
              {source.hasPII && <Tag variant="neutral" size="sm">PII</Tag>}
            </div>
          </div>
        </div>
      </CardContainer>
    </div>
  )
}

// DS-GAP: DatasetCard — selectable pre-built dataset tile with description + governance badge. Closest DS component: CardContainer.
function DatasetCard({ dataset, selected, onSelect }: { dataset: typeof PRESET_DATASETS[0]; selected: boolean; onSelect: () => void }) {
  return (
    <div onClick={onSelect} style={{ cursor: "pointer" }}>
      <CardContainer selected={selected} size="sm" className="!p-0 h-full overflow-hidden">
        {/* Deliberately the same skeleton as EntitySourceCard — icon, title,
            description, tags — so switching data source mode changes what you
            are choosing between, not how the choosing looks. A dataset is a
            saved query, so it gets one data glyph rather than a per-entity one. */}
        <div style={{ padding: 12, display: "flex", gap: 10 }}>
          <HighlightIcon iconName="Database" variant={selected ? "informative" : "neutral"} size="sm" />
          <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-title)" }}>{dataset.name}</span>
            <p style={{ fontSize: 11, color: "var(--color-text-subtitle)", margin: 0, lineHeight: 1.4 }}>{dataset.description}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" as const }}>
              {/* The shape leads: it is what decides which widget types can
                  draw this dataset, so it is the fact worth reading first. */}
              <Tag variant="neutral" size="sm">{dataset.shape}</Tag>
              <Tag variant="neutral" size="sm">{dataset.integration}</Tag>
            </div>
          </div>
        </div>
      </CardContainer>
    </div>
  )
}


/**
 * A searchable option picker: the DS Select as the trigger, the DS Menu as the
 * list, positioned with the repo's own dropdown-anchor helper.
 *
 * A base-ui Popover would also work here — the claim this docblock used to
 * make, that it was tried and failed, was wrong and is corrected 2026-09-10.
 * What genuinely fails is only `Popover.Trigger render={<Select/>}`: Select
 * renders a div with nowhere for the Trigger to attach. A wrapper div as the
 * anchor is fine.
 *
 * dropdown-anchor stays the choice here for a plainer reason — anchorFromEvent
 * + useDropdownPosition + a full-screen click-catcher is what Filters uses, and
 * this screen already needs the picker three times (filters, calculations,
 * group by). One mechanism, one helper.
 *
 * The screen needs this three times (filters, calculations, group by), which is
 * why it is one local helper rather than three inline copies.
 */
function OptionPicker({ options, value, placeholder, onChange, searchable = true }: {
  options: string[]
  value: string
  placeholder: string
  onChange: (col: string) => void
  /** A five-item function list does not need a search box; a column list does. */
  searchable?: boolean
}) {
  const [anchor, setAnchor] = useState<DropdownAnchor | null>(null)
  const [query, setQuery]   = useState("")
  const dropdown = useDropdownPosition(anchor)
  const shown = options.filter(c => c.toLowerCase().includes(query.trim().toLowerCase()))
  const close = () => { setAnchor(null); setQuery("") }

  return (
    <>
      <div onClickCapture={(e: React.MouseEvent) => setAnchor(a => a ? null : anchorFromEvent(e))}>
        <Select value={value || undefined} placeholder={placeholder} size="sm" open={!!anchor} />
      </div>

      {anchor && (
        <>
          <div className="fixed inset-0" style={{ zIndex: 10000 }} onClick={close} />
          <div ref={dropdown.ref} style={{ position: "fixed", zIndex: 10001, ...dropdown.style }}>
            <Menu className="w-auto min-w-[220px]">
              {searchable && (
                <>
                  <div style={{ padding: 6 }}>
                    <Input
                      size="sm"
                      autoFocus
                      placeholder="Search columns…"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                    />
                  </div>
                  <MenuDivider />
                </>
              )}
              {shown.length === 0 ? (
                <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--color-text-subtitle)" }}>
                  No column matches “{query}”.
                </div>
              ) : shown.map(c => (
                <MenuItem
                  key={c}
                  label={c}
                  state={c === value ? "focus" : "default"}
                  trailingElement={c === value ? <LucideIcons.Check size={13} style={{ flexShrink: 0, color: "var(--primary)" }} /> : undefined}
                  onClick={() => { onChange(c); close() }}
                />
              ))}
            </Menu>
          </div>
        </>
      )}
    </>
  )
}

// DS-GAP: TypeTile — widget type selector tile with icon and label. Closest DS component: CardContainer.
function TypeTile({ type, selected, onSelect }: { type: typeof AUTHORABLE_WIDGETS[0]; selected: boolean; onSelect: () => void }) {
  return (
    <div onClick={onSelect} style={{ cursor: "pointer" }}>
      <CardContainer selected={selected} size="sm" className="!p-0 h-full overflow-hidden">
        <div style={{ padding: "12px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          {/* An icon, not a miniature. Twenty-two 54px previews side by side
              compete with each other and none of them reads — the grid became
              noise. The icon names the type; the live preview on the right
              shows the actual widget, which is where seeing it matters. */}
          <HighlightIcon
            iconName={type.icon}
            variant={selected ? "informative" : "neutral"}
            size="md"
          />
          <span style={{
            fontSize: 12, fontWeight: 500, textAlign: "center" as const, lineHeight: 1.3,
            color: "var(--color-text-title)",
          }}>{type.label}</span>
        </div>
      </CardContainer>
    </div>
  )
}

// DS-GAP: SkeletonShape — CSS-only skeleton preview shape keyed by widget type. Closest DS component: none.
// DS-GAP: WidgetPreviewPanel — sticky live preview panel with size switcher and widget info. Closest DS component: CardContainer.
function WidgetPreviewPanel({ typeId, name, sourceId, freshness, interactiveFilters, previewSize, setPreviewSize, saveHint }: {
  typeId: string | null; name: string; sourceId: string | null; freshness: string
  interactiveFilters: boolean; previewSize: string; setPreviewSize: (s: string) => void; saveHint: string
}) {
  // The applied preview filter lives here, not in the builder: it is a property
  // of looking at the widget, not of the widget being built. Nothing it does
  // reaches what gets saved.
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const entitySrc  = ENTITY_SOURCES.find(s => s.id === sourceId)
  const datasetSrc = PRESET_DATASETS.find(d => d.id === sourceId)
  const srcLabel   = entitySrc?.label ?? datasetSrc?.name ?? null
  const typeInfo   = AUTHORABLE_WIDGETS.find(t => t.id === typeId)
  // Every size is a real number, including L. Transitioning to `undefined`
  // does not animate — the card used to snap from 420 to full width and only
  // the way back was smooth.
  const maxW = previewSize === "sm" ? 240 : previewSize === "md" ? 420 : 640
  const freshnessLabel = freshness === "realtime" ? "Live" : freshness === "15m" ? "15m" : freshness === "1h" ? "1h" : "24h"

  // "KPI · Deals · HubSpot" — what this widget is, reading left to right.
  const lineage = [typeInfo?.label, srcLabel, entitySrc?.integration, activeFilter]
    .filter(Boolean).join(" · ")

  // The body only. WidgetFather draws every piece of chrome around it.
  // WidgetPreview owns the resolution chain — the same one the Widget Library,
  // the Marketplace and the Universal Profile now call, so a Donut is the same
  // Donut in all four.
  // The `key` is what makes this animate: React remounts on a type change, so
  // the entry animation runs again instead of only on first paint. The class is
  // the DS's own ds-enter-widget (index.css) — the tw-animate-css utilities
  // this used to carry are a Tailwind v4 feature and this repo is v3, so they
  // compiled to nothing and the widget had been appearing instantly all along.
  const body = !typeInfo
    ? <EmptyState compact icon={LucideIcons.Shapes} title="Nothing to preview yet" description={saveHint} />
    : (
      <div key={`${typeInfo.id}:${activeFilter ?? ""}`} className="ds-enter-widget">
        <WidgetPreview typeId={typeInfo.id} filter={activeFilter} />
      </div>
    )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* The two columns start with a section heading each, so they have to be
          the same heading and start on the same line. This one was its own
          11px/700 span centred against a 32px switcher, which put it 14px below
          "DATA SOURCE" and in a different type. StepLabel plus a top-aligned
          row fixes both: same words, same line, same style. */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <StepLabel>Live preview</StepLabel>
        {/* A segmented switcher, drawn by hand: three buttons in a bordered
            box, one painted with --primary. That is SwitchTab, which the
            screen already imports for its own stages. */}
        <SwitchTab
          items={WIDGET_SIZES}
          value={previewSize}
          onChange={setPreviewSize}
          size="s"
          aria-label="Preview size"
        />
      </div>

      {/* The preview IS a widget, not a card imitating one.
       *
       *  It used to hand-roll its own header: a bare <input> for the title, its
       *  own border, its own tag row. That got the typography wrong, had no
       *  refresh or overflow control, and drifted from WidgetFather every time
       *  either side changed. This is a create flow for widgets — what you are
       *  looking at should be built the same way the thing you are about to save
       *  will be. CardContainer + WidgetFather noCard is the same composition the
       *  DS catalog and the Live Canvas both use.
       *
       *  The name is no longer editable here; it is the "Widget name" field in
       *  Configure, which is one place instead of two. */}
      {/* 280ms on the same expo-out curve the DS modal uses, so a size change
          eases rather than snaps. */}
      <div style={{ maxWidth: maxW, transition: "max-width 280ms cubic-bezier(0.16, 1, 0.3, 1)" }}>
        <CardContainer size="lg" className="flex flex-col">
          <WidgetFather
            noCard
            fillWidth
            title={name || "Untitled widget"}
            description={lineage || undefined}
            showRefresh
            showMenu
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* The filter row an end user would get. Only when "Let end users
                  filter this widget" is on — the checkbox and this row are the
                  same decision, and showing the consequence beside the control is
                  what a live preview is for. Inert here on purpose. */}
              {interactiveFilters && typeInfo && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                  {PREVIEW_FILTERS.map(f => (
                    <Tooltip key={f.label} content={f.hint} side="cursor">
                      <Chip
                        size="s"
                        variant={activeFilter === f.label ? "primary" : "secondary"}
                        onClick={() => setActiveFilter(activeFilter === f.label ? null : f.label)}
                      >
                        {f.label}
                      </Chip>
                    </Tooltip>
                  ))}
                </div>
              )}
              {body}
            </div>
          </WidgetFather>
        </CardContainer>
      </div>

      {/* Configuration facts about the widget, not chrome it will render.
       *  They sit outside the card because WidgetFather has no slot for them and
       *  inventing one would put a tag in the header that the real widget will
       *  never show. */}
      {typeInfo && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" as const }}>
          <Tag variant={freshness === "realtime" ? "success" : "informative"} size="sm">{freshnessLabel}</Tag>
          {entitySrc && !entitySrc.governed && <Tag variant="alert" size="sm">Ungoverned</Tag>}
          {srcLabel && <Tag variant="neutral" size="sm">{srcLabel}</Tag>}
        </div>
      )}

      {typeInfo && (
        <div style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--field-border)" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-title)", marginBottom: 4 }}>Best for</div>
          <p style={{ fontSize: 12, color: "var(--color-text-subtitle)", margin: 0 }}>{typeInfo.bestFor}</p>
        </div>
      )}
      {typeId && saveHint && <p style={{ fontSize: 11, color: "var(--color-text-subtitle)", textAlign: "center" as const, margin: 0 }}>{saveHint}</p>}
    </div>
  )
}


// ── Screen ────────────────────────────────────────────────────────────────────

export default function PMThomasWidgetBuilderScreen() {
  // Wizard tabs
  const [tab, setTab]         = useState<TabId>("data")

  // Data tab state
  const [sourceId, setSourceId]         = useState<string | null>(null)
  const [opType, setOpType]             = useState<OpType | null>(null)
  const [recordColumns, setRecordColumns] = useState<string[]>([])
  // Thom's prototype builds a query, not a single metric: several calculations,
  // several groupers, several filters. The old single calcFn/calcColumn pair
  // could express exactly one aggregate with no grouping.
  const [groupers, setGroupers]     = useState<{ id: string; column: string }[]>([])
  const [dataFilters, setDataFilters] = useState<{ id: string; column: string; op: string; value: string }[]>([])
  const [srcFilter, setSrcFilter]   = useState("all")

  // Configure tab state
  const [typeId, setTypeId]             = useState<string | null>(null)
  const [name, setName]                 = useState("")
  const [subtitle, setSubtitle]         = useState("")
  const [freshness, setFreshness]       = useState("15m")
  const [interactiveFilters, setInteractiveFilters] = useState(true)

  // Appearance tab state

  // UI state
  const [dataMode, setDataMode]         = useState<"entity" | "dataset">("entity")
  const [previewSize, setPreviewSize]   = useState("lg")
  const [showLeave, setShowLeave]       = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  /** The name it was saved under — holds the success view open, and survives
   *  the reset that "Create new widget" runs, which clears `name`. */
  const [savedName, setSavedName] = useState<string | null>(null)
  const [savedAsDraft, setSavedAsDraft] = useState(false)
  /** Bumped by every reset; the scroll-to-top effect keys off it. */
  const [resetCount, setResetCount] = useState(0)
  const [typeCat, setTypeCat] = useState<WidgetCategory | "all">("all")
  // The columns modal edits a DRAFT, so Cancel means cancel. Committing on each
  // checkbox would leave a half-made selection behind when someone backs out.
  const [showColumns, setShowColumns] = useState(false)
  const [colDraft, setColDraft]       = useState<string[]>([])
  const [colQuery, setColQuery]       = useState("")
  const [colType, setColType]         = useState<ColumnType | "All">("All")
  const [showEntities, setShowEntities] = useState(false)
  const [entQuery, setEntQuery]         = useState("")
  const [showDatasets, setShowDatasets] = useState(false)
  const [dsQuery, setDsQuery]           = useState("")
  const [shapeFilter, setShapeFilter]   = useState("all")

  // Search matches the label, the description AND the key — the key is there
  // because someone who knows the data will type `lead_source`, not "Channel
  // where the lead originated".
  const visibleEntities = ENTITY_SOURCES.filter(e => {
    if (srcFilter !== "all" && e.integration !== srcFilter) return false
    const q = entQuery.trim().toLowerCase()
    return !q || e.label.toLowerCase().includes(q) || e.desc.toLowerCase().includes(q)
  })

  const visibleDatasets = PRESET_DATASETS.filter(d => {
    if (shapeFilter !== "all" && d.shape !== shapeFilter) return false
    const q = dsQuery.trim().toLowerCase()
    return !q || d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q)
  })

  /** How many datasets each rail entry would show — the count sits on the row. */
  const shapeCounts: Record<string, number> = {
    all: PRESET_DATASETS.length,
    ...Object.fromEntries(DATASET_SHAPES.map(sh => [sh, PRESET_DATASETS.filter(d => d.shape === sh).length])),
  }

  const visibleColumns = (SOURCE_COLUMN_DEFS[sourceId ?? ""] ?? []).filter(c => {
    if (colType !== "All" && c.type !== colType) return false
    const q = colQuery.trim().toLowerCase()
    return !q || c.label.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q) || c.key.includes(q)
  })

  // ── Derived ──

  // Count needs no column; every other function does. That is why the check is
  // per-row rather than "has a column".
  // Count needs no column; every other function does. Compared against the same
  // constant the picker offers, so the two cannot drift out of case again.
  // Summarize no longer asks WHICH calculation — it counts. Count is the one
  // aggregation that needs no column, so the step is complete the moment an
  // entity is chosen, and Group by is what shapes the result from there.
  const dataComplete = dataMode === "dataset"
    ? !!sourceId
    : !!sourceId && !!opType && (opType === "aggregate" ? true : recordColumns.length > 0)
  // The name is required (Michael, 2026-09-09 — it was optional until then).
  // This file used to argue the opposite: the widget IS its data and its type,
  // and the preview happily says "Untitled widget". That holds right up to the
  // moment it is saved, and then it does not — the catalog is a shared list
  // other people search, and "Untitled widget" is unfindable in it. Optional
  // was the right call for the preview and the wrong one for the catalog.
  const namedOk        = !!name.trim()
  const widgetComplete = dataComplete && !!typeId && namedOk
  /**
   * A named widget can always be saved; an unfinished one goes in as a DRAFT
   * (Michael, 2026-09-09).
   *
   * Save used to sit grey until everything was answered, which quietly said
   * "finish this in one sitting or lose it" — and the way people actually
   * answer that is by leaving the tab open for a week. The catalog is where
   * work in progress belongs too, so the only thing Save still insists on is a
   * name: a draft nobody can find again is not saved, it is lost politely.
   */
  const canSave      = namedOk
  const savesAsDraft = namedOk && !widgetComplete
  const hasUnsaved   = !!(sourceId || typeId || name.trim() || subtitle.trim())

  /** The one thing still missing, phrased to drop into a sentence. */
  const missingPiece = !sourceId
    ? (dataMode === "dataset" ? "a dataset" : "an entity")
    : !dataComplete
    ? "the rest of its data setup"
    : !typeId
    ? "a widget type"
    : ""

  // ── Wizard stages ─────────────────────────────────────────────────────────
  // These were a hand-rolled tab strip: numbered dots, a check when complete,
  // disabled until the previous stage was done. Tabs are non-linear by
  // definition — the moment one can be locked behind another it is a stage, and
  // stages are what Stepper is for. Its StepState covers every case the local
  // version drew by hand.
  const STEP_ORDER: TabId[] = ["data", "configure"]
  // A button that says "Save to catalog" and produces a draft is lying about
  // its own outcome, so the label follows the state.
  const saveLabel = savesAsDraft ? "Save as draft" : "Save to catalog"
  const NEXT_LABEL: Record<TabId, string> = {
    data:      "Continue to Configure",
    configure: saveLabel,
  }

  // The footer's shape follows the stage: Cancel on the first, Back after that,
  // and the primary button becomes Save on the last one.
  const isLast     = tab === "configure"
  const stepIndex  = STEP_ORDER.indexOf(tab)
  const nextEnabled = tab === "data" ? dataComplete : canSave

  // Guidance, not a gate. It still names the first thing missing, because that
  // is what someone reading it wants to know next — it just no longer explains
  // why a button is grey.
  const saveHint = !sourceId
    ? (dataMode === "dataset" ? "Choose a dataset on the Data tab to get started." : "Choose an entity source on the Data tab to get started.")
    : !dataComplete
    ? "Finish configuring your data source on the Data tab."
    : !typeId
    ? "Choose a widget type on the Configure tab."
    : !namedOk
    ? "Give the widget a name — it is how people will find it in the catalog."
    : ""

  // ── Handlers ──

  function selectSource(id: string) {
    if (id === sourceId) return
    setSourceId(id)
    setOpType(null); setGroupers([]); setDataFilters([])
    setRecordColumns([])
  }

  /**
   * Back to the top of whatever is scrolling.
   *
   * ScreenLayout owns the scroll container and does not hand it out, so this
   * walks up from the builder's own root to the first ancestor that actually
   * scrolls — the same search the browser does for scrollIntoView, and it
   * keeps the screen from having to know the layout's internals.
   *
   * Without it, starting a fresh widget leaves you wherever you were when you
   * saved — halfway down, looking at the widget-type grid. The form is reset
   * but the view is not, so nothing looks like it happened.
   */
  function scrollToTop() {
    // Ask; the effect below does it. See the comment there for why.
    setResetCount(c => c + 1)
  }

  /**
   * A finished widget saves straight through; an unfinished one asks first.
   *
   * The confirmation is not about risk — saving to the catalog is undoable, and
   * the Create pattern says an undoable save needs no dialog. It is about the
   * OUTCOME differing from the one the person expects: they set out to publish
   * a widget and what lands is a draft. That is worth a sentence and a way
   * back, which is what Keep editing is.
   */
  /**
   * Back to the top after a reset — as an effect, not from the click handler.
   *
   * resetAll empties most of the page, so anything scheduled inside the click
   * runs while the layout is still the old, tall one; the browser then clamps
   * the scroll to the new, much smaller maximum and the view settles a few
   * pixels short of the top with the stage switcher clipped. requestAnimation-
   * Frame was not late enough either. An effect keyed to the reset runs after
   * React has committed and the browser has laid the page out, which is the
   * first moment "top" means what it will still mean a frame later.
   *
   * ScreenLayout owns the scroll container and does not hand it out, so this
   * walks up from the builder's own root to the first ancestor whose overflow
   * says it scrolls — by STYLE, not by "is it taller than its box right now":
   * once the page is empty that test walks straight past the only scroller.
   */
  useEffect(() => {
    if (resetCount === 0) return
    let el: HTMLElement | null = rootRef.current
    while (el) {
      const oy = getComputedStyle(el).overflowY
      if (oy === "auto" || oy === "scroll") { el.scrollTop = 0; return }
      el = el.parentElement
    }
  }, [resetCount])

  function attemptSave() {
    if (savesAsDraft) { setShowSaveModal(true); return }
    commitSave(false)
  }

  function commitSave(asDraft: boolean) {
    setShowSaveModal(false)
    setSavedAsDraft(asDraft)
    setSavedName(name)
    // Hand it to the library. Without this the success view says "it is in the
    // catalog" and the catalog has never heard of it — the one seam in this
    // flow you could see from the outside.
    saveWidget({
      name: name.trim(),
      source: ENTITY_SOURCES.find(e => e.id === sourceId)?.label
           ?? PRESET_DATASETS.find(d => d.id === sourceId)?.name
           ?? "Not connected",
      skeleton: AUTHORABLE_WIDGETS.find(t => t.id === typeId)?.label ?? null,
      previewTypeId: typeId ?? undefined,
      status: asDraft ? "draft" : "published",
      missing: asDraft ? missingPiece : undefined,
    })
  }

  const toast = useToast()
  function announce(w: SavedWidget) {
    const m = savedMessage(w)
    toast.success(m.title, { description: m.description })
  }

  function resetAll() {
    setTab("data"); setDataMode("entity"); setSourceId(null); setOpType(null); setRecordColumns([]); setGroupers([]); setDataFilters([]); setSrcFilter("all")
    setTypeId(null); setName(""); setSubtitle(""); setFreshness("15m"); setInteractiveFilters(true)
    scrollToTop()
  }



  return (
    <ScreenLayout
      workspaceName="Acme Corp"
      userName="Thomas G."
      userEmail="thomas.gonzalez@aimsos.ai"
      sidebarItems={SIDEBAR_ITEMS}
      activeSidebarId="widget-library"
      // This screen ends in a StepperNavFooter, not a floating Pagination.
      stickyFooter
      header={(isScrolled) => (
        <Header
          size={isScrolled ? "compress" : "size-l"}
          title="Widget Builder"
          description="Connect a data source, pick a chart type, and preview your widget live."
          primaryAction={{
            // saveLabel, not a fixed string: this button and the footer's are
            // the same action, and for a while they disagreed out loud — the
            // footer said "Save as draft" while this one still said "Save to
            // catalog" about the very same click.
            label: saveLabel,
            icon: LucideIcons.Check,
            disabled: !canSave,
            onClick: attemptSave,
          }}
        />
      )}
    >
      {/* ── Builder ── */}
      <div ref={rootRef} style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 160px)" }}>
          {/* Two stages read as a wizard when the top carries a Stepper AND
              the bottom carries StepperNavFooter — two progress bars for one
              two-step flow. The footer is the one that moves you forward, so
              the top is navigation: a SwitchTab.

              A SwitchTab has no locked state, and that is the trade: you can
              look at Configure before the data is finished. Nothing can be
              saved early — the footer's Next and Save are still gated on
              dataComplete and canSave — so the cost is a peek, and the gain is
              that the two halves stop competing. */}
          <SwitchTab
            items={[
              { id: "data",      label: "Data"      },
              { id: "configure", label: "Configure" },
            ]}
            value={tab}
            onChange={id => setTab(id as TabId)}
            size="s"
            aria-label="Builder stage"
            className="mb-5 self-start"
          />

          {/* The preview is the point of this screen, so it sits beside the
              form rather than under it. The split fires at 1100 — an arbitrary
              value on purpose: the repo's breakpoint table comes straight from
              Figma (600 · 1280 · 1440 · 1920) and has no rung between 600 and
              1280, so at md the preview dropped below the fold on any laptop
              narrower than 1280, which is most of them. */}
          <div className="flex flex-col min-[1100px]:flex-row gap-[24px] items-stretch min-[1100px]:items-start">
          {/* Left: build panel */}
          <div className="flex-1 min-w-0 flex flex-col gap-[20px]">
            {/* ── Tab 1: Data ── */}
            {tab === "data" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Each section appears once the one above it is answered. The
                    prototype reveals them progressively; the old version showed
                    every section at once, which is why step 1 read as a wall. */}
                <div>
                  <StepLabel n={1}>Data source</StepLabel>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 }}>
                    <OptionCard
                      icon="Database" title="Existing dataset"
                      description="Use a pre-built query as your starting point."
                      selected={dataMode === "dataset"}
                      onSelect={() => { setDataMode("dataset"); setSourceId(null); setOpType(null); setGroupers([]); setDataFilters([]); setRecordColumns([]) }}
                    />
                    <OptionCard
                      icon="Boxes" title="Entity"
                      description="Start from a raw entity and configure it from scratch."
                      selected={dataMode === "entity"}
                      onSelect={() => { setDataMode("entity"); setSourceId(null); setOpType(null); setGroupers([]); setDataFilters([]); setRecordColumns([]) }}
                    />
                  </div>
                </div>

                {dataMode === "entity" && (
                  <div>
                    {/* The catalogue opens from the section heading, not from
                        under the grid: it is an alternative to the four below,
                        so it belongs where you decide, before you have scanned
                        them — not after. */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <StepLabel>Choose entity</StepLabel>
                      <div style={{ marginTop: -8 }}>
                        <Button variant="tertiary" size="sm" onClick={() => { setEntQuery(""); setSrcFilter("all"); setShowEntities(true) }}>
                          <LucideIcons.LayoutGrid size={14} />
                          Browse all entities
                        </Button>
                      </div>
                    </div>
                    {/* The card's hover is a box-shadow, and a grid that clips
                        would cut it at the edges. Padding gives the glow room;
                        the negative margin keeps the cards on the same left
                        edge as everything else in the step. */}
                    <div style={{
                      display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10,
                      padding: 4, margin: -4,
                    }}>
                      {FEATURED_ENTITIES.map(src => (
                        <EntitySourceCard key={src.id} source={src} selected={sourceId === src.id} onSelect={() => selectSource(src.id)} />
                      ))}
                    </div>
                    <p style={{ fontSize: 11, color: "var(--color-text-subtitle)", margin: "12px 0 0" }}>
                      More entities available — install a model from the Models page to unlock them.
                    </p>
                  </div>
                )}

                {/* The same shape as Choose entity above, deliberately: a
                    heading with the catalogue CTA aligned to its right, four
                    featured cards, and a line saying what is not shown. The two
                    data sources are the same kind of decision, so switching
                    between them should change what you are choosing, never how
                    the choosing is laid out. */}
                {dataMode === "dataset" && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <StepLabel>Choose dataset</StepLabel>
                      <div style={{ marginTop: -8 }}>
                        <Button variant="tertiary" size="sm" onClick={() => { setDsQuery(""); setShapeFilter("all"); setShowDatasets(true) }}>
                          <LucideIcons.LayoutGrid size={14} />
                          Browse all datasets
                        </Button>
                      </div>
                    </div>
                    {/* Padding for the card's hover glow, negative margin to
                        keep the left edge with everything else in the step. */}
                    <div style={{
                      display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10,
                      padding: 4, margin: -4,
                    }}>
                      {FEATURED_DATASETS.map(ds => (
                        <DatasetCard key={ds.id} dataset={ds} selected={sourceId === ds.id} onSelect={() => setSourceId(ds.id)} />
                      ))}
                    </div>
                    <p style={{ fontSize: 11, color: "var(--color-text-subtitle)", margin: "12px 0 0" }}>
                      Browse {PRESET_DATASETS.length - FEATURED_DATASETS.length} more datasets in the full library.
                    </p>
                  </div>
                )}

                {/* Both paths get this. A dataset arrives aggregated, which
                    answers "what is counted" — it does not answer "which of the
                    results do I want to see". Only the entity path had a filter
                    step, so a governed dataset was all-or-nothing. */}
                {sourceId && (
                  <div>
                    <StepLabel n={3}>Filters</StepLabel>
                    {dataFilters.length === 0 ? (
                      <EmptyState
                        compact icon={LucideIcons.Filter}
                        title="No filters"
                        description={`The widget will read every record in this ${dataMode === "dataset" ? "dataset" : "entity"}.`}
                        ctaLabel="Add filter"
                        onCta={() => setDataFilters([{ id: `f-${Date.now()}`, column: "", op: "is", value: "" }])}
                      />
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {dataFilters.map(f => (
                          <div key={f.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <OptionPicker
                                options={SOURCE_COLUMNS[sourceId] ?? []}
                                value={f.column}
                                placeholder="Column…"
                                onChange={col => setDataFilters(prev => prev.map(x => x.id === f.id ? { ...x, column: col } : x))}
                              />
                            </div>
                            <div style={{ width: 120, flexShrink: 0 }}>
                              <OptionPicker
                                options={FILTER_OPS}
                                value={f.op}
                                searchable={false}
                                placeholder="is…"
                                onChange={op => setDataFilters(prev => prev.map(x => x.id === f.id ? { ...x, op } : x))}
                              />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <Input size="sm" placeholder="Value" value={f.value} onChange={e => setDataFilters(prev => prev.map(x => x.id === f.id ? { ...x, value: e.target.value } : x))} />
                            </div>
                            <Button variant="tertiary" size="sm" aria-label="Remove filter" onClick={() => setDataFilters(prev => prev.filter(x => x.id !== f.id))}>
                              <LucideIcons.X size={14} />
                            </Button>
                          </div>
                        ))}
                        <div>
                          <Button variant="secondary" size="sm" onClick={() => setDataFilters(prev => [...prev, { id: `f-${Date.now()}`, column: "", op: "is", value: "" }])}>
                            <LucideIcons.Plus size={14} />Add filter
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {sourceId && dataMode === "entity" && (
                  <div>
                    <StepLabel n={4}>What do you want to show?</StepLabel>
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 }}>
                      <OptionCard
                        icon="Sigma" title="Summarize"
                        description="Count the records, and optionally group them."
                        selected={opType === "aggregate"}
                        onSelect={() => { setOpType("aggregate"); setRecordColumns([]) }}
                      />
                      <OptionCard
                        icon="Rows3" title="Record set"
                        description="Show raw records — choose which columns to expose."
                        selected={opType === "record_set"}
                        /* Every column, pre-selected — the same default Thom's
                           prototype lands on ("9 of 9 selected"). A record set
                           IS the entity's rows, so "all of them" is the answer
                           far more often than any subset, and starting from
                           zero made the step a required chore before you could
                           even see the widget. Deselecting is one click each;
                           selecting nine was nine. Re-picking the mode keeps
                           whatever you already chose. */
                        onSelect={() => {
                          setOpType("record_set")
                          setGroupers([])
                          if (recordColumns.length === 0) setRecordColumns(SOURCE_COLUMNS[sourceId] ?? [])
                        }}
                      />
                    </div>
                  </div>
                )}

                {sourceId && dataMode === "entity" && opType === "aggregate" && (
                  <div>
                    <StepLabel n={5}>Group by</StepLabel>
                    {groupers.length === 0 ? (
                      <EmptyState
                        compact icon={LucideIcons.Group}
                        title="No groupers"
                        description="The result will be a single aggregated value."
                        ctaLabel="Add grouper"
                        onCta={() => setGroupers([{ id: `g-${Date.now()}`, column: "" }])}
                      />
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {groupers.map(g => (
                          <div key={g.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <OptionPicker
                                options={SOURCE_COLUMNS[sourceId] ?? []}
                                value={g.column}
                                placeholder="Group by column…"
                                onChange={col => setGroupers(prev => prev.map(x => x.id === g.id ? { ...x, column: col } : x))}
                              />
                            </div>
                            <Button variant="tertiary" size="sm" aria-label="Remove grouper" onClick={() => setGroupers(prev => prev.filter(x => x.id !== g.id))}>
                              <LucideIcons.X size={14} />
                            </Button>
                          </div>
                        ))}
                        <div>
                          <Button variant="secondary" size="sm" onClick={() => setGroupers(prev => [...prev, { id: `g-${Date.now()}`, column: "" }])}>
                            <LucideIcons.Plus size={14} />Add grouper
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {sourceId && dataMode === "entity" && opType === "record_set" && (
                  <div>
                    <StepLabel n={5}>Columns to expose</StepLabel>
                    {/* A summary, not the picker. Nine checkboxes inline made
                        the step scroll and still said nothing about what each
                        field holds — the explaining happens in the modal. */}
                    {recordColumns.length === 0 ? (
                      <EmptyState
                        compact icon={LucideIcons.Columns3}
                        title="No columns selected"
                        description="Pick the fields this widget will show."
                        ctaLabel="Choose columns"
                        onCta={() => { setColDraft(recordColumns); setShowColumns(true) }}
                      />
                    ) : (
                      /* Every column, not the first four. A "+5 more" chip is
                         right when the hidden items are decoration; here they
                         ARE the widget — this list is the columns the table
                         will show, in order, and a reader checking their work
                         has to see all of them. */
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
                        {recordColumns.map(c => (
                          <Tag key={c} variant="neutral" size="sm">{c}</Tag>
                        ))}
                        <Button variant="secondary" size="sm" onClick={() => { setColDraft(recordColumns); setShowColumns(true) }}>
                          Edit columns
                        </Button>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            {/* ── Tab 2: Widget ── */}
            {tab === "configure" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <StepLabel n={1}>Name your widget</StepLabel>
                  <p style={{ fontSize: 12, color: "var(--color-text-subtitle)", margin: "0 0 10px" }}>
                    What it is called on the dashboard, and the line under it.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <Input placeholder="Widget name, e.g. Pipeline by Stage" value={name} onChange={e => setName(e.target.value)} />
                    <Input placeholder="Short description (optional, up to 120 characters)" value={subtitle} onChange={e => setSubtitle(e.target.value.slice(0, 120))} />
                  </div>
                </div>

                <div>
                  <StepLabel n={2}>Widget type</StepLabel>
                  <p style={{ fontSize: 12, color: "var(--color-text-subtitle)", margin: "0 0 10px" }}>
                    How to visualize the data.
                  </p>

                  {/* Twenty-two tiles in one flat grid is a wall. Thom's
                      prototype groups them and offers a filter row; both are
                      his, and the category copy is his too. */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 12 }}>
                    <Chip size="s" variant={typeCat === "all" ? "primary" : "secondary"} onClick={() => setTypeCat("all")}>All</Chip>
                    {AUTHORABLE_BY_CATEGORY.map(c => (
                      <Chip key={c.id} size="s" variant={typeCat === c.id ? "primary" : "secondary"} onClick={() => setTypeCat(c.id)}>
                        {c.label}
                      </Chip>
                    ))}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {AUTHORABLE_BY_CATEGORY
                      .filter(c => typeCat === "all" || typeCat === c.id)
                      .map(c => (
                        <div key={c.id}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                            {/* Subtitle S — 14px / 600. A category is a heading
                                over a group of tiles, not a field label. */}
                            <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1, color: "var(--color-text-title)" }}>
                              {c.label}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-subtitle)" }}>{c.blurb}</span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(132px, 1fr))", gap: 8 }}>
                            {c.types.map(t => (
                              <TypeTile key={t.id} type={t} selected={typeId === t.id} onSelect={() => setTypeId(t.id)} />
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div>
                  <StepLabel n={3}>Settings</StepLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <OptionPicker
                      options={FRESHNESS_OPTIONS.map(o => o.label)}
                      value={FRESHNESS_OPTIONS.find(o => o.value === freshness)?.label ?? ""}
                      searchable={false}
                      placeholder="Refresh rate…"
                      onChange={label => setFreshness(FRESHNESS_OPTIONS.find(o => o.label === label)?.value ?? freshness)}
                    />
                    <Checkbox
                      label="Let end users filter this widget"
                      checked={interactiveFilters}
                      onChange={setInteractiveFilters}
                    />

                    <div style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--field-border)", background: "var(--canvas)" }}>
                      <p style={{ fontSize: 11, color: "var(--color-text-subtitle)", margin: 0 }}>Need advanced transformations or custom SQL?{" "}
                        <a href="#" style={{ color: "var(--primary)", fontWeight: 600 }}>View in Metabase ↗</a>
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* Right: sticky preview */}
          <div className="w-full min-[1100px]:w-[44%] shrink-0 min-[1100px]:sticky min-[1100px]:top-0">
            <WidgetPreviewPanel
              typeId={typeId}
              name={name}
              sourceId={sourceId}
              freshness={freshness}
              interactiveFilters={interactiveFilters}
              previewSize={previewSize}
              setPreviewSize={setPreviewSize}
              saveHint={saveHint}
            />
          </div>
        </div>

        </div>

      {/* Clearance so the last row of a stage is not left under the sticky
          footer at the end of a scroll. */}
      <div style={{ height: 24 }} />

      {/* ── Wizard navigation ──────────────────────────────────────────────
          Sticky at the foot of the page. Thom also keeps Cancel / Save to
          catalog in the Header, so Save has two entry points — his call, left
          as he built it. Flagged for Michael rather than removed a second
          time. */}
      <StepperNavFooter
          variant={tab === "data" ? "cancel-next" : "back-next"}
          onCancel={() => (hasUnsaved ? setShowLeave(true) : resetAll())}
          onBack={() => setTab(STEP_ORDER[Math.max(0, stepIndex - 1)])}
          // Thom named each step's destination — "Continue to Widget", not
          // "Next". Resolving the Stepper merge in main's favour flattened all
          // three to "Next", which is a worse label: it drops the one piece of
          // information the button had. His wording, restored.
          nextLabel={NEXT_LABEL[tab]}
          nextDisabled={!nextEnabled}
          onNext={() => {
            if (isLast) { attemptSave(); return }
            setTab(STEP_ORDER[stepIndex + 1])
          }}
        />

      {/* ── Browse all entities ── */}
      {/* Same catalogue shape as Choose columns: search, a filter row, a list
          that explains each item. Picking one selects it and closes — a
          catalogue's job ends at the choice. */}
      <ModalDialog
        isOpen={showEntities}
        onClose={() => setShowEntities(false)}
        variant="content"
        showIcon={false}
        title="Browse all entities"
        description="Every entity your workspace can read from today."
        slotUnstyled
        slot={
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Input
              size="sm"
              placeholder="Search entities…"
              value={entQuery}
              onChange={e => setEntQuery(e.target.value)}
            />
            {/* The source filter is a left rail, not a chip row. Four sources
                fit on one line today; every install adds one, and a wrapping
                row of twelve pushes the list off the bottom of the dialog. A
                column grows downward, which the panel can scroll. */}
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              {/* Tertiary buttons with a chevron, not chips. A chip is a
                  toggle sitting in a row of peers; this is a list you move
                  down, and the chevron says the choice leads somewhere — which
                  is what a category in a catalogue does. */}
              <div style={{ width: 148, flexShrink: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                {["all", ...INTEGRATIONS].map(src => (
                  <Button
                    key={src}
                    variant="tertiary"
                    size="sm"
                    className={`justify-between w-full ${srcFilter === src ? "!text-[var(--primary)]" : ""}`}
                    onClick={() => setSrcFilter(src)}
                  >
                    {src === "all" ? "All sources" : src}
                    <LucideIcons.ChevronRight size={14} />
                  </Button>
                ))}
              </div>

              {/* Two columns: the cards carry a description, and a single
                  column of eight made the dialog taller than the viewport.
                  Padding gives the hover shadow room inside the scroll box —
                  without it the glow is sliced at the container's edge. */}
              <div style={{
                flex: 1, minWidth: 0, height: 340, overflowY: "auto",
                padding: 4, margin: -4,
              }}>
                {visibleEntities.length === 0 ? (
                  <EmptyState
                    compact icon={LucideIcons.SearchX}
                    title="No entities found"
                    description="Try a different search term or source."
                  />
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 8 }}>
                    {visibleEntities.map(src => (
                      <EntitySourceCard
                        key={src.id}
                        source={src}
                        selected={sourceId === src.id}
                        onSelect={() => { selectSource(src.id); setShowEntities(false) }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        }
      />

      {/* ── Browse all datasets ── */}
      {/* Structurally identical to Browse all entities above — same modal
          variant, same search, same left rail, same two-column grid, same
          select-and-close. Only two things differ, and both are content: the
          rail filters by SHAPE rather than by source (a dataset's shape is what
          decides which widget types can draw it, and it is the only axis Thom's
          library filters on), and each rail row carries its count, because with
          seven datasets "Record set 1" tells you not to bother looking. */}
      <ModalDialog
        isOpen={showDatasets}
        onClose={() => setShowDatasets(false)}
        variant="content"
        showIcon={false}
        title="Browse all datasets"
        description="Pick a pre-built query to power your widget."
        slotUnstyled
        slot={
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Input
              size="sm"
              placeholder="Search datasets…"
              value={dsQuery}
              onChange={e => setDsQuery(e.target.value)}
            />
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ width: 148, flexShrink: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                {["all", ...DATASET_SHAPES].map(sh => (
                  <Button
                    key={sh}
                    variant="tertiary"
                    size="sm"
                    className={`justify-between w-full ${shapeFilter === sh ? "!text-[var(--primary)]" : ""}`}
                    onClick={() => setShapeFilter(sh)}
                  >
                    {sh === "all" ? "All shapes" : sh}
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 11, color: "var(--color-text-subtitle)" }}>{shapeCounts[sh]}</span>
                      <LucideIcons.ChevronRight size={14} />
                    </span>
                  </Button>
                ))}
              </div>

              <div style={{
                flex: 1, minWidth: 0, height: 340, overflowY: "auto",
                padding: 4, margin: -4,
              }}>
                {visibleDatasets.length === 0 ? (
                  <EmptyState
                    compact icon={LucideIcons.SearchX}
                    title="No datasets found"
                    description="Try a different search term or shape."
                  />
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 8 }}>
                    {visibleDatasets.map(ds => (
                      <DatasetCard
                        key={ds.id}
                        dataset={ds}
                        selected={sourceId === ds.id}
                        onSelect={() => { setSourceId(ds.id); setShowDatasets(false) }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        }
      />

      {/* ── Columns modal ── */}
      {/* A picker, not a confirmation: variant="content" with slotUnstyled, so
          the list sits directly on the modal instead of inside a grey card.
          Each row explains its field, which is the whole reason this stopped
          being an inline checkbox list. */}
      <ModalDialog
        isOpen={showColumns}
        onClose={() => setShowColumns(false)}
        variant="content"
        showIcon={false}
        title="Columns to expose"
        description="Choose which fields are available in this dataset."
        slotUnstyled
        slot={
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Input
              size="sm"
              placeholder="Search by name, description, or field key…"
              value={colQuery}
              onChange={e => setColQuery(e.target.value)}
            />

            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" as const }}>
              <Chip size="s" variant={colType === "All" ? "primary" : "secondary"} onClick={() => setColType("All")}>All</Chip>
              {COLUMN_TYPES.map(t => (
                <Chip key={t} size="s" variant={colType === t ? "primary" : "secondary"} onClick={() => setColType(t)}>{t}</Chip>
              ))}
              <div style={{ marginLeft: "auto" }}>
                <Button
                  variant="tertiary"
                  size="sm"
                  onClick={() => setColDraft(colDraft.length === 0 ? (SOURCE_COLUMNS[sourceId ?? ""] ?? []) : [])}
                >
                  {colDraft.length === 0 ? "Select all" : "Deselect all"}
                </Button>
              </div>
            </div>

            <div style={{ height: 320, overflowY: "auto", display: "flex", flexDirection: "column" }}>
              {visibleColumns.length === 0 ? (
                <EmptyState
                  compact icon={LucideIcons.SearchX}
                  title="No columns found"
                  description="Try a different search term or type."
                />
              ) : visibleColumns.map((c, i) => (
                <div
                  key={c.key}
                  style={{
                    display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
                    padding: "12px 4px",
                    borderBottom: i < visibleColumns.length - 1 ? "1px solid var(--field-border)" : "none",
                  }}
                >
                  {/* Checkbox already models a title with a description under
                      it, at the right sizes and colours — and as a <label>, so
                      the whole thing is the hit target. The hand-rolled version
                      this replaces only responded to a click on the box. */}
                  <Checkbox
                    label={c.label}
                    description={c.desc}
                    checked={colDraft.includes(c.label)}
                    onChange={on => setColDraft(prev => on ? [...prev, c.label] : prev.filter(x => x !== c.label))}
                    className="min-w-0 flex-1"
                  />
                  {/* Type and key sit on the right: both are facts ABOUT the
                      field rather than part of what it means. The key is what
                      someone who knows the data will search for. */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, paddingTop: 4 }}>
                    <Tag variant="neutral" size="sm">{c.type}</Tag>
                    <span style={{ fontSize: 12, color: "var(--color-text-subtitle)" }}>{c.key}</span>
                  </div>
                </div>
              ))}
            </div>

            <span style={{ fontSize: 12, color: "var(--color-text-subtitle)" }}>
              {colDraft.length} of {(SOURCE_COLUMNS[sourceId ?? ""] ?? []).length} selected
            </span>
          </div>
        }
        ctaPrimary={{
          label: "Done",
          disabled: colDraft.length === 0,
          onClick: () => { setRecordColumns(colDraft); setShowColumns(false) },
        }}
        ctaSecondary={{ label: "Cancel", onClick: () => setShowColumns(false) }}
      />

      {/* ── Leave confirmation modal ── */}
      <ModalDialog
        isOpen={showLeave}
        onClose={() => setShowLeave(false)}
        tone="warning"
        title="Leave without saving?"
        description="Your widget isn't saved yet. If you leave now, your configuration will be lost."
        /* Close it too. resetAll clears the builder but knows nothing about
           this dialog, so leaving used to empty the form behind a confirmation
           that was still sitting on top of it. */
        ctaPrimary={{ label: "Leave without saving", destructive: true, onClick: () => { setShowLeave(false); resetAll() } }}
        ctaSecondary={{ label: "Keep editing", onClick: () => setShowLeave(false) }}
      />

      {/* ── Save as draft ──────────────────────────────────────────────────
       *  This dialog only appears for an UNFINISHED widget. A complete one
       *  saves straight through: the Create pattern reserves a confirmation for
       *  a save that cannot be undone, and this one can — asking "are you sure?"
       *  about a reversible action trains people to click past the question.
       *
       *  What makes this case different is not risk, it is that the outcome is
       *  not the one the button implied a moment ago: you set out to publish a
       *  widget and a draft is what lands. Keep editing is the way back. */}
      <ModalDialog
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        tone="default"
        iconName="FileClock"
        title="Save as a draft?"
        description={`"${name}" is still missing ${missingPiece}, so it goes to the catalog as a draft.`}
        informativeCard="A draft is saved and searchable, but it cannot be added to a dashboard until it is finished."
        ctaPrimary={{ label: "Save as draft", onClick: () => commitSave(true) }}
        ctaSecondary={{ label: "Keep editing", onClick: () => setShowSaveModal(false) }}
      />

      {/* ── Saved ──────────────────────────────────────────────────────────
       *  The success view, and the only place "Create another widget" makes
       *  sense: the widget is in the catalog, so starting a fresh one cannot
       *  lose it. */}
      <ModalDialog
        isOpen={!!savedName}
        onClose={() => setSavedName(null)}
        tone="success"
        iconName={savedAsDraft ? "FileClock" : "CircleCheck"}
        /* Copy from Michael, 2026-09-10. The outcome leads and the name is
           gone: by this point the reader typed that name one screen ago and
           the sentence has better things to spend its width on — what state
           the widget is in, and what they can still do about it.

           The draft line is the same sentence in the state that is actually
           true of a draft. It exists because "Widget published" over an
           unfinished widget would be the flow's one outright lie. */
        title={savedAsDraft ? "Draft saved" : "Widget published"}
        description={savedAsDraft
          ? "It's in the catalog, but it can't be added to a dashboard until you finish setting it up."
          : "It's in the catalog for your whole workspace. You can edit or unpublish it anytime."}
        /* "View in catalog" is the primary, and it says where it goes — this
           button navigates to the library rather than dismissing anything.
           Finishing is what most people came to do, and landing back on the
           form you just filled in reads as if the save did not take. That is
           the Create pattern's rule for a full-page create: go to where the
           created object now lives.

           Creating another is the secondary — a real outcome, but the one
           fewer people want, and it is the only place the offer makes sense
           because the current widget is already safe. */
        ctaPrimary={{ label: "View in catalog", onClick: () => { window.location.href = "?proto=proto-thomas-widget-library" } }}
        /* This path never navigates, so the landing cannot speak for it. It
           takes the announcement here — which also stops the library repeating
           it later in the same session. */
        ctaSecondary={{ label: "Create another widget", onClick: () => {
          const saved = takeAnnouncement()
          if (saved) announce(saved)
          setSavedName(null)
          resetAll()
        } }}
      />
    </ScreenLayout>
  )
}
