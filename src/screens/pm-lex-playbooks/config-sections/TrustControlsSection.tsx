import { Plus, X, Check } from "lucide-react"
import { CardContainer } from "@/components/ui/card-container"
import { Tag } from "@/components/ui/tag"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { OptionCard } from "@/components/experimental/widget-screen-parts"
import { FormSections, FormSection, FieldHeading, HelperText, SelectField } from "./shared"
import {
  TRUST_PRESETS, SENSITIVE_TOPIC_ACTIONS, DEFAULT_HANDOFF_TRIGGERS, DEFAULT_REVIEW_REQUIREMENTS,
  ESCALATION_TIMEOUT_OPTIONS, applyTrustPreset,
  type TrustControlsDraft, type TrustPresetDef, type PostHandoffBehavior,
} from "./types"

const SUB = "var(--field-supporting)"
const TXT = "var(--foreground)"

export interface TrustControlsSectionProps {
  value:    TrustControlsDraft
  onChange: (patch: Partial<TrustControlsDraft>) => void
}

const TOPIC_ACTION_TAG: Record<string, { label: string; variant: "informative" | "error" | "alert" }> = {
  "Require Approval": { label: "Approval", variant: "informative" },
  "Block Action":      { label: "Blocked",  variant: "error" },
  "Flag for Review":   { label: "Flagged",  variant: "alert" },
}

// ── Select Policy Preset ─────────────────────────────────────────────────

function PresetCard({ preset, selected, onSelect }: { preset: TrustPresetDef; selected: boolean; onSelect: () => void }) {
  return (
    <div onClick={onSelect} style={{ cursor: "pointer" }}>
      <CardContainer selected={selected} size="sm" className="flex flex-col gap-[8px] h-full">
        <span style={{ fontSize: 13, fontWeight: 600, color: selected ? "var(--primary)" : TXT }}>{preset.name}</span>
        <p style={{ fontSize: 12, color: SUB, margin: 0, lineHeight: 1.5 }}>{preset.description}</p>
        <div className="flex flex-wrap gap-[6px]">
          {preset.badges.map(b => <Tag key={b} variant="neutral" size="sm">{b}</Tag>)}
        </div>
      </CardContainer>
    </div>
  )
}

function PolicyPreset({ value, onChange }: TrustControlsSectionProps) {
  const preset = TRUST_PRESETS.find(p => p.id === value.selectedPreset) ?? null

  return (
    <FormSection title="Select Policy Preset">
      <p style={{ fontSize: 12, color: SUB, margin: 0 }}>
        Choose a preset to automatically configure trust mode, confidence thresholds, sensitive topics, and handoff behavior. You can customize these settings after selection.
      </p>

      <div className="grid grid-cols-3 gap-[12px]">
        {TRUST_PRESETS.map(p => (
          <PresetCard key={p.id} preset={p} selected={value.selectedPreset === p.id} onSelect={() => onChange(applyTrustPreset(p, value))} />
        ))}
      </div>

      {preset && (
        <>
          <div
            className="flex items-start gap-[8px]"
            style={{ padding: "10px 12px", borderRadius: 8, background: "var(--tag-success-bg)", border: "1px solid var(--tag-success-bd)" }}
          >
            <Check size={14} style={{ color: "var(--tag-success-fg)", flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 12, color: "var(--tag-success-fg)", margin: 0, lineHeight: 1.5 }}>
              Policy applied! All settings below have been pre-configured. You can still customize any setting as needed.
            </p>
          </div>

          <CardContainer size="sm" className="flex flex-col gap-[8px]">
            <span style={{ fontSize: 12, fontWeight: 700, color: SUB, textTransform: "uppercase", letterSpacing: "0.04em" }}>Current Configuration</span>
            <div className="grid grid-cols-2 gap-[10px]">
              <div><span style={{ fontSize: 11, color: SUB }}>Trust Mode</span><div style={{ fontSize: 13, fontWeight: 600, color: TXT }}>{preset.trustModeLabel}</div></div>
              <div><span style={{ fontSize: 11, color: SUB }}>Confidence Threshold</span><div style={{ fontSize: 13, fontWeight: 600, color: TXT }}>{preset.confidenceThreshold}%</div></div>
              <div><span style={{ fontSize: 11, color: SUB }}>Sensitive Topics</span><div style={{ fontSize: 13, fontWeight: 600, color: TXT }}>{value.sensitiveTopics.length} configured</div></div>
              <div><span style={{ fontSize: 11, color: SUB }}>Handoff Behavior</span><div style={{ fontSize: 13, fontWeight: 600, color: TXT }}>{preset.handoffBehaviorLabel}</div></div>
            </div>
          </CardContainer>
        </>
      )}
    </FormSection>
  )
}

// ── Confidence & Review Thresholds ──────────────────────────────────────

const CONFIDENCE_BANDS = [
  { label: "Low Confidence",    range: "0–59%",   note: "Likely approval",   tone: "error"   as const },
  { label: "Medium Confidence", range: "60–84%",  note: "Review suggested",  tone: "alert"   as const },
  { label: "High Confidence",   range: "85–100%", note: "Trusted auto",      tone: "success" as const },
]

function ConfidenceThresholds({ value, onChange }: TrustControlsSectionProps) {
  return (
    <FormSection title="Confidence & Review Thresholds">
      <div>
        <FieldHeading>Default Confidence Threshold</FieldHeading>
        <Slider type="single" min={0} max={100} step={1} value={value.confidenceThreshold} onChange={v => onChange({ confidenceThreshold: v })} />
        <div className="flex justify-between">
          <span style={{ fontSize: 11, color: SUB }}>0% — Always review</span>
          <span style={{ fontSize: 11, color: SUB }}>100% — High confidence</span>
        </div>
        <HelperText>NBA's confidence score must meet or exceed this threshold to use the default routing mode</HelperText>
      </div>

      <Toggle
        checked={value.requireApprovalBelowThreshold}
        onChange={checked => onChange({ requireApprovalBelowThreshold: checked })}
        label="Require approval below threshold"
        description={`When NBA's confidence is below ${value.confidenceThreshold}%, automatically route to approval regardless of default mode`}
      />

      <div className="grid grid-cols-3 gap-[12px]">
        {CONFIDENCE_BANDS.map(band => (
          <CardContainer key={band.label} size="sm" variant={band.tone === "success" ? "green" : band.tone === "alert" ? "yellow" : "reed"} className="flex flex-col gap-[4px]">
            <span style={{ fontSize: 12, fontWeight: 600, color: TXT }}>{band.label}</span>
            <span style={{ fontSize: 11, color: SUB }}>{band.range}</span>
            <span style={{ fontSize: 11, color: SUB }}>{band.note}</span>
          </CardContainer>
        ))}
      </div>
    </FormSection>
  )
}

// ── Sensitive Topics & Guardrails ───────────────────────────────────────

function SensitiveTopics({ value, onChange }: TrustControlsSectionProps) {
  function addTopic() {
    onChange({ sensitiveTopics: [...value.sensitiveTopics, { id: `topic-new-${Date.now()}`, name: "", action: SENSITIVE_TOPIC_ACTIONS[0] }] })
  }
  function updateTopic(id: string, patch: Partial<{ name: string; action: string }>) {
    onChange({ sensitiveTopics: value.sensitiveTopics.map(t => t.id === id ? { ...t, ...patch } : t) })
  }
  function removeTopic(id: string) {
    onChange({ sensitiveTopics: value.sensitiveTopics.filter(t => t.id !== id) })
  }

  return (
    <FormSection title="Sensitive Topics & Guardrails">
      <p style={{ fontSize: 12, color: SUB, margin: 0 }}>Define sensitive content patterns that trigger special handling or blocking</p>

      <div className="flex flex-col gap-[10px]">
        {value.sensitiveTopics.map(topic => {
          const tag = TOPIC_ACTION_TAG[topic.action]
          return (
            <div key={topic.id} className="flex items-center gap-[8px]">
              <Input className="flex-1 min-w-0" placeholder="Topic name" value={topic.name} onChange={e => updateTopic(topic.id, { name: e.target.value })} />
              <div style={{ width: 200, flexShrink: 0 }}>
                <SelectField placeholder="When detected:" value={topic.action} options={SENSITIVE_TOPIC_ACTIONS} onChange={v => updateTopic(topic.id, { action: v })} />
              </div>
              {tag && <Tag variant={tag.variant} size="sm">{tag.label}</Tag>}
              <Button variant="tertiary" size="sm" iconPosition="alone" icon={<X size={14} />} onClick={() => removeTopic(topic.id)} aria-label={`Remove ${topic.name || "topic"}`} />
            </div>
          )
        })}
      </div>

      <div>
        <Button variant="secondary" size="sm" icon={<Plus size={13} />} onClick={addTopic}>Add Topic</Button>
      </div>
    </FormSection>
  )
}

// ── Human Intervention Settings ─────────────────────────────────────────

function HumanIntervention({ value, onChange }: TrustControlsSectionProps) {
  function toggleTrigger(id: string) {
    onChange({ handoffTriggers: value.handoffTriggers.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t) })
  }
  function addCustomTrigger() {
    onChange({ handoffTriggers: [...value.handoffTriggers, { id: `trigger-${Date.now()}`, label: "", subtext: "", enabled: true }] })
  }
  function updateCustomTrigger(id: string, patch: Partial<{ label: string; subtext: string }>) {
    onChange({ handoffTriggers: value.handoffTriggers.map(t => t.id === id ? { ...t, ...patch } : t) })
  }
  function removeTrigger(id: string) {
    onChange({ handoffTriggers: value.handoffTriggers.filter(t => t.id !== id) })
  }

  const isCustom = (id: string) => !DEFAULT_HANDOFF_TRIGGERS.some(t => t.id === id)

  return (
    <FormSection title="Human Intervention Settings">
      <Toggle
        checked={value.aiHandoffEnabled}
        onChange={checked => onChange({ aiHandoffEnabled: checked })}
        label="AI Handoff to Human"
      />

      <div>
        <FieldHeading>Automatic Handoff Triggers</FieldHeading>
        <p style={{ fontSize: 12, color: SUB, margin: "0 0 8px" }}>When AI should stop and transfer control to a human</p>
        <div className="flex flex-col gap-[10px]">
          {value.handoffTriggers.map(trigger => (
            <div key={trigger.id} className="flex items-start gap-[8px]">
              <Checkbox checked={trigger.enabled} onChange={() => toggleTrigger(trigger.id)} size="sm" />
              {isCustom(trigger.id) ? (
                <div className="flex-1 min-w-0 flex flex-col gap-[6px]">
                  <Input placeholder="Custom trigger label" value={trigger.label} onChange={e => updateCustomTrigger(trigger.id, { label: e.target.value })} />
                  <Input placeholder="Helper text (optional)" value={trigger.subtext ?? ""} onChange={e => updateCustomTrigger(trigger.id, { subtext: e.target.value })} />
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 13, fontWeight: 600, color: TXT }}>{trigger.label}</div>
                  {trigger.subtext && <div style={{ fontSize: 11, color: SUB, marginTop: 2 }}>{trigger.subtext}</div>}
                </div>
              )}
              {isCustom(trigger.id) && (
                <Button variant="tertiary" size="sm" iconPosition="alone" icon={<X size={14} />} onClick={() => removeTrigger(trigger.id)} aria-label="Remove custom trigger" />
              )}
            </div>
          ))}
        </div>
        <Button variant="tertiary" size="sm" icon={<Plus size={13} />} onClick={addCustomTrigger} style={{ marginTop: 8 }}>Add</Button>
      </div>
    </FormSection>
  )
}

// ── Post-Handoff Behavior ───────────────────────────────────────────────

const POST_HANDOFF_OPTIONS: { id: PostHandoffBehavior; icon: string; title: string; description: string }[] = [
  { id: "original-rep",  icon: "UserRound",  title: "Assign to original rep",   description: "Lead returns to the rep who originally owned it." },
  { id: "sales-manager", icon: "UserCog",    title: "Assign to Sales Manager",  description: "Escalate complex situations to management." },
  { id: "round-robin",   icon: "RefreshCcw", title: "Round Robin",              description: "Automatically distribute to the next available agent — no orphaned leads." },
]

function PostHandoffBehaviorSection({ value, onChange }: TrustControlsSectionProps) {
  return (
    <FormSection title="Post-Handoff Behavior">
      <p style={{ fontSize: 12, color: SUB, margin: 0 }}>Where to route the conversation after handoff</p>
      <div className="grid grid-cols-3 gap-[12px]">
        {POST_HANDOFF_OPTIONS.map(opt => (
          <OptionCard
            key={opt.id}
            icon={opt.icon}
            title={opt.title}
            description={opt.description}
            selected={value.postHandoffBehavior === opt.id}
            onSelect={() => onChange({ postHandoffBehavior: opt.id })}
          />
        ))}
      </div>
    </FormSection>
  )
}

// ── Human-in-the-Loop Review ─────────────────────────────────────────────

function HitlReview({ value, onChange }: TrustControlsSectionProps) {
  function toggleRequirement(id: string) {
    onChange({ reviewRequirements: value.reviewRequirements.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r) })
  }
  function addCustomRequirement() {
    onChange({ reviewRequirements: [...value.reviewRequirements, { id: `req-${Date.now()}`, label: "", enabled: true }] })
  }
  function updateCustomRequirement(id: string, label: string) {
    onChange({ reviewRequirements: value.reviewRequirements.map(r => r.id === id ? { ...r, label } : r) })
  }
  function removeRequirement(id: string) {
    onChange({ reviewRequirements: value.reviewRequirements.filter(r => r.id !== id) })
  }
  const isCustom = (id: string) => !DEFAULT_REVIEW_REQUIREMENTS.some(r => r.id === id)

  return (
    <FormSection title="Human-in-the-Loop Review">
      <div>
        <FieldHeading>Review Requirements</FieldHeading>
        <p style={{ fontSize: 12, color: SUB, margin: "0 0 8px" }}>Define scenarios that require human review before sending.</p>
        <div className="flex flex-col gap-[8px]">
          {value.reviewRequirements.map(req => (
            <div key={req.id} className="flex items-center gap-[8px]">
              <Checkbox checked={req.enabled} onChange={() => toggleRequirement(req.id)} size="sm" />
              {isCustom(req.id) ? (
                <Input className="flex-1 min-w-0" placeholder="Custom review requirement" value={req.label} onChange={e => updateCustomRequirement(req.id, e.target.value)} />
              ) : (
                <span style={{ fontSize: 13, color: TXT }}>{req.label}</span>
              )}
              {isCustom(req.id) && (
                <Button variant="tertiary" size="sm" iconPosition="alone" icon={<X size={14} />} onClick={() => removeRequirement(req.id)} aria-label="Remove custom requirement" />
              )}
            </div>
          ))}
        </div>
        <Button variant="tertiary" size="sm" icon={<Plus size={13} />} onClick={addCustomRequirement} style={{ marginTop: 8 }}>Add</Button>
      </div>

      <div>
        <FieldHeading>Round Robin Escalation Timeout</FieldHeading>
        <SelectField
          placeholder="Reassign to next available agent if not reviewed within"
          value={value.escalationTimeout}
          options={ESCALATION_TIMEOUT_OPTIONS}
          onChange={v => onChange({ escalationTimeout: (v || "30 minutes") as TrustControlsDraft["escalationTimeout"] })}
        />
      </div>
    </FormSection>
  )
}

// ── Section ────────────────────────────────────────────────────────────────

export function TrustControlsSection(props: TrustControlsSectionProps) {
  return (
    <div className="flex flex-col gap-[24px]">
      <div className="flex items-center gap-[8px]">
        <span style={{ fontSize: 14, fontWeight: 600, color: TXT }}>Default Trust Policy</span>
        <Tag variant="purple" size="sm">Playbook-Level</Tag>
      </div>

      <FormSections>
        <PolicyPreset {...props} />
        <ConfidenceThresholds {...props} />
        <SensitiveTopics {...props} />
        <HumanIntervention {...props} />
        <PostHandoffBehaviorSection {...props} />
        <HitlReview {...props} />
      </FormSections>
    </div>
  )
}
