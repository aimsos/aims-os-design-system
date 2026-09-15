import { useRef, useState, useEffect } from "react"
import { HighlightCard, type HighlightCardStyle, type HighlightCardFeedback } from "@/components/ui/highlight-card"
import type { HighlightIconVariant } from "@/components/ui/highlight-icon"

export interface MetricCardDef {
  label:     string
  value:     string | number
  iconName?: string
  /** The icon's tint — how one card in the grid says it counts a different
   *  KIND of thing from its neighbour. See HighlightCard.iconVariant. */
  iconVariant?: HighlightIconVariant
  style?:    HighlightCardStyle
  /** The delta line under the value — "+2.1%", "No change", "+142 this month".
   *  HighlightCard has always rendered this; the grid could not pass it through,
   *  so any KPI with a trend had to be hand-rolled. Half of what a KPI is, is
   *  how it moved, and that is a plausible reason this grid sat unused in 14
   *  screens that each drew their own. */
  feedback?:     string
  feedbackType?: HighlightCardFeedback
}

interface AdaptiveMetricGridProps {
  cards:      MetricCardDef[]
  /** Container width (px) below which layout switches from 3-col to 2+1. Default: 310 */
  threshold?: number
  className?: string
}

/**
 * 3-col HighlightCard grid that degrades to 2+1 when the container is extremely narrow.
 * Truncation is handled by HighlightCard internally (truncate + Tooltip on the label).
 * Uses ResizeObserver so it responds to panel drag-resize in real time.
 */
export function AdaptiveMetricGrid({ cards, threshold = 310, className }: AdaptiveMetricGridProps) {
  const containerRef               = useRef<HTMLDivElement>(null)
  const [containerWidth, setWidth] = useState(9999)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setWidth(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const isNarrow = containerWidth < threshold

  return (
    <div ref={containerRef} className={className}>
      {!isNarrow ? (
        <div className="grid gap-[8px]" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))" }}>
          {cards.map((c, i) => (
            <HighlightCard key={i} label={c.label} value={c.value} iconName={c.iconName} iconVariant={c.iconVariant} feedback={c.feedback} feedbackType={c.feedbackType} style={c.style} className="!w-full" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-[8px]">
          {/* Row 1: first two cards side by side */}
          <div className="grid grid-cols-2 gap-[8px]">
            {cards.slice(0, 2).map((c, i) => (
              <HighlightCard key={i} label={c.label} value={c.value} iconName={c.iconName} iconVariant={c.iconVariant} feedback={c.feedback} feedbackType={c.feedbackType} style={c.style} className="!w-full" />
            ))}
          </div>
          {/* Row 2: third card full-width */}
          {cards.length > 2 && (
            <HighlightCard label={cards[2].label} value={cards[2].value} iconName={cards[2].iconName} feedback={cards[2].feedback} feedbackType={cards[2].feedbackType} style={cards[2].style} className="!w-full" />
          )}
        </div>
      )}
    </div>
  )
}
