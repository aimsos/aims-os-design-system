import { useState, useMemo } from "react"
import { Check } from "lucide-react"
import { ScreenLayout }     from "@/components/layouts/screen-layout"
import { ListViewSection }  from "@/components/layouts/list-view-section"
import { WidgetCanvasView } from "@/components/layouts/widget-canvas-view"
import type { CanvasSlot }  from "@/components/layouts/widget-canvas-view"
import type { SidebarItem } from "@/components/ui/sidebar"
import { Header }           from "@/components/ui/header"
import { Tabs }             from "@/components/ui/tabs"
import { SwitchTab }        from "@/components/ui/switch-tab"
import { Button }           from "@/components/ui/button"
import { Tag }              from "@/components/ui/tag"
import { Input }            from "@/components/ui/input"
import { Pagination }       from "@/components/ui/pagination"
import { SlideOut }         from "@/components/ui/slide-out"
import { Table }            from "@/components/ui/table"
import type { TableColumn } from "@/components/ui/table"
import { HighlightIcon }    from "@/components/ui/highlight-icon"
import { Filters }         from "@/components/ui/filters"
import { FiltersSlideout } from "@/components/ui/filters-slideout"
import type { EntityListItemData, ELMetaItem } from "@/components/ui/entity-list"
import { anchorFromEvent, useDropdownPosition, type DropdownAnchor } from "@/lib/dropdown-anchor"

// ── Types ────────────────────────────────────────────────────────────────────

type HtlSeverity  = "now" | "red" | "yellow" | "green"
type HtlEventType = "approve" | "review" | "respond" | "resolve" | "acknowledge" | "train" | "message"
type HtlStudio    = "gov" | "data" | "agentic" | "cross"

type HtlEvent = {
  id:              string
  severity:        HtlSeverity
  type:            HtlEventType
  studio:          HtlStudio
  title:           string
  detail:          string
  owner:           string
  dueLabel:        string
  quickActions:    string[]
  blastRadius:     { workflows: number; agents: number }
  sourceWorkflow?: string
  missionCritical?: boolean
  commentCount?:   number
}

type TransferRow = {
  id:          string
  from:        string
  to:          string
  mode:        "OOO Auto" | "Manager-Initiated" | "System Escalation"
  events:      number
  blastRadius: string
  initiator:   string
  timestamp:   string
}

type AuditLogRow = {
  id:        string
  timestamp: string
  actor:     string
  action:    string
  studio:    string
  artifact:  string
  risk:      "Low" | "Medium" | "High" | "Critical"
  outcome:   string
  hash:      string
  prevHash:  string | null
}

// ── Sidebar ──────────────────────────────────────────────────────────────────

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "work-queue",        label: "Work Queue",        icon: "LayoutList"        },
  { id: "pack-library",      label: "Pack Library",      icon: "Library"           },
  { id: "node-binding",      label: "Node Binding",      icon: "GitBranch"         },
  { id: "sla",               label: "SLA",               icon: "Clock"             },
  { id: "routing-log",       label: "Routing Log",       icon: "Route"             },
  { id: "signals",           label: "Signals",           icon: "Activity"          },
  { id: "train-me",          label: "Train Me",          icon: "GraduationCap"     },
  { id: "audit",             label: "Audit",             icon: "ShieldCheck"       },
  { id: "conditions",        label: "Conditions",        icon: "SlidersHorizontal" },
  { id: "teams-queues",      label: "Teams & Queues",    icon: "Users"             },
  { id: "destinations",      label: "Destinations",      icon: "MapPin"            },
  { id: "sensitive-signals", label: "Sensitive Signals", icon: "AlertOctagon"      },
]

// ── Events data (22 events) ──────────────────────────────────────────────────

const EVENTS: HtlEvent[] = [
  // ── Act Now (4) ─────────────────────────────────────────────────────────────
  {
    id: "EVT-001", severity: "now", type: "approve", studio: "gov",
    title: "DIAN Intake: Financial Policy PDF requires approval",
    detail: "7 claims extracted, 2 knowledge conflicts detected. Will block FinancePolicyBot until resolved.",
    owner: "Alexa M.", dueLabel: "Due now",
    quickActions: ["Approve Intake", "View Claims", "Reject"],
    blastRadius: { workflows: 14, agents: 3 },
    sourceWorkflow: "DIAN-intake-wealth-mgmt",
  },
  {
    id: "EVT-002", severity: "now", type: "approve", studio: "agentic",
    title: "HITL Pause: SalesForecastPA about to send external email",
    detail: "Agent paused before GE-COMM action. Confidence 0.71 — below threshold. External recipient: partner@gefinancial.com.",
    owner: "Casey V.", dueLabel: "Paused",
    quickActions: ["Allow Send", "Block Send", "Edit Draft"],
    blastRadius: { workflows: 3, agents: 1 },
    sourceWorkflow: "SalesForecastPA-v2",
    missionCritical: true,
  },
  {
    id: "EVT-003", severity: "now", type: "approve", studio: "data",
    title: "Watch-folder ingest: 3 docs queued in /diane-intake/wealth-mgmt",
    detail: "Documents staged and validated. Awaiting human approval before DIAN parsing begins.",
    owner: "Priya K.", dueLabel: "Queued 14m ago",
    quickActions: ["Approve Ingest", "Preview Docs", "Reject"],
    blastRadius: { workflows: 8, agents: 2 },
  },
  {
    id: "EVT-004", severity: "now", type: "approve", studio: "gov",
    title: "Break Glass: Temp PII partition access request",
    detail: "Emergency PII access for incident response. Requires 2 approvers. 1 of 2 approvals received.",
    owner: "Alexa M.", dueLabel: "Awaiting 2nd approval",
    quickActions: ["Approve Access", "Deny Access"],
    blastRadius: { workflows: 1, agents: 0 },
    missionCritical: true,
  },
  // ── Critical (4) ────────────────────────────────────────────────────────────
  {
    id: "EVT-005", severity: "red", type: "respond", studio: "gov",
    title: "Salesforce connector OAuth expires in 4 days",
    detail: "Token expiration will break DIAN intake pipeline and 57 downstream workflows. Renew before Jul 19.",
    owner: "Jordan T.", dueLabel: "Jul 19",
    quickActions: ["Renew OAuth", "View Connector"],
    blastRadius: { workflows: 57, agents: 8 },
    sourceWorkflow: "DIAN-intake-core",
  },
  {
    id: "EVT-006", severity: "red", type: "review", studio: "gov",
    title: "Review requested: Interest rate sensitivity threshold — need your call",
    detail: "Marcus H. flagged this claim as a conflict outside his sign-off authority and is asking you to make the call before the DIAN proposal can be attested.",
    owner: "Alexa M.", dueLabel: "Jul 17",
    quickActions: ["Approve", "Reject", "Edit Threshold"],
    blastRadius: { workflows: 14, agents: 3 },
  },
  {
    id: "EVT-007", severity: "red", type: "resolve", studio: "cross",
    title: "Cross-studio chain: Salesforce → DIAN → QuoteBot version mismatch",
    detail: "Schema mismatch between Salesforce v47 output and DIAN parser expecting v45. QuoteBot stalled across 22 workflows.",
    owner: "Morgan C.", dueLabel: "Blocking",
    quickActions: ["View Mismatch", "Apply Schema Patch", "Rollback"],
    blastRadius: { workflows: 22, agents: 5 },
    sourceWorkflow: "cross-studio-pipeline-v3",
  },
  {
    id: "EVT-017", severity: "red", type: "approve", studio: "data",
    title: "PII pipeline hold: SSNs detected in CRM ingest batch",
    detail: "Automated scan flagged 14 SSN patterns in the latest HubSpot CRM batch. Pipeline halted pending human review.",
    owner: "Priya K.", dueLabel: "Blocking",
    quickActions: ["Review Batch", "Approve with Mask", "Reject Ingest"],
    blastRadius: { workflows: 12, agents: 4 },
    sourceWorkflow: "CRM-ingest-pipeline",
    missionCritical: true,
  },
  // ── Action / yellow (10) ────────────────────────────────────────────────────
  {
    id: "EVT-008", severity: "yellow", type: "respond", studio: "agentic",
    title: "WorkflowSpec retiring: SalesForecastPA Truth version",
    detail: "The WorkflowSpec version 2.3 used by SalesForecastPA will be deprecated in 7 days. Agent will lose its truth anchor. Review and pin new version.",
    owner: "Taylor B.", dueLabel: "Jul 22",
    quickActions: ["Pin New Version", "View Changelog", "Dismiss"],
    blastRadius: { workflows: 2, agents: 1 },
    sourceWorkflow: "SalesForecastPA-v2",
  },
  {
    id: "EVT-009", severity: "yellow", type: "review", studio: "gov",
    title: "Knowledge Contract expiring: ComplianceBot GE-FIN",
    detail: "The Knowledge Contract binding ComplianceBot to GE-FIN partition expires in 14 days. Renew or the agent loses access to financial compliance context.",
    owner: "Marcus H.", dueLabel: "Jul 29",
    quickActions: ["Renew Contract", "Review Terms", "Archive"],
    blastRadius: { workflows: 5, agents: 2 },
  },
  {
    id: "EVT-010", severity: "yellow", type: "respond", studio: "gov",
    title: "Sandbox claim RC-4412 has been stuck for 11 days",
    detail: "Claim RC-4412 in the sandbox environment has not progressed. May indicate a blocked upstream dependency or misconfigured routing rule.",
    owner: "Jordan T.", dueLabel: "Jul 26",
    quickActions: ["Investigate", "Force Route", "Archive Claim"],
    blastRadius: { workflows: 3, agents: 0 },
  },
  {
    id: "EVT-011", severity: "yellow", type: "train", studio: "gov",
    title: "Train Me: Regional multiplier correction",
    detail: "FinancePolicyBot applied a regional multiplier that contradicts Q2 governance guidelines. Your decision will correct and train this classification pattern.",
    owner: "Alexa M.", dueLabel: "Jul 25",
    quickActions: ["Approve Classification", "Reject & Retrain", "Escalate"],
    blastRadius: { workflows: 0, agents: 1 },
  },
  {
    id: "EVT-012", severity: "yellow", type: "resolve", studio: "gov",
    title: "Truth conflict: GE-COMP threshold disagreement",
    detail: "Two knowledge nodes (GE-COMP v4 and GE-COMP v5) assert conflicting values for the compliance threshold. Resolve before next attestation cycle.",
    owner: "Marcus H.", dueLabel: "Jul 28",
    quickActions: ["Resolve Conflict", "Pin v4", "Pin v5"],
    blastRadius: { workflows: 8, agents: 2 },
  },
  {
    id: "EVT-018", severity: "yellow", type: "resolve", studio: "data",
    title: "Entity resolution conflict: Northfield Capital duplicate records",
    detail: "3 duplicate entity records for Northfield Capital detected in the CRM ingestion batch. Automated resolver requires human confirmation before merging.",
    owner: "Sam R.", dueLabel: "Jul 24",
    quickActions: ["Merge Records", "Keep Separate", "Flag for Review"],
    blastRadius: { workflows: 4, agents: 1 },
  },
  {
    id: "EVT-019", severity: "yellow", type: "message", studio: "gov",
    title: "Jordan T. is asking for your input on the GE-FIN conflict",
    detail: "Jordan T. left a comment asking you to weigh in on the interest rate sensitivity conflict. They need your governance sign-off before they can close the loop with the finance team.",
    owner: "Jordan T.", dueLabel: "Today",
    quickActions: ["Reply", "View Thread"],
    blastRadius: { workflows: 0, agents: 0 },
    commentCount: 2,
  },
  {
    id: "EVT-020", severity: "yellow", type: "message", studio: "agentic",
    title: "Morgan C. needs your attestation on SalesForecastPA workflow change",
    detail: "A workflow change was made to SalesForecastPA to lower the confidence routing threshold. Morgan C. needs your attestation to finalize the change in production.",
    owner: "Morgan C.", dueLabel: "Today",
    quickActions: ["Attest", "Request Changes"],
    blastRadius: { workflows: 2, agents: 0 },
    commentCount: 1,
  },
  {
    id: "EVT-021", severity: "yellow", type: "acknowledge", studio: "agentic",
    title: "Lead Qualification pipeline: HTL handoff completed",
    detail: "The Lead Qualification agent has completed its first HTL handoff successfully. Review the handoff summary and confirm readiness for the next cycle.",
    owner: "Taylor B.", dueLabel: "Jul 23",
    quickActions: ["Acknowledge", "View Summary"],
    blastRadius: { workflows: 7, agents: 3 },
    sourceWorkflow: "LeadQualPA-v1",
  },
  {
    id: "EVT-022", severity: "yellow", type: "message", studio: "gov",
    title: "Q2 governance posture update broadcast received",
    detail: "A broadcast message from the Governance Studio summarizes Q2 posture changes. Read and acknowledge to confirm receipt for compliance records.",
    owner: "Alexa M.", dueLabel: "Today",
    quickActions: ["Acknowledge", "View Full Broadcast"],
    blastRadius: { workflows: 0, agents: 0 },
    commentCount: 5,
  },
  // ── Heads-up / green (4) ────────────────────────────────────────────────────
  {
    id: "EVT-013", severity: "green", type: "respond", studio: "data",
    title: "Embedding index refresh due for CRM partition",
    detail: "Monthly embedding refresh for the CRM Ingestion partition is due. Scheduling now will prevent drift in semantic search results.",
    owner: "Luis R.", dueLabel: "Jul 30",
    quickActions: ["Schedule Refresh", "Skip This Cycle"],
    blastRadius: { workflows: 1, agents: 0 },
  },
  {
    id: "EVT-014", severity: "green", type: "acknowledge", studio: "gov",
    title: "GE-FIN budget utilization at 62% — FYI",
    detail: "The GE-FIN partition has consumed 62% of its Q2 token budget. No action required. On track to close under 85% threshold.",
    owner: "Alexa M.", dueLabel: "FYI",
    quickActions: ["Acknowledge", "View Budget"],
    blastRadius: { workflows: 0, agents: 0 },
  },
  {
    id: "EVT-015", severity: "green", type: "review", studio: "gov",
    title: "Quarterly access recertification cycle opens July 15",
    detail: "The Q3 access recertification cycle opens today. 12 users require recertification before August 1. You can start the process early.",
    owner: "Riley P.", dueLabel: "Aug 1",
    quickActions: ["Start Recertification", "View Users"],
    blastRadius: { workflows: 0, agents: 0 },
  },
  {
    id: "EVT-016", severity: "green", type: "acknowledge", studio: "agentic",
    title: "AdvisorCopilot engagement report available",
    detail: "The Q2 AdvisorCopilot engagement report is ready. Highlights: 847 interactions, 91% satisfaction, 23% improvement in time-to-close.",
    owner: "Taylor B.", dueLabel: "FYI",
    quickActions: ["Acknowledge", "Download Report"],
    blastRadius: { workflows: 0, agents: 0 },
  },
]

// ── Transfers data ────────────────────────────────────────────────────────────

const TRANSFERS: TransferRow[] = [
  {
    id: "TRF-001", from: "Jordan T.", to: "Lex Paniagua",
    mode: "OOO Auto", events: 4, blastRadius: "8 workflows",
    initiator: "System", timestamp: "Jul 14, 2:15 PM",
  },
  {
    id: "TRF-002", from: "Devon N.", to: "Priya K.",
    mode: "Manager-Initiated", events: 2, blastRadius: "3 workflows",
    initiator: "Lex Paniagua", timestamp: "Jul 12, 10:30 AM",
  },
  {
    id: "TRF-003", from: "Sam R.", to: "Marcus H.",
    mode: "System Escalation", events: 1, blastRadius: "22 workflows",
    initiator: "System", timestamp: "Jul 10, 8:45 AM",
  },
]

// ── Audit log data ────────────────────────────────────────────────────────────

const AUDIT_LOG: AuditLogRow[] = [
  { id: "AUD-015", timestamp: "Jul 15, 9:42 AM",  actor: "Lex Paniagua",  action: "Approved Intake",          studio: "Governance", artifact: "DIAN-intake-wealth-mgmt/financial-policy.pdf",  risk: "Medium",   outcome: "Approved",    hash: "9f4c...e21a", prevHash: "3b8d...f95c" },
  { id: "AUD-014", timestamp: "Jul 15, 9:18 AM",  actor: "Lex Paniagua",  action: "Reviewed Claim",            studio: "Governance", artifact: "GE-FIN/interest-rate-sensitivity.claim",         risk: "High",     outcome: "Approved",    hash: "3b8d...f95c", prevHash: "a72e...1d4f" },
  { id: "AUD-013", timestamp: "Jul 14, 4:55 PM",  actor: "System",        action: "OOO Transfer",              studio: "Governance", artifact: "EVT-005, EVT-006, EVT-009, EVT-010",             risk: "Medium",   outcome: "Transferred", hash: "a72e...1d4f", prevHash: "c51b...9a3e" },
  { id: "AUD-012", timestamp: "Jul 14, 2:15 PM",  actor: "Lex Paniagua",  action: "Acknowledged Alert",        studio: "Agentic",    artifact: "AdvisorCopilot-engagement-Q2.report",            risk: "Low",      outcome: "Acknowledged",hash: "c51b...9a3e", prevHash: "7e9a...4c2b" },
  { id: "AUD-011", timestamp: "Jul 13, 11:30 AM", actor: "Priya K.",       action: "Approved Ingest",           studio: "Data",       artifact: "/diane-intake/wealth-mgmt/batch-07.zip",         risk: "Low",      outcome: "Approved",    hash: "7e9a...4c2b", prevHash: "d83f...0b7c" },
  { id: "AUD-010", timestamp: "Jul 13, 9:00 AM",  actor: "Lex Paniagua",  action: "Blocked External Send",     studio: "Agentic",    artifact: "SalesForecastPA-v2/external-email-draft",        risk: "High",     outcome: "Blocked",     hash: "d83f...0b7c", prevHash: "2c4a...e68d" },
  { id: "AUD-009", timestamp: "Jul 12, 3:45 PM",  actor: "Marcus H.",     action: "Rejected Claim",            studio: "Governance", artifact: "GE-COMP/threshold-conflict.claim",               risk: "Medium",   outcome: "Rejected",    hash: "2c4a...e68d", prevHash: "f17b...3c9a" },
  { id: "AUD-008", timestamp: "Jul 12, 10:30 AM", actor: "Lex Paniagua",  action: "Manager Transfer",          studio: "Data",       artifact: "EVT-009, EVT-010",                               risk: "Low",      outcome: "Transferred", hash: "f17b...3c9a", prevHash: "8e2d...7f4b" },
  { id: "AUD-007", timestamp: "Jul 11, 2:00 PM",  actor: "Casey V.",      action: "Adjusted Routing Threshold",studio: "Agentic",    artifact: "GE-COMM/routing-config-v12",                     risk: "Medium",   outcome: "Updated",     hash: "8e2d...7f4b", prevHash: "b09c...5e1f" },
  { id: "AUD-006", timestamp: "Jul 11, 11:15 AM", actor: "System",        action: "OAuth Token Renewed",       studio: "Governance", artifact: "salesforce-connector/oauth-token",               risk: "Critical", outcome: "Renewed",     hash: "b09c...5e1f", prevHash: "6a3e...c8d2" },
  { id: "AUD-005", timestamp: "Jul 10, 8:45 AM",  actor: "System",        action: "System Escalation",         studio: "Governance", artifact: "EVT-007",                                        risk: "High",     outcome: "Escalated",   hash: "6a3e...c8d2", prevHash: "e4f1...9b7c" },
  { id: "AUD-004", timestamp: "Jul 9, 4:30 PM",   actor: "Jordan T.",     action: "Resolved Conflict",         studio: "Governance", artifact: "GE-FIN/budget-utilization.claim",                risk: "Low",      outcome: "Resolved",    hash: "e4f1...9b7c", prevHash: "1d8a...4e2f" },
  { id: "AUD-003", timestamp: "Jul 8, 1:00 PM",   actor: "Taylor B.",     action: "Training Decision",         studio: "Agentic",    artifact: "SalesForecastPA-v2/intent-classification",       risk: "Low",      outcome: "Trained",     hash: "1d8a...4e2f", prevHash: "c92b...7a3e" },
  { id: "AUD-002", timestamp: "Jul 7, 10:00 AM",  actor: "Sam R.",        action: "Schema Review",             studio: "Data",       artifact: "hubspot-connector/schema-v7",                    risk: "Medium",   outcome: "Auto-fixed",  hash: "c92b...7a3e", prevHash: "5f7d...e91c" },
  { id: "AUD-001", timestamp: "Jul 6, 9:00 AM",   actor: "System",        action: "Break Glass Access Granted",studio: "Governance", artifact: "PII-partition/break-glass-access",               risk: "Critical", outcome: "Granted",     hash: "5f7d...e91c", prevHash: null },
]

// ── Mappings ──────────────────────────────────────────────────────────────────

const SEVERITY_LABEL: Record<HtlSeverity, string> = {
  now:    "Act Now",
  red:    "Critical",
  yellow: "Action",
  green:  "Heads-up",
}

const SEVERITY_TAG_VARIANT: Record<HtlSeverity, "error" | "alert" | "success"> = {
  now:    "error",
  red:    "error",
  yellow: "alert",
  green:  "success",
}

const STUDIO_TAG_VARIANT: Record<HtlStudio, "purple" | "lightBlue" | "success" | "neutral"> = {
  gov:     "purple",
  data:    "lightBlue",
  agentic: "success",
  cross:   "neutral",
}

const TYPE_TAG_VARIANT: Record<HtlEventType, "informative" | "purple" | "lightBlue" | "alert" | "success" | "error" | "neutral"> = {
  approve:     "informative",
  review:      "purple",
  respond:     "lightBlue",
  resolve:     "alert",
  acknowledge: "success",
  train:       "error",
  message:     "neutral",
}

const STUDIO_LABEL: Record<HtlStudio, string> = {
  gov:     "Governance",
  data:    "Data",
  agentic: "Agentic",
  cross:   "Cross-Studio",
}

const TYPE_LABEL: Record<HtlEventType, string> = {
  approve:     "Approve",
  review:      "Review",
  respond:     "Respond",
  resolve:     "Resolve",
  acknowledge: "Acknowledge",
  train:       "Train Me",
  message:     "Message",
}

const TYPE_ACTION_LABEL: Record<HtlEventType, string> = {
  approve:     "Approve",
  review:      "Start Review",
  respond:     "Respond",
  resolve:     "Resolve",
  acknowledge: "Acknowledge",
  train:       "Decide",
  message:     "Reply",
}

// EntityList icon variant — maps severity to highlight-icon color
const SEV_EL_VARIANT: Record<HtlSeverity, EntityListItemData["iconVariant"]> = {
  now:    "error",
  red:    "error",
  yellow: "yellow",
  green:  "success",
}

// EntityList state variant — maps severity to Tag variant
const SEV_STATE_VARIANT: Record<HtlSeverity, "error" | "alert" | "success" | "informative"> = {
  now:    "error",
  red:    "error",
  yellow: "alert",
  green:  "success",
}

// Type icon names (Lucide)
const TYPE_ICON: Record<HtlEventType, string> = {
  approve:     "ShieldCheck",
  review:      "FileSearch",
  respond:     "Reply",
  resolve:     "Wrench",
  acknowledge: "Bell",
  train:       "GraduationCap",
  message:     "MessageSquare",
}

// ── EntityList item factory ───────────────────────────────────────────────────

function toEventItem(
  evt:       HtlEvent,
  onPreview: (id: string) => void,
  onSkip:    (id: string) => void,
): EntityListItemData {
  const blastMeta: ELMetaItem[] = []
  if (evt.blastRadius.workflows > 0)
    blastMeta.push({ iconName: "GitBranch", label: `${evt.blastRadius.workflows} workflows affected` })
  if (evt.blastRadius.agents > 0)
    blastMeta.push({ iconName: "Bot",        label: `${evt.blastRadius.agents} agents blocked` })
  if (evt.sourceWorkflow)
    blastMeta.push({ iconName: "Workflow",   label: evt.sourceWorkflow })
  if (evt.commentCount)
    blastMeta.push({ iconName: "MessageSquare", label: `${evt.commentCount} comments` })

  const primaryMeta: ELMetaItem[] = [
    { tag: STUDIO_LABEL[evt.studio] },
    { tag: TYPE_LABEL[evt.type]     },
    { iconName: "User", label: evt.owner },
  ]
  if (evt.missionCritical) primaryMeta.push({ tag: "Mission Critical" })

  const hasBlast = evt.blastRadius.workflows > 0 || evt.blastRadius.agents > 0

  return {
    id:          evt.id,
    title:       evt.title,
    iconVariant: SEV_EL_VARIANT[evt.severity],
    iconName:    TYPE_ICON[evt.type],
    primaryMeta,
    state:     { label: SEVERITY_LABEL[evt.severity], variant: SEV_STATE_VARIANT[evt.severity] },
    timestamp: evt.dueLabel,
    description:  evt.detail,
    descMaxChars: 120,
    // Use aiInsight slot to surface blast-radius impact — contextually valid in an AI-native system
    aiInsight: hasBlast ? {
      action: "Impact",
      detail: [
        ...(evt.blastRadius.workflows > 0 ? [`${evt.blastRadius.workflows} workflows blocked`] : []),
        ...(evt.blastRadius.agents > 0    ? [`${evt.blastRadius.agents} agents paused`]        : []),
      ].join(" · "),
      showLabel: true,
    } : undefined,
    secondaryMeta: blastMeta.length > 0 ? blastMeta : undefined,
    showMenu: false,
    onClick:  () => onPreview(evt.id),
    actions: [
      { label: TYPE_ACTION_LABEL[evt.type], variant: "primary",   onClick: () => onPreview(evt.id) },
      { label: "Skip",                       variant: "secondary", onClick: () => onSkip(evt.id)    },
      { label: "",   icon: "Eye",            variant: "tertiary",  onClick: () => onPreview(evt.id) },
    ],
  }
}

// ── Studio health ─────────────────────────────────────────────────────────────

const STUDIO_HEALTH = [
  { label: "Governance", score: 78, trend: -2, color: "var(--primary)"                     },
  { label: "Data",       score: 87, trend: +3, color: "var(--color-border-success-default)" },
  { label: "Agentic",    score: 92, trend: +4, color: "var(--tag-success-fg)"               },
]

// ── Severity border color helper ──────────────────────────────────────────────

function sevBorderColor(sev: HtlSeverity): string {
  if (sev === "now" || sev === "red") return "var(--tag-error-fg)"
  if (sev === "yellow") return "var(--tag-alert-fg)"
  return "var(--tag-success-fg)"
}

// ── Trace steps helper ────────────────────────────────────────────────────────

type TraceStep = { label: string; status: "done" | "active" | "pending" | "failed" }

function getTraceSteps(evt: HtlEvent): TraceStep[] {
  if (!evt.sourceWorkflow) return []
  const currentLabel =
    evt.type === "approve"  ? "Approval Gate" :
    evt.type === "review"   ? "Human Review"  :
    evt.type === "respond"  ? "Response Required" :
    evt.type === "resolve"  ? "Conflict Resolution" :
    evt.type === "train"    ? "Training Decision" :
    evt.type === "message"  ? "Message Response" :
    "Acknowledgement"
  return [
    { label: "Trigger",              status: "done"    },
    { label: "Routing & Assignment", status: "done"    },
    { label: currentLabel,           status: "active"  },
    { label: "Processing",           status: "pending" },
    { label: "Notify & Close",       status: "pending" },
  ]
}

// ── Event SlideOut content ────────────────────────────────────────────────────

function EventSlideOutContent({ event }: { event: HtlEvent | null }) {
  const [resolvedAction, setResolvedAction] = useState<string | null>(null)
  const [comment, setComment] = useState("")
  const [commentPosted, setCommentPosted] = useState(false)

  if (!event) return null

  const traceSteps = getTraceSteps(event)
  const hasBlast = event.blastRadius.workflows > 0 || event.blastRadius.agents > 0

  const stepIcon = (s: TraceStep["status"]) =>
    s === "done"    ? "✓" :
    s === "active"  ? "⏸" :
    s === "failed"  ? "✗" :
    "·"

  const stepColor = (s: TraceStep["status"]) =>
    s === "done"    ? "var(--color-border-success-default)" :
    s === "active"  ? "var(--tag-alert-fg)"                 :
    s === "failed"  ? "var(--color-text-error)"             :
    "var(--color-text-subtitle)"

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Severity color strip */}
      <div style={{
        height: 4,
        background: sevBorderColor(event.severity),
        marginBottom: 0,
      }} />

      <div style={{ padding: "16px 0 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Badges */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          <Tag variant={SEVERITY_TAG_VARIANT[event.severity]} size="sm">{SEVERITY_LABEL[event.severity]}</Tag>
          <Tag variant={STUDIO_TAG_VARIANT[event.studio]} size="sm">{STUDIO_LABEL[event.studio]}</Tag>
          <Tag variant={TYPE_TAG_VARIANT[event.type]} size="sm">{TYPE_LABEL[event.type]}</Tag>
          {event.missionCritical && <Tag variant="error" size="sm">Mission Critical</Tag>}
        </div>

        {/* Title + due */}
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-title)", lineHeight: "1.4", marginBottom: 4 }}>
            {event.title}
          </div>
          <span style={{ fontSize: 11, color: "var(--color-text-subtitle)" }}>
            Due: {event.dueLabel}
          </span>
        </div>

        {/* Description */}
        <p style={{ fontSize: 13, color: "var(--foreground)", lineHeight: "1.6", margin: 0 }}>
          {event.detail}
        </p>

        {/* Blast radius */}
        {hasBlast && (
          <div style={{
            padding: "12px 14px", borderRadius: 8,
            background: "var(--color-surface-error-subtle)",
            border: "0.5px solid var(--color-text-error)",
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.07em", color: "var(--color-text-error)",
              display: "block", marginBottom: 10,
            }}>
              Blast Radius
            </span>
            <div style={{ display: "flex", gap: 28 }}>
              {event.blastRadius.workflows > 0 && (
                <div>
                  <span style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text-title)" }}>
                    {event.blastRadius.workflows}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--color-text-subtitle)", display: "block" }}>
                    workflows affected
                  </span>
                </div>
              )}
              {event.blastRadius.agents > 0 && (
                <div>
                  <span style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text-title)" }}>
                    {event.blastRadius.agents}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--color-text-subtitle)", display: "block" }}>
                    agents blocked
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Workflow trace */}
        {traceSteps.length > 0 && (
          <div>
            <span style={{
              fontSize: 10, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.07em", color: "var(--field-label)",
              display: "block", marginBottom: 10,
            }}>
              Workflow Trace — {event.sourceWorkflow}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {traceSteps.map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: step.status === "active" ? "var(--tag-alert-bg)" : "var(--field-bg)",
                    border: `1.5px solid ${stepColor(step.status)}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700,
                    color: stepColor(step.status),
                    flexShrink: 0,
                  }}>
                    {stepIcon(step.status)}
                  </span>
                  <span style={{
                    fontSize: 12,
                    color: step.status === "pending" ? "var(--color-text-subtitle)" : "var(--color-text-title)",
                    fontWeight: step.status === "active" ? 600 : 400,
                  }}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata rows */}
        <div style={{ borderTop: "0.5px solid var(--field-border)" }}>
          {[
            { label: "Owner",    value: event.owner    },
            { label: "Event ID", value: event.id       },
            { label: "Studio",   value: STUDIO_LABEL[event.studio] },
          ].map(row => (
            <div key={row.label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0", borderBottom: "0.5px solid var(--field-border)",
            }}>
              <span style={{
                fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.07em", color: "var(--field-label)",
              }}>
                {row.label}
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground)" }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        {resolvedAction ? (
          <div style={{
            padding: "12px 14px", borderRadius: 8, textAlign: "center",
            background: "var(--color-surface-success-subtle)",
            border: "0.5px solid var(--color-border-success-default)",
          }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-border-success-default)" }}>
              ✓ {resolvedAction}
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.07em", color: "var(--field-label)",
            }}>
              Quick Actions
            </span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {event.quickActions.map((action, i) => (
                <Button
                  key={action}
                  variant={i === 0 ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setResolvedAction(action)}
                >
                  {action}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Comment composer */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.07em", color: "var(--field-label)",
          }}>
            Comment{(event.commentCount ?? 0) > 0 ? ` · ${event.commentCount} in thread` : ""}
          </span>
          {commentPosted ? (
            <div style={{
              padding: "10px 12px", borderRadius: 8, fontSize: 12,
              background: "var(--color-surface-success-subtle)",
              color: "var(--color-border-success-default)",
            }}>
              ✓ Comment posted
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <Input
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  size="sm"
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { if (comment.trim()) setCommentPosted(true) }}
              >
                Post
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── My Day widget content ─────────────────────────────────────────────────────

function MyDayContent({
  events,
  onOpen,
  onSkip,
  skippedIds,
}: {
  events:     HtlEvent[]
  onOpen:     (id: string) => void
  onSkip:     (id: string) => void
  skippedIds: Set<string>
}) {
  const startHere = events.find(e => e.severity === "now" && !skippedIds.has(e.id))
    ?? events.find(e => e.severity === "red" && !skippedIds.has(e.id))

  const nowCount    = events.filter(e => e.severity === "now").length
  const redCount    = events.filter(e => e.severity === "red").length
  const urgentCount = nowCount + redCount
  const studios     = [...new Set(events.map(e => STUDIO_LABEL[e.studio]))]
  const focusMin    = urgentCount * 8 + events.filter(e => e.severity === "yellow").length * 4

  return (
    <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{
          fontSize: 10, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.08em", color: "var(--field-label)",
        }}>
          Your Day — Assembled for You
        </span>
        <span style={{ fontSize: 11, color: "var(--color-text-subtitle)" }}>
          Est. focus time · ~{focusMin} min
        </span>
      </div>

      {/* Start Here card */}
      {startHere ? (
        <div style={{
          padding: "12px 14px",
          borderRadius: 8,
          background: "var(--color-surface-error-subtle)",
          border: `1px solid ${sevBorderColor(startHere.severity)}`,
          borderLeft: `3px solid ${sevBorderColor(startHere.severity)}`,
        }}>
          <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
            <Tag variant={SEVERITY_TAG_VARIANT[startHere.severity]} size="sm">
              {SEVERITY_LABEL[startHere.severity]}
            </Tag>
            <Tag variant={STUDIO_TAG_VARIANT[startHere.studio]} size="sm">
              {STUDIO_LABEL[startHere.studio]}
            </Tag>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-title)", marginBottom: 4, lineHeight: "1.4" }}>
            {startHere.title}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-subtitle)", marginBottom: 12, lineHeight: "1.5" }}>
            {startHere.detail.substring(0, 100)}…
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="primary" size="sm" onClick={() => onOpen(startHere.id)}>
              Start with this
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onSkip(startHere.id)}>
              Skip for now
            </Button>
          </div>
        </div>
      ) : (
        <div style={{
          padding: "14px", borderRadius: 8, textAlign: "center",
          background: "var(--color-surface-success-subtle)",
          border: "0.5px solid var(--color-border-success-default)",
        }}>
          <span style={{ fontSize: 13, color: "var(--color-border-success-default)" }}>
            ✓ All urgent items cleared
          </span>
        </div>
      )}

      {/* Info chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <div style={{
          padding: "5px 10px", borderRadius: 99,
          background: "var(--field-bg)", border: "0.5px solid var(--field-border)",
          fontSize: 11, color: "var(--foreground)",
        }}>
          Studios: {studios.join(", ")}
        </div>
        <div style={{
          padding: "5px 10px", borderRadius: 99,
          background: "var(--field-bg)", border: "0.5px solid var(--field-border)",
          fontSize: 11, color: "var(--foreground)",
        }}>
          {urgentCount} urgent · {events.filter(e => e.severity === "yellow").length} action needed
        </div>
      </div>
    </div>
  )
}

// ── Studio Health widget ──────────────────────────────────────────────────────

function StudioHealthContent() {
  return (
    <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
      {STUDIO_HEALTH.map(s => (
        <div key={s.label}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-title)" }}>{s.label}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{
                fontSize: 11,
                color: s.trend >= 0 ? "var(--color-border-success-default)" : "var(--color-text-error)",
              }}>
                {s.trend >= 0 ? "↑" : "↓"}{Math.abs(s.trend)} pts
              </span>
              <span style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text-title)" }}>
                {s.score}
              </span>
            </div>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: "var(--field-bg)", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${s.score}%`, borderRadius: 99,
              background: s.color, transition: "width 0.4s ease",
            }} />
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-subtitle)", marginTop: 4 }}>
            Path to 100%: {100 - s.score} pts remaining
          </div>
        </div>
      ))}
    </div>
  )
}

// ── KPI content ───────────────────────────────────────────────────────────────

type KpiContentProps = {
  value:       number
  feedback:    string
  iconName:    string
  iconVariant: "informative" | "success" | "neutral" | "alert" | "error"
}

function KpiContent({ value, feedback, iconName, iconVariant }: KpiContentProps) {
  return (
    <div style={{ padding: "4px 16px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: "var(--color-text-title)" }}>
          {value}
        </span>
        <HighlightIcon size="lg" variant={iconVariant} iconName={iconName} />
      </div>
      <span style={{ fontSize: 12, color: "var(--color-text-subtitle)", marginTop: 6, display: "block" }}>
        {feedback}
      </span>
    </div>
  )
}

// ── DS-GAP: ExpandableAuditTable ──────────────────────────────────────────────
// Audit Ledger table with hash-chain expandable rows.
// Closest DS component: Table. Standard Table doesn't support expandable rows.

type ExpandableAuditTableProps = {
  rows:        AuditLogRow[]
  expandedIds: Set<string>
  onToggle:    (id: string) => void
}

const RISK_VARIANT: Record<AuditLogRow["risk"], "success" | "alert" | "error" | "neutral"> = {
  Low:      "success",
  Medium:   "alert",
  High:     "error",
  Critical: "error",
}

function ExpandableAuditTable({ rows, expandedIds, onToggle }: ExpandableAuditTableProps) {
  const colStyle = (w: string): React.CSSProperties => ({
    fontSize: 11, fontWeight: 600, textTransform: "uppercase",
    letterSpacing: "0.06em", color: "var(--color-text-subtitle)",
    padding: "8px 12px", width: w, flexShrink: 0,
  })

  return (
    <div style={{ border: "0.5px solid var(--field-border)", borderRadius: 8, overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        display: "flex", background: "var(--widget-bg)",
        borderBottom: "0.5px solid var(--field-border)",
      }}>
        <span style={colStyle("120px")}>ID</span>
        <span style={colStyle("140px")}>Timestamp</span>
        <span style={colStyle("120px")}>Actor</span>
        <span style={colStyle("160px")}>Action</span>
        <span style={colStyle("100px")}>Studio</span>
        <span style={colStyle("80px")}>Risk</span>
        <span style={colStyle("100px")}>Outcome</span>
        <span style={{ ...colStyle("80px"), marginLeft: "auto" }}>Hash</span>
      </div>

      {/* Rows */}
      {rows.map(row => (
        <div key={row.id} style={{ borderBottom: "0.5px solid var(--field-border)" }}>
          {/* Main row */}
          <div
            style={{
              display: "flex", alignItems: "center",
              cursor: "pointer", background: expandedIds.has(row.id) ? "var(--field-bg)" : "transparent",
            }}
            onClick={() => onToggle(row.id)}
          >
            <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--color-text-subtitle)", padding: "10px 12px", width: 120, flexShrink: 0 }}>
              {row.id}
            </span>
            <span style={{ fontSize: 12, color: "var(--foreground)", padding: "10px 12px", width: 140, flexShrink: 0 }}>
              {row.timestamp}
            </span>
            <span style={{ fontSize: 12, color: "var(--color-text-title)", fontWeight: 500, padding: "10px 12px", width: 120, flexShrink: 0 }}>
              {row.actor}
            </span>
            <span style={{ fontSize: 12, color: "var(--foreground)", padding: "10px 12px", width: 160, flexShrink: 0 }}>
              {row.action}
            </span>
            <span style={{ fontSize: 12, color: "var(--color-text-subtitle)", padding: "10px 12px", width: 100, flexShrink: 0 }}>
              {row.studio}
            </span>
            <span style={{ padding: "10px 12px", width: 80, flexShrink: 0 }}>
              <Tag variant={RISK_VARIANT[row.risk]} size="sm">{row.risk}</Tag>
            </span>
            <span style={{ fontSize: 12, color: "var(--foreground)", padding: "10px 12px", width: 100, flexShrink: 0 }}>
              {row.outcome}
            </span>
            <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--primary)", padding: "10px 12px", marginLeft: "auto" }}>
              {row.hash} {expandedIds.has(row.id) ? "▲" : "▼"}
            </span>
          </div>

          {/* Expanded detail */}
          {expandedIds.has(row.id) && (
            <div style={{
              padding: "12px 16px 14px 32px",
              background: "var(--field-bg)",
              borderTop: "0.5px solid var(--field-border)",
              display: "flex", flexDirection: "column", gap: 6,
            }}>
              <div style={{ fontSize: 12, color: "var(--foreground)" }}>
                <span style={{ fontWeight: 600, color: "var(--color-text-subtitle)", marginRight: 8 }}>Artifact:</span>
                <span style={{ fontFamily: "monospace" }}>{row.artifact}</span>
              </div>
              <div style={{ display: "flex", gap: 24 }}>
                <div style={{ fontSize: 11 }}>
                  <span style={{ fontWeight: 600, color: "var(--color-text-subtitle)", marginRight: 6 }}>Hash:</span>
                  <span style={{ fontFamily: "monospace", color: "var(--primary)" }}>{row.hash}</span>
                </div>
                <div style={{ fontSize: 11 }}>
                  <span style={{ fontWeight: 600, color: "var(--color-text-subtitle)", marginRight: 6 }}>Prev:</span>
                  <span style={{ fontFamily: "monospace", color: "var(--color-text-subtitle)" }}>
                    {row.prevHash ?? "— genesis entry"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Transfer table columns ────────────────────────────────────────────────────

const TRANSFER_COLS: TableColumn<TransferRow>[] = [
  {
    key: "id",
    header: "ID",
    render: r => (
      <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--color-text-subtitle)" }}>
        {r.id}
      </span>
    ),
  },
  { key: "from",   header: "From"   },
  { key: "to",     header: "To"     },
  {
    key: "mode",
    header: "Mode",
    render: r => (
      <Tag
        variant={r.mode === "OOO Auto" ? "neutral" : r.mode === "Manager-Initiated" ? "informative" : "alert"}
        size="sm"
      >
        {r.mode}
      </Tag>
    ),
  },
  {
    key: "events",
    header: "Events",
    render: r => <span style={{ fontWeight: 600 }}>{r.events}</span>,
  },
  { key: "blastRadius", header: "Blast Radius" },
  { key: "initiator",   header: "Initiator"    },
  {
    key: "timestamp",
    header: "Timestamp",
    align: "right",
    render: r => (
      <span style={{ fontSize: 12, color: "var(--color-text-subtitle)" }}>{r.timestamp}</span>
    ),
  },
]

// ── Main screen ───────────────────────────────────────────────────────────────

export default function PMLexHTLWorkQueueScreen() {
  const [mainTab,    setMainTab]    = useState<"overview" | "queues" | "activity">("overview")
  const [actSubTab,  setActSubTab]  = useState<"transfers" | "audit">("transfers")

  // Work Queues filters
  const [severityChip, setSeverityChip] = useState<"all" | HtlSeverity>("all")
  const [viewMode,     setViewMode]     = useState("mywork")
  const [filterStudio, setFilterStudio] = useState<string | null>(null)
  const [filterType,   setFilterType]   = useState<string | null>(null)
  const [openSlot,     setOpenSlot]     = useState<string | null>(null)
  const [wqFiltersOpen,    setWqFiltersOpen]    = useState(false)
  const [wqFiltersApplied, setWqFiltersApplied] = useState(false)
  const [headerOpenSlot,   setHeaderOpenSlot]   = useState<string | null>(null)
  const [headerAnchor,     setHeaderAnchor]     = useState<DropdownAnchor | null>(null)
  const headerDropdown = useDropdownPosition(headerAnchor)

  // Pagination
  const [page,     setPage]     = useState(1)
  const pageSize = 8

  // Activity pagination
  const [actPage,     setActPage]     = useState(1)
  const [actPageSize, setActPageSize] = useState(10)

  // Audit Ledger filters
  const [auditSearch,       setAuditSearch]       = useState("")
  const [auditDateRange,    setAuditDateRange]    = useState<"24h" | "7d" | "30d" | "all">("all")
  const [auditOpenSlot,   setAuditOpenSlot]   = useState<string | null>(null)
  const [auditDropdownAnchor, setAuditDropdownAnchor] = useState<DropdownAnchor | null>(null)
  const auditDropdown = useDropdownPosition(auditDropdownAnchor)
  const [expandedAudit,  setExpandedAudit]  = useState<Set<string>>(new Set())

  const AUDIT_RANGE_LABEL: Record<"24h" | "7d" | "30d" | "all", string | undefined> = {
    "24h": "Last 24h",
    "7d":  "Last 7 days",
    "30d": "Last 30 days",
    "all":  undefined,
  }

  // Skip state + SlideOut
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedEvent = useMemo(
    () => EVENTS.find(e => e.id === selectedId) ?? null,
    [selectedId],
  )

  const handleSkip = (id: string) => setSkippedIds(prev => new Set([...prev, id]))

  // Work Queues filtered events
  const filteredEvents = useMemo(() => EVENTS.filter(evt => {
    if (severityChip !== "all" && evt.severity !== severityChip) return false
    if (filterStudio && STUDIO_LABEL[evt.studio] !== filterStudio) return false
    if (filterType   && TYPE_LABEL[evt.type]     !== filterType)   return false
    return true
  }), [severityChip, filterStudio, filterType])

  const pagedEvents = useMemo(
    () => filteredEvents.slice((page - 1) * pageSize, page * pageSize),
    [filteredEvents, page],
  )

  // Audit ledger filtered rows
  const filteredAudit = useMemo(() => {
    let rows = AUDIT_LOG
    if (auditSearch.trim()) {
      const q = auditSearch.toLowerCase()
      rows = rows.filter(r =>
        r.actor.toLowerCase().includes(q)  ||
        r.action.toLowerCase().includes(q) ||
        r.artifact.toLowerCase().includes(q)
      )
    }
    if (auditDateRange !== "all") {
      const cutoff = auditDateRange === "24h" ? 1 : auditDateRange === "7d" ? 7 : 30
      rows = rows.slice(0, cutoff === 1 ? 2 : cutoff === 7 ? 7 : 12)
    }
    return rows
  }, [auditSearch, auditDateRange])

  const pagedAudit = useMemo(
    () => filteredAudit.slice((actPage - 1) * actPageSize, actPage * actPageSize),
    [filteredAudit, actPage, actPageSize],
  )

  // KPI counts
  const kpis = useMemo(() => ({
    now:    EVENTS.filter(e => e.severity === "now").length,
    red:    EVENTS.filter(e => e.severity === "red").length,
    yellow: EVENTS.filter(e => e.severity === "yellow").length,
    green:  EVENTS.filter(e => e.severity === "green").length,
  }), [])

  const FILTER_OPTIONS: Record<string, string[]> = {
    Studio: ["Governance", "Data", "Agentic", "Cross-Studio"],
    Type:   ["Approve", "Review", "Respond", "Resolve", "Acknowledge", "Train Me", "Message"],
  }

  const SEV_CHIPS = ["All", "Act Now", "Critical", "Action", "Heads-up"].map(label => ({ label }))
  const activeSevChip =
    severityChip === "all" ? "All" : SEVERITY_LABEL[severityChip]

  return (
    <>
      <ScreenLayout
        workspaceName="AIMS OS"
        userName="Lex Paniagua"
        userEmail="lex@aimsos.ai"
        sidebarItems={SIDEBAR_ITEMS}
        activeSidebarId="work-queue"
        header={(isScrolled) => (
          <Header
            size={isScrolled ? "compress" : "size-l"}
            title="Work Queue"
            description="Human Touch Layer — review and resolve events that require your attention."
            primaryAction={{ label: "Export" }}
            filters={isScrolled && mainTab === "queues" ? (
              <div
                onClickCapture={(e: React.MouseEvent) => {
                  setHeaderAnchor(anchorFromEvent(e))
                }}
              >
                <Filters
                  showSearch={false}
                  slots={[
                    {
                      placeholder: "Studio",
                      value:    filterStudio ?? undefined,
                      onOpen:   () => setHeaderOpenSlot(s => s === "Studio" ? null : "Studio"),
                      onRemove: () => { setFilterStudio(null); setPage(1) },
                    },
                    {
                      placeholder: "Type",
                      value:    filterType ?? undefined,
                      onOpen:   () => setHeaderOpenSlot(s => s === "Type" ? null : "Type"),
                      onRemove: () => { setFilterType(null); setPage(1) },
                    },
                  ]}
                  showAllFilters={true}
                  onAllFiltersClick={() => setWqFiltersOpen(true)}
                  showSort={false}
                  showViewToggle={false}
                  showClearFilters={wqFiltersApplied}
                  onClearFilters={() => { setWqFiltersApplied(false); setFilterStudio(null); setFilterType(null); setPage(1) }}
                />
              </div>
            ) : undefined}
          />
        )}
        pagination={
          mainTab === "queues" && filteredEvents.length > pageSize
            ? (
              <Pagination
                currentPage={page}
                totalItems={filteredEvents.length}
                itemsPerPage={pageSize}
                onPageChange={setPage}
                rowsPerPageOptions={[8, 16, 32]}
              />
            )
            : mainTab === "activity" && actSubTab === "audit" && filteredAudit.length > actPageSize
            ? (
              <Pagination
                currentPage={actPage}
                totalItems={filteredAudit.length}
                itemsPerPage={actPageSize}
                onPageChange={setActPage}
                onItemsPerPageChange={n => { setActPageSize(n); setActPage(1) }}
                rowsPerPageOptions={[10, 25, 50]}
              />
            )
            : undefined
        }
      >
        {/* ── Main tab bar ── */}
        <Tabs
          items={[
            { id: "overview", label: "Overview"    },
            { id: "queues",   label: "Work Queues" },
            { id: "activity", label: "Activity"    },
          ]}
          activeId={mainTab}
          onChange={(id) => {
            setMainTab(id as typeof mainTab)
            setPage(1)
            setActPage(1)
          }}
          className="mb-[24px]"
        />

        {/* ── Overview — widget canvas ── */}
        {mainTab === "overview" && (
          <WidgetCanvasView
            initialSlots={[
              {
                uid: "my-day", title: "Your Day", colSpan: 2,
                content: (
                  <MyDayContent
                    events={EVENTS}
                    onOpen={setSelectedId}
                    onSkip={handleSkip}
                    skippedIds={skippedIds}
                  />
                ),
              },
              {
                uid: "kpi-summary", title: "Event Summary", colSpan: 1,
                content: (
                  <div style={{ padding: "4px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { sev: "now"    as HtlSeverity, count: kpis.now,    label: "Act Now"  },
                      { sev: "red"    as HtlSeverity, count: kpis.red,    label: "Critical" },
                      { sev: "yellow" as HtlSeverity, count: kpis.yellow, label: "Action"   },
                      { sev: "green"  as HtlSeverity, count: kpis.green,  label: "Heads-up" },
                    ].map(item => (
                      <div key={item.sev} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "8px 12px", borderRadius: 8,
                        background: "var(--field-bg)",
                        borderLeft: `3px solid ${sevBorderColor(item.sev)}`,
                      }}>
                        <span style={{ fontSize: 12, color: "var(--color-text-title)", fontWeight: 500 }}>
                          {item.label}
                        </span>
                        <span style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text-title)" }}>
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                uid: "act-now-kpi", title: "Act Now", colSpan: 1,
                content: <KpiContent value={kpis.now}    feedback="Require immediate action" iconName="AlertCircle"   iconVariant="error"   />,
              },
              {
                uid: "critical-kpi", title: "Critical", colSpan: 1,
                content: <KpiContent value={kpis.red}    feedback="High-priority events"     iconName="AlertTriangle" iconVariant="alert"   />,
              },
              {
                uid: "studio-health", title: "Studio Health", colSpan: 1,
                content: <StudioHealthContent />,
              },
              {
                uid: "recent-events", title: "Recent Events", colSpan: 3,
                content: (
                  <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 5, overflowY: "auto", maxHeight: 240 }}>
                    {EVENTS.slice(0, 8).map(evt => (
                      <div key={evt.id} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "7px 10px", borderRadius: 8,
                        background: "var(--widget-bg)", border: "0.5px solid var(--field-border)",
                        cursor: "pointer",
                      }}
                        onClick={() => setSelectedId(evt.id)}
                      >
                        <Tag variant={SEVERITY_TAG_VARIANT[evt.severity]} size="sm">
                          {SEVERITY_LABEL[evt.severity]}
                        </Tag>
                        <Tag variant={STUDIO_TAG_VARIANT[evt.studio]} size="sm">
                          {STUDIO_LABEL[evt.studio]}
                        </Tag>
                        <span style={{
                          fontSize: 12, color: "var(--color-text-title)", flex: 1,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {evt.title}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--color-text-subtitle)", flexShrink: 0 }}>
                          {evt.dueLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                ),
              },
            ] satisfies CanvasSlot[]}
          />
        )}

        {/* ── Work Queues ── */}
        {mainTab === "queues" && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* SwitchTab: secondary view toggle — "How am I viewing?" */}
            <SwitchTab
              items={[
                { id: "mywork", label: "My Work" },
                { id: "myteam", label: "My Team" },
              ]}
              value={viewMode}
              onChange={v => { setViewMode(v); setPage(1) }}
              size="s"
              className="mb-[24px]"
            />

            {/*
              ListViewSection:
              — Filters (Studio, Type) = "What do I see?" dataset control
              — chips (severity) = deeper navigation below the filter bar per DS spec
              — EntityList renders each event as a DS-native item
            */}
            <ListViewSection
              items={pagedEvents.map(evt => toEventItem(evt, setSelectedId, handleSkip))}
              filterSlots={[
                {
                  placeholder: "Studio",
                  value:    filterStudio ?? undefined,
                  onOpen:   () => setOpenSlot(p => p === "Studio" ? null : "Studio"),
                  onRemove: () => { setFilterStudio(null); setPage(1) },
                },
                {
                  placeholder: "Type",
                  value:    filterType ?? undefined,
                  onOpen:   () => setOpenSlot(p => p === "Type" ? null : "Type"),
                  onRemove: () => { setFilterType(null); setPage(1) },
                },
              ]}
              filterOptions={FILTER_OPTIONS}
              onFilterSelect={(slot, value) => {
                if (slot === "Studio") setFilterStudio(value)
                else                  setFilterType(value)
                setPage(1)
                setOpenSlot(null)
              }}
              openSlot={openSlot}
              onOpenSlotChange={setOpenSlot}
              chips={SEV_CHIPS}
              selectedChip={activeSevChip}
              onChipSelect={chip => {
                if (chip === "All") { setSeverityChip("all") }
                else {
                  const sev = (Object.entries(SEVERITY_LABEL) as [HtlSeverity, string][])
                    .find(([, v]) => v === chip)?.[0]
                  setSeverityChip(sev ?? "all")
                }
                setPage(1)
              }}
              showAllFilters={true}
              onAllFiltersClick={() => setWqFiltersOpen(true)}
              showClearFilters={wqFiltersApplied}
              onClearFilters={() => { setWqFiltersApplied(false); setFilterStudio(null); setFilterType(null); setPage(1) }}
              showPreview={false}
              emptyLabel="No events match these filters."
            />
            <FiltersSlideout
              isOpen={wqFiltersOpen}
              onClose={() => setWqFiltersOpen(false)}
              onApply={() => { setWqFiltersApplied(true); setWqFiltersOpen(false) }}
              onClearAll={() => { setWqFiltersApplied(false); setWqFiltersOpen(false) }}
            />
          </div>
        )}

        {/* ── Activity ── */}
        {mainTab === "activity" && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* SwitchTab: secondary view toggle — Level 2 nav per DS spec */}
            <SwitchTab
              items={[
                { id: "transfers", label: "Transfers"    },
                { id: "audit",     label: "Audit Ledger" },
              ]}
              value={actSubTab}
              onChange={(id) => {
                setActSubTab(id as typeof actSubTab)
                setActPage(1)
              }}
              size="s"
              className="mb-[24px]"
            />

            {/* Transfers sub-tab */}
            {actSubTab === "transfers" && (
              <Table
                columns={TRANSFER_COLS}
                data={TRANSFERS}
                size="sm"
                emptyTitle="No transfers"
                emptyDescription="Work queue transfers will appear here."
              />
            )}

            {/* Audit Ledger sub-tab */}
            {actSubTab === "audit" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Filters bar — DS Filters component with search + Time range slot */}
                <div
                  onClickCapture={(e: React.MouseEvent) => {
                    setAuditDropdownAnchor(anchorFromEvent(e))
                  }}
                >
                  <Filters
                    showSearch
                    searchPlaceholder="Search audit log..."
                    searchValue={auditSearch}
                    onSearchChange={v => { setAuditSearch(v); setActPage(1) }}
                    slots={[{
                      placeholder: "Time range",
                      value:       AUDIT_RANGE_LABEL[auditDateRange],
                      onOpen:      () => setAuditOpenSlot("Time range"),
                      onRemove:    () => { setAuditDateRange("all"); setActPage(1); setAuditOpenSlot(null) },
                    }]}
                    showAllFilters={false}
                    showSort={false}
                    showViewToggle={false}
                  />
                </div>

                {/* Filter dropdown overlay — same pattern as ListViewSection */}
                {auditOpenSlot !== null && auditDropdownAnchor !== null && (() => {
                  const AUDIT_OPTIONS = [
                    { v: "24h" as const, l: "Last 24h" },
                    { v: "7d"  as const, l: "Last 7 days" },
                    { v: "30d" as const, l: "Last 30 days" },
                    { v: "all" as const, l: "All time" },
                  ]
                  return (
                    <>
                      <div
                        style={{ position: "fixed", inset: 0, zIndex: 10000 }}
                        onClick={() => setAuditOpenSlot(null)}
                      />
                      <div ref={auditDropdown.ref} style={{
                        position: "fixed",
                        ...auditDropdown.style,
                        zIndex:    10001,
                        background:   "var(--surface)",
                        border:       "0.5px solid var(--field-border)",
                        borderRadius: 8,
                        boxShadow:    "var(--shadow-elevation-3)",
                        minWidth:     160,
                        overflow:     "hidden",
                      }}>
                        <div style={{ padding: "8px 12px 6px", borderBottom: "0.5px solid var(--field-border)" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--field-supporting)" }}>
                            Time range
                          </span>
                        </div>
                        {AUDIT_OPTIONS.map(opt => {
                          const isSel = opt.v === auditDateRange
                          return (
                            <button
                              key={opt.v}
                              onClick={() => { setAuditDateRange(opt.v); setActPage(1); setAuditOpenSlot(null) }}
                              className="flex items-center gap-[8px] px-[12px] py-[10px] text-left w-full transition-colors"
                              style={{
                                background: isSel ? "var(--color-surface-primary-subtle)" : "transparent",
                                color:      isSel ? "var(--primary)"    : "var(--foreground)",
                                fontWeight: isSel ? 600                 : 400,
                                fontSize:   13,
                              }}
                              onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = "var(--color-surface-neutral-default)" }}
                              onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = "transparent" }}
                            >
                              <span className="flex-1">{opt.l}</span>
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )
                })()}

                {/* Expandable table */}
                <ExpandableAuditTable
                  rows={pagedAudit}
                  expandedIds={expandedAudit}
                  onToggle={(id) => {
                    setExpandedAudit(prev => {
                      const next = new Set(prev)
                      if (next.has(id)) next.delete(id)
                      else next.add(id)
                      return next
                    })
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* ── Event detail SlideOut ── */}
        <SlideOut
          open={selectedId !== null}
          onClose={() => setSelectedId(null)}
          title={selectedEvent?.title ?? "Event detail"}
          subtitle={selectedEvent
            ? `${SEVERITY_LABEL[selectedEvent.severity]} · ${STUDIO_LABEL[selectedEvent.studio]}`
            : ""
          }
          type="with-variants"
          size="m"
          showTabs={false}
          showTab3={false}
          showStatus={false}
          showSearchBar={false}
          showChips={false}
        >
          <EventSlideOutContent key={selectedId ?? "none"} event={selectedEvent} />
        </SlideOut>

      </ScreenLayout>

      {/* ── Header sticky filter dropdown — position:fixed, appears above the header zone ── */}
      {headerOpenSlot !== null && headerAnchor !== null && (() => {
        const opts   = FILTER_OPTIONS[headerOpenSlot] ?? []
        const curVal = headerOpenSlot === "Studio" ? (filterStudio ?? undefined) : (filterType ?? undefined)
        return (
          <>
            <div
              className="fixed inset-0"
              style={{ zIndex: 10000 }}
              onClick={() => setHeaderOpenSlot(null)}
            />
            <div
              ref={headerDropdown.ref}
              className="flex flex-col overflow-hidden"
              style={{
                position:     "fixed",
                ...headerDropdown.style,
                zIndex:       10001,
                background:   "var(--surface)",
                border:       "0.5px solid var(--field-border)",
                borderRadius: 8,
                minWidth:     200,
                boxShadow:    "var(--shadow-elevation-3)",
              }}
            >
              <div style={{ padding: "8px 12px 6px", borderBottom: "0.5px solid var(--field-border)" }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--field-supporting)" }}>
                  {headerOpenSlot}
                </span>
              </div>
              {opts.map(opt => {
                const isSel = curVal === opt
                return (
                  <button
                    key={opt}
                    className="flex items-center gap-[8px] px-[12px] py-[10px] text-left w-full transition-colors"
                    style={{
                      background: isSel ? "var(--color-surface-primary-subtle)" : "transparent",
                      color:      isSel ? "var(--primary)" : "var(--foreground)",
                      fontWeight: isSel ? 600 : 400,
                      fontSize:   13,
                      border:     "none",
                      cursor:     "pointer",
                    }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = "var(--color-surface-neutral-default)" }}
                    onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = "transparent" }}
                    onClick={() => {
                      if (headerOpenSlot === "Studio") setFilterStudio(opt)
                      else setFilterType(opt)
                      setPage(1)
                      setHeaderOpenSlot(null)
                    }}
                  >
                    <span className="flex-1">{opt}</span>
                    {isSel && <Check size={13} style={{ flexShrink: 0 }} />}
                  </button>
                )
              })}
            </div>
          </>
        )
      })()}
    </>
  )
}
