// DS-GAP: PlaybookListCard
//
// Two things here have no real DS component behind them, requested directly
// off a product-lead mock (not a DS pattern page):
//
//   1. Per-field coloured meta icons. EntityList (the real DS list row) has
//      the identical `primaryMeta` concept already and deliberately renders
//      every icon in `var(--muted-foreground)` — see entity-list.tsx's
//      MetaItemView. This reimplements that row rather than editing the
//      real component, using the same semantic icon-color tokens
//      HighlightIcon already publishes (ICON_DARK_VAR), so at least the
//      colors aren't invented.
//   2. A hover-revealed Preview action (the eye icon). EntityList's own
//      `actions`/`showMenu` API could plausibly grow a third slot for this
//      instead of a card that no longer uses EntityList at all.
//
// (A coloured left accent bar per category was here too — removed per
// product feedback 2026-09-15, it read as too close to the CardContainer
// "no accent stripes" rule for comfort. Category is still visible via the
// Tag chip on the right.)
//
// Flagging for @mike (DS Lead): if this direction is kept, the honest fix
// is (1) as a real `iconColor` field on EntityList's `ELMetaItem` — not a
// second component reimplementing the whole row from scratch. This file is
// the prototype for that conversation, not the answer to it.
//
// One call site: pm-lex-playbooks.tsx's list.

import type { ReactNode } from "react"
import { Eye, MoreHorizontal } from "lucide-react"
import { CardContainer } from "@/components/ui/card-container"
import { AvatarCircle } from "@/components/ui/avatar"
import { Tag, type TagVariant } from "@/components/ui/tag"

const TXT = "var(--foreground)"
const SUB = "var(--field-supporting)"

// Same semantic tokens HighlightIcon uses for its "dark" icon color — see
// src/components/ui/highlight-icon.tsx ICON_DARK_VAR. Reused here rather
// than inventing new colors for an inline (non-tiled) icon.
const META_ICON_COLOR: Record<string, string> = {
  informative:  "var(--hi-informative-icon)",
  success:      "var(--hi-success-icon)",
  alert:        "var(--hi-alert-icon)",
  error:        "var(--hi-error-icon)",
  neutral:      "var(--hi-neutral-icon)",
  yellow:       "var(--hi-yellow-icon)",
  lime:         "var(--hi-lime-icon)",
  purple:       "var(--hi-purple-icon)",
  "light-blue": "var(--hi-lightblue-icon)",
}

export type PlaybookListCardMetaColor = keyof typeof META_ICON_COLOR

export interface PlaybookListCardMetaItem {
  icon?:    ReactNode
  label:    string
  tooltip?: string
  /** Key into META_ICON_COLOR. Omitted = neutral, matching EntityList's default. */
  color?:   PlaybookListCardMetaColor
}

export interface PlaybookListCardProps {
  title: string
  description: string
  ownerName: string
  meta: PlaybookListCardMetaItem[]
  categoryTag: string
  state: { label: string; variant: TagVariant }
  onClick: () => void
  onMenuClick: (e: React.MouseEvent) => void
  onPreviewClick: (e: React.MouseEvent) => void
}

export function PlaybookListCard({
  title,
  description,
  ownerName,
  meta,
  categoryTag,
  state,
  onClick,
  onMenuClick,
  onPreviewClick,
}: PlaybookListCardProps) {
  return (
    <div className="group relative">
      <CardContainer size="sm" onClick={onClick} className="cursor-pointer">
        <div className="flex items-start justify-between gap-[12px]">
          <div className="flex items-start gap-[10px] min-w-0">
            <AvatarCircle name={ownerName} sizeKey="md" />
            <div className="min-w-0">
              <div style={{ fontSize: 14, fontWeight: 600, color: TXT }}>{title}</div>
              <p style={{ fontSize: 12, color: SUB, margin: "2px 0 0", lineHeight: 1.5 }}>{description}</p>

              <div className="flex items-center gap-[8px] flex-wrap" style={{ marginTop: 8 }}>
                {meta.map((m, i) => (
                  <div key={i} className="flex items-center gap-[8px]">
                    {i > 0 && <span aria-hidden style={{ width: 3, height: 3, borderRadius: "50%", background: SUB }} />}
                    <div className="flex items-center gap-[4px]" title={m.tooltip}>
                      {m.icon && (
                        <span style={{ color: m.color ? META_ICON_COLOR[m.color] : "var(--muted-foreground)", display: "inline-flex" }}>
                          {m.icon}
                        </span>
                      )}
                      <span className="text-xs font-medium whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                        {m.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-[6px] shrink-0">
            <button
              onClick={e => { e.stopPropagation(); onPreviewClick(e) }}
              aria-label="Preview"
              title="Preview"
              className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              style={{ width: 24, height: 24, borderRadius: 6, background: "none", border: "none", cursor: "pointer", color: SUB }}
            >
              <Eye size={15} />
            </button>
            <Tag variant="lightBlue" size="sm">{categoryTag}</Tag>
            <Tag variant={state.variant} size="sm">{state.label}</Tag>
            <button
              onClick={e => { e.stopPropagation(); onMenuClick(e) }}
              aria-label="More actions"
              className="flex items-center justify-center"
              style={{ width: 24, height: 24, borderRadius: 6, background: "none", border: "none", cursor: "pointer", color: SUB }}
            >
              <MoreHorizontal size={15} />
            </button>
          </div>
        </div>
      </CardContainer>
    </div>
  )
}
