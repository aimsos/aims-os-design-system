# Pattern — Create

> Single source of truth for how any create action picks its surface in AIMS OS.
> Everything else — the `CLAUDE.md` table, the `patterns-create` doc page, the playground screens — is derived from this file.
>
> Status: **draft v0.14 — pending validation**
>
> v0.2 — volume threshold removed; step 1 rewritten as a declared property rather than an enumerated list.
> v0.3 — cascade rewritten as an explicit sequence; the two-stage flow named instead of falling through to the default.
> v0.4 — third create mode added (from a source / catalogue); §2b defines the jobs a modal holds in Create.
> v0.5 — contextual vs standalone split added as steps 4 and 5; a modal is now a first-class create form container. Reconciliation mapped against the seven findings in `create-audit.md`.
> v0.6 — `SlideOut type` corrected to `full-slot` after verifying against the component source; landing defined for the standalone modal and the catalogue modal.
> v0.7 — step 1 reframed as a hand-off rather than a surface; "dedicated view" split into the two distinct outputs it was conflating.
> v0.8 — staged flows never live in a panel (no Stepper in a SlideOut); page-level create completes in `StepperNavFooter`, not the Header; the trigger lives where the collection lives; §4b defines success feedback by visibility and names the missing Toast component.
> v0.9 — §1b added: the pattern decides the container, never the fields; field count is an input to the cascade, not an output. DatePicker named as a second `DS-GAP`.
> v0.10 — §5b added: focus trap, focus return, Esc-to-close, and CTA-disabled-until-valid while a create surface is open. Verified against the component source: `ModalDialog` has no Esc handler, and neither `ModalDialog` nor `SlideOut` trap or return focus — named as a third `DS-GAP`.
> v0.11 — merged against `main`: the Toast `DS-GAP` in §4b is resolved (`useToast()` now exists as a floating placement of `AlertBanner`, not a second component) but isn't wired into any scene yet; the pattern's own worked examples (scenes A, C, D) had three entity-detail Headers still using `backButton` instead of the `breadcrumb` the navigation-depth rule now requires from L2 — corrected to match.
> v0.12 — the invisible-result branch of §4b is demonstrated, not just described: a live `useToast()` call on the `patterns-create` doc page's Anatomy tab, wrapped in its own `ToastProvider`. Still no PM prototype screen in the repo wires this in — the doc page's demo is the pattern's own proof it works, not a claim that the wiring is now free.
> v0.13 — the per-screen `ToastProvider` from v0.12 only reached content nested inside `ScreenLayout`'s own render tree, not a screen's top-level `useToast()` call — the natural place a screen would call it, since it renders `ScreenLayout` rather than being rendered by it. Verified live: a screen-level call returned no-ops until the provider moved to the true app root (`App()` in `src/App.tsx`). Corrected there instead — `useToast()` now works from any PM prototype screen with nothing to wire.
> v0.14 — full-page create surfaces (the step-2 wizard, the step-5 full-page form) hide the app's `Sidebar` for the duration of the flow, so a stray click can't navigate away and silently lose in-progress work. `SlideOut` and `ModalDialog` are unaffected — their backdrop already blocks the `Sidebar`.

---

## 1 · Scope

**Create** brings a new object into existence.
**Configure** edits the properties of something that already exists.

This pattern governs Create only. It never governs Configure.

### Gate 0 — Does this pattern apply at all?

Run this before anything else. If any of the following is true, **the pattern does not apply** and no surface is selected.

| Condition | Why it is excluded | What governs it instead |
| --- | --- | --- |
| The object is created by direct manipulation — drag, drop, draw | Dropping the node onto the canvas already created it | Configure pattern (`SidePanel`) |
| The object is created inside an ongoing agent conversation | The chat is the container; there is no surface to choose | Chat surface |
| The action edits properties of an existing object | Nothing new comes into existence | Configure pattern |

**Control case.** Dragging a node from the library onto the Workflow Builder canvas is *not* a create action under this pattern. The `SidePanel` that opens afterwards configures the node that already exists. Any rule that tries to select a surface here is misapplied.

---

## 1b · The pattern decides the container, never the fields

This is the single most misread thing about the pattern, and the examples are where the misreading happens.

**The fields belong to the object. The container belongs to the pattern.** A create modal for a worker has the fields a worker needs. A create modal for an API key has the fields an API key needs. Neither is "what a create modal looks like".

And the direction of the relationship matters:

| | |
| --- | --- |
| **Input to the cascade** | How many mandatory fields the object has, whether the flow has stages, whether it branches |
| **Output of the cascade** | Which container holds them |

The fields determine the surface. The surface never determines the fields. Anyone reading an example and copying its field list has inverted the pattern.

A prototype for a different object, in the same surface, will look different inside — and that is the pattern working correctly, not an inconsistency.

---

## 2 · Gate 1 — Which create mode?

Three distinct create modes exist. The mode is decided by the affordance the user activates, so it is never inferred.

| Trigger | Mode | Surface |
| --- | --- | --- |
| Any standard create affordance | **Manual** | Run the cascade in §3 |
| A `Create with AI` affordance | **Assisted** | `ModalDialog` hosting the chat component → success `ModalDialog` |
| Browse a catalogue — templates, marketplace, presets, starting points | **From a source** | `ModalDialog variant="content"` for the selection → then §3, pre-filled |

### Assisted create — behaviour

1. The trigger opens a `ModalDialog` containing the conversational chat component.
2. The object is defined through conversation, not through form fields.
3. On completion, a success `ModalDialog` confirms what was created, with two exits: view the new object, or create another.

**Implementation status:** the chat component exists in the Figma Design System but **is not implemented in this repo**. This branch is documented, not buildable. Mark as `DS-GAP` until the chat component ships.

### Create from a source — behaviour

1. The trigger opens a `ModalDialog variant="content"` whose slot holds the catalogue: browse, filter, compare, select.
2. On selection, one of two things happens, decided by whether the source leaves anything to complete:

| After selection | Next |
| --- | --- |
| The source fully defines the object | The object is created. Land per §5. |
| Fields remain to be completed | Run the cascade in §3, with the source's values pre-filled |

The catalogue modal is a **selection** surface. It never becomes the form.

---

## 2b · When Create uses a modal

`ModalDialog` is not excluded from Create. It has three jobs, and one prohibition.

| Job | Variant | Example |
| --- | --- | --- |
| **Fill in** a standalone create, five fields or fewer | `content` | A new entity from its own list view · a user in Admin |
| **Choose** from a catalogue | `content` | Pick a template from the marketplace |
| **Converse** with an agent | `content` | `Create with AI` |
| **Confirm** before an irreversible save | `confirmation` | Publishing a tenant-wide policy |

**Prohibition:** a modal never holds a form whose fields depend on what the modal is covering. If the user has to remember, compare against, or navigate the background to complete it, the surface is a `SlideOut` — however few fields it has.

### The test that separates them

The design system's own question decides it: **can the user ignore this and keep working in the background?**

| Task | Can it be ignored? | Surface |
| --- | --- | --- |
| Filling in fields **that relate to what is on screen** | Yes — the background is what the user is drawing from | `SlideOut` |
| Filling in fields for a **standalone** object, five or fewer | No — nothing on screen contributes to the task | `ModalDialog variant="content"` |
| Choosing from a catalogue | No — the catalogue owns the screen and the decision is one act | `ModalDialog variant="content"` |
| Conversing with an agent | No — the conversation is in progress | `ModalDialog variant="content"` |
| Confirming | No | `ModalDialog variant="confirmation"` |

Stated as one line: **a `SlideOut` is for work that draws on what is behind it. A modal is for work that does not.**

A modal absolutely may hold a create form. What it may not hold is a form whose fields depend on the context it is covering — that is the actual defect, and field count was never the right way to detect it.

This also satisfies NN/g's constraint that a modal must not host a decision requiring information unavailable inside it — a catalogue modal contains everything the choice needs, which is precisely why it qualifies.

---

## 3 · The cascade — manual create

**This is a sequence, not a lookup table.** Start at 1. On a yes, stop and take that surface. On a no, go to the next step. A case never evaluates two tests as equally applicable, because it never reaches the second one.

| Step | Test | Yes | No |
| --- | --- | --- | --- |
| 1 | Does the object type declare a creation section of its own — a builder, canvas, or specialised editor? | **Hand off — navigate there** | → 2 |
| 2 | Does the flow branch, or does it have two or more stages? | **Full-page wizard — `Stepper` + `StepperNavFooter`** | → 3 |
| 3 | Can the object be created from a single field, *and* is a list of the same object type visible on screen? | **Inline create row** ⚠️ `DS-GAP` | → 4 |
| 4 | Does the new object attach to something visible on screen — a parent record, a collection inside it, the thing the user is looking at? | **`SlideOut type="full-slot"`** | → 5 |
| 5 | More than five fields? | **Full-page create form** | **`ModalDialog variant="content"`** |

### Steps 4 and 5 — contextual versus standalone

This is the split that decides between a panel and a modal, and it is the one most often got wrong.

| | Contextual create | Standalone create |
| --- | --- | --- |
| Test | The new object hangs off something on screen | Nothing on screen is its parent |
| Examples | A note on a record · a vehicle inside a customer profile · a task in a project | A new entity from its own list view · a user in Admin · an API key |
| Why | The background is what the user is drawing from. Covering it is a defect regardless of the form's size. | The background contributes nothing. A centred, focused dialog is the better container. |
| Surface | `SlideOut type="full-slot"` | `ModalDialog variant="content"` |

**Why the five-field threshold lives here and nowhere else.** A `SlideOut` grows — 350px → 450px → half screen → full screen — so no volume rule is needed on the contextual side. A modal does not grow: it is capped at 900px and can only scroll. The design system's existing rule — *"don't open a ModalDialog for forms with more than 5 fields — the user needs room"* — was written about modals, and step 5 is the only place it applies. Used anywhere else, it is a number borrowed from a problem it was not measuring.

A standalone create that exceeds five fields is not a modal that needs to be bigger. It is a dedicated view.

### Staged flows: where the line sits

Consistent with the cascade above — step 2 already resolves any flow of two or more stages, or any branching, to a full-page wizard. Staged flows never live in a panel: there is no Stepper inside a SlideOut. A single-stage flow is not staged at all; it is just a `SlideOut`.

| Shape of the flow | Surface |
| --- | --- |
| One stage | `SlideOut` |
| Two or more stages, or any branching | Full-page wizard + `Stepper` + `StepperNavFooter` |

`StepperNavFooter` is a page-level component. It never appears inside a `SlideOut`.

### No Sidebar while a full-page create surface is open

Step 2's wizard and step 5's full-page form both occupy the whole page the same way any other screen does — which means, left alone, the app's persistent `Sidebar` would still be sitting there, still clickable. That is a hazard precisely on these two surfaces: a wizard has the most stages to lose, and a form only reaches a full page by being long enough to earn one instead of a modal.

**The `Sidebar` is hidden for the duration of the flow.** `Header`'s `backButton` plus the flow's own `StepperNavFooter` (`Cancel` / `Back`) are the only ways out. It reappears the moment the flow ends — landing, or a deliberate cancel.

This does not extend to `SlideOut` or `ModalDialog`: both already sit on a backdrop that blocks the `Sidebar` without needing to hide it, so the hazard this rule addresses does not exist there.

### Step 1 is a hand-off, not a surface

Step 1 does not specify a screen. Some objects — a workflow, an agent — are built in a section of their own, and the only behaviour this pattern defines for them is **the trigger navigates there**. What that section looks like belongs to that section, not to Create.

This matters because "dedicated view" previously named two different outputs. They are not the same thing:

| Output | Who specifies it |
| --- | --- |
| Step 1 — the object's own creation section | That section. Create hands off and stops. |
| Steps 2 and 5 — full-page wizard, full-page create form | This pattern. `ScreenLayout` + `Header` CTAs, plus `StepperNavFooter` when staged. |

A case that resolves at step 1 needs no example and no preview. The rule is one sentence long.

### Test 1 is a declared property, not a list

Test 1 never enumerates object types. The object type **declares** whether it owns a workspace; the cascade reads the declaration.

Today workflows and agents declare one. Anything that gains a builder later declares it too, and this rule does not change. An enumerated list would need editing every time the platform grows — and the platform grows faster than its documentation.

### There is no volume threshold, deliberately

An earlier draft sent creates with six or more mandatory fields to a dedicated view. It was removed. Recorded here so it does not get reintroduced by reflex:

- The number was inherited from a rule about **modals**, which are fixed boxes with no escape. `SlideOut` is not that.
- Counting mandatory fields measures quantity, not effort. Six short text fields are easier than three fields where one is a long text, one a relationship search, and one a list.
- Mandatory-field counts are configured per tenant in Helix Data Studio, so the same action would resolve to different surfaces at different tenants.
- `SlideOut` already scales: 350px → 450px → half screen → full screen. A container that grows with its content does not need a rule that routes around it.

A dedicated view is earned by **what the object is** (test 1) or **how the flow is shaped** (test 2). Never by how much typing it takes.

### Why every input is observable

Each test can be answered without knowing what the object is, which is the requirement for an agent to run this unaided.

| Input | How it is observed |
| --- | --- |
| Owns a workspace | Declared by the object type |
| Branches / stage count | The flow definition |
| Creatable from a single field | Declared by the object type |
| A list of the same type is on screen | The current view |

**Dependency.** Test 3 requires the object type to declare whether it supports single-field creation. This is a boolean flag, not a field count — a lighter ask than the earlier draft made. → open question for Edgardo.

### Tie-breaking

Steps are ordered by irreversibility of the surface choice, strongest first. A case that appears to satisfy two steps resolves to the lower-numbered one, because evaluation stops at the first yes. If a real case needs an exception, **the cascade is wrong and gets rewritten** — exceptions are not granted.

**A case must never arrive at step 4 by elimination alone.** Step 4 has its own positive definition; if a case reaches it without matching that definition, the cascade has a hole and the hole gets named, not patched.

---

## 4 · Second output — is a confirmation required?

Independent of the container. Never merged into the cascade above.

| Condition | Confirmation |
| --- | --- |
| The user can undo the creation themselves — delete or archive, no external effect | **None.** Save directly. |
| The creation cannot be undone, has tenant-wide scope, or triggers effects outside the tenant | **`ModalDialog variant="confirmation"`** before saving |
| Assisted create (§2) | Always ends in a success `ModalDialog` |

Follow the existing `ModalDialog` composition rules in `CLAUDE.md`: `tone` matched to severity, title framed as a question, description stating the consequence, `ctaSecondary` always `Cancel`.

**Grounding.** NN/g is explicit that confirmation dialogs lose their protective value through repetition — *"if you cry wolf too many times, people will stop paying attention."* A confirmation on a routine create is worse than no confirmation at all.

**Open question for Edgardo:** does the Council intervene in create actions, or only in agent actions directed outside the tenant? If it intervenes, a fourth row is needed here for `ESCALATE`.

---

## 4b · Confirming that it worked

Separate from the confirmation *before* saving (§4), which is about risk. This is about whether the user can tell the create succeeded.

| Situation | Feedback |
| --- | --- |
| The created object lands somewhere visible — a list, a widget, the page you return to | **The object appearing is the confirmation.** Show it as the first row, briefly highlighted. No banner. |
| The result is not visible — an asynchronous create, a governed action awaiting Council validation, a create the user navigates away from | `useToast().success(...)` — a floating, auto-dismissing notice. See below. |
| The create was irreversible | The confirmation modal before saving already carried the weight. The landing does the rest. |

**In-flow `AlertBanner` is not the component for the invisible-result case.** Its spec defines it as a full-width notice for *system-level* feedback, and the Feedback pattern page assigns it to *persistent in-context state* — it occupies layout until dismissed and outlives the moment it was confirming.

**Toast now exists — as a placement, not a second component.** `useToast()` (`src/components/ui/toast.tsx`) renders a real `AlertBanner`, floated top-right and auto-dismissed after 3500ms, so the DS keeps one feedback language with two placements: in-flow (persistent) and floating (transient). This resolves what used to be a `DS-GAP` here. `ToastProvider` wraps the whole app once, at the true root — a create whose result is invisible can call `useToast()` from any screen with nothing to wire first. No scene in this pattern's own examples uses it yet, but the doc page's own Anatomy tab does, as a live demo.

**`DS-GAP` — Date field.** There is no `DatePicker` or `Calendar` component in the repo. Any create whose object needs a date is under-specified until one exists. Do not improvise one.

---

## 5 · Third output — where the user lands afterwards

Derived from the container. Not a separate decision.

| Surface | After create |
| --- | --- |
| Inline create row | Stays in place. The new row appears in the list, ready to create the next one. |
| `SlideOut` | Closes. The user returns to where they were; the new object appears in context. |
| `ModalDialog` — standalone create | Closes. The user returns to the list they triggered it from; the new object appears there. It does not navigate away — a standalone create of five fields or fewer is short enough that a user often makes several in a row. |
| Full-page create form / wizard | Navigates to the created object. |
| Catalogue modal — source fully defines the object | Closes. Lands as the surface it would have used had the fields been filled by hand. |
| Assisted create | Success modal → view the object, or create another. |

---

## 5b · Accessibility

While a create surface is open: focus is trapped inside the `ModalDialog` or `SlideOut`, returns to the trigger element on close, and Esc closes the surface. The primary CTA stays disabled until required fields are filled — a user should never be able to submit an incomplete create and discover the missing field from an error after the fact.

**`DS-GAP` — not yet implemented.** Verified against the component source: `ModalDialog` has no Esc-to-close handler at all, and neither `ModalDialog` nor `SlideOut` trap or return focus today. Until they do, a screen that relies on this behavior gets it by accident, not by contract.

---

## 6 · Entry points

Create is **always contextual** in v1. There is no global create affordance.

| Entry point | Component |
| --- | --- |
| List view | `Header` `primaryAction`, `variant="main"` — max one per screen |
| Empty state | `EmptyState` CTA — *"Create your first [Entity]"* |
| Inside a record, collection held by a widget | An action in **that widget's own header** |

**The trigger lives where the collection lives.** If notes are held by a Notes widget, the affordance to add one belongs in that widget, not in the page `Header`. The page `Header` CTA is reserved for the primary object of that screen — on a Worker detail page that is Run now, not Add note. Putting a child object's create action in the page Header competes with the page's own action and hides the relationship between the action and the collection it fills.

**Not in v1:** a global `+` in the `Topbar`. The `Topbar` accepts a maximum of three actions and all three are occupied. Adding one is a change to the app shell, not to this pattern.

---

## 7 · Stress test

| # | Case | Path | Surface |
| --- | --- | --- | --- |
| 1a | Create a note, notes list visible in an Overview widget | Step 3 | Inline create row |
| 1b | Create a note, no notes list on screen | Step 4 | `SlideOut` — it attaches to the record |
| 2 | Create an entity record from its own list view, 4 fields | Step 5 | `ModalDialog variant="content"` |
| 2b | Create an entity record from its own list view, 9 fields | Step 5 | Full-page create form |
| 2c | Create a secondary entity from inside its parent's profile | Step 4 | `SlideOut` |
| 2d | Create an entity record, two stages, no branching | Step 2 | Full-page wizard |
| 3 | Create a governance policy | Step 2 | Full-page wizard, **+ confirmation** |
| 4 | Create a workflow | Step 1 | Hand-off — navigate to the workflow builder. Nothing further specified. |
| 4b | Create an agent | Step 1 | Hand-off — navigate to the agent section. Nothing further specified. |
| 5 | Add a node to the canvas | **Gate 0** | Rejected — this is Configure |
| 6 | Add a template from the marketplace, template fully defines the object | Gate 1 — from a source | `ModalDialog variant="content"` → created |
| 6b | Add a template from the marketplace, fields remain | Gate 1 → Step 5 | Catalogue modal → `ModalDialog`, pre-filled — a list of the same object type on screen is not a parent, so this is standalone, not contextual |
| 7 | Create with AI | Gate 1 — assisted | Chat `ModalDialog` → success modal |

All thirteen cases resolve. No exception required.

Cases 1a and 1b resolve differently on purpose: the surface follows the entry point. That is the intended behaviour, not an ambiguity — whether a list of the same type is on screen is observable at the moment the action fires.

---

## 8 · Consequences for the component inventory

| Surface in the cascade | Status |
| --- | --- |
| Full-page create form | Exists — `ScreenLayout` + `Header` composition |
| Full-page wizard | Exists — `Stepper` + `StepperNavFooter` |
| `SlideOut` | Exists. A create panel uses `type="full-slot"` — a blank slot with no pre-built entity anatomy. Verified against the component, which accepts only `"with-variants"` and `"full-slot"`. |
| `ModalDialog variant="confirmation"` | Exists |
| `ModalDialog variant="content"` — catalogue slot, 900px max-width | Exists. The `slot` prop already accepts arbitrary content; the catalogue itself is composed inside it. |
| **Inline create row** | **Does not exist → build in `experimental/`** |
| Popover / quick create | **Not emitted by the cascade → do not build** |
| Chat component (assisted create) | Exists in Figma, not in repo → `DS-GAP`, documented only |

The cascade never selects a popover. Test 4 covers the single-field case, the default covers 2–5 fields, and `SlideOut size="m"` opens at 350px — approximately the width a popover would have. Building one would produce a component no screen imports, which fails the repo's zero-import check.

---

## 9 · Industry grounding

| Source | What it supports |
| --- | --- |
| [NN/g — Modal & Nonmodal Dialogs](https://www.nngroup.com/articles/modal-nonmodal-dialog/) | *"If it requires multiple steps to begin with, it probably justifies dedicating a full page to it."* Supports tests 1–3. Also: never use a modal for decisions needing information unavailable inside it. |
| [NN/g — Confirmation Dialogs](https://www.nngroup.com/articles/confirmation-dialog/) | Confirmations only for serious or irreversible actions; overuse destroys their value. Supports §4. |
| [NN/g — Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | Supports staging a branching flow rather than presenting all fields at once. |

### Divergence from market practice, stated deliberately

[Salesforce](https://developer.salesforce.com/docs/platform/lightning-component-reference/guide/lightning-quick-action-panel.html) creates records in a modal — its Quick Action Panel is a modal by definition. [Atlassian](https://atlassian.design/components/drawer) is deprecating its Drawer component in favour of Modal.

AIMS OS diverges: `ModalDialog` is reserved for actions the user must stop for, and never contains a create form. This is a conscious choice, backed by NN/g and already implemented across the design system. It is recorded here so that nobody later mistakes it for an oversight.

---

## 10 · Assumptions and open questions

### Assumptions made in this draft

- Create is always contextual in v1 — confirmed.
- The rule is mandatory in v1; exceptions are not granted. To be revisited only with evidence of a legitimate case that does not fit.
- The Council does not intervene in create actions. **Unverified.**
- Nested creation — a create that requires creating another object first — does not exist. **Unverified.**

### Open questions

**For Edgardo**

1. Can an object type declare whether it supports single-field creation? Test 3 needs that boolean. It does **not** need a mandatory-field count — the volume threshold was removed.
2. Can a create action require another object to be created first? Nested creation breaks the `SlideOut` container.
3. Are there objects that cannot be created from the UI at all — ingestion or agent only?
4. Does the Council intervene in create, or only in agent actions directed outside the tenant?

**For Thom**

5. Assisted create is confirmed as in scope. Which object types will offer a `Create with AI` affordance in v1?
6. Does the success modal for assisted create differ from a standard confirmation, beyond its two exits?

---

## 11 · Reconciliation required

The audit in `docs/patterns/create-audit.md` found seven conflicts across four sources. This rule resolves them as follows.

| Audit finding | Resolved by |
| --- | --- |
| C1 — multi-step create: `SlideOut` or full-page wizard? | §3 "Staged flows". Only a single stage stays in a `SlideOut`; two or more stages, or any branching, go to a full-page wizard. |
| C2 — patterns-forms contradicts its own worked example | Steps 4 and 5. The example creates a standalone record, so it was never a `SlideOut` case. Whether it should be a modal or a dedicated view now depends on its field count. |
| C3 — `SidePanel` invisible in three of four sources | Gate 0. `SidePanel` belongs to Configure and never appears in Create. Stated once, here. |
| C4 — three separately maintained copies of "modal vs SlideOut" | §2b becomes the single statement for Create. The other copies get pointers. |
| C5 — no rule covers 6–8 field, single-step, non-destructive forms | Step 5. Standalone and over five fields is a dedicated view. |
| C6 — no source separates create from edit | This document. Create is now its own axis. |
| C7 — no stated `SlideOut.type` for a create flow | §8. `type="full-slot"`, verified against the component source. |

**Not yet audited.** `patterns-slideout` and `patterns-panel-content` were outside the audit's scope but are likely to restate surface rules. They need the same pass before this rule ships.

### C8 — documentation describes a `SlideOut` API the component does not have

Found while implementing the playground. `CLAUDE.md`'s panel guidance documents three `SlideOut` `type` values — `"with-variants"`, `"filters"`, `"default"`. The component accepts **two**: `"with-variants"` and `"full-slot"`. Two of the three documented values do not exist.

This predates this pattern; an earlier draft of this rule inherited the error and specified `type="default"`. Corrected here to `type="full-slot"`, verified against `src/components/ui/slide-out.tsx`.

`CLAUDE.md` needs the same correction, and it is worth asking how a prop table drifted this far from its component — a doc that describes an API that does not compile is worse than no doc, because it is confidently wrong.

### Page-level actions

| Source | Action |
| --- | --- |
| `patterns-forms` doc page | Remove the Form Context Decision Table; replace with a pointer. Keep spacing, validation, and anatomy — that content is about composing a form, not choosing a surface. |
| `patterns-overlay` doc page | Fully absorbed. Nothing exclusive remains. Remove from the sidebar. |
| `CLAUDE.md` — "Overlays" and "Panel overlays" sections | Fold into the cascade table. Keep the `SlideOut` vs `SidePanel` distinction, which belongs to Configure and stays valid. |
| `CLAUDE.md` — anti-pattern *"Opening a Modal for non-destructive/non-blocking content"* | **Needs a precision edit.** As written it forbids two legitimate surfaces: the catalogue modal and the assisted-create chat modal. Neither is destructive, and both are correctly blocking. Rewrite the anti-pattern around the real test — *can the user ignore it and keep working?* — rather than around destructiveness. |
