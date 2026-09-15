import { useState } from "react"
import { Copy, Eye, Archive as ArchiveIcon, Trash2 } from "lucide-react"
import { ScreenLayout } from "@/components/layouts/screen-layout"
import type { SidebarItem } from "@/components/ui/sidebar"
import { Header } from "@/components/ui/header"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { Tabs } from "@/components/ui/tabs"
import { Chip } from "@/components/ui/chip"
import { Tag } from "@/components/ui/tag"
import { Button } from "@/components/ui/button"
import { Tooltip } from "@/components/ui/tooltip"
import { AvatarCircle } from "@/components/ui/avatar"
import { CardContainer } from "@/components/ui/card-container"
import { HighlightIcon } from "@/components/ui/highlight-icon"
import { Table, type TableColumn } from "@/components/ui/table"
import { EmptyState } from "@/components/ui/empty-state"
import { ModalDialog } from "@/components/ui/modal-dialog"
import { WidgetCanvasView, type CanvasSlot } from "@/components/layouts/widget-canvas-view"
import { FactListContent, TimelineContent, type TimelineCard } from "./widget-content"
import { MenuItem } from "@/components/ui/menu-item"

import type { Playbook, PlaybookStatus, TrustMode } from "./playbooks-data"
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

const OVERVIEW_SUBTABS: { id: OverviewSubtab; label: string }[] = [
  { id: "what-it-does", label: "What this playbook does" },
  { id: "activity",     label: "Activity" },
]

const STATUS_TAG_VARIANT: Record<PlaybookStatus, "success" | "alert"> = {
  Published: "success",
  Draft:     "alert",
}

const TRUST_ICON: Record<TrustMode, string> = {
  "Auto-Execute":       "Zap",
  "Approval Required":  "UserCheck",
  "Draft":              "PencilLine",
}

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

// ── "What this playbook does" — Overview default sub-view ───────────────
//
// SIX WIDGETS, EACH ONE A SHAPE THE PRODUCT ALREADY NAMES: a Notes summary, a
// List of facts three times over, the catalog's Timeline strip for the phases,
// and the DS Table for the hard gates.
//
// It used to be two widgets, the second of which ("Playbook Flow") was a wall
// of nested CardContainers joined by chevrons — a card inside a card inside a
// widget, six times, plus a second grid of phase cards inside it. Every fact in
// it survives here; what changed is that each one now sits in a widget a PM
// could rebuild in the widget builder, which is the whole ask.

const PHASE_TINTS: TimelineCard["tint"][] = ["primary", "purple", "light-blue", "yellow"]

interface GateRow { text: string; tier: string; action: string }

const GATE_COLUMNS: TableColumn<GateRow>[] = [
  { key: "text",   header: "Gate", width: "55%" },
  { key: "tier",   header: "Tier", width: "15%", render: row => <Tag variant={row.tier === "Legal" ? "error" : "neutral"} size="sm">{row.tier}</Tag> },
  { key: "action", header: "If it fails", width: "30%" },
]

function gateRows(pb: Playbook): GateRow[] {
  return [
    ...pb.hardGates.operational.map(g => ({ text: g.text, tier: "Operational", action: g.action })),
    ...pb.hardGates.legal.map(g       => ({ text: g.text, tier: "Legal",       action: g.action })),
    ...pb.hardGates.custom.map(g      => ({ text: g.text, tier: "Custom",      action: g.action })),
  ]
}

function WhatThisPlaybookDoes({ playbook }: { playbook: Playbook }) {
  const gates = gateRows(playbook)

  return (
    <WidgetCanvasView
      initialSlots={[
        // ── Notes — the generated prose, plus the four counts as Tags ──
        {
          uid: "ai-summary", title: "AI Intelligence Summary", colSpan: 3, rowSpan: 4,
          content: (
            <div className="flex flex-col gap-[12px]">
              {/* A real Tag, not a hand-rolled pill: the old version drew its own
                  8px-radius purple chip with a border and a padding of its own,
                  which is exactly what audit check 12 is looking for. */}
              <Tag variant="purple" size="sm" className="self-start">Auto-generated</Tag>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--foreground)", margin: 0 }}>
                {generateSummary(playbook)}
              </p>
              <div className="flex flex-wrap gap-[8px]">
                <Tag variant="informative" size="sm">Stage: {playbook.categoryTag}</Tag>
                <Tag variant="informative" size="sm">Phases: {playbook.phaseCount}</Tag>
                <Tag variant="informative" size="sm">Gates: {playbook.gateCount}</Tag>
                <Tag variant="informative" size="sm">Trust: {playbook.trustMode}</Tag>
              </div>
            </div>
          ),
        },

        // ── Three Lists of facts — what it is for, what starts it, how it is governed ──
        {
          uid: "objective", title: "Objective", colSpan: 1, rowSpan: 4,
          content: (
            <FactListContent
              facts={[
                { label: "Goal", value: playbook.objective.text },
                { label: "Success condition", value: playbook.objective.successConditionText },
              ]}
            />
          ),
        },
        {
          uid: "trigger", title: "Enters Play When", colSpan: 1, rowSpan: 4,
          content: (
            <FactListContent
              facts={[
                { label: "Primary event", value: playbook.moment.primaryEvent },
                {
                  label: "Listening on",
                  value: (
                    <div className="flex flex-wrap gap-[6px]">
                      {playbook.moment.eventSources.map(src => (
                        <Tag key={src} variant="lightBlue" size="sm">{src}</Tag>
                      ))}
                    </div>
                  ),
                },
              ]}
            />
          ),
        },
        {
          uid: "trust", title: "Trust Controls", colSpan: 1, rowSpan: 4,
          content: playbook.trustMode === "Draft" ? (
            <FactListContent facts={[{ label: "Mode", value: "Not yet configured" }]} />
          ) : (
            <FactListContent
              facts={[
                {
                  label: "Mode",
                  value: (
                    <span className="inline-flex items-center gap-[6px]">
                      <HighlightIcon size="sm" variant="purple" iconName={TRUST_ICON[playbook.trustMode]} />
                      {playbook.trustMode}
                    </span>
                  ),
                },
                { label: "Confidence threshold", value: `${playbook.trustControls.confidenceThreshold}%` },
                { label: "Escalates to",         value: playbook.trustControls.escalatesTo },
              ]}
            />
          ),
        },

        // ── Timeline — the sequential phases ──
        {
          uid: "phases", title: `Executes Through ${playbook.phases.length} Sequential Phases`, colSpan: 3, rowSpan: 3,
          content: (
            <TimelineContent
              cards={playbook.phases.map((ph, i) => ({
                value: String(i + 1),
                label: ph.name,
                meta:  `${ph.durationLabel} · max ${ph.maxAttempts} · ${ph.channels.join(" + ")}`,
                tint:  PHASE_TINTS[i % PHASE_TINTS.length],
              }))}
            />
          ),
        },

        // ── Table — the hard gates. Rows with three columns is a table, so it
        //    is the DS Table, not a bulleted list with a tick glyph per line. ──
        {
          uid: "hard-gates", title: "Requires All Hard Gates To Pass", colSpan: 3, rowSpan: 5,
          content: (
            <Table
              columns={GATE_COLUMNS}
              data={gates}
              size="sm"
              emptyTitle="No hard gates configured"
              emptyDescription="This playbook can execute without any gate having to pass first."
            />
          ),
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
          {/* Chips, not a SwitchTab. Two short labels and nothing to position:
              a Chip row IS the selected/unselected control (Guardrails — "a
              Chip is something you can select"), and it keeps both choices
              visible without a second tab layer under the real Tabs. 24px to
              the content below, same as every other nav layer. */}
          <div className="flex flex-wrap gap-[8px] mb-[24px]">
            {OVERVIEW_SUBTABS.map(st => (
              <Chip
                key={st.id}
                variant={subtab === st.id ? "primary" : "secondary"}
                size="m"
                onClick={() => onSubtabChange(st.id)}
              >
                {st.label}
              </Chip>
            ))}
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
