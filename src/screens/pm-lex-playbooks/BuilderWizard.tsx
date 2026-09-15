// ────────────────────────────────────────────────────────────────────────
// Playbook Builder — the wizard shell "Start Building" (Prompt 11) opens.
//
// Steps 1–7 mount the exact same section components built in Prompts 5–9
// (Basics, Moment, Hard Gates, Objective & Success, Knowledge, Phases &
// Actions relabeled "Outreach", Trust Controls) against the wizard's own
// draft state — nothing about those components changes here.
//
// The step ORDER here (Basics, Moment, Hard Gates, Objective, Knowledge,
// Outreach, Trust, Review) is the wizard's own flow and intentionally
// differs from CONFIG_SECTIONS' order (config-section-labels.ts), which
// governs the Configuration tab's Sections nav in the detail shell — two
// different contexts sequencing the same seven sections differently, not a
// second vocabulary for what the sections themselves are called.
// ────────────────────────────────────────────────────────────────────────

import { useState, type ReactNode } from "react"
import {
  ChevronDown, ChevronUp,
  Clock, RadioTower, Sparkles, ShieldAlert, ShieldCheck,
} from "lucide-react"
import { ScreenLayout } from "@/components/layouts/screen-layout"
import type { SidebarItem } from "@/components/ui/sidebar"
import { Header } from "@/components/ui/header"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { Tag } from "@/components/ui/tag"
import { Button } from "@/components/ui/button"
import { Stepper, type StepItem } from "@/components/ui/stepper"
import { StepperNavFooter } from "@/components/ui/stepper-nav-footer"
import { CardContainer } from "@/components/ui/card-container"
import { Textarea } from "@/components/ui/textarea"

import { BasicsSection } from "./config-sections/BasicsSection"
import { KnowledgeSection } from "./config-sections/KnowledgeSection"
import { MomentSection } from "./config-sections/MomentSection"
import { HardGatesSection } from "./config-sections/hard-gates"
import { ObjectiveSuccessSection } from "./config-sections/ObjectiveSuccessSection"
import { PhasesActionsSection } from "./config-sections/PhasesActionsSection"
import { TrustControlsSection } from "./config-sections/TrustControlsSection"
import {
  EMPTY_BASICS_DRAFT, EMPTY_KNOWLEDGE_DRAFT, EMPTY_MOMENT_DRAFT, EMPTY_HARD_GATES_DRAFT,
  EMPTY_OBJECTIVE_SUCCESS_DRAFT, EMPTY_PHASES_ACTIONS_DRAFT, EMPTY_TRUST_CONTROLS_DRAFT,
  TENANT_GATE_CATALOG, PREDEFINED_EXIT_CONDITIONS,
  type BasicsDraft, type KnowledgeDraft, type MomentDraft, type HardGatesDraft,
  type ObjectiveSuccessDraft, type PhasesActionsDraft, type TrustControlsDraft,
} from "./config-sections/types"

import type { Playbook, PlaybookCategoryTag, TrustMode } from "./playbooks-data"

const SUB = "var(--field-supporting)"
const TXT = "var(--foreground)"

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "playbooks", label: "Playbooks", icon: "BookOpen" },
]

// ── Step definitions ─────────────────────────────────────────────────────

type WizardStepId = "basics" | "moment" | "hard-gates" | "objective" | "knowledge" | "outreach" | "trust" | "review"

const WIZARD_STEPS: { id: WizardStepId; label: string }[] = [
  { id: "basics",     label: "Basics" },
  { id: "moment",     label: "Moment" },
  { id: "hard-gates", label: "Hard Gates" },
  { id: "objective",  label: "Objective" },
  { id: "knowledge",  label: "Knowledge" },
  { id: "outreach",   label: "Outreach" },
  { id: "trust",      label: "Trust" },
  { id: "review",     label: "Review" },
]

// ── Wizard-wide draft ────────────────────────────────────────────────────

interface WizardDraft {
  basics:            BasicsDraft
  moment:            MomentDraft
  hardGates:         HardGatesDraft
  objectiveSuccess:  ObjectiveSuccessDraft
  knowledge:         KnowledgeDraft
  phasesActions:     PhasesActionsDraft
  trustControls:     TrustControlsDraft
}

function emptyWizardDraft(): WizardDraft {
  return {
    basics:           EMPTY_BASICS_DRAFT,
    moment:           EMPTY_MOMENT_DRAFT,
    hardGates:        EMPTY_HARD_GATES_DRAFT,
    objectiveSuccess: EMPTY_OBJECTIVE_SUCCESS_DRAFT,
    knowledge:        EMPTY_KNOWLEDGE_DRAFT,
    phasesActions:    EMPTY_PHASES_ACTIONS_DRAFT,
    trustControls:    EMPTY_TRUST_CONTROLS_DRAFT,
  }
}

// ── Field-level progress — one entry per field a step shows in "STEP
// PROGRESS", and the subset marked `required` also feeds the wizard-wide
// "{n} / {required} required fields complete" counter (all 7 steps share
// one counter, matching the step pills' own free, ungated navigation). ──

interface ProgressItem {
  label:    string
  required: boolean
  complete: boolean
}

function stepProgress(stepId: WizardStepId, d: WizardDraft): ProgressItem[] {
  switch (stepId) {
    case "basics":
      return [
        { label: "Playbook Name",  required: true,  complete: d.basics.name.trim().length > 0 },
        { label: "Short Description", required: false, complete: d.basics.shortDescription.trim().length > 0 },
        { label: "Department",     required: true,  complete: d.basics.department !== null },
        { label: "Owner",          required: true,  complete: d.basics.owner !== null },
        { label: "Priority",       required: true,  complete: d.basics.priority !== null },
        { label: "Tags",           required: false, complete: d.basics.tags.trim().length > 0 },
      ]
    case "moment":
      return [
        { label: "Primary Event / Moment", required: true,  complete: d.moment.primaryEvent !== null },
        { label: "Event Source / System",  required: true,  complete: d.moment.eventSources.length > 0 },
        { label: "Business Meaning",       required: false, complete: d.moment.businessMeaning.trim().length > 0 },
        { label: "Qualifying Conditions",  required: false, complete: d.moment.qualifyingConditions.length > 0 },
      ]
    case "hard-gates":
      return [
        { label: "Operational Gates Reviewed",     required: false, complete: true },
        { label: "Legal & Compliance Gates Reviewed", required: false, complete: true },
        { label: "Custom Gates",                   required: false, complete: d.hardGates.customGates.length > 0 },
      ]
    case "objective":
      return [
        { label: "Goal Type",               required: true,  complete: d.objectiveSuccess.goalType !== null },
        { label: "Primary Success Events",  required: true,  complete: d.objectiveSuccess.successEvents.length > 0 },
        { label: "Exit Conditions",         required: false, complete: d.objectiveSuccess.enabledExitConditionIds.length > 0 || d.objectiveSuccess.customExitConditions.length > 0 },
        { label: "Strategy Intent Notes",   required: false, complete: d.objectiveSuccess.strategyNotes.trim().length > 0 },
      ]
    case "knowledge":
      return [
        { label: "Knowledge Packs Selected", required: true, complete: d.knowledge.selectedPackIds.length > 0 },
      ]
    case "outreach":
      return [
        { label: "Sequential Phases",  required: true,  complete: d.phasesActions.phases.length > 0 },
        { label: "Signal Phases",      required: false, complete: d.phasesActions.signalPhases.length > 0 },
        { label: "Playbook-wide Settings", required: false, complete: true },
      ]
    case "trust":
      return [
        { label: "Confidence Threshold", required: false, complete: true },
        { label: "Sensitive Topics",     required: false, complete: d.trustControls.sensitiveTopics.length > 0 },
        { label: "Handoff Triggers",     required: false, complete: d.trustControls.handoffTriggers.some(t => t.enabled) },
      ]
    default:
      return []
  }
}

function allRequiredFields(d: WizardDraft): { complete: number; total: number } {
  const steps: WizardStepId[] = ["basics", "moment", "hard-gates", "objective", "knowledge", "outreach", "trust"]
  const items = steps.flatMap(s => stepProgress(s, d)).filter(i => i.required)
  return { complete: items.filter(i => i.complete).length, total: items.length }
}

function StepProgressDot({ item }: { item: ProgressItem }) {
  const color = item.complete ? "var(--tag-success-fg)" : item.required ? "var(--tag-error-fg)" : "var(--field-border)"
  return <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
}

function StepProgressRail({ stepId, draft }: { stepId: WizardStepId; draft: WizardDraft }) {
  const items = stepProgress(stepId, draft)
  if (items.length === 0) return null
  return (
    <CardContainer size="sm" className="flex flex-col gap-[10px]">
      <span style={{ fontSize: 11, fontWeight: 700, color: SUB, letterSpacing: "0.06em" }}>STEP PROGRESS</span>
      <div className="flex flex-col gap-[8px]">
        {items.map(item => (
          <div key={item.label} className="flex items-center gap-[8px]">
            <StepProgressDot item={item} />
            <span style={{ fontSize: 12, color: TXT }}>{item.label}</span>
          </div>
        ))}
      </div>
    </CardContainer>
  )
}

// ── Review step helpers ──────────────────────────────────────────────────

interface SectionSummary {
  key:     WizardStepId
  label:   string
  passed:  boolean
  summary: string
}

function reviewSections(d: WizardDraft): SectionSummary[] {
  const emptyMsg = "No data configured yet — click Edit to fill in this step."
  return [
    {
      key: "basics", label: "Basics",
      passed: d.basics.name.trim().length > 0 && d.basics.department !== null && d.basics.owner !== null && d.basics.priority !== null,
      summary: d.basics.name.trim()
        ? `${d.basics.name} · ${d.basics.department ?? "No department"} · ${d.basics.owner ?? "No owner"}`
        : emptyMsg,
    },
    {
      key: "moment", label: "Moment Definition",
      passed: d.moment.primaryEvent !== null && d.moment.eventSources.length > 0,
      summary: d.moment.primaryEvent
        ? `${d.moment.primaryEvent} · ${d.moment.eventSources.length} source${d.moment.eventSources.length === 1 ? "" : "s"}`
        : emptyMsg,
    },
    {
      key: "hard-gates", label: "Hard Gates",
      passed: true,
      summary: `${TENANT_GATE_CATALOG.length} tenant gates applied · ${d.hardGates.customGates.length} custom gate${d.hardGates.customGates.length === 1 ? "" : "s"}`,
    },
    {
      key: "objective", label: "Objective & Success",
      passed: d.objectiveSuccess.goalType !== null && d.objectiveSuccess.successEvents.length > 0,
      summary: d.objectiveSuccess.goalType
        ? `${d.objectiveSuccess.goalType} · ${d.objectiveSuccess.successEvents.length} success event${d.objectiveSuccess.successEvents.length === 1 ? "" : "s"}`
        : emptyMsg,
    },
    {
      key: "knowledge", label: "Knowledge",
      passed: d.knowledge.selectedPackIds.length > 0,
      summary: d.knowledge.selectedPackIds.length > 0
        ? `${d.knowledge.selectedPackIds.length} knowledge pack${d.knowledge.selectedPackIds.length === 1 ? "" : "s"} selected`
        : emptyMsg,
    },
    {
      key: "outreach", label: "Outreach",
      passed: d.phasesActions.phases.length > 0,
      summary: d.phasesActions.phases.length > 0
        ? `${d.phasesActions.phases.length} phase${d.phasesActions.phases.length === 1 ? "" : "s"} · ${d.phasesActions.signalPhases.length} signal phase${d.phasesActions.signalPhases.length === 1 ? "" : "s"}`
        : emptyMsg,
    },
    {
      key: "trust", label: "Trust Controls",
      passed: true,
      summary: `${d.trustControls.confidenceThreshold}% confidence · ${d.trustControls.sensitiveTopics.length} sensitive topics`,
    },
  ]
}

function ReviewSectionRow({ section, draft, onEdit }: { section: SectionSummary; draft: WizardDraft; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const items = stepProgress(section.key, draft)
  return (
    <div style={{ borderBottom: "1px solid var(--field-border)" }}>
      <div className="flex items-center gap-[10px]" style={{ padding: "12px 0" }}>
        <button onClick={() => setExpanded(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: SUB, display: "flex" }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-[8px]">
            <span style={{ fontSize: 13, fontWeight: 600, color: TXT }}>{section.label}</span>
            <Tag variant={section.passed ? "success" : "alert"} size="sm">{section.passed ? "Complete" : "Incomplete"}</Tag>
          </div>
          <p style={{ fontSize: 12, color: SUB, margin: "3px 0 0" }}>{section.summary}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={onEdit}>Edit</Button>
      </div>
      {expanded && items.length > 0 && (
        <div className="flex flex-col gap-[6px]" style={{ padding: "0 0 14px 24px" }}>
          {items.map(item => (
            <div key={item.label} className="flex items-center gap-[8px]">
              <StepProgressDot item={item} />
              <span style={{ fontSize: 12, color: SUB }}>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NbaIntelligenceSummary({ draft }: { draft: WizardDraft }) {
  const d = draft
  const sourceList = d.moment.eventSources.length > 0 ? d.moment.eventSources.join(", ") : "no sources yet"

  const blockers: string[] = [
    ...TENANT_GATE_CATALOG.map(g => g.name),
    ...d.objectiveSuccess.enabledExitConditionIds
      .map(id => PREDEFINED_EXIT_CONDITIONS.find(c => c.id === id)?.label)
      .filter((l): l is string => !!l),
    ...d.objectiveSuccess.customExitConditions.filter(c => c.text.trim()).map(c => c.text),
  ]

  return (
    <CardContainer className="flex flex-col gap-[16px]">
      <div className="flex items-center gap-[8px]">
        <Sparkles size={16} style={{ color: "var(--tag-purple-fg)" }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: TXT }}>NBA Intelligence Summary</span>
      </div>

      <div className="grid grid-cols-2 gap-[16px]">
        <div className="flex flex-col gap-[6px]">
          <div className="flex items-center gap-[6px]">
            <RadioTower size={13} style={{ color: SUB }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: SUB }}>Why This Playbook May Be Selected</span>
          </div>
          <p style={{ fontSize: 12, color: TXT, margin: 0, lineHeight: 1.5 }}>
            Triggers when "{d.moment.primaryEvent ?? "a moment is not yet set"}" is detected via {sourceList}, aiming for {d.objectiveSuccess.goalType?.toLowerCase() ?? "an objective not yet set"}.
          </p>
        </div>

        <div className="flex flex-col gap-[6px]">
          <div className="flex items-center gap-[6px]">
            <ShieldAlert size={13} style={{ color: SUB }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: SUB }}>What Can Block Execution</span>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 3 }}>
            {blockers.slice(0, 6).map((b, i) => (
              <li key={i} style={{ fontSize: 12, color: TXT }}>• {b}</li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-[6px]">
          <div className="flex items-center gap-[6px]">
            <ShieldCheck size={13} style={{ color: SUB }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: SUB }}>What NBA Can Adapt</span>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 3 }}>
            <li style={{ fontSize: 12, color: TXT }}><strong>Timing</strong> — When to send actions within eligibility windows</li>
            <li style={{ fontSize: 12, color: TXT }}><strong>Channel</strong> — Best channel from allowed set based on preference</li>
            <li style={{ fontSize: 12, color: TXT }}><strong>Content</strong> — Personalization within content mode constraints</li>
            <li style={{ fontSize: 12, color: TXT }}><strong>Skipping</strong> — May skip optional actions if unneeded</li>
          </ul>
        </div>

        <div className="flex flex-col gap-[6px]">
          <div className="flex items-center gap-[6px]">
            <Clock size={13} style={{ color: SUB }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: SUB }}>What Requires Approval</span>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 3 }}>
            <li style={{ fontSize: 12, color: TXT }}>• Confidence below {d.trustControls.confidenceThreshold}% → automatic approval routing</li>
            <li style={{ fontSize: 12, color: TXT }}>• {d.trustControls.sensitiveTopics.length} sensitive topics → blocked or requires approval</li>
          </ul>
        </div>
      </div>
    </CardContainer>
  )
}

// ── Finalize — draft → Playbook ──────────────────────────────────────────

function initialsFrom(name: string): string {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "??"
}

const GOAL_TYPE_CATEGORY: Record<string, PlaybookCategoryTag> = {
  "Book Appointment":            "Onboarding",
  "Start Two-Way Conversation":  "Onboarding",
  "Qualify Lead":                "Onboarding",
  "Re-engage Lead":              "Adoption",
  "Drive Service Appointment":   "Retention",
  "Collect Feedback":            "Adoption",
  "Compliance Notification":     "Renewal",
  "Collect Missing Info":        "Onboarding",
}

const POST_HANDOFF_ESCALATES_TO: Record<string, string> = {
  "original-rep":  "Original Rep",
  "sales-manager": "Sales Manager",
  "round-robin":   "Next Available Agent",
}

function buildPlaybookFromDraft(d: WizardDraft): Playbook {
  const name = d.basics.name.trim() || "Untitled Playbook"
  const ownerName = d.basics.owner ?? "Unassigned"
  const trustMode: TrustMode = d.trustControls.requireApprovalBelowThreshold ? "Approval Required" : "Auto-Execute"
  const today = "2026-09-10"

  const gateOverrides = TENANT_GATE_CATALOG.map(g => ({ text: g.description, action: "Suppress Playbook" as const }))
  const operational = gateOverrides.filter((_, i) => TENANT_GATE_CATALOG[i].tier === "operational")
  const legal        = gateOverrides.filter((_, i) => TENANT_GATE_CATALOG[i].tier === "legal")

  const phases = d.phasesActions.phases.map(p => ({
    id: p.id, name: p.name || "Untitled Phase", durationLabel: p.durationLabel || "—",
    maxAttempts: p.maxAttempts || 1, channels: p.channels, description: p.description,
  }))

  return {
    id: `PB-DRAFT-${Date.now()}`,
    name,
    shortDescription: d.basics.shortDescription.trim() || "No description provided.",
    categoryTag: (d.objectiveSuccess.goalType && GOAL_TYPE_CATEGORY[d.objectiveSuccess.goalType]) || "Onboarding",
    status: "Draft",
    version: "v1.0",
    owner: { name: ownerName, initials: initialsFrom(ownerName), colorSeed: ownerName },
    updatedRelative: "just now",
    trustMode,
    phaseCount: phases.length,
    gateCount: TENANT_GATE_CATALOG.length + d.hardGates.customGates.length,
    moment: {
      primaryEvent: d.moment.primaryEvent ?? "Not set",
      eventSources: d.moment.eventSources,
      businessMeaning: d.moment.businessMeaning || undefined,
      qualifyingConditions: d.moment.qualifyingConditions
        .filter(c => c.field.trim())
        .map(c => `${c.field} ${c.operator} ${c.value}`.trim()),
    },
    trustControls: {
      mode: trustMode,
      confidenceThreshold: d.trustControls.confidenceThreshold,
      escalatesTo: POST_HANDOFF_ESCALATES_TO[d.trustControls.postHandoffBehavior] ?? "Assigned CSM",
    },
    hardGates: {
      operational,
      legal,
      custom: d.hardGates.customGates.map(g => ({ text: g.text, action: g.action })),
    },
    objective: {
      goalType: d.objectiveSuccess.goalType ?? "Not set",
      text: d.objectiveSuccess.strategyNotes.trim() || `Achieve ${d.objectiveSuccess.goalType ?? "the primary objective"} for engaged customers.`,
      successConditionText: d.objectiveSuccess.successEvents.length > 0
        ? `One of: ${d.objectiveSuccess.successEvents.join(", ")}`
        : "Success condition not yet defined.",
    },
    phases,
    knowledgePackIds: d.knowledge.selectedPackIds,
    activity: {
      momentsTriggered: 0, momentsTriggeredDeltaPct: 0, plansInstantiated: 0, conversionRatePct: 0,
      autoExecuted: 0, autoExecutedPct: 0, approvalsRequired: 0, approvalsRequiredPct: 0,
      planSuccessRatePct: 0, successCount: 0, exitedWithoutSuccessPct: 0, nbaSelectionRatePct: 0,
      avgPlanDurationDays: 0, accountsReached: 0,
      phaseFunnel: phases.map(p => ({ phase: p.name, pct: 0, count: 0 })),
      blockedReasons: [], blockedTotal: 0,
      approvals: { approved: 0, rejected: 0, pending: 0, avgResolutionHours: 0 },
    },
    versions: [{ version: "v1.0", date: today, note: "Initial production release" }],
    history: [{ date: today, category: "Published", description: "Playbook published — v1.0 (Initial production release)" }],
  }
}

// ── Wizard shell ──────────────────────────────────────────────────────────

export interface BuilderWizardProps {
  onCancel: () => void
  onFinish: (playbook: Playbook) => void
}

export default function BuilderWizard({ onCancel, onFinish }: BuilderWizardProps) {
  const [step, setStep] = useState<WizardStepId>("basics")
  const [draft, setDraft] = useState<WizardDraft>(emptyWizardDraft)
  const [versionNote, setVersionNote] = useState("")

  const stepIndex = WIZARD_STEPS.findIndex(s => s.id === step)
  const required = allRequiredFields(draft)

  function goTo(id: WizardStepId) { setStep(id) }
  function goBack() { if (stepIndex > 0) setStep(WIZARD_STEPS[stepIndex - 1].id) }
  function goContinue() { if (stepIndex < WIZARD_STEPS.length - 1) setStep(WIZARD_STEPS[stepIndex + 1].id) }

  // TODO(future prompt): persist as a real draft revision. Stub for now —
  // same pattern as the Configuration tab's "Save Changes".
  function handleSaveDraft() {}

  function handleFinish() {
    onFinish(buildPlaybookFromDraft(draft))
  }

  const sectionsContent: Record<Exclude<WizardStepId, "review">, ReactNode> = {
    basics:     <BasicsSection value={draft.basics} onChange={patch => setDraft(d => ({ ...d, basics: { ...d.basics, ...patch } }))} />,
    moment:     <MomentSection value={draft.moment} onChange={patch => setDraft(d => ({ ...d, moment: { ...d.moment, ...patch } }))} />,
    "hard-gates": <HardGatesSection value={draft.hardGates} onChange={patch => setDraft(d => ({ ...d, hardGates: { ...d.hardGates, ...patch } }))} />,
    objective:  <ObjectiveSuccessSection value={draft.objectiveSuccess} onChange={patch => setDraft(d => ({ ...d, objectiveSuccess: { ...d.objectiveSuccess, ...patch } }))} />,
    knowledge:  <KnowledgeSection value={draft.knowledge} onChange={patch => setDraft(d => ({ ...d, knowledge: { ...d.knowledge, ...patch } }))} />,
    outreach:   (
      <PhasesActionsSection
        value={draft.phasesActions}
        onChange={patch => setDraft(d => ({ ...d, phasesActions: { ...d.phasesActions, ...patch } }))}
        isCreateContext
      />
    ),
    trust:      <TrustControlsSection value={draft.trustControls} onChange={patch => setDraft(d => ({ ...d, trustControls: { ...d.trustControls, ...patch } }))} />,
  }

  // Step state is the step's OWN completeness, not "is it behind the cursor".
  // The wizard lets you jump anywhere, so "everything to the left is done" would
  // be a lie; a tick here means that step's required fields are actually filled.
  // It also retires the "Defaults applied" badge the old pill row carried for
  // Hard Gates — a completed step already says that, in the component's own
  // vocabulary rather than a Tag bolted onto a hand-built pill.
  const steps: StepItem[] = WIZARD_STEPS.map(s => {
    if (s.id === step) return { label: s.label, state: "active" as const }
    if (s.id === "review") return { label: s.label, state: "default" as const }
    const items = stepProgress(s.id, draft)
    const done = items.filter(i => i.required).every(i => i.complete)
    return { label: s.label, state: done ? ("completed" as const) : ("default" as const) }
  })

  return (
    <ScreenLayout
      sidebarItems={SIDEBAR_ITEMS}
      activeSidebarId="playbooks"
      // No Sidebar while a full-page create WIZARD is open (Create pattern) —
      // it has the most work to lose, and Cancel in the footer is the way out.
      hideSidebar
      stickyFooter
      pagination={
        // The DS's own wizard footer, instead of a hand-built 72px bar. It
        // carries one left action, not two: Cancel on the first step, Back on
        // every step after it. The required-fields counter that used to sit in
        // here has moved up beside the Stepper, where progress belongs —
        // the footer is for navigation.
        <StepperNavFooter
          variant={stepIndex === 0 ? "cancel-next" : "back-next"}
          onCancel={onCancel}
          onBack={goBack}
          secondaryLabel="Save draft"
          onSecondary={handleSaveDraft}
          nextLabel={step === "review" ? "Finish Playbook" : "Continue"}
          onNext={step === "review" ? handleFinish : goContinue}
        />
      }
      header={isScrolled => (
        <Header
          size={isScrolled ? "compress" : "size-l"}
          title="Playbook Builder"
          breadcrumb={
            <Breadcrumb depth={2} items={[{ label: "Playbooks", href: "playbooks" }, { label: "Create Playbook" }]} onNavigate={() => onCancel()} />
          }
          aux={
            <div className="flex items-center gap-[10px]">
              <Tag variant="alert" size="sm">Draft</Tag>
              <span style={{ fontSize: 13, fontWeight: 600, color: TXT }}>{draft.basics.name.trim() || "Untitled Playbook"}</span>
            </div>
          }
        />
      )}
    >
      {/* ── Step nav — the DS Stepper, freely clickable in any order ──
          This was a row of hand-built pills: a <button> setting its own
          padding, radius, border and background, which is a Chip's job at
          best and a Stepper's job here. The old comment justified it on the
          grounds that SwitchTab caps at 7 items and has no per-item badge —
          both true, and both about the wrong component. A wizard's steps are
          a Stepper, which has no item cap and carries state per step. */}
      <div className="flex items-center justify-between gap-[16px] flex-wrap" style={{ marginBottom: 24 }}>
        <div style={{ overflowX: "auto" }}>
          <Stepper steps={steps} onStepClick={i => goTo(WIZARD_STEPS[i].id)} />
        </div>
        <span style={{ fontSize: 12, color: SUB, whiteSpace: "nowrap" }}>
          {required.complete} / {required.total} required fields complete
        </span>
      </div>

      {step === "review" ? (
        <div className="flex flex-col gap-[16px]">
          <CardContainer className="flex flex-col gap-[4px]">
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 15, fontWeight: 700, color: TXT }}>Ready to Publish</span>
              <div className="flex items-center gap-[8px]">
                <Tag variant="success" size="sm">{reviewSections(draft).filter(s => s.passed).length} passed</Tag>
                <Tag variant="alert" size="sm">{reviewSections(draft).filter(s => !s.passed).length} incomplete</Tag>
              </div>
            </div>
            <div>
              {reviewSections(draft).map(section => (
                <ReviewSectionRow key={section.key} section={section} draft={draft} onEdit={() => goTo(section.key)} />
              ))}
            </div>
          </CardContainer>

          <NbaIntelligenceSummary draft={draft} />

          <CardContainer className="flex flex-col gap-[10px]">
            <span style={{ fontSize: 14, fontWeight: 600, color: TXT }}>Version & Publishing Notes</span>
            <p style={{ fontSize: 12, color: SUB, margin: 0 }}>
              v1 · Initial Version — This will be published as the first version of this playbook
            </p>
            <Textarea
              placeholder="Optional notes for this version (optional)"
              value={versionNote}
              onChange={e => setVersionNote(e.target.value)}
            />
          </CardContainer>
        </div>
      ) : (
        <div className="flex gap-[24px]">
          <div style={{ width: 240, flexShrink: 0 }}>
            <StepProgressRail stepId={step} draft={draft} />
          </div>
          <div className="flex-1 min-w-0">
            {sectionsContent[step]}
          </div>
        </div>
      )}
    </ScreenLayout>
  )
}
