import React from "react"
import { ADMIN_SIDEBAR as SIDEBAR } from "./adminShared"
import * as Icons from "lucide-react"
import { ScreenLayout } from "@/components/layouts/screen-layout"
import { Header }       from "@/components/ui/header"
import { Button }       from "@/components/ui/button"
import { CardContainer } from "@/components/ui/card-container"

// ─── Sidebar ──────────────────────────────────────────────────────────────────


// ─── Types ────────────────────────────────────────────────────────────────────

interface Invoice {
  id: string; date: string; period: string; amount: string
  status: "paid" | "pending" | "failed"; seats: number
}

// ─── Data ────────────────────────────────────────────────────────────────────

const INVOICES: Invoice[] = [
  { id: "INV-2026-08", date: "Aug 1, 2026",  period: "Aug 2026",  amount: "$12,400.00", status: "paid",    seats: 50 },
  { id: "INV-2026-07", date: "Jul 1, 2026",  period: "Jul 2026",  amount: "$12,400.00", status: "paid",    seats: 50 },
  { id: "INV-2026-06", date: "Jun 1, 2026",  period: "Jun 2026",  amount: "$11,160.00", status: "paid",    seats: 45 },
  { id: "INV-2026-05", date: "May 1, 2026",  period: "May 2026",  amount: "$11,160.00", status: "paid",    seats: 45 },
  { id: "INV-2026-04", date: "Apr 1, 2026",  period: "Apr 2026",  amount: "$9,920.00",  status: "paid",    seats: 40 },
  { id: "INV-2026-03", date: "Mar 1, 2026",  period: "Mar 2026",  amount: "$9,920.00",  status: "paid",    seats: 40 },
]

const COST_BREAKDOWN = [
  { label: "Base platform",     amount: "$8,000.00",  note: "Enterprise plan — 50 seats @ $160/seat" },
  { label: "Governance Studio", amount: "$1,500.00",  note: "Advanced compliance + promotion workflows" },
  { label: "Agentic Studio",    amount: "$1,800.00",  note: "7 active workers, HITL handoffs" },
  { label: "Data Studio",       amount: "$900.00",    note: "14 published models, lineage graph" },
  { label: "AI usage",          amount: "$200.00",    note: "4.18M tokens at $0.048 per 1,000" },
  { label: "Overage",           amount: "$0.00",      note: "No overages this period" },
]

// ─── Shared helpers ───────────────────────────────────────────────────────────

function SectionCard({ title, description, action, children }: {
  title: string; description?: string; action?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <CardContainer variant="default" size="default" className="!p-0 overflow-hidden">
        <div style={{
          padding: "14px 20px", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>{title}</div>
            {description && <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{description}</div>}
          </div>
          {action}
        </div>
        <div>{children}</div>
      </CardContainer>
    </div>
  )
}

function UsageBar({ label, used, total, unit, color, cost }: {
  label: string; used: number; total: number; unit: string; color: string; cost?: string
}) {
  const pct = Math.min(100, Math.round((used / total) * 100))
  const warn = pct >= 80
  const barColor = pct >= 90 ? "var(--badge-error)" : pct >= 80 ? "var(--badge-alert)" : color
  return (
    <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{label}</span>
          {warn && <Icons.AlertTriangle size={12} style={{ color: "var(--badge-alert)" }} />}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {cost && <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{cost}</span>}
          <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontVariantNumeric: "tabular-nums" }}>
            {used.toLocaleString()} / {total.toLocaleString()} {unit}
          </span>
        </div>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "var(--border)" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: barColor, transition: "width 0.4s" }} />
      </div>
      <div style={{ fontSize: 10, color: warn ? "var(--badge-alert)" : "var(--muted-foreground)", marginTop: 3 }}>
        {pct}% used{warn ? " — near limit" : ""}
      </div>
    </div>
  )
}

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanCard() {
  return (
    <div style={{
      border: "1px solid var(--primary)40", borderRadius: 12,
      background: "color-mix(in srgb, var(--primary) 5%, var(--surface))",
      marginBottom: 16, padding: "20px", display: "flex", gap: 16,
    }}>
      {/* Plan badge */}
      <div style={{
        width: 56, height: 56, borderRadius: 12, flexShrink: 0,
        background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff",  // audit-ignore: prototype fixture data
      }}>
        <Icons.Star size={24} fill="currentColor" />
      </div>

      {/* Plan info */}
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: "var(--foreground)" }}>Enterprise</span>
          <span style={{ fontSize: 12, color: "var(--primary)", fontWeight: 700 }}>Active</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 12 }}>
          {[
            { label: "Monthly total",  value: "$12,400" },
            { label: "Seats",          value: "50 / 100" },
            { label: "Next invoice",   value: "Sep 1, 2026" },
          ].map(t => (
            <div key={t.label}>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{t.label}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--foreground)" }}>{t.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "center", flexShrink: 0 }}>
        <Button variant="secondary" size="sm">Add seats</Button>
        <Button variant="secondary" size="sm">Manage plan</Button>
      </div>
    </div>
  )
}

// ─── Payment method ───────────────────────────────────────────────────────────

function PaymentMethod() {
  return (
    <SectionCard title="Payment method" action={<Button variant="secondary" size="sm">Update</Button>}>
      <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 14 }}>
        {/* Card art */}
        <div style={{
          width: 52, height: 34, borderRadius: 6, flexShrink: 0,
          background: "linear-gradient(135deg, #1a56db, #6366f1)",  // audit-ignore: prototype fixture data
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icons.CreditCard size={18} color={"#fff" /* audit-ignore: prototype fixture data */} />

        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>Visa ending in 4411</div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Expires 09 / 2028 · Billing contact: billing@avance.com</div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100,
          background: "var(--badge-success)15", color: "var(--badge-success)",
          border: "1px solid var(--badge-success)30",
        }}>
          Default
        </span>
      </div>
    </SectionCard>
  )
}

// ─── Invoice history ──────────────────────────────────────────────────────────

const STATUS_META = {
  paid:    { label: "Paid",    color: "var(--badge-success)" },
  pending: { label: "Pending", color: "var(--badge-alert)"   },
  failed:  { label: "Failed",  color: "var(--badge-error)"   },
}

function InvoiceHistory() {
  return (
    <SectionCard
      title="Invoice history"
      description={undefined}
      action={
        <Button variant="secondary" size="sm">
          <Icons.Download size={13} style={{ marginRight: 4 }} />
          Download all
        </Button>
      }
    >
      {/* Table header */}
      <div style={{
        display: "grid", gridTemplateColumns: "120px 1fr 80px 80px 80px",
        padding: "8px 20px", fontSize: 11, fontWeight: 700,
        color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.07em",
        borderBottom: "1px solid var(--border)", background: "var(--surface-raised)",
      }}>
        <span>Invoice</span>
        <span>Period</span>
        <span style={{ textAlign: "right" }}>Seats</span>
        <span style={{ textAlign: "right" }}>Amount</span>
        <span style={{ textAlign: "right" }}>Status</span>
      </div>

      {INVOICES.map((inv, i) => {
        const meta = STATUS_META[inv.status]
        return (
          <div key={inv.id} style={{
            display: "grid", gridTemplateColumns: "120px 1fr 80px 80px 80px",
            padding: "11px 20px", alignItems: "center",
            borderBottom: i < INVOICES.length - 1 ? "1px solid var(--border)" : "none",
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", fontVariantNumeric: "tabular-nums" }}>
              {inv.id}
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--foreground)" }}>{inv.period}</div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{inv.date}</div>
            </div>
            <div style={{ textAlign: "right", fontSize: 12, color: "var(--muted-foreground)" }}>{inv.seats}</div>
            <div style={{ textAlign: "right", fontSize: 13, fontWeight: 700, color: "var(--foreground)", fontVariantNumeric: "tabular-nums" }}>
              {inv.amount}
            </div>
            <div style={{ textAlign: "right", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 100,
                background: `${meta.color}15`, color: meta.color,
              }}>
                {meta.label}
              </span>
              <button
                title="Download PDF"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 3, borderRadius: 4 }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--foreground)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--muted-foreground)")}
              >
                <Icons.Download size={13} />
              </button>
            </div>
          </div>
        )
      })}
    </SectionCard>
  )
}

// ─── Cost breakdown ───────────────────────────────────────────────────────────

function CostBreakdown() {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>Cost breakdown</div>
        <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Aug 1 – Aug 26</div>
      </div>
      {COST_BREAKDOWN.map((row, i) => (
        <div key={row.label} style={{
          padding: "10px 18px", borderBottom: i < COST_BREAKDOWN.length - 1 ? "1px solid var(--border)" : "none",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>{row.label}</span>
            <span style={{
              fontSize: 13, fontWeight: 700, color: row.amount === "$0.00" ? "var(--muted-foreground)" : "var(--foreground)",
              fontVariantNumeric: "tabular-nums",
            }}>
              {row.amount}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{row.note}</div>
        </div>
      ))}
      <div style={{
        padding: "12px 18px", background: "var(--surface-raised)", borderTop: "1px solid var(--border)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>Estimated total</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: "var(--foreground)", fontVariantNumeric: "tabular-nums" }}>$12,400.00</span>
      </div>
    </div>
  )
}

// ─── Seat management ──────────────────────────────────────────────────────────

function SeatManagement() {
  const used = 50, total = 100
  const pct = Math.round((used / total) * 100)

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", overflow: "hidden" }}>
      <div style={{
        padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>Seats</div>
        <Button variant="secondary" size="sm">Add seats</Button>
      </div>
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: "var(--foreground)" }}>{used} <span style={{ fontSize: 14, fontWeight: 400, color: "var(--muted-foreground)" }}>/ {total} seats used</span></span>
          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>$160 / seat / mo</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: "var(--border)", marginBottom: 6 }}>
          <div style={{ height: "100%", width: `${pct}%`, borderRadius: 4, background: "var(--primary)" }} />
        </div>
        <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{total - used} seats available · {pct}% utilized</div>

        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { label: "Active",    value: 47, color: "var(--badge-success)" },
            { label: "Invited",   value: 2,  color: "var(--badge-alert)"   },
            { label: "Suspended", value: 1,  color: "var(--badge-error)"   },
            { label: "Available", value: 50, color: "var(--muted-foreground)" },
          ].map(s => (
            <div key={s.label} style={{ padding: "8px 12px", borderRadius: 8, background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function AdminBillingScreen({ onNavigate }: { onNavigate?: (id: string) => void } = {}) {
  return (
    <ScreenLayout
      workspaceName="Avance Financial"
      userName="Thomas Gonzalez"
      userEmail="thomas.gonzalez@aimsos.ai"
      sidebarItems={SIDEBAR}
      activeSidebarId="billing"
      onSidebarItemClick={onNavigate}
      header={(isScrolled) => (
        <Header
          size={isScrolled ? "compress" : "size-l"}
          title="Billing"
          description="Enterprise plan · Next invoice Sep 1, 2026 · Billing contact: billing@avance.com"
          primaryAction={{ label: "Billing portal", icon: Icons.ExternalLink, priority: "secondary" }}
        />
      )}
    >
      {/* Plan card */}
      <PlanCard />

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start" }}>
        {/* Left */}
        <div>
          {/* Usage */}
          <SectionCard title="Usage this period" description="Aug 1 – Aug 26, 2026">
            <UsageBar label="AI usage"              used={4_180_000} total={10_000_000} unit="tokens"   color={"#6366f1" /* audit-ignore: prototype fixture data */} cost="$200.00" />

            <UsageBar label="Active AI workers"    used={7}          total={20}          unit="workers"  color={"#06b6d4" /* audit-ignore: prototype fixture data */} cost="$1,800.00" />

            <UsageBar label="Data Studio models"   used={14}         total={50}          unit="models"   color={"#8b5cf6" /* audit-ignore: prototype fixture data */} cost="$900.00" />

            <UsageBar label="Sandboxes"             used={3}          total={10}          unit="sandboxes" color={"#10b981" /* audit-ignore: prototype fixture data */} cost="included" />

            <UsageBar label="Integrations"         used={6}          total={20}          unit="connected" color={"#0ea5e9" /* audit-ignore: prototype fixture data */} cost="included" />

            <div style={{ padding: "12px 20px", borderTop: "none" }}>
              <Button variant="secondary" size="sm">View detailed usage →</Button>
            </div>
          </SectionCard>

          {/* Invoice history */}
          <InvoiceHistory />

          {/* Payment method */}
          <PaymentMethod />
        </div>

        {/* Right */}
        <div>
          <CostBreakdown />
          <SeatManagement />
        </div>
      </div>
    </ScreenLayout>
  )
}
