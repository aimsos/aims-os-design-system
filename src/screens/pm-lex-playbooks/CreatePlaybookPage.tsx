// ────────────────────────────────────────────────────────────────────────
// Create Playbook — Step 2 (reached after picking "Customer Playbook" in the
// Step 1 type-chooser dropdown on the list view). Step 1 itself lives in
// pm-lex-playbooks.tsx (it's a menu under the list's header button, not its
// own page).
// ────────────────────────────────────────────────────────────────────────

import { useRef, useState } from "react"
import { Popover } from "@base-ui/react/popover"
import { Info, Check, Sparkles } from "lucide-react"
import { ScreenLayout } from "@/components/layouts/screen-layout"
import type { SidebarItem } from "@/components/ui/sidebar"
import { Header } from "@/components/ui/header"
import { Button } from "@/components/ui/button"
import { CardContainer } from "@/components/ui/card-container"
import { HighlightIcon } from "@/components/ui/highlight-icon"
import { Tag } from "@/components/ui/tag"
import { CONFIG_SECTION_LABELS } from "./config-section-labels"

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "playbooks", label: "Playbooks", icon: "BookOpen" },
]

const SUB = "var(--field-supporting)"
const TXT = "var(--foreground)"

// The builder wizard (Prompt 12) has 8 steps — the 7 Configuration sections
// already established (Prompts 5–10) plus a closing review/publish step.
const WIZARD_STEPS = [...CONFIG_SECTION_LABELS, "Review & Publish"]

function WhatYoullDefine() {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={triggerRef}>
      <Button variant="tertiary" size="sm" icon={<Info size={14} />} onClick={() => setOpen(o => !o)}>
        What You'll Define
      </Button>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Portal>
          <Popover.Positioner anchor={triggerRef} side="bottom" align="end" sideOffset={4} style={{ zIndex: 10030 }}>
            <Popover.Popup
              className="flex flex-col rounded-[8px] overflow-hidden"
              style={{
                width: 260, padding: 12,
                background: "var(--surface-floating-default)",
                border: "0.5px solid var(--color-border-neutral-subtle)",
                boxShadow: "var(--shadow-elevation-5)",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: SUB, marginBottom: 8 }}>
                What you'll define, step by step
              </span>
              <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {WIZARD_STEPS.map((step, i) => (
                  <li key={step} className="flex items-center gap-[8px]">
                    <span
                      className="flex items-center justify-center flex-shrink-0"
                      style={{ width: 15, height: 15, borderRadius: "50%", background: "var(--field-bg)", fontSize: 9, fontWeight: 700, color: SUB }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 12, color: TXT }}>{step}</span>
                  </li>
                ))}
              </ol>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}

type StartOptionId = "template" | "conversation" | "scratch"

const START_OPTIONS: { id: StartOptionId; icon: string; title: string; description: string; comingSoon: boolean }[] = [
  { id: "template",     icon: "LayoutTemplate", title: "Start from a Template",       description: "Start with a proven strategy pre-configured with best practices. Customize to match your needs.", comingSoon: true },
  { id: "conversation", icon: "MessageCircle",  title: "Start with a Conversation",    description: "Conversational AI-guided setup without step-by-step forms. Natural configuration flow for faster creation.", comingSoon: true },
  { id: "scratch",      icon: "PencilRuler",    title: "Start from Scratch",           description: "Build a custom playbook tailored to your specific moment and objectives. Full control over every step.", comingSoon: false },
]

function StartOptionCard({ option, selected, onSelect }: {
  option: (typeof START_OPTIONS)[number]
  selected: boolean
  onSelect: () => void
}) {
  const disabled = option.comingSoon
  return (
    <div onClick={disabled ? undefined : onSelect} style={{ cursor: disabled ? "not-allowed" : "pointer" }}>
      <CardContainer
        selected={selected}
        disabled={disabled}
        size="sm"
        className="flex flex-col gap-[10px] h-full"
      >
        <div className="flex items-start justify-between">
          <HighlightIcon iconName={option.icon} variant={selected ? "informative" : "neutral"} size="sm" />
          {option.comingSoon && <Tag variant="neutral" size="sm">COMING SOON</Tag>}
          {selected && (
            <span className="flex items-center justify-center" style={{ width: 15, height: 15, borderRadius: "50%", background: "var(--primary)" }}>
              <Check size={10} style={{ color: "var(--primary-foreground)" }} />
            </span>
          )}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: selected ? "var(--primary)" : TXT }}>{option.title}</div>
          <p style={{ fontSize: 12, color: SUB, margin: "4px 0 0", lineHeight: 1.5 }}>{option.description}</p>
        </div>
      </CardContainer>
    </div>
  )
}

export interface CreatePlaybookPageProps {
  onCancel:        () => void
  onStartBuilding: () => void
}

export default function CreatePlaybookPage({ onCancel, onStartBuilding }: CreatePlaybookPageProps) {
  const [selected, setSelected] = useState<StartOptionId | null>(null)

  return (
    <ScreenLayout
      sidebarItems={SIDEBAR_ITEMS}
      activeSidebarId="playbooks"
      header={isScrolled => (
        <Header
          size={isScrolled ? "compress" : "size-l"}
          title="Create Playbook"
          description="Start a new adaptive strategy for NBA-driven 1:1 client plans"
          aux={<WhatYoullDefine />}
          primaryAction={{ label: "Start Building →", icon: Sparkles, onClick: onStartBuilding, disabled: selected !== "scratch" }}
          secondaryAction={{ label: "Cancel", onClick: onCancel }}
        />
      )}
    >
      <div className="grid grid-cols-3 gap-[12px]">
        {START_OPTIONS.map(opt => (
          <StartOptionCard key={opt.id} option={opt} selected={selected === opt.id} onSelect={() => setSelected(opt.id)} />
        ))}
      </div>

      <div
        className="flex items-start gap-[10px]"
        style={{ marginTop: 20, padding: "12px 16px", borderRadius: 8, background: "var(--tag-purple-bg)", border: "1px solid var(--tag-purple-bd)" }}
      >
        <Sparkles size={16} style={{ color: "var(--tag-purple-fg)", flexShrink: 0, marginTop: 1 }} />
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--tag-purple-fg)" }}>Governed Execution</span>
          <p style={{ fontSize: 12, color: SUB, margin: "4px 0 0", lineHeight: 1.5 }}>
            NBA may select and adapt within the strategy's guardrails · Real execution runs through governed orchestration policies.
          </p>
        </div>
      </div>
    </ScreenLayout>
  )
}
