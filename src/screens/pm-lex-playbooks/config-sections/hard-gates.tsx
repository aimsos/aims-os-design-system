import { useState } from "react"
import { TriangleAlert, ArrowRight, RotateCcw, Plus, X } from "lucide-react"
import { CardContainer } from "@/components/ui/card-container"
import { Tag } from "@/components/ui/tag"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ModalDialog } from "@/components/ui/modal-dialog"
import { FormSections, FormSection, FieldHeading, HelperText, SelectField } from "./shared"
import {
  TENANT_GATE_CATALOG, type TenantGateDef, type GateOverrideState, type HardGatesDraft,
} from "./types"

const SUB = "var(--field-supporting)"
const TXT = "var(--foreground)"

const CUSTOM_GATE_ACTIONS = ["Suppress Playbook", "Require Approval", "Skip Step", "Log Only"] as const

export interface HardGatesSectionProps {
  value:    HardGatesDraft
  onChange: (patch: Partial<HardGatesDraft>) => void
}

// ── Override confirmation modal ──────────────────────────────────────────
//
// Not a destructive action (nothing is deleted, no data loss), so it does
// NOT follow the Delete/Archive tone table (error/warning, destructive:true
// on Delete) from the detail-shell prompt — it's its own warning-toned
// confirmation for a real but reversible change.
//
// ModalDialog's `title`/`description` are typed as plain strings, so there's
// no true "eyebrow above the title" slot to compose against — the closest
// faithful rendering with the real component is the eyebrow as the first
// line inside `slot` (which does accept a ReactNode), just below the
// description rather than above the title.
function OverrideGateModal({ gate, isOpen, onClose, onConfirm }: {
  gate: TenantGateDef | null
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState("")

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={() => { setReason(""); onClose() }}
      variant="confirmation"
      tone="warning"
      iconName="TriangleAlert"
      title={gate ? `Override ${gate.name}?` : "Override this gate?"}
      description="You are overriding a tenant-level gate setting for this playbook. This action will be logged in the audit trail."
      ctaPrimary={{ label: "Confirm Override", onClick: () => { onConfirm(reason); setReason("") } }}
      ctaSecondary={{ label: "Cancel" }}
      slot={
        <div className="flex flex-col gap-[8px]">
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: SUB }}>CONFIRM TENANT OVERRIDE</span>
          <div>
            <FieldHeading>Reason for override</FieldHeading>
            <Textarea
              placeholder="Optional context for the audit trail..."
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>
        </div>
      }
    />
  )
}

// ── One tenant gate card ─────────────────────────────────────────────────

const STATE_BADGE: Record<GateOverrideState, { label: string; variant: "neutral" | "alert" | "informative" }> = {
  inherited:       { label: "Inherited from tenant settings", variant: "neutral" },
  overridden:      { label: "Overridden for this playbook",   variant: "alert" },
  "pending-review": { label: "Pending Council review",         variant: "informative" },
}

function GateCard({ gate, state, onOverride, onRevert }: {
  gate: TenantGateDef
  state: GateOverrideState
  onOverride: () => void
  onRevert: () => void
}) {
  const badge = STATE_BADGE[state]
  return (
    <CardContainer size="sm" className="flex flex-col gap-[8px]">
      <div style={{ fontSize: 13, fontWeight: 600, color: TXT }}>{gate.name}</div>
      <p style={{ fontSize: 12, color: SUB, margin: 0, lineHeight: 1.5 }}>{gate.description}</p>
      <div className="flex items-center justify-between" style={{ marginTop: 4 }}>
        <Tag variant={badge.variant} size="sm">{badge.label}</Tag>
        {state === "inherited" ? (
          <button
            onClick={onOverride}
            className="inline-flex items-center gap-[4px]"
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--primary)" }}
          >
            Override for this playbook <ArrowRight size={12} />
          </button>
        ) : (
          <button
            onClick={onRevert}
            className="inline-flex items-center gap-[4px]"
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: SUB }}
          >
            <RotateCcw size={12} /> Revert to tenant default
          </button>
        )}
      </div>
    </CardContainer>
  )
}

// ── Custom gates list ─────────────────────────────────────────────────────

function CustomGatesList({ value, onChange }: HardGatesSectionProps) {
  function addGate() {
    onChange({ customGates: [...value.customGates, { id: `hg-new-${Date.now()}`, text: "", action: "Suppress Playbook" }] })
  }
  function updateGate(id: string, patch: Partial<{ text: string; action: string }>) {
    onChange({ customGates: value.customGates.map(g => g.id === id ? { ...g, ...patch } : g) })
  }
  function removeGate(id: string) {
    onChange({ customGates: value.customGates.filter(g => g.id !== id) })
  }

  return (
    <FormSection title="Custom Gates">
      <p style={{ fontSize: 12, color: SUB, margin: 0 }}>
        Define rules that must be respected before this playbook can run. These constraints override default NBA behavior and are enforced during execution.
      </p>

      <div className="flex justify-end">
        <Button variant="secondary" size="sm" icon={<Plus size={13} />} onClick={addGate}>Add Custom Gate</Button>
      </div>

      {value.customGates.length > 0 && (
        <div className="flex flex-col gap-[10px]">
          {value.customGates.map((g, i) => (
            <div key={g.id} className="flex items-start gap-[8px]">
              <span style={{ fontSize: 12, fontWeight: 600, color: SUB, width: 56, flexShrink: 0, paddingTop: 10 }}>
                Gate {i + 1}
              </span>
              <div className="flex-1 min-w-0 flex flex-col gap-[8px]">
                <Textarea
                  placeholder="e.g. Account is not already in an active save motion"
                  value={g.text}
                  onChange={e => updateGate(g.id, { text: e.target.value })}
                />
                <div style={{ maxWidth: 220 }}>
                  <SelectField
                    placeholder="Action"
                    value={g.action}
                    options={CUSTOM_GATE_ACTIONS}
                    onChange={v => updateGate(g.id, { action: v })}
                  />
                </div>
              </div>
              <Button variant="tertiary" size="sm" iconPosition="alone" icon={<X size={14} />} onClick={() => removeGate(g.id)} aria-label={`Remove Gate ${i + 1}`} />
            </div>
          ))}
        </div>
      )}
    </FormSection>
  )
}

// ── Section ────────────────────────────────────────────────────────────────

export function HardGatesSection({ value, onChange }: HardGatesSectionProps) {
  const [overrideTarget, setOverrideTarget] = useState<TenantGateDef | null>(null)

  const operational = TENANT_GATE_CATALOG.filter(g => g.tier === "operational")
  const legal       = TENANT_GATE_CATALOG.filter(g => g.tier === "legal")

  const anyInherited = TENANT_GATE_CATALOG.some(g => value.gateStates[g.id] === "inherited")

  function setState(id: string, state: GateOverrideState) {
    onChange({ gateStates: { ...value.gateStates, [id]: state } })
  }

  function confirmOverride(reason: string) {
    if (!overrideTarget) return
    // PRODUCT-NOTE: D-C1 — legal override requires review before taking
    // effect. Operational-tier overrides can apply immediately with just an
    // audit record; legal/compliance-tier overrides route to Council review
    // first, so the gate lands in "pending-review" rather than flipping off
    // right away. The source prototype's modal doesn't visually distinguish
    // the two tiers — this is a deliberate functional call, not a gap.
    setState(overrideTarget.id, overrideTarget.tier === "legal" ? "pending-review" : "overridden")
    onChange({ overrideReasons: { ...value.overrideReasons, [overrideTarget.id]: reason } })
    setOverrideTarget(null)
  }

  return (
    <div className="flex flex-col gap-[24px]">
      {anyInherited && (
        <div
          className="flex items-start gap-[10px]"
          style={{ padding: "12px 16px", borderRadius: 8, background: "var(--tag-informative-bg)", border: "1px solid var(--tag-informative-bd)" }}
        >
          <TriangleAlert size={16} style={{ color: "var(--tag-informative-fg)", flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: "var(--tag-informative-fg)", margin: 0, lineHeight: 1.5 }}>
            Tenant defaults applied. These gates are inherited from your tenant settings — override individually if this playbook needs different rules.
          </p>
        </div>
      )}

      <FormSections>
      <FormSection title="Operational Gates">
        <HelperText>These gates control operational eligibility and can be overridden at the playbook level with justification.</HelperText>
        <div className="grid grid-cols-3 gap-[12px]">
          {operational.map(g => (
            <GateCard
              key={g.id}
              gate={g}
              state={value.gateStates[g.id] ?? "inherited"}
              onOverride={() => setOverrideTarget(g)}
              onRevert={() => setState(g.id, "inherited")}
            />
          ))}
        </div>
      </FormSection>

      <FormSection title="Legal & Compliance Gates">
        <HelperText>These gates enforce legal and regulatory requirements. Overrides are subject to compliance review and audit.</HelperText>
        <div className="grid grid-cols-2 gap-[12px]">
          {legal.map(g => (
            <GateCard
              key={g.id}
              gate={g}
              state={value.gateStates[g.id] ?? "inherited"}
              onOverride={() => setOverrideTarget(g)}
              onRevert={() => setState(g.id, "inherited")}
            />
          ))}
        </div>
      </FormSection>

      <CustomGatesList value={value} onChange={onChange} />
      </FormSections>

      <OverrideGateModal
        gate={overrideTarget}
        isOpen={overrideTarget !== null}
        onClose={() => setOverrideTarget(null)}
        onConfirm={confirmOverride}
      />
    </div>
  )
}
