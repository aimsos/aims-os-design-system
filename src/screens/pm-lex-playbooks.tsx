import { useEffect, useState } from "react"
import { Plus, Archive as ArchiveIcon, Copy as CopyIcon, BookOpen, Check } from "lucide-react"
import { ScreenLayout } from "@/components/layouts/screen-layout"
import type { SidebarItem } from "@/components/ui/sidebar"
import { Header } from "@/components/ui/header"
import { Filters } from "@/components/ui/filters"
import { FiltersSlideout } from "@/components/ui/filters-slideout"
import { EntityList, type EntityListItemData } from "@/components/ui/entity-list"
import { CardContainer } from "@/components/ui/card-container"
import { EmptyState } from "@/components/ui/empty-state"
import { Pagination } from "@/components/ui/pagination"
import { Menu, MenuItem } from "@/components/ui/menu-item"
import { ModalDialog } from "@/components/ui/modal-dialog"
import { HighlightIcon } from "@/components/ui/highlight-icon"
import { Tag } from "@/components/ui/tag"
import { anchorFromEvent, useDropdownPosition, type DropdownAnchor } from "@/lib/dropdown-anchor"

// Data module built in the previous prompt — imported, not recreated.
import { PLAYBOOKS, type Playbook, type PlaybookStatus, type TrustMode } from "./pm-lex-playbooks/playbooks-data"
import PlaybookDetail, { type DetailTab, type OverviewSubtab } from "./pm-lex-playbooks/PlaybookDetail"
import CreatePlaybookPage from "./pm-lex-playbooks/CreatePlaybookPage"
import BuilderWizard from "./pm-lex-playbooks/BuilderWizard"

// ── Step 1 — "+ Create playbook" type chooser ──
//
// A CATALOGUE SELECTION, so it is a `ModalDialog variant="content"` — the
// Create pattern's own answer for "browse a catalogue / pick a starting
// point", and the user cannot ignore it and keep working in the list behind.
//
// It used to be a Popover hung off a `Button` in `Header.aux`, purely so the
// menu had a DOM node to anchor to. That is what forced the trigger out of
// `primaryAction` and down to `variant="primary"`: `aux` is explicitly NOT a
// loophole for a CTA (Guardrails, "Header slots"). With the choice living in
// a modal the trigger is a plain action object again, Header applies
// `variant="main"` itself, and no screen names a variant.

type CreateTypeId = "customer" | "internal"

const CREATE_TYPES: {
  id: CreateTypeId
  icon: string
  title: string
  subtitle: string
  description: string
  comingSoon?: boolean
}[] = [
  {
    id: "customer",
    icon: "Users",
    title: "Customer Playbook",
    subtitle: "Adaptive · NBA-driven",
    description: "Adaptive NBA strategies for customer lifecycle engagement and 1:1 plan execution.",
  },
  {
    // Internal-process wizard path is post-pilot scope — visible but inert,
    // not hidden, per the handoff guide.
    id: "internal",
    icon: "Building2",
    title: "Internal Playbook",
    subtitle: "Team · operational",
    description: "Standard operating procedures for internal teams and cross-functional workflows.",
    comingSoon: true,
  },
]

function CreateTypeOption({ option, selected, onSelect }: {
  option:   (typeof CREATE_TYPES)[number]
  selected: boolean
  onSelect: () => void
}) {
  const disabled = !!option.comingSoon
  return (
    <div onClick={disabled ? undefined : onSelect} style={{ cursor: disabled ? "not-allowed" : "pointer" }}>
      <CardContainer selected={selected} disabled={disabled} size="sm" className="flex gap-[10px] items-start h-full">
        <HighlightIcon iconName={option.icon} variant={selected ? "informative" : "neutral"} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-[6px]">
            <span style={{ fontSize: 13, fontWeight: 600, color: selected ? "var(--primary)" : "var(--foreground)" }}>{option.title}</span>
            {option.comingSoon && <Tag variant="neutral" size="sm">COMING SOON</Tag>}
          </div>
          <div style={{ fontSize: 11, color: "var(--primary)", fontWeight: 500, marginTop: 1 }}>{option.subtitle}</div>
          <p style={{ fontSize: 12, color: "var(--field-supporting)", margin: "3px 0 0", lineHeight: 1.4 }}>{option.description}</p>
        </div>
        {selected && (
          <HighlightIcon size="sm" variant="informative" icon={<Check size={13} />} />
        )}
      </CardContainer>
    </div>
  )
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "playbooks", label: "Playbooks", icon: "BookOpen" },
]

const PAGE_SIZE = 10

const DEPARTMENTS = ["Sales", "Customer Success", "Product"]

// DS-GAP: the data model (playbooks-data.ts) has no `department` field — only
// categoryTag and owner. This maps each owner to a plausible department so
// the "Department" filter the spec calls for has something real to filter
// on. Replace with a real field on Playbook.owner if department ever becomes
// part of the actual data model.
const OWNER_DEPARTMENT: Record<string, string> = {
  "Sarah Chen":       "Customer Success",
  "Michael Torres":   "Sales",
  "Emily Rodriguez":  "Product",
  "David Park":       "Sales",
}

const STATUS_TAG_VARIANT: Record<PlaybookStatus, "success" | "alert"> = {
  Published: "success",
  Draft:     "alert",
}

const TRUST_ICON: Record<TrustMode, string> = {
  "Auto-Execute":       "Zap",
  "Approval Required":  "UserCheck",
  "Draft":              "PencilLine",
}

function trustTooltip(pb: Playbook): string {
  if (pb.trustMode === "Draft") return "Trust controls not yet configured"
  return `${pb.trustControls.confidenceThreshold}% confidence threshold → escalates to ${pb.trustControls.escalatesTo}`
}

// ── Entity row ────────────────────────────────────────────────────────────
//
// THE ATTRIBUTE ROW BELONGS AT THE BOTTOM LEFT (`secondaryMeta`), not beside
// the title. `primaryMeta` is the one or two facts that CLASSIFY the record —
// its code and what puts it in play — and it sits inline with the name, where
// it has to compete with the title for width. Everything else someone scans a
// playbook for (owner, trust mode, version, how much of it there is) is the
// bottom row, which is what that row exists for: see the EntityList spec's own
// demo items, and `pm-lex-htl-work-queue.tsx` for the same split on real data.
//
// Six items in `primaryMeta` was the whole reason this row read as a wall:
// every one of them truncating the title, none of them aligned with anything,
// and the bottom-left row — the part of the card built to hold exactly this —
// left empty with only the category tag floating on the right.
function toEntityItem(pb: Playbook, onOpenMenu: (id: string) => void, onOpen: (id: string) => void): EntityListItemData {
  return {
    id: pb.id,
    title: pb.name,
    avatarName: pb.owner.name,
    description: pb.shortDescription,
    // Inline with the title: the record's code, and the moment that triggers it.
    primaryMeta: [
      { label: pb.id },
      { iconName: "Radio", label: pb.moment.primaryEvent, tooltip: pb.moment.businessMeaning ?? pb.moment.primaryEvent },
    ],
    // Right zone — freshness, same slot every list in the repo uses for it.
    timestamp: `Updated ${pb.updatedRelative}`,
    // Bottom-left attribute row. Five items keeps `secondaryMetaAutoIconAt`
    // (default 5) from collapsing them to icon-only, so every value stays read
    // as text rather than as a symbol the reader has to interpret.
    secondaryMeta: [
      { iconName: "User",                 label: pb.owner.name,          tooltip: `Owner · ${pb.owner.name}` },
      { iconName: TRUST_ICON[pb.trustMode], label: pb.trustMode,         tooltip: trustTooltip(pb) },
      { iconName: "GitBranch",            label: pb.version,             tooltip: `Current version · ${pb.version}` },
      { iconName: "Layers",               label: `${pb.phaseCount} phases`, tooltip: `${pb.phaseCount} sequential phases` },
      { iconName: "ShieldCheck",          label: `${pb.gateCount} gates`,   tooltip: `${pb.gateCount} hard gates must pass before execution` },
    ],
    state: { label: pb.status, variant: STATUS_TAG_VARIANT[pb.status] },
    tags: [{ label: pb.categoryTag }],
    showMenu: true,
    onMenuClick: () => onOpenMenu(pb.id),
    onClick: () => onOpen(pb.id),
  }
}

export default function PMLexPlaybooksScreen() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>(PLAYBOOKS)

  const [search, setSearch]         = useState("")
  const [department, setDepartment] = useState("All")
  const [ownerFilter, setOwnerFilter] = useState("All")
  const [page, setPage]             = useState(1)

  const [filtersSlideoutOpen, setFiltersSlideoutOpen] = useState(false)
  // FiltersSlideout's sections are self-contained DS spec/demo content (Sort,
  // AI Insights, etc. — see filters-slideout.tsx), not wired to real facets
  // for any screen in this repo yet. Following the one existing usage
  // (pm-lex-htl-work-queue.tsx): Apply just flips this flag, which is what
  // drives the Filters bar's "Clear filters" affordance. Nothing renders as
  // an applied chip before Apply, satisfying the draft-vs-applied rule.
  const [filtersApplied, setFiltersApplied] = useState(false)

  const [menuPlaybookId, setMenuPlaybookId] = useState<string | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<DropdownAnchor | null>(null)
  const dropdown = useDropdownPosition(menuAnchor)

  const [archiveTarget, setArchiveTarget] = useState<Playbook | null>(null)

  // ── Detail route — synced to ?pbId=/&pbTab=/&pbSubtab= so a reload keeps
  // the user on the same playbook, tab, and sub-tab. Mirrors usePageTab's
  // read-on-mount + replaceState pattern (src/lib/use-page-tab.ts), extended
  // to the extra params this view needs (usePageTab only owns `tab`).
  const [detailId, setDetailId] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get("pbId")
  )
  const [detailTab, setDetailTab] = useState<DetailTab>(
    () => (new URLSearchParams(window.location.search).get("pbTab") as DetailTab) || "overview"
  )
  const [detailSubtab, setDetailSubtab] = useState<OverviewSubtab>(
    () => (new URLSearchParams(window.location.search).get("pbSubtab") as OverviewSubtab) || "what-it-does"
  )

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (detailId) {
      params.set("pbId", detailId)
      params.set("pbTab", detailTab)
      params.set("pbSubtab", detailSubtab)
    } else {
      params.delete("pbId")
      params.delete("pbTab")
      params.delete("pbSubtab")
    }
    window.history.replaceState(null, "", `?${params.toString()}${window.location.hash}`)
  }, [detailId, detailTab, detailSubtab])

  // ── Step 1 — "+ Create playbook" type-chooser modal ──
  const [createTypeOpen, setCreateTypeOpen] = useState(false)
  const [createType, setCreateType] = useState<CreateTypeId | null>(null)

  // ── Step 2 — "Create Playbook" page, synced to ?pbCreate= like the detail route ──
  const [showCreatePage, setShowCreatePage] = useState<boolean>(
    () => new URLSearchParams(window.location.search).get("pbCreate") === "1"
  )

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (showCreatePage) params.set("pbCreate", "1")
    else params.delete("pbCreate")
    window.history.replaceState(null, "", `?${params.toString()}${window.location.hash}`)
  }, [showCreatePage])

  // ── Builder wizard (Prompt 12), synced to ?pbBuild= like the other routes ──
  const [showBuilderWizard, setShowBuilderWizard] = useState<boolean>(
    () => new URLSearchParams(window.location.search).get("pbBuild") === "1"
  )

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (showBuilderWizard) params.set("pbBuild", "1")
    else params.delete("pbBuild")
    window.history.replaceState(null, "", `?${params.toString()}${window.location.hash}`)
  }, [showBuilderWizard])

  const ownerNames = Array.from(new Set(playbooks.map(p => p.owner.name))).sort()

  const filtered = playbooks.filter(p => {
    if (department !== "All" && OWNER_DEPARTMENT[p.owner.name] !== department) return false
    if (ownerFilter !== "All" && p.owner.name !== ownerFilter)                 return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      if (!p.name.toLowerCase().includes(q) && !p.shortDescription.toLowerCase().includes(q)) return false
    }
    return true
  })

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleOpenDetail(id: string) {
    setDetailId(id)
    setDetailTab("overview")
    setDetailSubtab("what-it-does")
  }

  // Opens the Step 1 type-chooser modal (header "Create playbook").
  function handleCreatePlaybook() {
    setCreateType(null)
    setCreateTypeOpen(true)
  }

  function handleConfirmCreateType() {
    setCreateTypeOpen(false)
    setShowCreatePage(true)
  }

  // The empty-state CTA has no dropdown trigger of its own to anchor a
  // popover to, and "Internal Playbook" is disabled anyway — so it goes
  // straight to Step 2 for the one selectable type (Customer Playbook)
  // instead of opening a menu anchored somewhere the click didn't happen.
  function handleCreateFirstPlaybook() {
    setShowCreatePage(true)
  }

  function handleStartBuilding() {
    setShowCreatePage(false)
    setShowBuilderWizard(true)
  }

  function handleWizardCancel() {
    setShowBuilderWizard(false)
  }

  // Publishes the finished draft: adds it to the in-memory playbooks list
  // and routes straight to its detail view, same as any other playbook.
  function handleFinishPlaybook(newPlaybook: Playbook) {
    setPlaybooks(prev => [newPlaybook, ...prev])
    setShowBuilderWizard(false)
    setDetailId(newPlaybook.id)
    setDetailTab("overview")
    setDetailSubtab("what-it-does")
  }

  function handleDuplicate(source: Playbook) {
    const copy: Playbook = {
      ...source,
      id:              `${source.id}-copy-${Date.now()}`,
      name:            `${source.name} (Copy)`,
      status:          "Draft",
      updatedRelative: "just now",
    }
    setPlaybooks(prev => [copy, ...prev])
    setMenuPlaybookId(null)
  }

  // Opens the confirmation modal — same ModalDialog pattern as the detail
  // header's Archive (PlaybookDetail.tsx), not a direct action.
  function handleArchive(id: string) {
    const target = playbooks.find(p => p.id === id) ?? null
    setArchiveTarget(target)
    setMenuPlaybookId(null)
  }

  // DS-GAP: PlaybookStatus (playbooks-data.ts) only models "Draft"|"Published" —
  // there's no "Archived" state yet, so this confirms (real ModalDialog, wired
  // per Guardrails) but doesn't persist a status change. Add "Archived" to the
  // type when that's ready.
  function confirmArchive() {
    setArchiveTarget(null)
  }

  function handleDelete(id: string) {
    setPlaybooks(prev => prev.filter(p => p.id !== id))
    setDetailId(null)
  }

  const menuPlaybook = playbooks.find(p => p.id === menuPlaybookId) ?? null
  const activeDetailPlaybook = detailId ? playbooks.find(p => p.id === detailId) ?? null : null

  const isGloballyEmpty = playbooks.length === 0
  const isFilteredEmpty = !isGloballyEmpty && filtered.length === 0

  if (activeDetailPlaybook) {
    return (
      <PlaybookDetail
        key={activeDetailPlaybook.id}
        playbook={activeDetailPlaybook}
        tab={detailTab}
        onTabChange={setDetailTab}
        subtab={detailSubtab}
        onSubtabChange={setDetailSubtab}
        onBack={() => setDetailId(null)}
        onDuplicate={handleDuplicate}
        onArchive={handleArchive}
        onDelete={handleDelete}
      />
    )
  }

  if (showBuilderWizard) {
    return (
      <BuilderWizard
        onCancel={handleWizardCancel}
        onFinish={handleFinishPlaybook}
      />
    )
  }

  if (showCreatePage) {
    return (
      <CreatePlaybookPage
        onCancel={() => setShowCreatePage(false)}
        onStartBuilding={handleStartBuilding}
      />
    )
  }

  return (
    <ScreenLayout
      sidebarItems={SIDEBAR_ITEMS}
      activeSidebarId="playbooks"
      header={isScrolled => (
        <Header
          size={isScrolled ? "compress" : "size-l"}
          title="Playbooks"
          description="Design and govern customer execution strategies across adaptive playbooks and deterministic journeys"
          // The page's one main action, so it is an ACTION OBJECT in
          // `primaryAction` and Header applies `variant="main"` itself. The
          // type choice it used to open as a Popover is now a
          // `ModalDialog variant="content"` below — see CREATE_TYPES.
          primaryAction={{ label: "Create playbook", icon: Plus, onClick: handleCreatePlaybook }}
        />
      )}
      pagination={
        filtered.length > 0
          ? <Pagination currentPage={page} totalItems={filtered.length} itemsPerPage={PAGE_SIZE} onPageChange={setPage} />
          : undefined
      }
    >
      <Filters
        showSearch
        searchPlaceholder="Search playbooks..."
        searchValue={search}
        onSearchChange={v => { setSearch(v); setPage(1) }}
        slots={[
          {
            placeholder: "Department",
            value:       department === "All" ? undefined : department,
            options:     DEPARTMENTS,
            onSelect:    v => { setDepartment(v); setPage(1) },
            onRemove:    () => { setDepartment("All"); setPage(1) },
          },
          {
            placeholder: "Owner",
            value:       ownerFilter === "All" ? undefined : ownerFilter,
            options:     ownerNames,
            onSelect:    v => { setOwnerFilter(v); setPage(1) },
            onRemove:    () => { setOwnerFilter("All"); setPage(1) },
          },
        ]}
        showAllFilters
        onAllFiltersClick={() => setFiltersSlideoutOpen(true)}
        showClearFilters={filtersApplied}
        onClearFilters={() => setFiltersApplied(false)}
        showSort={false}
        showViewToggle={false}
      />

      {isGloballyEmpty || isFilteredEmpty ? (
        <div className="mt-[24px]">
          <CardContainer variant="dashed">
            {isGloballyEmpty ? (
              <EmptyState
                icon={BookOpen}
                title="No playbooks yet"
                description="Create your first playbook to start guiding customer execution strategies."
                ctaLabel="Create your first playbook"
                onCta={handleCreateFirstPlaybook}
              />
            ) : (
              <EmptyState
                icon={BookOpen}
                title="No playbooks found"
                description="Try a different search or clear your filters."
                ctaLabel="Clear filters"
                onCta={() => { setSearch(""); setDepartment("All"); setOwnerFilter("All"); setFiltersApplied(false); setPage(1) }}
              />
            )}
          </CardContainer>
        </div>
      ) : (
        <>
          <div
            className="flex flex-col gap-[12px] mt-[24px]"
            onClickCapture={e => setMenuAnchor(anchorFromEvent(e))}
          >
            {paged.map(pb => (
              <CardContainer
                key={pb.id}
                size="sm"
                className="!p-0 overflow-hidden"
              >
                <EntityList items={[toEntityItem(pb, setMenuPlaybookId, handleOpenDetail)]} />
              </CardContainer>
            ))}
          </div>

          <div className="mt-[12px]" style={{ fontSize: 12, color: "var(--field-supporting)" }}>
            Showing {filtered.length} of {playbooks.length} playbooks
          </div>
        </>
      )}

      {/* ── Per-card ••• menu — Archive + Duplicate, DS default order ── */}
      {menuPlaybookId !== null && menuAnchor !== null && menuPlaybook && (() => (
        <>
          <div className="fixed inset-0" style={{ zIndex: 10000 }} onClick={() => setMenuPlaybookId(null)} />
          <div ref={dropdown.ref} style={{ position: "fixed", zIndex: 10001, ...dropdown.style }}>
            <Menu className="w-auto min-w-[180px]">
              <MenuItem size="sm" label="Archive"   leadingIcon={<ArchiveIcon size={16} />} onClick={() => handleArchive(menuPlaybook.id)} />
              <MenuItem size="sm" label="Duplicate" leadingIcon={<CopyIcon size={16} />}    onClick={() => handleDuplicate(menuPlaybook)} />
            </Menu>
          </div>
        </>
      ))()}

      {/* ── Step 1 — pick the playbook type ──
          One CardContainer per option, inside `slotUnstyled`: a dialog never
          puts all of its content in one card (Guardrails). */}
      <ModalDialog
        isOpen={createTypeOpen}
        onClose={() => setCreateTypeOpen(false)}
        variant="content"
        iconName="BookOpen"
        title="Create playbook"
        description="Pick the kind of playbook to build. You'll choose a starting point next."
        slotUnstyled
        slot={
          <div className="flex flex-col gap-[12px]">
            {CREATE_TYPES.map(opt => (
              <CreateTypeOption
                key={opt.id}
                option={opt}
                selected={createType === opt.id}
                onSelect={() => setCreateType(opt.id)}
              />
            ))}
          </div>
        }
        ctaPrimary={{ label: "Continue", disabled: createType === null, onClick: handleConfirmCreateType }}
        ctaSecondary={{ label: "Cancel", onClick: () => setCreateTypeOpen(false) }}
      />

      <FiltersSlideout
        isOpen={filtersSlideoutOpen}
        onClose={() => setFiltersSlideoutOpen(false)}
        onApply={() => { setFiltersApplied(true); setFiltersSlideoutOpen(false) }}
        onClearAll={() => { setFiltersApplied(false); setFiltersSlideoutOpen(false) }}
      />

      <ModalDialog
        isOpen={archiveTarget !== null}
        onClose={() => setArchiveTarget(null)}
        variant="confirmation"
        tone="warning"
        iconName="Archive"
        title={archiveTarget ? `Archive "${archiveTarget.name}"?` : "Archive this playbook?"}
        description="Archiving pauses this playbook — no new plans will be triggered until it's restored. Plans already in progress will continue to completion."
        ctaPrimary={{ label: "Archive playbook", destructive: false, onClick: confirmArchive }}
        ctaSecondary={{ label: "Cancel", onClick: () => setArchiveTarget(null) }}
      />
    </ScreenLayout>
  )
}
