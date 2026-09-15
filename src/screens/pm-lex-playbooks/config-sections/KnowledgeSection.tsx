import { useState } from "react"
import { CardContainer } from "@/components/ui/card-container"
import { Checkbox } from "@/components/ui/checkbox"
import { Tag, type TagVariant } from "@/components/ui/tag"
import { SwitchTab } from "@/components/ui/switch-tab"
import { SlideOut } from "@/components/ui/slide-out"
import { KNOWLEDGE_PACKS, type KnowledgePack, type KnowledgePackUsage } from "@/screens/pm-lex-playbooks/knowledgePacks"
import { FormSections, FormSection } from "./shared"
import type { KnowledgeDraft } from "./types"

const SUB = "var(--field-supporting)"
const TXT = "var(--foreground)"

const USAGE_VARIANT: Record<KnowledgePackUsage, TagVariant> = {
  High: "success", Medium: "yellow", Low: "neutral",
}

const STATUS_VARIANT: Record<KnowledgePack["status"], TagVariant> = {
  Active: "success", Draft: "yellow",
}

export interface KnowledgeSectionProps {
  value:    KnowledgeDraft
  onChange: (patch: Partial<KnowledgeDraft>) => void
}

function KnowledgePackCard({ pack, selected, onToggle, onOpenPreview }: {
  pack: KnowledgePack
  selected: boolean
  onToggle: () => void
  onOpenPreview: () => void
}) {
  return (
    <div onClick={onToggle} style={{ cursor: "pointer" }}>
      <CardContainer selected={selected} size="sm" className="flex flex-col gap-[10px] h-full">
        <div className="flex items-start justify-between gap-[8px]">
          <div className="min-w-0">
            <span style={{ fontSize: 11, color: SUB }}>{pack.id}</span>
            {/* Card click selects; the name itself is the Eye/preview-style
                affordance (per DS Guardrails — no separate knowledge-pack
                detail page exists, so a SlideOut preview stands in for it). */}
            <div
              onClick={e => { e.stopPropagation(); onOpenPreview() }}
              style={{ fontSize: 13, fontWeight: 600, color: TXT, cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.textDecoration = "underline" }}
              onMouseLeave={e => { e.currentTarget.style.textDecoration = "none" }}
            >
              {pack.name}
            </div>
          </div>
          <div onClick={e => e.stopPropagation()}>
            <Checkbox checked={selected} onChange={onToggle} size="sm" />
          </div>
        </div>

        <div className="flex items-center gap-[6px] flex-wrap">
          <Tag variant={STATUS_VARIANT[pack.status]} size="sm">{pack.status}</Tag>
          {pack.stale && <Tag variant="yellow" size="sm">⚠ Stale</Tag>}
        </div>

        <p style={{ fontSize: 12, color: SUB, margin: 0, lineHeight: 1.5 }}>{pack.description}</p>
        <span style={{ fontSize: 12, fontWeight: 600, color: TXT }}>{pack.factCount} facts</span>

        <div className="flex items-center gap-[6px] flex-wrap">
          <Tag variant="lightBlue" size="sm">{pack.category}</Tag>
          <Tag variant="informative" size="sm">{pack.scope}</Tag>
          <Tag variant={USAGE_VARIANT[pack.usage]} size="sm">{pack.usage} usage</Tag>
          <span style={{ fontSize: 11, fontStyle: "italic", color: SUB }}>{pack.category}</span>
        </div>

        <div className="flex items-center gap-[6px] flex-wrap">
          {pack.tags.map(t => <Tag key={t} variant="neutral" size="sm">{t}</Tag>)}
        </div>
      </CardContainer>
    </div>
  )
}

export function KnowledgeSection({ value, onChange }: KnowledgeSectionProps) {
  const [view, setView] = useState<"all" | "selected">("all")
  const [previewId, setPreviewId] = useState<string | null>(null)

  function toggle(id: string) {
    const has = value.selectedPackIds.includes(id)
    onChange({ selectedPackIds: has ? value.selectedPackIds.filter(x => x !== id) : [...value.selectedPackIds, id] })
  }

  const visible = view === "all" ? KNOWLEDGE_PACKS : KNOWLEDGE_PACKS.filter(p => value.selectedPackIds.includes(p.id))
  const previewPack = KNOWLEDGE_PACKS.find(p => p.id === previewId) ?? null

  return (
    <FormSections>
      <FormSection
        title="Knowledge Packs"
        description="The grounded facts this playbook is allowed to draw on. At least one is required."
      >
        <SwitchTab
          items={[
            { id: "all",      label: `All (${KNOWLEDGE_PACKS.length})` },
            { id: "selected", label: `Selected (${value.selectedPackIds.length})` },
          ]}
          value={view}
          onChange={id => setView(id as "all" | "selected")}
        />

        <div className="grid grid-cols-2 gap-[12px]">
          {visible.map(pack => (
            <KnowledgePackCard
              key={pack.id}
              pack={pack}
              selected={value.selectedPackIds.includes(pack.id)}
              onToggle={() => toggle(pack.id)}
              onOpenPreview={() => setPreviewId(pack.id)}
            />
          ))}
        </div>

        {value.selectedPackIds.length === 0 && (
          <div className="flex items-center gap-[6px]">
            <Tag variant="alert" size="sm">Required</Tag>
            <span style={{ fontSize: 12, color: SUB }}>Select at least one knowledge pack before proceeding.</span>
          </div>
        )}
      </FormSection>

      <SlideOut
        open={previewPack !== null}
        onClose={() => setPreviewId(null)}
        type="with-variants"
        size="m"
        title={previewPack?.name ?? ""}
        subtitle={previewPack ? `${previewPack.category} · ${previewPack.scope}` : ""}
        statusLabel={previewPack?.status ?? ""}
        showTabs={false}
        showSearchBar={false}
        showChips={false}
        showCta={false}
      >
        {previewPack && (
          // SlideOut already pads its panel 32px/24px — no extra horizontal
          // padding here (Guardrails: a child re-padding doubles it).
          <div className="flex flex-col gap-[16px]" style={{ padding: "0" }}>
            <p style={{ fontSize: 13, color: TXT, lineHeight: 1.6, margin: 0 }}>{previewPack.description}</p>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: SUB }}>Facts</span>
              <div style={{ fontSize: 20, fontWeight: 700, color: TXT, marginTop: 4 }}>{previewPack.factCount}</div>
            </div>
            {previewPack.stale && <Tag variant="yellow" size="sm">⚠ Stale</Tag>}
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: SUB }}>Tags</span>
              <div className="flex flex-wrap gap-[6px]" style={{ marginTop: 6 }}>
                {previewPack.tags.map(t => <Tag key={t} variant="neutral" size="sm">{t}</Tag>)}
              </div>
            </div>
          </div>
        )}
      </SlideOut>
    </FormSections>
  )
}
