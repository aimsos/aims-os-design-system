# Entity Header — Change Spec

> What changed in `record-header.tsx` and why.
> This is a delta, not the full component spec. Source of truth for the full rules is the Figma
> `Design System - AIMS OS` › `Entity Header` section.
> Aug 31, 2026

---

## Context

The component was reviewed with Product and Engineering after the Unified Entity Profile pivot. Eleven changes came out of it. Three break the current API, seven are additive, one removes scope.

**Do not apply these until #46 is merged and up to date with main.** These changes sit on top of it.

---

## 1 · Breaking — `primaryMetadata` becomes `source`, and holds one item

**Before**

```tsx
primaryMetadata?: [string, string]   // "VP Operations" · "Green Solutions"
```

**After**

```tsx
source?: string                       // "Workday"
```

**Why.** "Source" is the correct term in systems language, not "provenance" and not "primary metadata". It answers one question: which system the record was pulled from — Workday, Salesforce, NetSuite, DMS, Helix Data Studio.

One item only. The previous version showed two values side by side, such as `Enterprise Account · Midwest Region`, which put a category next to a location. Neither of those is a source.

**Rule for whoever fills it.** A job title, a region, a category or a parent company describe or place the entity. They do not say where the data came from, so they belong in tags or secondary metadata, or nowhere. If an entity has no source because it was created in the platform itself, the slot is removed rather than filled with something else.

**Migration.** Every call site passing two values keeps the first only if it names a system. In the current screens none of them do, so all of them need a real source value. Flag the call sites, do not guess the values.

---

## 2 · Breaking — `description` defaults to `false`

**Before** `description` rendered by default.
**After** it is off unless explicitly enabled.

**Why.** Most headers do not carry one. It is now an edge case with one required scenario: when the title is an opaque code. `RO-48291` means nothing alone, so the description says what the record concerns.

**The description is also the last resort.** Ask in this order and stop at the first yes: does it need attention now → signal tag; is it what kind of thing this is → classification tag; is it the current status → state badge; is it a fact someone might act on → secondary metadata; is it durable context nothing above captured → description.

**Durability test.** If the sentence could change next week it is an activity note and belongs in the Overview, not here.

---

## 3 · Breaking — secondary metadata caps at 6

**Before** up to 12 items.
**After** 6.

**Why.** Six is where the industry lands for a compact attribute row under a record title — Deel shows exactly six, Zillow shows six in a grid, Gamma goes to nine and moves them out of the header into their own section. Past six it stops being a row and becomes a section. Twelve on one line is a wall of text.

**Anything beyond six goes to the Overview, not to a `+N` chip.** A metadata item hidden behind a counter is not discovered, and if it was worth showing it is worth having a place.

**What qualifies.** Something a person could act on, or something governance requires be visible: counts of facts, open items and workflows, the assigned agent tier, access role, tenure, promotion tier or Bridge ID where policy permits.

**What does not.** Anything true of every entity of the same type — that is a label, not information. And anything describing a conversation rather than the entity.

**A document is not a fact.** A Truth Plane fact is atomic and attested; a Canon Plane document is long-form reference. Count them separately — they carry different authority, and the hierarchy is TR over CR.

---

## 4 · Additive — three tag roles

Every tag is one of three things. Same component, same vocabulary as Entity List.

| Role | What it is | Count |
|---|---|---|
| **State** | The entity's overall status | Exactly one, own slot on the right |
| **Signal** | Something that needs attention, bounded in time or condition | Zero or many |
| **Classification** | What kind of thing this is | Only when the visual is an avatar |

A highlight icon already says the type, so classification is only needed when the visual is an avatar — a photo cannot tell you whether the person is an employee, a customer or a candidate.

**If several statuses are true at once, the most blocking one wins and the rest become signals.**

**Removed as invalid:** `Entity`, `Governed`, `Manufacturing`, `Insurance`, `Direct materials`, `Automotive`, `Engineering`, `Service`. Several were true of every entity in the platform, which made them noise.

---

## 5 · Additive — two different colour rules

**State badge — full semantic range.** `Success`, `Informative`, `Alert`, `Error`, `Neutral`. There is exactly one, so colour costs nothing and carries real meaning.

**Left tags — two colours only.** `Error` when blocking or overdue, `Alert` when it needs review, `Neutral` for everything else including every classification and the overflow chip.

**Why the split.** There can be six left tags. If each picked its own semantic colour, a healthy header would light up in three shades and colour would stop meaning anything. With two, an entity with nothing pending reads completely neutral — and that silence is information.

**The test for a left tag.** Not whether it is a signal or a classification. Whether someone has to do something about it. If yes, colour. If no, neutral. A negative state that requires review takes `Alert`: `Suspended`, `Blocked`. A state that only describes the situation stays neutral: `Active`, `On leave`, `Awaiting parts`.

**Classification is never coloured.** This is what makes the vocabulary scalable — a tenant can define a hundred classifications in Helix Data Studio and none of them breaks the visual system, because none of them picks a colour.

---

## 6 · Additive — truncation ceilings

| Element | Ceiling | Approx. characters |
|---|---|---|
| Title | 540 px | ~50 at 20px |
| Source | 160 px | ~22 |
| Tag chip | 160 px | ~22 at 12px |
| State badge | 140 px | ~19 |
| Action label | 180 px | ~25 |
| Secondary metadata | 8 / 24 char | short / long form |
| Description | container width | one line |

**Nothing wraps. Nothing abbreviates.** An ellipsis tells the user there is more; an abbreviation looks like the real value and misleads.

**Truncate last, not early.** The title takes the space the row actually has and only truncates when the row genuinely runs out. A title cut short with empty space beside it is a bug.

**Order of yielding on the row:** tags collapse into `+N` first, then a second source item would drop if one existed, and only then does the title truncate.

**Two rules from Carbon and PatternFly.** An ellipsis must hide at least three characters and leave at least four visible. And measure in pixels rather than characters — a `w` is roughly three times the width of an `i`.

**In code the title is `flex: 0 1 auto` with `min-width: 0`**, so it takes whatever remains after visual, source, collapsed tags and actions. The 540px in Figma stands in for that behaviour; it is not a hard specification.

**The title has no minimum.** It is an identifier, not a sentence. `RO-48291` is eight characters and complete.

---

## 7 · Additive — focus order with roving tabindex

Nine tab stops. Six when nothing is truncated.

```
1  Title                 only when truncated
2  Source
3  Tags                  GROUP — arrow keys inside, includes +N
4  Information
5  Secondary action
6  Ask
7  Menu
8  Description           only when truncated
9  Secondary metadata    GROUP — arrow keys inside
```

**Why grouped.** With six tags and six metadata items, one stop per item means a keyboard user presses Tab twenty-something times to get past the header. That is a barrier, not an inconvenience. Grouped stops use the WAI-ARIA composite widget pattern: Tab enters, arrows move within, Tab leaves.

**Never a stop.** The visual identity — decorative to keyboard, named to screen reader. The state badge — status, not a control. Any hidden or empty slot.

**Always true.** Focus order follows visual order and never jumps to the actions first. Tooltips open on focus as well as hover and dismiss with Escape. The `+N` chip exposes its hidden tags inside the group, not only on hover. Focus is always visible and never relies on colour alone.

---

## 8 · Additive — the three actions are three different things

They sit in one row and look like one group. Reading them as a row of buttons is the most common misreading.

**`Ask` — the gradient button.** Opens a context-aware Personal Assistant in a side panel. It produces summaries and never resolves a task. The label is one word on purpose: it was `Ask about {entity name}`, which grew with the entity name and consumed space the header needs. The tooltip carries the rest.

**Information — the icon button.** Opens a side panel with the source of the fields in this header: where the title, the source and the state came from. Not the Overview, not the Knowledge tab.

**Menu — the overflow.** Destructive and secondary actions only, never a visible button. The header does not define which actions exist; that is configured per entity in Helix Data Studio.

**One side panel at a time.** Both the Personal Assistant and the information panel open on the side. Opening one closes the other; the panel requested last wins.

---

## 9 · Additive — the header always sits in a Card Container

It is never placed directly on a page. It renders inside the Card Component's slot, at Size L on desktop and at the responsive width on tablet. Padding, radius, surface and elevation come from there.

**The header has no container of its own and must not grow one** — a header with its own background inside a card produces a box within a box.

**It is FILL width inside the slot.** It never sets its own width, and **the breakpoint it responds to is the card's, not the viewport's.**

---

## 10 · Additive — reflow before yielding

Three mechanisms, applied in this order.

**Reflow.** At narrower widths the header does not compress a single row. It breaks into stacked rows and keeps everything: visual + title with actions, then source, then tags, then description, then secondary metadata. On a tablet there is vertical space to spare, so stacking costs nothing.

**Yield.** Tags collapse to `+N`, then source, then the title truncates.

**Drop.** Only once reflow and yielding are exhausted. Visual, title and state badge are never dropped at any width.

**Secondary metadata is hidden before it is stripped of text.** A row of bare icons is worse than no row.

---

## 11 · Out of scope — the Next Best Action card

The card that appears under the header is **a separate component in its own Card Container**, not a second slot in the same one. Two records, two containers.

Nothing about it belongs in `record-header.tsx`.

---

## Rename

`RecordHeader` becomes `EntityHeader`.

**Do not rename the file and do not update call sites in `src/screens/`.** Export the new name and keep the old one as a deprecated alias pointing at the same component:

```tsx
export const EntityHeader = ...
/** @deprecated Use EntityHeader. */
export const RecordHeader = EntityHeader;
```

**Why.** The screens in `src/screens/` are the PMs' prototypes and are not to be refactored. A rename that touches every import creates a diff nobody can review and churn in files that belong to other people. Call sites migrate when someone opens them for another reason.

Ship the alias as its own PR, after the behaviour changes.

---

## Suggested PR split

```
PR 1   Breaking API changes        sections 1, 2, 3
PR 2   Rules and behaviour         sections 4, 5, 6, 7, 8, 9, 10
PR 3   EntityHeader alias          rename section
```

Sections 1 to 3 rewrite existing behaviour and need an explicit call-out under CODEOWNERS. Sections 4 to 10 are additive.
