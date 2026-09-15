import { useState } from "react"
import { Copy, Eye, Archive as ArchiveIcon, Trash2, Check } from "lucide-react"
import { ScreenLayout } from "@/components/layouts/screen-layout"
import type { SidebarItem } from "@/components/ui/sidebar"
import { Header } from "@/components/ui/header"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { Tabs } from "@/components/ui/tabs"
import { Chip } from "@/components/ui/chip"
import { Tag, type TagVariant } from "@/components/ui/tag"
import { Button } from "@/components/ui/button"
import { Tooltip } from "@/components/ui/tooltip"
import { AvatarCircle } from "@/components/ui/avatar"
import { CardContainer } from "@/components/ui/card-container"
import { HighlightIcon } from "@/components/ui/highlight-icon"
import { EmptyState } from "@/components/ui/empty-state"
import { ModalDialog } from "@/components/ui/modal-dialog"
import { MenuItem } from "@/components/ui/menu-item"
import { WidgetCanvasView, type CanvasSlot } from "@/components/layouts/widget-canvas-view"

import type { Playbook, PlaybookStatus } from "./playbooks-data"
import { ActivityUsage } from "./ActivityUsage"
import { VersionsTab } from "./VersionsTab"
import { HistoryTab } from "./HistoryTab"
import { CONFIG_SECTIONS, type ConfigSectionId } from "./config-section-labels"
import { BasicsSection } from "./config-sections/BasicsSection"
import { KnowledgeSection } from "./config-sections/KnowledgeSection"
import { MomentSection } from "./config-sections/MomentSection"
import { HardGatesSection } from "./config-sections/hard-gates"
import { ObjectiveSuccessSection } from "./config-sections/ObjectiveSuccessSection"
import { PhasesActionsSection } from "./config-sections/PhasesActionsSection"
import { TrustControlsSection } from "./config-sections/TrustControlsSection"
import {
  basicsDraftFromPlaybook, knowledgeDraftFromPlaybook, momentDraftFromPlaybook, hardGatesDraftFromPlaybook,
  objectiveSuccessDraftFromPlaybook, phasesActionsDraftFromPlaybook, trustControlsDraftFromPlaybook,
  type BasicsDraft, type KnowledgeDraft, type MomentDraft, type HardGatesDraft, type ObjectiveSuccessDraft,
  type PhasesActionsDraft, type TrustControlsDraft,
} from "./config-sections/types"

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "playbooks", label: "Playbooks", icon: "BookOpen" },
]

export type DetailTab = "overview" | "configuration" | "versions" | "history"
export type OverviewSubtab = "what-it-does" | "activity"

const STATUS_TAG_VARIANT: Record<PlaybookStatus, "success" | "alert"> = {
  Published: "success",
  Draft:     "alert",
}

const TXT = "var(--foreground)"
const SUB = "var(--field-supporting)"

export interface PlaybookDetailProps {
  playbook:        Playbook
  tab:             DetailTab
  onTabChange:     (t: DetailTab) => void
  subtab:          OverviewSubtab
  onSubtabChange:  (s: OverviewSubtab) => void
  onBack:          () => void
  onDuplicate:     (source: Playbook) => void
  onArchive:       (id: string) => void
  onDelete:        (id: string) => void
}

function Dot() {
  return <span style={{ fontSize: 14, lineHeight: 1, color: "var(--el-bullet)" }}>•</span>
}

function generateSummary(pb: Playbook): string {
  const sources = pb.moment.eventSources.length > 1
    ? `${pb.moment.eventSources.slice(0, -1).join(", ")} and ${pb.moment.eventSources[pb.moment.eventSources.length - 1]}`
    : pb.moment.eventSources[0]

  const trustClause = pb.trustMode === "Draft"
    ? "Trust controls have not been configured yet, so every plan currently requires manual review."
    : `It operates in ${pb.trustMode.toLowerCase()} mode with a ${pb.trustControls.confidenceThreshold}% confidence threshold — anything below that bar escalates to ${pb.trustControls.escalatesTo}.`

  return `This playbook orchestrates a comprehensive ${pb.categoryTag.toLowerCase()} journey, triggering automatically when "${pb.moment.primaryEvent}" is detected across ${sources}. It runs through ${pb.phaseCount} sequential phases toward the objective: ${pb.objective.text.charAt(0).toLowerCase()}${pb.objective.text.slice(1)}. ${trustClause}`
}

// ── "What this playbook does" — Overview default sub-tab ───────────────────
// Every card is its own WidgetCanvasView slot — draggable, resizable
// (horizontally and vertically), repositionable, same as any other
// dashboard in this app. `tone` (added to CanvasSlot for this) tints each
// slot's real CardContainer to its semantic role instead of every widget
// reading as the same grey: informative-blue for the moment/trust steps,
// orange for the hard-gate requirement, green for the phases/success steps
// that close the flow, purple for the AI summary.

const TRUST_STAT_VARIANT: TagVariant = "purple"

function TrustControlsContent({ playbook }: { playbook: Playbook }) {
  if (playbook.trustMode === "Draft") {
    return <span style={{ fontSize: 13, color: TXT }}>Not yet configured</span>
  }
  return (
    <div className="grid gap-[12px]" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
      <div>
        <div style={{ fontSize: 11, color: SUB }}>Mode</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: TXT, marginTop: 2 }}>{playbook.trustMode}</div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: SUB }}>Confidence threshold</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: TXT, marginTop: 2 }}>{playbook.trustControls.confidenceThreshold}%</div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: SUB }}>Escalates to</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: TXT, marginTop: 2 }}>{playbook.trustControls.escalatesTo}</div>
      </div>
    </div>
  )
}

function HardGatesContent({ gates }: { gates: { text: string; action: string }[] }) {
  if (gates.length === 0) return <span style={{ fontSize: 12, color: SUB }}>No hard gates configured</span>
  return (
    <ul className="grid gap-[8px]" style={{ gridTemplateColumns: "repeat(2, 1fr)", margin: 0, padding: 0, listStyle: "none" }}>
      {gates.map((g, i) => (
        <li key={i} className="flex items-start gap-[6px]">
          <Check size={13} style={{ color: "var(--hi-success-icon)", flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: 13, color: TXT }}>{g.text}</span>
        </li>
      ))}
    </ul>
  )
}

function PhasesContent({ playbook }: { playbook: Playbook }) {
  return (
    <div className="grid gap-[10px]" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
      {playbook.phases.map((ph, i) => (
        <div key={ph.id} className="flex items-start gap-[8px]">
          <span
            className="flex items-center justify-center flex-shrink-0"
            style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--hi-success-bg)", color: "var(--hi-success-icon)", fontSize: 10, fontWeight: 700 }}
          >
            {i + 1}
          </span>
          <div className="min-w-0">
            <div style={{ fontSize: 13, fontWeight: 600, color: TXT }}>{ph.name}</div>
            <div style={{ fontSize: 12, color: SUB, marginTop: 2 }}>{ph.description}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function WhatThisPlaybookDoes({ playbook }: { playbook: Playbook }) {
  const gates = [
    ...playbook.hardGates.operational,
    ...playbook.hardGates.legal,
    ...playbook.hardGates.custom.map(c => ({ text: c.text, action: c.action })),
  ]

  return (
    <WidgetCanvasView
      initialSlots={[
        {
          uid: "ai-summary", title: "AI Intelligence Summary", tone: "purple", colSpan: 3, rowSpan: 4, minRowSpan: 3,
          content: (
            <div className="flex flex-col gap-[10px]">
              <div><Tag variant="purple" size="sm">Auto-generated</Tag></div>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: TXT, margin: 0 }}>{generateSummary(playbook)}</p>
              <div className="flex flex-wrap gap-[8px]">
                <Tag variant="lightBlue" size="sm">Stage: {playbook.categoryTag}</Tag>
                <Tag variant="success"   size="sm">Phases: {playbook.phaseCount} phases</Tag>
                <Tag variant="alert"     size="sm">Gates: {playbook.gateCount} gates</Tag>
                <Tag variant={TRUST_STAT_VARIANT} size="sm">Trust: {playbook.trustMode}</Tag>
              </div>
            </div>
          ),
        },
        {
          uid: "objective", title: "Objective", tone: "lightBlue", colSpan: 2, rowSpan: 3, minRowSpan: 3,
          content: <span style={{ fontSize: 13, fontWeight: 600, color: TXT }}>{playbook.objective.text}</span>,
        },
        {
          uid: "hard-gates", title: "Requires All Hard Gates To Pass", tone: "orange", colSpan: 1, rowSpan: 6, minRowSpan: 4,
          content: <HardGatesContent gates={gates} />,
        },
        {
          uid: "enters-play-when", title: "Enters Play When", tone: "lightBlue", colSpan: 2, rowSpan: 4, minRowSpan: 3,
          content: (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: TXT, marginBottom: 6 }}>{playbook.moment.primaryEvent}</div>
              <div className="flex flex-wrap gap-[6px] items-center">
                <span style={{ fontSize: 11, color: SUB, marginRight: 2 }}>Listening on:</span>
                {playbook.moment.eventSources.map(s => (
                  <Tag key={s} variant="lightBlue" size="sm">{s}</Tag>
                ))}
              </div>
            </div>
          ),
        },
        {
          uid: "trust-controls", title: "Applies Trust Controls", tone: "lightBlue", colSpan: 1, rowSpan: 4, minRowSpan: 3,
          content: <TrustControlsContent playbook={playbook} />,
        },
        {
          uid: "phases", title: `Executes Through ${playbook.phases.length} Sequential Phases`, tone: "green", colSpan: 3, rowSpan: 5, minRowSpan: 4,
          content: <PhasesContent playbook={playbook} />,
        },
        {
          uid: "success", title: "Success Condition", tone: "green", colSpan: 3, rowSpan: 3, minRowSpan: 3,
          content: <span style={{ fontSize: 13, fontWeight: 600, color: TXT }}>{playbook.objective.successConditionText}</span>,
        },
      ] satisfies CanvasSlot[]}
    />
  )
}

// ── Configuration tab — Sections nav ────────────────────────────────────────

function SectionsNav({ active, onChange }: { active: ConfigSectionId; onChange: (id: ConfigSectionId) => void }) {
  return (
    <CardContainer size="sm" className="!p-1 flex flex-col gap-[2px]">
      {CONFIG_SECTIONS.map(s => (
        <MenuItem
          key={s.id}
          label={s.label}
          leadingIcon={<HighlightIcon iconName={s.icon} variant={active === s.id ? "informative" : "neutral"} size="sm" />}
          state={active === s.id ? "focus" : "default"}
          onClick={() => onChange(s.id)}
        />
      ))}
    </CardContainer>
  )
}

function ConfigFooterBar({ onDiscard, onSave }: { onDiscard: () => void; onSave: () => void }) {
  return (
    <div
      style={{
        height: 72, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px", background: "var(--surface)", borderTop: "1px solid var(--field-border)",
      }}
    >
      <span style={{ fontSize: 12, color: "var(--field-supporting)" }}>
        All changes create a new draft revision. Publish when ready to go live.
      </span>
      <div className="flex items-center gap-[8px]">
        <Button variant="secondary" onClick={onDiscard}>Discard Changes</Button>
        <Button variant="primary" onClick={onSave}>Save Changes</Button>
      </div>
    </div>
  )
}

function ComingSoon({ label }: { label: string }) {
  return (
    <CardContainer variant="dashed">
      <EmptyState
        icon={Copy}
        showIcon={false}
        title={`${label} — coming in a future prompt`}
        description="This tab isn't built yet."
      />
    </CardContainer>
  )
}

export default function PlaybookDetail({
  playbook, tab, onTabChange, subtab, onSubtabChange,
  onBack, onDuplicate, onArchive, onDelete,
}: PlaybookDetailProps) {
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen]   = useState(false)

  const [configSection, setConfigSection] = useState<ConfigSectionId>("basics")
  const [basicsDraft, setBasicsDraft]       = useState<BasicsDraft>(() => basicsDraftFromPlaybook(playbook))
  const [knowledgeDraft, setKnowledgeDraft] = useState<KnowledgeDraft>(() => knowledgeDraftFromPlaybook(playbook))
  const [momentDraft, setMomentDraft]       = useState<MomentDraft>(() => momentDraftFromPlaybook(playbook))
  const [hardGatesDraft, setHardGatesDraft] = useState<HardGatesDraft>(() => hardGatesDraftFromPlaybook(playbook))
  const [objectiveSuccessDraft, setObjectiveSuccessDraft] = useState<ObjectiveSuccessDraft>(() => objectiveSuccessDraftFromPlaybook(playbook))
  const [phasesActionsDraft, setPhasesActionsDraft] = useState<PhasesActionsDraft>(() => phasesActionsDraftFromPlaybook(playbook))
  const [trustControlsDraft, setTrustControlsDraft] = useState<TrustControlsDraft>(() => trustControlsDraftFromPlaybook(playbook))

  function handleDiscardChanges() {
    setBasicsDraft(basicsDraftFromPlaybook(playbook))
    setKnowledgeDraft(knowledgeDraftFromPlaybook(playbook))
    setMomentDraft(momentDraftFromPlaybook(playbook))
    setHardGatesDraft(hardGatesDraftFromPlaybook(playbook))
    setObjectiveSuccessDraft(objectiveSuccessDraftFromPlaybook(playbook))
    setPhasesActionsDraft(phasesActionsDraftFromPlaybook(playbook))
    setTrustControlsDraft(trustControlsDraftFromPlaybook(playbook))
  }

  // TODO(future prompt): persist the draft as a new revision. Stub for now —
  // the footer copy ("All changes create a new draft revision") describes
  // the intended behavior, not yet wired to real persistence.
  function handleSaveChanges() {}

  return (
    <ScreenLayout
      sidebarItems={SIDEBAR_ITEMS}
      activeSidebarId="playbooks"
      stickyFooter={tab === "configuration"}
      pagination={tab === "configuration" ? <ConfigFooterBar onDiscard={handleDiscardChanges} onSave={handleSaveChanges} /> : undefined}
      header={isScrolled => (
        <Header
          size={isScrolled ? "compress" : "size-l"}
          title={playbook.name}
          breadcrumb={
            <Breadcrumb
              depth={3}
              items={[
                { label: "Orchestration" },
                { label: "Playbooks", href: "playbooks" },
                { label: playbook.name },
              ]}
              onNavigate={href => { if (href === "playbooks") onBack() }}
            />
          }
          tag={
            <div className="flex items-center gap-[6px]">
              <Tag variant={STATUS_TAG_VARIANT[playbook.status]} size="sm">{playbook.status}</Tag>
              <Tag variant="neutral" size="sm">{playbook.version}</Tag>
            </div>
          }
          aux={
            <div className="flex items-center gap-[4px]">
              <Tooltip content="Duplicate">
                <Button variant="tertiary" size="sm" iconPosition="alone" icon={<Copy size={15} />} onClick={() => onDuplicate(playbook)} aria-label="Duplicate" />
              </Tooltip>
              <Tooltip content="View published version">
                <Button variant="tertiary" size="sm" iconPosition="alone" icon={<Eye size={15} />} onClick={() => {}} aria-label="View published version" />
              </Tooltip>
              <Tooltip content="Archive">
                <Button variant="tertiary" size="sm" iconPosition="alone" icon={<ArchiveIcon size={15} />} onClick={() => setArchiveOpen(true)} aria-label="Archive" />
              </Tooltip>
              <Tooltip content="Delete">
                <Button variant="warning" size="sm" iconPosition="alone" icon={<Trash2 size={15} />} onClick={() => setDeleteOpen(true)} aria-label="Delete" />
              </Tooltip>
            </div>
          }
        />
      )}
    >
      {/* ── Meta row ── */}
      <div className="flex flex-wrap items-center gap-[8px]" style={{ marginBottom: 24, fontSize: 12, color: "var(--field-supporting)" }}>
        <AvatarCircle name={playbook.owner.name} sizeKey="sm" />
        <span>{playbook.owner.name}</span>
        <Dot />
        <span>Updated {playbook.updatedRelative}</span>
        <Dot />
        <Tag variant="lightBlue" size="sm">{playbook.categoryTag}</Tag>
        <Tag variant="purple" size="sm">{playbook.trustMode}</Tag>
        <Dot />
        <span>{playbook.phaseCount} phases</span>
        <Dot />
        <span>{playbook.gateCount} gates</span>
      </div>

      <Tabs
        className="mb-[24px]"
        items={[
          { id: "overview",      label: "Overview" },
          { id: "configuration", label: "Configuration" },
          { id: "versions",      label: "Versions" },
          { id: "history",       label: "History" },
        ]}
        activeId={tab}
        onChange={id => onTabChange(id as DetailTab)}
      />

      {tab === "overview" && (
        <>
          <div className="flex items-center gap-[8px]" style={{ marginBottom: 24 }}>
            <Chip variant={subtab === "what-it-does" ? "primary" : "secondary"} onClick={() => onSubtabChange("what-it-does")}>
              What this playbook does
            </Chip>
            <Chip variant={subtab === "activity" ? "primary" : "secondary"} onClick={() => onSubtabChange("activity")}>
              Activity / Usage
            </Chip>
          </div>
          {subtab === "what-it-does"
            ? <WhatThisPlaybookDoes playbook={playbook} />
            : <ActivityUsage playbook={playbook} />
          }
        </>
      )}
      {tab === "configuration" && (
        <div className="flex gap-[24px]">
          <div style={{ width: 220, flexShrink: 0 }}>
            <SectionsNav active={configSection} onChange={setConfigSection} />
          </div>
          <div className="flex-1 min-w-0">
            {configSection === "basics" && (
              <BasicsSection value={basicsDraft} onChange={patch => setBasicsDraft(d => ({ ...d, ...patch }))} />
            )}
            {configSection === "knowledge" && (
              <KnowledgeSection value={knowledgeDraft} onChange={patch => setKnowledgeDraft(d => ({ ...d, ...patch }))} />
            )}
            {configSection === "moment" && (
              <MomentSection value={momentDraft} onChange={patch => setMomentDraft(d => ({ ...d, ...patch }))} />
            )}
            {configSection === "hard-gates" && (
              <HardGatesSection value={hardGatesDraft} onChange={patch => setHardGatesDraft(d => ({ ...d, ...patch }))} />
            )}
            {configSection === "objective-success" && (
              <ObjectiveSuccessSection value={objectiveSuccessDraft} onChange={patch => setObjectiveSuccessDraft(d => ({ ...d, ...patch }))} />
            )}
            {configSection === "phases-actions" && (
              // isCreateContext is always false here — this is the edit-existing
              // Configuration tab. Prompt 12's create wizard passes true.
              <PhasesActionsSection
                value={phasesActionsDraft}
                onChange={patch => setPhasesActionsDraft(d => ({ ...d, ...patch }))}
                isCreateContext={false}
              />
            )}
            {configSection === "trust-controls" && (
              <TrustControlsSection value={trustControlsDraft} onChange={patch => setTrustControlsDraft(d => ({ ...d, ...patch }))} />
            )}
            {!["basics", "knowledge", "moment", "hard-gates", "objective-success", "phases-actions", "trust-controls"].includes(configSection) && (
              <ComingSoon label={CONFIG_SECTIONS.find(s => s.id === configSection)?.label ?? "This section"} />
            )}
          </div>
        </div>
      )}
      {tab === "versions"      && <VersionsTab playbook={playbook} />}
      {tab === "history"       && <HistoryTab playbook={playbook} />}

      <ModalDialog
        isOpen={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        variant="confirmation"
        tone="warning"
        iconName="Archive"
        title="Archive this playbook?"
        description="Archiving pauses this playbook — no new plans will be triggered until it's restored. Plans already in progress will continue to completion."
        ctaPrimary={{ label: "Archive playbook", destructive: false, onClick: () => { onArchive(playbook.id); setArchiveOpen(false) } }}
        ctaSecondary={{ label: "Cancel" }}
      />

      <ModalDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        variant="confirmation"
        tone="error"
        iconName="Trash2"
        title="Delete this playbook?"
        description="This permanently deletes the playbook, its configuration, and its version history. This action cannot be undone."
        ctaPrimary={{ label: "Delete playbook", destructive: true, onClick: () => { onDelete(playbook.id); setDeleteOpen(false) } }}
        ctaSecondary={{ label: "Cancel" }}
      />
    </ScreenLayout>
  )
}
