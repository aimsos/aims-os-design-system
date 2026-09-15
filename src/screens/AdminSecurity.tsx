import { useState } from "react"
import { ADMIN_SIDEBAR as SIDEBAR } from "./adminShared"
import * as Icons from "lucide-react"
import { ScreenLayout } from "@/components/layouts/screen-layout"
import { Header }       from "@/components/ui/header"
import { Button }       from "@/components/ui/button"
import { Toggle }       from "@/components/ui/toggle"
import { CardContainer } from "@/components/ui/card-container"

// ─── Sidebar ──────────────────────────────────────────────────────────────────


// ─── Types ────────────────────────────────────────────────────────────────────

type MfaPolicy = "off" | "recommended" | "required"
type SessionTimeout = 1 | 4 | 8 | 24 | 72

// ─── Shared components ────────────────────────────────────────────────────────

function SectionCard({ title, description, badge, children }: {
  title: string; description?: string; badge?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <CardContainer variant="default" size="default" className="!p-0 overflow-hidden">
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", gap: 10,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>{title}</span>
              {badge}
            </div>
            {description && (
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{description}</div>
            )}
          </div>
        </div>
        <div style={{ padding: "0 20px" }}>{children}</div>
      </CardContainer>
    </div>
  )
}

function SettingRow({ label, description, children, last }: {
  label: string; description?: string; children: React.ReactNode; last?: boolean
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20,
      padding: "14px 0", borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{label}</div>
        {description && (
          <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{description}</div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700,
      padding: "2px 8px", borderRadius: 100,
      background: ok ? "var(--badge-success)18" : "var(--badge-error)18",
      color: ok ? "var(--badge-success)" : "var(--badge-error)",
      border: `1px solid ${ok ? "var(--badge-success)" : "var(--badge-error)"}30`,
    }}>
      {ok ? <Icons.CheckCircle size={10} /> : <Icons.XCircle size={10} />}
      {label}
    </span>
  )
}

// ─── Security score ───────────────────────────────────────────────────────────

function SecurityScoreCard({ mfaPolicy, ssoEnabled, ipAllowlist, sessionLock }: {
  mfaPolicy: MfaPolicy; ssoEnabled: boolean; ipAllowlist: boolean; sessionLock: boolean
}) {
  const checks = [
    { label: "MFA enforced",        ok: mfaPolicy === "required"            },
    { label: "SSO configured",      ok: ssoEnabled                          },
    { label: "IP allowlist active", ok: ipAllowlist                         },
    { label: "Session binding",     ok: sessionLock                         },
  ]
  const passing = checks.filter(c => c.ok).length
  const score = Math.round((passing / checks.length) * 100)
  const scoreColor = score >= 75 ? "var(--badge-success)" : score >= 50 ? "var(--badge-alert)" : "var(--badge-error)"

  return (
    <div style={{
      border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden",
      background: "var(--surface)", marginBottom: 16,
      display: "grid", gridTemplateColumns: "200px 1fr",
    }}>
      {/* Score dial */}
      <div style={{
        padding: 24, borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: "var(--surface-raised)",
      }}>
        <div style={{
          width: 88, height: 88, borderRadius: "50%", marginBottom: 12,
          border: `6px solid ${scoreColor}`, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: `${scoreColor}10`,
        }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: 10, color: "var(--muted-foreground)", fontWeight: 600, letterSpacing: "0.06em" }}>Security</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", textAlign: "center" }}>
          {score >= 75 ? "Strong" : score >= 50 ? "Moderate" : "At risk"}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted-foreground)", textAlign: "center", marginTop: 2 }}>
          {passing} of {checks.length} checks passing
        </div>
      </div>

      {/* Check list */}
      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted-foreground)", marginBottom: 12, paddingTop: 20 }}>Security checklist</div>
        {checks.map((c, i) => (
          <div key={c.label} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 0", borderBottom: i < checks.length - 1 ? "1px solid var(--border)" : "none",
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
              background: c.ok ? "var(--badge-success)18" : "var(--badge-error)18",
              color: c.ok ? "var(--badge-success)" : "var(--badge-error)",
            }}>
              {c.ok ? <Icons.Check size={11} strokeWidth={2.5} /> : <Icons.X size={11} strokeWidth={2.5} />}
            </div>
            <span style={{ fontSize: 13, color: "var(--foreground)" }}>{c.label}</span>
            {!c.ok && <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--badge-error)", fontWeight: 600 }}>Fix →</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── MFA section ──────────────────────────────────────────────────────────────

function MfaSection({ policy, onChange }: { policy: MfaPolicy; onChange: (p: MfaPolicy) => void }) {
  const options: { id: MfaPolicy; label: string; desc: string }[] = [
    { id: "off",         label: "Off",         desc: "MFA is optional — members choose whether to enroll." },
    { id: "recommended", label: "Recommended", desc: "Members are prompted to enroll but can skip." },
    { id: "required",    label: "Required",    desc: "Members must enroll before accessing the workspace." },
  ]

  const stats = [
    { label: "Enrolled", value: "72%", color: "var(--badge-success)" },
    { label: "Pending",  value: "18%", color: "var(--badge-alert)"   },
    { label: "Exempt",   value: "10%", color: "var(--muted-foreground)" },
  ]

  return (
    <SectionCard
      title="Multi-factor authentication"
      description="Control how members authenticate to the workspace."
      badge={<StatusBadge ok={policy === "required"} label={policy === "required" ? "Enforced" : policy === "recommended" ? "Recommended" : "Off"} />}
    >
      {/* Policy options */}
      <div style={{ paddingTop: 14, paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {options.map(o => {
            const active = policy === o.id
            return (
              <button
                key={o.id}
                onClick={() => onChange(o.id)}
                style={{
                  padding: "12px 14px", borderRadius: 8, textAlign: "left", cursor: "pointer",
                  border: `2px solid ${active ? "var(--primary)" : "var(--border)"}`,
                  background: active ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "var(--surface-raised)",
                  transition: "border-color 0.15s, background 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: "50%", border: `2px solid ${active ? "var(--primary)" : "var(--border)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    {active && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary)" }} />}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{o.label}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.4 }}>{o.desc}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Enrollment stats */}
      <SettingRow label="Enrollment status" description="Across 50 workspace members" last>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {stats.map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "var(--muted-foreground)", fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
          <Button variant="secondary" size="sm">Send reminder</Button>
        </div>
      </SettingRow>
    </SectionCard>
  )
}

// ─── SSO section ──────────────────────────────────────────────────────────────

function SsoSection({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  const [showConfig, setShowConfig] = useState(false)

  return (
    <SectionCard
      title="Single sign-on (SSO)"
      description="Authenticate via your identity provider using SAML 2.0 or OIDC."
      badge={<StatusBadge ok={enabled} label={enabled ? "Active" : "Not configured"} />}
    >
      <SettingRow
        label="Enable SSO"
        description={enabled ? "Members with a verified domain are redirected to your IdP." : "Members sign in with email and password."}
      >
        <Toggle checked={enabled} onChange={onToggle} />
      </SettingRow>

      {enabled && (
        <>
          <SettingRow label="Identity provider" description="SAML 2.0 — Okta Workforce Identity">
            <Button variant="secondary" size="sm" onClick={() => setShowConfig(v => !v)}>
              {showConfig ? "Hide config" : "View config"}
            </Button>
          </SettingRow>

          {showConfig && (
            <div style={{
              margin: "0 0 14px", padding: 14, borderRadius: 8,
              background: "var(--surface-raised)", border: "1px solid var(--border)",
              fontSize: 12, fontFamily: "var(--font-mono, monospace)",
            }}>
              {[
                ["ACS URL",     "https://aims-os.ai/auth/saml/acs"],
                ["Entity ID",   "urn:aimsos:avance-financial"],
                ["Metadata URL","https://aims-os.ai/auth/saml/metadata"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: 12, marginBottom: 6 }}>
                  <span style={{ color: "var(--muted-foreground)", width: 100, flexShrink: 0 }}>{k}</span>
                  <span style={{ color: "var(--foreground)" }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          <SettingRow label="Domain binding" description="avance.com — verified" last>
            <StatusBadge ok label="Verified" />
          </SettingRow>
        </>
      )}

      {!enabled && (
        <SettingRow label="Configuration" description="No identity provider configured" last>
          <Button variant="secondary" size="sm">Set up SSO</Button>
        </SettingRow>
      )}
    </SectionCard>
  )
}

// ─── Session policy section ───────────────────────────────────────────────────

function SessionSection({ timeout, onTimeout, lock, onLock }: {
  timeout: SessionTimeout; onTimeout: (v: SessionTimeout) => void
  lock: boolean; onLock: () => void
}) {
  const timeouts: SessionTimeout[] = [1, 4, 8, 24, 72]
  const label = (h: SessionTimeout) => h === 1 ? "1 hour" : h < 24 ? `${h} hours` : h === 24 ? "24 hours" : "3 days"

  return (
    <SectionCard title="Session policy" description="Control how long members stay signed in.">
      <SettingRow label="Session timeout" description="Members are signed out after this period of inactivity.">
        <select
          value={timeout}
          onChange={e => onTimeout(Number(e.target.value) as SessionTimeout)}
          style={{
            padding: "6px 10px", fontSize: 12, borderRadius: 7, cursor: "pointer",
            border: "1px solid var(--border)", background: "var(--surface)",
            color: "var(--foreground)", outline: "none",
          }}
        >
          {timeouts.map(h => (
            <option key={h} value={h}>{label(h)}</option>
          ))}
        </select>
      </SettingRow>
      <SettingRow
        label="Lock session to device"
        description="Invalidate sessions when the IP address or device fingerprint changes."
        last
      >
        <Toggle checked={lock} onChange={onLock} />
      </SettingRow>
    </SectionCard>
  )
}

// ─── IP allowlist section ─────────────────────────────────────────────────────

interface IpRule { id: string; cidr: string; label: string; enabled: boolean }

function IpAllowlistSection({ rules, onToggleRule, onRemove, onAdd }: {
  rules: IpRule[]; onToggleRule: (id: string) => void; onRemove: (id: string) => void
  onAdd: (rule: IpRule) => void
}) {
  const [cidr, setCidr]   = useState("")
  const [label, setLabel] = useState("")
  const activeCount = rules.filter(r => r.enabled).length

  function handleAdd() {
    const trimmedCidr = cidr.trim()
    if (!trimmedCidr) return
    onAdd({ id: `ip-${Date.now()}`, cidr: trimmedCidr, label: label.trim() || "Custom range", enabled: true })
    setCidr("")
    setLabel("")
  }

  return (
    <SectionCard
      title="IP access control"
      description="Restrict workspace access to specific IP ranges. When active, unlisted IPs are blocked."
      badge={activeCount > 0 ? <StatusBadge ok label={`${activeCount} rules active`} /> : undefined}
    >
      {rules.map(rule => (
        <div key={rule.id} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "11px 0", borderBottom: "1px solid var(--border)",
        }}>
          <Toggle checked={rule.enabled} onChange={() => onToggleRule(rule.id)} />
          <code style={{ fontSize: 12, fontFamily: "var(--font-mono, monospace)", color: "var(--foreground)", flex: 1 }}>
            {rule.cidr}
          </code>
          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{rule.label}</span>
          <button
            onClick={() => onRemove(rule.id)}
            style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 4, borderRadius: 4 }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--badge-error)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--muted-foreground)")}
          >
            <Icons.Trash2 size={13} />
          </button>
        </div>
      ))}

      {/* Add rule */}
      <div style={{ display: "flex", gap: 8, padding: "12px 0" }}>
        <input
          value={cidr}
          onChange={e => setCidr(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          placeholder="CIDR range (e.g. 192.168.1.0/24)"
          style={{
            flex: 2, padding: "7px 10px", fontSize: 12, borderRadius: 7,
            border: "1px solid var(--border)", background: "var(--surface)",
            color: "var(--foreground)", outline: "none", fontFamily: "var(--font-mono, monospace)",
          }}
        />
        <input
          value={label}
          onChange={e => setLabel(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          placeholder="Label (e.g. HQ Mexico City)"
          style={{
            flex: 1, padding: "7px 10px", fontSize: 12, borderRadius: 7,
            border: "1px solid var(--border)", background: "var(--surface)",
            color: "var(--foreground)", outline: "none",
          }}
        />
        <Button variant="secondary" size="sm" onClick={handleAdd}>
          Add rule
        </Button>
      </div>
    </SectionCard>
  )
}

// ─── Recent alerts ────────────────────────────────────────────────────────────

interface SecurityAlert {
  id: string; level: "critical" | "warning" | "info"
  title: string; detail: string; time: string
}

const ALERTS: SecurityAlert[] = [
  { id: "a1", level: "warning",  title: "Account temporarily locked",   detail: "5 failed sign-in attempts — diana.perez@avance.com from 45.76.200.18 (Amsterdam, NL)",  time: "Aug 25 · 08:11" },
  { id: "a2", level: "warning",  title: "New IP address detected",      detail: "thomas.gonzalez@aimsos.ai signed in from 104.28.91.14 — first time from this IP",          time: "Aug 26 · 09:10" },
  { id: "a3", level: "info",     title: "AI worker failure",            detail: "Risk Scoring Pipeline timed out after 30s — 847 records unprocessed",                        time: "Aug 25 · 17:58" },
  { id: "a4", level: "info",     title: "Integration sync error",       detail: "Salesforce CRM — OAuth token expired. Re-authentication required.",                          time: "Aug 20 · 08:00" },
  { id: "a5", level: "critical", title: "Member data access violation", detail: "marcus.silva@avance.com accessed restricted Governance data outside assigned scope",         time: "Aug 24 · 15:50" },
]

const ALERT_META = {
  critical: { color: "var(--badge-error)",   icon: <Icons.AlertOctagon size={14} /> },
  warning:  { color: "var(--badge-alert)",   icon: <Icons.AlertTriangle size={14} /> },
  info:     { color: "var(--primary)",       icon: <Icons.Info size={14} /> },
}

function AlertsSection() {
  const [dismissed, setDismissed] = useState<string[]>([])
  const visible = ALERTS.filter(a => !dismissed.includes(a.id))

  return (
    <SectionCard title="Recent security alerts" description={`${visible.length} active alerts`}>
      {visible.length === 0 ? (
        <div style={{ padding: "24px 0", textAlign: "center", color: "var(--muted-foreground)" }}>
          <Icons.ShieldCheck size={24} style={{ marginBottom: 8, opacity: 0.3 }} />
          <div style={{ fontSize: 13 }}>No active alerts</div>
        </div>
      ) : (
        visible.map((alert, i) => {
          const meta = ALERT_META[alert.level]
          return (
            <div key={alert.id} style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              padding: "12px 0", borderBottom: i < visible.length - 1 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{ color: meta.color, paddingTop: 1, flexShrink: 0 }}>{meta.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 2 }}>{alert.title}</div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.4 }}>{alert.detail}</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>{alert.time}</div>
              </div>
              <button
                onClick={() => setDismissed(d => [...d, alert.id])}
                style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 4, borderRadius: 4, flexShrink: 0 }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--foreground)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--muted-foreground)")}
                title="Dismiss"
              >
                <Icons.X size={13} />
              </button>
            </div>
          )
        })
      )}
    </SectionCard>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

const DEFAULT_IP_RULES: IpRule[] = [
  { id: "ip1", cidr: "189.55.0.0/16",  label: "Office — Monterrey, MX", enabled: true  },
  { id: "ip2", cidr: "200.18.32.0/24", label: "Office — Mexico City, MX", enabled: true },
  { id: "ip3", cidr: "104.28.91.0/24", label: "HQ — San Francisco, CA",  enabled: true  },
  { id: "ip4", cidr: "72.14.192.0/24", label: "Office — New York, NY",   enabled: false },
]

export function AdminSecurityScreen({ onNavigate }: { onNavigate?: (id: string) => void } = {}) {
  const [mfaPolicy, setMfaPolicy]       = useState<MfaPolicy>("recommended")
  const [ssoEnabled, setSsoEnabled]     = useState(true)
  const [sessionTimeout, setSessionTimeout] = useState<SessionTimeout>(8)
  const [sessionLock, setSessionLock]   = useState(false)
  const [ipRules, setIpRules]           = useState<IpRule[]>(DEFAULT_IP_RULES)

  const activeIpRules = ipRules.filter(r => r.enabled).length > 0

  function toggleIpRule(id: string) {
    setIpRules(rules => rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r))
  }

  function removeIpRule(id: string) {
    setIpRules(rules => rules.filter(r => r.id !== id))
  }
  function addIpRule(rule: IpRule) {
    setIpRules(rules => [...rules, rule])
  }

  return (
    <ScreenLayout
      workspaceName="Avance Financial"
      userName="Thomas Gonzalez"
      userEmail="thomas.gonzalez@aimsos.ai"
      sidebarItems={SIDEBAR}
      activeSidebarId="security"
      onSidebarItemClick={onNavigate}
      header={(isScrolled) => (
        <Header
          size={isScrolled ? "compress" : "size-l"}
          title="Security"
          description="Authentication, session, and access policies for Avance Financial"
          primaryAction={{ label: "Save changes", icon: Icons.Save }}
        />
      )}
    >
      {/* Security score */}
      <SecurityScoreCard
        mfaPolicy={mfaPolicy}
        ssoEnabled={ssoEnabled}
        ipAllowlist={activeIpRules}
        sessionLock={sessionLock}
      />

      {/* Sections */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
        <div>
          <MfaSection    policy={mfaPolicy} onChange={setMfaPolicy} />
          <SsoSection    enabled={ssoEnabled} onToggle={() => setSsoEnabled(v => !v)} />
          <SessionSection timeout={sessionTimeout} onTimeout={setSessionTimeout} lock={sessionLock} onLock={() => setSessionLock(v => !v)} />
          <IpAllowlistSection rules={ipRules} onToggleRule={toggleIpRule} onRemove={removeIpRule} onAdd={addIpRule} />
        </div>

        {/* Right column */}
        <div>
          <AlertsSection />

          {/* Quick stats */}
          <div style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>Policy summary</div>
            </div>
            <div style={{ padding: "0 18px" }}>
              {[
                { label: "MFA policy",       value: mfaPolicy === "required" ? "Required" : mfaPolicy === "recommended" ? "Recommended" : "Off", ok: mfaPolicy === "required" },
                { label: "SSO",              value: ssoEnabled ? "Okta SAML 2.0" : "Not configured", ok: ssoEnabled },
                { label: "Session timeout",  value: sessionTimeout < 24 ? `${sessionTimeout}h` : sessionTimeout === 24 ? "24h" : "3 days", ok: sessionTimeout <= 8 },
                { label: "Device binding",   value: sessionLock ? "Enabled" : "Disabled", ok: sessionLock },
                { label: "IP allowlist",     value: activeIpRules ? `${ipRules.filter(r=>r.enabled).length} rules` : "Inactive", ok: activeIpRules },
                { label: "Encryption",       value: "AES-256 (at rest)", ok: true },
                { label: "TLS",              value: "TLS 1.3", ok: true },
                { label: "Data residency",   value: "US East (us-east-1)", ok: true },
              ].map((row, i, arr) => (
                <div key={row.label} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                }}>
                  <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{row.label}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>{row.value}</span>
                    <div style={{ color: row.ok ? "var(--badge-success)" : "var(--badge-error)" }}>
                      {row.ok ? <Icons.CheckCircle size={12} /> : <Icons.XCircle size={12} />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ScreenLayout>
  )
}
