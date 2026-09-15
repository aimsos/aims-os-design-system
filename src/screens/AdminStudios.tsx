import { useState } from "react"
import { ADMIN_SIDEBAR as SIDEBAR } from "./adminShared"
import * as Icons from "lucide-react"
import { ScreenLayout }  from "@/components/layouts/screen-layout"
import { Header }        from "@/components/ui/header"
import { Button }        from "@/components/ui/button"
import { CardContainer } from "@/components/ui/card-container"
import { Tag }           from "@/components/ui/tag"
import { Toggle }        from "@/components/ui/toggle"
import { Tabs }          from "@/components/ui/tabs"
import { HighlightIcon, type HighlightIconVariant } from "@/components/ui/highlight-icon"
import { WidgetCanvasView } from "@/components/layouts/widget-canvas-view"
import type { CanvasSlot }  from "@/components/layouts/widget-canvas-view"

// ─── Types ────────────────────────────────────────────────────────────────────

interface GroupAccess  { id: string; name: string; members: number; access: boolean }
interface RoleAccess   { id: string; name: string; access: "full" | "limited" | "none" }
interface StudioToggle { id: string; label: string; description: string; value: boolean }

interface EntityTab {
  id: string
  label: string
  statLabel: string
  items: EntityItem[]
}
interface EntityItem {
  id: string; name: string; status: string; statusVariant: "success" | "alert" | "secondary" | "informative"
  meta: string; date: string
}

interface ConfigItem { type: string; id: string; label: string; description: string; value: boolean | number | string; min?: number; max?: number; options?: string[] }

interface Studio {
  id: string; name: string; icon: string; accentColor: string
  description: string; status: "active" | "disabled"
  membersWithAccess: number; totalMembers: number
  highlightVariant: HighlightIconVariant
  stats: { label: string; value: string; icon: string; variant: HighlightIconVariant; trend?: number }[]
  groups: GroupAccess[]
  roles: RoleAccess[]
  settings: StudioToggle[]
  entityTabs?: EntityTab[]
  config?: { general?: ConfigItem[]; policies?: ConfigItem[]; compliance?: { items: ConfigItem[]; exportLabel?: string } }
}

// ─── Data ────────────────────────────────────────────────────────────────────

const STUDIOS: Studio[] = [
  {
    id: "governance",
    name: "Governance Studio",
    icon: "Layers",
    accentColor: "#10b981",  // audit-ignore: prototype fixture data
    highlightVariant: "success",
    description: "Sandbox/Truth plane model, domain sections, knowledge bindings, promotion packets, and resolution requests.",
    status: "active",
    membersWithAccess: 28,
    totalMembers: 50,
    stats: [
      { label: "Active sandboxes",    value: "3",  icon: "Box",           variant: "success", trend: +1  },
      { label: "Content bundles",     value: "15", icon: "Package",        variant: "success", trend: +3  },
      { label: "Promotion packets",   value: "8",  icon: "Upload",         variant: "success", trend: -2  },
      { label: "Resolution requests", value: "2",  icon: "MessageCircle",  variant: "alert",   trend: +2  },
    ],
    groups: [
      { id: "g1", name: "Risk & Compliance", members: 8,  access: true  },
      { id: "g2", name: "Engineering",       members: 12, access: true  },
      { id: "g3", name: "Data",              members: 6,  access: true  },
      { id: "g4", name: "Finance",           members: 5,  access: false },
      { id: "g5", name: "Executives",        members: 4,  access: false },
      { id: "g6", name: "Operations",        members: 7,  access: false },
    ],
    roles: [
      { id: "r1", name: "Super Admin",   access: "full"    },
      { id: "r2", name: "Tenant Admin",  access: "full"    },
      { id: "r3", name: "Member",        access: "limited" },
      { id: "r4", name: "Viewer",        access: "limited" },
      { id: "r5", name: "Billing Admin", access: "none"    },
    ],
    settings: [
      { id: "s1", label: "Require promotion approval",   description: "Packets must be approved by a Tenant Admin before reaching the Truth plane.", value: true  },
      { id: "s2", label: "Truth plane lock",             description: "Prevent direct edits to Truth plane records without a promotion packet.",      value: true  },
      { id: "s3", label: "Sandbox auto-expiry",          description: "Automatically expire sandboxes after 90 days of inactivity.",                  value: false },
      { id: "s4", label: "Audit all sandbox reads",      description: "Log every read of sandbox records to the workspace audit log.",                value: false },
      { id: "s5", label: "Allow Member-level authoring", description: "Members can create and edit content in sandboxes (not Truth plane).",          value: true  },
    ],
    entityTabs: [
      {
        id: "sandboxes", label: "Sandboxes", statLabel: "Active sandboxes",
        items: [
          { id: "sb1", name: "Q3 Customer Segmentation",    status: "Active",   statusVariant: "success",     meta: "Domain: Customer · 4 bindings",   date: "Sep 1, 2026"  },
          { id: "sb2", name: "Product Taxonomy v2",         status: "Active",   statusVariant: "success",     meta: "Domain: Product · 7 bindings",    date: "Aug 28, 2026" },
          { id: "sb3", name: "Compliance Model Refresh",    status: "Active",   statusVariant: "success",     meta: "Domain: Risk · 2 bindings",       date: "Aug 20, 2026" },
        ],
      },
      {
        id: "bundles", label: "Content Bundles", statLabel: "Content bundles",
        items: [
          { id: "cb1",  name: "Customer — Core Entities v4",      status: "Published", statusVariant: "success",     meta: "12 entities · Customer domain",    date: "Sep 3, 2026"  },
          { id: "cb2",  name: "Product Catalog — Full",           status: "Published", statusVariant: "success",     meta: "38 entities · Product domain",    date: "Sep 1, 2026"  },
          { id: "cb3",  name: "Risk Indicators Q3",               status: "Published", statusVariant: "success",     meta: "9 entities · Risk domain",        date: "Aug 29, 2026" },
          { id: "cb4",  name: "Regulatory Mapping 2026",          status: "Published", statusVariant: "success",     meta: "5 entities · Compliance domain",  date: "Aug 25, 2026" },
          { id: "cb5",  name: "HR Reference Data",                status: "Published", statusVariant: "success",     meta: "7 entities · HR domain",          date: "Aug 22, 2026" },
          { id: "cb6",  name: "Financial Chart of Accounts",      status: "Draft",     statusVariant: "informative", meta: "14 entities · Finance domain",    date: "Aug 18, 2026" },
          { id: "cb7",  name: "Supplier Directory",               status: "Draft",     statusVariant: "informative", meta: "6 entities · Operations domain",  date: "Aug 15, 2026" },
          { id: "cb8",  name: "Campaign Attribution Model",       status: "Draft",     statusVariant: "informative", meta: "8 entities · Marketing domain",   date: "Aug 12, 2026" },
          { id: "cb9",  name: "Customer — Core Entities v3",      status: "Archived",  statusVariant: "secondary",   meta: "12 entities · Customer domain",   date: "Jul 10, 2026" },
          { id: "cb10", name: "Product Catalog — Seasonal",       status: "Archived",  statusVariant: "secondary",   meta: "21 entities · Product domain",    date: "Jun 30, 2026" },
          { id: "cb11", name: "Legacy Risk Indicators",           status: "Archived",  statusVariant: "secondary",   meta: "6 entities · Risk domain",        date: "Jun 15, 2026" },
          { id: "cb12", name: "Partner Integration Schema",       status: "Archived",  statusVariant: "secondary",   meta: "4 entities · Operations domain",  date: "May 20, 2026" },
          { id: "cb13", name: "Internal Audit Framework",         status: "Published", statusVariant: "success",     meta: "3 entities · Compliance domain",  date: "May 5, 2026"  },
          { id: "cb14", name: "Employee Onboarding Data",         status: "Published", statusVariant: "success",     meta: "5 entities · HR domain",          date: "Apr 28, 2026" },
          { id: "cb15", name: "Q1 Pricing Reference",             status: "Archived",  statusVariant: "secondary",   meta: "9 entities · Finance domain",     date: "Apr 10, 2026" },
        ],
      },
      {
        id: "packets", label: "Promotion Packets", statLabel: "Promotion packets",
        items: [
          { id: "pp1", name: "Customer Segmentation → Truth",   status: "Pending",  statusVariant: "alert",       meta: "Sandbox: Q3 Customer Segmentation",  date: "Sep 4, 2026"  },
          { id: "pp2", name: "Product Taxonomy v2 → Truth",     status: "Pending",  statusVariant: "alert",       meta: "Sandbox: Product Taxonomy v2",       date: "Sep 3, 2026"  },
          { id: "pp3", name: "Risk Indicators Patch",           status: "Approved", statusVariant: "success",     meta: "Sandbox: Compliance Model Refresh",  date: "Sep 1, 2026"  },
          { id: "pp4", name: "Regulatory Mapping Update",       status: "Approved", statusVariant: "success",     meta: "Sandbox: Compliance Model Refresh",  date: "Aug 30, 2026" },
          { id: "pp5", name: "HR Reference Sync",               status: "Approved", statusVariant: "success",     meta: "Sandbox: Q3 Customer Segmentation",  date: "Aug 27, 2026" },
          { id: "pp6", name: "Legacy Catalog Deprecation",      status: "Rejected", statusVariant: "secondary",   meta: "Sandbox: Product Taxonomy v2",       date: "Aug 22, 2026" },
          { id: "pp7", name: "Finance COA Draft",               status: "Draft",    statusVariant: "informative", meta: "Sandbox: Compliance Model Refresh",  date: "Aug 20, 2026" },
          { id: "pp8", name: "Supplier Schema v1",              status: "Draft",    statusVariant: "informative", meta: "Sandbox: Product Taxonomy v2",       date: "Aug 18, 2026" },
        ],
      },
      {
        id: "resolutions", label: "Resolution Requests", statLabel: "Resolution requests",
        items: [
          { id: "rr1", name: "Conflicting customer IDs between sandbox and Truth", status: "Open",     statusVariant: "alert",   meta: "Filed by: Sofia Martínez · Risk domain",    date: "Sep 5, 2026"  },
          { id: "rr2", name: "Product taxonomy leaf node missing parent ref",      status: "Open",     statusVariant: "alert",   meta: "Filed by: James Park · Product domain",     date: "Sep 3, 2026"  },
        ],
      },
    ],
  },
  {
    id: "datastudio",
    name: "Data Studio",
    icon: "FlaskConical",
    accentColor: "#8b5cf6",  // audit-ignore: prototype fixture data
    highlightVariant: "purple",
    description: "Data modeling, lineage tracking, entity management, and governed schema publication.",
    status: "active",
    membersWithAccess: 35,
    totalMembers: 50,
    stats: [
      { label: "Published models", value: "14", icon: "CheckCircle",  variant: "success", trend: +2  },
      { label: "Draft models",     value: "22", icon: "FilePen",      variant: "purple",  trend: +5  },
      { label: "Deprecated",       value: "6",  icon: "Archive",      variant: "neutral", trend: 0   },
      { label: "Domains",          value: "5",  icon: "Network",      variant: "purple",  trend: +1  },
    ],
    groups: [
      { id: "g1", name: "Engineering",       members: 12, access: true  },
      { id: "g2", name: "Data",              members: 6,  access: true  },
      { id: "g3", name: "Risk & Compliance", members: 8,  access: true  },
      { id: "g4", name: "Finance",           members: 5,  access: true  },
      { id: "g5", name: "Executives",        members: 4,  access: false },
      { id: "g6", name: "Operations",        members: 7,  access: false },
    ],
    roles: [
      { id: "r1", name: "Super Admin",   access: "full"    },
      { id: "r2", name: "Tenant Admin",  access: "full"    },
      { id: "r3", name: "Member",        access: "full"    },
      { id: "r4", name: "Viewer",        access: "limited" },
      { id: "r5", name: "Billing Admin", access: "none"    },
    ],
    settings: [
      { id: "s1", label: "Lineage visible to Viewers",     description: "Allow Viewer-role members to browse the data lineage graph.",                    value: true  },
      { id: "s2", label: "Schema validation on publish",   description: "Enforce schema compatibility checks before a model can be published.",            value: true  },
      { id: "s3", label: "Model versioning",               description: "Automatically version models on each publish (v1, v2, …).",                      value: true  },
      { id: "s4", label: "Require peer review to publish", description: "A second author must approve a model before it transitions to Published.",        value: false },
      { id: "s5", label: "Auto-deprecate on replace",      description: "Automatically mark the previous version as Deprecated when a new one publishes.", value: false },
    ],
  },
  {
    id: "agentic",
    name: "Agentic Studio",
    icon: "Bot",
    accentColor: "#06b6d4",  // audit-ignore: prototype fixture data
    highlightVariant: "light-blue",
    description: "AI worker management, agentic network composition, Human-in-the-Loop handoffs, and run observability.",
    status: "active",
    membersWithAccess: 22,
    totalMembers: 50,
    stats: [
      { label: "Active workers", value: "7",  icon: "Bot",        variant: "light-blue", trend: +1  },
      { label: "Networks",       value: "3",  icon: "GitBranch",  variant: "light-blue", trend: 0   },
      { label: "HITL queue",     value: "4",  icon: "UserCheck",  variant: "alert",      trend: +4  },
      { label: "Runs today",     value: "19", icon: "Activity",   variant: "light-blue", trend: +7  },
    ],
    groups: [
      { id: "g1", name: "Engineering",       members: 12, access: true  },
      { id: "g2", name: "Data",              members: 6,  access: true  },
      { id: "g3", name: "Risk & Compliance", members: 8,  access: false },
      { id: "g4", name: "Finance",           members: 5,  access: false },
      { id: "g5", name: "Executives",        members: 4,  access: false },
      { id: "g6", name: "Operations",        members: 7,  access: false },
    ],
    roles: [
      { id: "r1", name: "Super Admin",   access: "full"    },
      { id: "r2", name: "Tenant Admin",  access: "full"    },
      { id: "r3", name: "Member",        access: "limited" },
      { id: "r4", name: "Viewer",        access: "none"    },
      { id: "r5", name: "Billing Admin", access: "none"    },
    ],
    settings: [],
    config: {
      general: [
        { type: "toggle",  id: "hitl-highrisk",    label: "HITL required for high-risk decisions", description: "Workers flagged as high-risk must pause and request a human decision before continuing.", value: true  },
        { type: "toggle",  id: "auto-shutdown",    label: "Auto-shutdown idle workers",             description: "Suspend workers with no runs in the last 7 days to reduce resource usage.",              value: false },
        { type: "toggle",  id: "scheduled-runs",   label: "Allow scheduled runs",                   description: "Enable cron-triggered worker runs in addition to on-demand invocations.",               value: true  },
        { type: "toggle",  id: "governance-bind",  label: "Require governance binding",             description: "Workers must be bound to a Governance Studio domain before they can be deployed.",      value: false },
      ],
      policies: [
        { type: "stepper", id: "run-timeout",      label: "Max run timeout (minutes)",     description: "Workers that exceed this time are automatically terminated and logged as failed.",           value: 30, min: 1, max: 240 },
        { type: "stepper", id: "max-concurrent",   label: "Max concurrent runs per worker", description: "Limit the number of simultaneous invocations for a single worker.",                         value: 5, min: 1, max: 50 },
        { type: "toggle",  id: "retry-on-fail",    label: "Auto-retry on failure",          description: "Automatically retry a failed run once before marking it as a hard failure.",                value: true  },
        { type: "stepper", id: "hitl-timeout",     label: "HITL decision timeout (hours)",  description: "If a human review request is not resolved within this period, the run is escalated.",       value: 24, min: 1, max: 168 },
      ],
      compliance: {
        items: [
          { type: "toggle",  id: "audit-runs",     label: "Audit all worker runs",           description: "Log inputs, outputs, and token usage for every worker invocation.",                       value: true  },
          { type: "toggle",  id: "pii-masking",    label: "PII input masking",               description: "Automatically detect and redact PII from worker inputs before logging.",                  value: false },
          { type: "select",  id: "data-residency", label: "Data residency enforcement",      description: "Restrict worker run data to the selected region for compliance purposes.",                 value: "US East", options: ["US East", "US West", "EU (Frankfurt)", "AP (Singapore)", "No restriction"] },
          { type: "toggle",  id: "pii-output",     label: "Scan outputs for PII",            description: "Flag and quarantine worker outputs containing detected PII before delivery.",              value: false },
        ],
        exportLabel: "Export compliance report",
      },
    },
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLE_ACCESS_TAG: Record<RoleAccess["access"], "success" | "alert" | "secondary"> = {
  full: "success", limited: "alert", none: "secondary",
}
const ROLE_ACCESS_LABEL: Record<RoleAccess["access"], string> = {
  full: "Full access", limited: "Limited", none: "No access",
}
const ROLE_DESCRIPTION: Record<RoleAccess["access"], string> = {
  full:    "Can view, edit, and manage all studio content",
  limited: "Can view and interact with studio content",
  none:    "No access to this studio",
}
// Access level is a state, so the tile carries a semantic tint — never the
// studio's own accent hex.
const ROLE_HIGHLIGHT: Record<RoleAccess["access"], HighlightIconVariant> = {
  full: "success", limited: "alert", none: "neutral",
}

const STUDIO_STATUS_TAG: Record<Studio["status"], "success" | "secondary"> = {
  active: "success", disabled: "secondary",
}
const STUDIO_STATUS_LABEL: Record<Studio["status"], string> = {
  active: "Active", disabled: "Disabled",
}

function accessPercent(studio: Studio) {
  if (studio.totalMembers === 0) return 0
  return Math.round((studio.membersWithAccess / studio.totalMembers) * 100)
}

function StudioIconBadge({ studio, size = 48 }: { studio: Studio; size?: number }) {
  const IC = Icons[studio.icon as keyof typeof Icons] as React.ElementType
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.25, flexShrink: 0,
      background: `${studio.accentColor}18`, border: `1px solid ${studio.accentColor}35`,
      display: "flex", alignItems: "center", justifyContent: "center", color: studio.accentColor,
    }}>
      {IC ? <IC size={Math.round(size * 0.45)} /> : null}
    </div>
  )
}

// ─── Studio list card (horizontal) ───────────────────────────────────────────

function StudioCard({ studio, onClick }: { studio: Studio; onClick: () => void }) {
  const accessPct = accessPercent(studio)

  return (
    <CardContainer variant="default" size="default" onClick={onClick} className="flex flex-row items-center gap-6">
      <StudioIconBadge studio={studio} size={56} />

      {/* Identity */}
      <div style={{ width: 220, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", lineHeight: 1 }}>{studio.name}</span>
          <Tag variant={STUDIO_STATUS_TAG[studio.status]} size="sm">{STUDIO_STATUS_LABEL[studio.status]}</Tag>
        </div>
        <p style={{
          fontSize: 12, fontWeight: 500, color: "var(--color-text-body)", lineHeight: "20px", margin: 0,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {studio.description}
        </p>
      </div>

      <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)", flexShrink: 0 }} />

      {/* Stats */}
      <div style={{ display: "flex", flex: 1 }}>
        {studio.stats.map((s, i) => (
          <div key={s.label} style={{
            flex: 1, padding: "0 20px", textAlign: "center",
            borderRight: i < studio.stats.length - 1 ? "1px solid var(--border)" : "none",
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: studio.accentColor, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-body)", marginTop: 4, lineHeight: "16px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)", flexShrink: 0 }} />

      {/* Access bar */}
      <div style={{ width: 140, flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-body)" }}>Access</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: studio.accentColor }}>{accessPct}%</span>
        </div>
        <div style={{ height: 5, borderRadius: 3, background: "var(--border)" }}>
          <div style={{ height: "100%", width: `${accessPct}%`, borderRadius: 3, background: studio.accentColor }} />
        </div>
        <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-body)", marginTop: 5 }}>
          {studio.membersWithAccess} of {studio.totalMembers} members
        </div>
      </div>

      <Icons.ChevronRight size={16} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
    </CardContainer>
  )
}

// ─── Entity list tab ─────────────────────────────────────────────────────────

function EntityListTab({ tab, accentColor }: { tab: EntityTab; accentColor: string }) {
  return (
    <div>
      {tab.items.map((item, i) => (
        <div key={item.id} style={{
          display: "flex", alignItems: "center", gap: 14, padding: "12px 0",
          borderBottom: i < tab.items.length - 1 ? "1px solid var(--border)" : "none",
        }}>
          <span style={{ color: accentColor, flexShrink: 0, display: "flex" }}>
            <Icons.FileText size={15} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", lineHeight: 1.3 }}>{item.name}</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-subtitle)", marginTop: 3 }}>{item.meta}</div>
          </div>
          <Tag variant={item.statusVariant} size="sm">{item.status}</Tag>
          <span style={{ fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)", flexShrink: 0 }}>{item.date}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Overview tab (WidgetCanvasView) ─────────────────────────────────────────

function OverviewTab({ studio, onNavigateToTab }: { studio: Studio; onNavigateToTab?: (id: string) => void }) {
  const accessPct = accessPercent(studio)
  const groupsWithAccess = studio.groups.filter(g => g.access)

  const slots: CanvasSlot[] = [
    // ── 4 KPI stats ─────────────────────────────────────────────────────────
    ...studio.stats.map(s => ({
      uid:         `stat-${s.label}`,
      title:       s.label,
      colSpan:     1 as const,
      rowSpan:     3,
      minRowSpan:  3,
      maxRowSpan:  3,
      autoExpand:  false,
      showRefresh: false,
      showMenu:    false,
      content: (
        <div style={{ padding: "4px 16px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 32, fontWeight: 700, lineHeight: 1, color: "var(--color-text-title)" }}>{s.value}</span>
            {s.trend !== undefined && s.trend !== 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 6,
                background: s.trend > 0 ? "var(--color-surface-success-more-subtle)" : "var(--color-surface-error-more-subtle)",
                border: `1px solid ${s.trend > 0 ? "var(--color-border-success-lighter)" : "var(--color-border-error-lighter)"}`,
              }}>
                {s.trend > 0
                  ? <Icons.TrendingUp size={11} style={{ color: "var(--color-text-success)" }} />
                  : <Icons.TrendingDown size={11} style={{ color: "var(--color-text-error)" }} />}
                <span style={{ fontSize: 11, fontWeight: 700, color: s.trend > 0 ? "var(--color-text-success)" : "var(--color-text-error)" }}>
                  {s.trend > 0 ? "+" : ""}{s.trend}
                </span>
              </div>
            )}
            {s.trend === 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 6,
                background: "var(--color-surface-neutral-subtle)", border: "1px solid var(--border)",
              }}>
                <Icons.Minus size={11} style={{ color: "var(--color-text-subtitle)" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-subtitle)" }}>0</span>
              </div>
            )}
          </div>
          <span style={{ fontSize: 12, color: "var(--color-text-subtitle)", marginTop: 8, display: "block" }}>{s.label}</span>
          {(() => {
            const entityTab = studio.entityTabs?.find(t => t.statLabel === s.label)
            if (!entityTab || !onNavigateToTab) return null
            return (
              <button
                onClick={() => onNavigateToTab(entityTab.id)}
                style={{
                  marginTop: 12, background: "none", border: "none", cursor: "pointer", padding: 0,
                  display: "flex", alignItems: "center", gap: 4,
                  fontSize: 11, fontWeight: 600, color: "var(--primary)",
                }}
              >
                View all <Icons.ArrowRight size={10} />
              </button>
            )
          })()}
        </div>
      ),
    })),

    // ── Workspace coverage (wide, same row height as a KPI) ──────────────────
    {
      uid:         "workspace-coverage",
      title:       "Workspace coverage",
      colSpan:     2 as const,
      rowSpan:     3,
      minRowSpan:  3,
      autoExpand:  false,
      showRefresh: false,
      showMenu:    false,
      content: (
        <div style={{ padding: "4px 16px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-subtitle)" }}>Members with access</span>
            <span style={{ fontSize: 26, fontWeight: 700, color: "var(--color-text-title)", lineHeight: 1 }}>
              {studio.membersWithAccess}
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-subtitle)" }}> / {studio.totalMembers}</span>
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: "var(--border)", marginBottom: 6 }}>
            <div style={{ height: "100%", width: `${accessPct}%`, borderRadius: 4, background: studio.accentColor }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "var(--color-text-subtitle)" }}>{accessPct}% of workspace has access</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: studio.accentColor }}>{studio.totalMembers - studio.membersWithAccess} without access</span>
          </div>
        </div>
      ),
    },

    // ── Groups with access (narrow) ──────────────────────────────────────────
    {
      uid:         "groups-access",
      title:       `Groups with access (${groupsWithAccess.length})`,
      colSpan:     1 as const,
      rowSpan:     6,
      minRowSpan:  4,
      showRefresh: false,
      showMenu:    false,
      content: (
        <div style={{ padding: "0 0 12px" }}>
          {groupsWithAccess.map((g, i) => (
            <div key={g.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
              borderBottom: i < groupsWithAccess.length - 1 ? "1px solid var(--border)" : "none",
            }}>
              <HighlightIcon size="sm" variant="informative" iconName="Users" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", lineHeight: 1 }}>{g.name}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-subtitle)", marginTop: 2 }}>{g.members} members</div>
              </div>
              <Tag variant="success" size="sm">Access</Tag>
            </div>
          ))}
          {studio.groups.filter(g => !g.access).map((g, i, arr) => (
            <div key={g.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
              borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
              opacity: 0.45,
            }}>
              <HighlightIcon size="sm" variant="neutral" iconName="Users" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", lineHeight: 1 }}>{g.name}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-subtitle)", marginTop: 2 }}>{g.members} members</div>
              </div>
              <Tag variant="secondary" size="sm">No access</Tag>
            </div>
          ))}
        </div>
      ),
    },

    // ── Role access matrix (wide) ────────────────────────────────────────────
    {
      uid:         "role-access",
      title:       "Role-based access",
      colSpan:     2 as const,
      showRefresh: false,
      showMenu:    false,
      rowSpan:    6,
      minRowSpan: 4,
      content: (
        <div style={{ padding: "0 0 12px" }}>
          {studio.roles.map((r, i) => (
            <div key={r.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: i < studio.roles.length - 1 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <HighlightIcon size="sm" variant={ROLE_HIGHLIGHT[r.access]} iconName="ShieldCheck" />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", lineHeight: 1 }}>{r.name}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-subtitle)", marginTop: 3 }}>
                    {ROLE_DESCRIPTION[r.access]}
                  </div>
                </div>
              </div>
              <Tag variant={ROLE_ACCESS_TAG[r.access]} size="sm">{ROLE_ACCESS_LABEL[r.access]}</Tag>
            </div>
          ))}
        </div>
      ),
    },
  ]

  return <WidgetCanvasView initialSlots={slots} />
}

// ─── Detail tab: Permissions ──────────────────────────────────────────────────

function PermissionsTab({ studio }: { studio: Studio }) {
  const [subTab,    setSubTab]  = useState<"groups" | "roles">("groups")
  const [groups,    setGroups]  = useState<GroupAccess[]>(studio.groups)
  const [search,    setSearch]  = useState("")
  const [filter,    setFilter]  = useState<"all" | "access" | "no-access">("all")
  const [dirty,     setDirty]   = useState(false)

  const SUB_TABS = [
    { id: "groups", label: "Groups" },
    { id: "roles",  label: "Roles"  },
  ]

  const filteredGroups = groups.filter(g => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === "all" ? true : filter === "access" ? g.access : !g.access
    return matchSearch && matchFilter
  })

  function toggleGroup(id: string) {
    setGroups(prev => prev.map(x => x.id === id ? { ...x, access: !x.access } : x))
    setDirty(true)
  }

  const withAccess    = groups.filter(g => g.access).length
  const withoutAccess = groups.length - withAccess

  return (
    <div style={{ maxWidth: 760 }}>
      {/* Sub-tab bar */}
      <div style={{ borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
        <Tabs items={SUB_TABS} activeId={subTab} onChange={v => { setSubTab(v as "groups" | "roles"); setSearch(""); setFilter("all") }} size="s" />
      </div>

      {subTab === "groups" && (
        <div>
          {/* Toolbar */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, flex: 1,
              background: "var(--surface-raised)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "0 12px", height: 36,
            }}>
              <Icons.Search size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search groups…"
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  fontSize: 13, color: "var(--foreground)",
                }}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--muted-foreground)" }}>
                  <Icons.X size={12} />
                </button>
              )}
            </div>
            {(["all", "access", "no-access"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  background: filter === f ? "var(--primary)" : "var(--surface-raised)",
                  color: filter === f ? "var(--primary-foreground)" : "var(--muted-foreground)",
                  border: filter === f ? "1px solid var(--primary)" : "1px solid var(--border)",
                }}
              >
                {f === "all" ? `All (${groups.length})` : f === "access" ? `With access (${withAccess})` : `No access (${withoutAccess})`}
              </button>
            ))}
          </div>

          {/* List */}
          <CardContainer variant="default" size="sm" className="p-0 overflow-hidden">
            {filteredGroups.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                No groups match your search
              </div>
            ) : filteredGroups.map((g, i) => (
              <div key={g.id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "11px 16px",
                borderBottom: i < filteredGroups.length - 1 ? "1px solid var(--border)" : "none",
              }}>
                {/* The tile says whether this group reaches the studio at all —
                    which is a state, so it is a semantic tint, not the studio's
                    own accent hex. */}
                <HighlightIcon size="md" variant={g.access ? "informative" : "neutral"} iconName="Users" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", lineHeight: 1 }}>{g.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-subtitle)", marginTop: 3 }}>{g.members} members</div>
                </div>
                <Tag variant={g.access ? "success" : "secondary"} size="sm">{g.access ? "Access" : "No access"}</Tag>
                <Toggle checked={g.access} onChange={() => toggleGroup(g.id)} size="sm" />
              </div>
            ))}
          </CardContainer>

          {dirty && (
            <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
              <Button variant="primary" size="sm" onClick={() => setDirty(false)}>Save changes</Button>
              <Button variant="secondary" size="sm" onClick={() => { setGroups(studio.groups); setDirty(false) }}>Discard</Button>
            </div>
          )}
        </div>
      )}

      {subTab === "roles" && (
        <div>
          {/* Summary bar */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            {(["full", "limited", "none"] as const).map(level => {
              const count = studio.roles.filter(r => r.access === level).length
              return (
                <div key={level} style={{
                  flex: 1, padding: "10px 14px", borderRadius: 10,
                  background: "var(--surface-raised)", border: "1px solid var(--border)",
                }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", lineHeight: 1 }}>{count}</div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-subtitle)", marginTop: 4 }}>
                    {ROLE_ACCESS_LABEL[level]}
                  </div>
                </div>
              )
            })}
          </div>

          <CardContainer variant="default" size="sm" className="p-0 overflow-hidden">
            {studio.roles.map((r, i) => (
              <div key={r.id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "13px 16px",
                borderBottom: i < studio.roles.length - 1 ? "1px solid var(--border)" : "none",
              }}>
                <HighlightIcon size="md" variant={ROLE_HIGHLIGHT[r.access]} iconName="ShieldCheck" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", lineHeight: 1 }}>{r.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-subtitle)", marginTop: 3 }}>{ROLE_DESCRIPTION[r.access]}</div>
                </div>
                <Tag variant={ROLE_ACCESS_TAG[r.access]} size="sm">{ROLE_ACCESS_LABEL[r.access]}</Tag>
              </div>
            ))}
          </CardContainer>
        </div>
      )}
    </div>
  )
}

// ─── Detail tab: Settings ─────────────────────────────────────────────────────

const CONFIG_SECTIONS = [
  { id: "general",    label: "General"    },
  { id: "policies",   label: "Policies"   },
  { id: "compliance", label: "Compliance" },
] as const

type ConfigSectionId = typeof CONFIG_SECTIONS[number]["id"]

function configSectionItems(config: Studio["config"], id: ConfigSectionId): ConfigItem[] {
  if (!config) return []
  if (id === "general")    return config.general ?? []
  if (id === "policies")   return config.policies ?? []
  return config.compliance?.items ?? []
}

function allConfigItems(config: Studio["config"]): ConfigItem[] {
  return CONFIG_SECTIONS.flatMap(s => configSectionItems(config, s.id))
}

/** Renders the control for one ConfigItem. Never mutates — hands the caller a new value. */
function ConfigControl({
  item, value, onChange,
}: { item: ConfigItem; value: boolean | number | string; onChange: (next: boolean | number | string) => void }) {
  if (item.type === "toggle") {
    return <Toggle checked={Boolean(value)} onChange={() => onChange(!value)} size="sm" />
  }

  if (item.type === "stepper") {
    const current = Number(value)
    const min = item.min ?? 0
    const max = item.max ?? Number.MAX_SAFE_INTEGER
    const step = (delta: number) => onChange(Math.min(max, Math.max(min, current + delta)))
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 2, flexShrink: 0,
        background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 8,
      }}>
        <button
          onClick={() => step(-1)}
          disabled={current <= min}
          style={{
            width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
            background: "none", border: "none", padding: 0,
            cursor: current <= min ? "not-allowed" : "pointer",
            opacity: current <= min ? 0.4 : 1,
            color: "var(--foreground)",
          }}
        >
          <Icons.Minus size={12} />
        </button>
        <span style={{ minWidth: 34, textAlign: "center", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{current}</span>
        <button
          onClick={() => step(+1)}
          disabled={current >= max}
          style={{
            width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
            background: "none", border: "none", padding: 0,
            cursor: current >= max ? "not-allowed" : "pointer",
            opacity: current >= max ? 0.4 : 1,
            color: "var(--foreground)",
          }}
        >
          <Icons.Plus size={12} />
        </button>
      </div>
    )
  }

  if (item.type === "select") {
    return (
      <select
        value={String(value)}
        onChange={e => onChange(e.target.value)}
        style={{
          flexShrink: 0, height: 32, padding: "0 10px", borderRadius: 8,
          background: "var(--surface-raised)", border: "1px solid var(--border)",
          fontSize: 13, fontWeight: 500, color: "var(--foreground)",
        }}
      >
        {(item.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }

  return null
}

function SettingsRow({
  label, description, isLast, children,
}: { label: string; description: string; isLast: boolean; children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 16, padding: "14px 16px",
      borderBottom: isLast ? "none" : "1px solid var(--border)",
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", lineHeight: 1, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-body)", lineHeight: "20px" }}>{description}</div>
      </div>
      <div style={{ paddingTop: 2 }}>{children}</div>
    </div>
  )
}

function SettingsTab({ studio }: { studio: Studio }) {
  const [toggles, setToggles] = useState<StudioToggle[]>(studio.settings)
  const [values,  setValues]  = useState<Record<string, boolean | number | string>>(
    () => Object.fromEntries(allConfigItems(studio.config).map(i => [i.id, i.value])),
  )

  const availableSections = CONFIG_SECTIONS.filter(s => configSectionItems(studio.config, s.id).length > 0)
  const [section, setSection] = useState<ConfigSectionId>(availableSections[0]?.id ?? "general")

  const sectionItems = configSectionItems(studio.config, section)
  const hasConfig    = availableSections.length > 0

  if (toggles.length === 0 && !hasConfig) {
    return (
      <div style={{ maxWidth: 680, padding: "32px 0", color: "var(--muted-foreground)", fontSize: 13 }}>
        This studio has no configurable settings yet.
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Plain studio toggles */}
      {toggles.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted-foreground)", marginBottom: 10 }}>Studio settings</div>
          <CardContainer variant="default" size="sm" className="p-0 overflow-hidden">
            {toggles.map((t, i) => (
              <SettingsRow key={t.id} label={t.label} description={t.description} isLast={i === toggles.length - 1}>
                <Toggle
                  checked={t.value}
                  onChange={() => setToggles(prev => prev.map(x => x.id === t.id ? { ...x, value: !x.value } : x))}
                  size="sm"
                />
              </SettingsRow>
            ))}
          </CardContainer>
        </>
      )}

      {/* Structured config: General / Policies / Compliance */}
      {hasConfig && (
        <div style={{ marginTop: toggles.length > 0 ? 28 : 0 }}>
          <div style={{ borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
            <Tabs
              items={availableSections.map(s => ({ id: s.id, label: s.label }))}
              activeId={section}
              onChange={v => setSection(v as ConfigSectionId)}
              size="s"
            />
          </div>

          <CardContainer variant="default" size="sm" className="p-0 overflow-hidden">
            {sectionItems.map((item, i) => (
              <SettingsRow key={item.id} label={item.label} description={item.description} isLast={i === sectionItems.length - 1}>
                <ConfigControl
                  item={item}
                  value={values[item.id]}
                  onChange={next => setValues(prev => ({ ...prev, [item.id]: next }))}
                />
              </SettingsRow>
            ))}
          </CardContainer>

          {section === "compliance" && studio.config?.compliance?.exportLabel && (
            <div style={{ marginTop: 12 }}>
              <Button variant="secondary" size="sm">{studio.config.compliance.exportLabel}</Button>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <Button variant="primary" size="sm">Save settings</Button>
      </div>
    </div>
  )
}

// ─── Studio detail (inner screen) ────────────────────────────────────────────

function StudioDetailScreen({
  studio, onBack, onNavigate,
}: { studio: Studio; onBack: () => void; onNavigate?: (id: string) => void }) {
  const [tab, setTab] = useState("overview")

  const TAB_ITEMS = [
    { id: "overview",     label: "Overview"    },
    ...(studio.entityTabs ?? []).map(t => ({ id: t.id, label: t.label })),
    { id: "permissions",  label: "Permissions" },
    { id: "settings",     label: "Settings"    },
  ]

  const activeEntityTab = studio.entityTabs?.find(t => t.id === tab)

  return (
    <ScreenLayout
      workspaceName="Avance Financial"
      userName="Thomas Gonzalez"
      userEmail="thomas.gonzalez@aimsos.ai"
      sidebarItems={SIDEBAR}
      activeSidebarId="studios"
      onSidebarItemClick={onNavigate}
      header={(isScrolled) => (
        <Header
          size={isScrolled ? "compress" : "size-l"}
          title={studio.name}
          description={studio.description}
          backButton={!isScrolled}
          onBack={onBack}
        />
      )}
    >
      {/* Tab bar */}
      <div style={{ borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
        <Tabs items={TAB_ITEMS} activeId={tab} onChange={setTab} size="m" />
      </div>

      {/* Tab content */}
      {tab === "overview"    && <OverviewTab    studio={studio} onNavigateToTab={setTab} />}
      {activeEntityTab       && <EntityListTab  tab={activeEntityTab} accentColor={studio.accentColor} />}
      {tab === "permissions" && <PermissionsTab studio={studio} />}
      {tab === "settings"    && <SettingsTab    studio={studio} />}
    </ScreenLayout>
  )
}

// ─── Studios list screen ──────────────────────────────────────────────────────

function StudiosListScreen({
  onSelect, onNavigate,
}: { onSelect: (s: Studio) => void; onNavigate?: (id: string) => void }) {
  return (
    <ScreenLayout
      workspaceName="Avance Financial"
      userName="Thomas Gonzalez"
      userEmail="thomas.gonzalez@aimsos.ai"
      sidebarItems={SIDEBAR}
      activeSidebarId="studios"
      onSidebarItemClick={onNavigate}
      header={(isScrolled) => (
        <Header
          size={isScrolled ? "compress" : "size-l"}
          title="Studios"
          description="Manage studio access, settings, and usage across the workspace"
        />
      )}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {STUDIOS.map(studio => (
          <StudioCard key={studio.id} studio={studio} onClick={() => onSelect(studio)} />
        ))}
      </div>
    </ScreenLayout>
  )
}

// ─── Root screen (manages navigation state) ───────────────────────────────────

export function AdminStudiosScreen({ onNavigate }: { onNavigate?: (id: string) => void } = {}) {
  const [selected, setSelected] = useState<Studio | null>(null)

  if (selected) {
    return (
      <StudioDetailScreen
        studio={selected}
        onBack={() => setSelected(null)}
        onNavigate={onNavigate}
      />
    )
  }

  return (
    <StudiosListScreen
      onSelect={setSelected}
      onNavigate={onNavigate}
    />
  )
}
