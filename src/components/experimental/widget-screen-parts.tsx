// DS-GAP: three pieces of chrome the widget screens all need and the DS does not
// have as components. Each is a thin arrangement of real DS components — no new
// colour, no new spacing scale — so promoting any of them is a rename, not a
// rewrite.
//
// ── Why this file exists ────────────────────────────────────────────────────
//
// The duplicate-component check flagged seven names defined in more than one
// widget screen. Reading them, only three were actually the same component
// written twice; the rest were different components that happened to share a
// name, and merging those would have been worse than leaving them:
//
//   FreshnessBadge  identical in composable-dashboards and dashboard-canvas —
//                   same three branches, the prop was called `status` in one and
//                   `f` in the other. A real duplicate.
//   StatusBadge     identical in composable-dashboards and dashboard-canvas —
//                   the same status→variant map, one written as a Record and one
//                   as a tuple. A real duplicate.
//   OptionCard      the same idea in new-dashboard and widget-builder, drawn
//                   differently: a raw Lucide icon versus a HighlightIcon, 14/16
//                   padding versus 12, and only one of them tinted its title when
//                   selected. One idea, so one component — the HighlightIcon
//                   version, since a bare Lucide glyph in a card is the thing
//                   HighlightIcon exists to replace.
//
// Left alone deliberately:
//
//   HealthBadge     four states in widget-library, two in composable-dashboards.
//                   Different components. Merging would have given the library
//                   an "active → null" it does not want.
//   SectionLabel    a numbered step circle in widget-builder, an uppercase
//                   caption in three other screens. Same name, unrelated jobs.
//
// The check matches names, never behaviour — it says "look at these", not
// "merge these". Two of five here were worth merging.

import { useState } from "react"
import * as LucideIcons from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tag } from "@/components/ui/tag"
import { CardContainer } from "@/components/ui/card-container"
import { HighlightIcon } from "@/components/ui/highlight-icon"

export type WidgetFreshness = "live" | "fresh" | "stale"

/** How current a widget's data is.
 *
 *  `fresh` renders nothing on purpose: it is the default state, and a badge on
 *  every single widget saying "this is normal" is noise. Only the two states
 *  worth interrupting for get a badge. */
export function FreshnessBadge({ status }: { status: WidgetFreshness }) {
  if (status === "fresh") return null
  if (status === "live")  return <Tag variant="success" size="sm">Live</Tag>
  return <Tag variant="neutral" size="sm">Stale</Tag>
}

export type DashboardStatus = "published" | "draft" | "pending"

const DASH_STATUS: Record<DashboardStatus, { label: string; variant: "success" | "informative" | "alert" }> = {
  published: { label: "Published", variant: "success" },
  draft:     { label: "Draft",     variant: "informative" },
  pending:   { label: "Pending",   variant: "alert" },
}

/** A dashboard's publication state. */
export function StatusBadge({ status }: { status: DashboardStatus }) {
  const { label, variant } = DASH_STATUS[status]
  return <Tag variant={variant} size="sm">{label}</Tag>
}

/** A two-up choice between named alternatives, each with a line explaining what
 *  it means.
 *
 *  Used wherever a step asks the user to pick between approaches rather than
 *  between values — entity vs dataset, summarize vs record set, profile vs
 *  standalone dashboard. A bare pair of chips can express the same choice but
 *  loses the explanation, which is the part people actually need. */
export function OptionCard({ icon, title, description, selected, onSelect }: {
  /** Lucide icon name, rendered through HighlightIcon. */
  icon: string
  title: string
  description: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <div onClick={onSelect} style={{ cursor: "pointer" }}>
      <CardContainer selected={selected} size="sm" className="!p-0 h-full overflow-hidden">
        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <HighlightIcon iconName={icon} variant={selected ? "informative" : "neutral"} size="sm" />
          <div>
            {/* The title keeps its default colour when selected. The border
                and the icon already say it, and --primary on --surface is a
                weaker contrast pair than --color-text-title — a third signal
                that costs legibility to repeat what two others said. */}
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-title)" }}>{title}</div>
            <p style={{ fontSize: 11, color: "var(--color-text-subtitle)", margin: "2px 0 0", lineHeight: 1.4 }}>{description}</p>
          </div>
        </div>
      </CardContainer>
    </div>
  )
}

export type OverflowItem = {
  label: string
  icon: keyof typeof LucideIcons
  danger?: boolean
  onClick: () => void
}

/** The "···" menu on a catalog card.
 *
 *  Icon + text at size S, which is what CLAUDE.md specifies for this menu, and
 *  the destructive item in --error. Anchored to its trigger with a full-screen
 *  click-catcher behind it, so it closes on any outside click.
 *
 *  Was written twice, identically apart from a 148px vs 160px min-width. 160
 *  won — "Remove from dashboard" is the longest label either screen passes and
 *  it needs the room. */
export function OverflowMenu({ items, onClose }: { items: OverflowItem[]; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 99 }} />
      <div style={{
        position: "absolute", top: "calc(100% + 2px)", right: 0, zIndex: 100,
        background: "var(--surface)", border: "1px solid var(--field-border)",
        borderRadius: 10, boxShadow: "var(--shadow-elevation-3)", minWidth: 160, padding: 4,
      }}>
        {items.map(({ label, icon, danger, onClick }) => {
          const Icon = LucideIcons[icon] as React.FC<{ size?: number; style?: React.CSSProperties; className?: string }>
          return (
            <button
              key={label}
              onClick={e => { e.stopPropagation(); onClick(); onClose() }}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                padding: "7px 10px", background: "none", border: "none", borderRadius: 7,
                cursor: "pointer", fontSize: 12, textAlign: "left",
                color: danger ? "var(--error)" : "var(--foreground)",
              }}
            >
              <Icon size={13} />{label}
            </button>
          )
        })}
      </div>
    </>
  )
}

/** The dismissible banner at the top of a studio page — what this collection is
 *  and the one action worth offering before you have scrolled it.
 *
 *  Dismissal is local and unpersisted on purpose: this is a prototype, and a
 *  banner that stays gone across reloads is a demo you cannot show twice. */
export function StudioWelcome({ iconName, title, description, ctaLabel, onCta }: {
  iconName: string
  title: string
  description: string
  ctaLabel: string
  onCta: () => void
}) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return (
    /* 24, the DS gap between a layer and the next one — this used to be 16,
       which put the banner closer to the filters than the filters were to
       anything else and made the top of these screens read as two clumps. */
    <div style={{ marginBottom: 24 }}>
      <CardContainer variant="default">
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
          <HighlightIcon iconName={iconName} variant="informative" size="lg" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>{title}</p>
            <p style={{ fontSize: 12, color: "var(--field-supporting)", margin: "2px 0 0" }}>{description}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={onCta}>{ctaLabel}</Button>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--field-supporting)", padding: 4, flexShrink: 0, display: "flex" }}
          >
            <LucideIcons.X size={14} />
          </button>
        </div>
      </CardContainer>
    </div>
  )
}
