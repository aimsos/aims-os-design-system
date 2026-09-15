import { useState } from "react"
import { ADMIN_SIDEBAR as SIDEBAR } from "./adminShared"
import * as Icons from "lucide-react"
import { ScreenLayout }  from "@/components/layouts/screen-layout"
import { Header }        from "@/components/ui/header"
import { Button }        from "@/components/ui/button"
import { Tabs }          from "@/components/ui/tabs"
import { SlideOut }      from "@/components/ui/slide-out"
import { CardContainer } from "@/components/ui/card-container"
import { EntityList }    from "@/components/ui/entity-list"
import type { EntityListItemData } from "@/components/ui/entity-list"
import { Filters }       from "@/components/ui/filters"
import { Pagination }    from "@/components/ui/pagination"
import { HighlightIcon } from "@/components/ui/highlight-icon"

// ─── Types ────────────────────────────────────────────────────────────────────

type IntegrationStatus = "active" | "error" | "paused" | "pending"
type ActionType = "reauth" | "pause" | "resume" | "disconnect"
type AuthType = "OAuth 2.0" | "API Key" | "Service Account" | "SAML" | "Basic Auth"

interface SyncRun { ts: string; duration: string; records: string; status: "success" | "failure" | "warning" }

interface Guardrails {
  piiFields: string[]
  allowedDownstream: string[]
  blockedDownstream: string[]
  accessLevel: "Read only" | "Read + Write" | "Write only"
  retentionDays: number
  schemaVersion: string
  fieldExclusions: string[]
}

interface Integration {
  id: string; name: string; category: string; icon: string
  status: IntegrationStatus; authType: AuthType
  connectedBy: string; connectedAt: string
  lastSync: string; nextSync: string
  syncFrequency: string; records: string
  description: string; website: string
  dataScope: string[]
  oauthScopes?: string[]
  errorMsg?: string
  history: SyncRun[]
  guardrails: Guardrails
  // Detail page fields
  isOfficial?: boolean
  version?: string
  maintainer?: string
  dataResidency?: string
  compliance?: string[]
  schemaDrift?: boolean
  connectedMonthsAgo?: number
  studioUsage?: StudioUsage
  capabilitiesV2?: { tools?: Array<{name: string; desc?: string}>; dataSync?: Array<{name: string; desc?: string}> }
  instances?: Array<{id: string; name: string; status: string; connectedAt: string}>
  usageConsumers?: UsageConsumer[]
  activityLog?: ActivityEvent[]
}

interface StudioUsage {
  governance?: { enabled: boolean; callsPerDay?: number }
  agentic?:    { enabled: boolean; callsPerDay?: number; agents?: number }
  workforce?:  { enabled: boolean; channels?: number; routes?: number }
}
interface UsageConsumer {
  id: string; name: string; type: "workflow" | "agent" | "network" | "widget"
  owner: string; runsPerWeek?: number; activeUsers?: number; lastActivity: string
}
interface ActivityEvent {
  ts: string; event: string; target: string; actor: string; badge?: string
}

interface CatalogItem {
  id: string; name: string; category: string; icon: string; description: string
  authType: string; popular?: boolean
}

// ─── Data ────────────────────────────────────────────────────────────────────

const STATUS_META: Record<IntegrationStatus, { label: string; color: string; icon: React.ReactNode }> = {
  active:  { label: "Active",   color: "var(--badge-success)", icon: <Icons.CheckCircle size={11} /> },
  error:   { label: "Error",    color: "var(--badge-error)",   icon: <Icons.AlertCircle size={11} /> },
  paused:  { label: "Paused",   color: "var(--muted-foreground)", icon: <Icons.PauseCircle size={11} /> },
  pending: { label: "Pending",  color: "var(--badge-alert)",   icon: <Icons.Clock size={11} /> },
}

const INITIAL_CONNECTED: Integration[] = [
  {
    id: "salesforce", name: "Salesforce CRM", category: "CRM", icon: "Building2",
    status: "error", authType: "OAuth 2.0",
    connectedBy: "Thomas Gonzalez", connectedAt: "Aug 25, 2026",
    lastSync: "Aug 20 · 08:00", nextSync: "—", syncFrequency: "Every 4 hours",
    records: "0 (sync paused)",
    description: "Customer relationship management — contacts, opportunities, accounts, and activities.",
    website: "salesforce.com",
    errorMsg: "OAuth token expired. Re-authentication required to resume syncing.",
    dataScope: ["Contacts", "Accounts", "Opportunities", "Activities", "Leads", "Cases"],
    oauthScopes: ["read_opportunities", "read_accounts", "read_contacts", "read_leads", "read_cases", "offline_access"],
    history: [
      { ts: "Aug 20 · 08:00", duration: "—",     records: "0",     status: "failure" },
      { ts: "Aug 20 · 04:00", duration: "2m 14s", records: "1,240", status: "success" },
      { ts: "Aug 20 · 00:00", duration: "2m 08s", records: "1,218", status: "success" },
      { ts: "Aug 19 · 20:00", duration: "2m 01s", records: "1,195", status: "success" },
      { ts: "Aug 19 · 16:00", duration: "1m 58s", records: "1,182", status: "success" },
    ],
    guardrails: {
      piiFields: ["Email", "Phone", "MobilePhone", "SSN__c"],
      allowedDownstream: ["Sales Copilot", "Revenue Forecasting Agent"],
      blockedDownstream: ["Public Reporting", "External APIs"],
      accessLevel: "Read only",
      retentionDays: 90,
      schemaVersion: "v2.4.1",
      fieldExclusions: ["Description", "Internal_Notes__c", "Compensation__c"],
    },
    isOfficial: true, version: "2.4.1", maintainer: "AIMS-OS", connectedMonthsAgo: 2,
    dataResidency: "US-East · EU available",
    compliance: ["SOC 2 Type II", "GDPR", "HIPAA ready"],
    schemaDrift: true,
    studioUsage: {
      governance: { enabled: false },
      agentic:    { enabled: true, callsPerDay: 34, agents: 2 },
      workforce:  { enabled: true, channels: 5, routes: 2 },
    },
    capabilitiesV2: {
      tools: [
        { name: "Read accounts",       desc: "Retrieve account records and metadata" },
        { name: "Read opportunities",  desc: "Pull opportunity pipeline and forecast data" },
        { name: "Read contacts",       desc: "Access contact details and communication logs" },
        { name: "Read leads",          desc: "Fetch lead records and conversion status" },
        { name: "Read cases",          desc: "Access support cases and resolution history" },
        { name: "Write activities",    desc: "Log calls, emails, and tasks back to Salesforce" },
      ],
      dataSync: [
        { name: "Workspace knowledge sources", desc: "Sync Salesforce objects into AIMS-OS knowledge plane" },
        { name: "Entity enrichment",           desc: "Enrich account and contact entities with CRM data" },
      ],
    },
    instances: [],
    usageConsumers: [
      { id: "uc1",  name: "New lead → Salesforce + Slack alert",  type: "workflow", owner: "Thomas G.", runsPerWeek: 42, lastActivity: "2h ago" },
      { id: "uc2",  name: "Lead enrichment from Clearbit",         type: "workflow", owner: "Maria L.",  runsPerWeek: 18, lastActivity: "Yesterday" },
      { id: "uc3",  name: "Renewal risk alert",                    type: "workflow", owner: "Carlos M.", runsPerWeek: 7,  lastActivity: "3d ago" },
      { id: "uc4",  name: "Stale opportunity nudge",               type: "workflow", owner: "Thomas G.", runsPerWeek: 5,  lastActivity: "1d ago" },
      { id: "uc5",  name: "Weekly churn digest",                   type: "workflow", owner: "Maria L.",  runsPerWeek: 1,  lastActivity: "6d ago" },
      { id: "uc6",  name: "Sales Triage Agent",                    type: "agent",    owner: "Thomas G.", activeUsers: 24, lastActivity: "1h ago" },
      { id: "uc7",  name: "Renewal Risk Agent",                    type: "agent",    owner: "Carlos M.", activeUsers: 6,  lastActivity: "Yesterday" },
      { id: "uc8",  name: "Deal Coach Agent",                      type: "agent",    owner: "Maria L.",  activeUsers: 11, lastActivity: "2h ago" },
      { id: "uc9",  name: "Revenue Intelligence Network",          type: "network",  owner: "Thomas G.", lastActivity: "1d ago" },
      { id: "uc10", name: "GTM Automation Network",               type: "network",  owner: "Carlos M.", lastActivity: "3d ago" },
      { id: "uc11", name: "Deal health widget",                   type: "widget",   owner: "Thomas G.", lastActivity: "30m ago" },
      { id: "uc12", name: "Open opportunities widget",            type: "widget",   owner: "Maria L.",  lastActivity: "2h ago" },
      { id: "uc13", name: "Forecast summary widget",              type: "widget",   owner: "Carlos M.", lastActivity: "Yesterday" },
      { id: "uc14", name: "Pipeline velocity widget",             type: "widget",   owner: "Thomas G.", lastActivity: "3h ago" },
    ],
    activityLog: [
      { ts: "2 months ago", event: "Integration added to workspace", target: "Salesforce CRM", actor: "Thomas González", badge: "Integration added to workspace" },
      { ts: "2 months ago", event: "OAuth 2.0 authorized",           target: "Salesforce CRM", actor: "Thomas González" },
      { ts: "2 weeks ago",  event: "Schema drift detected",          target: "Contacts object", actor: "AIMS-OS system",  badge: "Schema drift" },
      { ts: "6 days ago",   event: "OAuth token expired",            target: "Salesforce CRM", actor: "AIMS-OS system",  badge: "Error" },
    ],
  },
  {
    id: "databricks", name: "Databricks", category: "Data Platform", icon: "Layers",
    status: "active", authType: "Service Account",
    connectedBy: "Thomas Gonzalez", connectedAt: "Aug 25, 2026",
    lastSync: "Aug 26 · 09:30", nextSync: "Aug 26 · 13:30", syncFrequency: "Every 4 hours",
    records: "2,341 records",
    description: "Unified analytics platform — Delta Lake, notebooks, and ML workflow outputs for model feature stores.",
    website: "databricks.com",
    dataScope: ["sales_delta", "ml_features", "notebook_outputs", "experiment_runs"],
    history: [
      { ts: "Aug 26 · 09:30", duration: "18s",   records: "2,341", status: "success" },
      { ts: "Aug 26 · 05:30", duration: "21s",   records: "2,289", status: "success" },
      { ts: "Aug 26 · 01:30", duration: "19s",   records: "2,310", status: "success" },
      { ts: "Aug 25 · 21:30", duration: "17s",   records: "2,278", status: "success" },
      { ts: "Aug 25 · 17:30", duration: "22s",   records: "2,261", status: "warning" },
    ],
    guardrails: {
      piiFields: [],
      allowedDownstream: ["Data Studio Models", "Analytics Workers", "ML Pipeline Agent"],
      blockedDownstream: ["Finance Copilot"],
      accessLevel: "Read + Write",
      retentionDays: 365,
      schemaVersion: "v1.8.0",
      fieldExclusions: [],
    },
  },
  {
    id: "snowflake", name: "Snowflake", category: "Data Warehouse", icon: "Database",
    status: "active", authType: "Service Account",
    connectedBy: "Maria García", connectedAt: "Jul 15, 2026",
    lastSync: "Aug 26 · 08:00", nextSync: "Aug 26 · 12:00", syncFrequency: "Every 4 hours",
    records: "14,820 records",
    description: "Cloud data warehouse for structured and semi-structured data across FINANCE, MARKETING, and OPS schemas.",
    website: "snowflake.com",
    dataScope: ["FINANCE.DWH", "MARKETING.EVENTS", "OPS.LOGS", "SHARED.REFERENCE"],
    history: [
      { ts: "Aug 26 · 08:00", duration: "1m 32s", records: "14,820", status: "success" },
      { ts: "Aug 26 · 04:00", duration: "1m 28s", records: "14,711", status: "success" },
      { ts: "Aug 26 · 00:00", duration: "1m 35s", records: "14,690", status: "warning" },
      { ts: "Aug 25 · 20:00", duration: "1m 30s", records: "14,655", status: "success" },
      { ts: "Aug 25 · 16:00", duration: "1m 27s", records: "14,622", status: "success" },
    ],
    guardrails: {
      piiFields: ["CUSTOMER_EMAIL", "CUSTOMER_PHONE", "TAX_ID"],
      allowedDownstream: ["Finance Copilot", "Reporting Worker", "Data Studio Models"],
      blockedDownstream: ["Sales Copilot", "External APIs"],
      accessLevel: "Read only",
      retentionDays: 180,
      schemaVersion: "v3.1.2",
      fieldExclusions: ["CUSTOMER_EMAIL", "CUSTOMER_PHONE", "SALARY", "BENEFIT_DETAILS"],
    },
  },
  {
    id: "sap", name: "SAP S/4HANA", category: "ERP", icon: "Factory",
    status: "active", authType: "Basic Auth",
    connectedBy: "Eduardo Suárez", connectedAt: "Jun 01, 2026",
    lastSync: "Aug 26 · 06:00", nextSync: "Aug 27 · 06:00", syncFrequency: "Daily",
    records: "38,410 records",
    description: "Enterprise resource planning — General Ledger, AR/AP, procurement, and inventory management.",
    website: "sap.com",
    dataScope: ["GL Accounts", "AR / AP Transactions", "Purchase Orders", "Inventory", "Cost Centers"],
    history: [
      { ts: "Aug 26 · 06:00", duration: "4m 11s", records: "38,410", status: "success" },
      { ts: "Aug 25 · 06:00", duration: "4m 05s", records: "38,201", status: "success" },
      { ts: "Aug 24 · 06:00", duration: "3m 58s", records: "38,100", status: "success" },
      { ts: "Aug 23 · 06:00", duration: "4m 02s", records: "37,988", status: "success" },
      { ts: "Aug 22 · 06:00", duration: "3m 51s", records: "37,854", status: "success" },
    ],
    guardrails: {
      piiFields: ["VENDOR_CONTACT", "EMPLOYEE_ID", "BANK_ACCOUNT"],
      allowedDownstream: ["Finance Copilot", "Procurement Agent", "Audit Worker"],
      blockedDownstream: ["Sales Copilot", "Marketing Analytics"],
      accessLevel: "Read only",
      retentionDays: 730,
      schemaVersion: "v1.2.0",
      fieldExclusions: ["VENDOR_CONTACT", "EMPLOYEE_ID", "BANK_ACCOUNT", "PAYMENT_TERMS_OVERRIDE"],
    },
  },
  {
    id: "bigquery", name: "Google BigQuery", category: "Data Warehouse", icon: "BarChart2",
    status: "paused", authType: "Service Account",
    connectedBy: "Maria García", connectedAt: "May 10, 2026",
    lastSync: "Aug 15 · 12:00", nextSync: "—", syncFrequency: "Every 6 hours (paused)",
    records: "—",
    description: "Serverless, multicloud data warehouse for Google Analytics 4 events, ad conversions, and session data.",
    website: "cloud.google.com/bigquery",
    dataScope: ["analytics.events", "analytics.sessions", "ads.conversions", "ads.campaigns"],
    history: [
      { ts: "Aug 15 · 12:00", duration: "3m 02s", records: "22,140", status: "success" },
      { ts: "Aug 15 · 06:00", duration: "3m 10s", records: "22,090", status: "success" },
      { ts: "Aug 15 · 00:00", duration: "3m 05s", records: "22,010", status: "success" },
      { ts: "Aug 14 · 18:00", duration: "2m 58s", records: "21,980", status: "success" },
    ],
    guardrails: {
      piiFields: ["user_id", "ip_address", "user_pseudo_id"],
      allowedDownstream: ["Marketing Analytics", "Campaign Performance Worker"],
      blockedDownstream: ["Finance Copilot", "Sales Copilot", "Audit Worker"],
      accessLevel: "Read only",
      retentionDays: 60,
      schemaVersion: "v2.0.0",
      fieldExclusions: ["user_id", "ip_address", "geo_city", "geo_region"],
    },
  },
  {
    id: "teams", name: "Microsoft Teams", category: "Collaboration", icon: "MessageSquare",
    status: "active", authType: "OAuth 2.0",
    connectedBy: "Thomas Gonzalez", connectedAt: "Aug 10, 2026",
    lastSync: "Aug 26 · 09:00", nextSync: "Aug 26 · 10:00", syncFrequency: "Hourly",
    records: "Webhook only",
    description: "Team chat and collaboration — AIMS-OS sends HITL alerts, agent escalations, and system notifications.",
    website: "teams.microsoft.com",
    dataScope: ["Webhook delivery only — no data ingest"],
    oauthScopes: ["ChannelMessage.Send", "Chat.Create", "TeamsActivity.Send", "Group.ReadWrite.All"],
    history: [
      { ts: "Aug 26 · 09:00", duration: "< 1s", records: "3 webhooks", status: "success" },
      { ts: "Aug 26 · 08:00", duration: "< 1s", records: "1 webhook",  status: "success" },
      { ts: "Aug 26 · 07:00", duration: "< 1s", records: "2 webhooks", status: "success" },
      { ts: "Aug 26 · 06:00", duration: "< 1s", records: "0 webhooks", status: "success" },
    ],
    guardrails: {
      piiFields: [],
      allowedDownstream: ["HITL Notification Engine", "Alert Dispatcher", "Escalation Worker"],
      blockedDownstream: ["Data Studio Models", "External APIs"],
      accessLevel: "Write only",
      retentionDays: 30,
      schemaVersion: "v1.0.0",
      fieldExclusions: [],
    },
  },
]

const CATALOG: CatalogItem[] = [
  { id: "hubspot",    name: "HubSpot",        category: "CRM",              icon: "Megaphone",     authType: "OAuth 2.0",       description: "Inbound marketing, sales CRM, and pipeline management.", popular: true },
  { id: "jira",       name: "Jira",           category: "Project Mgmt",     icon: "Kanban",        authType: "OAuth 2.0",       description: "Issue and project tracking for engineering and product teams." },
  { id: "slack",      name: "Slack",          category: "Collaboration",    icon: "MessageCircle", authType: "OAuth 2.0",       description: "Team messaging and workflow automation via webhooks.", popular: true },
  { id: "notion",     name: "Notion",         category: "Knowledge Base",   icon: "BookOpen",      authType: "API Key",         description: "Docs, wikis, and databases unified in one workspace." },
  { id: "postgres",   name: "PostgreSQL",     category: "Database",         icon: "Database",      authType: "Service Account", description: "Open-source relational database for structured data.", popular: true },
  { id: "mysql",      name: "MySQL",          category: "Database",         icon: "Database",      authType: "Service Account", description: "World's most widely deployed open-source database." },
  { id: "mongo",      name: "MongoDB",        category: "Database",         icon: "Database",      authType: "Service Account", description: "Document database designed for modern application data." },
  { id: "s3",         name: "AWS S3",         category: "Storage",          icon: "HardDrive",     authType: "Service Account", description: "Scalable object storage for any volume of unstructured data.", popular: true },
  { id: "azure",      name: "Azure Blob",     category: "Storage",          icon: "Cloud",         authType: "Service Account", description: "Massively scalable cloud object storage from Microsoft." },
  { id: "tableau",    name: "Tableau",        category: "Analytics",        icon: "BarChart",      authType: "API Key",         description: "Visual analytics and interactive business intelligence dashboards." },
  { id: "powerbi",    name: "Power BI",       category: "Analytics",        icon: "PieChart",      authType: "OAuth 2.0",       description: "Microsoft business analytics and reporting service." },
  { id: "dbt",        name: "dbt",            category: "Data Transform",   icon: "GitBranch",     authType: "API Key",         description: "SQL-based data transformation for analytics engineering." },
  { id: "github",     name: "GitHub",         category: "Developer Tools",  icon: "GitBranch",     authType: "OAuth 2.0",       description: "Code hosting, CI/CD pipelines, and team collaboration." },
  { id: "zendesk",    name: "Zendesk",        category: "Support",          icon: "Headphones",    authType: "OAuth 2.0",       description: "Customer support ticketing, macros, and SLA management." },
  { id: "stripe",     name: "Stripe",         category: "Payments",         icon: "CreditCard",    authType: "API Key",         description: "Payment processing, subscriptions, and financial reporting." },
  { id: "sendgrid",   name: "SendGrid",       category: "Email",            icon: "Mail",          authType: "API Key",         description: "Transactional email delivery and marketing campaigns." },
]

const CATALOG_CATEGORIES = ["All", "CRM", "Data Warehouse", "Database", "Storage", "Analytics", "Collaboration", "Project Mgmt", "Knowledge Base", "Developer Tools", "Data Transform", "Support", "Payments", "Email"]



// ─── Request integration panel ────────────────────────────────────────────────

function RequestPanel({ onClose }: { onClose: () => void }) {
  const [name,     setName]     = useState("")
  const [category, setCategory] = useState("")
  const [useCase,  setUseCase]  = useState("")
  const [priority, setPriority] = useState("medium")
  const [submitted, setSubmitted] = useState(false)

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", fontSize: 13, borderRadius: 8,
    border: "1px solid var(--border)", background: "var(--surface)",
    color: "var(--foreground)", outline: "none", boxSizing: "border-box",
  }

  if (submitted) {
    return (
      <div style={{ padding: "60px 0", textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--badge-success)18", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Icons.CheckCircle size={24} style={{ color: "var(--badge-success)" }} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>Request submitted</div>
        <div style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 24 }}>
          Your request for <strong>{name}</strong> has been sent to your AIMS-OS account team. You'll hear back within 2 business days.
        </div>
        <Button variant="secondary" size="sm" onClick={onClose}>Done</Button>
      </div>
    )
  }

  return (
    <div style={{ padding: "20px 0", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
        Don't see what you need? Tell us and we'll evaluate it for a future release.
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>Integration name <span style={{ color: "var(--badge-error)" }}>*</span></div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Workday, Coupa, Greenhouse" style={inputStyle} />
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>Category</div>
        <input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. HRIS, Procurement, Recruiting" style={inputStyle} />
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>How would you use this integration? <span style={{ color: "var(--badge-error)" }}>*</span></div>
        <textarea
          value={useCase}
          onChange={e => setUseCase(e.target.value)}
          placeholder="Describe the data you need and how it would support your workflows…"
          rows={4}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>Priority</div>
        <select value={priority} onChange={e => setPriority(e.target.value)} style={inputStyle}>
          <option value="low">Low — nice to have</option>
          <option value="medium">Medium — would improve workflows</option>
          <option value="high">High — blocking a key use case</option>
        </select>
      </div>

      <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
        <Button
          variant="primary"
          size="sm"
          onClick={() => { if (name.trim() && useCase.trim()) setSubmitted(true) }}
        >
          Submit request
        </Button>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  )
}

// ─── Catalog detail panel ─────────────────────────────────────────────────────

function CatalogDetailPanel({ item, connected, onConnect }: {
  item: CatalogItem; connected: boolean; onConnect: () => void
}) {
  const [step, setStep] = useState<"info" | "config" | "done">("info")
  const [apiKey, setApiKey] = useState("")

  const IC = Icons[item.icon as keyof typeof Icons] as React.ElementType

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", fontSize: 13, borderRadius: 8,
    border: "1px solid var(--border)", background: "var(--surface)",
    color: "var(--foreground)", outline: "none",
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
      {/* Header identity */}
      <div style={{ padding: "16px 0", borderBottom: "1px solid var(--border)", display: "flex", gap: 14, alignItems: "center" }}>
        <div style={{ width: 44, height: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
          {IC ? <IC size={22} /> : null}
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>{item.name}</div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>
            {item.category} · {item.authType}
          </div>
        </div>
        {connected && (
          <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 100, background: "var(--badge-success)18", color: "var(--badge-success)", border: "1px solid var(--badge-success)30" }}>
            Connected
          </span>
        )}
      </div>

      <div style={{ flex: 1, padding: "16px 0" }}>
        {step === "info" && (
          <>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 20 }}>{item.description}</div>

            {[
              ["Category",         item.category],
              ["Authentication",   item.authType],
              ["Sync direction",   "Read + Write"],
              ["Setup time",       "~5 minutes"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", gap: 12, padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ width: 130, flexShrink: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", paddingTop: 1 }}>{k}</span>
                <span style={{ fontSize: 13, color: "var(--foreground)" }}>{v}</span>
              </div>
            ))}

            <div style={{ marginTop: 20 }}>
              {connected
                ? <Button variant="secondary" size="sm" style={{ color: "var(--badge-error)", borderColor: "var(--badge-error)40" }}>
                    <Icons.Unplug size={13} style={{ marginRight: 4 }} />
                    Disconnect
                  </Button>
                : <Button variant="primary" size="sm" onClick={() => setStep("config")}>
                    Connect {item.name}
                  </Button>
              }
            </div>
          </>
        )}

        {step === "config" && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>Connect {item.name}</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 20, lineHeight: 1.5 }}>
              {item.authType === "OAuth 2.0"
                ? "You'll be redirected to authorize AIMS-OS to access your account."
                : `Provide your ${item.authType} credentials to establish the connection.`}
            </div>

            {item.authType !== "OAuth 2.0" && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>
                  {item.authType === "API Key" ? "API key" : "Service account JSON"}
                </div>
                <input
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder={item.authType === "API Key" ? "sk-…" : "Paste service account credentials"}
                  style={inputStyle}
                />
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>Sync frequency</div>
              <select style={{ ...inputStyle }}>
                <option>Every hour</option>
                <option>Every 4 hours</option>
                <option>Daily</option>
                <option>Weekly</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="primary" size="sm" onClick={() => { onConnect(); setStep("done") }}>
                {item.authType === "OAuth 2.0" ? "Authorize with " + item.name : "Connect"}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setStep("info")}>Cancel</Button>
            </div>
          </>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--badge-success)18", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Icons.CheckCircle size={24} style={{ color: "var(--badge-success)" }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>{item.name} connected</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>First sync will run within the next few minutes.</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Catalog / Marketplace ────────────────────────────────────────────────────

function CatalogView({ connectedIds }: { connectedIds: Set<string> }) {
  const [catFilter, setCatFilter] = useState("All")
  const [catQuery, setCatQuery]   = useState("")
  const [selected, setSelected]   = useState<CatalogItem | null>(null)
  const [connected, setConnected] = useState<Set<string>>(connectedIds)
  const [showRequest, setShowRequest] = useState(false)

  const filtered = CATALOG.filter(c =>
    (catFilter === "All" || c.category === catFilter) &&
    (c.name.toLowerCase().includes(catQuery.toLowerCase()) ||
     c.category.toLowerCase().includes(catQuery.toLowerCase()))
  )

  const popular = CATALOG.filter(c => c.popular && (catFilter === "All" || c.category === catFilter) && c.name.toLowerCase().includes(catQuery.toLowerCase()))

  const IntIcon = ({ icon }: { icon: string }) => {
    const IC = Icons[icon as keyof typeof Icons] as React.ElementType
    return IC ? <IC size={18} /> : null
  }

  return (
    <div style={{ display: "flex", minHeight: 0, flex: 1 }}>
      {/* Category sidebar */}
      <div style={{ width: 160, flexShrink: 0, borderRight: "1px solid var(--border)", padding: "16px 0", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1 }}>
          {CATALOG_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCatFilter(cat)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "6px 16px", fontSize: 12, fontWeight: catFilter === cat ? 700 : 500,
                color: catFilter === cat ? "var(--primary)" : "var(--muted-foreground)",
                background: catFilter === cat ? "var(--primary)10" : "none",
                border: "none", cursor: "pointer", borderRadius: 0,
                borderLeft: catFilter === cat ? "2px solid var(--primary)" : "2px solid transparent",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
        {/* Request at bottom of sidebar */}
        <div style={{ padding: "12px 12px 0", borderTop: "1px solid var(--border)", marginTop: 8 }}>
          <button
            onClick={() => setShowRequest(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6, width: "100%",
              padding: "7px 8px", fontSize: 11, fontWeight: 600,
              color: "var(--muted-foreground)", background: "none", border: "none",
              cursor: "pointer", borderRadius: 6, textAlign: "left",
            }}
          >
            <Icons.PlusCircle size={13} />
            Request integration
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0, padding: "16px 20px", overflowY: "auto" }}>
        {/* Search */}
        <div style={{ position: "relative", marginBottom: 20 }}>
          <Icons.Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", pointerEvents: "none" }} />
          <input
            value={catQuery}
            onChange={e => setCatQuery(e.target.value)}
            placeholder="Search integrations…"
            style={{
              width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
              fontSize: 13, border: "1px solid var(--border)", borderRadius: 8,
              background: "var(--surface)", color: "var(--foreground)", outline: "none",
            }}
          />
        </div>

        {/* Popular row */}
        {popular.length > 0 && catQuery === "" && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted-foreground)", marginBottom: 10 }}>Popular</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {popular.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelected(item)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                    border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer",
                    background: "var(--surface-raised)", color: "var(--foreground)",
                  }}
                >
                  <div style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}>
                    <IntIcon icon={item.icon} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</span>
                  {connected.has(item.id) && <Icons.CheckCircle size={12} style={{ color: "var(--badge-success)" }} />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Grid or empty state */}
        {filtered.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center" }}>
            <Icons.SearchX size={24} style={{ marginBottom: 10, opacity: 0.3, color: "var(--muted-foreground)" }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 4 }}>No integrations match "{catQuery}"</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 20 }}>
              Don't see what you're looking for?
            </div>
            <Button variant="secondary" size="sm" onClick={() => { setCatQuery(""); setShowRequest(true) }}>
              <Icons.PlusCircle size={13} style={{ marginRight: 4 }} />
              Request integration
            </Button>
          </div>
        ) : (
          <>
            {catQuery === "" && popular.length > 0 && (
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted-foreground)", marginBottom: 10 }}>All</div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {filtered.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelected(item)}
                  style={{
                    padding: "14px", border: "1px solid var(--border)", borderRadius: 10,
                    background: "var(--surface-raised)", cursor: "pointer", textAlign: "left",
                    display: "flex", flexDirection: "column", gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <HighlightIcon size="md" variant="neutral" icon={<IntIcon icon={item.icon} />} />
                    {connected.has(item.id) && (
                      <Icons.CheckCircle size={13} style={{ color: "var(--badge-success)" }} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{item.name}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>{item.category}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.4 }}>{item.description}</div>
                  <div style={{
                    marginTop: 4, fontSize: 11, fontWeight: 600, padding: "4px 0",
                    color: connected.has(item.id) ? "var(--badge-success)" : "var(--primary)",
                  }}>
                    {connected.has(item.id) ? "Connected" : "Connect →"}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Catalog detail SlideOut */}
      <SlideOut
        type="full-slot"
        open={selected !== null && !showRequest}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ""}
        subtitle={selected?.category ?? ""}
      >
        {selected && (
          <CatalogDetailPanel
            item={selected}
            connected={connected.has(selected.id)}
            onConnect={() => setConnected(prev => new Set([...prev, selected.id]))}
          />
        )}
      </SlideOut>

      {/* Request integration SlideOut */}
      <SlideOut
        type="full-slot"
        open={showRequest}
        onClose={() => setShowRequest(false)}
        title="Request integration"
        subtitle="Tell us what you need"
      >
        <RequestPanel onClose={() => setShowRequest(false)} />
      </SlideOut>
    </div>
  )
}

// ─── Integration detail page ──────────────────────────────────────────────────

function IntegrationDetailPage({ integration }: {
  integration: Integration
}) {
  const [activeTab, setActiveTab] = useState("overview")
  const [usageFilter, setUsageFilter] = useState("all")
  const [usageQuery,  setUsageQuery]  = useState("")

  const statusMeta = STATUS_META[integration.status]
  const IC = Icons[integration.icon as keyof typeof Icons] as React.ElementType
  const consumers = integration.usageConsumers ?? []
  const usageCounts = {
    workflow: consumers.filter(c => c.type === "workflow").length,
    agent:    consumers.filter(c => c.type === "agent").length,
    network:  consumers.filter(c => c.type === "network").length,
    widget:   consumers.filter(c => c.type === "widget").length,
  }
  const filteredConsumers = consumers.filter(c => {
    const matchesFilter = usageFilter === "all" || c.type === usageFilter
    const matchesQuery  = c.name.toLowerCase().includes(usageQuery.toLowerCase()) ||
                          c.owner.toLowerCase().includes(usageQuery.toLowerCase())
    return matchesFilter && matchesQuery
  })
  const studioUsage = integration.studioUsage ?? {}

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>

      {/* ── Identity + status info row ──────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ width: 36, height: 36, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
          {IC ? <IC size={18} /> : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {integration.isOfficial && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 100, background: "var(--primary)15", color: "var(--primary)", border: "1px solid var(--primary)30" }}>Official</span>
          )}
          <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 100, background: "var(--surface-raised)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>{integration.category}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 100, background: `${statusMeta.color}15`, color: statusMeta.color, border: `1px solid ${statusMeta.color}30` }}>
            {statusMeta.icon} {statusMeta.label}
          </span>
          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Last sync: {integration.lastSync}</span>
          {integration.connectedMonthsAgo != null && (
            <>
              <span style={{ fontSize: 11, fontWeight: 600, padding: "1px 8px", borderRadius: 100, background: "var(--surface-raised)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>{integration.authType}</span>
              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Connected {integration.connectedMonthsAgo} months ago · by {integration.connectedBy}</span>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: 20 }}>
        <Tabs
          items={[
            { id: "overview",     label: "Overview" },
            { id: "capabilities", label: "Capabilities" },
            { id: "instances",    label: "Instances" },
            { id: "usage",        label: "Usage" },
            { id: "activity",     label: "Activity" },
          ]}
          activeId={activeTab}
          onChange={setActiveTab}
          size="s"
        />
      </div>

      {/* ── Schema drift banner ─────────────────────────────────────────────── */}
      {integration.schemaDrift && (
        <div style={{
          marginBottom: 20, padding: "10px 14px", borderRadius: 8,
          background: "var(--badge-alert)12", border: "1px solid var(--badge-alert)30",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <Icons.AlertTriangle size={16} style={{ color: "var(--badge-alert)", flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 13, color: "var(--foreground)" }}>
            <strong>Schema drift detected</strong> for {integration.name}.{" "}
            <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 4, background: "var(--badge-alert)20", color: "var(--badge-alert)", border: "1px solid var(--badge-alert)40" }}>USE WITH CAUTION</span>
            <span style={{ color: "var(--muted-foreground)", marginLeft: 8 }}>One or more field definitions changed since last verified. Downstream workflows may behave unexpectedly.</span>
          </div>
          <button style={{ fontSize: 12, fontWeight: 700, color: "var(--badge-alert)", background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>Review changes →</button>
        </div>
      )}

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
      <div>

        {/* Overview */}
        {activeTab === "overview" && (
          <div style={{ display: "flex", gap: 24 }}>
            {/* Left: Studio usage */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", marginBottom: 14 }}>Used in Studios</div>
              {([
                { key: "governance", label: "Governance Studio", sub: "Policy enforcement & compliance", iconName: "Shield",  bgColor: "var(--badge-alert)15",   iconColor: "var(--badge-alert)" },
                { key: "agentic",    label: "Agentic Studio",    sub: "AI agents & automation",         iconName: "Bot",    bgColor: "var(--primary)15",       iconColor: "var(--primary)" },
                { key: "workforce",  label: "Workforce Studio",  sub: "Human + AI collaboration",       iconName: "Users",  bgColor: "var(--badge-success)15", iconColor: "var(--badge-success)" },
              ] as const).map(({ key, label, sub, iconName, bgColor, iconColor }) => {
                const studio = studioUsage[key]
                const enabled = studio?.enabled ?? false
                const ICi = Icons[iconName as keyof typeof Icons] as React.ElementType
                return (
                  <div key={key} style={{ borderRadius: 10, border: "1px solid var(--border)", overflow: "hidden", marginBottom: 12, background: "var(--surface)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: enabled ? "1px solid var(--border)" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 7, background: bgColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {ICi && <ICi size={15} style={{ color: iconColor }} />}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{label}</div>
                          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{sub}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: enabled ? "var(--badge-success)15" : "var(--surface-raised)", color: enabled ? "var(--badge-success)" : "var(--muted-foreground)", border: `1px solid ${enabled ? "var(--badge-success)30" : "var(--border)"}` }}>
                        {enabled ? "Enabled" : "Not enabled"}
                      </span>
                    </div>
                    {enabled && studio && (
                      <div style={{ padding: "10px 16px", display: "flex", gap: 24, fontSize: 12, color: "var(--muted-foreground)" }}>
                        {"callsPerDay" in studio && studio.callsPerDay != null && <span><strong style={{ color: "var(--foreground)" }}>{studio.callsPerDay}</strong> calls/day</span>}
                        {"agents"     in studio && studio.agents     != null && <span><strong style={{ color: "var(--foreground)" }}>{studio.agents}</strong> agents</span>}
                        {"channels"   in studio && studio.channels   != null && <span><strong style={{ color: "var(--foreground)" }}>{studio.channels}</strong> channels</span>}
                        {"routes"     in studio && studio.routes     != null && <span><strong style={{ color: "var(--foreground)" }}>{studio.routes}</strong> routes</span>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Right: About sidebar */}
            <div style={{ width: 280, flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", marginBottom: 12 }}>About this integration</div>
              <div style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 16 }}>{integration.description}</div>

              {(integration.capabilitiesV2?.tools?.length ?? 0) > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: 8 }}>What you can do with it</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                    {integration.capabilitiesV2!.tools!.slice(0, 4).map(t => (
                      <span key={t.name} style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 100, background: "var(--surface-raised)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>{t.name}</span>
                    ))}
                  </div>
                </>
              )}

              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: 10 }}>Integration details</div>
              {([
                ["Maintainer",     integration.maintainer    ?? "—"],
                ["Version",        integration.version ? `v${integration.version}` : "—"],
                ["Website",        integration.website],
                ["Data residency", integration.dataResidency ?? "—"],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: 12, padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ width: 110, flexShrink: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", paddingTop: 1 }}>{k}</span>
                  <span style={{ fontSize: 12, color: "var(--foreground)" }}>{v}</span>
                </div>
              ))}
              {(integration.compliance?.length ?? 0) > 0 && (
                <div style={{ display: "flex", gap: 12, padding: "7px 0" }}>
                  <span style={{ width: 110, flexShrink: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", paddingTop: 1 }}>Compliance</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {integration.compliance!.map(c => (
                      <span key={c} style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: "var(--badge-success)12", color: "var(--badge-success)", border: "1px solid var(--badge-success)25" }}>{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Capabilities */}
        {activeTab === "capabilities" && (
          <div>
            <div style={{ marginBottom: 20, padding: "10px 14px", borderRadius: 8, background: "var(--surface-raised)", border: "1px solid var(--border)", fontSize: 13, color: "var(--muted-foreground)", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <Icons.Info size={15} style={{ color: "var(--primary)", flexShrink: 0, marginTop: 1 }} />
              This is a catalog view. Capabilities are configured per instance when you connect this integration.
            </div>
            {(integration.capabilitiesV2?.tools?.length ?? 0) > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>Tools</div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 100, background: "var(--primary)12", color: "var(--primary)", border: "1px solid var(--primary)25" }}>Available to configure per instance</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {integration.capabilitiesV2!.tools!.map(cap => (
                    <div key={cap.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)" }}>
                      <HighlightIcon size="sm" variant="informative" iconName="Zap" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{cap.name}</div>
                        {cap.desc && <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{cap.desc}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(integration.capabilitiesV2?.dataSync?.length ?? 0) > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>Data sync</div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 100, background: "var(--primary)12", color: "var(--primary)", border: "1px solid var(--primary)25" }}>Available to configure per instance</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {integration.capabilitiesV2!.dataSync!.map(cap => (
                    <div key={cap.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)" }}>
                      <HighlightIcon size="sm" variant="success" iconName="Database" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{cap.name}</div>
                        {cap.desc && <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{cap.desc}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!integration.capabilitiesV2 && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted-foreground)" }}>
                <Icons.Puzzle size={28} style={{ marginBottom: 12, opacity: 0.3 }} />
                <div style={{ fontSize: 14, fontWeight: 600 }}>No capabilities defined</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>Capabilities will appear here once the integration catalog is updated.</div>
              </div>
            )}
          </div>
        )}

        {/* Instances */}
        {activeTab === "instances" && (
          <div>
            {(!integration.instances || integration.instances.length === 0) ? (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--surface-raised)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "var(--muted-foreground)" }}>
                  {IC ? <IC size={24} /> : <Icons.Plug size={24} />}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>No instances of {integration.name} yet</div>
                <div style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 360, margin: "0 auto 24px", lineHeight: 1.6 }}>
                  Instances allow you to connect multiple accounts of the same integration with different credentials and data scopes.
                </div>
                <Button variant="primary" size="sm">
                  <Icons.Plus size={14} style={{ marginRight: 4 }} /> Connect {integration.name}
                </Button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {integration.instances.map(inst => (
                  <div key={inst.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{inst.name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>Connected {inst.connectedAt}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "var(--badge-success)15", color: "var(--badge-success)", border: "1px solid var(--badge-success)30" }}>{inst.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Usage */}
        {activeTab === "usage" && (
          <div>
            {/* KPI cards */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              {([
                { label: "Workflows", count: usageCounts.workflow, iconName: "GitBranch", type: "workflow" },
                { label: "Agents",    count: usageCounts.agent,    iconName: "Bot",       type: "agent"    },
                { label: "Networks",  count: usageCounts.network,  iconName: "Network",   type: "network"  },
                { label: "Widgets",   count: usageCounts.widget,   iconName: "LayoutGrid",type: "widget"   },
              ] as const).map(({ label, count, iconName, type }) => {
                const ICk = Icons[iconName as keyof typeof Icons] as React.ElementType
                const active = usageFilter === type
                return (
                  <div key={type} onClick={() => setUsageFilter(active ? "all" : type)} style={{ flex: 1, padding: "14px 16px", borderRadius: 10, border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`, background: active ? "var(--primary)08" : "var(--surface)", cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      {ICk && <ICk size={14} style={{ color: active ? "var(--primary)" : "var(--muted-foreground)" }} />}
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: active ? "var(--primary)" : "var(--muted-foreground)" }}>{label}</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--foreground)", fontVariantNumeric: "tabular-nums" }}>{count}</div>
                  </div>
                )
              })}
            </div>

            {/* Search + filter */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: "1 1 200px", minWidth: 200 }}>
                <Icons.Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", pointerEvents: "none" }} />
                <input value={usageQuery} onChange={e => setUsageQuery(e.target.value)} placeholder="Search by name or owner…"
                  style={{ width: "100%", paddingLeft: 30, paddingRight: 12, paddingTop: 7, paddingBottom: 7, fontSize: 13, border: "1px solid var(--border)", borderRadius: 7, background: "var(--surface)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" }} />
              </div>
              {([
                { id: "all",      label: `All (${consumers.length})` },
                { id: "workflow", label: `Workflows (${usageCounts.workflow})` },
                { id: "agent",    label: `Agents (${usageCounts.agent})` },
                { id: "network",  label: `Networks (${usageCounts.network})` },
                { id: "widget",   label: `Widgets (${usageCounts.widget})` },
              ] as const).map(f => (
                <button key={f.id} onClick={() => setUsageFilter(f.id)}
                  style={{ fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 20, cursor: "pointer", border: "1px solid", whiteSpace: "nowrap", background: usageFilter === f.id ? "var(--primary)" : "transparent", color: usageFilter === f.id ? "var(--primary-foreground)" : "var(--muted-foreground)", borderColor: usageFilter === f.id ? "var(--primary)" : "var(--border)" }}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Consumer list */}
            {filteredConsumers.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted-foreground)", fontSize: 13 }}>No consumers match this filter.</div>
            ) : (
              <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                {filteredConsumers.map((c, i) => {
                  const typeIconMap: Record<string, string> = { workflow: "GitBranch", agent: "Bot", network: "Network", widget: "LayoutGrid" }
                  const ICt = Icons[typeIconMap[c.type] as keyof typeof Icons] as React.ElementType
                  return (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 16px", background: i % 2 === 0 ? "transparent" : "var(--surface-raised)", borderBottom: i < filteredConsumers.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--surface-raised)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--muted-foreground)" }}>
                        {ICt && <ICt size={13} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 1 }}>{c.owner}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        {c.runsPerWeek  != null && <div style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>{c.runsPerWeek} runs/wk</div>}
                        {c.activeUsers  != null && <div style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>{c.activeUsers} active users</div>}
                        <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 1 }}>Last active {c.lastActivity}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Activity */}
        {activeTab === "activity" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>Provider activity</div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Last 30 days · lifecycle events only</div>
            </div>
            {(!integration.activityLog || integration.activityLog.length === 0) ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted-foreground)", fontSize: 13 }}>No activity events recorded yet.</div>
            ) : (
              <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 160px 160px", background: "var(--surface-raised)", borderBottom: "1px solid var(--border)" }}>
                  {["TIMESTAMP", "EVENT", "TARGET", "ACTOR"].map(col => (
                    <div key={col} style={{ padding: "8px 14px", fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "var(--muted-foreground)" }}>{col}</div>
                  ))}
                </div>
                {integration.activityLog.map((ev, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "160px 1fr 160px 160px", borderBottom: i < integration.activityLog!.length - 1 ? "1px solid var(--border)" : "none", alignItems: "center" }}>
                    <div style={{ padding: "10px 14px", fontSize: 12, color: "var(--muted-foreground)", fontVariantNumeric: "tabular-nums" as const }}>{ev.ts}</div>
                    <div style={{ padding: "10px 14px" }}>
                      {ev.badge
                        ? <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "var(--primary)12", color: "var(--primary)", border: "1px solid var(--primary)25" }}>{ev.badge}</span>
                        : <span style={{ fontSize: 13, color: "var(--foreground)" }}>{ev.event}</span>
                      }
                    </div>
                    <div style={{ padding: "10px 14px", fontSize: 12, color: "var(--foreground)" }}>{ev.target}</div>
                    <div style={{ padding: "10px 14px", fontSize: 12, color: "var(--muted-foreground)" }}>{ev.actor}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function AdminIntegrationsScreen({ onNavigate }: { onNavigate?: (id: string) => void } = {}) {
  const [tab, setTab]         = useState("connected")
  const [connectedList, setConnectedList] = useState<Integration[]>(INITIAL_CONNECTED)
  const [detailView, setDetailView] = useState<Integration | null>(null)
  const [query, setQuery]     = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | IntegrationStatus>("all")
  const [openSlot, setOpenSlot] = useState<string | null>(null)
  const [page, setPage]       = useState(1)
  const [pageSize, setPageSize] = useState(5)

  function handleAction(id: string, action: ActionType) {
    if (action === "disconnect") {
      setConnectedList(prev => prev.filter(i => i.id !== id))
      return
    }
    setConnectedList(prev => prev.map(i => {
      if (i.id !== id) return i
      if (action === "reauth") return { ...i, status: "active" as IntegrationStatus, errorMsg: undefined }
      if (action === "pause")  return { ...i, status: "paused" as IntegrationStatus }
      if (action === "resume") return { ...i, status: "active" as IntegrationStatus }
      return i
    }))
    setDetailView(prev => {
      if (!prev || prev.id !== id) return prev
      if (action === "reauth") return { ...prev, status: "active" as IntegrationStatus, errorMsg: undefined }
      if (action === "pause")  return { ...prev, status: "paused" as IntegrationStatus }
      if (action === "resume") return { ...prev, status: "active" as IntegrationStatus }
      return prev
    })
  }

  const filteredByStatus = connectedList.filter(c => statusFilter === "all" || c.status === statusFilter)
  const filtered = filteredByStatus.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  )


  const connectedIds = new Set(connectedList.map(c => c.id))

  const INT_ICON_VARIANT: Record<IntegrationStatus, EntityListItemData["iconVariant"]> = {
    active:  "success",
    error:   "error",
    paused:  "neutral",
    pending: "yellow",
  }
  const INT_STATE_VARIANT: Record<IntegrationStatus, "success" | "error" | "neutral" | "alert"> = {
    active:  "success",
    error:   "error",
    paused:  "neutral",
    pending: "alert",
  }
  const INT_STATE_LABEL: Record<IntegrationStatus, string> = {
    active:  "Active",
    error:   "Error",
    paused:  "Paused",
    pending: "Pending",
  }

  function integrationToItem(int: Integration): EntityListItemData {
    return {
      id: int.id,
      title: int.name,
      iconVariant: INT_ICON_VARIANT[int.status],
      iconName: int.icon,
      state: { label: INT_STATE_LABEL[int.status], variant: INT_STATE_VARIANT[int.status] },
      description: `${int.category} · ${int.authType}`,
      primaryMeta: [
        { iconName: "User", label: int.connectedBy },
        { iconName: "RefreshCw", label: int.lastSync ? `Synced ${int.lastSync}` : "Never synced" },
      ],
      actions: int.status === "error" ? [
        { label: "Re-authenticate", variant: "primary", icon: "RefreshCw", onClick: () => handleAction(int.id, "reauth") },
      ] : undefined,
      onClick: () => setDetailView(int),
    }
  }

  const pagedIntegrations = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <ScreenLayout
      workspaceName="Avance Financial"
      userName="Thomas Gonzalez"
      userEmail="thomas.gonzalez@aimsos.ai"
      sidebarItems={SIDEBAR}
      activeSidebarId="integrations"
      onSidebarItemClick={onNavigate}
      header={(isScrolled) => detailView ? (
        <Header
          size={isScrolled ? "compress" : "size-m"}
          title={detailView.name}
          description="Integrations"
          backButton
          showBackInCompress
          onBack={() => setDetailView(null)}
          secondaryAction={{ label: "Ask AI", icon: Icons.Sparkles }}
          primaryAction={detailView.status === "error"
            ? { label: "Re-authenticate", icon: Icons.RefreshCw, onClick: () => handleAction(detailView.id, "reauth") }
            : { label: "Rotate credentials", icon: Icons.KeyRound, priority: "secondary" }}
          // Behind the "···" because it is destructive. An overflow menu is the
          // one place a Disconnect is not a stray click away.
          overflowActions={[
            { label: "Disconnect", icon: Icons.Unplug,
              onClick: () => { handleAction(detailView.id, "disconnect"); setDetailView(null) } },
          ]}
        />
      ) : tab === "catalog" ? (
        <Header
          size={isScrolled ? "compress" : "size-m"}
          title="Integration catalog"
          description={`${CATALOG.length} integrations available to connect`}
          backButton
          showBackInCompress
          onBack={() => setTab("connected")}
        />
      ) : (
        <Header
          size={isScrolled ? "compress" : "size-l"}
          title="Integrations"
          description={`${connectedList.length} connected · ${CATALOG.length} available in catalog`}
          primaryAction={{ label: "Browse catalog", icon: Icons.LayoutGrid, onClick: () => setTab("catalog") }}
        />
      )}
      pagination={
        !detailView && tab === "connected" && filtered.length > Math.min(5, pageSize)
          ? <Pagination
              currentPage={page}
              totalItems={filtered.length}
              itemsPerPage={pageSize}
              onPageChange={setPage}
              onItemsPerPageChange={n => { setPageSize(n); setPage(1) }}
              rowsPerPageOptions={[5, 10, 25]}
            />
          : undefined
      }
    >
      {/* Detail page */}
      {detailView && (
        <IntegrationDetailPage integration={detailView} />
      )}

      {!detailView && tab === "connected" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ position: "relative" }}>
            <Filters
              showSearch
              searchPlaceholder="Search connected integrations…"
              searchValue={query}
              onSearchChange={q => { setQuery(q); setPage(1) }}
              slots={[
                {
                  placeholder: "Status",
                  value: statusFilter !== "all" ? INT_STATE_LABEL[statusFilter as IntegrationStatus] : undefined,
                  onOpen:   () => setOpenSlot(s => s === "status" ? null : "status"),
                  onRemove: () => { setStatusFilter("all"); setPage(1) },
                },
              ]}
              showClearFilters={statusFilter !== "all"}
              onClearFilters={() => { setStatusFilter("all"); setPage(1) }}
              showAllFilters={false}
              showSort={false}
              showViewToggle={false}
            />
            {openSlot === "status" && (
              <div
                style={{
                  position: "absolute", top: 44, left: 210, zIndex: 200,
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 10, overflow: "hidden", minWidth: 160,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.18)", // audit-ignore
                }}
              >
                {(["all", "active", "error", "paused", "pending"] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => { setStatusFilter(v); setPage(1); setOpenSlot(null) }}
                    style={{
                      display: "block", width: "100%", padding: "9px 14px", textAlign: "left",
                      fontSize: 13, border: "none", cursor: "pointer",
                      color: statusFilter === v ? "var(--primary)" : "var(--foreground)",
                      background: statusFilter === v ? "var(--accent)" : "var(--surface)",
                    }}
                  >
                    {v === "all" ? "All statuses" : INT_STATE_LABEL[v]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: "48px 0", textAlign: "center", color: "var(--muted-foreground)" }}>
              <Icons.Plug size={22} style={{ marginBottom: 8, opacity: 0.3 }} />
              <div style={{ fontSize: 13 }}>
                {statusFilter !== "all" ? `No ${statusFilter} integrations` : "No integrations found"}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pagedIntegrations.map(int => (
                <div
                  key={int.id}
                  style={int.status === "error" ? {
                    borderLeft: "3px solid var(--badge-error)",
                    borderRadius: 8,
                    overflow: "hidden",
                  } : undefined}
                >
                  <CardContainer size="sm" className="!p-0 overflow-hidden">
                    <EntityList items={[integrationToItem(int)]} />
                  </CardContainer>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!detailView && tab === "catalog" && (
        <CatalogView connectedIds={connectedIds} />
      )}
    </ScreenLayout>
  )
}
