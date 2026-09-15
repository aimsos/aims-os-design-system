import { useState } from "react"
import { ADMIN_SIDEBAR as SIDEBAR } from "./adminShared"
import * as Icons from "lucide-react"
import { ScreenLayout } from "@/components/layouts/screen-layout"
import { Header }        from "@/components/ui/header"
import { Button }        from "@/components/ui/button"
import { Tabs }          from "@/components/ui/tabs"
import { HighlightIcon } from "@/components/ui/highlight-icon"

// ─── Types ────────────────────────────────────────────────────────────────────

type RequestStatus = "pending" | "approved" | "rejected" | "needs-info"

interface IntegrationRequest {
  id: string
  name: string
  category: string
  icon: string
  description: string
  justification: string
  requestedAt: string
  updatedAt: string
  status: RequestStatus
  reviewer?: string
  reviewerNote?: string
  urgency: "low" | "medium" | "high"
}

// ─── Data ────────────────────────────────────────────────────────────────────

const STATUS_META: Record<RequestStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:    { label: "Pending review",  color: "var(--badge-alert)",   bg: "var(--badge-alert)15",   icon: <Icons.Clock size={11} />       },
  approved:   { label: "Approved",        color: "var(--badge-success)", bg: "var(--badge-success)15", icon: <Icons.CheckCircle size={11} /> },
  rejected:   { label: "Rejected",        color: "var(--badge-error)",   bg: "var(--badge-error)15",   icon: <Icons.XCircle size={11} />     },
  "needs-info": { label: "Needs info",    color: "var(--primary)",       bg: "var(--primary)15",       icon: <Icons.MessageCircle size={11} /> },
}

const URGENCY_META = {
  low:    { label: "Low",    color: "var(--muted-foreground)" },
  medium: { label: "Medium", color: "var(--badge-alert)"     },
  high:   { label: "High",   color: "var(--badge-error)"     },
}

const REQUESTS: IntegrationRequest[] = [
  {
    id: "r1",
    name: "Looker", category: "Analytics", icon: "BarChart2",
    description: "Business intelligence and data exploration platform by Google.",
    justification: "The Risk & Compliance team needs Looker connected to pull regulatory reporting dashboards directly into Governance Studio without manual exports.",
    requestedAt: "Aug 24, 2026", updatedAt: "Aug 25, 2026",
    status: "needs-info",
    reviewer: "Maria García",
    reviewerNote: "Please confirm which Looker instance URL and what OAuth scopes are needed. Also clarify whether this will be a read-only connection.",
    urgency: "high",
  },
  {
    id: "r2",
    name: "Zendesk", category: "Support", icon: "Headphones",
    description: "Customer support and ticketing platform.",
    justification: "Needed so the AI worker monitoring customer escalations can pull open ticket context in real time to improve triage accuracy.",
    requestedAt: "Aug 20, 2026", updatedAt: "Aug 20, 2026",
    status: "pending",
    urgency: "medium",
  },
  {
    id: "r3",
    name: "Stripe", category: "Payments", icon: "CreditCard",
    description: "Payment processing and financial infrastructure.",
    justification: "The billing reconciliation model requires Stripe charge and refund events to validate monthly revenue vs. the SAP ERP GL entries.",
    requestedAt: "Aug 12, 2026", updatedAt: "Aug 18, 2026",
    status: "approved",
    reviewer: "Maria García",
    reviewerNote: "Approved. IT will send the Stripe webhook secret to your AIMS-OS integration config this week.",
    urgency: "high",
  },
  {
    id: "r4",
    name: "GitHub", category: "Developer Tools", icon: "GitBranch",
    description: "Code hosting, CI/CD, and collaboration.",
    justification: "The engineering team wants AIMS-OS workers to monitor PR reviews and flag code that touches regulated data models — requires read access to repos.",
    requestedAt: "Jul 30, 2026", updatedAt: "Aug 02, 2026",
    status: "rejected",
    reviewer: "Maria García",
    reviewerNote: "Rejected for now — security policy requires a broader review of third-party code-access integrations before any are approved. Will revisit in Q4.",
    urgency: "low",
  },
]

// ─── Request card ─────────────────────────────────────────────────────────────

function RequestCard({
  req,
  expanded,
  onToggle,
  onRespondToInfo,
}: {
  req: IntegrationRequest
  expanded: boolean
  onToggle: () => void
  onRespondToInfo: (id: string, text: string) => void
}) {
  const meta = STATUS_META[req.status]
  const urgMeta = URGENCY_META[req.urgency]
  const [infoReply, setInfoReply] = useState("")

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", background: "var(--surface-raised)", marginBottom: 12 }}>
      {/* Header row */}
      <button
        onClick={onToggle}
        style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "14px 16px" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <HighlightIcon size="md" variant="neutral" iconName={req.icon} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{req.name}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{req.category}</span>
              {/* Urgency */}
              <span style={{ fontSize: 10, fontWeight: 700, color: urgMeta.color }}>● {urgMeta.label} urgency</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
              Requested {req.requestedAt} · Updated {req.updatedAt}
            </div>
          </div>
          {/* Status badge */}
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 5,
            background: meta.bg, color: meta.color,
          }}>
            {meta.icon}{meta.label}
          </span>
          <Icons.ChevronDown size={14} style={{ color: "var(--muted-foreground)", transform: expanded ? "rotate(180deg)" : undefined, transition: "transform 200ms", flexShrink: 0 }} />
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "14px 16px" }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>About</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{req.description}</div>
          </div>
          <div style={{ marginBottom: req.reviewerNote ? 12 : 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Your justification</div>
            <div style={{ fontSize: 12, color: "var(--foreground)", lineHeight: 1.5, padding: "8px 10px", background: "var(--surface)", borderRadius: 6, border: "1px solid var(--border)" }}>
              {req.justification}
            </div>
          </div>

          {req.reviewerNote && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                Reviewer note — {req.reviewer}
              </div>
              <div style={{
                fontSize: 12, color: "var(--foreground)", lineHeight: 1.5,
                padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)",
                borderLeft: `3px solid ${meta.color}`,
                background: meta.bg,
              }}>
                {req.reviewerNote}
              </div>
            </div>
          )}

          {/* Respond to needs-info */}
          {req.status === "needs-info" && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Your response</div>
              <textarea
                value={infoReply}
                onChange={e => setInfoReply(e.target.value)}
                placeholder="Provide the additional information requested…"
                rows={3}
                style={{
                  width: "100%", padding: "8px 10px", fontSize: 12,
                  border: "1px solid var(--border)", borderRadius: 7,
                  background: "var(--surface)", color: "var(--foreground)", outline: "none",
                  resize: "vertical", boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <Button variant="primary" size="sm" onClick={() => { onRespondToInfo(req.id, infoReply); setInfoReply("") }}>
                  Send response
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── New request form ─────────────────────────────────────────────────────────

function NewRequestForm({ onSubmit, onCancel }: { onSubmit: (r: IntegrationRequest) => void; onCancel: () => void }) {
  const [name, setName]             = useState("")
  const [category, setCategory]     = useState("Analytics")
  const [justification, setJust]    = useState("")
  const [urgency, setUrgency]       = useState<"low" | "medium" | "high">("medium")

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "7px 10px", fontSize: 13,
    border: "1px solid var(--border)", borderRadius: 7,
    background: "var(--surface)", color: "var(--foreground)", outline: "none",
    boxSizing: "border-box",
  }

  function submit() {
    if (!name.trim() || !justification.trim()) return
    onSubmit({
      id: `r${Date.now()}`, name: name.trim(), category, icon: "Plug",
      description: `Requested integration: ${name.trim()}.`,
      justification: justification.trim(),
      requestedAt: "Today", updatedAt: "Today",
      status: "pending", urgency,
    })
  }

  return (
    <div style={{ border: "1px solid var(--primary)50", borderRadius: 10, padding: 20, marginBottom: 20, background: "var(--primary)05" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 16 }}>Request a new integration</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Integration name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Looker, Stripe, Notion…" style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
            {["Analytics", "CRM", "Data Warehouse", "Collaboration", "Payments", "ERP", "Developer Tools", "Support", "Marketing", "Storage", "Other"].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Business justification *</label>
        <textarea
          value={justification}
          onChange={e => setJust(e.target.value)}
          placeholder="Explain why this integration is needed and how it will be used…"
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", display: "block", marginBottom: 8 }}>Urgency</label>
        <div style={{ display: "flex", gap: 8 }}>
          {(["low", "medium", "high"] as const).map(u => (
            <button
              key={u}
              onClick={() => setUrgency(u)}
              style={{
                padding: "5px 12px", borderRadius: 6, border: "1px solid",
                borderColor: urgency === u ? URGENCY_META[u].color : "var(--border)",
                background: urgency === u ? `${URGENCY_META[u].color}20` : "var(--surface)",
                color: urgency === u ? URGENCY_META[u].color : "var(--muted-foreground)",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                textTransform: "capitalize",
              }}
            >{u}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={submit}>Submit request</Button>
      </div>
    </div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function AdminMyIntegrationsScreen({ onNavigate }: { onNavigate?: (id: string) => void } = {}) {
  const [tab, setTab]           = useState("active")
  const [requests, setRequests] = useState<IntegrationRequest[]>(REQUESTS)
  const [expandedId, setExpandedId] = useState<string | null>("r1")
  const [showNewForm, setShowNewForm] = useState(false)

  function toggle(id: string) { setExpandedId(prev => prev === id ? null : id) }

  function handleRespondToInfo(id: string, text: string) {
    if (!text.trim()) return
    setRequests(rs => rs.map(r => r.id === id ? { ...r, status: "pending", reviewerNote: undefined } : r))
  }

  function addRequest(r: IntegrationRequest) {
    setRequests(rs => [r, ...rs])
    setShowNewForm(false)
    setExpandedId(r.id)
    setTab("active")
  }

  const filtered = requests.filter(r => {
    if (tab === "active")   return r.status === "pending" || r.status === "needs-info"
    if (tab === "approved") return r.status === "approved"
    if (tab === "rejected") return r.status === "rejected"
    return true
  })

  const counts = {
    active:   requests.filter(r => r.status === "pending" || r.status === "needs-info").length,
    approved: requests.filter(r => r.status === "approved").length,
    rejected: requests.filter(r => r.status === "rejected").length,
    all:      requests.length,
  }

  const needsInfo = requests.filter(r => r.status === "needs-info").length

  return (
    <ScreenLayout
      workspaceName="Avance Financial"
      userName="Thomas Gonzalez"
      userEmail="thomas.gonzalez@aimsos.ai"
      sidebarItems={SIDEBAR}
      activeSidebarId="my-integrations"
      onSidebarItemClick={onNavigate}
      header={(isScrolled) => (
        <Header
          size={isScrolled ? "compress" : "size-l"}
          title="My Integrations"
          description={`${counts.all} requests · ${counts.approved} approved · ${counts.active} in review`}
          primaryAction={{ label: "New request", icon: Icons.Plus, onClick: () => setShowNewForm(true) }}
        />
      )}
    >
      {/* Tabs */}
      <div style={{ borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
        <Tabs
          items={[
            { id: "active",   label: "In review"  },
            { id: "approved", label: "Approved"   },
            { id: "rejected", label: "Rejected"   },
            { id: "all",      label: "All"        },
          ]}
          activeId={tab}
          onChange={setTab}
          size="s"
        />
      </div>

      {needsInfo > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
          padding: "10px 14px", borderRadius: 8,
          background: "var(--primary)10", border: "1px solid var(--primary)25",
        }}>
          <Icons.MessageCircle size={14} style={{ color: "var(--primary)", flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)" }}>
            {needsInfo === 1 ? "1 request needs your response" : `${needsInfo} requests need your response`}
          </span>
          <button
            onClick={() => setTab("active")}
            style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            View
          </button>
        </div>
      )}

      {showNewForm && <NewRequestForm onSubmit={addRequest} onCancel={() => setShowNewForm(false)} />}

      {filtered.length === 0 ? (
        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--muted-foreground)" }}>
          <Icons.Cable size={28} style={{ opacity: 0.25, marginBottom: 10 }} />
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>No requests yet</div>
          <div style={{ fontSize: 12 }}>
            {tab === "active" ? "Submit a request when you need a new integration connected." : `No ${tab} requests.`}
          </div>
        </div>
      ) : (
        filtered.map(r => (
          <RequestCard
            key={r.id}
            req={r}
            expanded={expandedId === r.id}
            onToggle={() => toggle(r.id)}
            onRespondToInfo={handleRespondToInfo}
          />
        ))
      )}
    </ScreenLayout>
  )
}
