import { useState, useRef, useEffect, useLayoutEffect, type KeyboardEvent, type ReactNode } from "react"
import { Sparkle, MoreHorizontal, Lock, EyeOff, Info, Database, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePageScroll, type PageScrollInfo } from "@/lib/page-scroll"
import { AvatarCircle } from "@/components/ui/avatar"
import { CardContainer } from "@/components/ui/card-container"
import { Skeleton } from "@/components/ui/skeleton"
import { Tag } from "@/components/ui/tag"
import { Button } from "@/components/ui/button"
import { Menu, MenuItem } from "@/components/ui/menu-item"
import { Tooltip } from "@/components/ui/tooltip"
import { HighlightIcon, type HighlightIconVariant } from "@/components/ui/highlight-icon"

/**
 * Entity Header — AIMS OS Design System
 *
 * Source of truth: Figma `Design System - AIMS OS`, node 19815:101548. Every
 * rule below is from that section — the Anatomy, Rules, Hierarchy, Focus
 * order, TAG ROLES, TRUNCATION, THE THREE ACTIONS and BEHAVIOUR blocks.
 *
 * Renamed from `record-header.tsx` on 2026-09-08. The change spec had frozen
 * the old file name while the API was still moving; with the component
 * settled, Michael's call is that it is called Entity Header everywhere —
 * file, exports and page id. The old page id still resolves, see
 * PAGE_ID_ALIASES in App.tsx: links to `?page=record-header` were shared
 * before the rename and must not break.
 *
 * WHAT IT IS
 *
 * The identity card for a Unified Entity Profile. It identifies the entity
 * you are looking at and surfaces what needs attention. It carries no detail
 * — detail lives in the tabs below it. It answers four questions, in order:
 * what is this, where did it come from, what needs attention, what can I do.
 *
 * ONE SKELETON, EVERY ENTITY TYPE. There is no `variant` prop and no closed
 * set of types. Employee, Customer, Vendor, Patient, Borrower, a repair
 * order, a platform data entity — all the same shape. An entity type this
 * file has never heard of is the normal case, not a gap.
 *
 * THE SLOTS
 *
 *   Row 1   visual · title · source · │ · tags        —  ⓘ · state badge ·
 *                                                        secondary · Ask · ···
 *   Row 2   description (off by default)
 *   Row 3   secondary metadata, max 6
 *
 * The right side is fixed and never compressed. The left side yields, in this
 * order: tags collapse to `+N`, then source, and only then does the title
 * truncate. Nothing wraps and nothing abbreviates.
 *
 * DROPPING IS THE LAST RESORT, and only these two slots ever get dropped:
 * the description below 420px of card width, then the secondary metadata row
 * below 320px. Visual identity, title and state badge are never dropped at
 * any width. Note the ORDER IS REVERSED from Figma's own priority list on
 * Michael's call — metadata carries the facts someone might act on, the
 * description is the edge case for extra granularity — so the description
 * goes first and the metadata row survives longer.
 *
 * NINE TAB STOPS, SIX WHEN NOTHING IS TRUNCATED. Tags and secondary metadata
 * are each ONE stop, not one per item: Tab enters the group, arrows move
 * inside it, Tab leaves. One stop per item would put a dozen and a half Tab
 * presses between a keyboard user and the page, which is a barrier, not an
 * inconvenience. Since the tag cap came down to two, the six-item metadata
 * row carries most of that argument on its own. The title and the description are
 * stops only when they actually overflow — a value that fits has nothing to
 * reveal.
 *
 * THREE STATES, ONE AXIS. `state` is Figma's `Property 1`: default, loading
 * (a skeleton matching the current layout — never an empty state, because
 * saying "nothing here" while data is in flight states something untrue) and
 * restricted (50% opacity; the viewer lacks entitlement to the values, which
 * is a governed state and never an error). Independent of the reflow below —
 * an entity can be loading on a tablet.
 *
 * REFLOW BEFORE YIELDING. Below 720px of measured card width the identity row
 * stacks — title on its own row, source and tags together on the next, right
 * cluster unchanged — which is Figma's `Size = Responsive`. The trigger is
 * the CARD's own width, measured with a ResizeObserver, not the viewport: this
 * header sits in panels and split views, so a wide screen tells you nothing
 * about how much room it actually has.
 *
 * WHAT IT IS NOT
 *
 * NO INSIGHT SECTION. System interpretation reaches this card only as a tag
 * with a tooltip — never a descriptive sentence, never a score with drivers,
 * never an expandable analysis. Anything larger belongs to the Overview.
 *
 * NO DISCLOSURE. This is a fixed arrangement of slots, not a collapsible
 * card. An earlier revision of this file had a chevron revealing two zones,
 * AGENTIC SYSTEM and YOUR INTERVENTION; neither exists in the Figma and both
 * are gone. Their content belongs to Overview widgets.
 *
 * NO NEXT BEST ACTION. The recommendation card is a separate component in
 * its own Card Container — `NextBestActionCard` in
 * @/components/ui/next-best-action-card — rendered as a SIBLING
 * below this one. Two records, two containers. Passing recommendations into
 * the header is the single most common mistake with this card, so the prop
 * does not exist to be misused.
 *
 * NOT A LIST ROW. An `EntityList` row navigates to the detail on click. This
 * cannot — you are already in the detail. It also has no selection, no
 * pinning, no hover-revealed affordances and no virtualization, none of which
 * apply to a single instance. If the header looked like a row, the reader
 * would lose the signal of where they are.
 *
 * GOVERNANCE CANON — AIMS OS law, not preference
 *
 *   Law 1 — Authority and origin of every field is ALWAYS visible. Every
 *     RECORD field carries a FieldProvenance; no code path renders a value
 *     without its source.
 *   Law 2 — Every governed answer carries provenance reachable WITHOUT
 *     leaving the view. The ⓘ trigger opens the Information panel from right
 *     here.
 *   Law 3 — HTL items are first-class states with calm, explanatory
 *     language, never red errors.
 *   Law 4 — PII resolves only at display time, per viewer entitlement. A
 *     hydrated field and a masked field are the SAME RecordField in two
 *     states; this component renders whichever it is given and never
 *     resolves entitlements itself.
 *
 * THINGS THAT LOOK LIKE BUGS AND ARE NOT
 *
 *   - `Ask` shares the Sparkle glyph with the Next Best Action card.
 *     Deliberate (Michael, 2026-09-07): both are AI surfaces and the shared
 *     mark is what says so — one converses, the other transacts. Figma's
 *     prose argues they should differ; Figma's own component instances share
 *     it. Do not "fix" this.
 *   - `assignedAgent` is required but may be `null`. Null renders the same
 *     button, disabled, with a Tooltip — never a silently missing button.
 *   - `Ask` uses `variant="main"` inside a CardContainer. It is the one named
 *     exception in the whole design system, confirmed by Michael. Do not
 *     extend it to any other button.
 *   - A classification tag appears only when the visual is an avatar. A
 *     highlight icon already names the type.
 *   - `recordFields` is on the props interface but this component never reads
 *     it: the Information panel that explains those fields is host-rendered.
 *   - `Minimum`, one of the states Figma names, needs no implementation. It
 *     is "only visual, title and state" — which is what you already get by
 *     passing only those props. Nothing to switch on.
 *   - `restricted` renders at 50% opacity — Figma's own variant — PLUS a
 *     `Restricted` Tag beside the title with the reason in a Tooltip. The
 *     Tag is deliberately BEYOND Figma's instance (Michael, 2026-09-07):
 *     the prose asks for "calm and explanatory" and the instance carries
 *     nothing explanatory, and opacity alone cannot be told apart from
 *     loading or failed.
 *
 * DELIBERATELY NOT IMPLEMENTED
 *
 *   - The ellipsis rule Figma cites from Carbon and PatternFly — an ellipsis
 *     must hide at least three characters and leave at least four visible.
 *     Michael's call (2026-09-07): dropped. CSS cannot count characters, so
 *     it would mean measuring every string on every render, and nobody ships
 *     it that way.
 *
 * NOT IMPLEMENTED YET — do not mistake these for oversights
 *
 *   - The 720px reflow threshold is a calibrated estimate, not a number
 *     Figma states. Figma models Responsive as a variant with no breakpoint
 *     attached; 720 is where the built wide instance stops fitting.
 *   - The explanatory half of `restricted`. Figma's prose asks for "calm and
 *     explanatory" and its instance carries no explanatory element, so the
 *     explanation is screen-reader-only. Making it visible is a design
 *     decision, not an implementation one.
 */

// ── Field-level provenance (Law 1 + Law 2) ──────────────────────────────────
// Every RECORD field carries exactly this — never a bare value with no
// traceable source. `systemAbbr` is the short badge label (e.g. "WD"); the
// Tooltip on that badge (and the Data Provenance SlideOut, Law 2) both read
// from the same object, so the two surfaces can never drift out of sync.
export interface FieldProvenance {
  /** Full source-system name, e.g. "Workday", "Okta", "Salesforce". */
  system: string
  /** Short badge label, e.g. "WD", "OK", "SF" — what actually renders inline. */
  systemAbbr: string
  /** Unified profile model version, e.g. "UEP v2.3". */
  modelVersion: string
  /** e.g. "2h ago" — when Source last synced into the Model layer. */
  syncedAgo: string
}

// ── A single RECORD field (Law 4 — display-time PII resolution) ────────────
// A "hydrated" field and a "masked" field are the SAME field in 2 possible
// entitlement states — NOT two different field types. EntityHeader renders
// whichever state it's given; it never resolves permissions itself. See the
// Reference tab's "PII / masking (Law 4)" section for the full framing.
//
// Block 4 — this is the ONLY field shape RECORD ever renders, for ANY entity
// type: { label, value, provenance, destination? }. There is no hidden
// "employee field" structure anywhere else in this file — the host builds
// this array directly (see EntityHeaderProps.recordFields).
export interface RecordField {
  label: string
  /** Leading icon for scanability — also reinforces Law 1 (authority/origin
   *  always visible) alongside the provenance badge, not a decoration. */
  icon: LucideIcon
  provenance: FieldProvenance
  // Ley 4: display-time PII resolution — masking depende de entitlements del
  // backend. This component does NOT implement entitlement resolution; the
  // caller decides which state to construct this field in per the current
  // viewer's permissions. Both states still carry full provenance (Law 1
  // applies regardless of masking — the badge/Tooltip never disappear).
  state: "hydrated" | "masked"
  /** The real value — rendered when state === "hydrated". */
  value: string
  /** Shown instead of `value` when state === "masked", e.g. "•••• (restricted)". */
  maskedValue?: string
  /**
   * Does this field have somewhere to go beyond its own provenance? Default
   * true (most fields do — clicking opens Data Provenance, per the
   * transversal "opens detail" convention). Set `false` for a plain
   * descriptive fact with nothing further to show (e.g. a pure date, a pure
   * figure) — that field renders as static text, NO chevron, NOT a Button —
   * only its provenance badge stays hoverable (Tooltip on the badge itself).
   */
  hasDestination?: boolean
}

// The four zone types — WorkflowSummary, AgenticSystemInfo, InterventionItem
// and PendingIntervention — lived here. The Figma Entity Header has no
// AGENTIC SYSTEM and no YOUR INTERVENTION zone: that content lives in
// Overview widgets, and the header reaches system interpretation only as a
// tag with a tooltip ("NO INSIGHT SECTION").

// ── Assigned AI agent (transversal across entity types) ─────────────────────
// AIMS OS is agent-first: every record has one, regardless of entity type.
// Closing pass — the collapsed identity row used to also carry a lime-green
// Tag echoing this same value ("Renewal Copilot," etc.) alongside the "Ask
// about {name}" button below. That Tag is REMOVED: it was pure redundancy
// with the button, which is already this record's one persistent, always-
// visible agent signal — unlike the workflow/HTL tags, which each
// summarize a genuinely DIFFERENT zone the button doesn't cover. The
// button/trigger itself is untouched and must stay ACTIVE whenever this is
// non-null (disabling it by default was itself a bug from an earlier pass).
export interface AssignedAgent {
  id: string
  name: string
  /** Opens a chat scoped to this record. EntityHeader never renders the chat
   *  UI itself — same delegation pattern as every onOpen/onAction below. */
  onOpenChat: () => void
}

// ── Record action (Identity row CTA + overflow) ─────────────────────────────
export type EntityHeaderActionVariant = "primary" | "secondary" | "tertiary"

export interface EntityHeaderAction {
  label: string
  variant?: EntityHeaderActionVariant
  onClick?: () => void
  /**
   * Explicit disabled override, independent from `locked` — e.g. "no
   * contact channel on file" or "you don't have permission to contact this
   * record." Never hides the action (same "never a silently missing
   * button" rule as assignedAgent === null) — it disables with
   * `disabledTooltip` explaining why.
   */
  disabled?: boolean
  /** Tooltip shown when disabled (by either `disabled` or the record's own `locked`). */
  disabledTooltip?: string
  /**
   * Default true (disables like every other action when the record is
   * `locked`). Set `false` when this specific action doesn't modify the
   * record — e.g. Message/contact: DECISION FLAGGED, hypothesis not
   * explicitly confirmed — // TODO: confirmar con Michael si "locked"
   * debería seguir permitiendo contactar al record.
   */
  disableWhenLocked?: boolean
}

// ── Visual identity (Figma: "AVATAR OR HIGHLIGHT ICON") ───────────────────
// One question decides it: does this entity have a real-world visual identity
// — a face or a brand?
//
//   avatar  → natural persons, AND branded entities: companies, sites,
//             tenants, suppliers, partners. Photo or logo, falling back to
//             initials taken from `name`.
//   icon    → everything else: objects, assets, processes, transactions,
//             documents.
//
// EXACTLY ONE RENDERS. Never both, never neither — which is why this prop is
// required and has no default.
//
// Rules that prevent drift, from the Figma block of the same name:
//   - A site inherits its parent company's brand. It is not a separate mark.
//   - Initials are NEVER derived from a code. `RO-48291` has no initials, so
//     a code-titled record uses `kind: "icon"` by definition. The component
//     cannot police this — a caller passing `avatar` with a code as the name
//     gets nonsense initials, and that is the caller's bug.
//   - The icon's colour is assigned per entity TYPE and stays the same
//     everywhere in the product. Pass the same `variant` for the same type on
//     every surface.
//   - The rule is about the entity, not about whether the asset exists. A
//     company with no logo still uses `avatar`, falling back to initials.
export type EntityVisual =
  | { kind: "avatar" }
  | { kind: "icon"; icon: LucideIcon; variant?: HighlightIconVariant }

// ── Tags: three roles, two colour rules ───────────────────────────────────
// Figma's TAG ROLES block: three kinds of tag, one component. "The vocabulary
// belongs to the tenant; the colour belongs to the platform."
//
// The third role — STATE — is not in this array. It has its own slot on the
// right (`stateBadge`) because it is the only one there can be exactly one of,
// and the only one that gets the full semantic colour range.
//
//   signal          Something that needs attention, bounded in time or in
//                   condition. Zero or many. "Access review", "Renewal at
//                   risk", "6d overdue", "Sync failing".
//   classification  What kind of thing this is. ONLY when the visual is an
//                   avatar — a highlight icon already says the type.
//                   "Employee", "Customer", "Vendor", "Partner".
export type EntityTagRole = "signal" | "classification"

export interface EntityHeaderTag {
  /** Max ~22 characters. The ceiling itself belongs to the Tag component. */
  label: string
  role: EntityTagRole
  /**
   * COLOUR, RULE 2 OF 2 — left tags get two colours only:
   *   error  blocking — something is broken or overdue
   *   alert  needs review
   *   (omit) everything else, including EVERY classification
   *
   * The test is not whether it is a signal or a classification. It is whether
   * someone has to do something about it. If yes, colour. If no, neutral.
   *
   * CLASSIFICATION IS NEVER COLOURED, and the component enforces it: a tone
   * passed on a classification tag is ignored. That is what makes the
   * vocabulary scalable — a tenant can define a hundred classifications and
   * none of them breaks the visual system, because none of them picks a
   * colour.
   *
   * Only two of these are ever visible at once. If each picked its own
   * semantic colour, a healthy header would light up in three shades and
   * colour would stop meaning anything.
   */
  tone?: "error" | "alert"
  icon?: LucideIcon
}

/**
 * A CEILING, NOT A COUNT. Three visible at the very most, and fewer whenever
 * the row is tight — `useTagFit` measures what actually fits and the rest go
 * to the `+N` chip. Enforced here rather than by trusting the caller, same as
 * `secondaryMetadata`.
 *
 * Tags are the flexible element on the row: show fewer tags and a larger `+N`
 * rather than truncating the title further. The identifier is what the user
 * came to read — a tag can be recovered from the overflow, a cut-off name
 * cannot.
 *
 * IT WAS SIX, THEN A FLAT TWO, BEFORE LANDING HERE (Michael, 2026-09-09).
 * Six was wrong: chips hold their width, so a dense header spent it on tags
 * and truncated the NAME — the exact inversion of the rule above, and the
 * thing Figma's DO/DON'T frame warns against. Six also saturates the card,
 * wrapping the row into a block of colour rather than individual signals.
 *
 * A flat two fixed the title but was wrong in the other direction: it hid a
 * tag that had room to show. Figma has no fixed number at all — its edge
 * cases render three, two and two, because it collapses by available space.
 * The count is an OUTPUT of the layout, not an input to it.
 *
 * Three is the ceiling because that is the most Figma ever shows, and because
 * past three the chips stop reading as separate signals.
 */
export const ENTITY_HEADER_TAGS_MAX = 3

/** Gap between chips inside the tag group — must match the rendered `gap-[6px]`. */
const TAG_CHIP_GAP = 6
/** Gap between title, source and the tag group — must match `gap-[12px]`. */
const IDENTITY_GAP = 12
/** The title's own ceiling, from Figma's truncation block. */
const TITLE_CEILING = 540
/** The 1px rule between source and tags, plus the 12px gap it adds. */
const SOURCE_DIVIDER = 1 + IDENTITY_GAP
/**
 * A pixel of slack. Chip widths are sub-pixel and `offsetWidth` rounds, so a
 * set that measures as exactly filling the row can still wrap. Losing one
 * pixel of budget is cheaper than a chip dropping to a second line.
 */
const FIT_SLACK = 2

/**
 * Which tags are visible at a given count — the ONE place that decides it, so
 * the measuring pass and the render can never disagree.
 *
 * `ordered` is already sorted signals-first-by-severity, then classification.
 * The rule on top of that: THE CLASSIFICATION KEEPS THE LAST VISIBLE SLOT.
 * Read off Figma's instances, which never let signals take every slot — its
 * maximum-content card shows one signal, `Partner` and a `+6`. Without it,
 * severity ordering would hide the classification on any entity with two or
 * more signals, and the visible tags would answer "what needs attention"
 * twice while leaving "what kind of thing is this" to nothing.
 *
 * A signal always takes the FIRST slot, so nothing outranks the most severe
 * thing on the card.
 */
function pickTagIndices(ordered: EntityHeaderTag[], count: number): number[] {
  const take = Math.min(Math.max(count, 0), ordered.length)
  if (take === 0) return []
  const head = Array.from({ length: take }, (_, i) => i)
  if (take < 2) return head
  const classIdx = ordered.findIndex(t => t.role === "classification")
  if (classIdx < 0 || classIdx < take) return head
  return [...head.slice(0, take - 1), classIdx]
}

// ── State badge — its own slot, on the right ──────────────────────────────
// COLOUR, RULE 1 OF 2 — full semantic range. There is exactly one, so colour
// costs nothing and carries real meaning: Active reads success, Degraded reads
// alert, Blocked reads error.
//
// If several statuses are true at once, THE MOST BLOCKING ONE WINS and the
// rest become signal tags. The component cannot decide that for you — it
// renders the one badge it is given.
//
// Never dropped, at any width. Never a focus stop: it is status, not a
// control.
/** Figma's `Property 1` axis. See EntityHeaderProps.state. */
export type EntityHeaderState = "default" | "loading" | "restricted"

export interface EntityStateBadge {
  /** Max ~19 characters. */
  label: string
  variant: "success" | "informative" | "alert" | "error" | "neutral"
  icon?: LucideIcon
}

// ── Secondary metadata (Entity Header change spec, section 3) ──────────────
// The compact attribute row under the title. Icon says what KIND of
// information this is, text is the value, tooltip carries the field label
// plus context ("Assigned agent · Manager Agent. Handling this account since
// Mar 3."). Capped at SECONDARY_METADATA_MAX by the component, not by
// trusting the caller.
//
// This is NOT `recordFields`. RECORD fields carry provenance and a masking
// state and are reached through the "About this record" trigger; secondary
// metadata is display-only and always visible. Both exist at once in the
// reference design, so they stay separate props.
//
// What qualifies: something a person could act on, or something governance
// requires be visible — counts of facts, open items and workflows, the
// assigned agent tier, access role, tenure, a Bridge ID where policy
// permits. What does not: anything true of every entity of the same type
// (that is a label, not information), and anything describing a conversation
// rather than the entity.
export interface SecondaryMetadataItem {
  /** What kind of information this is — never rendered without `text`. */
  icon: LucideIcon
  /** The value. Short form ≤ 8 chars / 2 words, long form ≤ 24 chars. */
  text: string
  /** Field label + context. Required: the tooltip shows even when `text` is not truncated. */
  tooltip: string
  /**
   * Makes this one item actionable — Michael, 2026-09-11.
   *
   * MOST METADATA IS NOT. This row is display-only by definition, and that is
   * still the default: pass nothing and the item renders exactly as before.
   * `onClick` is for the few values that NAME A CHANNEL rather than describe
   * the entity — an email address, a phone number. Those are not facts you
   * read, they are the thing you were about to go and use, and the row is
   * where the reader already is.
   *
   * A COUNT IS NEVER ACTIONABLE. "10 facts" is a number about this record;
   * clicking it has no obvious meaning, so inventing one makes every item in
   * the row ambiguous. If you cannot say in three words what the click does,
   * it does not get an `onClick`.
   *
   * WHAT IT MUST NOT DO: send anything. An actionable metadata item opens the
   * surface where the action is composed and governed — the record's agent
   * panel. The agent executes, the human governs; a row that fires an email
   * on one click has skipped the half that matters.
   *
   * The item renders as a real `<button>` with the DS Link type style — and
   * the UNDERLINE ONLY, never the link's blue. Blue in this row would read as
   * a state, competing with the state badge and the signal tags two rows up,
   * and it would make one metadata item louder than the record's own status.
   * The underline is enough to say "this responds"; the colour stays the same
   * as its neighbours, which is what keeps the row a row.
   *
   * Say what the click does in `tooltip`, not just what the value is: the
   * tooltip is the only place a reader can find out before committing.
   */
  onClick?: () => void
}

/**
 * Six is the maximum, not the goal — aim for four. Past six it stops being a
 * row and becomes a section, and anything beyond belongs in the Overview,
 * never behind a `+N` chip: an item hidden behind a counter is not
 * discovered, and if it was worth showing it is worth having a place.
 */
export const SECONDARY_METADATA_MAX = 6

export interface EntityHeaderProps {
  /** The record's display name — e.g. a person's name or an account name. */
  name: string
  /**
   * Avatar or highlight icon — exactly one, never neither. See EntityVisual's
   * own doc comment for the rule that decides which, and for why a
   * code-titled record can only ever be an icon.
   *
   * There is no `entityType` prop. What kind of thing this is arrives as a
   * CLASSIFICATION tag in `tags`, and only when this is an avatar — a
   * highlight icon already names the type.
   */
  visual: EntityVisual
  /**
   * Signal and classification tags, in one array. The component sorts them —
   * signals first, coloured before uncoloured, then classification — and caps
   * the visible set at ENTITY_HEADER_TAGS_MAX (two) with a `+N` chip for the
   * rest. Pass as many as the entity has — the cap is the component's job,
   * and the hidden ones stay reachable from the chip's Tooltip.
   *
   * Omit or pass an empty array for a record with no signals and no
   * classification: the group is REMOVED, not left empty.
   */
  tags?: EntityHeaderTag[]
  /**
   * The entity's overall status — its own slot on the right, before the
   * actions. Exactly one, full semantic colour range, never dropped.
   *
   * This replaces the old `statusTag`, which sat on the LEFT and whose doc
   * said "never error". Both of those contradicted the Figma: the state badge
   * is a right-hand slot, and `Blocked` and `Suspended` are precisely the
   * cases that take `error`.
   */
  stateBadge?: EntityStateBadge
  /**
   * Which system this record came from — Workday, Salesforce, NetSuite, DMS,
   * Helix Data Studio. Renders beside the title, always visible.
   *
   * ONE ITEM, NEVER TWO. A source is a single fact: which system this record
   * comes from. Concatenating a second value breaks it — "Enterprise Account
   * · Midwest Region" is a category next to a location, and neither of them
   * is a source. A job title, a location, a region, a category or a parent
   * company DESCRIBE or PLACE the entity; they do not say where the data came
   * from, so they belong in tags or in secondary metadata, or nowhere.
   *
   * Omit entirely for an entity created in the platform itself and therefore
   * having no source — the slot is removed, never filled with something else.
   */
  source?: string
  /**
   * Durable context, OFF by default — most headers do not carry one, and it
   * is an edge case rather than a slot to fill. Ask in this order and stop at
   * the first yes: needs attention now → signal tag; what kind of thing this
   * is → classification tag; current status → `statusTag`; a fact someone
   * might act on → `secondaryMetadata`; durable context none of those
   * captured → this.
   *
   * The one case that justifies it: the title is an opaque code. `RO-48291`
   * alone means nothing, so the description says what the record concerns.
   *
   * Durability test — if the sentence could change next week it is an
   * activity note and belongs in the Overview, not here. It says what the
   * entity IS, never what is happening to it. Renders as one line,
   * truncated with a Tooltip; it never wraps.
   */
  description?: string
  /** The compact attribute row under the title. Capped at SECONDARY_METADATA_MAX (6) by the component. Omit or pass an empty array to skip the row. */
  secondaryMetadata?: SecondaryMetadataItem[]
  /** Zone: RECORD. Each field already carries provenance (Law 1) and a
   *  masking state (Law 4) — see RecordField's own doc comment. Omit or
   *  pass an empty array to skip the RECORD zone for this entity type. */
  recordFields?: RecordField[]
  /**
   * Required as a PROP (every caller must decide), but the value itself can
   * be `null` for a record that genuinely has no assigned agent yet. `null`
   * renders the same button, disabled, with a Tooltip explaining why —
   * never a silently missing button and never a broken one.
   */
  assignedAgent: AssignedAgent | null
  /**
   * The one optional secondary action, off by default — the vast majority of
   * records do not have one. It exists for the edge case where a contextual
   * CTA genuinely belongs in the header.
   *
   * There is no primary-CTA slot: `Ask` IS the primary CTA. The old
   * `actions[0]` — "Message", "Export", "Contact account" — is gone. Anything
   * that is not this one secondary action belongs in `menuActions`.
   */
  secondaryAction?: EntityHeaderAction
  /**
   * The "···" overflow. Destructive and secondary actions ONLY — never a
   * visible button.
   *
   * The header does not define which actions exist; that is configured per
   * entity in Helix Data Studio. The header owns exactly one rule: destructive
   * actions live here.
   */
  menuActions?: EntityHeaderAction[]
  /**
   * Shows the Information (ⓘ) trigger. A boolean the caller owns, NOT derived
   * from whether `recordFields` has anything in it — whether the panel is
   * worth offering is a per-case decision, and the old behaviour made the
   * control vanish whenever the field array happened to be empty.
   */
  showInformation?: boolean
  /**
   * Opens the Information side panel: where the fields IN THIS HEADER came
   * from — the title, the source, the state. Not the Overview, not the
   * Knowledge tab. It explains what is on screen right now, nothing more.
   *
   * ONE SIDE PANEL AT A TIME. This panel and the Personal Assistant both open
   * on the side; opening one closes the other, and the panel requested last
   * wins. The component delegates both, so enforcing that is the host's job.
   */
  onInformationOpen?: () => void
  /**
   * True → this record is read-only right now. The secondary action and
   * the overflow's write actions disable, each with a Tooltip explaining
   * why, and a `Locked` Tag appears beside the title. `Ask` and the
   * Information panel stay fully interactive: locked means you cannot act
   * on or edit this record, not that you cannot consult it.
   *
   * NOT the same thing as Figma's `Restricted` state, which is about the
   * viewer lacking entitlement to a VALUE — that is `RecordField.state ===
   * "masked"`. Michael confirmed (2026-09-07) the two coexist and both
   * need their own example: one is "you cannot edit", the other is "you
   * cannot see".
   */
  locked?: boolean
  /**
   * Figma's `Property 1` axis (node 19895:11728): the three states this
   * component owns. Independent of the reflow — an entity can be loading on
   * a tablet — which is why it is an enum rather than a boolean: the three
   * are mutually exclusive.
   *
   *   default     — all configured slots render.
   *   loading     — a skeleton matching the arrangement of the current
   *                 layout. NEVER an empty state: saying "nothing here"
   *                 while data is in flight states something untrue.
   *   restricted  — the viewer lacks entitlement to the values. The card
   *                 renders at 50% opacity, exactly as Figma's own
   *                 Restricted variant does. This is a governed STATE, not
   *                 a failure: the entity exists and is governed, so it is
   *                 never red and never an error.
   *
   * `restricted` and `locked` are different things and can both be true:
   * locked is "you cannot act on or edit this", restricted is "you cannot
   * see these values". So is `RecordField.state === "masked"`, which is the
   * same idea applied to one field instead of the whole card.
   */
  state?: EntityHeaderState
  /**
   * Sticks the card to the top of its scroll container and COMPRESSES it as
   * the reader scrolls down: the `secondaryMetadata` row and the
   * `description` drop, and the visual goes down one size (L to M). Scrolling
   * back up restores all three, at once, without waiting for the top.
   *
   * OFF BY DEFAULT, and it is one prop rather than two on purpose. Sticky and
   * compressed are inseparable — compressing a card that scrolls out of view
   * anyway does nothing — so binding them removes the broken half-state where
   * a caller wires one and forgets the other.
   *
   * WHERE IT BELONGS: a record page whose content scrolls under the header —
   * a detail view's Overview tab. Not in a SlideOut, a modal or a widget,
   * where there is no long scroll to reclaim room from.
   *
   * WHAT IT NEVER TOUCHES: the name, the visual, the source, the tags, the
   * state badge and the whole right-hand cluster. Compressed is still a
   * complete identity; it is the second row that goes, never the first.
   */
  compressOnScroll?: boolean
  className?: string
}

// ── Centralized fallback copy (configurable/centralized, never scattered inline in JSX) ──
export const ENTITY_HEADER_FALLBACKS = {
  /** Tooltip on the agent trigger when assignedAgent is null. */
  noAgentTooltip: "No agent assigned to this record",
  /** Tooltip on Ask. The button's label is one word; this carries the rest. */
  askTooltip: "Ask about this entity",
  /** The read-only Tag shown next to the type label when `locked` is true. */
  lockedTagLabel: "Locked",
  /** Tooltip on the CTA/overflow trigger when `locked` is true. */
  lockedActionTooltip: "This record is locked — read-only",
  /** The Tag shown beside the title when `state === "restricted"`. */
  restrictedTagLabel: "Restricted",
  /**
   * Tooltip on that Tag, and the state's accessible explanation. Figma's
   * prose asks `Restricted` to be "calm and explanatory" while its built
   * variant is a 50%-opacity card with NO explanatory element at all. The
   * opacity alone leaves a reader unable to tell a restricted card from a
   * loading one or a failed one, so Michael's call (2026-09-07) closes the
   * gap the way this component already closes it for `locked`: a Tag beside
   * the title, with the reason in a Tooltip on hover and on focus.
   */
  restrictedTooltip: "You do not have access to this entity's values. The entity exists and is governed — this is not an error.",
}

// ── Reflow threshold ──────────────────────────────────────────────────────
// The width below which the identity row stacks (see the `stacked` measurement
// in the component). Figma's identity row is 932px and it models Responsive as
// a discrete variant with no px value, so this is a calibrated estimate — set
// just under the point where the single row stops fitting, and documented as
// an estimate rather than presented as a specification.
const REFLOW_WIDTH = 720

// ── Drop thresholds — the third mechanism ─────────────────────────────────
// Figma's BEHAVIOUR frame lists three mechanisms IN ORDER and warns against
// confusing them: reflow (stack), then yielding (truncate), then dropping.
// Dropping is the last resort, once stacking and yielding have both run out.
//
// ORDER REVERSED FROM FIGMA, ON MICHAEL'S CALL (2026-09-07). Figma's
// visibility priority puts description at 6 and secondary metadata at 7,
// which drops METADATA first. Michael's ruling is the opposite: metadata is
// what you reach for first and it carries the facts someone might act on;
// description is the very edge case for extra granularity when metadata is
// not enough. So the description goes first and the metadata row survives
// longer. The remaining order is Figma's, untouched: source and tags yield
// long before either of these, and visual identity, title and state badge
// are NEVER dropped at any width.
//
// Both numbers are calibrated estimates, same as REFLOW_WIDTH — Figma states
// the order but no breakpoint for it. 420 is where a one-line description
// stops being able to hold a sentence worth reading (roughly 45 characters,
// the bottom of the comfortable reading range). 320 is a SlideOut at its
// narrowest snap minus padding: below that the metadata row cannot fit two
// items without wrapping into a block, which is the point Figma says it
// stops being a row.
const DROP_DESCRIPTION_WIDTH = 420
const DROP_METADATA_WIDTH = 320

// ── Removed: the container-width collapse thresholds ──────────────────────
// Three constants lived here (560px hide-tags, 480px shorten-assistant, and a
// 12-character first-name guard) and their own comment admitted the problem:
// "No Figma node exists for this component yet, so these px values are
// calibrated estimates, not a spec'd breakpoint." The node exists now, and it
// specifies something else entirely — reflow into stacked rows, then yield
// (tags → +N, then the title), then drop, with a fixed visibility priority.
// Hiding the tags wholesale is not in it. Reflow lands with the responsive
// pass; until then this card has one arrangement.
// Every HTL diagonal-arrow trigger carries this same Tooltip copy (this


// ── Component ────────────────────────────────────────────────────────────────

// ── Focus groups (Figma's FOCUS AND KEYBOARD frame) ────────────────────────
// Nine tab stops, six when nothing is truncated. The reason it is nine and
// not eighteen is Figma's own: one stop per item means a keyboard user tabs
// through every tag and every metadata item to get past the header and reach
// the page. That is not an inconvenience, it is a barrier. The metadata row
// is the heavier half of this now — it still holds six items, where the tag
// group holds two plus the overflow chip.
//
// So tags and secondary metadata are each ONE stop: Tab enters the group,
// arrow keys move inside it, Tab leaves it. This is the WAI-ARIA composite
// widget pattern — the same one a toolbar uses — implemented as a roving
// tabindex: exactly one item in the group is tabbable at a time.
//
// Focus ring: `focus-visible` only, so a mouse user never sees it, and it
// reuses the Button's own ring token rather than inventing a second one.
const FOCUS_RING =
  "outline-none rounded-[8px] focus-visible:ring-2 focus-visible:ring-offset-2 " +
  "focus-visible:[ring-offset-color:var(--canvas)] focus-visible:ring-[var(--btn-secondary-ring)]"

function useRovingIndex(count: number) {
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  // If the group shrinks (tags collapsing into +N, metadata capped), the
  // remembered index can point past the end. Clamp rather than reset, so
  // focus stays as close as possible to where the user left it.
  const index = count === 0 ? 0 : Math.min(active, count - 1)

  const move = (delta: number) => {
    if (count === 0) return
    const next = (index + delta + count) % count
    setActive(next)
    const items = ref.current?.querySelectorAll<HTMLElement>("[data-roving]")
    items?.[next]?.focus()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    // Only the four arrows plus Home/End. Everything else — Tab included —
    // is left alone, which is what makes Tab still leave the group.
    if (e.key === "ArrowRight" || e.key === "ArrowDown")     { e.preventDefault(); move(1) }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")   { e.preventDefault(); move(-1) }
    else if (e.key === "Home")                               { e.preventDefault(); move(-index) }
    else if (e.key === "End")                                { e.preventDefault(); move(count - 1 - index) }
  }

  return { ref, index, onKeyDown }
}

// Stops 1 and 8 — the title and the description — exist ONLY when truncated.
// A value that fits has nothing to reveal, and a focus stop that reveals
// nothing is one more press between the reader and the page. Measured, not
// guessed: a truncated element's scrollWidth exceeds its clientWidth.
function useIsTruncated<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [truncated, setTruncated] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setTruncated(el.scrollWidth > el.clientWidth + 1)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  })
  return { ref, truncated }
}

/**
 * HOW MANY TAGS THE ROW ACTUALLY HAS ROOM FOR.
 *
 * `ENTITY_HEADER_TAGS_MAX` is a CEILING, not a count — three at the very most,
 * fewer whenever the row is tight. This is the rule Figma's own cards follow:
 * its edge cases show three, two and two visible tags, because it collapses by
 * available space. A fixed number cannot do that. It either wastes room on a
 * card with a short name, or — the version this component shipped with — lets
 * the chips hold their width until the TITLE is what truncates, which is the
 * exact inversion of the documented order and the thing Figma's DO/DON'T frame
 * warns against.
 *
 * ARITHMETIC, NOT SHRINK-AND-SEE. The obvious implementation — render, check
 * for overflow, drop one, re-render — oscillates: removing a chip gives the
 * title room to grow, which takes the room back. So the budget is computed
 * from parts that do NOT depend on how many tags are showing:
 *
 *   budget = row width − the title at its natural width (capped) − the source
 *            − the `Locked`/`Restricted` tags − the gaps between them
 *
 * The title is measured at its NATURAL width via `scrollWidth`, which reports
 * the full string even while the ellipsis is on screen. That is what puts the
 * tags first in the yielding order: they are fitted into what is left AFTER
 * the title has been given everything it wants, up to its 540px ceiling.
 *
 * Chip widths come from a hidden probe row that renders every candidate at
 * full size. Measuring the visible chips instead would only ever tell us about
 * the ones already on screen, which is the wrong question.
 *
 * Reaching zero visible tags is a legitimate outcome, not a failure: at that
 * width the honest thing is one `+N` chip carrying all of them, rather than a
 * truncated name beside a tag that fits.
 */
function useTagFit(opts: {
  rowRef: React.RefObject<HTMLElement | null>
  probeRef: React.RefObject<HTMLElement | null>
  titleRef: React.RefObject<HTMLElement | null>
  sourceRef: React.RefObject<HTMLElement | null>
  /** Already sorted — signals by severity, then classification. */
  tags: EntityHeaderTag[]
  stacked: boolean
  /** Serialised tags + title + source: anything whose change moves a width. */
  signature: string
}) {
  const { rowRef, probeRef, titleRef, sourceRef, tags, stacked, signature } = opts
  const [fit, setFit] = useState(ENTITY_HEADER_TAGS_MAX)

  // The tag array is rebuilt on every render, so it cannot be a dependency
  // without re-running the effect forever. `signature` is the dependency;
  // this ref is how the effect reads the current values.
  const tagsRef = useRef(tags)
  tagsRef.current = tags

  useLayoutEffect(() => {
    const row = rowRef.current
    const probe = probeRef.current
    const count = tagsRef.current.length
    if (!row || !probe || count === 0) return

    const measure = () => {
      const probes = Array.from(probe.children) as HTMLElement[]
      if (probes.length < count + 1) return

      const chipW = probes.slice(0, count).map(el => el.offsetWidth)
      const plusW = probes[count].offsetWidth
      // Whatever follows the `+N` probe is a state tag (`Locked`,
      // `Restricted`) — always on screen, so it comes off the budget.
      const stateW = probes
        .slice(count + 1)
        .reduce((sum, el) => sum + el.offsetWidth + TAG_CHIP_GAP, 0)

      const titleW = Math.min(titleRef.current?.scrollWidth ?? 0, TITLE_CEILING)
      const sourceW = sourceRef.current?.offsetWidth ?? 0

      // Everything between the row's edge and the first chip. The source
      // costs its own width, the gap before it, and — because a rule is drawn
      // between source and tags — the divider plus a second gap.
      // Stacked: the title has its own row, so it costs the tags nothing.
      let budget = row.clientWidth - stateW - FIT_SLACK
      if (sourceW) budget -= sourceW + IDENTITY_GAP + SOURCE_DIVIDER
      if (!stacked) budget -= titleW + IDENTITY_GAP

      let best = 0
      for (let k = Math.min(ENTITY_HEADER_TAGS_MAX, count); k >= 1; k--) {
        // Same function the render uses, so the chips measured are exactly the
        // chips that will appear — including the promoted classification,
        // which is not always among the first k.
        const idx = pickTagIndices(tagsRef.current, k)
        const needed =
          idx.reduce((sum, i) => sum + (chipW[i] ?? 0), 0) +
          TAG_CHIP_GAP * (idx.length - 1) +
          (count > idx.length ? plusW + TAG_CHIP_GAP : 0)
        if (needed <= budget) { best = k; break }
      }
      // FLOOR OF ONE — but only in the stacked layout. A bare `+2` with no
      // chip beside it communicates nothing: the reader has to hover a
      // counter to learn there is anything to know. So when the row is too
      // tight for even one chip, show one anyway and let the group wrap.
      //
      // Not in the wide layout, and that restriction is the whole point. There
      // the tag group shares a row with the title, so forcing a chip in is
      // paid for by the name — the exact trade the yielding order forbids.
      // Stacked, source and tags have a row to themselves, so a wrap costs
      // nothing but a few pixels of height.
      if (best === 0 && stacked) best = 1

      setFit(prev => (prev === best ? prev : best))
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(row)
    return () => ro.disconnect()
  }, [rowRef, probeRef, titleRef, sourceRef, stacked, signature])

  return tags.length === 0 ? 0 : fit
}

/**
 * COMPRESS ON SCROLL DOWN, RESTORE ON SCROLL UP (Michael, 2026-09-09).
 *
 * By the time someone scrolls a record page they have finished reading the
 * header; keeping its full height spends the screen on what they are done
 * with. So the second row goes, the visual drops one size, and everything
 * that identifies the entity stays.
 *
 * SCROLL DIRECTION, NEVER HOVER. Hover was in the original sketch and is
 * deliberately not here: a header that grows when the cursor passes over it
 * fires by accident and pushes down the content the reader is in the middle
 * of, and hover exists neither on a tablet nor for a keyboard. Direction is
 * also the signal `ScreenLayout` already computes for the page `Header`'s own
 * compress, so the two agree rather than competing.
 *
 * BACK AT THE TOP IS ALWAYS FULL. Never leave a reader who has returned to
 * the top of a record looking at a reduced header — at rest the card is
 * whole, and that is the state the page opens in.
 *
 * THRESHOLD, not raw direction: a few pixels of jitter (a trackpad settling,
 * a focus scroll) must not flip the card. `SCROLL_EPSILON` is what makes it a
 * deliberate gesture rather than a twitch.
 *
 * AND THE CARD MUST NOT REACT TO ITS OWN HEIGHT. Compressing removes a row,
 * which shortens the page, which lowers the container's maximum scroll. A
 * reader sitting near the bottom is then CLAMPED upward by the browser — and
 * a naive direction check reads that clamp as "scrolling up", expands the
 * card, which lengthens the page again, which lets them scroll down, which
 * compresses it… The card flickers, and it flickers exactly where a reader
 * has stopped to read. Michael hit this one on the Universal Profile.
 *
 * Two guards, because one is not enough:
 *
 *   `atBottom`     pinned against the end of the scroll, a decrease is
 *                  geometry rather than intent, so it is ignored. One pixel
 *                  away from the end it is a real gesture again.
 *   `TOGGLE_LOCK`  and because the reflow may not have happened yet when the
 *                  event arrives, `atBottom` can read the OLD geometry and
 *                  wave the clamp through. So a toggle also buys a short
 *                  silence: for 180ms after the card changes, scroll only
 *                  updates the baseline. Every spurious event is a
 *                  consequence of our own change, and every one of them
 *                  lands inside that window. A real gesture outlasts it.
 *
 * WHERE THE POSITION COMES FROM — decided, not guessed (2026-09-10).
 * `ScreenLayout` publishes the scroll position of the container it created,
 * and this hook subscribes to it. Nothing else on the page can know which
 * element scrolls with certainty, and two earlier attempts to work it out
 * from here both failed on a real screen:
 *
 *   walking up to find a scrolling ancestor  resolves once, before the
 *     content has height, so it answers "none" and never revises
 *   listening to every scroller in the document  a screen holds many — the
 *     sidebar, a canvas widget's body, a side panel — and the ones parked at
 *     zero keep overwriting the one that moved, so the card never stays
 *     compressed. This is what Michael saw in UCP.
 *
 * The fallback for a card outside any `ScreenLayout` is still the document
 * capture listener, and it is sound there for the reason it was unsound in
 * UCP: a DS documentation page is one stage with one scroller.
 */
const SCROLL_TOP_ZONE = 16
const SCROLL_EPSILON = 4

const TOGGLE_LOCK = 180

/**
 * Does this card sit inside something that scrolls?
 *
 * Asks about the OVERFLOW STYLE only, deliberately — never about
 * `scrollHeight > clientHeight`. Content height is not settled when the
 * effect first runs, so a height-based test answers "no" on a container that
 * is about to scroll, and answers it permanently. Overflow style is set by
 * the layout and is stable from the first paint.
 *
 * `false` means the HOST has pinned this card: `ScreenLayout` renders its
 * header zone outside the scroll container, and a caller may put the
 * EntityHeader there instead of in the content. Thom's UCP profile does
 * exactly that. Such a card is already always-visible, so it needs no sticky
 * of its own — but it still has to hear the page scroll to compress.
 */
function hasScrollableAncestor(el: HTMLElement | null): boolean {
  let node = el?.parentElement ?? null
  while (node) {
    const { overflowY } = getComputedStyle(node)
    if (overflowY === "auto" || overflowY === "scroll") return true
    node = node.parentElement
  }
  return false
}

function useCompressOnScroll(enabled: boolean, ref: React.RefObject<HTMLElement | null>) {
  const [compressed, setCompressed] = useState(false)
  const lastY = useRef(0)
  // Mirrors `compressed` so the listener can read the current value without
  // being re-created on every toggle — and so the lock is armed exactly when
  // the value really changes.
  const isCompressed = useRef(false)
  const lockUntil = useRef(0)

  // WHERE THE POSITION COMES FROM. `ScreenLayout` publishes the scroll
  // position of the element it created, so inside one there is nothing to
  // work out. Outside one — the DS documentation pages — this is null and
  // the fallback below applies.
  const pageScroll = usePageScroll()

  useEffect(() => {
    if (!enabled) { setCompressed(false); isCompressed.current = false; return }
    lockUntil.current = 0

    // Everything below decides ONE thing: given a new scroll position, should
    // the card be compressed? Both sources feed this, so the rules — the top
    // zone, the threshold, the clamp guards — are written once.
    const apply = (y: number, maxY: number) => {
      const now = performance.now()

      // Inside the lock the card holds still and only re-baselines, so the
      // reflow our own toggle caused cannot bounce it back.
      if (now < lockUntil.current) { lastY.current = y; return }

      const atBottom = y >= maxY - 1
      const last = lastY.current
      let next = isCompressed.current
      if (y <= SCROLL_TOP_ZONE) next = false
      else if (y > last + SCROLL_EPSILON) next = true
      else if (y < last - SCROLL_EPSILON && !atBottom) next = false

      if (next !== isCompressed.current) {
        isCompressed.current = next
        lockUntil.current = now + TOGGLE_LOCK
        setCompressed(next)
      }
      lastY.current = y
    }

    // ── The layout told us. Nothing to guess. ──────────────────────────────
    if (pageScroll) {
      lastY.current = pageScroll.read().top
      return pageScroll.subscribe((info: PageScrollInfo) => apply(info.top, info.max))
    }

    // ── FALLBACK, for a card that is not inside a ScreenLayout ─────────────
    // One document-level capturing listener, because scroll does not bubble
    // but does capture. `contains` keeps it to the container the card sits
    // in; a card pinned outside every scroller takes whatever the page gives
    // it, which is only safe here because a page with no ScreenLayout is a
    // single stage with a single scroller. That assumption is exactly what
    // broke on a real screen, and exactly why ScreenLayout now decides.
    lastY.current = 0
    const pinned = !hasScrollableAncestor(ref.current)

    const onScroll = (e: Event) => {
      const el = ref.current
      if (!el) return

      const target = e.target
      const isDocument = target === document || target === document.documentElement || target === document.body
      const isOurs = isDocument || pinned || (target instanceof HTMLElement && target.contains(el))
      if (!isOurs) return

      const y = isDocument ? window.scrollY : (target as HTMLElement).scrollTop
      const maxY = isDocument
        ? document.documentElement.scrollHeight - window.innerHeight
        : (target as HTMLElement).scrollHeight - (target as HTMLElement).clientHeight
      apply(y, maxY)
    }

    document.addEventListener("scroll", onScroll, { capture: true, passive: true })
    return () => document.removeEventListener("scroll", onScroll, { capture: true })
  }, [enabled, ref, pageScroll])

  return compressed
}

// ── Loading skeleton ────────────────────────────────────────────────────────
// Every width and height below is read from Figma's own `Property 1=Loading`
// variants (20134:314522 wide, 20152:6818 stacked) — not estimated, and not
// derived from one another.
//
// ONE DEVIATION, ON PURPOSE. Figma's stacked skeleton has five rows: title,
// then source, then tags, then description, then metadata. Its stacked
// *rendered* variant has three, with source and tags sharing a row. A
// skeleton exists to hold the shape of the thing that replaces it, so this
// one follows the rendered layout: three rows, source and tags together. The
// five-row skeleton would make the content jump the moment it arrived.
//
// The right-hand cluster is skeletoned too. Figma does that as well, and it
// is the correct call for a side the loaded card never compresses — leaving
// it blank would make the card visibly reflow on arrival.
function EntityHeaderSkeleton({ stacked }: { stacked: boolean }) {
  return (
    <>
      {/* Row 1 — visual + title, and the action cluster on the right. */}
      <div className={cn("flex gap-[12px]", stacked ? "items-start" : "items-center")}>
        <Skeleton shape="circle" width={32} height={32} className="shrink-0" />
        <div className="flex-1 flex flex-col gap-[6px] min-w-0">
          <div className={cn("flex gap-[12px]", stacked ? "flex-col items-start gap-[6px]" : "items-center")}>
            <Skeleton shape="text" width={stacked ? 150 : 180} height={24} className="shrink-0" />
            {/* Wide: source and tags sit on the title row, so their
                placeholders do too. Stacked: they become row 2 below. */}
            {!stacked && <Skeleton shape="text" width={120} height={20} className="shrink-0" />}
          </div>
        </div>
        <div className="flex items-center gap-[8px] shrink-0">
          {stacked
            ? <><Skeleton shape="text" width={96} height={28} /><Skeleton shape="text" width={120} height={28} /><Skeleton shape="text" width={28} height={28} /></>
            : <><Skeleton shape="text" width={80} height={20} /><Skeleton shape="text" width={120} height={28} /></>}
        </div>
      </div>

      {/* Row 2, stacked only — source and tags, on one row, matching the
          rendered stacked layout rather than Figma's two-row skeleton. */}
      {stacked && (
        <div className="flex items-center gap-[12px] flex-wrap">
          <Skeleton shape="text" width={110} height={16} />
          <Skeleton shape="text" width={92} height={20} />
          <Skeleton shape="text" width={72} height={20} />
          <Skeleton shape="text" width={36} height={20} />
        </div>
      )}

      {/* Description. Skeletoned unconditionally: the point of a skeleton is
          that the caller does not yet know which slots have content, so a
          skeleton that only shows the slots it can already prove would need
          the very data it is standing in for. */}
      <Skeleton shape="text" width={stacked ? 380 : 420} height={16} />

      {/* Metadata row — four items stacked, five wide. Figma's own counts. */}
      <div className="flex items-center gap-[12px] flex-wrap">
        {(stacked ? [86, 62, 100, 58] : [90, 70, 110, 60, 70]).map((w, i) => (
          <Skeleton key={i} shape="text" width={w} height={16} />
        ))}
      </div>
    </>
  )
}

function EntityHeader({
  name,
  visual,
  tags = [],
  stateBadge,
  source,
  description,
  secondaryMetadata = [],
  // `recordFields` is intentionally NOT destructured. It stays on the props
  // interface — every caller keeps passing it, so the contract lives in one
  // place — but this component no longer renders it anywhere: the Figma
  // Anatomy has no RECORD grid, and the Information panel that explains
  // those fields is host-rendered through `onInformationOpen`. Reading it
  // here would only invite a second render site for data the panel owns.
  assignedAgent,
  secondaryAction,
  menuActions = [],
  showInformation = false,
  onInformationOpen,
  locked = false,
  state = "default",
  compressOnScroll = false,
  className,
}: EntityHeaderProps) {

  // ── Tag order and cap ───────────────────────────────────────────────────
  // Signals first, sorted by severity, then classification. Classification is
  // stripped of any tone the caller passed: it is never coloured, and that is
  // the rule that keeps a tenant's hundred classifications from breaking the
  // visual system.
  const TONE_RANK: Record<string, number> = { error: 0, alert: 1, none: 2 }
  const orderedTags = [...tags]
    .map(t => (t.role === "classification" ? { ...t, tone: undefined } : t))
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === "signal" ? -1 : 1
      return TONE_RANK[a.tone ?? "none"] - TONE_RANK[b.tone ?? "none"]
    })

  // Capped here rather than by trusting the caller — same reasoning as the
  // identity tags cap. Six is the maximum; the overflow goes to the Overview,
  // never to a `+N` chip.
  const visibleMetadata = secondaryMetadata.slice(0, SECONDARY_METADATA_MAX)

  // Avatar fallback: only a genuinely blank name gets the DS's own "empty"
  // glyph (avatar.tsx's existing avatarStyle="empty") instead of initials —
  // a single-character name already renders fine as one initial.
  const hasName = Boolean(name && name.trim())

  // `visual` is required and has no default, because exactly one of the two
  // must render — but "required" is only enforced by the type system, and
  // this repo compiles without strictNullChecks or noUncheckedIndexedAccess.
  // So a caller writing the normal thing —
  //
  //   const VISUALS: Record<EntityKind, EntityVisual> = { person: …, company: … }
  //   <EntityHeader visual={VISUALS[kind]} … />
  //
  // — type-checks even for a `kind` the map has no entry for, and the card
  // then throws on `visual.kind` and takes the whole page with it. That has
  // already happened once in this repo. Falling back to the avatar renders a
  // slightly generic header instead of a blank screen; it changes nothing for
  // any caller that passes a real value.
  const safeVisual: EntityVisual = visual ?? { kind: "avatar" }

  // Stops 3 and 9 — the two roving groups. Declared before the early
  // `loading` return would be wrong (hooks must not be conditional), so
  // they live here, above it.
  // The tag group is the tags plus, in order, the `+N` chip, `Locked` and
  // `Restricted` — the last two are STATE tags rather than caller tags, but
  // they sit in the same visual slot, so they are items in the same group
  // rather than extra tab stops.
  const stateTagCount = (locked ? 1 : 0) + (state === "restricted" ? 1 : 0)
  const metaGroup = useRovingIndex(visibleMetadata.length)
  // Stops 1 and 8 — only when the value actually overflows.
  const titleTrunc = useIsTruncated<HTMLSpanElement>()
  const descTrunc  = useIsTruncated<HTMLSpanElement>()

  // ── Reflow — Figma's `Size = Responsive` variant ─────────────────────────
  // REFLOW BEFORE YIELDING, AND YIELDING BEFORE DROPPING. At narrower widths
  // this card does not compress a single row and it does not hide slots: it
  // breaks into stacked rows and keeps everything. On a tablet there is
  // vertical space to spare, so stacking costs nothing and loses nothing.
  //
  //   wide      visual · title · source · │ · tags   —   ⓘ · badge · secondary · Ask · ···
  //   stacked   visual · title                       —   ⓘ · badge · secondary · Ask · ···
  //             source · tags
  //
  // Source and tags share the stacked row. Figma's BEHAVIOUR block describes
  // them on separate rows, but its built Responsive instance (node
  // 20150:8324) puts them together — the instance is what renders, so the
  // instance wins.
  //
  // Measured on the CARD, not the viewport: this header can sit in a narrow
  // panel on an otherwise-desktop screen, so a media query would get it
  // wrong. The threshold is a calibrated estimate, not a spec'd breakpoint —
  // Figma models this as a discrete variant and gives no px value. It is set
  // just below the width the single row needs (Figma's identity row is
  // 932px), so the switch happens when the row genuinely runs out.
  const rootRef = useRef<HTMLDivElement>(null)
  const [stacked, setStacked] = useState(false)
  const [dropped, setDropped] = useState({ description: false, metadata: false })
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      setStacked(w < REFLOW_WIDTH)
      setDropped({
        description: w < DROP_DESCRIPTION_WIDTH,
        metadata: w < DROP_METADATA_WIDTH,
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /**
   * THE STICKY WRAPPER, and why it is frosted rather than painted.
   *
   * `--card-default-bg` is a 5% white: the card's surface is TRANSLUCENT by
   * design and only reads correctly because the page ground shows through it.
   * That makes a sticky card awkward twice over.
   *
   * Stick it with nothing behind it and the content scrolling underneath
   * shows straight through — the first build did exactly that.
   *
   * Paint an opaque `var(--canvas)` behind it and the bleed-through goes, but
   * so does the ground: `AppBackground` lays a radial gradient over the flat
   * canvas, so a flat fill puts the card on a DIFFERENT ground from every
   * other card on the page, and it reads as a different grey. Michael caught
   * that one on sight (2026-09-09).
   *
   * `backdrop-filter` is what satisfies both. Nothing is painted, so the
   * gradient still reaches the card and the tone is unchanged — blurring a
   * smooth gradient is visually a no-op. What the blur destroys is the one
   * thing that must not show: the text and edges of the content passing
   * underneath.
   *
   * `top-0` is the top of the SCROLL CONTAINER, not the viewport. In
   * `ScreenLayout` the page `Header` lives outside that container, so the two
   * never overlap — they stack.
   */
  // Nothing to stick when the host has already pinned the card outside the
  // scroll area — wrapping it then would add a sticky that never engages and
  // a backdrop-filter over nothing.
  const stick = (node: ReactNode) =>
    compressOnScroll && !hostPinned
      ? (
          <div
            className="sticky top-0 z-[2]"
            style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
          >
            {node}
          </div>
        )
      : <>{node}</>

  // Compress on scroll — see useCompressOnScroll. `rootRef` is what locates
  // the scroll container, so this has to sit after the reflow block that
  // declares it.
  const compressed = useCompressOnScroll(compressOnScroll, rootRef)
  // Mirrors the hook's own test, for the sticky wrapper below. Measured after
  // mount, so the first paint wraps and a later one may not — harmless,
  // because the wrapper is invisible until something scrolls under it.
  const [hostPinned, setHostPinned] = useState(false)
  useLayoutEffect(() => {
    if (!compressOnScroll) return
    setHostPinned(!hasScrollableAncestor(rootRef.current))
  }, [compressOnScroll])

  // Everything the fit has to measure around.
  const fitRowRef  = useRef<HTMLDivElement>(null)
  const probeRef   = useRef<HTMLDivElement>(null)
  const sourceRef  = useRef<HTMLSpanElement>(null)

  // Re-measure whenever a rendered width could have moved. Chip labels and
  // tones change chip widths; the name and the source change what is left for
  // them; the state tags take room out of the same row.
  const fitSignature = [
    orderedTags.map(t => `${t.role}:${t.tone ?? "none"}:${t.label}`).join("|"),
    name,
    source ?? "",
    locked ? "locked" : "",
    state,
  ].join("§")

  const tagFit = useTagFit({
    rowRef: fitRowRef,
    probeRef,
    titleRef: titleTrunc.ref,
    sourceRef,
    tags: orderedTags,
    stacked,
    signature: fitSignature,
  })

  // HOW MANY TAGS FIT — measured, not assumed. `tagFit` is the count the row
  // actually has room for; `pickTagIndices` turns it into which ones. See
  // useTagFit for the arithmetic and why it is arithmetic rather than a
  // shrink-and-see loop.
  const visibleIdx = pickTagIndices(orderedTags, tagFit)
  const visibleSet = new Set(visibleIdx)
  const visibleTags = visibleIdx.map(i => orderedTags[i])
  const hiddenTags = orderedTags.filter((_, i) => !visibleSet.has(i))

  const tagGroup  = useRovingIndex(visibleTags.length + (hiddenTags.length > 0 ? 1 : 0) + stateTagCount)

  // ── Loading ─────────────────────────────────────────────────────────────
  // Returns early, but INSIDE the same CardContainer and with the same
  // `rootRef`, so the measurement that decides `stacked` keeps running and
  // the skeleton matches the layout the real card will land in. A skeleton
  // whose shape does not match what replaces it is worse than none: the
  // content appears to jump.
  if (state === "loading") {
    return stick(
      <CardContainer size="default" variant="default" className={cn("w-full", className)}>
        <div
          ref={rootRef}
          className="flex flex-col gap-[16px]"
          role="status"
          aria-busy="true"
          aria-label={`Loading ${name || "entity"}`}
        >
          <EntityHeaderSkeleton stacked={stacked} />
        </div>
      </CardContainer>
    )
  }

  return stick(
    <CardContainer size="default" variant="default" className={cn("w-full", className)}>
      {/* Restricted — the card at 50% opacity, which is what Figma's own
          Restricted variant is, PLUS a `Restricted` Tag beside the title
          carrying the reason in a Tooltip. The opacity is Figma's; the Tag is
          Michael's call (2026-09-07), because Figma's prose asks this state
          to be "calm and explanatory" and its instance carries nothing
          explanatory at all — opacity alone cannot be told apart from
          loading or failed. Neutral, never error: it is a governed state. */}
      <div ref={rootRef} className={cn("relative flex flex-col gap-[16px]", state === "restricted" && "opacity-50")}>

        {/* MEASURING PROBE — every candidate chip at full size, plus a `+N`
            and whichever state tags are on. Invisible, out of the layout and
            out of the accessibility tree; it exists only so useTagFit can ask
            "how wide would this chip be" about chips that are not on screen.
            Order matters and is the contract with the hook: tags in
            `orderedTags` order, then `+N`, then the state tags. */}
        <div
          ref={probeRef}
          aria-hidden="true"
          className="pointer-events-none invisible absolute left-0 top-0 flex items-center gap-[6px] whitespace-nowrap"
        >
          {orderedTags.map((t, i) => (
            <Tag
              key={`probe-${t.role}-${t.label}-${i}`}
              variant={t.tone ?? "neutral"}
              size="sm"
              leadingIcon={t.icon ? <t.icon size={12} strokeWidth={1.75} /> : undefined}
            >
              {t.label}
            </Tag>
          ))}
          <Tag variant="neutral" size="sm">{`+${orderedTags.length}`}</Tag>
          {locked && (
            <Tag variant="secondary" size="sm" leadingIcon={<Lock size={12} strokeWidth={1.75} />}>
              {ENTITY_HEADER_FALLBACKS.lockedTagLabel}
            </Tag>
          )}
          {state === "restricted" && (
            <Tag variant="secondary" size="sm" leadingIcon={<EyeOff size={12} strokeWidth={1.75} />}>
              {ENTITY_HEADER_FALLBACKS.restrictedTagLabel}
            </Tag>
          )}
        </div>

        {/* ── Identity row — visual · (title · source · tags) · right cluster.
            Cross-axis alignment follows the layout: centered while the left
            side is a single line, top-aligned once it reflows into two, so
            the avatar and the right cluster sit against the title rather than
            floating in the middle of a two-line block. */}
        <div className={cn("flex gap-[12px] flex-wrap", stacked ? "items-start" : "items-center")}>
          {/* Visual identity — exactly one, never both. Avatar for people and
              brands, highlight icon for everything else. Decorative to the
              keyboard (never a focus stop), named to the screen reader. */}
          {/* One size down when compressed — L to M, which is 32px to 24px
              for an avatar and 40px to 32px for a highlight icon. The visual
              is never DROPPED (it is half of how an entity is recognised at a
              glance), but at a glance is all it has to do once the reader has
              scrolled past, so it gives the row back some width. */}
          {safeVisual.kind === "avatar" ? (
            <AvatarCircle name={name} sizeKey={compressed ? "md" : "lg"} avatarStyle={hasName ? "text" : "empty"} />
          ) : (
            <HighlightIcon
              size={compressed ? "md" : "lg"}
              variant={safeVisual.variant ?? "neutral"}
              icon={<safeVisual.icon size={16} strokeWidth={1.75} />}
              className="shrink-0"
            />
          )}

          <div className="flex-1 flex flex-col gap-[6px]">
            {/* Wide: one row — title · source · │ · tags.
                Stacked: two — title, then source · tags together, matching
                Figma's built Responsive instance. Same elements in the same
                order either way; only the wrapping changes. Nothing is hidden
                and nothing is dropped, which is the whole point of reflowing
                before yielding. */}
            {/* THE ROW THE TAG BUDGET IS MEASURED AGAINST. Its width is set
                by the card, not by its children — the visual and the right
                cluster are siblings of the column this sits in — so it is a
                stable thing to divide up, and dropping a tag cannot change
                it. That is what keeps the fit from oscillating. */}
            <div
              ref={fitRowRef}
              className={cn("flex gap-[12px] min-w-0", stacked ? "flex-col items-start gap-[6px]" : "items-center")}
            >
              {/* Identity group — title (+ `Locked`). Stays whole in both
                  layouts; in the stacked layout it becomes row 1 on its own. */}
              <div className={cn("flex items-center gap-[12px] min-w-0", stacked && "w-full")}>
                {/* Title — PROTECTED, and it yields last.
                    `flex: 0 1 auto` + `min-width: 0` + a 540px ceiling, exactly
                    as the Figma truncation block specifies for code: the title
                    takes whatever the row has left after visual, source,
                    collapsed tags and actions, and truncates only there.
                    It was `flex-1`, which made it GROW and shove the source out
                    to the right edge — the bug visible in the prototype. The
                    540px is Figma's own number: the identity row is 932px and
                    visual + source + tags + gaps take roughly 395 of it.
                    A title cut short with empty space beside it is a bug, not a
                    rule. Never wraps, at any width. Never dropped. */}
                <Tooltip content={name} side="cursor" triggerClassName="block min-w-0 basis-auto grow-0 shrink max-w-[540px]">
                  {/* STOP 1 — and only when truncated. `tabIndex={-1}` keeps
                      it out of the tab order when the whole name fits, which
                      is what turns nine stops into six. Focus bubbles up to
                      the Tooltip's own span, so focusing it opens the tooltip
                      without Tooltip needing to know about any of this. */}
                  <span
                    ref={titleTrunc.ref}
                    tabIndex={titleTrunc.truncated ? 0 : -1}
                    className={cn("block truncate text-[18px] font-semibold leading-[1.3]", FOCUS_RING)}
                    style={{ color: "var(--color-text-title)" }}
                  >
                    {name}
                  </span>
                </Tooltip>
              </div>

              {/* Provenance group — source · │ · tags. Same order in both
                  layouts; in the stacked layout it becomes row 2, which is
                  what Figma's built Responsive instance does (its BEHAVIOUR
                  prose lists source and tags as two separate rows — the
                  instance puts them on one, and the instance wins). */}
              {(source || visibleTags.length > 0) && (
                <div className={cn("flex items-center gap-[12px] min-w-0", stacked && "w-full")}>
                  {/* Source — which system this record came from. One item,
                      always visible, separated from the title by the same
                      bullet the reference design uses. Tokens read from Figma:
                      the bullet is Surface/Neutral/Emphasis, the icon is
                      Icon/Neutral/Dark, the value is Text/Body at 12px Medium.
                      The bullet is a SEPARATOR from the title, so it goes when
                      the title moves to its own row — a row must not open on a
                      dangling punctuation mark. */}
                  {source && (
                    <span ref={sourceRef} className="inline-flex items-center gap-[8px] shrink-0 min-w-0">
                      {!stacked && (
                        <span
                          aria-hidden="true"
                          className="text-[16px] leading-none"
                          style={{ color: "var(--color-surface-neutral-emphasis)" }}
                        >
                          •
                        </span>
                      )}
                      <Tooltip content={`Source · ${source}`} side="cursor">
                        {/* STOP 2 — one stop for the whole source, never one
                            per part. The 160px is Figma's own fixed ceiling
                            for this slot (~22 characters); it truncates there
                            even when the row has more to give, because source
                            competes for the same row as the tags and the
                            title, and the title is the one that yields last. */}
                        <span
                          data-roving
                          tabIndex={0}
                          className={cn("inline-flex items-center gap-[4px] min-w-0 max-w-[160px]", FOCUS_RING)}
                        >
                          <Database size={14} strokeWidth={1.75} style={{ color: "var(--color-icon-neutral-dark)" }} />
                          <span className="block truncate text-[12px] font-medium" style={{ color: "var(--color-text-body)" }}>
                            {source}
                          </span>
                        </span>
                      </Tooltip>
                    </span>
                  )}
                  {/* Divider — separates identity from the tag group, per the
                      Figma identity row (Identity · Divider · Tags, gap 8).
                      Only when there is something on both sides of it. */}
                  {source && visibleTags.length > 0 && (
                    <span
                      aria-hidden="true"
                      className="shrink-0 self-center"
                      style={{ width: 1, height: 16, background: "var(--color-border-neutral-lighter)" }}
                    />
                  )}
                  {/* Tag group — signals first, then classification, capped at 6
                      with a `+N` chip. Tags HUG and wrap: they never take a fixed
                      width, so growth in the title or source makes them collapse
                      instead of overlapping.
                      Colour rule: only signals may be error/alert. Classification
                      is always neutral — enforced above, in orderedTags. */}
                  {/* STOP 3 — ONE stop for the whole tag group. Tab enters it,
                      arrows move inside it, Tab leaves. The group is small now
                      (two tags, the overflow chip, and the state tags), but it
                      stays one stop: the pattern has to hold for the row that
                      carries all of them at once. */}
                  {(visibleTags.length > 0 || stateTagCount > 0) && (
                    <div
                      ref={tagGroup.ref}
                      role="group"
                      aria-label="Tags"
                      onKeyDown={tagGroup.onKeyDown}
                      className="flex items-center gap-[6px] flex-wrap min-w-0"
                    >
                      {visibleTags.map((t, i) => (
                        <span
                          key={`${t.role}-${t.label}-${i}`}
                          data-roving
                          tabIndex={tagGroup.index === i ? 0 : -1}
                          className={cn("inline-flex shrink-0", FOCUS_RING)}
                        >
                          <Tag
                            variant={t.tone ?? "neutral"}
                            size="sm"
                            leadingIcon={t.icon ? <t.icon size={12} strokeWidth={1.75} /> : undefined}
                            className="shrink-0"
                          >
                            {t.label}
                          </Tag>
                        </span>
                      ))}
                      {/* +N — the hidden tags reach the keyboard and the screen
                          reader through the Tooltip's own content, not only on
                          hover. That is what makes it acceptable for tags to
                          yield before the title: nothing is lost, only moved.
                          It is the last item INSIDE the group, not a stop of
                          its own, so arrowing to the end reveals them. */}
                      {hiddenTags.length > 0 && (
                        <Tooltip content={hiddenTags.map(t => t.label).join(" · ")} side="cursor">
                          <span
                            data-roving
                            tabIndex={tagGroup.index === visibleTags.length ? 0 : -1}
                            className={cn("inline-flex shrink-0", FOCUS_RING)}
                          >
                            <Tag variant="neutral" size="sm" className="shrink-0">
                              {`+${hiddenTags.length}`}
                            </Tag>
                          </span>
                        </Tooltip>
                      )}
                      {locked && (
                        <Tooltip content={ENTITY_HEADER_FALLBACKS.lockedActionTooltip} side="cursor">
                          <span
                            data-roving
                            tabIndex={tagGroup.index === visibleTags.length + (hiddenTags.length > 0 ? 1 : 0) ? 0 : -1}
                            className={cn("inline-flex shrink-0", FOCUS_RING)}
                          >
                            <Tag variant="secondary" size="sm" leadingIcon={<Lock size={12} strokeWidth={1.75} />} className="shrink-0">
                              {ENTITY_HEADER_FALLBACKS.lockedTagLabel}
                            </Tag>
                          </span>
                        </Tooltip>
                      )}
                      {/* `Restricted` — the viewer lacks entitlement to the
                          VALUES. Same treatment as `Locked` because it is the
                          same kind of fact about the whole card, and for the
                          same reason: a muted card with no label leaves the
                          reader unable to tell restricted from loading or
                          failed. Neutral, never error — the entity exists and
                          is governed, so this is a state and not a failure. */}
                      {state === "restricted" && (
                        <Tooltip content={ENTITY_HEADER_FALLBACKS.restrictedTooltip} side="cursor">
                          <span
                            data-roving
                            tabIndex={tagGroup.index === visibleTags.length + (hiddenTags.length > 0 ? 1 : 0) + (locked ? 1 : 0) ? 0 : -1}
                            className={cn("inline-flex shrink-0", FOCUS_RING)}
                          >
                            <Tag variant="secondary" size="sm" leadingIcon={<EyeOff size={12} strokeWidth={1.75} />} className="shrink-0">
                              {ENTITY_HEADER_FALLBACKS.restrictedTagLabel}
                            </Tag>
                          </span>
                        </Tooltip>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* The clickable zone-summary tags that used to sit here are
                GONE, along with focusZone(). They were a second tag system
                occupying the same visual slot the real `tags` array now
                owns, and they summarised the two expandable zones — which
                the Figma does not have. Their scroll-and-highlight
                behaviour went with them: nothing in this header scrolls to
                a zone any more. */}
          </div>

          {/* Right cluster — Figma's own order and gap: Information → State
              badge → Secondary CTA → Ask → Menu, 8px apart. This side is
              FIXED and never compressed; the left side is what yields. */}
          <div className="flex items-center gap-[8px] shrink-0 flex-wrap justify-end">
            {/* 1 · Information — where the fields IN THIS HEADER came from:
                the title, the source, the state. Not the Overview, not the
                Knowledge tab. A boolean the caller owns; it no longer
                disappears just because `recordFields` happens to be empty. */}
            {showInformation && (
              <Tooltip
                content={onInformationOpen ? "About this record — where the title, source and state came from" : "No information panel wired for this record yet"}
                side="cursor"
              >
                <Button
                  variant="tertiary"
                  size="sm"
                  iconPosition="alone"
                  icon={<Info size={14} strokeWidth={1.75} />}
                  aria-label="About this record"
                  disabled={!onInformationOpen}
                  onClick={onInformationOpen}
                  className="shrink-0"
                />
              </Tooltip>
            )}

            {/* 2 · State badge — full semantic range, exactly one, never
                dropped. Never a focus stop: it is status, not a control. */}
            {stateBadge && (
              <Tag
                variant={stateBadge.variant}
                size="sm"
                leadingIcon={stateBadge.icon ? <stateBadge.icon size={12} strokeWidth={1.75} /> : undefined}
                className="shrink-0"
              >
                {stateBadge.label}
              </Tag>
            )}

            {/* 3 · Secondary action — optional, off by default. Most records
                do not have one. */}
            {secondaryAction && (() => {
              const lockDisabled = locked && secondaryAction.disableWhenLocked !== false
              const disabled = lockDisabled || Boolean(secondaryAction.disabled)
              const tooltip = lockDisabled ? ENTITY_HEADER_FALLBACKS.lockedActionTooltip : secondaryAction.disabledTooltip
              const btn = (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={disabled}
                  onClick={disabled ? undefined : secondaryAction.onClick}
                  className="shrink-0"
                >
                  {secondaryAction.label}
                </Button>
              )
              return disabled && tooltip
                ? <Tooltip content={tooltip} side="cursor">{btn}</Tooltip>
                : btn
            })()}

            {/* 4 · Ask — the primary CTA. variant="main" is the deliberate,
                named exception (see file header).
                It KEEPS the Sparkle, shared with the Next Best Action card.
                Figma's prose says the two must not share a mark; Michael
                overruled that deliberately (2026-09-07): both are AI
                surfaces, and the shared glyph is what communicates that —
                one converses, the other transacts. The Figma component
                itself already shares it (both instance the same `IA-icon`),
                so the file agrees with the decision and only its prose does
                not. Do not "fix" this back. */}
            {/* The label is ONE WORD on purpose. It was "Ask about {name}",
                which grew with the entity name and consumed space the header
                needs — the tooltip carries the rest. That is also what makes
                the width-measuring machinery obsolete: there is no long label
                left to shorten. */}
            <Tooltip content={assignedAgent ? ENTITY_HEADER_FALLBACKS.askTooltip : ENTITY_HEADER_FALLBACKS.noAgentTooltip} side="cursor">
              <Button
                variant="main"
                size="sm"
                icon={<Sparkle size={16} strokeWidth={1.75} />}
                aria-label={assignedAgent ? ENTITY_HEADER_FALLBACKS.askTooltip : ENTITY_HEADER_FALLBACKS.noAgentTooltip}
                disabled={!assignedAgent}
                onClick={assignedAgent ? assignedAgent.onOpenChat : undefined}
              >
                Ask
              </Button>
            </Tooltip>

            {/* 5 · Menu — destructive and secondary actions only, never a
                visible button. Which actions exist is configured per entity
                in Helix Data Studio; the header owns one rule: destructive
                lives here. */}
            {menuActions.length > 0 && (
              <ActionOverflowMenu
                items={menuActions}
                disabled={locked}
                disabledTooltip={ENTITY_HEADER_FALLBACKS.lockedActionTooltip}
              />
            )}

            {/* The disclosure chevron was here. There is nothing left to
                disclose: the Figma Entity Header is a fixed arrangement of
                slots, not a collapsible card. */}
          </div>
        </div>

        {/* Description — one line, never wraps, truncates with a Tooltip
            carrying the full sentence. Off unless the caller passes one:
            there is no default copy and no placeholder. Text/Body at 14px
            Medium, read from Figma. */}
        {description && !dropped.description && !compressed && (
          <Tooltip content={description} side="cursor" triggerClassName="block min-w-0">
            {/* STOP 8 — and only when truncated, same reasoning as the title.
                It is elastic, not fixed: one line at container width, with no
                ceiling of its own, so on a wide card it usually fits and
                costs no stop at all. */}
            <span
              ref={descTrunc.ref}
              tabIndex={descTrunc.truncated ? 0 : -1}
              className={cn("block truncate text-[14px] font-medium leading-[1.4]", FOCUS_RING)}
              style={{ color: "var(--color-text-body)" }}
            >
              {description}
            </span>
          </Tooltip>
        )}

        {/* Secondary metadata — the compact attribute row. Icon + text, never
            an icon alone: Entity List allows icon-only under space pressure,
            this header does not — it has the width, and a bare symbol forces
            the user to interpret it. Tooltip is always present, even when the
            text is not truncated. */}
        {/* STOP 9 — ONE stop for the whole row, arrows inside. Six metadata
            items as six stops is the other half of the twenty-five-press
            problem Figma's focus frame is written to avoid. */}
        {visibleMetadata.length > 0 && !dropped.metadata && !compressed && (
          <div
            ref={metaGroup.ref}
            role="group"
            aria-label="Details"
            onKeyDown={metaGroup.onKeyDown}
            className="flex flex-wrap items-center gap-x-[16px] gap-y-[8px]"
          >
            {visibleMetadata.map((item, i) => {
              const ItemIcon = item.icon
              return (
                <Tooltip key={`${item.text}-${i}`} content={item.tooltip} side="cursor">
                  {/* Figma's ceiling for this slot is stated in characters —
                      2 words / 8 for the short form, 24 for the long — so it
                      is expressed in `ch`, which IS a character width in CSS,
                      rather than converted to a px guess. It truncates with an
                      ellipsis; it never abbreviates, because an abbreviation
                      looks like the real value and misleads. The icon never
                      appears alone: this row hides an item entirely before it
                      strips the text off one. */}
                  {/* An actionable item is a real <button>; a plain one stays
                      a <span>. Same element tree either way, so the two sit on
                      the same baseline in the same row — the only difference a
                      reader sees is the underline. */}
                  {item.onClick ? (
                    <button
                      type="button"
                      data-roving
                      tabIndex={metaGroup.index === i ? 0 : -1}
                      onClick={item.onClick}
                      className={cn(
                        "inline-flex items-center gap-[4px] min-w-0 text-[12px] max-w-[24ch] cursor-pointer bg-transparent border-0 p-0 text-left",
                        FOCUS_RING,
                      )}
                    >
                      <ItemIcon size={14} strokeWidth={1.75} style={{ color: "var(--color-icon-neutral-dark)" }} />
                      {/* DS Link type style — `Link NEW/S/Regular` is 12px,
                          Medium, underlined. The weight and size already match
                          this row, so what the link contributes is the
                          underline, and ONLY the underline: the colour stays
                          `--color-text-body` like every other item. The offset
                          keeps the rule off the descenders in an address. */}
                      <span
                        className="block truncate text-[12px] font-medium underline underline-offset-[3px]"
                        style={{ color: "var(--color-text-body)", textDecorationThickness: "0.5px" }}
                      >
                        {item.text}
                      </span>
                    </button>
                  ) : (
                    <span
                      data-roving
                      tabIndex={metaGroup.index === i ? 0 : -1}
                      className={cn("inline-flex items-center gap-[4px] min-w-0 text-[12px] max-w-[24ch]", FOCUS_RING)}
                    >
                      <ItemIcon size={14} strokeWidth={1.75} style={{ color: "var(--color-icon-neutral-dark)" }} />
                      <span className="block truncate text-[12px] font-medium" style={{ color: "var(--color-text-body)" }}>
                        {item.text}
                      </span>
                    </span>
                  )}
                </Tooltip>
              )
            })}
          </div>
        )}

        {/* The two expandable zones rendered here. Gone: the Figma Entity
            Header has no AGENTIC SYSTEM and no YOUR INTERVENTION. That
            content belongs to Overview widgets, and this card reaches
            system interpretation only through a tag with a tooltip. */}
      </div>
    </CardContainer>
  )
}

// AgenticSystemZoneContent, AgenticSystemItem and InterventionZoneContent
// lived here — 6 states each, workflow cards, HTL rows, the Show-N-more
// disclosures. All of it went with the zones.

// ── Overflow menu — the repo's real Menu/MenuItem atom, anchored the same way
// NotificationCenter's own filter dropdown already is (capture the trigger's
// rect on click, render fixed-position, dismiss on backdrop click). ──

function ActionOverflowMenu({
  items,
  disabled,
  disabledTooltip,
}: {
  items: EntityHeaderAction[]
  disabled?: boolean
  disabledTooltip?: string
}) {
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null)

  const trigger = (
    <Button
      variant="tertiary"
      size="sm"
      iconPosition="alone"
      icon={<MoreHorizontal size={16} strokeWidth={1.75} />}
      aria-label="More actions"
      disabled={disabled}
      onClick={e => {
        const rect = e.currentTarget.getBoundingClientRect()
        setAnchor(prev => (prev ? null : { left: rect.right - 200, top: rect.bottom + 4 }))
      }}
    />
  )

  return (
    <>
      {disabled && disabledTooltip ? <Tooltip content={disabledTooltip} side="cursor">{trigger}</Tooltip> : trigger}
      {anchor && (
        <>
          <div className="fixed inset-0" style={{ zIndex: 10000 }} onClick={() => setAnchor(null)} />
          <div style={{ position: "fixed", left: anchor.left, top: anchor.top, zIndex: 10001 }}>
            <Menu className="w-[200px]">
              {items.map((a, i) => (
                <MenuItem
                  key={i}
                  size="sm"
                  label={a.label}
                  onClick={() => { a.onClick?.(); setAnchor(null) }}
                />
              ))}
            </Menu>
          </div>
        </>
      )}
    </>
  )
}

export { EntityHeader }
export type { LucideIcon }
