// DS-GAP: WidgetPreview — the one place that answers "what does widget type X
// look like". Closest DS component: none — WidgetContent renders a CATALOGUED
// widget by its catalogId, and this resolves a builder/library TYPE to whatever
// can draw it.
//
// ── Why this exists ─────────────────────────────────────────────────────────
//
// Four screens showed the same widget four different ways. The Widget Builder
// resolved a type through a four-step chain and drew real content; Widget
// Library and Marketplace drew an abstract miniature keyed by a LOCAL union of
// ten skeleton names that no other file knew about; the Universal Profile wrote
// its slot content by hand. Same donut, four donuts.
//
// The chain lived inline in the builder, so nothing else could reach it. It is
// here now, and the builder calls it too — there is exactly one implementation.
//
// ── The chain, in order of how specified the type is ────────────────────────
//
//   1. A chart mode. The twelve chart types all share catalogId "charts", and
//      the DS's ChartsWidgetContent draws exactly one of them (a multi-series
//      line), so going by catalogId alone would show a line chart when you
//      picked Pie. The mode wins over the catalog for this reason only.
//   2. A catalogued type. Its REAL component — the same one the catalog page
//      renders, so the preview cannot drift from the spec.
//   3. A candidate. No spec yet, so no catalogued component, but composed from
//      DS parts, so specifying it later is a move and not a rewrite.
//   4. Nothing matched. The abstract shape, which is honest: an unknown id has
//      no content to show, and inventing some would be worse than admitting it.

import { WidgetContent } from "@/components/experimental/widget-content"
import { CandidateWidgetContent, hasCandidateContent } from "@/components/experimental/widget-candidate-content"
import { ChartModeContent, hasChartMode } from "@/components/experimental/widget-chart-content"
import { WidgetShapePreview, seedFrom } from "@/components/experimental/widget-parts"
import { WIDGET_CATALOG } from "@/lib/widget-catalog"

export interface WidgetPreviewProps {
  /** A widget type id from WIDGET_CATALOG — "donut", "kpi", "spend-breakdown". */
  typeId: string
  /** Height for the step-4 fallback shape only. Real content sizes itself. */
  fallbackHeight?: number
  /**
   * Clip the content to this height, fading the cut edge.
   *
   * A catalog card is a thumbnail: it needs a glimpse of the real widget, not
   * the whole thing. Left unset — the builder's preview, a canvas slot — the
   * widget renders at its natural height. Set on a grid of cards, it keeps
   * every card the same height, which is what makes a grid readable at all.
   *
   * The fade is what separates "clipped on purpose" from "broken": a hard cut
   * through the middle of a row reads as a rendering bug.
   */
  clipTo?: number
  /**
   * The preview filter the viewer has applied, if this surface offers any.
   *
   * Only the chart modes read it, and only to re-shape their own fixtures — a
   * chip that changes nothing teaches that filters do nothing. A catalog card
   * or a canvas slot has no filter row and leaves this unset.
   */
  filter?: string | null
  className?: string
}

/** True when this type resolves to real content rather than the fallback shape. */
export function hasWidgetContent(typeId: string): boolean {
  const def = WIDGET_CATALOG.find(w => w.id === typeId)
  if (!def) return false
  return hasChartMode(def.id) || def.catalogId !== null || hasCandidateContent(def.id)
}

/**
 * The body of a widget — no card, no title, no chrome. Whatever draws it, the
 * caller wraps it: WidgetFather in the builder, a card in the library, a canvas
 * slot in a profile.
 */
export function WidgetPreview({ typeId, fallbackHeight = 120, clipTo, filter = null, className }: WidgetPreviewProps) {
  const def = WIDGET_CATALOG.find(w => w.id === typeId)

  const body = !def
    ? <WidgetShapePreview shape="kpi" height={fallbackHeight} seed={seedFrom(typeId)} />
    : hasChartMode(def.id)
      ? <ChartModeContent id={def.id} filter={filter} />
      : def.catalogId
        ? <WidgetContent id={def.catalogId} />
        : hasCandidateContent(def.id)
          ? <CandidateWidgetContent id={def.id} />
          : <WidgetShapePreview shape={def.shape} height={fallbackHeight} seed={seedFrom(def.id)} />

  if (clipTo === undefined) {
    return className ? <div className={className}>{body}</div> : body
  }

  const fade = "linear-gradient(to bottom, black 0%, black 72%, transparent 100%)"
  return (
    <div
      className={className}
      aria-hidden
      style={{
        height: clipTo,
        overflow: "hidden",
        pointerEvents: "none",
        maskImage: fade,
        WebkitMaskImage: fade,
      }}
    >
      {body}
    </div>
  )
}
