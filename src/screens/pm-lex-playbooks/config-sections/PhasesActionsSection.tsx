import { Plus, X, Mail, MessageSquare, Send } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { Tag } from "@/components/ui/tag"
import { CardContainer } from "@/components/ui/card-container"
import { ProgressBar } from "@/components/ui/progress-bar"
import { Slider } from "@/components/ui/slider"
import { OptionCard } from "@/components/experimental/widget-screen-parts"
import { FormSections, FormSection, FieldHeading, HelperText, SelectField } from "./shared"
import {
  TOUCH_GAP_UNITS, OUTREACH_DAYS, PERSONALIZATION_LEVELS, PHASE_TEMPLATES,
  phasesFromTemplate, type PhasesActionsDraft, type PhaseDraft, type SignalPhaseDraft,
} from "./types"

const SUB = "var(--field-supporting)"
const TXT = "var(--foreground)"

export interface PhasesActionsSectionProps {
  value:    PhasesActionsDraft
  onChange: (patch: Partial<PhasesActionsDraft>) => void
  /** Only true inside Prompt 12's create wizard, for a new empty playbook —
   *  the "Quick start from template" row never shows when editing a playbook
   *  that already has phases. */
  isCreateContext?: boolean
}

const CHANNEL_ICON: Record<string, typeof Mail> = { Email: Mail, SMS: MessageSquare }

function channelIcon(channel: string) {
  return CHANNEL_ICON[channel] ?? Send
}

function cadenceTone(maxAttempts: number): string {
  if (maxAttempts <= 2) return "Light"
  if (maxAttempts <= 4) return "Steady"
  return "Persistent"
}

// ── Playbook-wide settings ──────────────────────────────────────────────

function WideSettings({ value, onChange }: PhasesActionsSectionProps) {
  const s = value.wideSettings
  function patchSettings(patch: Partial<typeof s>) {
    onChange({ wideSettings: { ...s, ...patch } })
  }
  function toggleDay(day: string) {
    const has = s.allowedDays.includes(day)
    patchSettings({ allowedDays: has ? s.allowedDays.filter(d => d !== day) : [...s.allowedDays, day] })
  }

  return (
    <FormSection title="Playbook-wide settings">
      <p style={{ fontSize: 12, color: SUB, margin: 0 }}>
        These rules apply across every phase and override individual phase configurations where they conflict.
      </p>

      <div>
        <FieldHeading>Minimum time between any two touches</FieldHeading>
        <div className="flex items-center gap-[8px]">
          <div style={{ width: 120, flexShrink: 0 }}>
            <Input
              type="number"
              min={0}
              value={s.minTouchGapValue}
              onChange={e => patchSettings({ minTouchGapValue: Number(e.target.value) })}
            />
          </div>
          <div style={{ width: 160 }}>
            <SelectField
              placeholder="Unit"
              value={s.minTouchGapUnit}
              options={TOUCH_GAP_UNITS}
              onChange={v => patchSettings({ minTouchGapUnit: (v || "Hours") as typeof s.minTouchGapUnit })}
            />
          </div>
        </div>
        <HelperText>The agent will never send two messages closer together than this, regardless of phase configuration.</HelperText>
      </div>

      <div>
        <FieldHeading>Quiet hours</FieldHeading>
        <div className="grid grid-cols-2 gap-[16px]" style={{ maxWidth: 440 }}>
          <div>
            <span style={{ fontSize: 12, color: SUB }}>No outreach before</span>
            <Input type="time" value={s.quietHoursStart} onChange={e => patchSettings({ quietHoursStart: e.target.value })} />
          </div>
          <div>
            <span style={{ fontSize: 12, color: SUB }}>No outreach after</span>
            <Input type="time" value={s.quietHoursEnd} onChange={e => patchSettings({ quietHoursEnd: e.target.value })} />
          </div>
        </div>
        <HelperText>Outreach outside these hours will be queued and sent at the next available time.</HelperText>
      </div>

      <div>
        <FieldHeading>Allowed outreach days</FieldHeading>
        <div className="flex flex-wrap gap-[8px]">
          {OUTREACH_DAYS.map(day => (
            <Chip key={day} variant={s.allowedDays.includes(day) ? "primary" : "secondary"} size="m" onClick={() => toggleDay(day)}>
              {day}
            </Chip>
          ))}
        </div>
        <HelperText>The agent will only attempt outreach on the selected days.</HelperText>
      </div>

      <div>
        <FieldHeading>Timezone</FieldHeading>
        <div className="grid grid-cols-2 gap-[12px]" style={{ maxWidth: 736 }}>
          <OptionCard
            icon="User"
            title="Customer's timezone"
            description="Default, applies per recipient"
            selected={s.timezoneMode === "customer"}
            onSelect={() => patchSettings({ timezoneMode: "customer" })}
          />
          <OptionCard
            icon="Building2"
            title="Tenant's timezone"
            description="Use the dealership timezone instead"
            selected={s.timezoneMode === "tenant"}
            onSelect={() => patchSettings({ timezoneMode: "tenant" })}
          />
        </div>
        <HelperText>Quiet hours and day restrictions apply relative to the customer's timezone by default.</HelperText>
      </div>
    </FormSection>
  )
}

// ── Messaging Personalization Level ─────────────────────────────────────
//
// DS-GAP: no existing guardrail-slider component. The underlying track/thumb
// is the real DS `Slider` (ui/slider.tsx) — what's missing from the catalog
// is this composed shape around it: an "NBA Guardrail" tag, the level name,
// the "N of M fields" fraction, a bound ProgressBar, and level description,
// all driven by the same stepped value.

function PersonalizationGuardrail({ value, onChange }: PhasesActionsSectionProps) {
  const level = PERSONALIZATION_LEVELS.find(l => l.level === value.personalizationLevel) ?? PERSONALIZATION_LEVELS[0]
  const pct = Math.round((level.fieldsUsed / level.fieldsTotal) * 100)

  return (
    <FormSection title="Messaging Personalization Level">
      <div className="flex items-center gap-[8px]">
        <Tag variant="purple" size="sm">NBA Guardrail</Tag>
        <span style={{ fontSize: 13, fontWeight: 600, color: TXT }}>{level.level} · {level.label}</span>
        <span style={{ fontSize: 12, color: SUB, marginLeft: "auto" }}>{level.fieldsUsed} of {level.fieldsTotal} fields selected</span>
      </div>

      <Slider
        type="single"
        min={1}
        max={PERSONALIZATION_LEVELS.length}
        step={1}
        value={value.personalizationLevel}
        onChange={v => onChange({ personalizationLevel: v })}
      />

      <ProgressBar value={pct} style="purple" size="m" label="Personalization depth" />

      <p style={{ fontSize: 12, color: SUB, margin: 0 }}>{level.description}</p>
    </FormSection>
  )
}

// ── Sequential phases ─────────────────────────────────────────────────────

function PhaseCard({ index, phase, onChange, onRemove }: {
  index: number
  phase: PhaseDraft
  onChange: (patch: Partial<PhaseDraft>) => void
  onRemove: () => void
}) {
  const cadence = `${cadenceTone(phase.maxAttempts)} ${phase.channels.join(" and ") || "no"} outreach, over ${phase.durationLabel || "an unset duration"}, up to ${phase.maxAttempts} attempts.`

  return (
    <CardContainer size="sm" className="flex flex-col gap-[10px]">
      <div className="flex items-start gap-[10px]">
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--primary)", color: "var(--primary-foreground)", fontSize: 12, fontWeight: 700 }}
        >
          {index + 1}
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-[8px]">
          <Input placeholder="Phase name" value={phase.name} onChange={e => onChange({ name: e.target.value })} />
          <div className="flex items-center gap-[8px]">
            <Input placeholder="Duration (e.g. 7 Days)" value={phase.durationLabel} onChange={e => onChange({ durationLabel: e.target.value })} style={{ maxWidth: 180 }} />
            <Input
              type="number" min={1} placeholder="Max attempts" value={phase.maxAttempts}
              onChange={e => onChange({ maxAttempts: Number(e.target.value) })}
              style={{ maxWidth: 130 }}
            />
          </div>
          <span style={{ fontSize: 11, color: SUB }}>{phase.durationLabel || "—"} · Max {phase.maxAttempts} attempts</span>
        </div>
        <Button variant="tertiary" size="sm" iconPosition="alone" icon={<X size={14} />} onClick={onRemove} aria-label={`Remove ${phase.name || "phase"}`} />
      </div>

      <div className="flex items-center gap-[6px] flex-wrap">
        {phase.channels.map((ch, i) => {
          const Icon = channelIcon(ch)
          return (
            <Tag key={ch} variant="informative" size="sm" leadingIcon={<Icon size={11} />}>
              P{i + 1} · {ch}
            </Tag>
          )
        })}
        {(["Email", "SMS"] as const).map(ch => (
          <Chip
            key={ch}
            size="s"
            variant={phase.channels.includes(ch) ? "primary" : "secondary"}
            onClick={() => onChange({ channels: phase.channels.includes(ch) ? phase.channels.filter(c => c !== ch) : [...phase.channels, ch] })}
          >
            {phase.channels.includes(ch) ? `− ${ch}` : `+ ${ch}`}
          </Chip>
        ))}
      </div>

      <Textarea
        placeholder="Short description of what this phase does (optional)"
        value={phase.description}
        onChange={e => onChange({ description: e.target.value })}
      />

      <p style={{ fontSize: 12, fontStyle: "italic", color: SUB, margin: 0 }}>{cadence}</p>
    </CardContainer>
  )
}

function SequentialPhases({ value, onChange, isCreateContext }: PhasesActionsSectionProps) {
  function addPhase() {
    onChange({ phases: [...value.phases, { id: `phase-${Date.now()}`, name: "", durationLabel: "", maxAttempts: 1, channels: [], description: "" }] })
  }
  function updatePhase(id: string, patch: Partial<PhaseDraft>) {
    onChange({ phases: value.phases.map(p => p.id === id ? { ...p, ...patch } : p) })
  }
  function removePhase(id: string) {
    onChange({ phases: value.phases.filter(p => p.id !== id) })
  }
  function applyTemplate(templateId: string) {
    const template = PHASE_TEMPLATES.find(t => t.id === templateId)
    if (!template) return
    onChange({ phases: phasesFromTemplate(template), templatesDismissed: true })
  }

  const showTemplates = isCreateContext && !value.templatesDismissed && value.phases.length === 0

  return (
    <FormSection title="Sequential Phases">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 12, fontWeight: 600, color: SUB }}>{value.phases.length} phases configured</span>
        <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--primary)" }}>
          Change template
        </button>
      </div>

      {showTemplates && (
        <div>
          <span style={{ fontSize: 12, fontWeight: 600, color: SUB }}>Quick start from template</span>
          <div className="grid grid-cols-3 gap-[12px]" style={{ marginTop: 8 }}>
            {PHASE_TEMPLATES.map(t => (
              <CardContainer key={t.id} size="sm" className="flex flex-col gap-[6px] cursor-pointer" onClick={() => applyTemplate(t.id)}>
                <span style={{ fontSize: 13, fontWeight: 600, color: TXT }}>{t.name}</span>
                <span style={{ fontSize: 11, color: SUB }}>{t.phaseNames.length} phases: {t.phaseNames.join(" / ")}</span>
              </CardContainer>
            ))}
          </div>
          <button
            onClick={() => onChange({ templatesDismissed: true })}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: SUB, marginTop: 8 }}
          >
            or Start from Scratch
          </button>
        </div>
      )}

      <div className="flex flex-col gap-[12px]">
        {value.phases.map((phase, i) => (
          <PhaseCard key={phase.id} index={i} phase={phase} onChange={patch => updatePhase(phase.id, patch)} onRemove={() => removePhase(phase.id)} />
        ))}
      </div>

      <div>
        <Button variant="secondary" size="sm" icon={<Plus size={13} />} onClick={addPhase}>Add Phase</Button>
      </div>
    </FormSection>
  )
}

// ── Signal phases ─────────────────────────────────────────────────────────

function SignalPhases({ value, onChange }: PhasesActionsSectionProps) {
  function addSignalPhase() {
    onChange({ signalPhases: [...value.signalPhases, { id: `signal-${Date.now()}`, name: "", signal: "", response: "" }] })
  }
  function updateSignalPhase(id: string, patch: Partial<SignalPhaseDraft>) {
    onChange({ signalPhases: value.signalPhases.map(s => s.id === id ? { ...s, ...patch } : s) })
  }
  function removeSignalPhase(id: string) {
    onChange({ signalPhases: value.signalPhases.filter(s => s.id !== id) })
  }

  return (
    <FormSection title="Signal Phases">
      <p style={{ fontSize: 12, color: SUB, margin: 0 }}>
        Configure how the agent responds when a customer engagement signal is detected, independent of the outreach cadence above.
      </p>

      {value.signalPhases.length > 0 && (
        <div className="flex flex-col gap-[10px]">
          {value.signalPhases.map((s, i) => (
            <div key={s.id} className="flex items-start gap-[8px]">
              <div className="flex-1 min-w-0 flex flex-col gap-[8px]">
                <Input placeholder="Signal phase name" value={s.name} onChange={e => updateSignalPhase(s.id, { name: e.target.value })} />
                <Input placeholder="Triggering signal (e.g. Positive reply detected)" value={s.signal} onChange={e => updateSignalPhase(s.id, { signal: e.target.value })} />
                <Textarea placeholder="Response action — how should the agent respond?" value={s.response} onChange={e => updateSignalPhase(s.id, { response: e.target.value })} />
              </div>
              <Button variant="tertiary" size="sm" iconPosition="alone" icon={<X size={14} />} onClick={() => removeSignalPhase(s.id)} aria-label={`Remove signal phase ${i + 1}`} />
            </div>
          ))}
        </div>
      )}

      <div>
        <Button variant="secondary" size="sm" icon={<Plus size={13} />} onClick={addSignalPhase}>Add signal phase</Button>
      </div>
    </FormSection>
  )
}

// ── Section ────────────────────────────────────────────────────────────────

export function PhasesActionsSection(props: PhasesActionsSectionProps) {
  return (
    <FormSections>
      <WideSettings {...props} />
      <PersonalizationGuardrail {...props} />
      <SequentialPhases {...props} />
      <SignalPhases {...props} />
    </FormSections>
  )
}
