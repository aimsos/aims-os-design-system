// Preview SlideOut — "what would this playbook do right now" simulation,
// opened from the list's hover Eye action. Composed entirely from real DS
// components (SlideOut, CardContainer, Tag, HighlightIcon) — no new
// primitives, per the product lead's own scoping for this pass.
//
// INVENTED-DETAIL: the source mock shows scenario fields (Engagement State,
// Consent State, Account Context) that don't exist on the Playbook data
// model — those are illustrative, not wired to real simulation logic here.
// This renders what the data model actually has (the triggering moment and
// its qualifying conditions, the hard gates, the trust mode) in the same
// shape, rather than inventing fields with no backing data.
//
// The footer's gradient "Go to Playbook" button is the same primaryAction
// gap as the Header CTA — SlideOut's own built-in CTA footer only offers
// variant="primary"/"secondary" (see slide-out.tsx), so this skips it
// (showCta={false}) and builds a footer row using the same experimental
// GradientButton used elsewhere. See header-menu-primary-action.tsx for the
// full DS-GAP reasoning.

import { CircleCheck, Radio, ShieldCheck } from "lucide-react"
import { SlideOut } from "@/components/ui/slide-out"
import { CardContainer } from "@/components/ui/card-container"
import { HighlightIcon } from "@/components/ui/highlight-icon"
import { Tag } from "@/components/ui/tag"
import { Button } from "@/components/ui/button"
import { GradientButton } from "@/components/experimental/header-menu-primary-action"
import type { Playbook } from "./playbooks-data"

const TXT = "var(--foreground)"
const SUB = "var(--field-supporting)"

export interface PreviewSlideOutProps {
  playbook: Playbook | null
  onClose: () => void
  onGoToPlaybook: (id: string) => void
}

export function PreviewSlideOut({ playbook, onClose, onGoToPlaybook }: PreviewSlideOutProps) {
  return (
    <SlideOut
      open={playbook !== null}
      onClose={onClose}
      type="with-variants"
      size="m"
      title={playbook?.name ?? ""}
      subtitle="Preview simulation"
      statusLabel={playbook?.status ?? ""}
      showTabs={false}
      showSearchBar={false}
      showChips={false}
      showCta={false}
    >
      {playbook && (
        <div className="flex flex-col gap-[16px]" style={{ padding: 0 }}>
          <div
            className="flex items-start gap-[10px]"
            style={{ paddingTop: 12, paddingBottom: 12, paddingLeft: 16, paddingRight: 16, borderRadius: 8, background: "var(--tag-alert-bg)", border: "1px solid var(--tag-alert-bd)" }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--tag-alert-fg)" }}>Preview:</span>
            <p style={{ fontSize: 12, color: "var(--tag-alert-fg)", margin: 0, lineHeight: 1.5 }}>
              Example simulation based on representative data. Actual runtime behavior varies by real-time signals and NBA engine decisioning.
            </p>
          </div>

          <div className="flex items-center gap-[6px]">
            <span style={{ fontSize: 13, fontWeight: 700, color: TXT }}>Scenario Input</span>
          </div>

          <CardContainer size="sm" className="flex items-start gap-[10px]">
            <HighlightIcon icon={<Radio size={16} />} variant="purple" size="md" />
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--hi-purple-icon)" }}>
                Primary Moment
              </span>
              <div style={{ fontSize: 13, fontWeight: 600, color: TXT, marginTop: 2 }}>{playbook.moment.primaryEvent}</div>
              {playbook.moment.businessMeaning && (
                <p style={{ fontSize: 12, color: SUB, margin: "4px 0 0", lineHeight: 1.5 }}>{playbook.moment.businessMeaning}</p>
              )}
            </div>
          </CardContainer>

          <CardContainer size="sm">
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: SUB }}>
              Qualifying Conditions
            </span>
            <ul className="flex flex-col gap-[4px]" style={{ margin: "6px 0 0", padding: 0, listStyle: "none" }}>
              {playbook.moment.qualifyingConditions.map((c, i) => (
                <li key={i} style={{ fontSize: 12, color: TXT }}>{c}</li>
              ))}
            </ul>
          </CardContainer>

          <div className="flex items-center gap-[6px]">
            <CircleCheck size={15} style={{ color: "var(--hi-success-icon)" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: TXT }}>Why This Playbook Qualifies</span>
          </div>

          <CardContainer size="sm" variant="green" className="flex flex-col gap-[8px]">
            {playbook.moment.qualifyingConditions.map((c, i) => (
              <div key={i} className="flex items-center gap-[8px]">
                <CircleCheck size={14} style={{ color: "var(--hi-success-icon)", flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: TXT }}>{c}</span>
              </div>
            ))}
          </CardContainer>

          <div className="flex items-center gap-[6px]">
            <ShieldCheck size={15} style={{ color: "var(--hi-informative-icon)" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: TXT }}>Hard Gate Evaluation</span>
          </div>

          <CardContainer size="sm">
            <div className="flex items-center gap-[8px]">
              <Tag variant="success" size="sm">Passed</Tag>
              <span style={{ fontSize: 12, color: TXT }}>
                All {playbook.hardGates.operational.length + playbook.hardGates.legal.length} hard gates passed — playbook is eligible for execution.
              </span>
            </div>
          </CardContainer>
        </div>
      )}

      <div className="flex items-center justify-between" style={{ marginTop: 20 }}>
        <Button variant="tertiary" onClick={onClose}>Close</Button>
        {playbook && (
          <GradientButton onClick={() => onGoToPlaybook(playbook.id)}>
            Go to Playbook →
          </GradientButton>
        )}
      </div>
    </SlideOut>
  )
}
