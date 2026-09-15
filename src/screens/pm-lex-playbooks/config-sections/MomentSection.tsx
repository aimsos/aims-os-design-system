import { Plus, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { OptionCard } from "@/components/experimental/widget-screen-parts"
import { FormSections, FormSection, Field, SelectField, AssistButton } from "./shared"
import { EVENT_SOURCES, PRIMARY_EVENTS, CONDITION_OPERATORS, type MomentDraft, type QualifyingConditionDraft } from "./types"

export interface MomentSectionProps {
  value:    MomentDraft
  onChange: (patch: Partial<MomentDraft>) => void
}

export function MomentSection({ value, onChange }: MomentSectionProps) {
  function toggleSource(id: string) {
    const has = value.eventSources.includes(id)
    onChange({ eventSources: has ? value.eventSources.filter(x => x !== id) : [...value.eventSources, id] })
  }

  function addCondition() {
    onChange({ qualifyingConditions: [...value.qualifyingConditions, { id: `qc-${Date.now()}`, field: "", operator: "=", value: "" }] })
  }

  function updateCondition(id: string, patch: Partial<QualifyingConditionDraft>) {
    onChange({ qualifyingConditions: value.qualifyingConditions.map(c => c.id === id ? { ...c, ...patch } : c) })
  }

  function removeCondition(id: string) {
    onChange({ qualifyingConditions: value.qualifyingConditions.filter(c => c.id !== id) })
  }

  return (
    <FormSections>
      <FormSection
        title="Primary Event / Moment"
        description="The triggering event that signals playbook consideration."
      >
        <Field width="narrow">
          <SelectField
            placeholder="Select the triggering event"
            value={value.primaryEvent}
            options={PRIMARY_EVENTS}
            onChange={v => onChange({ primaryEvent: v || null })}
          />
        </Field>
      </FormSection>

      <FormSection
        title="Event Source / System"
        description="Any selected source can trigger this playbook."
      >
        <Field
          required
          action={<Button variant="tertiary" size="sm" onClick={() => onChange({ eventSources: [] })}>Clear all</Button>}
        >
          <div className="grid grid-cols-2 gap-[12px]">
            {EVENT_SOURCES.map(src => (
              <OptionCard
                key={src.id}
                icon={src.icon}
                title={src.label}
                description={src.description}
                selected={value.eventSources.includes(src.id)}
                onSelect={() => toggleSource(src.id)}
              />
            ))}
          </div>
        </Field>

        <span style={{ fontSize: 12, fontWeight: 500, color: value.eventSources.length > 0 ? "var(--primary)" : "var(--field-supporting)" }}>
          {value.eventSources.length} sources selected as trigger
        </span>
      </FormSection>

      <FormSection
        title="Business Meaning"
        description="Describe the business significance of this moment. NBA uses this to understand why the event matters and how to prioritize actions — your explanation overrides generic event interpretation."
      >
        <Field action={<AssistButton />}>
          <Textarea
            placeholder="Why does this moment matter, and how should NBA prioritize it? (optional)"
            value={value.businessMeaning}
            onChange={e => onChange({ businessMeaning: e.target.value })}
          />
        </Field>
      </FormSection>

      <FormSection
        title="Qualifying Conditions"
        description="Filters that refine when this playbook qualifies."
      >
        <Field action={<Button variant="secondary" size="sm" icon={<Plus size={13} />} onClick={addCondition}>Add Condition</Button>}>
          {value.qualifyingConditions.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--field-supporting)", margin: 0 }}>
              No conditions yet — add a filter to narrow when this playbook qualifies.
            </p>
          ) : (
            <div className="flex flex-col gap-[8px]" style={{ maxWidth: 640 }}>
              {value.qualifyingConditions.map(c => (
                <div key={c.id} className="flex items-center gap-[8px]">
                  <Input
                    className="flex-1 min-w-0"
                    placeholder="Field (e.g. Account type)"
                    value={c.field}
                    onChange={e => updateCondition(c.id, { field: e.target.value })}
                  />
                  <div style={{ width: 110, flexShrink: 0 }}>
                    <SelectField
                      placeholder="Operator"
                      value={c.operator}
                      options={CONDITION_OPERATORS}
                      onChange={v => updateCondition(c.id, { operator: (v || "=") as QualifyingConditionDraft["operator"] })}
                    />
                  </div>
                  <Input
                    className="flex-1 min-w-0"
                    placeholder="Value (e.g. Enterprise)"
                    value={c.value}
                    onChange={e => updateCondition(c.id, { value: e.target.value })}
                  />
                  <Button variant="tertiary" size="sm" iconPosition="alone" icon={<X size={14} />} onClick={() => removeCondition(c.id)} aria-label="Remove condition" />
                </div>
              ))}
            </div>
          )}
        </Field>
      </FormSection>
    </FormSections>
  )
}
