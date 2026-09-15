import { useEffect, useState } from "react"
import { Plus, Archive as ArchiveIcon, Copy as CopyIcon, BookOpen, Radio, User, Zap, UserCheck, PencilLine, Clock } from "lucide-react"
import { ScreenLayout } from "@/components/layouts/screen-layout"
import type { SidebarItem } from "@/components/ui/sidebar"
import { Header } from "@/components/ui/header"
import { Filters } from "@/components/ui/filters"
import { FiltersSlideout } from "@/components/ui/filters-slideout"
import { CardContainer } from "@/components/ui/card-container"
import { EmptyState } from "@/components/ui/empty-state"
import { Pagination } from "@/components/ui/pagination"
import { Menu, MenuItem } from "@/components/ui/menu-item"
import { ModalDialog } from "@/components/ui/modal-dialog"
import { HighlightIcon } from "@/components/ui/highlight-icon"
import { Tag } from "@/components/ui/tag"
import { anchorFromEvent, useDropdownPosition, type DropdownAnchor } from "@/lib/dropdown-anchor"
import { HeaderMenuPrimaryAction } from "@/components/experimental/header-menu-primary-action"
import { PlaybookListCard, type PlaybookListCardMetaItem, type PlaybookListCardMetaColor } from "@/components/experimental/playbook-list-card"

// Data module built in the previous prompt — imported, not recreated.
import { PLAYBOOKS, type Playbook, type PlaybookStatus, type TrustMode } from "./pm-lex-playbooks/playbooks-data"
import PlaybookDetail, { type DetailTab, type OverviewSubtab } from "./pm-lex-playbooks/PlaybookDetail"
import CreatePlaybookPage from "./pm-lex-playbooks/CreatePlaybookPage"
import BuilderWizard from "./pm-lex-playbooks/BuilderWizard"
import { PreviewSlideOut } from "./pm-lex-playbooks/PreviewSlideOut"

// ── Step 1 — "+ Create playbook" type chooser (dropdown under the button) ──

function CreateTypeOption({ icon, title, subtitle, description, comingSoon, onClick }: {
  icon: string
  title: string
  subtitle: string
  description: string
  comingSoon?: boolean
  onClick?: () => void
}) {
  const disabled = !!comingSoon
  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        display: "flex", gap: 10, padding: "10px 10px", borderRadius: 8,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = "var(--menu-item-hover)" }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
    >
      <HighlightIcon iconName={icon} variant={disabled ? "neutral" : "informative"} size="sm" />
      <div className="min-w-0">
        <div className="flex items-center gap-[6px]">
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{title}</span>
          {comingSoon && <Tag variant="neutral" size="sm">COMING SOON</Tag>}
        </div>
        <div style={{ fontSize: 11, color: "var(--primary)", fontWeight: 500, marginTop: 1 }}>{subtitle}</div>
        <p style={{ fontSize: 12, color: "var(--field-supporting)", margin: "3px 0 0", lineHeight: 1.4 }}>{description}</p>
      </div>
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

const TRUST_ICON: Record<TrustMode, typeof Zap> = {
  "Auto-Execute":       Zap,
  "Approval Required":  UserCheck,
  "Draft":              PencilLine,
}

// Same "colored meta icon" gap noted in playbook-list-card.tsx — trust mode
// maps to a semantic tint the same way STATUS_TAG_VARIANT already does for
// the state Tag, just applied to an inline icon instead of a chip.
const TRUST_META_COLOR: Record<TrustMode, PlaybookListCardMetaColor> = {
  "Auto-Execute":       "success",
  "Approval Required":  "purple",
  "Draft":              "neutral",
}

function trustTooltip(pb: Playbook): string {
  if (pb.trustMode === "Draft") return "Trust controls not yet configured"
  return `${pb.trustControls.confidenceThreshold}% confidence threshold → escalates to ${pb.trustControls.escalatesTo}`
}

function toCardMeta(pb: Playbook): PlaybookListCardMetaItem[] {
  const TrustIcon = TRUST_ICON[pb.trustMode]
  return [
    { label: pb.id },
    { icon: <Radio size={13} />,     label: pb.moment.primaryEvent, tooltip: pb.moment.businessMeaning ?? pb.moment.primaryEvent, color: "informative" },
    { icon: <User size={13} />,      label: pb.owner.name },
    { icon: <TrustIcon size={13} />, label: pb.trustMode, tooltip: trustTooltip(pb), color: TRUST_META_COLOR[pb.trustMode] },
    { label: pb.version },
    { icon: <Clock size={13} />,     label: pb.updatedRelative },
  ]
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
  const [previewPlaybookId, setPreviewPlaybookId] = useState<string | null>(null)

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

  // ── Step 1 — "+ Create playbook" type-chooser dropdown ──
  const [createTypeMenuOpen, setCreateTypeMenuOpen] = useState(false)

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
  const previewPlaybook = previewPlaybookId ? playbooks.find(p => p.id === previewPlaybookId) ?? null : null

  function handleGoToPlaybookFromPreview(id: string) {
    setPreviewPlaybookId(null)
    handleOpenDetail(id)
  }

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
          icon={BookOpen}
          iconVariant="purple"
          iconSize="lg"
          // Still composed in `aux`, not `primaryAction`: this button opens a
          // Step 1 type-chooser popover, which HeaderMenuPrimaryAction (the
          // experimental gap-filler, see header-menu-primary-action.tsx)
          // provides so the trigger can wear the DS gradient "main" look
          // while still anchoring its own menu — primaryAction's real API
          // still can't do that.
          aux={
            <HeaderMenuPrimaryAction
              label="Create playbook"
              icon={Plus}
              open={createTypeMenuOpen}
              onOpenChange={setCreateTypeMenuOpen}
            >
              <CreateTypeOption
                icon="Users"
                title="Customer Playbook"
                subtitle="Adaptive · NBA-driven"
                description="Adaptive NBA strategies for customer lifecycle engagement and 1:1 plan execution."
                onClick={() => { setCreateTypeMenuOpen(false); setShowCreatePage(true) }}
              />
              {/* Internal-process wizard path is post-pilot scope — visible but
                  inert, not hidden, per the handoff guide. */}
              <CreateTypeOption
                icon="Building2"
                title="Internal Playbook"
                subtitle="Team · operational"
                description="Standard operating procedures for internal teams and cross-functional workflows."
                comingSoon
              />
            </HeaderMenuPrimaryAction>
          }
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
              <PlaybookListCard
                key={pb.id}
                title={pb.name}
                description={pb.shortDescription}
                ownerName={pb.owner.name}
                meta={toCardMeta(pb)}
                categoryTag={pb.categoryTag}
                state={{ label: pb.status, variant: STATUS_TAG_VARIANT[pb.status] }}
                onClick={() => handleOpenDetail(pb.id)}
                onMenuClick={() => setMenuPlaybookId(pb.id)}
                onPreviewClick={() => setPreviewPlaybookId(pb.id)}
              />
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
        ctaSecondary={{ label: "Cancel" }}
      />

      <PreviewSlideOut
        playbook={previewPlaybook}
        onClose={() => setPreviewPlaybookId(null)}
        onGoToPlaybook={handleGoToPlaybookFromPreview}
      />
    </ScreenLayout>
  )
}
