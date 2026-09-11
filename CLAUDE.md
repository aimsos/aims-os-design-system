# AIMS OS — Prototyping rules

Stack: React + Tailwind + shadcn/ui. TypeScript.

---

## Non-negotiables

- Use ONLY components from `src/components/ui/`. Never hand-roll a button, input, card, table, sidebar, topbar or tabs — import the existing one.
- Use design tokens (CSS vars). NEVER hardcode hex, rgba, px spacing, or radii. If a value isn't in the token scale, stop and inform the user before creating a new token.
- Match component states to the variants already defined (default, hover, focus, active, disabled, error). Don't invent new variants.
- Default theme is dark. Background = `var(--canvas)`, surfaces = `var(--surface)`, borders = `var(--field-border)`.
- Font is Inter. Use the typographic scale in `tailwind.config`, not arbitrary sizes.
- All colors via `var(--token-name)`. No exceptions in `.tsx` files.

## Before creating ANY new component file

This applies everywhere a new file gets created — not just `src/screens/` (see that section below, this is the general version of the same rule). It exists because 5 components (`GreetingHero`, `DailyMessageCard`, `StartHereCard`, `DailyBriefSection`, `WidgetCanvasSection`) were built directly in `src/components/ui/` and `src/components/layouts/` in 2026-07, bypassing the `experimental/` pipeline entirely: none were ever imported by a real screen, none got a catalog entry, and `GreetingHero` duplicated a pattern that already existed and was already catalogued (`Home Banner`). All 5 were deleted as dead code in the 2026-07-31 audit — read the full incident in the audit conversation if you need the details.

**Before writing a single line of a new component:**
1. **Search first.** Check the DS catalog (`NAV_SECTIONS` in `App.tsx`) AND the Figma file for anything that already covers this. A near-duplicate of an existing pattern is the #1 cause of orphaned code — it's cheaper to reuse or extend than to rebuild.
2. **Can it be composed** from existing `src/components/ui/` components inside the screen file itself? If yes, compose there — don't create a new component file at all.
3. **If it's a genuine gap:** it goes in `src/components/experimental/` with a `// DS-GAP:` comment (see "Experimental components" below) — **never directly in `ui/` or `layouts/`.** Only Michael promotes a component out of `experimental/`.

**A new component file is not "done" until both of these are true:**
- It is imported and rendered by at least one real screen — not just written and left sitting.
- It has a catalog entry (`NAV_SECTIONS` + `getSpec` in `App.tsx`) — unless it's intentionally experimental/unpromoted, in which case it belongs in `experimental/`, not `ui/`/`layouts/`.

If you ever find a component in `ui/` or `layouts/` with zero imports anywhere in the repo, that's a bug from a prior session — flag it for removal, don't leave it sitting.

## Breaking changes to a DS component — no deprecation period

While the DS has no external consumers, a breaking change to anything in `src/components/ui/` is applied **outright**: delete the old prop or export, and migrate every call site **in the same PR**. No compatibility shims, no props kept alive as deprecated, no two shapes for the same thing.

The reason is arithmetic, not taste — a component here has one or two consumers and zero real users, so a compatibility layer costs maintenance and buys nobody anything. It also means `tsc` is the migration checklist: if the build is green, there are no stragglers.

Consequences, all of them non-optional in the same PR:
- Update the component's `[COMPONENT]_SPEC` in `App.tsx` — a spec documenting a prop that no longer exists is the same defect as stale code.
- Update whatever CLAUDE.md says about it. This file instructing an API that was removed is worse than saying nothing.
- Say plainly in the PR description that the change is breaking, and which call sites moved.

This applies to PM prototypes in `src/screens/` too: normally they belong to their PM and aren't refactored unasked, but a screen that no longer compiles isn't a refactor — it's the other half of your own change, and it ships with it.

When the DS does get external consumers, this policy is the first thing to revisit.

## Syncing a DS component with Figma (new component, new variant, new tokens)

**Any time you're asked to add a component, add/update a variant, or bring a component's colors in line with the Figma DS file (`v6rmYKA2zmyXWOahlxLOeI`) — use the `/aims-ds-component [component] [Figma node ID]` skill (`.claude/commands/aims-ds-component.md`).** This applies even when the user doesn't type the slash command literally — phrases like "update the Chip with the new colors from Figma," "add the Error/Alert/Success variants," or "sync this component" all mean: follow that skill's 6-phase workflow (extract real token values from Figma via the plugin API → map to CSS variable names → write both the `:root/.dark` and `.light` blocks in `src/index.css` → implement the component with `cva` → update the `[COMPONENT]_SPEC` in `App.tsx` → visually verify against a Figma screenshot).

Do not improvise a different sync approach (no re-deriving colors from memory, no approximating a dark-mode value from a light-mode one — they frequently differ by more than opacity). The skill's anti-hallucination rules exist because every prior manual attempt without them introduced drift.

**Known state (2026-07-28):** `chip.tsx` only implements `primary | secondary | purple-primary | purple-secondary | light-blue-primary` — the Figma DS file now also has `error-primary/secondary`, `alert-primary/secondary`, and `success-primary/secondary` (added to Figma 2026-07-23/24, with dark-mode-specific contrast fixes documented in that file's own A11y notes). `light-blue-secondary` is also missing from this repo. Treat any of these as a real sync job, not a new design decision — the Figma side is already finalized.

### Example screens and DS documentation pages (`src/screens/`)

These rules apply to ALL files in `src/screens/` — both PM prototypes and DS component example screens:

- **NEVER build a custom component that replicates an existing DS component.** If `EntityList` exists, use it. If `CardContainer` exists, use it. Building a custom entity card, custom tab bar, custom filter row, etc. silently loses all DS behaviors: hover effects, AI insight sizing, token bindings, accessibility. The bugs are invisible until runtime.
- **Entity items** → always `CardContainer size="sm" className="!p-0 overflow-hidden"` + `EntityList items={[item]}`. Never a custom div that mimics the card layout.
- **Tabs** → never add `borderBottom` to the wrapper div. The `Tabs` component manages its own active indicator (2px span, active tab only). A container border creates a full-width line under ALL tabs — wrong per DS spec ("NO container border").
- **AI insight** → always use `EntityListItemData.aiInsight`. The DS component applies `self-start` when text < 80 chars (auto-width). A custom purple div always stretches full-width.
- **Spacing between nav layers** → always 24px. Tabs → Filters: `className="mb-[24px]"` on `<Tabs>`. Filters → EntityList: `marginTop: 24` or `mt-[24px]`. Never 8px, 16px, or 20px.
- **DS composition checklist before writing any JSX in a screen file:**
  1. Is there a DS component in `src/components/ui/` for what I need? → Use it.
  2. Can I compose the result from existing DS components? → Compose.
  3. Only if neither applies: use a plain HTML element with `var(--token)` colors and `// DS-GAP:` comment.

---

## GUARDRAILS — read this before generating any component or screen

These are the rules most often violated in AI-generated views. Scan this block every time before writing screen code.

### Tokens & components
- **NEVER** hardcode `#hex` / `rgba()` in `.tsx` — always `var(--token-name)`.
- **NEVER** build a custom version of a DS component that exists in `src/components/ui/` — import it.
- **NEVER** add `borderBottom` on a `<Tabs>` wrapper — the component manages its own active indicator.
- **NEVER add anything visual to a `CardContainer` that is not part of the component** — no accent stripes, no coloured top borders, no dividers bolted on. If the card needs to signal something, that is a `Tag`, a `Chip` or a colour variant, not a decoration drawn on top. Use `variant="default"` unless the design genuinely calls for a colour, `size="sm"` for small items (entity rows, selectable cards, items with a CTA inside a SlideOut or Modal), and `variant="dashed"` for empty regions.
- **`ModalDialog`'s `slot` wraps content in a grey surface (`--modal-slot-bg`) by default** — pass `slotUnstyled` for content that sits directly on the modal. A dialog never puts all of its content in one card; if cards are needed, one per item.
- **`Input`/`Textarea` have a `label` prop, but the floating label is mobile-only** — on desktop, structure comes from grouping fields under a section label, never a per-field label.
- **`Select` is a trigger only — it has no options list.** Pair it with the DS
  `Menu` positioned by `src/lib/dropdown-anchor.ts` (`anchorFromEvent` +
  `useDropdownPosition` + a click-catcher) — the same mechanism `Filters` uses.
  `pm-thomas-widget-builder.tsx`'s `OptionPicker` is the working reference; copy
  that shape rather than inventing a second one.

  **A base-ui Popover also works, and the DS publishes one — half of what
  this used to say was wrong.** Corrected 2026-09-10, by clicking the real
  thing on a deployed preview rather than trusting the note.

  The half that is true: `Popover.Trigger render={<Select/>}` cannot be built.
  `Select` renders a div and base-ui's Trigger has nowhere to attach.

  The half that was wrong: this claimed that anchoring a **wrapper** div
  instead made base-ui read the opening click as an outside click and dismiss
  the panel on the same tick. It does not. A wrapper div carrying the ref,
  with `open` controlled by the trigger's own `onClick`, opens and selects
  correctly — verified in a plain page, inside a `SlideOut`, and in `Header`'s
  `aux` slot. `PgInteractiveSelect` in `App.tsx` is that composition, it is
  live on the Create pattern page's own tour, and it works.

  So there are two sanctioned mechanisms, and the reason to prefer one is
  consistency, not breakage:

  | Mechanism | Use it for |
  |---|---|
  | `dropdown-anchor` + `Menu` | The default. Filter slots, kebab menus, anything a screen positions itself |
  | wrapper-anchored base-ui `Popover` | A `Select`'s own option list, where Floating UI's collision handling is worth the second mechanism |

  **Why the wrong half is worth this much text:** a rule that forbids what the
  DS itself publishes does not stop anyone — it sends them to the published
  example, and then the review argues with them for copying it. That is
  exactly what happened on PR #127. If a note says something is broken, the
  cost of checking is one click; pay it before writing the note.

  If the option list is short and the labels are brief, a `Chip` row is often the
  better answer than any dropdown — no menu, no positioning, and the choices stay
  visible.

### Surfaces, tiles and hovers — the four the audit now catches

These are checks 15-18. They are written down here too because a check tells you
*that* something is wrong; only this says why.

- **A tinted square with an icon in it is `HighlightIcon`**, not a `<div>` with a
  width, a height, a radius and a background. The component owns three sizes and
  nine semantic tints, which is what keeps an entity type the same colour in a
  card, a list row and a slide-out. An icon-only `<button>` is a different thing
  and stays a `<button>`.
- **A card title has no fill.** A background strip above a divider is the
  table-header device: it means "these words are column names". On a card it
  means nothing and makes one card read as two stacked surfaces. Keep the
  divider, drop the fill. Real table headers keep theirs.
- **`var(--accent)` is not a hover.** It is a blue tint (`#2b7fff14`); on a row
  it reads as *selected*, not as *your pointer is here*. Use
  **`--el-row-hover`** for list rows and **`--table-row-hover-bg`** for table
  rows.
- **A `CardContainer` wrapping a table must not glow.** The card's hover shadow
  fires from anywhere in the table, which says the whole table is clickable. The
  rows own the hover; cancel the card's:
  `hover:!border-[length:0.5px] hover:!border-[color:var(--card-default-border)] hover:![box-shadow:none]`.
- **`SlideOut` already pads its panel `32px / 24px`.** A preview component that
  adds another `20-24px` lands its content at 44-48px from the panel edge. Pass
  **zero horizontal padding** in anything rendered as a `SlideOut` child and let
  the component own the margin. Each half looks correct alone, which is why this
  one survived in three previews for months.
- **A scroll container clips its children's hover glow flat — move the clip
  boundary, never shrink the card.** `CardContainer`'s dark hover shadow paints
  *outside* the card (`0 0 4px 1px` white/40 plus `0 0 14px` white/15), and in a
  350px `SlideOut` the content column is 302px — exactly the card's width. The
  halo lands on the scroller's edge and is sliced off vertically on both sides.

  The fix is **padding plus an equal negative margin** on the scroller: a scroll
  container clips at its *padding box*, so the boundary moves out while the
  content box, the card's width and the card's own padding all stay put.
  `ScrollArea` does this by default via `crossAxisClipMargin` (16px); apply the
  same two properties to any other scroller in the path.

  ```tsx
  <div style={{ flex: 1, overflowY: "auto", paddingInline: 16, marginInline: -16 }}>
  ```

  **`overflow-x: clip` + `overflow-clip-margin` is the obvious answer and does
  not work** — measured in Chrome, `clip` on one axis beside `auto` on the other
  computes back to `hidden`, and the clip margin then applies to nothing.
  `overflow-x: visible` is coerced to `auto` for the same reason and adds a
  horizontal scrollbar. Do not re-try either.

  This is the one sanctioned exception to "zero horizontal padding inside a
  `SlideOut` child" above: it is net zero, so content still lands at 24px.

- **Per-studio permission counts are `PermissionsBreakdown`** (local to
  `PeopleAccessMembers.tsx`, built from `studioPermRows`). One card per studio:
  chevron, label in `--color-text-title`, the count as a `Tag` in the studio's
  variant, a bar in its `--hi-*-icon` colour, and on expand the actual
  permission names from `PERM_TREE`. It is used by the role preview, the member
  preview's Permissions tab and anywhere else this data appears — a bar that
  only says "6" cannot be acted on, and three screens drawing it three ways is
  how the studio colours drifted apart.

  A studio's identity colour comes from its `HighlightIcon` or its `Tag`, never
  a raw hex dot. A studio *toggle* is selected/unselected, so it is a `Chip`.

- **A status is a `Tag`; a `Chip` is something you can select.** `Chip` is for
  selected/unselected: a filter, a scope toggle, a category switch. An entity's
  state is a `Tag`. Reaching for `Chip` because it looked right is how "Active"
  ended up as a `success-secondary` chip beside real tags.
- **An icon-only control needs a `Tooltip`**, always. It has no label; `title`
  is not a substitute — it is slow, unstyled and invisible to touch.

### Navigation & headers
- **NEVER** show `tag` on a list-view `Header` — only on a detail-view Header (single item, one state).
- **NEVER** combine `Header.breadcrumb` and `backButton` — one affordance, and the depth decides which: **L2 is `backButton` with the PARENT's name as the title; L3+ is the breadcrumb.** `backButton` also covers pages with no hierarchy to express at all (a creation wizard).
- **NEVER** use `WidgetCanvasSection` or a hand-rolled grid for Overview tabs — always `WidgetCanvasView`.
- **NEVER** pass the `label` prop to `Input` or `Textarea` in desktop screen files.

### Buttons & overlays
- **NEVER** use `variant="main"` inside a widget, card, SlideOut, or modal — use `primary`. One named exception: `EntityHeader`'s AI agent trigger — see the Button hierarchy rules below.
- **NEVER** open a `ModalDialog` for non-blocking or non-destructive content — use `SlideOut`.
- **NEVER** show a filter chip before the user clicks Apply.

### Header slots — where a control goes

`Header` has four slots on its right side, rendered in this order: `aux`, the
overflow menu, `secondaryAction`, `primaryAction`. Picking the wrong one is how
five screens ended up rendering a loose row underneath the Header instead.

| What it is | Slot |
|---|---|
| The page's one main action | `primaryAction` — an action object, never a `Button` |
| A second action, same nature | `secondaryAction` — same shape |
| Destructive or secondary actions that should not be one click away | `overflowActions` — an array; Header renders and anchors the `•••` menu |
| A control that is not an action: a notification bell, an inline rename, a saved-at indicator, a split button | `aux` — a `ReactNode`, because the DS has no component for these and pretending otherwise would be worse |

`aux` is not a loophole for a CTA. If it is the page's main action it belongs in
`primaryAction`, which exists precisely so no screen writes `variant="main"`.

Anything destructive goes in `overflowActions`, not `primaryAction` — an
overflow menu is the one place a Delete is not a stray click away.

### 3-dot context menu (kebab `•••`)
- Global default actions: **Archive** + **Duplicate** — always in that order, always present unless the entity type explicitly excludes them.
- **Delete** is context-dependent — only include it when the entity type supports deletion. It is NOT a global default.
- Any additional actions depend on the specific entity type.
- ALWAYS use the **icon + text** menu-item variant, **size S** — no icon-only, no size M or L.
- Never add actions that are not defined for the entity type in DS documentation.

### Sidebar sub-navigation
Two behaviors — choose based on the sidebar's current collapse state:

| Sidebar state | Sub-item behavior |
|---|---|
| **Collapsed** (56px, icon-only) | Active item with sub-items → **fly-out popup** appears to the RIGHT of the sidebar (~260px wide, dark surface), showing sub-items as `Menu-items` components |
| **Expanded** (250px, with labels) | Active item with sub-items → sub-items **expand inline below the parent**, indented, each with their own icon + label as `Menu-items` components. A `›` chevron on the parent indicates it has sub-items |

Toggle button at the top of the sidebar switches states. Tooltip: **"Expand"** (when collapsed) / **"Collapse"** (when expanded).
Figma reference: node `8602-48775` in the DS file (`v6rmYKA2zmyXWOahlxLOeI`).

### SlideOut content composition
A dedicated composition guide is **pending** — patterns will be extracted from the Agentic Workflow Builder Nodes Configuration section and documented in a new DS page.

Until that page ships:
- Use `SlideOut` as the container — never a custom overlay `div`.
- For entity detail content: header with entity name + status tag → primary action buttons → metadata fields → related items list.
- Flag edge cases with `// DS-GAP: SlideOut content pattern — pending composition guide`.

### Entity click behavior
Two distinct interactions — never conflate them:
- **Card click** (anywhere on the entity row/card) → always **navigates to the full detail view** for that entity (full-page or section transition). Never opens a SlideOut.
- **Eye button (preview)** → always opens a `SlideOut` with a lightweight preview. Only render the Eye button when preview content is available for that entity. If there is nothing to preview, **omit the button entirely** — do not show a disabled Eye.

```tsx
// ✅ Eye shown only when preview data exists
actions={[
  ...(hasPreview ? [{ icon: "Eye", onClick: () => setPreviewId(item.id) }] : []),
]}

// ❌ Eye always present (wrong when no preview content)
actions={[{ icon: "Eye", onClick: () => {} }]}
```

### Entity Header — entity profile header
Use `EntityHeader` (`src/components/ui/entity-header.tsx`) atop any dashboard view that summarizes a **single** record — never for lists (use `EntityList`) and never as the page-level title bar (that's still `Header`; EntityHeader sits inside the content area, typically the Overview tab).

**There are no variants.** The component models no entity types at all — Employee, Customer, Vendor, Patient, Borrower, anything the host defines tomorrow all use the same shape. Never look for a `variant` prop, never flag a missing one as a DS-GAP: an entity type the DS has never heard of is the normal case, not a gap.

**There is no `entityType` prop either.** What kind of thing this is arrives as a **classification tag**, and only when the visual is an avatar — a highlight icon already names the type.

| Prop | Where | Shape |
|---|---|---|
| `name` | Identity | `string` — required |
| `visual` | Identity | `{ kind: "avatar" }` or `{ kind: "icon", icon, variant? }` — **required, exactly one** |
| `source?` | Identity | `string` — which system the record came from. **One item, never two** |
| `tags?` | Identity | `EntityHeaderTag[]` — signals + classification, **up to 3 visible + `+N`, fitted to the row**. Pass all of them; the count is the component's job |
| `stateBadge?` | Identity, right | `{ label, variant, icon? }` — **exactly one**, full semantic range |
| `showInformation?` | Identity, right | `boolean` — shows the ⓘ trigger |
| `secondaryAction?` | Identity, right | `EntityHeaderAction` — **off by default** |
| `assignedAgent` | Identity, right | `AssignedAgent \| null` — required as a prop. This is `Ask` |
| `menuActions?` | Identity, right | `EntityHeaderAction[]` — destructive and secondary only |
| `description?` | below Identity | `string` — durable context, **off unless passed** |
| `secondaryMetadata?` | below Identity | `SecondaryMetadataItem[]` — the attribute row, **capped at 6** |
| `recordFields?` | — | `RecordField[]` — consumed by the host's Information panel, not rendered here |
| `state?` | whole card | `"default" \| "loading" \| "restricted"` — Figma's `Property 1` axis |
| `compressOnScroll?` | whole card | `boolean` — **off by default.** Sticks the card and compresses it on scroll down |

**`state` is Figma's `Property 1` axis, and it is independent of the reflow** — an entity can be loading on a tablet, which is why it is one enum and not three booleans.
- **`loading`** renders a skeleton matching the CURRENT layout (it stacks below 720px exactly as the loaded card does). Pass it while the entity's data is in flight — **never render an empty header, and never withhold the card until data arrives.** Figma's reason: saying "nothing here" while data is in flight states something untrue.
- **`restricted`** renders the card at 50% opacity plus a neutral `Restricted` tag beside the title, with the reason in a tooltip on hover and on focus. The viewer lacks entitlement to the values; the entity exists and is governed, so **this must never read as an error.** The tag goes beyond Figma's own variant on purpose — opacity alone cannot be told apart from loading or failed. It is a separate thing from `locked` ("you cannot edit" vs "you cannot see") and both can be true at once. `RecordField.state === "masked"` is the same idea applied to one field.
- **`Minimum`, Figma's fourth named state, needs no value** — "only visual, title and state" is what you get by passing only those props.

**`compressOnScroll` sticks the card and compresses it as the reader scrolls down** (Michael, 2026-09-09). On the way down the `secondaryMetadata` row and the `description` drop and the visual goes one size down, L to M. **Scrolling back up restores all three at once**, and at the top the card is always whole — nobody who has returned to the top of a record should be looking at a reduced header.
- **Scroll direction, never hover.** A header that grows when the cursor passes over it fires by accident and pushes down the content the reader is mid-sentence in; hover exists neither on a tablet nor for a keyboard. Direction is also what `ScreenLayout` already computes for the page `Header`'s compress, so the two agree instead of competing.
- **Identity never compresses.** Name, visual, source, tags, state badge and the entire right-hand cluster are untouched. It is the second row that goes, never the first.
- **One prop, not two.** Sticky and compressed are inseparable — compressing a card that scrolls out of view anyway does nothing — so they are bound together and a caller cannot wire half of it.
- **`ScreenLayout` decides which element scrolls, and the card asks it** (2026-09-10). The layout publishes its scroll position through `PageScrollContext` (`src/lib/page-scroll.ts`) and `EntityHeader` subscribes. **Do not try to work the scroller out from a component**: a screen holds several — the sidebar, a canvas widget's body, a side panel — and the ones parked at zero overwrite the one that moved, which is why the card would not stay compressed in UCP. A card outside any `ScreenLayout` falls back to its own listener, which is sound only because a DS documentation page is one stage with one scroller.
- **It works whether the card scrolls with the content or the screen pins it.** Thom's UCP profile puts the `EntityHeader` in `ScreenLayout`'s header zone, outside the scroll container; it compresses the same way, and the component skips its own sticky because the host already pinned it.
- **Turn it on for a record page whose content scrolls under the header** — a detail view's Overview tab. **Never in a `SlideOut`, a modal or a widget:** none of them has a long scroll to reclaim room from, and a card that sticks inside a panel just eats the panel.

**Dropping is the last resort, and only two slots ever get dropped** — the `description` below 420px of card width, then the `secondaryMetadata` row below 320px. `visual`, `name` and `stateBadge` are never dropped at any width. **The order is reversed from Figma deliberately** (Michael, 2026-09-07): metadata carries the facts someone might act on, the description is the edge case for extra granularity when metadata is not enough, so the description goes first.

**Nine tab stops, six when nothing is truncated.** Tags and secondary metadata are each **one** stop with a roving tabindex — Tab enters the group, arrows move inside, Tab leaves. One stop per item would mean tabbing through every tag and every metadata item to get past the header. The title and description are stops only when they overflow. This is inside the component; a caller cannot break it, but do not wrap its slots in your own focusable elements.

**The right-hand cluster has a fixed order:** ⓘ Information → state badge → secondary action → `Ask` → `···` menu. That side is fixed and never compressed; the left side is what yields.

**`visual` — avatar for companies, people and groups. Icon for everything else** (objects, assets, processes, transactions, documents). Exactly one renders, never both, never neither.
- **Initials are never derived from a code.** `RO-48291` has no initials, so a code-titled record can only be an icon.
- A site inherits its parent company's brand — it does not get its own mark.
- The icon's colour is assigned per entity **type** and stays the same everywhere in the product.
- The rule is about the entity, not about whether the asset exists: a company with no logo still uses an avatar, falling back to initials.

**Three tag roles, two colour rules.** The vocabulary belongs to the tenant; the colour belongs to the platform.

| Role | What it is | How many | Colour |
|---|---|---|---|
| **State** | The entity's overall status — `stateBadge`, its own slot on the right | Exactly one | **Full semantic range.** `Active` → success, `Degraded` → alert, `Blocked`/`Suspended` → **error** |
| **Signal** | Needs attention, bounded in time or condition | Zero or many | **`error` or `alert` only** — or neutral |
| **Classification** | What kind of thing this is. **Only when the visual is an avatar** | Zero or one | **Never coloured.** The component strips any tone you pass |

- **The test for a left tag is not its role — it is whether someone has to do something about it.** If yes, colour. If no, neutral. `Renews in 52d` is a signal and stays neutral: 52 days out, nobody has to act.
- **Order:** signals first, sorted by severity, then classification. The component does this — pass them in any order.
- **How many are visible is MEASURED, not fixed** (Michael, 2026-09-09). `ENTITY_HEADER_TAGS_MAX` is 3 and it is a **ceiling**: the component gives the title everything it wants up to its 540px limit, subtracts the source and any `Locked`/`Restricted` tag, and fits as many chips as the remainder holds — 3 beside a short code, 2 beside a long name, 1 when the row is tight. Figma does the same; its edge cases render 3, 2 and 2. **Never assume a number at the call site.**
- **Pass every tag the entity has.** Trimming the array yourself is the one way to break this — the component cannot show a tag it was not given, and the `+N` Tooltip is what makes hiding acceptable in the first place: nothing is lost, only moved.
- **The classification keeps the last visible slot** whenever the entity has one, so the visible tags answer two different questions — what needs attention most, and what kind of thing this is. A signal still takes the first slot. Read off Figma's own instances, which never let signals take every slot.
- **If several statuses are true at once, the most blocking one wins** and the rest become signals. The component renders the one badge it is given.
- **Not a tag at all:** anything true of every entity in the platform — `Entity`, `Governed`, `Manufacturing`, `Automotive`. That is noise. It belongs in secondary metadata or nowhere.

**The title yields last.** `flex: 0 1 auto` with `min-width: 0` and a 540px ceiling — it takes whatever the row has left after visual, source, collapsed tags and actions, and truncates only there. **A title cut short with empty space beside it is a bug, not a rule.** Order of yielding: tags collapse to `+N` first, then source, and only then does the title truncate. Nothing wraps and nothing abbreviates — an ellipsis tells the reader there is more, an abbreviation looks like the real value and misleads.

**`Ask` is one word, and it is the primary CTA.** There is no second one — the labelled CTA that used to sit beside it is gone. It keeps the same Sparkle glyph as the Next Best Action card: **that sharing is deliberate** (Michael, 2026-09-07). Both are AI surfaces and the shared mark is what says so; one converses, the other transacts. Figma's prose argues they should differ, but Figma's own component instances share the glyph — do not "fix" this.

**There is no disclosure and there are no zones.** `agenticSystem`, `intervention` and the chevron that revealed them are **gone** — none of them exists in the Figma Entity Header, and that content belongs to Overview widgets. This card is a fixed arrangement of slots. If you find yourself wanting to hide something behind a chevron here, it belongs on the page, not in the header.

**`recordFields` is a flat array the caller builds — there is no per-entity field list inside the component.** Each `RecordField` is `{ label, icon, provenance, state, value, maskedValue?, hasDestination? }`:
- `provenance` is mandatory on every field (`{ system, systemAbbr, modelVersion, syncedAgo }`) — a field with no visible origin is not renderable by design.
- `state: "hydrated" | "masked"` is the same field in two entitlement states, not two field types. The component renders whichever it is given; it never resolves permissions itself.
- `hasDestination: false` for a plain descriptive fact with nothing further to show (a pure date, a pure figure) — it renders as static text, no chevron.

**`assignedAgent` is required as a prop, but the value may be `null`** — AIMS OS is agent-first, so every caller must decide; `null` renders the same button, disabled, with a Tooltip explaining why. Never a silently missing button. Renders as an always-present, most-prominent (icon-only, `variant="main"`) button using the Topbar's own `Sparkle` glyph (the single 4-point one, not the 3-star `Sparkles`). This is the one confirmed exception to "never `main` inside a card" (see Button hierarchy rules below) — don't extend that exception to any other button in this file.

**The Next Best Action card is NOT part of this component.** It is `NextBestActionCard` from `@/components/experimental/next-best-action-card`, rendered as a **sibling below** the header in its own `CardContainer`. Two records, two containers. Passing recommendations into the header is the single most common mistake with this card, so the prop does not exist to be misused.

**NO INSIGHT SECTION.** System interpretation reaches this header only as a tag with a tooltip — never a descriptive sentence, never a score with drivers, never an expandable analysis. Anything larger lives in the Overview, where the NBA widget carries recommendations and reasoning.

**`NextBestActionCard` takes ONE recommendation, not an array.** The prop is `item?: NextBestAction` — `{ id, title, timeAgo?, description, onViewDetails, onAccept?, onDismiss? }`. Figma's rule 2 is *one at a time, it never stacks*: the engine has already prioritised, unified and discarded, so showing several is not trusting the engine. The prop is singular precisely so that rule is structural rather than a convention someone has to remember — an array plus a `.map` is how this card rendered two recommendations in one container for three separate passes.

- **No `severity`, no `dueContext`, no `aiGenerated`, no `actionLabel`, no colours.** Timing and urgency live in the copy (`description`), never in a token — the Entity Header's state badge and signal tags are the platform's urgency channel, and a card that colours itself competes with them.
- **Omit `item` (or pass `undefined`) for an entity with nothing to recommend.** Nothing renders at all — not an empty card, not a placeholder, not a "nothing to recommend" message. Never synthesize a filler recommendation.
- **`onViewDetails` is the default path and always present.** The card cannot guarantee it showed everything, so the safe route is always the one that opens the record.
- **`onAccept` is a reserved variant — leave it off.** Which actions qualify is not decided in Figma yet. When it is used: accepting **assigns to the agent, it never executes** (the agent executes, the human governs — never "Call now") and it still opens the detail first. There is no inline accept anywhere in this component.
- **`onDismiss` resolves in place** — it hides the card for this session only, returns on reload, stores nothing and feeds nothing back to the engine. Wire it unless there is a reason not to; a card with no dismiss is one the user cannot get out of their way.

Full rules, character limits and the four detail-panel action families: the Next Best Action Card spec (Entity Header page → Reference tab → *View DS spec*), sourced from Figma node `20206:316306`.

**`source` answers one question: which system this record came from.** Workday, Salesforce, NetSuite, DMS, Helix Data Studio. **One item, never two** — a source is a single fact, and concatenating a second value breaks it: "Enterprise Account · Midwest Region" is a category next to a location, and neither is a source. A job title, a location, a region, a category or a parent company *describe* or *place* the entity; they do not say where the data came from, so they go in tags or `secondaryMetadata`, or nowhere. An entity created inside the platform itself reads "Helix Data Studio". An entity with no source **omits the prop** — the slot is removed, never filled with something else.

**`description` is off unless you pass it, and it is the last resort.** Ask in this order and stop at the first yes:

1. Needs attention right now → signal tag
2. What kind of thing this is → classification tag
3. The current status → `stateBadge`
4. A fact someone might act on → `secondaryMetadata`
5. Durable context none of the above captured → `description`

The one case that justifies it is **an opaque code as the title**: `RO-48291` alone means nothing, so the description says what the record concerns. **Durability test** — if the sentence could change next week it is an activity note and belongs in the Overview, not here. It says what the entity IS, never what is happening to it. One line, truncated with a Tooltip, never wrapped.

**`secondaryMetadata` caps at 6 — enforced by the component, not by trusting the caller.** Six is the maximum, not the goal: **aim for four.** Past six it stops being a row and becomes a section.
- **Anything beyond six goes to the Overview, never to a `+N` chip.** An item hidden behind a counter is not discovered, and if it was worth showing it is worth having a place.
- **The icon never appears alone.** `EntityList` allows icon-only under space pressure; this header does not — it has the width, and a bare symbol forces the reader to interpret it.
- **The tooltip is required and always shows** — on hover and on focus, even when the text is not truncated. It carries the field label plus context: `"Assigned agent · Manager Agent. Handling this account since Mar 3."`
- **What qualifies:** something a person could act on, or something governance requires be visible — counts of Truth Plane facts and Canon Plane documents (counted *separately*: a document is not a fact, and TR outranks CR), open workflows, the assigned agent tier, access role, tenure, a Bridge ID where policy permits.
- **What does not:** anything true of every entity of the same type — that is a label, not information — and anything describing a conversation rather than the entity.
- **`secondaryMetadata` is not `recordFields`.** RECORD fields carry provenance and a masking state and are reached through the "About this record" trigger; secondary metadata is display-only and always visible. Both exist at once — never fold one into the other.

**Never repeat a value across slots.** If it appears in `source`, it does not also appear in `description` or as a tag.

**Fallback copy comes from `ENTITY_HEADER_FALLBACKS`** — never write fallback strings inline at the call site.

**Zone click destinations** — same framework as Entity click behavior above:
- Several items to review one by one before deciding → `SlideOut`
- A risk/health state to investigate, with evidence to show first → `SlideOut`
- One immediate, reversible-by-Cancel decision → `ModalDialog`
- Never Full Navigation from inside the card — EntityHeader already lives on that record's own page.

### Empty states
**ALWAYS** use `EmptyState` from `src/components/ui/empty-state.tsx` when a view, section, or search has no content to display. **NEVER** hardcode a custom div, illustration, or message — custom empty states break visual consistency and are invisible to the DS.

Show `EmptyState` in every zero-result scenario:
- **Filtered empty** — active filters or search return 0 results → title: "No [entities] found", CTA: "Clear filters"
- **Global search empty** — global search returns 0 matches → title: "No results for '[query]'"
- **Page empty** — the list has no records yet (first visit or truly empty) → title: "No [entities] yet", CTA: "Create your first [entity]"

Key rules:
- Always set `title` (required) and `description` (recommended).
- Add `ctaLabel` + `onCta` only when there is a clear next action — do not add a CTA just to have one.
- Override `icon` with a semantic Lucide icon matching the entity type (`Bot` for Workers, `Zap` for Automations, etc.). Default is `Inbox`.
- **Never show `EmptyState` and `Pagination` at the same time** — if count is 0, pagination must be hidden.

---

## Before generating any screen

1. Check `src/components/ui/` for an existing component that fits.
2. If a Figma node URL is given, fetch it via the Figma MCP server before writing a single line of code.
3. If something needed doesn't exist as a component, build the screen with what exists and FLAG the gap in a `// GAP:` comment — do not improvise a new component silently.

---

## Pattern composition — how to assemble views

Use established patterns from `src/App.tsx` as templates. Never compose from scratch.

### List View screens
Stack in this exact order:
1. `Topbar` — top navigation bar
2. `Sidebar` — left nav (use `AppBackground` as page wrapper)
3. Content area:
   - `Tabs` — "Where am I?" (e.g. All Workers / Teams)
   - `SwitchTab` — secondary navigation, one level below Tabs — only when Tabs alone is not enough
   - `Filters` — "What do I see?" (always present when there's a filterable dataset)
   - `EntityList` inside `CardContainer` — one card per item, 12px gap
   - `Pagination` — only when `total_results > rows_per_page`

**HighlightCard**: ALWAYS use `style="default"` (or omit the prop entirely — default is neutral). NEVER use colored styles (`primary-bg`, `green-bg`, `orange-bg`, etc.) — those are deprecated. Color differentiation goes only in the `iconName` and `feedbackType` props.

Entity items must include actions in this order: **primary → secondary → tertiary (Eye/preview)**.
The Eye icon belongs ONLY in the tertiary action (`icon: "Eye"`). Never use `iconName: "Eye"` as the leading icon of an entity item — use a semantic icon (Bot, User, FileText, etc.) that represents the entity type.

**Entity click vs Eye button — two separate interactions:**
- **Card click** → always navigates to the full detail view for that entity. Never opens a SlideOut.
- **Eye button** → opens a `SlideOut` preview. Render the Eye button ONLY when preview content exists for that entity. Omit it entirely when there is nothing to preview — never show a disabled Eye.

If the filtered or unfiltered entity list is empty, replace the list with `EmptyState` (see Empty States below). Never render an empty `EntityList`.

Use `ListViewSection` from `src/components/layouts/list-view-section.tsx` to get this structure pre-wired.

### Detail page layout (entity detail — full screen)
Every entity detail page follows this structure — tabs always in this order:

1. **Overview** → always `WidgetCanvasView`. Never a hand-rolled widget grid. (See Overview tabs rule.)
2. **[Entity-specific tabs]** → vary by entity type (e.g. Runs, Members, Triggers, Settings). Content defined per entity.
3. **Logs** → always the `Table` component following the Logs Table pattern. (See PatternLogsPage.)

Header rules on detail pages:
- **A detail page reached from its list is L2**, so it carries `backButton` and its `title` is the PARENT's name — not the record's. `breadcrumb` starts at L3. See *Navigation depth* below; never both.
- Show the status `tag` — detail view = one entity, one state. **Unless an `EntityHeader` is on the page:** it carries the state badge, and the bar above it must not repeat it.
- Primary action in `Header.primaryAction` — an **action object**, not a `Button`: `{ label, icon?, onClick?, disabled?, priority? }`. Header picks the variant, so a screen never names one. **Again, unless an `EntityHeader` is on the page** — then the record's actions belong to that card and the bar carries none.

```tsx
// ✅ L2 detail page, no EntityHeader — the bar carries the record
<Header
  title="Workers"                                   // the PARENT
  backButton
  onBack={go}
  tag={<Tag variant="success" size="s">Active</Tag>}
  size={isScrolled ? "compress" : "size-l"}
  primaryAction={{ label: "Edit", icon: Pencil }}
/>

// ✅ L2 detail page WITH an EntityHeader — the bar carries navigation only
<Header
  title="Workers"
  backButton
  onBack={go}
  size={isScrolled ? "compress" : "size-l"}
/>
<Tabs items={[
  { id: "overview", label: "Overview" },   // always first
  { id: "runs",     label: "Runs"     },   // entity-specific
  { id: "logs",     label: "Logs"     },   // always last
]} />

// Overview tab → WidgetCanvasView
// Logs tab     → Table + Filters + Pagination (PatternLogsPage)
```

### SwitchTab — when to show it
Default view in all list views is **entity cards** (`EntityList`). The `SwitchTab` component is **not shown by default**.

Only add `SwitchTab` when the use case explicitly requires an alternative view. If shown:
- `List` option → `EntityList` inside `CardContainer` (default)
- `Table` option → DS `Table` component rendering the same dataset with the same columns

**NEVER** hand-roll a custom grid or table when SwitchTab is active — always use the DS `Table` component for the table option. Filters and Pagination stay the same regardless of the active view.

### Filter system
Three layers — always compose in this order:
1. **Visible Filters** (`Filters` component) — always shown
2. **All Filters button** → opens `FiltersSlideout`
3. **Applied chips** (`Tag` or `Chip`) — appear below filters after Apply, show active state

**The `Filters` bar owns its own menus.** Both the filter chips and the sort label render and position their dropdown themselves — pass `slots[].options` + `onSelect` for a chip, and `sortOptions` + `onSortSelect` + `sortDirection`/`onSortDirectionChange` for sort. **Never hand-roll a `Menu` + `dropdown-anchor` next to a `Filters` bar, and never fall back to a raw `<select>`.** The `onOpen` / `onSortClick` props remain only as the escape hatch for a genuinely custom menu.

Rules:
- Closing `FiltersSlideout` without Apply discards draft state; list does not change.
- Apply → sync draft to applied → reset pagination to page 1 → close slideout.
- Chips are optional; the system works without them.

### Navigation depth (multiple layers)
Maximum 2 navigation layers:
- `Tabs` — primary navigation (Where am I?)
- `SwitchTab` — secondary navigation, one level below Tabs
- `Filters` — dataset control (What do I see?)

**24px gap between every navigation layer** — Tabs → SwitchTab → Filters → Chips (nav). Confirmed from Figma DS node 14660-136237.
24px gap from the last nav element to the first entity card. 12px gap between entity cards.

### Navigation depth — back at L2, breadcrumb from L3

**L2 keeps the `Header` with a `backButton`, and its title names the PARENT. The breadcrumb starts at L3.**

Revised by Michael, 2026-09-09. The previous version of this rule said the opposite — breadcrumb from L2 onwards, never a back arrow — and the reasoning it gave is worth keeping, because it is what makes the revision correct rather than a reversal.

Back and breadcrumb answer different questions. Back is *chronological* ("where did I come from"), breadcrumb is *hierarchical* ("where am I"), and **that distinction only earns its keep from L3**, where "up one level" and "back" are genuinely different destinations. **At L2 they are the same place.** So at L2 you should show one affordance, not two — the only question is which.

The old rule picked the crumb, on the grounds that a bare arrow does not say where it goes while a crumb is labelled. **That argument assumed the `Header` title was the RECORD's name**, which left the arrow orphaned beside it. It no longer holds, because at L2 the title names the parent:

```
← Universal Profiles
```

The arrow is now labelled by the text beside it. And where an `EntityHeader` is on the page, this is the only version that does not duplicate: the record's name, state and actions belong to that card, and a crumb naming the record would put its name back in the bar the card sits under.

| Depth | Pattern |
|---|---|
| L1 (a list, a home) | No breadcrumb, no back. `Breadcrumb` renders nothing below `depth={2}` anyway |
| **L2** | `Header` with `backButton`, and **`title` = the parent's name** — the list you came from. No `tag`. No CTAs when an `EntityHeader` carries them |
| **L3+** | `Breadcrumb` in `Header.breadcrumb` — **parent plus current page only**, not the whole path |

```tsx
// L2 — a record's detail page, under an EntityHeader
<Header
  size={isScrolled ? "compress" : "size-l"}
  backButton
  onBack={onBack}
  title="Universal Profiles"   // the PARENT, never the record
/>

// L3 — something inside that record
import { Breadcrumb } from "@/components/ui/breadcrumb"

<Header
  size={isScrolled ? "compress" : "size-l"}
  title="Q3 Compliance Check"
  breadcrumb={
    <Breadcrumb
      depth={3}
      items={[{ label: "Universal Profiles", href: "profiles" }, { label: "Meridian Corp", href: "meridian" }, { label: "Q3 Compliance Check" }]}
      onNavigate={go}
    />
  }
/>
```

**At L2 the title must name the parent, not the record.** This is the whole condition the rule rests on. Name the record there and the arrow loses its label AND the identity is duplicated — both failures at once, which is exactly the state the Universal Profile was in before 2026-09-09.

`Breadcrumb` lives at `src/components/ui/breadcrumb.tsx` — **import it, never hand-roll one.** Ancestors carry `href`; the current page does not.

**What happens on scroll at L3.** The breadcrumb and the tag both survive compress, stacked above the title:

```
size-l    Universal Profiles › Meridian Corp    ← breadcrumb
          Q3 Compliance Check  [Passed]         ← title + tag
          Ran 10 Aug … (description)            ← hidden in compress

compress  Universal Profiles › Meridian Corp    ← still there
          Q3 Compliance Check  [Passed]         ← still there
```

Compress is **content-driven, not a fixed 60px** — about 48px normally, about 62px with a breadcrumb. That is deliberate: scrolling should never cost you your place in the hierarchy or the record's status. The 4px between the two rows is what keeps them reading as *path + page* instead of one wrapped title.

**Never combine `breadcrumb` and `backButton`.** That has not changed — it is still one affordance or the other, and now the depth decides which. `backButton` also remains for pages with no hierarchy to express at all — a creation wizard, a standalone flow — where there is a "back" but no "up".

**When an `EntityHeader` is on the page, the bar above it carries navigation ONLY** — no `tag`, and no CTAs the card already shows. Identity, state and actions belong to the card; where you are and how to leave belong to the bar. Two identity blocks stacked on one screen is not a hierarchy, it is a duplicate.

### Panel overlays — PM component selection guide

The general `ModalDialog` vs. `SlideOut` question — and the multi-step-form case specifically — are now answered by the Create pattern section below, not here: `ModalDialog` when the user can't ignore the task and keep working, `SlideOut` when they can; a multi-step **create** flow follows Create's own staged-flows table (2 stages, no branching → `SlideOut`; 3+ or any branching → dedicated view + `Stepper`). This section covers the rest of panel selection — which is still `SlideOut` vs. `SidePanel`, a distinct axis that belongs to **Configure**, not Create (a `SidePanel` never appears in a Create flow — see the Create pattern's Gate 0).

**Which panel component to use:**

| Context | Component | Why |
|---|---|---|
| Entity detail preview from a list (Eye button) | `SlideOut` | Overlay on top of the list — user browses back quickly |
| Node / item configuration within a canvas or builder | `SidePanel` | Inline with the canvas — no backdrop, user sees context while editing |
| Filters panel (full filter set) | `FiltersSlideout` | Its own dedicated component (checked directly — it doesn't wrap `SlideOut`), always overlays list |

**SlideOut — which `type` to use.** Only 2 values exist on the real component (checked directly against `slide-out.tsx` — `"filters"` and `"default"` are NOT valid `SlideOutType` values; filters use the separate `FiltersSlideout` component above instead):

| Use case | `type` prop | Notes |
|---|---|---|
| Entity preview (name, status, key metrics, AI summary, recent runs) | `"with-variants"` | Add `showTabs` when content splits into Overview / History / Config |
| Generic content — a form, a Create flow, anything without an entity header | `"full-slot"` | No built-in header, tabs or chips — compose those inside `children`. It **does** get the CTA footer, but only once `onCtaPrimary` is wired (see below) |

**SlideOut — mandatory props for `type="with-variants"` (entity detail):**

```tsx
<SlideOut
  open={open}
  onClose={onClose}
  type="with-variants"
  size="m"                          // default — always start with "m" (350px)
  title="Entity Name"               // required
  subtitle="Category · Subcategory" // required (format: "Type · Category")
  statusLabel="Active"              // required — entity current status
  showIcon                          // required — entity icon circle
  showStatus                        // required — status badge
  showTabs={hasSections}            // true when content splits into tabs
  tabLabels={["Overview", "History", "Config"]}  // always exactly 3 strings
  activeTab={tab}
  onTabChange={setTab}
  showSearchBar={false}
  showChips={false}
  showCta={needsCta}                // true only when panel has a Save/Cancel action
>
  {slotContent}
</SlideOut>
```

**The panel's main action goes in the CTA footer — never a `Button` under the title.**
`showCta` renders the footer for `with-variants` always, and for `full-slot`
**once `onCtaPrimary` is wired** (a full-slot panel has no DS-default footer to
show, so it opts in by supplying an action). Use `showCtaSecondary={false}` when
there is nothing to cancel.

A preview panel whose "open the full record" action is a small `secondary`
Button beneath its own title reads as body content, not as the panel's CTA —
that is how three previews in People & Access hid their only real action. If one
`SlideOut` hosts several preview types, resolve the label and the handler at the
call site from whichever is open; the preview component should not own it.

```tsx
<SlideOut
  type="full-slot"
  showCta={!!cta}
  showCtaSecondary={false}
  ctaPrimaryLabel={cta?.label}
  onCtaPrimary={cta?.onClick}
>
```

**Default sizes and drag behavior:**
- `size="m"` → starts at **350px**, drags to **450px** → **half-screen**. This is the default.
- `size="l"` → starts at **450px**, drags to **half-screen** → **full-screen**. Use only for complex forms or rich content.
- Never set a fixed pixel width — the snap system handles resizing.

**SlideOut content composition (inside the slot):**

Structure content top-to-bottom in this order:
1. **AI Summary block** (if AI-generated insight exists) — purple surface, `var(--color-surface-purple-more-subtle)`
2. **Key Metrics** — `AdaptiveMetricGrid` with 2–4 `HighlightCard` components. Max 4.
3. **Primary list** (`EntityList`) — recent runs, related items, linked records
4. **Process steps** (`ProcessItem`) — execution steps with status
5. **Detail table** — key-value pairs in a bordered table (type, owner, pipeline, timestamps)
6. **Form fields** (Config tab only) — `Input`, `Select`, `Toggle`, `Textarea` using DS components

**SidePanel — mandatory props:**

```tsx
<SidePanel
  open={open}
  onClose={onClose}
  title="Item Name"
  description="Brief description of the item"
  titleTag="Active"
  titleTagVariant="success"         // "success" | "alert" | "neutral"
  titleIcon={<Icon size={14} />}
  showCollapsedStrip                // required — shows the collapsed state strip
  showMenu={false}                  // omit unless panel has overflow actions
  showSearch={false}                // omit unless panel has search
  footer={                          // optional — use for Save/Cancel in config panels
    <div className="flex justify-end gap-[8px] p-[12px]" style={{ borderTop: "0.5px solid var(--field-border)" }}>
      <Button variant="secondary" size="sm">Cancel</Button>
      <Button variant="primary"   size="sm">Save</Button>
    </div>
  }
>
  {slotContent}
</SidePanel>
```

**SidePanel default sizes and drag behavior:**
- Starts at **350px**, drags to **450px** → **half-screen**. Same snap logic as SlideOut.
- **`showCollapsedStrip` is the default, not a requirement** (revised 2026-09-11). The strip is the only way back into a panel that nothing else opens — a node inspector beside a canvas, a master-detail pane — so leave it on for those. Turn it OFF when a control on the page owns the panel: UCP's `Ask` button opens the Concierge, so a 48px strip parked at the right edge of every record was permanent furniture for a panel nobody had asked for. At `false` the header's control stops being a collapse chevron and becomes a real **Close (X)** — the component switches the icon and the label itself, so a caller cannot end up promising a strip that is not there.
- **A `SidePanel` that divides the page goes in `ScreenLayout`'s `sidePanel` slot**, never inside the page's content column. The slot renders it as a sibling of the main column in the same flex row as the `Sidebar`, so it runs the full height of the page and the content yields its width. Render it among your `children` instead and it lands under the `Header`, at the height of whatever widget it happens to sit beside, with the record sliding underneath — which is the bug, not a narrower version of the feature.

**Quick decision:** Is the panel overlapping a browsable list? → `SlideOut`. Is it embedded alongside a canvas or builder where the user edits something in context? → `SidePanel`.

### Create pattern — surface selection

Full rule, reasoning, and open questions live in `docs/patterns/create.md`. This section is the enforceable subset — tables and hard rules only.

**Create** brings a new object into existence. **Configure** edits the properties of something that already exists. This pattern governs Create only, never Configure.

**The pattern decides the container, never the fields.** A create modal for a worker has the fields a worker needs; a create modal for an API key has the fields an API key needs — neither is "what a create modal looks like." Field count, stage count, and branching are **inputs** to the cascade below; the container is its **output**, never the reverse. Two prototypes for different objects landing on the same surface (e.g. two `ModalDialog` creates with different field counts) is the pattern working correctly, not an inconsistency to fix.

**Gate 0 — does this pattern apply at all?**

| Condition | Why it is excluded | What governs it instead |
| --- | --- | --- |
| The object is created by direct manipulation — drag, drop, draw | Dropping the node onto the canvas already created it | Configure pattern (`SidePanel`) |
| The object is created inside an ongoing agent conversation | The chat is the container; there is no surface to choose | Chat surface |
| The action edits properties of an existing object | Nothing new comes into existence | Configure pattern |

**Gate 1 — which create mode?** The mode is decided by the affordance the user activates — never inferred.

| Trigger | Mode | Surface |
| --- | --- | --- |
| Any standard create affordance | Manual | Run the cascade below |
| A `Create with AI` affordance | Assisted | `ModalDialog` hosting the chat component → success `ModalDialog`. The chat component is `DS-GAP` — not implemented in this repo yet. |
| Browse a catalogue — templates, marketplace, presets, starting points | From a source | `ModalDialog variant="content"` for the selection → then the cascade below, pre-filled |

**When Create uses a modal.** `ModalDialog` is not excluded from Create — it has 3 jobs and 1 prohibition:

| Job | Variant | Example |
| --- | --- | --- |
| Fill in a standalone create, 5 fields or fewer | `content` | A new entity from its own list view · a user in Admin |
| Choose from a catalogue | `content` | Pick a template from the marketplace |
| Converse with an agent | `content` | `Create with AI` |
| Confirm before an irreversible save | `confirmation` | Publishing a tenant-wide policy |

**Prohibition:** a modal never holds a form whose fields depend on what the modal is covering — if the user has to remember, compare against, or navigate the background to complete it, the surface is `SlideOut`, however few fields it has.

The test that decides it: **can the user ignore this and keep working in the background?**

| Task | Can it be ignored? | Surface |
| --- | --- | --- |
| Filling in fields that relate to what is on screen | Yes | `SlideOut` |
| Filling in fields for a standalone object, 5 or fewer | No | `ModalDialog variant="content"` |
| Choosing from a catalogue | No | `ModalDialog variant="content"` |
| Conversing with an agent | No | `ModalDialog variant="content"` |
| Confirming | No | `ModalDialog variant="confirmation"` |

**The cascade — manual create.** A sequence, not a lookup table: start at step 1, stop at the first "yes."

| Step | Test | Yes | No |
| --- | --- | --- | --- |
| 1 | Does the object type declare a workspace of its own — a builder, canvas, or editor where it continues to be built after creation? | Hand-off — the object has its own creation section; Create just navigates there, nothing else is specified | → 2 |
| 2 | Does the flow branch, or does it have two or more stages? | Full-page wizard + `Stepper` + `StepperNavFooter` | → 3 |
| 3 | Can the object be created from a single field, AND is a list of the same object type visible on screen? | Inline create row — `DS-GAP`, does not exist in this repo yet | → 4 |
| 4 | Does the new object attach to something visible on screen — a parent record, a collection inside it, the thing the user is looking at? | `SlideOut type="full-slot"` | → 5 |
| 5 | More than 5 fields? | Full-page create form | `ModalDialog variant="content"` |

Step 1 is a hand-off, not a surface choice — once the object declares it owns a workspace, Create's job ends at navigating there. Nothing about confirmation, landing, or the surface itself is specified past that point; the object's own creation section owns all of it.

Steps 4–5, stated as one rule: **contextual** (the new object hangs off something on screen) → `SlideOut type="full-slot"`. **Standalone** (nothing on screen is its parent) → `ModalDialog variant="content"` at 5 fields or fewer, a full-page create form above that. The 5-field threshold applies ONLY here (standalone, modal-bound) — never to a `SlideOut`, which grows with its content instead.

**Staged flows — where the line sits.** Staged flows never live in a panel — there is no `Stepper` inside a `SlideOut`.

| Shape of the flow | Surface |
| --- | --- |
| One stage | `SlideOut` |
| Two or more stages, or any branching | Full-page wizard + `Stepper` + `StepperNavFooter` |

`StepperNavFooter` is a page-level component — it never appears inside a `SlideOut`.

**No Sidebar while a full-page create surface is open.** Step 2's wizard and step 5's full-page form both occupy the whole page, so the app's persistent `Sidebar` would otherwise still be there and still clickable — a hazard exactly on these two surfaces, which have the most (a wizard's stages) or the longest (a form that earned a full page) work to lose. Hide the `Sidebar` for the duration; `Header`'s `backButton` and the flow's own `StepperNavFooter` (`Cancel`/`Back`) are the only ways out, and it reappears the moment the flow ends. Does not apply to `SlideOut` or `ModalDialog` — both already sit on a backdrop that blocks the `Sidebar`.

**Second output — is a confirmation required?** Independent of the container, never merged into the cascade above.

| Condition | Confirmation |
| --- | --- |
| The user can undo the creation themselves — delete or archive, no external effect | None. Save directly. |
| The creation cannot be undone, has tenant-wide scope, or triggers effects outside the tenant | `ModalDialog variant="confirmation"` before saving |
| Assisted create | Always ends in a success `ModalDialog` |

**Confirming that it worked** — separate from the confirmation above, which is about risk. This is about whether the user can tell the create succeeded.

**Every create ends in a `useToast().success(...)`.** The landing is where the
object went; the toast is the product saying it did the thing. Michael,
2026-09-09 — this used to say a visible landing was confirmation enough and a
toast was only for the invisible case, and both New Role and Invite were built
against the newer rule before it was written down.

The reason the older rule was wrong: "it appeared in the list" only reads as
confirmation if you already know what the list looked like a second ago. Come
back from a full-page wizard to six roles or fourteen members and the new row
is just a row. The toast names what happened, in words, and is gone in 3.5s —
it costs nothing to a user who did not need it.

| Situation | Feedback |
| --- | --- |
| The created object lands somewhere visible — a list, a widget, the page you return to | Toast, **and** show it as the first row, briefly highlighted. The two do different jobs: the toast says it happened, the row says where it went. |
| The result is not visible — an asynchronous create, a governed action awaiting validation, a create the user navigates away from | Toast. It is the only signal there is. |
| The create was irreversible | Toast. The confirmation modal before saving carried the risk; this carries the outcome. |

Say what happened and what follows from it, not just "Created". `Role "Risk
Analyst" created · Assigned to 3 members.` A landing that filters or scrolls to
make the new object visible says so in the toast, because the user did not ask
for the filter — see `handleInvite` in `PeopleAccessMembers.tsx`.

In-flow `AlertBanner` is not the component for the invisible-result case — it's a full-width notice for system-level feedback, not "the thing you just asked for was created." **`Toast` resolves this** (`src/components/ui/toast.tsx`, `useToast()`) — it's a floating placement of the same `AlertBanner`, not a second component, auto-dismissed after 3500ms. `ToastProvider` wraps the whole app once, at the true root (`App()` in `src/App.tsx`) — call `useToast()` from any PM prototype screen with nothing to wire; there is no per-screen `ToastProvider` to remember. See the live demo on the `patterns-create` doc page's Anatomy tab.

**Third output — where the user lands afterwards.** Derived from the container, not a separate decision.

| Surface | After create |
| --- | --- |
| Inline create row | Stays in place. The new row appears in the list, ready to create the next one. |
| `SlideOut` | Closes. The user returns to where they were; the new object appears in context. |
| `ModalDialog` — standalone create | Closes. The user returns to the list they triggered it from; the new object appears there. |
| Full-page create form / wizard | Navigates to the created object. |
| Catalogue modal — source fully defines the object | Closes. Lands as the surface it would have used had the fields been filled by hand. |
| Assisted create | Success modal → view the object, or create another. |

**Accessibility.** While a create surface is open: focus is trapped inside the `ModalDialog` or `SlideOut`, returns to the trigger element on close, and Esc closes the surface. The primary CTA stays disabled until required fields are filled.

**`DS-GAP` — not yet implemented.** Verified against the component source: `ModalDialog` has no Esc-to-close handler at all, and neither `ModalDialog` nor `SlideOut` trap or return focus today. Until they do, a screen that relies on this behavior gets it by accident, not by contract.

**Entry points — the trigger lives where the collection lives.** If notes are held by a Notes widget, the affordance to add one belongs in that widget's own header, not in the page `Header`. The page `Header` CTA is reserved for the primary object of that screen — on a Worker detail page that is "Run now," not "Add note." A create page also carries no create CTA in its own `Header`: on a full-page create form or wizard, `Header` carries title and `backButton` only — the action completes in `StepperNavFooter`.

**`DS-GAP` — no date field.** There is no `DatePicker` or `Calendar` component in `src/components/ui/`. Any create form whose object needs a date is under-specified until one exists — do not improvise one.

**General overlay stacking rule (applies everywhere, not just Create):** only 1 `ModalDialog` + 1 `SlideOut` active at a time.

### Confirmation modals — standard composition
Use `variant="confirmation"` (the default) on `ModalDialog`. Always set `tone` to match the severity of the action:

| Action | `tone` | `iconName` | `ctaPrimary.destructive` |
|---|---|---|---|
| Archive | `"warning"` | `"Archive"` | `false` |
| Delete | `"error"` | `"Trash2"` | `true` |
| Other irreversible | `"warning"` | semantic icon | `true` |

Always include:
- `title` — frame as a question: `"Archive this worker?"`, `"Delete automation?"`.
- `description` — state the consequence: `"This action cannot be undone."` or entity-specific impact.
- `ctaPrimary` — the action label, matching the verb used to trigger it ("Archive", "Delete").
- `ctaSecondary` — always `{ label: "Cancel", onClick: onClose }`.

```tsx
// ✅ Delete confirmation
<ModalDialog
  isOpen={isOpen}
  onClose={onClose}
  tone="error"
  iconName="Trash2"
  title="Delete this worker?"
  description="All runs and logs associated with Meridian will be permanently removed."
  ctaPrimary={{ label: "Delete", destructive: true, onClick: handleDelete }}
  ctaSecondary={{ label: "Cancel", onClick: onClose }}
/>

// ✅ Archive confirmation
<ModalDialog
  isOpen={isOpen}
  onClose={onClose}
  tone="warning"
  iconName="Archive"
  title="Archive this worker?"
  description="Meridian will stop running and be moved to the archive. You can restore it later."
  ctaPrimary={{ label: "Archive", onClick: handleArchive }}
  ctaSecondary={{ label: "Cancel", onClick: onClose }}
/>
```

**NEVER** improvise a custom confirmation UI — always use `ModalDialog variant="confirmation"`.

### Header `tag` prop — when to show it

The `tag` prop renders a chip/badge inline next to the title. Use it only when it adds meaningful context — wrong usage is one of the most common AI-generated inconsistencies.

**Rule: tag = state only, never counters or statistics.**

| View type | Use `tag`? | Why |
|---|---|---|
| **List view** (multiple items, each with its own state) | ❌ Never | A list contains many states simultaneously — a single tag is meaningless and misleading |
| **Detail view** (one specific item open, e.g. a SlideOut or full-screen detail) | ✅ Yes, show the item's current state | A single item has one state; the tag gives immediate context |
| **Detail view with an `EntityHeader` on it** | ❌ Never | The card already carries the state badge, one row down. Two badges for one state is a duplicate, not emphasis |

**What goes in the tag:** a status label only — `Active`, `Draft`, `Running`, `Paused`, `Archived`. Never a count (`4 Workers`), never a statistic (`24 Polish`), never a category label.

```tsx
// ✅ Correct — detail view of a single AI Worker
<Header title="Meridian" tag={<Tag variant="success" size="s">Active</Tag>} />

// ❌ Wrong — list view of all AI Workers
<Header title="AI Workers" tag={<Tag>9 Workers</Tag>} />

// ❌ Wrong — statistics don't belong in the tag slot
<Header title="AI Workers" tag={<Tag>24 Active</Tag>} />
```

### Chip — color variants are semantic, not decorative

Chip supports 11 color variants, but **color signals meaning — it is not a styling choice.** Default to `primary` / `secondary` for the overwhelming majority of chips (selected vs. unselected state, active filter, generic category toggle). Only reach for a semantic-color variant (`error-*`, `alert-*`, `success-*`) when the chip represents that actual outcome or state — never to add visual variety, make a section "pop," or because a color happens to look good next to another element.

| Variant | Use when | Never use for |
|---|---|---|
| `primary` / `secondary` | Default choice — selected/unselected state, active filter, generic category toggle | — |
| `purple-primary` / `-secondary` | Categorical or brand tagging with no status meaning (e.g. "Premium," "Internal") | Signaling an outcome, result, or state |
| `light-blue-primary` / `-secondary` | Informational/system-level tagging — same non-status role as Purple | Signaling an outcome, result, or state |
| `error-primary` / `-secondary` | The item genuinely failed, is blocked, or needs correction | Decorative red, or "make this stand out" |
| `alert-primary` / `-secondary` | The item needs attention or is in a warning state | Decorative orange/yellow |
| `success-primary` / `-secondary` | The item completed, passed, or is in a confirmed positive state | Decorative green, or as a generic "active" indicator — use `primary` for that |

```tsx
// ✅ Semantic — the run actually failed
<Chip variant="error-secondary" size="s">Failed</Chip>

// ✅ Default — just an active/inactive filter toggle, no status meaning
<Chip variant={i === activeChip ? "primary" : "secondary"} size="s">{label}</Chip>

// ❌ Decorative — using Success just because green reads nicely here
<Chip variant="success-primary" size="s">Featured</Chip>
// → use purple-primary/secondary instead for non-status categorical tags
```

**Rule of thumb:** if you can't name the specific state or outcome the chip represents, it's `primary`/`secondary`. If you need color coding for categories or brands (not status), use Purple or Light Blue — never a semantic color for that.

### Header size — `size-l` is a ceiling, not a setting

**`size="size-l"` renders at 24px ONLY at XL (≥1920px). Below that the component downgrades it to `size-m` (18px) by itself** (Michael, 2026-09-09). The tall bar is for a Wide screen; anywhere narrower it spends height at the top of the page, where it costs the content most.

- **Keep writing `size={isScrolled ? "compress" : "size-l"}`.** Nothing at the call site changes — asking for L is asking for "as large as this screen has earned", and the component decides.
- 1920px is the DS breakpoint table's `xl` / Wide tier, not a number invented for this.
- Measured on the **viewport**, not a container — this bar always spans the page, and the breakpoints are defined in viewport terms. (Contrast `EntityHeader`, which measures its own card because it can sit in a narrow panel on a wide screen.)
- `compress` is untouched: it is scroll state, not a size, and the screen still owns it.

### Header sticky
- Scroll == 0 → DEFAULT (full header)
- Scroll > 16px → COMPRESSED (60px, title + status + CTA)
- Hover 0–24px from top AND cursor idle 3s → COMPRESSED_WITH_FILTERS
- `ScreenLayout` renders a `linear-gradient(canvas → transparent)` at the bottom of the header zone when `isScrolled=true` — this is already built into the layout; no extra code needed.

### Overview tabs — always Widget Canvas
Any tab labelled "Overview" MUST use `WidgetCanvasView` from `src/components/layouts/widget-canvas-view.tsx`.
**Never use `WidgetCanvasSection` or hand-roll a CSS grid for Overview tabs.**

`WidgetCanvasView` is the interactive version extracted from the DS Live Canvas. It gives PMs:
- Hover → drag handle visible on the widget
- Drag-and-drop reordering with FLIP animation
- Horizontal resize (left/right edge, snaps to 1/2/3 columns)
- Vertical resize (bottom edge) + collapse (click bottom edge)

```tsx
import { WidgetCanvasView } from "@/components/layouts/widget-canvas-view"
import type { CanvasSlot }  from "@/components/layouts/widget-canvas-view"
import { HighlightIcon }    from "@/components/ui/highlight-icon"

// KpiContent helper — use for every KPI widget slot:
function KpiContent({ value, feedback, iconName, iconVariant }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, color: "var(--color-text-title)" }}>{value}</span>
        <HighlightIcon size="lg" variant={iconVariant} iconName={iconName} />
      </div>
      <span style={{ fontSize: 12, color: "var(--color-text-subtitle)", marginTop: 6, display: "block" }}>{feedback}</span>
    </div>
  )
}

<WidgetCanvasView
  initialSlots={[
    // colSpan: 1 = narrow (1/3), 2 = wide (2/3), 3 = full (3/3)
    {
      uid: "total-workers", title: "Total Workers", colSpan: 1,
      content: <KpiContent value={9} feedback="All categories" iconName="Bot" iconVariant="informative" />,
    },
    {
      uid: "recent-activity", title: "Recent Activity", colSpan: 2, widthClass: "wide",
      content: (
        <div>
          <Table columns={...} data={...} size="sm" />
        </div>
      ),
    },
    {
      uid: "timeline", title: "Timeline", colSpan: 3, widthClass: "full",
      content: <MyTimelineContent />,
    },
  ] satisfies CanvasSlot[]}
/>
```

Rules:
- Every slot needs a unique `uid` string — used as React key and drag anchor.
- `colSpan` drives the initial column span. `widthClass` defaults automatically from `colSpan` if omitted.
- `content` is rendered INSIDE `WidgetFather`. Pass only the inner content — `WidgetFather` chrome (title, drag handle, resize handles) is added by `WidgetCanvasView`.
- Do NOT wrap `content` in another `WidgetFather` — that would double the card shell.
- **Do NOT add horizontal padding to widget `content`.** `WidgetFather` already insets its card by 24px; adding 16 here lands the content at 40 while the widget title stays at 24. The two halves each look fine alone, so the misalignment only shows with both on screen — which is how it survived until 2026-09-04. This guide used to prescribe `"4px 16px 16px"`, and that is where the double padding came from.
- A little vertical breathing room is fine — a `gap` between rows, or `paddingBottom` on a dense list. Horizontal, never.
- HighlightIcon variants: `informative` (blue), `success` (green), `neutral` (grey), `alert` (yellow), `error` (red).
- Reactive values (counts, live rows) in `content` update automatically — the slot array is rebuilt on each render.

### Widget Content Adaptation — useWidgetSize()

Every widget content component can (and should) adapt its layout to the current canvas column width. Use the `useWidgetSize()` hook exported from `widget-canvas-view.tsx`:

```tsx
import { useWidgetSize } from "@/components/layouts/widget-canvas-view"

function MyWidgetContent() {
  const { widthClass, isNarrow, isWide, isFull, availableHeight } = useWidgetSize()
  // widthClass: "narrow" | "half" | "wide" | "xl" | "full"
  // isNarrow:   widthClass === "narrow"  (4 cols, ~330px)
  // isWide:     "wide" | "xl" | "full"  (8-12 cols)
  // isFull:     widthClass === "full"   (12 cols, full width)
  // availableHeight: number | undefined — set when user has explicitly resized the widget height
  ...
}
```

**Standard adaptation patterns:**

| Scenario | Narrow | Half/Wide | XL/Full |
|---|---|---|---|
| List items shown | 2–3 | 4–5 | All |
| Filter chips | Hidden | Visible | Visible + type row |
| Metadata rows | On hover only | On hover | Always visible |
| Action buttons | Primary only | Primary + secondary | All |
| Detail columns | 1 col | 1 col | 2 col |

**Height-responsive content** — when the user resizes a widget vertically, `availableHeight` is set. Use it to show more rows:

```tsx
const contentMaxH = availableHeight ? Math.max(100, availableHeight - 90) : isNarrow ? 260 : 380
const maxItems    = availableHeight ? Math.floor((availableHeight - 90) / 48) : isNarrow ? 3 : 5
```

The `90px` offset accounts for WidgetFather chrome (padding + header + gap). `48px` is a typical list item height.

**Rules:**
- ALWAYS use `useWidgetSize()` for layout decisions — never hardcode thresholds based on screen px
- NEVER duplicate ResizeObserver inside content components — the canvas already provides width via context
- Content at narrow width must still be functional (search stays, action buttons stay, metadata can hide)
- When `availableHeight` is set, the content must grow to fill it — no empty space below the list

### Logs / activity tabs — always Pagination
Any tab that shows log or run history MUST include a Pagination component.

```tsx
// Separate pagination state for logs (never share with Workers list state)
const [logsPage, setLogsPage] = useState(1)
const [logsPageSize, setLogsPageSize] = useState(10)

// Pass to ScreenLayout's pagination prop, conditional on active tab
pagination={
  mainTab === "workers" && filtered.length > pageSize
    ? <Pagination ... />
    : mainTab === "logs"
    ? <Pagination currentPage={logsPage} totalItems={allLogs.length} itemsPerPage={logsPageSize}
        onPageChange={setLogsPage} onItemsPerPageChange={n => { setLogsPageSize(n); setLogsPage(1) }}
        rowsPerPageOptions={[10, 25, 50]} />
    : undefined
}
```

Default page size for logs: 10. Options: [10, 25, 50].

### Input and Textarea — no label prop on desktop
**NEVER** pass the `label` prop to `Input` or `Textarea` in desktop PM screen files (`src/screens/*.tsx`).
- Use `placeholder` to describe the field — it is the only field hint on desktop.
- The floating label (absolute-positioned, overlaps the top border) is a mobile/touch convention only.
- This applies to all form fields in modals, slide-outs, and inline edit flows in any PM prototype.

### Empty States
Use `EmptyState` from `src/components/ui/empty-state.tsx` whenever a view, section, or search has no content. **NEVER** hardcode a custom empty message, illustration, or div.

| Scenario | title | description | CTA |
|---|---|---|---|
| No records yet (first visit) | "No [Entities] yet" | Brief explanation of what goes here | "Create your first [Entity]" |
| Filtered empty (filter/search returns 0) | "No [entities] found" | "Try adjusting your filters or search term." | "Clear filters" |
| Global search returns 0 | "No results for '[query]'" | Suggest broadening the search | — |

Rules:
- Override `icon` with a Lucide icon matching the entity type (`Bot` → Workers, `Zap` → Automations, `BookOpen` → Knowledge, etc.). Default `Inbox` is a fallback, not a choice.
- Add `ctaLabel` + `onCta` only when there is a concrete next action — never add a CTA just to fill the space.
- **Never show `EmptyState` and `Pagination` simultaneously** — 0 results means no pagination.
- Place `EmptyState` where the entity list would have been — same padding, same vertical position.

### Pagination
- Show only when `total_results > rows_per_page`.
- Any filter/sort/tab change → reset to page 1.

---

## Dropdown menus (filter slots)

A dropdown's **left edge aligns with its trigger's left edge, 4px below** — never centred on the trigger, never at the mouse position. If the panel would run off the right of the viewport it **flips**: right edges align instead. The flip is automatic, measured before paint, not a per-screen decision.

Do not reimplement this. `src/lib/dropdown-anchor.ts` is the one implementation:

```tsx
import { anchorFromEvent, useDropdownPosition, type DropdownAnchor } from "@/lib/dropdown-anchor"

const [anchor, setAnchor] = useState<DropdownAnchor | null>(null)
const dropdown = useDropdownPosition(anchor)

<div onClickCapture={(e) => setAnchor(anchorFromEvent(e))}>
  <Filters … />
</div>

{anchor && (
  <div ref={dropdown.ref} style={{ position: "fixed", zIndex: 10001, ...dropdown.style }}>
    <Menu>…</Menu>
  </div>
)}
```

Applies to every dropdown — filter slots, `Select` panels, kebab menus. **Tooltips and the Slider thumb are the exception**: those centre on their anchor, which is correct for them.

---

## Experimental components — when something doesn't exist in the DS

If a screen requires a component that doesn't exist in `src/components/ui/`:

**Step 1 — Try composition first.** Can the result be achieved by combining existing DS components (CardContainer, Tag, EntityList, Button, etc.)? If yes, compose — no new component needed.

**Step 2 — If genuine gap, create in `src/components/experimental/`**, never in `ui/`. The file must:
- Use ONLY `var(--token)` — no hex, no rgba
- Start with a `// DS-GAP:` comment on line 1:
  ```tsx
  // DS-GAP: MetricCard — KPI card with trend delta. Closest DS component: CardContainer.
  ```
- Accept `variant?`, `size?`, `className?` props at minimum
- Never introduce new color semantics — only arrange existing token values

**Step 3 — Continue prototyping.** The PM doesn't need to know this happened. The DS-GAP comment is the handoff artifact for Design to audit later.

**Never move anything from `experimental/` to `ui/`** without explicit instruction from Michael (Product Design).

---

## Button hierarchy rules

- `variant="main"` — **header-level CTA only**, and screens no longer write it: `Header` applies it itself from `primaryAction`, which takes an action object (`{ label, icon?, onClick?, disabled?, priority? }`), never a `Button`. Maximum 1 per screen. If you find yourself typing `variant="main"` in a screen file, the action is in the wrong place.
- `variant="primary"` — content-area actions inside cards, widgets, SlideOuts, or table rows. Use when an action is the clear recommended next step within a contained context.
- **Never repeat `main` more than once per view.** If a widget or card needs a call-to-action, use `primary`, not `main`.
- **No more than 2 `primary` buttons visible at the same time** in a single scrolled viewport. If more actions compete, demote lower-priority ones to `secondary`.
- Action order is always: `main` (header) → `primary` → `secondary` → `tertiary`.
- **One confirmed exception:** `EntityHeader`'s AI agent trigger uses `variant="main"` even though it renders inside a `CardContainer`. Confirmed directly by Michael — the agent button is the platform's one persistent, always-present entry point (same role as Topbar's own IA-icon), not a regular card CTA, so it earns the top-of-hierarchy treatment. Do not treat this as precedent for any other card/widget/SlideOut button — it's a named, single-purpose exception, not a loophole.

---

## Anti-patterns — never do these

- Hardcoding `#hex` or `rgba(...)` in `.tsx` — use `var(--token)`.
- Using `position: absolute` for overlays — use `position: fixed` with `getBoundingClientRect()`.
- Rendering dropdowns inside `overflow: hidden` parents — use fixed positioning to escape.
- Creating a new button/input/card component when `src/components/ui/` has one.
- Showing two secondary buttons side by side — order is always primary → secondary → tertiary.
- Using `variant="main"` inside a widget, card, or SlideOut — use `primary` instead (except `EntityHeader`'s AI agent trigger — see Button hierarchy rules).
- Adding a filter chip before Apply is clicked.
- Opening a Modal for content the user can safely ignore and keep working in the background — use SlideOut instead. Destructiveness is NOT the test: a catalogue picker and the Create-with-AI chat are both non-destructive and still correctly Modal, because the user can't ignore either one either (see the Create pattern's "when Create uses a modal" test).
- Showing a loading indicator for operations under 300ms.
- Showing two loading indicators on the same view simultaneously.

---

## Output — how to add a PM prototype screen

Each PM prototype lives in its own file in `src/screens/`. App.tsx only gets a registration entry.

**Step 1 — Create the screen file:**
```
src/screens/[pm-name]-[feature].tsx
```
Export a single default React component.

**Step 2 — ALWAYS wrap the screen in `ScreenLayout`** (mandatory — no exceptions):

```tsx
import { ScreenLayout }    from "@/components/layouts/screen-layout"
import { ListViewSection } from "@/components/layouts/list-view-section"
import type { SidebarItem } from "@/components/ui/sidebar"

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "ai-workers", label: "AI Workers", icon: "Bot" },
  // ... other app sections
]

export default function MyScreen() {
  return (
    <ScreenLayout
      workspaceName="Tenant Name"
      userName="PM Name"
      userEmail="pm@company.com"
      sidebarItems={SIDEBAR_ITEMS}
      activeSidebarId="ai-workers"
      header={(isScrolled) => (
        <Header
          size={isScrolled ? "compress" : "size-l"}
          title="Page Title"
          description="Page description."
          primaryAction={{ label: "New Item", icon: Plus }}
        />
      )}
      pagination={
        filtered.length > pageSize
          ? <Pagination currentPage={page} totalItems={filtered.length} itemsPerPage={pageSize} onPageChange={setPage} />
          : undefined
      }
    >
      {/* Filters + entity list only — no Pagination here */}
      <ListViewSection items={pagedItems} filterSlots={...} ... />
    </ScreenLayout>
  )
}
```

`ScreenLayout` bakes in the DS-spec layout values so they can't drift:
- Horizontal margin: **32px** (L Desktop 1440px — DS standard baseline, confirmed in all pattern previews)
- Content padding: **8px top · 32px sides · 64px bottom**
- Sidebar: collapsed by default (56px)
- Header zone: outside the scrollable area — stays visible when the list scrolls
- Scroll detection: `isScrolled` fires at `scrollTop > 16px` (matches Header compress threshold)

`ListViewSection` handles Filters + filter dropdown + EntityList only — no Pagination. Key rules:
- **Pagination lives in `ScreenLayout`** — pass `<Pagination .../>` to ScreenLayout's `pagination` prop, not to ListViewSection
- Set `showPreview={false}` and wire your own `SlideOut` outside `ListViewSection` when you need custom detail content
- Set `showPreview={true}` for a quick default preview without custom content

**Step 3 — Register in App.tsx** (the only change to App.tsx):
```tsx
import MyScreen from "./screens/pm-juan-dashboard"

{ id: "proto-juan-dashboard", label: "Dashboard — Juan", description: "Adoption metrics view", author: "Juan", component: MyScreen },
```

The screen appears in the "Prototypes" sidebar group and opens full-screen (no DS library shell).

**Rules:**
- Screen files: only `var(--token)` colors, only `src/components/ui/` and `src/components/layouts/` components.
- App.tsx: only the import + registry entry. No new functions, no new routes.
- NEVER hardcode pixel values for padding or spacing — use ScreenLayout and let it handle margins.

**Validation checklist — run in this exact order before marking complete:**
1. `npx tsc -b --noEmit` → 0 errors (catches type mistakes)
2. Take a browser screenshot of the screen on `localhost:5173` → compare against the DS pattern page for the same pattern. TypeScript passing ≠ screen rendering correctly.
3. Check every tab of the screen in the screenshot: Overview uses `WidgetCanvasSection`, Workers uses `ListViewSection`, Logs shows `Pagination`.
4. Get Michael's visual sign-off **before the PR is merged** — on the PR's own
   Vercel preview, or on localhost. This used to read "before pushing to
   production", which stopped being the right gate when the site started
   following `main` automatically (see *Publishing the site* below): merging
   IS publishing now, so the review has to happen while the PR is still open.

---

## When a PM needs a UI element the DS doesn't have yet

PMs will often ask for something that doesn't exist in `src/components/ui/` — a metric card, a timeline, a custom chart. Follow these steps in order:

**Step 1 — Try DS composition first.**
Can the result be built by combining existing DS components (`CardContainer`, `Tag`, `EntityList`, `Table`, `HighlightCard`, etc.)? If yes, compose — no new component needed.

**Step 2 — If a genuine gap: create in `src/components/experimental/`.**
Never in `ui/`. File must:
- Start with a `// DS-GAP:` comment on line 1:
  ```tsx
  // DS-GAP: MetricCard — KPI card with trend delta. Closest DS component: CardContainer.
  ```
- Use only `var(--token)` — no hex, no rgba
- Accept `variant?`, `size?`, `className?` props at minimum
- Never introduce new color semantics — only arrange existing token values

**Step 3 — Continue prototyping.** The PM doesn't need to know this happened. The DS-GAP comment is the handoff artifact for Design to audit and officially promote later.

**Upgrade path**: Claude never moves anything from `experimental/` to `ui/` without explicit instruction from Michael (Product Design lead). The upgrade requires a Figma node to be created and reviewed first.

---

## Publishing the site

Three separate places, and merging only reaches the second one:

| Where | What it is | Changes when |
|---|---|---|
| A branch | Work in progress | You push to it. Every PR also gets its own **Vercel preview** — that is the link to review |
| **`main`** | The agreed code | A PR is merged |
| **The site** — <https://cachilupis.github.io/aims-os-design-system/> | The built HTML/JS on GitHub Pages | Automatically, on every push to `main` |

**A merge to `main` publishes the site.** The `deploy` job in
`.github/workflows/design-system-checks.yml` builds with `GH_PAGES=true` and
pushes to the `gh-pages` branch. It is gated on `needs: checks`, so a `main`
that does not type-check or fails the audit does not publish.

**Do not run `npm run deploy` by hand any more.** It publishes whatever is in
your **working tree**, not `main` — run it from a feature branch and unmerged
work goes to the official site with nothing to warn you. The script stays in
`package.json` for a genuine emergency (CI down and the site must move); if you
use it, `git checkout main && git pull` first, without exception.

**The deploy build is a second build on purpose.** `checks` builds for Vercel,
which serves from the domain root; Pages serves from `/aims-os-design-system/`,
which is what `GH_PAGES=true` switches on. The two outputs are not
interchangeable, so the artifact cannot be shared between the jobs.

**CI cannot tell you whether a screen looks right** — it type-checks, builds and
audits. A visually broken screen that compiles will publish. That is what the
per-PR Vercel preview is for, and why the sign-off moved to before the merge.

---

## DS consistency health check

**Status: partially built and running automatically.** `scripts/audit-tokens.cjs` (`npm run audit:tokens`) covers items 1, 5, and 7 below and runs on every PR and push to `main` via `.github/workflows/design-system-checks.yml` (added 2026-08-04) — a PR with a hardcoded hex/rgba, an orphaned component, or a build/type error fails CI automatically. `/ds-health` as a slash command still does not exist — items 2, 3, 4, and 6 need semantic checks the script doesn't do (parsing JSX for raw elements, cross-referencing DS-GAP comments, registry lookups) and haven't been built. This section documents the full intended scope so whoever builds the rest doesn't have to guess:

1. **Token compliance** (no hardcoded hex/rgba in `.tsx`/`.css` files) — ✅ automated, `audit-tokens.cjs`
1b. **The three primitives screens keep drawing by hand** — ✅ automated (2026-09-08), checks 12-14:
   a pill-shaped badge is `Tag`, a circular avatar 16-64px is `AvatarCircle`, and a `<button>` that
   sets its own padding AND a border or background is `Button`. Warnings, not errors — the ratchet
   holds the line at the count it inherits, measured in INSTANCES so a file already on the list
   cannot absorb new ones. An icon-only trigger, a tab, a colour swatch and a status dot under 16px
   are real uses of the raw element and are not counted.
1c. **The four the People & Access review kept finding** — ✅ automated (2026-09-08), checks 15-18:
   a tinted 20-48px square with an icon in it is `HighlightIcon`; a `--surface-raised` strip above a
   divider is the TABLE-HEADER device and does not belong on a card title; `var(--accent)` is a blue
   tint and must never be a row hover; and a component rendered inside `<SlideOut>` must not add its
   own horizontal padding. Same ratchet, same instance counting. Checks 15 and 16 read one `style`
   object at a time rather than a window of lines — a sliding window merges the strip above a list
   with the icon tile in its first row and reports each as the other. Check 15 skips icon-only
   `<button>`s (resolved by nearest opening tag, since `[^>]*` breaks on any arrow function in an
   attribute), and check 16 treats uppercase micro-type or an explicit grid as proof of a real table.

2. Raw HTML elements inside pattern previews — not automated
3. Experimental component integrity (DS-GAP comment present) — not automated
4. PM screens registered in `PROTOTYPE_PAGES` — not automated
5. **TypeScript — zero errors** — ✅ automated, CI runs `npm run build`
6. Pattern page previews using real DS components — not automated
7. **Zero-import check** — ✅ automated, `audit-tokens.cjs` (same failure mode as the 2026-07 orphan incident above)

For anything not yet automated (2, 3, 4, 6), do a manual pass after adding any new component, pattern page, or screen.
