// ────────────────────────────────────────────────────────────────────────
// Detail shell → History tab.
//
// ENTRIES ARE ENTITY ROWS, GROUPED UNDER A DATE DIVIDER (changed 2026-09-15).
//
// The feed used to be hand-built: a bare flex row per entry with its own
// avatar, its own text sizes, its own right-aligned timestamp column, and two
// hand-rolled pills for the before/after values — a `<span>` with a padding, a
// radius and a `--tag-*-bg` background, which is precisely what audit check 12
// looks for. Every one of those pieces already exists on `EntityList`: the
// icon, the title, the meta row, the tag and the timestamp slot. So the rows
// are real entity rows now, one `CardContainer size="sm"` each, exactly as the
// list view builds them.
//
// The group header is a DATE DIVIDER: the date in Label S (12px / 600) with a
// 1px Border/Neutral/Subtle rule running out from it, the same device the rest
// of the product uses to break a feed by day.
//
// Two things the data doesn't carry, both noted rather than silently
// invented:
//  - No per-entry author — every entry is shown as the playbook's owner
//    (same stand-in used in VersionsTab).
//  - No time-of-day, only a date string — so the row's timestamp is the
//    relative day, and the exact date is the divider above it.
// ────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from "react"
import { History as HistoryIcon } from "lucide-react"
import { Chip } from "@/components/ui/chip"
import { CardContainer } from "@/components/ui/card-container"
import { EntityList, type EntityListItemData } from "@/components/ui/entity-list"
import { EmptyState } from "@/components/ui/empty-state"
import type { Playbook, HistoryCategory, HistoryEntry } from "./playbooks-data"

const SUB = "var(--color-text-subtitle)"

const CATEGORIES: HistoryCategory[] = ["Published", "Configuration", "Trust & NBA", "Gates", "Phases"]

type ELIconVariant = NonNullable<EntityListItemData["iconVariant"]>

const CATEGORY_ICON: Record<HistoryCategory, { iconName: string; iconVariant: ELIconVariant }> = {
  "Published":     { iconName: "Rocket",      iconVariant: "success"    },
  "Configuration": { iconName: "Settings2",   iconVariant: "info"       },
  "Trust & NBA":   { iconName: "ShieldCheck", iconVariant: "purple"     },
  "Gates":         { iconName: "ListChecks",  iconVariant: "yellow"     },
  "Phases":        { iconName: "Layers",      iconVariant: "light-blue" },
}

function parseValueChange(description: string): { from: string; to: string } | null {
  const m = description.match(/from\s+(.+?)\s+to\s+(.+?)(?:\)|$)/i)
  if (!m) return null
  return { from: m[1], to: m[2] }
}

function formatSectionHeader(dateStr: string, todayStr: string): string {
  if (dateStr === todayStr) return "Today"
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatRelative(dateStr: string, todayStr: string): string {
  const days = Math.round((new Date(`${todayStr}T00:00:00`).getTime() - new Date(`${dateStr}T00:00:00`).getTime()) / 86400000)
  if (days <= 0) return "Today"
  if (days === 1) return "1 day ago"
  if (days < 30) return `${days} days ago`
  const months = Math.round(days / 30)
  if (months < 12) return months === 1 ? "1 month ago" : `${months} months ago`
  const years = Math.round(months / 12)
  return years === 1 ? "1 year ago" : `${years} years ago`
}

/** The date in Label S, with a 1px Border/Neutral/Subtle rule out to the edge. */
function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-[12px]">
      <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.5, color: SUB, whiteSpace: "nowrap" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: "var(--color-border-neutral-subtle)" }} />
    </div>
  )
}

function toEntityItem(entry: HistoryEntry, index: number, owner: string, todayStr: string): EntityListItemData {
  const change = parseValueChange(entry.description)
  const { iconName, iconVariant } = CATEGORY_ICON[entry.category]
  return {
    id: `${entry.date}-${index}`,
    title: entry.description,
    iconName,
    iconVariant,
    // The before/after values, as a real Tag via the meta row's `tag` slot —
    // not two coloured <span> pills drawn by hand.
    primaryMeta: change ? [{ tag: `${change.from} → ${change.to}` }] : undefined,
    secondaryMeta: [{ iconName: "User", label: owner, tooltip: `Changed by ${owner}` }],
    tags: [{ label: entry.category }],
    timestamp: formatRelative(entry.date, todayStr),
  }
}

export function HistoryTab({ playbook }: { playbook: Playbook }) {
  const [filter, setFilter] = useState<"All" | HistoryCategory>("All")

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: playbook.history.length }
    for (const cat of CATEGORIES) c[cat] = playbook.history.filter(h => h.category === cat).length
    return c
  }, [playbook.history])

  const todayStr = useMemo(
    () => playbook.history.reduce((max, h) => h.date > max ? h.date : max, playbook.history[0]?.date ?? ""),
    [playbook.history]
  )

  const visible = filter === "All" ? playbook.history : playbook.history.filter(h => h.category === filter)
  const newestFirst = [...visible].sort((a, b) => b.date.localeCompare(a.date))

  const groups = useMemo(() => {
    const byDate = new Map<string, HistoryEntry[]>()
    for (const entry of newestFirst) {
      const list = byDate.get(entry.date) ?? []
      list.push(entry)
      byDate.set(entry.date, list)
    }
    return Array.from(byDate.entries())
  }, [newestFirst])

  return (
    <div className="flex flex-col gap-[24px]">
      <div className="flex flex-wrap gap-[8px]">
        <Chip variant={filter === "All" ? "primary" : "secondary"} size="m" onClick={() => setFilter("All")}>
          All {counts.All}
        </Chip>
        {CATEGORIES.map(cat => (
          <Chip key={cat} variant={filter === cat ? "primary" : "secondary"} size="m" onClick={() => setFilter(cat)}>
            {cat} {counts[cat]}
          </Chip>
        ))}
      </div>

      {groups.length === 0 ? (
        <CardContainer variant="dashed">
          <EmptyState
            icon={HistoryIcon}
            title={`No ${filter.toLowerCase()} changes`}
            description="Nothing in this playbook's history matches the selected category."
            ctaLabel="Show all changes"
            onCta={() => setFilter("All")}
          />
        </CardContainer>
      ) : (
        groups.map(([date, entries]) => (
          <div key={date} className="flex flex-col gap-[12px]">
            <DateDivider label={formatSectionHeader(date, todayStr)} />
            {entries.map((entry, i) => (
              <CardContainer key={`${date}-${i}`} size="sm" className="!p-0 overflow-hidden">
                <EntityList items={[toEntityItem(entry, i, playbook.owner.name, todayStr)]} />
              </CardContainer>
            ))}
          </div>
        ))
      )}
    </div>
  )
}
