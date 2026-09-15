/**
 * Next Best Action Card — AIMS OS Design System
 *
 * Source of truth: Figma `Design System - AIMS OS`, node 20206:316306 (the
 * "Next Best Action Card Content" component set), plus its two rules frames
 * (20257:7761, 20258:7787) and the Slideout section (20009:12610). Structure,
 * spacing, type sizes and every token were read from the file, Light and Dark
 * independently.
 *
 * Promoted out of `experimental/` by Michael (2026-09-07): it will grow more
 * variants and appear differently in different parts of the platform, which is
 * a component's job and not a candidate's.
 *
 * WHAT IT IS
 *
 * The proactive recommendation. It sits in its OWN Card Container directly
 * below the Entity Header — never inside it. The header identifies the
 * entity; this proposes what to do about it. Two records, two containers.
 * Sixteen products were reviewed for the Figma study and none of them puts
 * the recommendation in the record header.
 *
 * THE RULES THAT ARE STRUCTURAL, NOT CONVENTIONS
 *
 *   ONE AT A TIME. The prop is `item?`, singular. The engine has already
 *   prioritised, unified and discarded, so showing five is not trusting the
 *   engine — and stacked cards push the real content below the fold. This was
 *   `items: NextBestAction[]` with a `.map`, which is exactly how two
 *   recommendations rendered inside one container for three separate passes.
 *   The singular type is that rule made impossible to break.
 *
 *   NO RECOMMENDATION, NO CARD. `item` undefined renders NOTHING — not an
 *   empty card, not a placeholder, not a "nothing to recommend" message. It
 *   is not an empty state: there is nothing to say when there is nothing to
 *   do.
 *
 *   THE TITLE IS THE ACTION, NOT THE ENGINE. "Next Best Action" names the
 *   engine and already appears as the card's own label; repeating it in the
 *   title wastes the one line that carries the instruction.
 *
 *   IT ALWAYS DECLARES WHEN AND WHY. Timestamp plus rationale. Without a
 *   rationale it is an order, not a proposal.
 *
 *   NO ACCURACY DISCLAIMER. Other products hedge generated content with "may
 *   be inaccurate". A recommendation reaching this surface has passed the
 *   Council, so it declares its source instead of apologising.
 *
 *   ACCEPT ASSIGNS, IT NEVER EXECUTES. The agent executes, the human governs
 *   — never "Call now". And accepting still opens the detail first, because
 *   the card cannot guarantee it showed everything and committing without the
 *   record is accepting blind. There is no inline accept anywhere here.
 *
 *   DISMISS RESOLVES IN PLACE. It commits the user to nothing, so it needs no
 *   detail. The × hides the card for this session only and it returns on
 *   reload; nothing is stored and nothing is fed back to the engine.
 *
 * This is NOT the block that used to live inside the header. That one was a
 * filled purple surface with a HighlightIcon box, a context Tag and a
 * trailing chevron. Figma has none of those: the card is a plain surface, the
 * only colour is the purple label and the bullet, and the actions are real
 * buttons.
 *
 * NO SEVERITY AND NO COLOURS. There is no `severity`, no `dueContext`, no
 * `aiGenerated` and no `actionLabel`. Timing and urgency live in the COPY —
 * the rationale — never in a token: a card that colours itself by urgency
 * competes with the Entity Header's state badge and signal tags, which are
 * the platform's actual urgency channel.
 *
 * Tokens (Figma → repo, all pre-existing, none invented):
 *   Text/Purple              → --color-text-purple      #2c075c / #d8b4fe
 *   Text/Subtitle            → --color-text-subtitle    #2a2a2a / rgba(255,255,255,0.6)
 *   Text/Body                → --color-text-body        #5c5c5c / rgba(255,255,255,0.6)
 *   Surface/Primary/Default  → the DS Button primary variant, not hand-styled
 *
 * ONE DIVERGENCE FROM FIGMA'S PROSE, RESOLVED IN FAVOUR OF ITS INSTANCE
 *
 * The rules frame says the rationale is "ONE LINE, ALWAYS" and truncates with
 * a tooltip. The built instance sets that text node to auto-HEIGHT, which
 * wraps. The instance is what renders, so it wraps here — the same way the
 * instance settles source-and-tags on the Entity Header's stacked row.
 *
 * NOT IMPLEMENTED YET — do not mistake these for oversights
 *
 *   - The character limits are documented, not enforced: title 20/40/60,
 *     rationale 60/90/150, action label max 25. What the card should do when
 *     the engine returns less than the minimum is an open question with
 *     Engineering in Figma's own frame — it cannot invent the consequence.
 *   - The counter that leads to the list when more than one recommendation
 *     exists. Figma names it; nothing renders it yet.
 */

import { X, Sparkle } from "lucide-react"
import { cn } from "@/lib/utils"
import { CardContainer } from "@/components/ui/card-container"
import { Button } from "@/components/ui/button"

// ── One recommendation ──────────────────────────────────────────────────────
export interface NextBestAction {
  id: string
  /** What the agent recommends doing. One line, 14px Semi Bold. */
  title: string
  /** When the recommendation was produced — "2h ago". Renders after the title,
   *  behind a purple bullet. Omit when the host has no timestamp. */
  timeAgo?: string
  /** WHY — the reasoning behind the recommendation. A full sentence that
   *  wraps; this is the one place in the pattern where prose is correct, which
   *  is exactly why the Entity Header itself forbids it ("NO INSIGHT
   *  SECTION"). */
  description: string
  /** "View details" — always rendered. */
  onViewDetails: () => void
  /** "Accept" — the primary action. Omit for the View-details-only variant. */
  onAccept?: () => void
  /** The dismiss control in the top-right corner. Omit to hide it. */
  onDismiss?: () => void
}

export interface NextBestActionCardProps {
  /**
   * ONE recommendation, or none.
   *
   * This is deliberately singular. It used to be `items: NextBestAction[]`
   * and the card stacked every one of them, which put two Next Best Actions
   * in a single container — the record's most important recommendation
   * competing with its second most important, in the same purple box. There
   * is one next best action by definition; if there were two, neither is
   * next.
   *
   * A host with several candidates picks the most prioritized one and passes
   * that. Making the prop singular means no caller can get this wrong, which
   * is the whole reason it is not an array.
   *
   * Omit it, or pass `undefined`, for a record with genuinely nothing to
   * recommend — the card disappears entirely rather than rendering a
   * placeholder.
   */
  item?: NextBestAction
  /**
   * `purple` (the default) is the DS CardContainer purple variant. Purple
   * means "an agent produced this" across the whole system, and this card is
   * the agent's recommendation — so the surface carries it. The colour comes
   * from CardContainer's own variant, never from a background painted in
   * here: painting it by hand was exactly the mistake in the version of this
   * block that used to live inside the header.
   *
   * `default` exists for a host that already sits this card on a purple
   * surface and would otherwise stack two purples.
   */
  variant?: "purple" | "default"
  size?: "default" | "sm"
  /**
   * Render the BODY only — no CardContainer, no surface of its own.
   *
   * For a host that already supplies the surface. The one that does today is a
   * widget slot: `WidgetPreview`'s contract is "the body of a widget — no card,
   * no title, no chrome. Whatever draws it, the caller wraps it", and a
   * CardContainer inside a WidgetFather is a card inside a card.
   *
   * This exists so the recommendation has ONE implementation across both
   * hosts. The alternative was a second renderer in
   * widget-candidate-content.tsx drawing the same label, title and actions
   * again, which is how the same object ends up looking like two.
   *
   * `variant` is ignored when this is set: the purple belongs to the surface,
   * and here the surface is the host's.
   */
  unstyled?: boolean
  className?: string
}

export function NextBestActionCard({
  item,
  variant = "purple",
  size = "default",
  unstyled = false,
  className,
}: NextBestActionCardProps) {
  if (!item) return null
  if (unstyled) {
    return className
      ? <div className={cn(className)}><Suggestion nba={item} compact={size === "sm"} /></div>
      : <Suggestion nba={item} compact={size === "sm"} />
  }
  return (
    <CardContainer variant={variant} size={size === "sm" ? "sm" : undefined} className={cn(className)}>
      <Suggestion nba={item} compact={size === "sm"} />
    </CardContainer>
  )
}

// ── Suggestion — label + dismiss, then title · timeAgo, then why, then actions
function Suggestion({ nba, compact = false }: { nba: NextBestAction; compact?: boolean }) {
  return (
    <div className="flex flex-col gap-[8px]">
      {/* Label row — the purple "Next Best Action" marker with the platform's
          own Sparkle glyph (the single 4-point one, same as the Topbar and the
          header's agent trigger), and the dismiss control pushed to the far
          right. */}
      <div className="flex items-start justify-between gap-[8px]">
        <div className="flex items-center gap-[4px] min-w-0">
          <Sparkle size={14} strokeWidth={1.75} className="shrink-0" style={{ color: "var(--color-text-purple)" }} />
          <span className="text-[14px] font-semibold leading-[1.3]" style={{ color: "var(--color-text-purple)" }}>
            Next Best Action
          </span>
        </div>
        {nba.onDismiss && (
          <Button
            variant="tertiary"
            size="sm"
            iconPosition="alone"
            icon={<X size={14} strokeWidth={1.75} />}
            aria-label="Dismiss this recommendation"
            onClick={nba.onDismiss}
            className="shrink-0"
          />
        )}
      </div>

      {/* Title · timeAgo, then the reasoning. 4px between both pairs. */}
      <div className="flex flex-col gap-[4px]">
        <div className="flex items-baseline gap-[4px] flex-wrap">
          <span className="text-[14px] font-semibold leading-[1.3]" style={{ color: "var(--color-text-subtitle)" }}>
            {nba.title}
          </span>
          {nba.timeAgo && !compact && (
            <>
              <span aria-hidden="true" className="text-[14px] font-medium leading-[1.3]" style={{ color: "var(--color-text-purple)" }}>
                ·
              </span>
              <span className="text-[12px] font-medium leading-[1.3]" style={{ color: "var(--color-text-body)" }}>
                {nba.timeAgo}
              </span>
            </>
          )}
        </div>
        {/* Wraps on purpose — this is the reasoning, not a subtitle. In a
            narrow widget slot it clamps to two lines and the timestamp drops:
            the reasoning is what earns the space, and "View details" is still
            there for the rest. */}
        <p
          className="text-[14px] font-medium leading-[1.5]"
          style={{
            color: "var(--color-text-body)",
            ...(compact ? { display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden" } : {}),
          }}
          title={compact ? nba.description : undefined}
        >
          {nba.description}
        </p>
      </div>

      {/* Actions — DS Buttons, never hand-styled: Accept carries
          Surface/Primary/Default through the primary variant. */}
      <div className="flex items-center gap-[4px]">
        {nba.onAccept && (
          <Button variant="primary" size="sm" onClick={nba.onAccept}>Accept</Button>
        )}
        <Button variant="tertiary" size="sm" onClick={nba.onViewDetails}>View details</Button>
      </div>
    </div>
  )
}
