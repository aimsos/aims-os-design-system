import { Plus, X } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { Tag } from "@/components/ui/tag"
import { Chip } from "@/components/ui/chip"
import { CardContainer } from "@/components/ui/card-container"
import { FormSections, FormSection, Field, SelectField, AssistButton } from "./shared"
import {
  GOAL_TYPES, KPI_OPTIONS, PRIMARY_EVENTS, PREDEFINED_EXIT_CONDITIONS, EXIT_OUTCOMES, EXIT_CONDITION_KINDS,
  type ObjectiveSuccessDraft, type CustomExitConditionDraft,
} from "./types"

export interface ObjectiveSuccessSectionProps {
  value:    ObjectiveSuccessDraft
  onChange: (patch: Partial<ObjectiveSuccessDraft>) => void
}

export function ObjectiveSuccessSection({ value, onChange }: ObjectiveSuccessSectionProps) {
  function toggleSuccessEvent(event: string) {
    const has = value.successEvents.includes(event)
    onChange({ successEvents: has ? value.successEvents.filter(e => e !== event) : [...value.successEvents, event] })
  }

  function toggleExitCondition(id: string) {
    const has = value.enabledExitConditionIds.includes(id)
    if (has) {
      onChange({ enabledExitConditionIds: value.enabledExitConditionIds.filter(x => x !== id) })
    } else {
      onChange({
        enabledExitConditionIds: [...value.enabledExitConditionIds, id],
        exitConditionOutcomes: { ...value.exitConditionOutcomes, [id]: value.exitConditionOutcomes[id] ?? EXIT_OUTCOMES[0] },
      })
    }
  }

  function setExitOutcome(id: string, outcome: string) {
    onChange({ exitConditionOutcomes: { ...value.exitConditionOutcomes, [id]: outcome } })
  }

  function addCustomExitCondition() {
    onChange({ customExitConditions: [...value.customExitConditions, { id: `exit-${Date.now()}`, text: "", kind: EXIT_CONDITION_KINDS[0], outcome: EXIT_OUTCOMES[0] }] })
  }

  function updateCustomExitCondition(id: string, patch: Partial<CustomExitConditionDraft>) {
    onChange({ customExitConditions: value.customExitConditions.map(c => c.id === id ? { ...c, ...patch } : c) })
  }

  function removeCustomExitCondition(id: string) {
    onChange({ customExitConditions: value.customExitConditions.filter(c => c.id !== id) })
  }

  return (
    <FormSections>
      {/* The section heading already says "Goal Type" — the field underneath
          does not repeat it, and the Select is capped rather than stretched to
          the full column for one short value. */}
      <FormSection
        title="Goal Type"
        description="Defines the primary intent of this strategy. Tells the agent how to prioritize actions and approach content."
      >
        <Field width="narrow">
          <SelectField
            placeholder="Select the primary intent of this strategy"
            value={value.goalType}
            options={GOAL_TYPES}
            onChange={v => onChange({ goalType: v || null })}
          />
        </Field>
      </FormSection>

      <FormSection
        title="Primary Success Events"
        description="The specific events that mark this playbook as successful. When any of these occur, the playbook exits and the objective is considered met."
      >
        <div className="flex flex-wrap gap-[8px]">
          {PRIMARY_EVENTS.map(event => (
            <Chip
              key={event}
              variant={value.successEvents.includes(event) ? "primary" : "secondary"}
              size="m"
              onClick={() => toggleSuccessEvent(event)}
            >
              {event}
            </Chip>
          ))}
        </div>
      </FormSection>

      <FormSection
        title="Exit Conditions"
        description="Select each condition that can stop this plan early, then define what happens for each one. Any of them can archive, escalate, retry, or hand off to another playbook."
      >
        {/* TWO COLUMNS. Five conditions each using the full 900px for a toggle,
            a short label and a 200px Select left most of every row empty and
            pushed the list twice as tall as it needed to be. */}
        <div className="grid grid-cols-2 gap-x-[24px] gap-y-[12px]">
          {PREDEFINED_EXIT_CONDITIONS.map(cond => {
            const enabled = value.enabledExitConditionIds.includes(cond.id)
            return (
              <div key={cond.id} className="flex flex-col gap-[8px]">
                <div className="flex items-start gap-[10px]">
                  <Toggle checked={enabled} onChange={() => toggleExitCondition(cond.id)} size="sm" />
                  <div className="min-w-0 flex flex-col items-start gap-[4px]">
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{cond.label}</div>
                    <Tag variant="neutral" size="sm">{cond.kind}</Tag>
                  </div>
                </div>
                {enabled && (
                  <div style={{ paddingLeft: 34 }}>
                    <SelectField
                      placeholder="Outcome"
                      value={value.exitConditionOutcomes[cond.id] ?? null}
                      options={EXIT_OUTCOMES}
                      onChange={v => setExitOutcome(cond.id, v)}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {value.customExitConditions.length > 0 && (
          <div className="grid grid-cols-2 gap-[12px]">
            {/* A card here is correct: each one IS an item, added and removable. */}
            {value.customExitConditions.map((c, i) => (
              <CardContainer key={c.id} size="sm" className="flex items-start gap-[8px]">
                <div className="flex-1 min-w-0 flex flex-col gap-[8px]">
                  <Input
                    placeholder={`Custom exit condition ${i + 1} label`}
                    value={c.text}
                    onChange={e => updateCustomExitCondition(c.id, { text: e.target.value })}
                  />
                  <div className="flex items-center gap-[8px]">
                    <div className="flex-1 min-w-0">
                      <SelectField
                        placeholder="Kind"
                        value={c.kind}
                        options={EXIT_CONDITION_KINDS}
                        onChange={v => updateCustomExitCondition(c.id, { kind: (v || EXIT_CONDITION_KINDS[0]) as CustomExitConditionDraft["kind"] })}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <SelectField
                        placeholder="Outcome"
                        value={c.outcome || null}
                        options={EXIT_OUTCOMES}
                        onChange={v => updateCustomExitCondition(c.id, { outcome: v })}
                      />
                    </div>
                  </div>
                </div>
                <Button variant="tertiary" size="sm" iconPosition="alone" icon={<X size={14} />} onClick={() => removeCustomExitCondition(c.id)} aria-label={`Remove custom exit condition ${i + 1}`} />
              </CardContainer>
            ))}
          </div>
        )}

        <div>
          <Button variant="secondary" size="sm" icon={<Plus size={13} />} onClick={addCustomExitCondition}>Add Custom Exit Condition</Button>
        </div>
      </FormSection>

      <FormSection
        title="Business KPI Association"
        description="Link this objective to a business metric for reporting."
      >
        <Field width="narrow">
          <SelectField
            placeholder="No KPI association"
            value={value.kpiAssociation}
            options={KPI_OPTIONS}
            onChange={v => onChange({ kpiAssociation: v || KPI_OPTIONS[0] })}
          />
        </Field>
      </FormSection>

      <FormSection
        title="Strategy Intent Notes"
        description="Describe the strategic reasoning behind this objective. NBA uses this guidance to align decisions with business intent — your instructions take priority over default optimization logic."
      >
        <Field action={<AssistButton />}>
          <Textarea
            placeholder="Why does this objective matter, strategically? (optional)"
            value={value.strategyNotes}
            onChange={e => onChange({ strategyNotes: e.target.value })}
          />
        </Field>
      </FormSection>
    </FormSections>
  )
}
