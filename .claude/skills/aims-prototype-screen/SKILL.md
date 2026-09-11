---
name: aims-prototype-screen
description: Generates a complete, working PM prototype screen for the AIMS OS Design System repo (aims-os-design-system) from a single plain-language description — composes it from real DS components following CLAUDE.md's rules, registers it in the Prototypes gallery, verifies it, and ships it as a branch + PR. Use this whenever someone describes a screen, view, dashboard, list, queue, detail page, or flow they want added to this repo's "Prototypes" section — trigger on phrases like "prototype a screen for X", "generate a list view of X", "I need a screen that shows X", "add a dashboard for X", "build me a queue/detail view for X", or any description of a screen's fields/filters/actions even if the word "prototype" never appears. Do NOT use this to edit an existing screen already in src/screens/ (just edit that file directly) or to build an actual reusable DS component in src/components/ui/ (use aims-ds-component for that instead) — this is specifically for composing NEW prototype screens.
---

# AIMS OS — Prototype Screen Generator

Turn one plain-language description into a finished prototype screen: the file exists, it's built from real DS components, it shows up in the sidebar under **Prototypes**, and it's shipped as a branch + PR — all without the person describing it ever touching a component, a token, or `App.tsx` by hand.

## Why this exists

The whole value proposition of this repo (see the "DS Strategy" page in the app itself) is that a PM's prototype is built from the *exact same components* engineering will ship — not an approximation. That only holds if every screen is actually composed from `src/components/ui/` and `src/components/layouts/`, uses only `var(--token)` colors, and follows the same handful of layout patterns every other screen uses. Left unguided, it's easy to reach for a plausible-looking custom `div` instead of the real `EntityList`, and the screen silently loses hover states, token updates, and behaviors that ship with the real component. This skill exists to make the disciplined path the default path.

It deliberately doesn't re-explain rules that already live elsewhere — it points to them and applies them:
- **`CLAUDE.md`** (repo root, loaded automatically every session) — the composition ruleset AND the pre-delivery consistency checklist: List View / Detail / Filter / Overlay / navigation-depth patterns, button hierarchy, interaction pairing, token rules, spacing, anti-patterns.

If that file changes, follow the current version — this skill's job is orchestration, not being a second source of truth that can drift out of sync with the first.

## The one constraint that shapes the whole shipping step

`.github/CODEOWNERS` requires `@cachilupis` (Michael) to review any PR touching `src/App.tsx`, `src/components/`, `src/index.css`, `tailwind.config.*`, or `CLAUDE.md`. Registering a new prototype always edits `App.tsx` — one import line, one entry in the `PROTOTYPE_PAGES` array — so **every** prototype PR needs his approval before merge, even though the screen file itself lives safely in the unowned `src/screens/`. This isn't a failure state to work around; it's the intended safety net (a PM accidentally editing a shared DS file shouldn't be able to break every other prototype). Say so plainly in the PR body and in the final report — silence here reads as "something's stuck" when it's actually working as designed.

Because of this, keep the `App.tsx` diff to *exactly* those two lines, every time. That's what makes the review a 10-second glance instead of a real audit.

## Phase 0 — Guided Design Interview, then move

Phase 0 has two parts. First, auto-resolve everything technical from the description so the person never has to name a component, token, or prop. Second, run a short guided interview — one question at a time, always with a recommendation — to help them think through decisions and edge cases they might not have considered. The interview is about product thinking, not technical data gathering.

### Part A — Auto-resolve from the description

Read the description and silently resolve:

- **Entity** — what's being listed or shown ("agentes", "automations", "tickets")
- **Author** — needed for the filename; ask once at the start if genuinely missing
- **Pattern** — from the table below; infer from layout hints and quantity signals
- **Components** — from the intent-to-component table below; never ask about these
- **Defaults** — auto-apply without asking: `EmptyState` on every list, `Pagination` when items can exceed 10, Archive + Duplicate in the kebab, 24px between every nav layer

**Shape → pattern:**

| The description sounds like... | Compose as |
|---|---|
| "lista de X", "ver todos", "all X", "manage X" | List View — `ListViewSection` inside `ScreenLayout`, `Pagination` on `ScreenLayout` |
| "detalle de X", "click into X", "X detail with tabs" | Detail page — `Header` (`backButton` at depth 2, breadcrumbs at 3+) + `Tabs` (Overview always first via `WidgetCanvasView`, Logs always last via `Table`) |
| "cola", "queue", "inbox", "review these one at a time" | Master-detail — `EntityList` queue on the left, decision/detail panel on the right (see `pm-michael-attention-room.tsx` for the shape) |
| "overview", "dashboard", "KPIs", "métricas" | `WidgetCanvasView` + `HighlightIcon`/`HighlightCard` widgets |
| "form to create/edit X", "settings", "configuración" | Form/wizard — `patterns-forms` page: 16px field gap, 24px section gap, validate on blur |
| "historial", "audit log", "activity", "logs" | `Table` + `Filters` (Search · Status) + `Pagination` — Logs Table pattern |

**The complete inventory lives in `ds-index.json` — read it, do not rely on the tables below alone.**

Regenerate it first (`npm run generate:ds-index`), then read it. It lists every component in `src/components/` with the description from its catalog spec, its import path, and how many screens use it today. The tables in this file are curated shortcuts for the common cases; the index is the full set.

Search the index before writing a single component of your own. The tables below have covered roughly a quarter of the DS, and everything outside that quarter got improvised — `Stepper`, `Breadcrumb` and `SwitchTab` were each rebuilt by hand in prototypes while the real component sat unused. If a description in the index matches what you need, import it.

Two fields worth reading carefully:

- `usedInScreens: 0` does **not** mean "not needed". `Avatar`, `ProgressBar` and `Badge` are all at zero and all three are hand-rolled across half a dozen screens. Zero usage plus a matching description means invisible, not useless — that is exactly the component you should be importing.
- `description: null` means nobody has written what the component is for. Do not guess from its name. Open the source, and say so in your final report so it gets a description.

**Intent → component (resolved silently, never asked):**

| PM says | Resolved to |
|---|---|
| "filtros", "filtrar por", "buscar por campo" | `<Filters>` slots + `<FiltersSlideout>` wired with apply/reset |
| "buscar", "search" | Search slot inside `<Filters>` |
| "preview", "panel lateral", "ver detalles rápido" | Eye button in `EntityList actions` + `<SlideOut type="with-variants">` |
| "crear", "nuevo", "agregar" | `<Button variant="main">` in `Header.primaryAction` |
| "archivar" | Kebab → Archive option + `<ModalDialog tone="warning" iconName="Archive">` |
| "eliminar", "borrar", "delete" | Kebab → Delete option + `<ModalDialog tone="error" iconName="Trash2" ctaPrimary.destructive>` |
| "tabs", "pestañas", "secciones" | `<Tabs>` — Overview always first, Logs always last |
| "tabla", "columnas" | `<Table>` as tab content or inside `ListViewSection` |
| "métricas", "KPIs", "estadísticas" | `<WidgetCanvasView>` + `<HighlightCard>` via `KpiContent` |
| "actividad reciente", "últimas acciones" | `<Table size="sm">` widget slot inside `WidgetCanvasView` |
| "estado", "activo/inactivo", "status" | `<Tag>` on entity card — `success`/`neutral`/`error` by state |
| "toggle", "activar/desactivar" | `<Toggle>` in SlideOut Config tab or inline in table row |

Before writing anything, skim one existing screen in `src/screens/` with the same shape (e.g. `pm-lex-htl-work-queue.tsx` for a queue) — it's faster to match a working structure than to reconstruct one from CLAUDE.md prose each time.

### Part B — Guided design interview

After auto-resolving, run the interview. **Ask one question at a time. Always include your recommendation. Wait for the answer before the next question.** A one-word "sí" accepts the recommendation and moves on.

The interview has two rounds. Never skip Round 2 — it's where most prototype gaps live.

**Round 1 — Core spec (up to 5 questions)**

Run only the questions where the description left a genuine decision open. Skip any whose answer is already clear from the description.

> **Pattern confirm** (only if ambiguous after Part A)
> "¿Esta pantalla muestra una lista de [entidad] o el detalle de una sola?"
> *Mi recomendación: Lista con filtros, por las señales en tu descripción.*

> **Author** (only if missing)
> "¿Cuál es tu nombre para el nombre del archivo?"

> **Item actions**
> "¿Qué puede hacer el usuario con cada [entidad] en la lista?"
> *Mi recomendación: Preview en panel lateral + Archive + Duplicate en el menú de opciones. ¿Agregamos Delete o alguna acción específica del dominio?*

> **Filters**
> "¿Por qué campos puede filtrar el usuario?"
> *Mi recomendación: Status + Type como filtros visibles, con 'All Filters' para filtros avanzados.*

> **Header action**
> "¿Hay una acción principal para crear un nuevo [entidad]?"
> *Mi recomendación: Botón 'New [Entidad]' en el header. ¿O esta pantalla es solo de lectura?*

**Round 2 — Edge cases (always ask all 5, one at a time)**

Introduce Round 2 with:
> "Antes de generar el código, quiero que pensemos en algunos casos que se suelen omitir:"

> **Q6 — Empty states**
> "¿Qué ve el usuario si no hay ningún [entidad] todavía (primera visita) versus si sus filtros no dan resultados?"
> *Mi recomendación: Dos variantes distintas — 'No [entidades] todavía' con CTA de crear, y 'Sin resultados' con CTA de limpiar filtros. ¿Hay algún caso más específico que quieras cubrir?*

> **Q7 — Errors and failures**
> "Si el usuario intenta archivar o eliminar un ítem y la operación falla, ¿qué debería pasar?"
> *Mi recomendación: Toast de error genérico. ¿Hay casos donde el fallo sea esperado — por ejemplo, el ítem está en uso o el usuario no tiene permisos — y necesite un mensaje específico?*

> **Q8 — Permissions**
> "¿Todos los usuarios que acceden a esta pantalla pueden hacer todas las acciones, o hay roles con acceso restringido?"
> *Mi recomendación: Asumir acceso completo en V1 y marcar con `// DS-GAP: RBAC` donde irían las restricciones. ¿Hay alguna acción que definitivamente no deben ver ciertos roles?*

> **Q9 — Data volume**
> "¿Cuántos registros hay típicamente en esta lista — decenas, cientos, miles?"
> *Mi recomendación: Pagination con page size 10 si puede superar 20 registros. ¿Hay un límite real del backend que debamos reflejar en el prototipo?*

> **Q10 — Creation flow**
> "Cuando el usuario hace clic en 'New [Entidad]': ¿[Entidad] tiene su propia sección de construcción (builder/canvas, como un workflow)? Si no, ¿el nuevo [Entidad] cuelga de algo que ya está en pantalla (un registro padre, una colección dentro de él) o es standalone (nada en pantalla es su padre)? Y el flujo, ¿es de una sola pantalla o tiene 2+ etapas / se ramifica?"
> *Mi recomendación — corro el cascade del patrón Create (`CLAUDE.md` → "Create pattern — surface selection", `docs/patterns/create.md` es la fuente completa): si tiene builder propio → hand-off, no se especifica más aquí; si son 2+ etapas o rama → wizard de página completa (`Stepper` + `StepperNavFooter`), nunca un `SlideOut`; si cuelga de algo en pantalla → `SlideOut type="full-slot"` (sin importar cuántos campos — un `SlideOut` crece, no necesita el umbral de 5); si es standalone → `ModalDialog variant="content"` con 5 campos o menos, pantalla completa por encima de 5. ¿Cuál de estos casos aplica?*
>
> También preguntar, sin bloquear el flujo si la respuesta es obvia: **¿la creación necesita confirmación antes de guardar?** (solo si es irreversible o de alcance tenant-wide — `ModalDialog variant="confirmation"`) y **¿el resultado queda visible de inmediato?** (si no — una creación async, una acción gobernada esperando aprobación — usar `useToast().success(...)`, ya disponible en toda la app vía `ToastProvider` en la raíz; si sí, el objeto apareciendo en la lista ya es la confirmación, sin banner).

### Part C — Structured spec before Phase 1

After Round 2, show the resolved spec and wait for a final confirm before writing any code:

```
Entity:     [Entidad, plural]
Pattern:    [nombre del patrón]
Author:     [nombre]
File:       src/screens/pm-[author]-[feature].tsx

Core spec:
  Header CTA:   [acción principal o "read-only"]
  Filters:      [slots inferidos]
  Item actions: [lista de acciones]

Edge cases covered:
  EmptyState/global:    "[texto]" + CTA [acción]
  EmptyState/filtered:  "[texto]" + CTA limpiar filtros
  Error action:         [toast genérico / mensaje específico]
  Permissions:          [V1 full access / restricciones marcadas]
  Volume:               Pagination page [n], max [n] registros
  Creation:             [modal / pantalla / slide-out] ([n] campos)

Auto-applied (not asked):
  EmptyState, Pagination, 24px nav gaps, Archive + Duplicate defaults

Mock data:
  [3–5 campos realistas inferidos del tipo de entidad]
  [Valores enterprise: nombres reales, fechas, IDs — nunca Lorem ipsum]

¿Confirmamos o ajustamos algo antes de escribir el código?
```

A one-word "sí" or "yes" is enough to proceed to Phase 1.

## Phase 1 — Compose

**Start by running `aims-ds-search`** for every non-trivial element the spec
calls for. Not as a formality: this repo has rebuilt Breadcrumb, ProcessItem,
Stepper (twice), Filters and three separate WidgetGlyphs, every one of them
because somebody searched badly rather than not at all. The skill also checks
open PRs — a PM may be building the same thing right now.


File: `src/screens/pm-[author]-[feature].tsx`, one default-exported component. A handful of things are non-negotiable, and here's the reasoning for each so it's clear these aren't arbitrary:

- **Always wrap in `ScreenLayout`.** It bakes in the exact DS margin/scroll/sticky-header spec — hand-assembling Topbar + Sidebar + AppBackground yourself is how those values quietly drift screen to screen.
- **Only components the design system already has** — `src/components/ui/`, `src/components/layouts/`, and `src/components/experimental/`. That last one is not a loophole, it is the point: a candidate is something a previous prototype needed and built properly, and reusing it is how it earns its way into the catalog. `ds-index.json` lists all three with a `tier` field. A custom lookalike passes a glance but loses the real component's hover states, token bindings and accessibility — and the bugs are invisible until runtime.
- **Only `var(--token)` colors, zero hex/rgba.** If the token you need doesn't exist yet, say so rather than approximating with a raw value — a slightly-off color is a worse outcome than a flagged gap.
- **`Pagination` lives on `ScreenLayout`'s `pagination` prop**, never inline in the list, and only when `total > pageSize` (enforced by the component itself now, not just convention).
- **Realistic mock data** — real-sounding names, dates, IDs, statuses. "Item 1" and "Lorem ipsum" undercut the entire point, which is a prototype that looks real enough for a stakeholder to react to.
- **Wire every interactive element the description implies.** A filter chip's `onOpen`/`onRemove`, a row action's `onClick` — nothing left silently inert.
- If the description genuinely needs something with no DS equivalent, don't improvise silently: try composing existing components first, then follow `CLAUDE.md`'s "When a PM needs a UI element the DS doesn't have yet" (a `src/components/experimental/` file with a `// DS-GAP:` comment on line 1). Flag it by name in the final report so it gets triaged.

## Phase 2 — Register

Exactly two lines added to `App.tsx`, placed with their siblings — nothing else in the file touched:

```tsx
// grouped with the other `import ... from "./screens/pm-..."` lines near the top
import MyScreen from "./screens/pm-[author]-[feature]"
```

```tsx
// one new entry inside the PROTOTYPE_PAGES array
{ id: "proto-[author]-[feature]", label: "[Human label] — [Author]", description: "[one sentence on what it demonstrates]", author: "[Author]", category: "[one of PROTOTYPE_CATEGORIES]", addedOn: "[today, YYYY-MM-DD]", component: MyScreen },
```

`category` must be one of the values in `PROTOTYPE_CATEGORIES`, declared just above the registry in `App.tsx` — pick the closest existing area rather than inventing a seventh for a single screen. `tsc` rejects anything else. `addedOn` is today's date.

`id` becomes the shareable link once deployed: `https://aimsos.github.io/aims-os-design-system/?proto=proto-[author]-[feature]` — keep it a lowercase, hyphenated slug.

## Phase 3 — Verify before calling it done

Passing `tsc` is necessary, not sufficient — a screen can type-check cleanly and still render wrong. Run, in order:

1. `npx tsc -b --noEmit` → zero errors.
2. Start/confirm the dev server and screenshot the screen in the browser — every tab and state the description implies, including the empty state if the dataset can legitimately be empty.

**What to look for.** A screenshot only helps if you know what you are hunting.
Every item below is something that shipped in this repo while `tsc` and the
audit were both green:

- **Content clipped by a fixed height.** A widget slot, a card, a panel. The
  last row of a four-row list vanishing is invisible unless you count the rows.
- **Double padding.** A container that insets its own children *and* sits inside
  something that already inset it. The tell is a body that starts further in
  than its own title — `WidgetFather` gives 24px and content added another 16.
- **Labels wrapping to two lines.** Harmless-looking, but it grows a 37px row to
  55, and four of those overflow a fixed-height container and eat a row.
- **Content under a sticky footer.** `StepperNavFooter` is 72px against
  ScreenLayout's 64px bottom padding.
- **An empty state that does not fit its container.** The default `EmptyState`
  is 64px of vertical padding and clips its own CTA inside a widget. Use
  `compact`.
- **The same thing looking different in two screens.** Open both. This is the
  only way to catch drift — each screen is internally consistent, so nothing
  looks wrong until they are side by side.

Check at **1440px** (the DS baseline) and again in a **narrow column**, and in
both themes.
3. `grep -n 'rgba\|#[0-9a-fA-F]\{3,6\}' src/screens/pm-[author]-[feature].tsx` → must return nothing.
4. Confirm by re-reading the file: every filter/tab/sort change resets pagination to page 1, `showAllFilters` has `onAllFiltersClick` wired to a real slideout, every `SlideOut`/`ModalDialog` has `onClose` wired and never a hardcoded `open`.

Only move to shipping once all four are clean.

## Phase 4 — Ship

Same branch/commit/PR conventions already used across this repo's history, so every prototype PR reads the same way:

```bash
git checkout -b pm-[author]/[feature-slug]
git add src/screens/pm-[author]-[feature].tsx src/App.tsx
git commit -m "Add [human label] prototype screen"
git push -u origin pm-[author]/[feature-slug]
gh pr create --title "Add [human label] prototype screen" --body "$(cat <<'EOF'
## Summary
- New PM prototype: [one-sentence description], authored by [Author].
- Adds `src/screens/pm-[author]-[feature].tsx` and registers it in `PROTOTYPE_PAGES`.
- Preview once merged: `?proto=proto-[author]-[feature]`

## Note for review
Touches `src/App.tsx` (2 lines: import + registry entry) to register the screen — CODEOWNERS requires @cachilupis's review for that file. Everything else is new, isolated screen code.

## Test plan
- [x] `npm run build` clean
- [x] Every tab/state screenshotted in the browser
- [x] No hardcoded colors (grep clean)
- [x] Every interactive element wired; pagination resets on filter/tab/sort change
EOF
)"
```

Poll `gh pr checks <number>` until Vercel finishes, pull the preview URL from the Vercel bot's PR comment, and include it in the final report.

## Final report — always include

- The file path created.
- The prototype `id` and the `?proto=` URL it'll resolve to once deployed.
- The PR link, with an explicit note that it's waiting on Michael's CODEOWNERS review (don't let silence here be misread as something being stuck).
- Any `// DS-GAP:` comments left in the code, named individually so they're easy to triage.
- The screenshot(s) from Phase 3.

## What tends to go wrong without this discipline

- Hand-building the layout instead of `ScreenLayout` — loses the margin/scroll/sticky-header behavior for free, and it's not obvious until someone compares it side-by-side with another screen.
- A custom div standing in for `EntityList`/`Tabs`/`Filters` — looks right, breaks on hover/focus, stops tracking DS token updates.
- An `App.tsx` diff bigger than the two required lines — turns a rubber-stamp CODEOWNERS review into a real one, and slows down every future PM's PR behind it.
- Calling it done because `tsc` passed, without ever opening the browser.
- Placeholder data that never gets replaced with something a stakeholder would actually recognize as real.
- Skipping the "read one similar screen first" step and re-deriving a structure that already exists in `src/screens/`.
