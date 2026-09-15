import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { OptionCard } from "@/components/experimental/widget-screen-parts"
import { FormSections, FormSection, Field, SelectField, AssistButton } from "./shared"
import { DEPARTMENTS, OWNERS, PRIORITIES, type BasicsDraft } from "./types"

export interface BasicsSectionProps {
  value:    BasicsDraft
  onChange: (patch: Partial<BasicsDraft>) => void
}

export function BasicsSection({ value, onChange }: BasicsSectionProps) {
  return (
    <FormSections>
      <FormSection title="Playbook Identity">
        <Field label="Playbook Name" required width="narrow">
          <Input
            placeholder="e.g. Enterprise Onboarding Excellence"
            value={value.name}
            onChange={e => onChange({ name: e.target.value })}
          />
        </Field>
        <Field
          label="Short Description"
          action={<AssistButton />}
          helper="Brief summary of what this playbook does and who it targets"
        >
          <Textarea
            placeholder="What does this playbook do, and who does it target?"
            value={value.shortDescription}
            onChange={e => onChange({ shortDescription: e.target.value })}
          />
        </Field>
      </FormSection>

      <FormSection title="Tenant Scope" description="Who this playbook is available to.">
        <div className="grid grid-cols-2 gap-[12px]">
          <OptionCard
            icon="Globe"
            title="Global"
            description="All tenants"
            selected={value.tenantScope === "global"}
            onSelect={() => onChange({ tenantScope: "global" })}
          />
          <OptionCard
            icon="Users"
            title="Specific Tenants & Rooftops"
            description="Multi-select"
            selected={value.tenantScope === "specific"}
            onSelect={() => onChange({ tenantScope: "specific" })}
          />
        </div>
      </FormSection>

      <FormSection title="Organization">
        <div className="grid grid-cols-2 gap-[16px]" style={{ maxWidth: 736 }}>
          <Field label="Department" required>
            <SelectField
              placeholder="Select department"
              value={value.department}
              options={DEPARTMENTS}
              onChange={v => onChange({ department: (v || null) as BasicsDraft["department"] })}
            />
          </Field>
          <Field label="Owner" required>
            <SelectField
              placeholder="Select owner"
              value={value.owner}
              options={OWNERS}
              onChange={v => onChange({ owner: (v || null) as BasicsDraft["owner"] })}
            />
          </Field>
        </div>

        <Field label="Priority / Arbitration Rank" required>
          <div className="grid grid-cols-4 gap-[12px]">
            {PRIORITIES.map(p => (
              <OptionCard
                key={p.id}
                icon={p.icon}
                title={p.label}
                description={p.sub}
                selected={value.priority === p.id}
                onSelect={() => onChange({ priority: p.id })}
              />
            ))}
          </div>
        </Field>
      </FormSection>

      <FormSection title="Execution Behavior">
        <Toggle
          checked={value.exclusiveExecution}
          onChange={checked => onChange({ exclusiveExecution: checked })}
          label="Exclusive execution"
          description="When on, this playbook runs alone. If another playbook is already active for the same customer, this one will wait rather than run alongside it."
        />
        <Field label="Tags" width="narrow">
          <Input
            placeholder="e.g. enterprise, onboarding, revenue (optional)"
            value={value.tags}
            onChange={e => onChange({ tags: e.target.value })}
          />
        </Field>
        <Field label="Internal Notes">
          <Textarea
            placeholder="Notes for the team — not shown to customers (optional)"
            value={value.internalNotes}
            onChange={e => onChange({ internalNotes: e.target.value })}
          />
        </Field>
      </FormSection>
    </FormSections>
  )
}
