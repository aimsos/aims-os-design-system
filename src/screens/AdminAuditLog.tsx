import { useState, useMemo } from "react"
import { ADMIN_SIDEBAR as SIDEBAR } from "./adminShared"
import * as Icons from "lucide-react"
import { ScreenLayout } from "@/components/layouts/screen-layout"
import { Header }       from "@/components/ui/header"
import { Tabs }         from "@/components/ui/tabs"
import { Filters }      from "@/components/ui/filters"
import { SlideOut }     from "@/components/ui/slide-out"

// ─── Sidebar ──────────────────────────────────────────────────────────────────


// ─── Types ────────────────────────────────────────────────────────────────────

type EventCategory = "auth" | "access" | "members" | "content" | "integrations" | "settings" | "agents"
type EventResult   = "success" | "failure" | "warning"
type StudioId      = "governance" | "datastudio" | "agentic" | "admin"

interface AuditActor {
  id: string; name: string; email: string; initials: string; color: string
}

interface AuditResource {
  type: string; id: string; name: string
}

interface AuditEvent {
  id: string
  timestamp: string
  actor: AuditActor
  category: EventCategory
  action: string
  actionLabel: string
  resource?: AuditResource
  target?: { name: string; email?: string }
  studio?: StudioId
  ip: string
  location: string
  userAgent: string
  result: EventResult
  details?: Record<string, string>
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<EventCategory, { label: string; color: string; icon: React.ReactNode }> = {
  auth:         { label: "Authentication", color: "#6366f1", icon: <Icons.LogIn size={12} /> },  // audit-ignore: prototype fixture data
  access:       { label: "Access Control", color: "#8b5cf6", icon: <Icons.ShieldCheck size={12} /> },  // audit-ignore: prototype fixture data
  members:      { label: "Members",        color: "#10b981", icon: <Icons.Users size={12} /> },  // audit-ignore: prototype fixture data
  content:      { label: "Content",        color: "#f97316", icon: <Icons.FileEdit size={12} /> },  // audit-ignore: prototype fixture data
  integrations: { label: "Integrations",   color: "#0ea5e9", icon: <Icons.Plug size={12} /> },  // audit-ignore: prototype fixture data
  settings:     { label: "Settings",       color: "#64748b", icon: <Icons.Settings size={12} /> },  // audit-ignore: prototype fixture data
  agents:       { label: "Agents",         color: "#06b6d4", icon: <Icons.Bot size={12} /> },  // audit-ignore: prototype fixture data
}

const RESULT_META: Record<EventResult, { label: string; color: string }> = {
  success: { label: "Success", color: "var(--badge-success)" },
  failure: { label: "Failed",  color: "var(--badge-error)"   },
  warning: { label: "Warning", color: "var(--badge-alert)"   },
}

const STUDIO_META: Record<StudioId, { label: string; color: string }> = {
  governance: { label: "Governance",  color: "#10b981" },  // audit-ignore: prototype fixture data
  datastudio:  { label: "Data Studio", color: "#8b5cf6" },  // audit-ignore: prototype fixture data
  agentic:    { label: "Agentic",     color: "#06b6d4" },  // audit-ignore: prototype fixture data
  admin:      { label: "Admin",       color: "#6366f1" },  // audit-ignore: prototype fixture data
}

// ─── Actors ───────────────────────────────────────────────────────────────────

const ACTORS: Record<string, AuditActor> = {
  tg: { id: "tg", name: "Thomas Gonzalez",  email: "thomas.gonzalez@aimsos.ai", initials: "TG", color: "#6366f1" },  // audit-ignore: prototype fixture data
  mg: { id: "mg", name: "Maria García",     email: "maria.garcia@avance.com",   initials: "MG", color: "#10b981" },  // audit-ignore: prototype fixture data
  es: { id: "es", name: "Eduardo Suárez",   email: "eduardo.suarez@avance.com", initials: "ES", color: "#f97316" },  // audit-ignore: prototype fixture data
  sb: { id: "sb", name: "Sarah Brown",      email: "sarah.brown@avance.com",    initials: "SB", color: "#ef4444" },  // audit-ignore: prototype fixture data
  dp: { id: "dp", name: "Diana Pérez",      email: "diana.perez@avance.com",    initials: "DP", color: "#6366f1" },  // audit-ignore: prototype fixture data
  jp: { id: "jp", name: "James Park",       email: "james.park@avance.com",     initials: "JP", color: "#10b981" },  // audit-ignore: prototype fixture data
  at: { id: "at", name: "Ana Torres",       email: "ana.torres@avance.com",     initials: "AT", color: "#f97316" },  // audit-ignore: prototype fixture data
  sys: { id: "sys", name: "System",         email: "system@aimsos.ai",          initials: "SY", color: "#64748b" },  // audit-ignore: prototype fixture data
}

// ─── Audit events fixture ─────────────────────────────────────────────────────

const EVENTS: AuditEvent[] = [
  { id: "ae001", timestamp: "2026-08-26T09:10:23Z", actor: ACTORS.tg, category: "auth",    action: "auth.login",         actionLabel: "Signed in",                  ip: "104.28.91.14",  location: "San Francisco, CA", userAgent: "Chrome 125 / macOS 14", result: "success" },
  { id: "ae002", timestamp: "2026-08-26T09:11:05Z", actor: ACTORS.tg, category: "members", action: "member.invite",      actionLabel: "Invited member",             target: { name: "Leo Ramírez", email: "leo.ramirez@avance.com" }, ip: "104.28.91.14", location: "San Francisco, CA", userAgent: "Chrome 125 / macOS 14", result: "success", details: { "Role assigned": "Member", "Groups": "Engineering" } },
  { id: "ae003", timestamp: "2026-08-26T09:12:44Z", actor: ACTORS.tg, category: "access",  action: "permission.grant",   actionLabel: "Granted permission",         target: { name: "Eduardo Suárez" }, resource: { type: "Permission", id: "gov-sb-bundles", name: "governance.sandbox.bundles" }, ip: "104.28.91.14", location: "San Francisco, CA", userAgent: "Chrome 125 / macOS 14", result: "success", studio: "governance" },
  { id: "ae004", timestamp: "2026-08-26T08:45:17Z", actor: ACTORS.mg, category: "auth",    action: "auth.login",         actionLabel: "Signed in",                  ip: "200.18.32.55",  location: "Mexico City, MX",    userAgent: "Edge 124 / Windows 11", result: "success" },
  { id: "ae005", timestamp: "2026-08-26T08:46:38Z", actor: ACTORS.mg, category: "settings",action: "settings.org.update",actionLabel: "Updated organization profile", ip: "200.18.32.55", location: "Mexico City, MX",    userAgent: "Edge 124 / Windows 11", result: "success", details: { "Field": "Support contact email", "Old value": "it@avance.com", "New value": "it-admin@avance.com" } },
  { id: "ae006", timestamp: "2026-08-26T08:48:01Z", actor: ACTORS.mg, category: "members", action: "member.role.change", actionLabel: "Changed member role",        target: { name: "Ana Torres" }, ip: "200.18.32.55", location: "Mexico City, MX", userAgent: "Edge 124 / Windows 11", result: "success", details: { "Previous role": "Member", "New role": "Viewer" } },
  { id: "ae007", timestamp: "2026-08-26T08:50:09Z", actor: ACTORS.sys, category: "auth",   action: "auth.mfa.reminder",  actionLabel: "MFA reminder sent",          target: { name: "Sarah Brown", email: "sarah.brown@avance.com" }, ip: "10.0.0.1", location: "Internal", userAgent: "AIMS-OS System", result: "success" },
  { id: "ae008", timestamp: "2026-08-25T17:30:52Z", actor: ACTORS.es, category: "content", action: "model.draft.create", actionLabel: "Created model draft",        resource: { type: "Model", id: "mdl-001", name: "Transaction Entity v3" }, ip: "189.55.12.88", location: "Monterrey, MX", userAgent: "Firefox 127 / macOS", result: "success", studio: "datastudio" },
  { id: "ae009", timestamp: "2026-08-25T17:35:21Z", actor: ACTORS.es, category: "content", action: "sandbox.bundle.edit", actionLabel: "Edited content bundle",    resource: { type: "Bundle", id: "bnd-042", name: "Q3 Compliance Bundle" }, ip: "189.55.12.88", location: "Monterrey, MX", userAgent: "Firefox 127 / macOS", result: "success", studio: "governance" },
  { id: "ae010", timestamp: "2026-08-25T17:42:14Z", actor: ACTORS.es, category: "agents",  action: "worker.run",         actionLabel: "Triggered AI worker",        resource: { type: "Worker", id: "wkr-009", name: "Transaction Classifier" }, ip: "189.55.12.88", location: "Monterrey, MX", userAgent: "Firefox 127 / macOS", result: "success", studio: "agentic", details: { "Inputs": "12 records", "Duration": "4.2s", "Output tokens": "1,840" } },
  { id: "ae011", timestamp: "2026-08-25T17:58:03Z", actor: ACTORS.es, category: "agents",  action: "worker.run",         actionLabel: "Triggered AI worker",        resource: { type: "Worker", id: "wkr-012", name: "Risk Scoring Pipeline" }, ip: "189.55.12.88", location: "Monterrey, MX", userAgent: "Firefox 127 / macOS", result: "failure", studio: "agentic", details: { "Error": "Model timeout after 30s", "Inputs": "847 records" } },
  { id: "ae012", timestamp: "2026-08-25T14:00:33Z", actor: ACTORS.sb, category: "auth",    action: "auth.login",         actionLabel: "Signed in",                  ip: "72.14.192.30",  location: "New York, NY",       userAgent: "Chrome 125 / macOS 14", result: "success" },
  { id: "ae013", timestamp: "2026-08-25T14:05:44Z", actor: ACTORS.sb, category: "content", action: "sandbox.view",       actionLabel: "Viewed sandbox",             resource: { type: "Sandbox", id: "sb-2026-07", name: "Credit Risk SB-07" }, ip: "72.14.192.30", location: "New York, NY", userAgent: "Chrome 125 / macOS 14", result: "success", studio: "governance" },
  { id: "ae014", timestamp: "2026-08-25T14:12:18Z", actor: ACTORS.sb, category: "content", action: "pack.promote",       actionLabel: "Submitted promotion packet", resource: { type: "Pack", id: "gv-2200", name: "GV-2200: Risk Model Update" }, ip: "72.14.192.30", location: "New York, NY", userAgent: "Chrome 125 / macOS 14", result: "success", studio: "governance", details: { "Destination": "Truth Plane", "Reviewer": "Maria García" } },
  { id: "ae015", timestamp: "2026-08-25T09:22:07Z", actor: ACTORS.tg, category: "integrations", action: "integration.connect", actionLabel: "Connected integration", resource: { type: "Integration", id: "int-salesforce", name: "Salesforce CRM" }, ip: "104.28.91.14", location: "San Francisco, CA", userAgent: "Chrome 125 / macOS 14", result: "success", details: { "Auth type": "OAuth 2.0", "Scopes": "read, write" } },
  { id: "ae016", timestamp: "2026-08-25T09:30:15Z", actor: ACTORS.tg, category: "integrations", action: "integration.credential.rotate", actionLabel: "Rotated credentials", resource: { type: "Integration", id: "int-databricks", name: "Databricks" }, ip: "104.28.91.14", location: "San Francisco, CA", userAgent: "Chrome 125 / macOS 14", result: "success" },
  { id: "ae017", timestamp: "2026-08-25T08:10:44Z", actor: ACTORS.sys, category: "auth",   action: "auth.login.fail",    actionLabel: "Failed sign-in attempt",     target: { name: "diana.perez@avance.com" }, ip: "45.76.200.18", location: "Amsterdam, NL", userAgent: "Python-requests/2.31.0", result: "failure", details: { "Reason": "Invalid credentials", "Consecutive failures": "3" } },
  { id: "ae018", timestamp: "2026-08-25T08:11:02Z", actor: ACTORS.sys, category: "auth",   action: "auth.login.fail",    actionLabel: "Failed sign-in attempt",     target: { name: "diana.perez@avance.com" }, ip: "45.76.200.18", location: "Amsterdam, NL", userAgent: "Python-requests/2.31.0", result: "failure", details: { "Reason": "Invalid credentials", "Consecutive failures": "4" } },
  { id: "ae019", timestamp: "2026-08-25T08:11:19Z", actor: ACTORS.sys, category: "auth",   action: "auth.account.locked", actionLabel: "Account temporarily locked", target: { name: "Diana Pérez", email: "diana.perez@avance.com" }, ip: "45.76.200.18", location: "Amsterdam, NL", userAgent: "Python-requests/2.31.0", result: "warning", details: { "Reason": "5 consecutive failed sign-in attempts", "Locked until": "2026-08-25T09:11:19Z" } },
  { id: "ae020", timestamp: "2026-08-24T16:05:32Z", actor: ACTORS.mg, category: "members", action: "member.suspend",     actionLabel: "Suspended member",           target: { name: "Marcus Silva", email: "marcus.silva@avance.com" }, ip: "200.18.32.55", location: "Mexico City, MX", userAgent: "Edge 124 / Windows 11", result: "success", details: { "Reason": "Policy violation — unauthorized data access", "Duration": "Indefinite" } },
  { id: "ae021", timestamp: "2026-08-24T16:07:14Z", actor: ACTORS.mg, category: "members", action: "member.session.revoke_all", actionLabel: "Revoked all sessions",   target: { name: "Marcus Silva", email: "marcus.silva@avance.com" }, ip: "200.18.32.55", location: "Mexico City, MX", userAgent: "Edge 124 / Windows 11", result: "success" },
  { id: "ae022", timestamp: "2026-08-24T11:20:45Z", actor: ACTORS.dp, category: "agents",  action: "hitl.approve",       actionLabel: "Approved HITL handoff",      resource: { type: "Handoff", id: "htl-0204", name: "Customer Churn Decision #204" }, ip: "200.55.14.22", location: "Mexico City, MX", userAgent: "Chrome 125 / Windows 11", result: "success", studio: "agentic", details: { "Worker": "Churn Predictor v2", "Decision": "Approve — confidence 94%" } },  // audit-ignore: prototype fixture data
  { id: "ae023", timestamp: "2026-08-24T11:35:08Z", actor: ACTORS.dp, category: "agents",  action: "hitl.reject",        actionLabel: "Rejected HITL handoff",      resource: { type: "Handoff", id: "htl-0205", name: "Loan Approval Decision #205" }, ip: "200.55.14.22", location: "Mexico City, MX", userAgent: "Chrome 125 / Windows 11", result: "success", studio: "agentic", details: { "Worker": "Loan Risk Engine", "Decision": "Reject — insufficient income documentation" } },  // audit-ignore: prototype fixture data
  { id: "ae024", timestamp: "2026-08-24T09:00:11Z", actor: ACTORS.jp, category: "settings", action: "billing.plan.view",  actionLabel: "Viewed billing details",     ip: "67.23.88.41",   location: "Chicago, IL",        userAgent: "Safari 17 / macOS 14", result: "success" },
  { id: "ae025", timestamp: "2026-08-23T15:14:22Z", actor: ACTORS.tg, category: "access",  action: "role.create",        actionLabel: "Created custom role",        resource: { type: "Role", id: "role-compliance-auditor", name: "Compliance Auditor" }, ip: "104.28.91.14", location: "San Francisco, CA", userAgent: "Chrome 125 / macOS 14", result: "success", studio: "admin", details: { "Permissions": "8", "Studios": "Governance, Data Studio" } },
  { id: "ae026", timestamp: "2026-08-23T15:22:09Z", actor: ACTORS.tg, category: "access",  action: "role.assign",        actionLabel: "Assigned role to member",    target: { name: "Sarah Brown" }, resource: { type: "Role", id: "role-compliance-auditor", name: "Compliance Auditor" }, ip: "104.28.91.14", location: "San Francisco, CA", userAgent: "Chrome 125 / macOS 14", result: "success", studio: "admin" },
  { id: "ae027", timestamp: "2026-08-22T16:45:55Z", actor: ACTORS.at, category: "auth",    action: "auth.login",         actionLabel: "Signed in",                  ip: "189.71.4.201",  location: "Guadalajara, MX",    userAgent: "Edge 124 / Windows 11", result: "success" },
  { id: "ae028", timestamp: "2026-08-22T16:47:30Z", actor: ACTORS.at, category: "content", action: "model.view",         actionLabel: "Viewed data model",          resource: { type: "Model", id: "mdl-003", name: "Customer 360" }, ip: "189.71.4.201", location: "Guadalajara, MX", userAgent: "Edge 124 / Windows 11", result: "success", studio: "datastudio" },
  { id: "ae029", timestamp: "2026-08-22T14:00:18Z", actor: ACTORS.es, category: "content", action: "model.publish",      actionLabel: "Published data model",       resource: { type: "Model", id: "mdl-001", name: "Transaction Entity v3" }, ip: "189.55.12.88", location: "Monterrey, MX", userAgent: "Firefox 127 / macOS", result: "success", studio: "datastudio", details: { "Previous state": "Draft", "Reviewers": "Maria García, Thomas Gonzalez" } },
  { id: "ae030", timestamp: "2026-08-21T10:05:44Z", actor: ACTORS.tg, category: "auth",    action: "auth.mfa.reset",     actionLabel: "Reset member MFA",           target: { name: "Fiona Walsh", email: "fiona.walsh@avance.com" }, ip: "104.28.91.14", location: "San Francisco, CA", userAgent: "Chrome 125 / macOS 14", result: "success", details: { "Previous method": "SMS", "Reason": "Device lost" } },
  { id: "ae031", timestamp: "2026-08-21T10:10:02Z", actor: ACTORS.tg, category: "members", action: "member.suspend",     actionLabel: "Suspended member",           target: { name: "Fiona Walsh", email: "fiona.walsh@avance.com" }, ip: "104.28.91.14", location: "San Francisco, CA", userAgent: "Chrome 125 / macOS 14", result: "success" },
  { id: "ae032", timestamp: "2026-08-20T09:15:00Z", actor: ACTORS.mg, category: "members", action: "member.invite",      actionLabel: "Invited member",             target: { name: "Roberto Vargas", email: "roberto.vargas@avance.com" }, ip: "200.18.32.55", location: "Mexico City, MX", userAgent: "Edge 124 / Windows 11", result: "success", details: { "Role assigned": "Member", "Groups": "Engineering" } },
  { id: "ae033", timestamp: "2026-08-20T09:20:31Z", actor: ACTORS.mg, category: "members", action: "member.invite",      actionLabel: "Invited member",             target: { name: "Clara Nakamura", email: "clara.nakamura@avance.com" }, ip: "200.18.32.55", location: "Mexico City, MX", userAgent: "Edge 124 / Windows 11", result: "success" },
  { id: "ae034", timestamp: "2026-08-20T08:00:00Z", actor: ACTORS.sys, category: "integrations", action: "integration.sync.fail", actionLabel: "Integration sync failed", resource: { type: "Integration", id: "int-salesforce", name: "Salesforce CRM" }, ip: "10.0.0.1", location: "Internal", userAgent: "AIMS-OS System", result: "failure", details: { "Error": "OAuth token expired", "Records affected": "0" } },
  { id: "ae035", timestamp: "2026-08-19T15:30:10Z", actor: ACTORS.tg, category: "settings", action: "settings.domain.add", actionLabel: "Added verified domain",    ip: "104.28.91.14",  location: "San Francisco, CA",  userAgent: "Chrome 125 / macOS 14", result: "success", details: { "Domain": "contosoltd.com", "Method": "DNS TXT record" } },
  { id: "ae036", timestamp: "2026-08-19T12:00:00Z", actor: ACTORS.sys, category: "agents",  action: "worker.scheduled.run", actionLabel: "Scheduled worker run",    resource: { type: "Worker", id: "wkr-009", name: "Transaction Classifier" }, ip: "10.0.0.1", location: "Internal", userAgent: "AIMS-OS Scheduler", result: "success", studio: "agentic", details: { "Trigger": "Cron — daily 12:00 UTC", "Records processed": "2,341", "Duration": "18.4s" } },
  { id: "ae037", timestamp: "2026-08-18T11:20:55Z", actor: ACTORS.mg, category: "access",  action: "group.member.add",   actionLabel: "Added member to group",      target: { name: "Eduardo Suárez" }, resource: { type: "Group", id: "grp-engineering", name: "Engineering" }, ip: "200.18.32.55", location: "Mexico City, MX", userAgent: "Edge 124 / Windows 11", result: "success" },
  { id: "ae038", timestamp: "2026-08-18T09:05:33Z", actor: ACTORS.tg, category: "access",  action: "permission.deny",    actionLabel: "Denied permission",          target: { name: "Ana Torres" }, resource: { type: "Permission", id: "gov-truth-facts", name: "governance.truthplane.facts" }, ip: "104.28.91.14", location: "San Francisco, CA", userAgent: "Chrome 125 / macOS 14", result: "success", studio: "governance" },
  { id: "ae039", timestamp: "2026-08-15T14:00:00Z", actor: ACTORS.sb, category: "content", action: "pack.approve",       actionLabel: "Approved promotion packet",  resource: { type: "Pack", id: "gv-2195", name: "GV-2195: Compliance Metrics" }, ip: "72.14.192.30", location: "New York, NY", userAgent: "Chrome 125 / macOS 14", result: "success", studio: "governance" },
  { id: "ae040", timestamp: "2026-08-12T08:05:22Z", actor: ACTORS.mg, category: "auth",    action: "auth.login",         actionLabel: "Signed in",                  ip: "200.18.32.55",  location: "Mexico City, MX",    userAgent: "Edge 124 / Windows 11", result: "success" },
  { id: "ae041", timestamp: "2026-08-10T16:30:07Z", actor: ACTORS.tg, category: "integrations", action: "integration.disconnect", actionLabel: "Disconnected integration", resource: { type: "Integration", id: "int-old-erp", name: "Legacy ERP Connector" }, ip: "104.28.91.14", location: "San Francisco, CA", userAgent: "Chrome 125 / macOS 14", result: "success" },
  { id: "ae042", timestamp: "2026-08-10T15:05:44Z", actor: ACTORS.es, category: "content", action: "drive.upload",       actionLabel: "Uploaded file",              resource: { type: "File", id: "file-0441", name: "Q3_Risk_Assessment.pdf" }, ip: "189.55.12.88", location: "Monterrey, MX", userAgent: "Firefox 127 / macOS", result: "success", studio: "governance", details: { "Size": "2.4 MB", "Drive": "Compliance Documents" } },
  { id: "ae043", timestamp: "2026-08-08T10:05:11Z", actor: ACTORS.es, category: "content", action: "sandbox.create",     actionLabel: "Created sandbox",            resource: { type: "Sandbox", id: "sb-2026-08", name: "Risk Model SB-08" }, ip: "189.55.12.88", location: "Monterrey, MX", userAgent: "Firefox 127 / macOS", result: "success", studio: "governance" },
  { id: "ae044", timestamp: "2026-08-05T09:00:00Z", actor: ACTORS.tg, category: "settings", action: "settings.mfa.enforce", actionLabel: "Updated MFA policy",      ip: "104.28.91.14",  location: "San Francisco, CA",  userAgent: "Chrome 125 / macOS 14", result: "success", details: { "Policy": "Require MFA for Super Admin and Tenant Admin roles", "Effective": "2026-08-12" } },
  { id: "ae045", timestamp: "2026-08-03T11:00:00Z", actor: ACTORS.mg, category: "access",  action: "group.studio.update","actionLabel": "Updated group studio access", resource: { type: "Group", id: "grp-engineering", name: "Engineering" }, ip: "200.18.32.55", location: "Mexico City, MX", userAgent: "Edge 124 / Windows 11", result: "success", details: { "Removed": "Admin", "Studios": "Agentic, Data Studio, Governance" } },
  { id: "ae046", timestamp: "2026-07-30T08:00:00Z", actor: ACTORS.sys, category: "agents",  action: "worker.scheduled.run", actionLabel: "Scheduled worker run",    resource: { type: "Worker", id: "wkr-014", name: "Data Quality Monitor" }, ip: "10.0.0.1", location: "Internal", userAgent: "AIMS-OS Scheduler", result: "warning", studio: "agentic", details: { "Issues found": "14 records below quality threshold", "Action": "Flagged for review" } },
  { id: "ae047", timestamp: "2026-07-22T14:00:00Z", actor: ACTORS.tg, category: "members", action: "member.mfa.reset",   actionLabel: "Reset member MFA",           target: { name: "Eduardo Suárez", email: "eduardo.suarez@avance.com" }, ip: "104.28.91.14", location: "San Francisco, CA", userAgent: "Chrome 125 / macOS 14", result: "success", details: { "Previous method": "SMS", "Reason": "Admin request" } },
  { id: "ae048", timestamp: "2026-07-18T10:30:00Z", actor: ACTORS.mg, category: "content", action: "lineage.view",       actionLabel: "Viewed data lineage graph",   resource: { type: "Model", id: "mdl-003", name: "Customer 360" }, ip: "200.18.32.55", location: "Mexico City, MX", userAgent: "Edge 124 / Windows 11", result: "success", studio: "datastudio" },
  { id: "ae049", timestamp: "2026-07-14T10:00:00Z", actor: ACTORS.mg, category: "members", action: "member.suspend",     actionLabel: "Suspended member",           target: { name: "Fiona Walsh", email: "fiona.walsh@avance.com" }, ip: "200.18.32.55", location: "Mexico City, MX", userAgent: "Edge 124 / Windows 11", result: "success" },
  { id: "ae050", timestamp: "2026-07-07T09:00:00Z", actor: ACTORS.tg, category: "members", action: "member.invite",      actionLabel: "Invited member",             target: { name: "James Park", email: "james.park@avance.com" }, ip: "104.28.91.14", location: "San Francisco, CA", userAgent: "Chrome 125 / macOS 14", result: "success", details: { "Role assigned": "Billing Admin" } },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PROTO_NOW = new Date("2026-08-26T10:00:00Z")

function formatRelative(iso: string): string {
  const diffH = Math.floor((PROTO_NOW.getTime() - new Date(iso).getTime()) / 3_600_000)
  if (diffH < 1)  return "Just now"
  if (diffH < 24) return `${diffH}h ago`
  const d = Math.floor(diffH / 24)
  if (d === 1)    return "Yesterday"
  if (d < 7)      return `${d}d ago`
  if (d < 30)     return `${Math.floor(d / 7)}w ago`
  return `${Math.floor(d / 30)}mo ago`
}

function formatTs(iso: string): { date: string; time: string } {
  const dt = new Date(iso)
  return {
    date: dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    time: dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
  }
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ actor, size = 28 }: { actor: AuditActor; size?: number }) {
  return (
    <div title={actor.name} style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: actor.id === "sys" ? "var(--surface-raised)" : actor.color,
      border: actor.id === "sys" ? "1px solid var(--border)" : "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.round(size * 0.38), fontWeight: 700,
      color: actor.id === "sys" ? "var(--muted-foreground)" : "#fff",  // audit-ignore: prototype fixture data
    }}>
      {actor.initials}
    </div>
  )
}

// ─── Event row ────────────────────────────────────────────────────────────────

function EventRow({ event, selected, onClick }: { event: AuditEvent; selected: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  const { date, time } = formatTs(event.timestamp)
  const cat = CATEGORY_META[event.category]
  const res = RESULT_META[event.result]

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "grid", gridTemplateColumns: "148px 36px 1fr 120px 80px 80px",
        alignItems: "center", gap: 12, padding: "10px 20px",
        borderBottom: "1px solid var(--border)", cursor: "pointer",
        background: selected ? "color-mix(in srgb, var(--primary) 8%, transparent)"
          : hov ? "var(--accent)" : "transparent",
        borderLeft: selected ? "2px solid var(--primary)" : "2px solid transparent",
        transition: "background 0.1s",
      }}
    >
      {/* Timestamp */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground)", fontVariantNumeric: "tabular-nums" }}>{time}</div>
        <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{date}</div>
      </div>

      {/* Actor avatar */}
      <Avatar actor={event.actor} size={28} />

      {/* Action */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
            background: `${cat.color}1a`, color: cat.color, border: `1px solid ${cat.color}33`,
            textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0,
          }}>
            {cat.icon} {cat.label}
          </span>
          {event.studio && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 3,
              background: `${STUDIO_META[event.studio].color}15`, color: STUDIO_META[event.studio].color,
              flexShrink: 0,
            }}>
              {STUDIO_META[event.studio].label}
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <span style={{ fontWeight: 600 }}>{event.actor.name}</span>
          {" "}
          <span style={{ color: "var(--muted-foreground)" }}>{event.actionLabel.toLowerCase()}</span>
          {event.target && (
            <span> <span style={{ fontWeight: 500 }}>{event.target.name}</span></span>
          )}
          {event.resource && (
            <span style={{ color: "var(--muted-foreground)" }}> · {event.resource.name}</span>
          )}
        </div>
      </div>

      {/* IP */}
      <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontVariantNumeric: "tabular-nums", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {event.ip}
      </div>

      {/* Relative time */}
      <div style={{ fontSize: 11, color: "var(--muted-foreground)", textAlign: "right" }}>
        {formatRelative(event.timestamp)}
      </div>

      {/* Result */}
      <div style={{ textAlign: "right" }}>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100,
          background: `${res.color}18`, color: res.color, border: `1px solid ${res.color}33`,
        }}>
          {res.label}
        </span>
      </div>
    </div>
  )
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid var(--border)", display: "flex", gap: 12 }}>
      <div style={{ width: 120, flexShrink: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", paddingTop: 1 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--foreground)", wordBreak: "break-all", fontFamily: mono ? "var(--font-mono, monospace)" : undefined }}>{value}</div>
    </div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

export function AdminAuditLogScreen({ onNavigate }: { onNavigate?: (id: string) => void } = {}) {
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [resultFilter, setResultFilter]     = useState("all")
  const [actorFilter, setActorFilter]       = useState("all")
  const [query, setQuery]                   = useState("")
  const [openSlot, setOpenSlot]             = useState<"result" | "actor" | null>(null)
  const [selected, setSelected]             = useState<AuditEvent | null>(null)
  const [page, setPage]                     = useState(1)

  const filtered = useMemo(() => {
    let result = EVENTS
    if (categoryFilter !== "all") result = result.filter(e => e.category === categoryFilter)
    if (resultFilter   !== "all") result = result.filter(e => e.result   === resultFilter)
    if (actorFilter    !== "all") result = result.filter(e => e.actor.id  === actorFilter)
    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter(e =>
        e.actionLabel.toLowerCase().includes(q) ||
        e.actor.name.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        (e.target?.name ?? "").toLowerCase().includes(q) ||
        (e.resource?.name ?? "").toLowerCase().includes(q) ||
        e.ip.includes(q)
      )
    }
    return result
  }, [categoryFilter, resultFilter, actorFilter, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

const failureCount = EVENTS.filter(e => e.result === "failure").length
  const warningCount = EVENTS.filter(e => e.result === "warning").length

  function handleRowClick(e: AuditEvent) {
    setSelected(prev => prev?.id === e.id ? null : e)
  }

  return (
    <ScreenLayout
      workspaceName="Avance Financial"
      userName="Thomas Gonzalez"
      userEmail="thomas.gonzalez@aimsos.ai"
      sidebarItems={SIDEBAR}
      activeSidebarId="audit"
      onSidebarItemClick={onNavigate}
      header={(isScrolled) => (
        <Header
          size={isScrolled ? "compress" : "size-l"}
          title="Audit Log"
          description={`${EVENTS.length} events · Avance Financial workspace · Retained for 12 months`}
          primaryAction={{ label: "Export", icon: Icons.Download, priority: "secondary" }}
        />
      )}
    >
      {/* Summary tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total events",    value: EVENTS.length,  icon: <Icons.ClipboardList size={16} />, color: "var(--primary)"       },
          { label: "This week",       value: EVENTS.filter(e => (PROTO_NOW.getTime() - new Date(e.timestamp).getTime()) < 7*86400000).length, icon: <Icons.Calendar size={16} />, color: "var(--primary)" },
          { label: "Failures",        value: failureCount,   icon: <Icons.XCircle size={16} />,       color: "var(--badge-error)"   },
          { label: "Warnings",        value: warningCount,   icon: <Icons.AlertTriangle size={16} />, color: "var(--badge-alert)"   },
        ].map(t => (
          <div key={t.label} style={{
            padding: "14px 18px", border: "1px solid var(--border)", borderRadius: 10,
            background: "var(--surface)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8, color: t.color }}>{t.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--foreground)", lineHeight: 1, marginBottom: 4 }}>{t.value}</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{t.label}</div>
          </div>
        ))}
      </div>

      {/* Category tabs */}
      <div style={{ borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
        <Tabs
          items={[
            { id: "all",          label: "All"            },
            { id: "auth",         label: "Authentication" },
            { id: "access",       label: "Access control" },
            { id: "members",      label: "Members"        },
            { id: "content",      label: "Content"        },
            { id: "agents",       label: "AI agents"      },
            { id: "integrations", label: "Integrations"   },
            { id: "settings",     label: "Settings"       },
          ]}
          activeId={categoryFilter}
          onChange={v => { setCategoryFilter(v); setPage(1) }}
          size="s"
        />
      </div>

      {/* Filters bar */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        {openSlot && (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 190 }}
            onClick={() => setOpenSlot(null)}
          />
        )}
        <Filters
          showSearch
          searchPlaceholder="Search events, actors, resources…"
          searchValue={query}
          onSearchChange={v => { setQuery(v); setPage(1) }}
          showSort={false}
          showViewToggle={false}
          showAllFilters={false}
          slots={[
            {
              placeholder: "Result",
              value: resultFilter !== "all" ? ({ success: "Success", failure: "Failures", warning: "Warnings" } as Record<string, string>)[resultFilter] : undefined,
              onOpen:   () => setOpenSlot(s => s === "result" ? null : "result"),
              onRemove: () => { setResultFilter("all"); setPage(1) },
            },
            {
              placeholder: "Actor",
              value: actorFilter !== "all" ? ACTORS[actorFilter]?.name : undefined,
              onOpen:   () => setOpenSlot(s => s === "actor" ? null : "actor"),
              onRemove: () => { setActorFilter("all"); setPage(1) },
            },
          ]}
          showClearFilters={resultFilter !== "all" || actorFilter !== "all"}
          onClearFilters={() => { setResultFilter("all"); setActorFilter("all"); setPage(1) }}
        />

        {/* Result dropdown */}
        {openSlot === "result" && (
          <div style={{
            position: "absolute", top: 44, left: 210, zIndex: 200,
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", // audit-ignore: box-shadow alpha has no token equivalent
            overflow: "hidden", minWidth: 150,
          }}>
            {(["all", "success", "failure", "warning"] as const).map(v => (
              <button key={v}
                onClick={() => { setResultFilter(v); setPage(1); setOpenSlot(null) }}
                style={{
                  display: "block", width: "100%", padding: "9px 14px", textAlign: "left",
                  fontSize: 13, border: "none", cursor: "pointer",
                  color: resultFilter === v ? "var(--primary)" : "var(--foreground)",
                  background: resultFilter === v ? "var(--accent)" : "var(--surface)",
                }}
              >
                {v === "all" ? "All results" : v === "success" ? "Success" : v === "failure" ? "Failures" : "Warnings"}
              </button>
            ))}
          </div>
        )}

        {/* Actor dropdown */}
        {openSlot === "actor" && (
          <div style={{
            position: "absolute", top: 44, left: 290, zIndex: 200,
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", // audit-ignore: box-shadow alpha has no token equivalent
            overflow: "hidden", minWidth: 180, maxHeight: 240, overflowY: "auto",
          }}>
            {[{ id: "all", name: "All actors" }, ...Object.values(ACTORS)].map(a => (
              <button key={a.id}
                onClick={() => { setActorFilter(a.id); setPage(1); setOpenSlot(null) }}
                style={{
                  display: "block", width: "100%", padding: "9px 14px", textAlign: "left",
                  fontSize: 13, border: "none", cursor: "pointer",
                  color: actorFilter === a.id ? "var(--primary)" : "var(--foreground)",
                  background: actorFilter === a.id ? "var(--accent)" : "var(--surface)",
                }}
              >
                {a.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div style={{ display: "flex", gap: 0, border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {/* Log list */}
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          {/* Table header */}
          <div style={{
            display: "grid", gridTemplateColumns: "148px 36px 1fr 120px 80px 80px",
            alignItems: "center", gap: 12, padding: "10px 20px",
            background: "var(--surface-raised)", borderBottom: "1px solid var(--border)",
            fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)",
            textTransform: "uppercase", letterSpacing: "0.07em",
          }}>
            <span>Timestamp</span>
            <span />
            <span>Event</span>
            <span>IP Address</span>
            <span style={{ textAlign: "right" }}>When</span>
            <span style={{ textAlign: "right" }}>Result</span>
          </div>

          {paged.length === 0 ? (
            <div style={{ padding: "56px 20px", textAlign: "center", color: "var(--muted-foreground)" }}>
              <Icons.SearchX size={28} style={{ marginBottom: 10, opacity: 0.3 }} />
              <div style={{ fontSize: 14, fontWeight: 500 }}>No events match</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Try a different filter or search term</div>
            </div>
          ) : (
            paged.map(e => (
              <EventRow
                key={e.id}
                event={e}
                selected={selected?.id === e.id}
                onClick={() => handleRowClick(e)}
              />
            ))
          )}

          {/* Pagination */}
          {filtered.length > PAGE_SIZE && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 20px", borderTop: "1px solid var(--border)",
              background: "var(--surface-raised)",
            }}>
              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} events
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                    border: "1px solid var(--border)", background: "var(--surface)",
                    color: page === 1 ? "var(--muted-foreground)" : "var(--foreground)",
                    cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.5 : 1,
                  }}
                >
                  ← Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                    border: "1px solid var(--border)", background: "var(--surface)",
                    color: page === totalPages ? "var(--muted-foreground)" : "var(--foreground)",
                    cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.5 : 1,
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Detail slide-out */}
      {(() => {
        const cat = selected ? CATEGORY_META[selected.category] : null
        const res = selected ? RESULT_META[selected.result] : null
        const { date, time } = selected ? formatTs(selected.timestamp) : { date: "", time: "" }
        return (
          <SlideOut
            open={selected !== null}
            onClose={() => setSelected(null)}
            title={selected?.actionLabel ?? ""}
            subtitle={selected && cat && res ? `${cat.label} · ${res.label} · ${date} at ${time}` : ""}
          >
            {selected && cat && res && (
              <div style={{ padding: "0 0 20px" }}>
                {/* Badges */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, paddingTop: 4 }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 3,
                    fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                    background: `${cat.color}1a`, color: cat.color, border: `1px solid ${cat.color}33`,
                    textTransform: "uppercase", letterSpacing: "0.05em",
                  }}>
                    {cat.icon} {cat.label}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                    background: `${res.color}15`, color: res.color, border: `1px solid ${res.color}30`,
                  }}>
                    {res.label}
                  </span>
                </div>

                {/* Actor */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted-foreground)", marginBottom: 10 }}>Actor</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--surface-raised)", borderRadius: 8, border: "1px solid var(--border)" }}>
                    <Avatar actor={selected.actor} size={32} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{selected.actor.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{selected.actor.email}</div>
                    </div>
                  </div>
                </div>

                {/* Event details */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted-foreground)", marginBottom: 6 }}>Event details</div>
                  <DetailRow label="Event ID"  value={selected.id} mono />
                  <DetailRow label="Action"    value={selected.action} mono />
                  <DetailRow label="Timestamp" value={`${date} ${time} UTC`} />
                  {selected.target && (
                    <DetailRow label="Target" value={selected.target.email ? `${selected.target.name} (${selected.target.email})` : selected.target.name} />
                  )}
                  {selected.resource && (
                    <>
                      <DetailRow label="Resource type" value={selected.resource.type} />
                      <DetailRow label="Resource name" value={selected.resource.name} />
                      <DetailRow label="Resource ID"   value={selected.resource.id} mono />
                    </>
                  )}
                  {selected.studio && (
                    <DetailRow label="Studio" value={STUDIO_META[selected.studio].label} />
                  )}
                </div>

                {/* Metadata */}
                {selected.details && Object.keys(selected.details).length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted-foreground)", marginBottom: 6 }}>Metadata</div>
                    {Object.entries(selected.details).map(([k, v]) => (
                      <DetailRow key={k} label={k} value={v} />
                    ))}
                  </div>
                )}

                {/* Network */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted-foreground)", marginBottom: 6 }}>Network</div>
                  <DetailRow label="IP address" value={selected.ip} mono />
                  <DetailRow label="Location"   value={selected.location} />
                  <DetailRow label="User agent" value={selected.userAgent} />
                </div>
              </div>
            )}
          </SlideOut>
        )
      })()}
    </ScreenLayout>
  )
}
