// DS-GAP: AiSummaryWidget — the agent's read on a record, as widget content.
// Closest DS components: NextBestActionCard (the other AI surface, and the
// model this follows) and CardContainer's purple variant, whose tokens it uses.
//
// ── Why it exists ───────────────────────────────────────────────────────────
//
// Three places drew this same thing three ways: the UCP profile's Overview
// canvas, the roster row's insight block, and the `ai-summary` candidate the
// Widget Builder previews. Michael's call (2026-09-09) is that it becomes ONE
// component so the widget looks the same in every scenario, and then gets
// promoted into the catalog — homologated with the AI Summary the builder
// offers, exactly as NextBestActionCard already is for the recommendation.
//
// ── What it is, and what it is not ──────────────────────────────────────────
//
// It INTERPRETS: a written read of what the data says. The other AI surface
// PROPOSES: `NextBestActionCard`, one action, never stacked. They share the
// single 4-point Sparkle on purpose — both are agent output — and they are not
// interchangeable: an interpretation with a button that does something is a
// recommendation wearing the wrong component.
//
// ── The carousel ────────────────────────────────────────────────────────────
//
// An agent has more than one read of a record, and they are about different
// AREAS: the renewal, the governance posture, the service load. Michael asked
// for the category to be visible so the reader knows where a read is pointing
// before deciding to act on it — and, where the platform has a place to act,
// which place that is.
//
// One visible at a time, with a counter. That is deliberately the same shape
// as the recommendation carousel: the reader reads ONE thing and pages, rather
// than being handed a stack to triage. Unlike the recommendation, several
// reads coexisting is normal here — a read is not a demand on your attention.

import { useEffect, useState } from "react"
import { Sparkle, ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tag, type TagVariant } from "@/components/ui/tag"
import { cn } from "@/lib/utils"

export interface AiInsight {
  id: string
  /** Which agent produced this read. */
  agent: string
  /**
   * The area the read is about — "Renewal", "Governance", "Service", "People".
   *
   * A category, never a state, so it is a neutral-toned Tag: colouring it
   * would put it in competition with the record's own signals, and "Renewal"
   * is not an alert. The vocabulary belongs to the tenant.
   */
  category: string
  /** One line. What the agent concluded. */
  headline: string
  /** Why it concluded that. Wraps; this is the reasoning, not a subtitle. */
  detail: string
  /** 0-100. Shown as given — this component never rounds or re-scales it. */
  confidence: number
  /** The knowledge planes the read leaned on, which is what makes it auditable. */
  drawnFrom?: { label: string; variant: TagVariant }[]
  /**
   * Where in the platform to act on this read — a workflow, a drive, the
   * record's own Snapshot. Omit when the read is context rather than a
   * pointer: a destination that goes nowhere useful is worse than none.
   */
  destination?: { label: string; onOpen: () => void }
}

export interface AiSummaryWidgetProps {
  /** One or many. The carousel controls appear only from two. */
  items: AiInsight[]
  /** The panel's one action: open the concierge on this record. */
  onAsk?: () => void
  askLabel?: string
  /**
   * Narrow slot (1/3 of the canvas): the reasoning and the plane chips drop,
   * the headline and the category never do. Same rule as every other widget —
   * what survives is what you cannot act without.
   */
  compact?: boolean
  className?: string
}

export function AiSummaryWidget({
  items,
  onAsk,
  askLabel = "Ask the concierge",
  compact = false,
  className,
}: AiSummaryWidgetProps) {
  const [i, setI] = useState(0)
  // A record with fewer reads than the last one leaves the index out of range.
  useEffect(() => { setI(0) }, [items.length, items[0]?.id])

  if (items.length === 0) return null
  const item = items[Math.min(i, items.length - 1)]
  const many = items.length > 1
  const go = (d: number) => setI(prev => (prev + d + items.length) % items.length)

  return (
    <div className={cn("flex flex-col gap-[12px]", className)}>
      <div
        className="flex flex-col gap-[8px] rounded-[8px]"
        style={{
          background: "var(--card-purple-bg)",
          border: "1px solid var(--card-purple-border)",
          padding: "12px 14px",
        }}
      >
        {/* Who produced it, what area it is about, and how sure it is. */}
        <div className="flex items-center gap-[6px] min-w-0">
          <Sparkle size={13} strokeWidth={1.75} className="shrink-0" style={{ color: "var(--color-text-purple)" }} />
          <span className="text-[12px] font-semibold shrink-0" style={{ color: "var(--color-text-purple)" }}>
            {item.agent}
          </span>
          <Tag variant="secondary" size="sm">{item.category}</Tag>
          <span className="text-[11px] ml-auto shrink-0" style={{ color: "var(--color-text-purple)", opacity: 0.75 }}>
            {item.confidence}% confidence
          </span>
        </div>

        <span className="text-[13px] font-semibold leading-[1.4]" style={{ color: "var(--color-text-purple)" }}>
          {item.headline}
        </span>

        {!compact && (
          <span className="text-[12px] leading-[1.55]" style={{ color: "var(--color-text-purple)", opacity: 0.9 }}>
            {item.detail}
          </span>
        )}
      </div>

      {/*
        One row for everything that is not the read itself: where it came from
        on the left, then the pager, then the actions. The CTA rides this row
        rather than taking one of its own — a row of a widget for one short
        button is space the canvas charges every other widget for.
      */}
      <div className="flex items-center gap-[6px] flex-wrap">
        {!compact && item.drawnFrom && item.drawnFrom.length > 0 && (
          <>
            <span className="text-[11px]" style={{ color: "var(--field-supporting)" }}>Drawn from</span>
            {item.drawnFrom.map(d => (
              <Tag key={d.label} variant={d.variant} size="sm">{d.label}</Tag>
            ))}
          </>
        )}

        <div className="flex items-center gap-[4px] ml-auto">
          {many && (
            <>
              <span className="text-[11px] whitespace-nowrap" style={{ color: "var(--color-text-subtitle)" }}>
                {i + 1} of {items.length}
              </span>
              <Button
                variant="tertiary" size="sm" iconPosition="alone"
                icon={<ChevronLeft size={14} strokeWidth={1.75} />}
                aria-label="Previous read"
                onClick={() => go(-1)}
              />
              <Button
                variant="tertiary" size="sm" iconPosition="alone"
                icon={<ChevronRight size={14} strokeWidth={1.75} />}
                aria-label="Next read"
                onClick={() => go(1)}
              />
            </>
          )}
          {!compact && item.destination && (
            <Button
              variant="secondary" size="sm"
              icon={<ArrowUpRight size={13} strokeWidth={1.75} />}
              iconPosition="right"
              onClick={item.destination.onOpen}
            >
              {item.destination.label}
            </Button>
          )}
          {onAsk && (
            <Button variant="primary" size="sm" icon={<Sparkle size={13} strokeWidth={1.75} />} onClick={onAsk}>
              {askLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
