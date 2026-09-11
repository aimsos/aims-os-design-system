/**
 * UCP — Contacts list.
 *
 * The entry point into the Unified Contact Profile. One roster for the three
 * record types AIMS OS keeps profiles for — People, Employees and Companies —
 * because the profile behind them is the same surface either way.
 *
 * Records arrive through ingestion and account sync, and can also be created
 * here. The Header's primary CTA names the entity type of the active tab —
 * Create New Contact on All, then Person / Employee / Company — because a
 * generic "Create" on a roster of three types does not say what it will make.
 *
 * A record created here has no `source`: source is the system a record was
 * pulled FROM, and per the Entity Header spec the slot is removed rather than
 * refilled when the entity was created in the platform itself.
 *
 * Navigation: Tabs (record type) → Filters. Cards are the only layout in this
 * version — the DS's SwitchTab is not shown by default and a table view is not
 * in scope yet. Row click opens the profile; the Eye opens a preview without
 * leaving the list.
 */

import { useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ScreenLayout }      from "@/components/layouts/screen-layout"
import { Header }            from "@/components/ui/header"
import { Filters }           from "@/components/ui/filters"
import { FiltersSlideout }   from "@/components/ui/filters-slideout"
import { Menu, MenuItem }    from "@/components/ui/menu-item"
import { Button }            from "@/components/ui/button"
import { CardContainer }     from "@/components/ui/card-container"
import { EntityList }        from "@/components/ui/entity-list"
import type { EntityListItemData } from "@/components/ui/entity-list"
import { EmptyState }        from "@/components/ui/empty-state"
import { Pagination }        from "@/components/ui/pagination"
import { SlideOut }          from "@/components/ui/slide-out"
import { ModalDialog }       from "@/components/ui/modal-dialog"
import { HighlightIcon }     from "@/components/ui/highlight-icon"
import type { HighlightIconVariant } from "@/components/ui/highlight-icon"
import { Tooltip }           from "@/components/ui/tooltip"
import { AiSummaryWidget }   from "@/components/experimental/ai-summary-widget"
import { Input }             from "@/components/ui/input"
import { Select }            from "@/components/ui/select"
import { RadioGroup }        from "@/components/ui/radio"
import { Stepper }           from "@/components/ui/stepper"
import type { StepItem }     from "@/components/ui/stepper"
import { StepperNavFooter }  from "@/components/ui/stepper-nav-footer"
import { Tag }               from "@/components/ui/tag"
import { InformativeCard }   from "@/components/ui/informative-card"
import { useToast }          from "@/components/ui/toast"
import { anchorFromElement, anchorFromEvent, useDropdownPosition } from "@/lib/dropdown-anchor"
import type { DropdownAnchor } from "@/lib/dropdown-anchor"
import { Plus, Lock, Trash2, Search, PanelLeftOpen, PanelLeftClose, Contact as ContactIcon } from "lucide-react"
import { UcpProfileView, UCP_SIDEBAR_ITEMS } from "./pm-thomas-ucp-profile"
import { facetsForType, facetValue, facetOptions } from "./ucpTypeModel"
import {
  PANEL_CONTENT_CLASS, toAiInsights,
  CONTACTS, PEOPLE_TYPES, CONTACT_TYPES,
  TYPE_ICON, TYPE_LABEL, TYPE_PLURAL, TYPE_TAG, entityState, restrictionFor,
  getActivity, getDrives, getFacts,
  matchExistingRecords, CREATE_LOCATIONS, CREATE_OWNERS,
} from "./ucpShared"
import type { CreateMatch, UcpContact, UcpEntityType } from "./ucpShared"

const PAGE_SIZE = 10

/**
 * ── The tab bar at seven entity types ──────────────────────────────────────
 *
 * Tabs work while there are few types and stop working when there are many,
 * and "many" arrives on its own: an entity type is whatever Helix Data Studio
 * publishes, so this roster starts at Customers / Employees / Companies and
 * ends up with repair orders, policies and assets beside them.
 *
 * The answer is the one Salesforce, HubSpot and Notion all landed on: the bar
 * shows a SUBSET the user chooses, and a `+` adds the rest. Salesforce calls
 * it "Add More Items", HubSpot caps pinned views and puts the rest behind a
 * menu, Notion gives each tab a `···`. None of them tries to show everything.
 *
 * Two rules make it safe rather than clever:
 *   · the picker IS the manager — one checkbox list does show AND hide, so
 *     there is no second "remove tab" flow to find
 *   · the tab you are on is never hidden, and the bar never empties
 *
 * The cap is 6, HubSpot's mechanic: past it, adding asks you to remove. A bar
 * that wraps to a second line is not a bar any more, and unlimited tabs is how
 * every one of these products ended up needing a picker in the first place.
 *
 * Past ~12 types this stops being enough and the type belongs in the Sidebar,
 * with the tabs left as the user's own shortlist. That threshold is a decision
 * to take when it arrives, not to build for now.
 */
const ALL_TYPE_TABS: { id: string; label: string; type: UcpEntityType | "all" }[] = [
  // "All" is not a type. It works today because the first three are all
  // person-shaped records that share columns and filters; a repair order beside
  // a person is where it stops meaning anything, and its replacement is the
  // global search rather than a wider table.
  { id: "all", label: "All", type: "all" },
  ...(["person", "employee", "company"] as UcpEntityType[])
    .map(t => ({ id: t, label: TYPE_PLURAL[t], type: t })),
]

/* DEFAULT_TAB_IDS and MAX_VISIBLE_TABS lived here. Both were answers to "a
   horizontal bar runs out of room", and the rail is vertical — it shows every
   category, so there is no default subset to pick and no ceiling to enforce. */

/**
 * The create CTA names what it will make, so it tracks the active tab. On All
 * the roster is mixed, so the label falls back to the module's own noun and the
 * form asks for the type.
 */
const CREATE_LABEL: Record<string, string> = {
  all: "Create New Contact",
  ...Object.fromEntries(
    (["person", "employee", "company", "policy", "asset"] as UcpEntityType[])
      .map(t => [t, `Create New ${TYPE_LABEL[t]}`]),
  ),
}

/**
 * ── Which fields the create form asks for, per type ────────────────────────
 *
 * FIVE, AND FIVE IS NOT A COINCIDENCE. The Create pattern's cascade ends at
 * step 5 with a threshold: a standalone create of five fields or fewer is a
 * `ModalDialog variant="content"`, and above that it is a full-page form. The
 * contact fields Michael specified come to exactly five — name, email, phone,
 * location, owner — so the modal is what the pattern gives it, and the other
 * four types are kept at five so that one roster does not open two different
 * surfaces depending on which tab you were standing on.
 *
 * Trimming was the price of that, and each cut went to a field the record
 * gets somewhere better: an employee's access role is set in People & Access,
 * a company's primary contact is a link you make once both records exist, and
 * headcount is a number that arrives from the sync rather than from a form.
 *
 * `optional` is real, not decorative: the primary CTA unlocks without it. A
 * phone nobody has yet and an owner nobody has decided are both normal states
 * for a record created the moment somebody appears in an inbox.
 */
/**
 * `repeat` is the phone field generalised — Michael, 2026-09-11 asked for
 * secondary emails with a primary selector, "igual a como lo haces en número
 * de teléfono".
 *
 * It was `"phones"`, a kind named after one field, with its list and its
 * primary index held in two `useState`s called `phones` and `primary`. A
 * second repeatable field would have meant a third and fourth state with the
 * same shape and a renderer copied beside it. The kind is now about the
 * BEHAVIOUR — one or many, one of them primary — and the lists live in a
 * record keyed by field, so a third one costs a line in CREATE_FIELDS.
 */
type CreateFieldKind = "text" | "select" | "search" | "repeat"

interface CreateField {
  key:       string
  label:     string
  kind:      CreateFieldKind
  optional?: boolean
  options?:  string[]
  /** `repeat` only: what one entry is called, for the placeholder and the
   *  add button. "number", "email address". */
  noun?:     string
}

const CREATE_FIELDS: Record<UcpEntityType, CreateField[]> = {
  person: [
    { key: "name",     label: "Full name",     kind: "text"                                        },
    { key: "email",    label: "Email",         kind: "text"                                        },
    { key: "phones",   label: "Phone",         kind: "repeat", noun: "number", optional: true      },
    { key: "location", label: "Location",      kind: "select", options: CREATE_LOCATIONS           },
    { key: "owner",    label: "Account owner", kind: "search", options: CREATE_OWNERS, optional: true },
  ],
  employee: [
    { key: "name",       label: "Full name",  kind: "text"                                  },
    { key: "email",      label: "Work email", kind: "text"                                  },
    { key: "phones",     label: "Phone",      kind: "repeat", noun: "number", optional: true },
    { key: "department", label: "Department", kind: "text"                                  },
    { key: "location",   label: "Location",   kind: "select", options: CREATE_LOCATIONS     },
  ],
  company: [
    /* "Company name", not "Legal name" — Michael, 2026-09-11. The legal
       entity is a governance fact that arrives with the contract; what
       somebody types into a create form is what the company is called. */
    { key: "name",     label: "Company name",  kind: "text"                                        },
    /* "Mail", and repeatable. An organisation has a billing address, an AP
       address and whoever actually answers — one field forced a choice the
       record should not have to make. */
    { key: "emails",   label: "Mail",          kind: "repeat", noun: "email address"               },
    { key: "phones",   label: "Phone",         kind: "repeat", noun: "number", optional: true      },
    { key: "location", label: "Headquarters",  kind: "select", options: CREATE_LOCATIONS           },
    { key: "owner",    label: "Account owner", kind: "search", options: CREATE_OWNERS, optional: true },
  ],
  // A create form asks what the OBJECT needs, never what the pattern needs.
  // Nothing about these two is person-shaped, and that is the whole reason
  // they are in this prototype — no email, no phone, so no duplicate check
  // either: there is no field here this data treats as unique.
  policy: [
    { key: "name",   label: "Policy name",    kind: "text"                              },
    { key: "scope",  label: "Scope",          kind: "text"                              },
    { key: "owner",  label: "Owner",          kind: "search", options: CREATE_OWNERS    },
    { key: "from",   label: "Effective date", kind: "text"                              },
    { key: "cycle",  label: "Review cycle",   kind: "text",   optional: true            },
  ],
  asset: [
    { key: "name",      label: "Asset code",   kind: "text"                              },
    { key: "kind",      label: "Type",         kind: "text"                              },
    { key: "location",  label: "Assigned site", kind: "select", options: CREATE_LOCATIONS },
    { key: "acquired",  label: "Acquired",     kind: "text"                              },
    { key: "custodian", label: "Custodian",    kind: "search", options: CREATE_OWNERS, optional: true },
  ],
}

/**
 * The types this flow offers, and it is two of the five.
 *
 * One reason covers all three exclusions: none of them is a person somebody
 * meets and types in. An employee arrives from Workday, a policy is authored
 * in Governance, a fleet asset comes off the DMS sync. They keep their roster
 * tabs — the records exist and are governed — and lose the claim that a form
 * called "New contact" is where they come from. Employee went last, on
 * Michael's instruction (2026-09-10); the other two went with the modal.
 *
 * Their field lists stay in CREATE_FIELDS for whenever they get a create
 * surface of their own. Nothing here offers one.
 */
const CREATABLE_TYPES: UcpEntityType[] = ["person", "company"]

type SortKey = "recent" | "name" | "owner"

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Last interaction" },
  { key: "name",   label: "Name A\u2192Z"     },
  { key: "owner",  label: "Owner"             },
]


// The roster concierge lived here — a SlideOut chat opened by an `Ask` button
// in the page Header. Michael took the button out (2026-09-10), and the panel
// went with it: nothing else could open it, so keeping it would have left an
// unreachable surface in the file and an unused import behind it. The record's
// own concierge is untouched — it opens from the Entity Header's `Ask`, which
// is a different thing: that one answers about one record from its own planes.
// ── Create ────────────────────────────────────────────────────────────────────
/**
 * ── Creating a contact is a full page with a Stepper ───────────────────────
 *
 * THIS SURFACE HAS MOVED TWICE, and both moves are worth keeping written down
 * because the reasoning is what makes the current one right rather than just
 * newest.
 *
 * It began as a `SlideOut`, justified with "a create form is non-destructive,
 * so it is a SlideOut and not a ModalDialog". That is not the test — the
 * Create pattern's test is whether the user can ignore the surface and keep
 * working in the background — so it became a `ModalDialog variant="content"`,
 * which is where the cascade lands a standalone five-field create.
 *
 * Michael then asked for stages (2026-09-10), and stages change the answer
 * outright. The pattern's staged-flows table has exactly two rows: one stage
 * is a panel, and "two or more stages, or any branching" is a full-page wizard
 * with `Stepper` and `StepperNavFooter`. There is no `Stepper` inside a modal
 * and no `StepperNavFooter` inside a panel, so this is not a preference.
 *
 * WHY THE STAGES ARE NOT PADDING ON FIVE FIELDS. They are three different
 * questions, and the first one is a gate:
 *
 *   1 · Identity   Who is this, and does the platform already know them?
 *                  The duplicate check lives here and BLOCKS here. A known
 *                  duplicate should never be carried through two more stages
 *                  to be refused at the end.
 *   2 · Details    How to reach them and who owns the relationship.
 *   3 · Review     What is about to be written, and what happens to it. A
 *                  record created by hand starts on the Sandbox Plane rather
 *                  than arriving attested from a source system, and that is a
 *                  governance consequence — it gets stated before the button
 *                  that causes it, not in a toast afterwards.
 *
 * NO SIDEBAR for the duration (`hideSidebar`) — the pattern's own rule for
 * full-page create surfaces, so the only ways out are the Header's back arrow
 * and the footer's Cancel. `Header` carries a title and `backButton` only; the
 * flow completes in the footer and never in the bar.
 */
const WIZARD_STEPS = ["Identity", "Details", "Review"] as const

function CreateContactWizard({
  lockedType, onCancel, onCreate, onOpenRecord,
}: {
  /** The tab the user pressed the CTA on, when it names a creatable type. */
  lockedType:   UcpEntityType | null
  onCancel:     () => void
  onCreate:     (type: UcpEntityType, name: string) => void
  /** The duplicate card's way out: open the record that already exists. */
  onOpenRecord: (id: string) => void
}) {
  const [step,   setStep]   = useState<0 | 1 | 2>(0)
  const [type,   setType]   = useState<UcpEntityType>(
    lockedType && CREATABLE_TYPES.includes(lockedType) ? lockedType : "person",
  )
  const [values, setValues] = useState<Record<string, string>>({})
  const [tried,  setTried]  = useState(false)
  /** Every repeatable field's rows, keyed by field. Each starts as a single
   *  empty row — an optional field still shows one line, or nobody discovers
   *  it is there. */
  const [lists, setLists] = useState<Record<string, string[]>>({})
  /** Which row of each list is primary. */
  const [primaries, setPrimaries] = useState<Record<string, number>>({})

  const rowsOf    = (key: string) => lists[key] ?? [""]
  /* Declared HERE, with the other readers, because the duplicate-check memo
     below closes over it — a `const` arrow used above its own declaration is
     a temporal-dead-zone crash at first render, not a type error, so tsc says
     nothing and the screen goes blank. */
  const filledOf  = (key: string) => rowsOf(key).map(v => v.trim()).filter(Boolean)
  const primaryOf = (key: string) => primaries[key] ?? 0
  const setRows   = (key: string, next: string[]) => setLists(m => ({ ...m, [key]: next }))
  /** The phone list, which the duplicate check reads. */
  const phones    = rowsOf("phones")
  /** Which Select or search field has its Menu open, and where to anchor it. */
  const [openSel, setOpenSel] = useState<string | null>(null)
  const [selAnchor, setSelAnchor] = useState<DropdownAnchor | null>(null)
  const selDrop = useDropdownPosition(selAnchor)
  /** What has been typed into a `search` field, kept apart from `values` so
   *  that abandoning a search without picking anything leaves the committed
   *  value alone. */
  const [query, setQuery] = useState<Record<string, string>>({})

  const fields = CREATE_FIELDS[type]
  const byKey  = (k: string) => fields.find(f => f.key === k)
  /* IDENTITY IS NAME + HOW YOU REACH THEM BY MAIL, whatever that field is
     called for this type — "email" on a person, "emails" on a company since
     an organisation has several. Listing only "email" here silently dropped
     the company's Mail field from the form: it was declared in CREATE_FIELDS,
     belonged to no stage, and therefore rendered nowhere. */
  const STEP_KEYS: Record<0 | 1, string[]> = {
    0: ["name", "email", "emails"],
    1: ["phones", "location", "owner"],
  }
  const stepFields = (i: 0 | 1) =>
    STEP_KEYS[i].map(byKey).filter((f): f is CreateField => !!f)

  /**
   * The duplicate check, and it runs on every keystroke rather than on blur.
   * Blur is the tempting choice — fewer lookups, no card appearing mid-word —
   * and it is the wrong one: the card that matters appears when the email is
   * COMPLETE, and a blur-triggered check has by then let the user move to the
   * next field and start filling in a record that will not be created.
   */
  const match: CreateMatch | null = useMemo(
    /* The email a company types into its repeatable list counts for the
       duplicate check exactly as a person's single field does — the primary
       one, since that is the address the record will be known by. */
    () => matchExistingRecords({
      name:   values.name,
      email:  values.email ?? filledOf("emails")[primaryOf("emails")],
      phones,
    }),
    [values.name, values.email, lists, primaries, phones],
  )
  const blocked = match?.blocks === true

  const missingIn = (i: 0 | 1) => stepFields(i).filter(f =>
    f.optional ? false
      : f.kind === "repeat" ? rowsOf(f.key).every(v => v.trim() === "")
      : (values[f.key] ?? "").trim() === "",
  )
  const missing = missingIn(step === 2 ? 1 : (step as 0 | 1))

  /* Identity cannot be left with a KNOWN duplicate. The two email cases are
     certain — an email is the one field this data treats as unique — so Next
     is closed and the card carries the way out. A phone or a name match warns
     and lets the user through: a switchboard is not a duplicate, and the
     person filling the form is the one who knows which it is. */
  const canContinue = step === 0 ? missingIn(0).length === 0 && !blocked
                    : step === 1 ? missingIn(1).length === 0
                    : true

  const steps: StepItem[] = WIZARD_STEPS.map((label, i) => ({
    label,
    state: step === i ? "active" : step > i ? "completed" : "default",
    ...(step < i ? { hint: `Complete ${WIZARD_STEPS[i - 1]} first.` } : {}),
  }))

  const setRow = (key: string, i: number, v: string) =>
    setRows(key, rowsOf(key).map((x, j) => (j === i ? v : x)))

  const removeRow = (key: string, i: number) => {
    const next = rowsOf(key).filter((_, j) => j !== i)
    setRows(key, next)
    // The primary moves with the list and never past its end. Deleting the
    // primary promotes the row that took its place.
    setPrimaries(m => {
      const pi = m[key] ?? 0
      return { ...m, [key]: i < pi ? pi - 1 : Math.min(pi, next.length - 1) }
    })
  }


  const field = (f: CreateField) => {
    const invalid = tried && !f.optional && missing.includes(f)

    if (f.kind === "repeat") {
      const rows    = rowsOf(f.key)
      const primary = primaryOf(f.key)
      const noun    = f.noun ?? "entry"
      return (
        <div key={f.key}>
          <FormLabel optional={f.optional} hint={`More than one is fine — mark which to use first.`}>
            {f.label}
          </FormLabel>
          {/*
            THE PRIMARY IS A RADIO, AND IT ONLY EXISTS FROM THE SECOND ROW ON.
            One entry is the primary by definition, and a radio group of one is
            a control that cannot be used — it renders a selected dot the user
            can neither change nor understand. It appears when there is a
            choice to make. A radio and not a Chip because these are mutually
            exclusive: selecting one deselects the rest, which is the one thing
            a Chip row does not promise.
          */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rows.map((value, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {rows.length > 1 && (
                  <RadioGroup
                    legend={`Use ${noun} ${i + 1} first`}
                    hideLegend
                    size="sm"
                    value={primary === i ? "on" : ""}
                    onChange={() => setPrimaries(m => ({ ...m, [f.key]: i }))}
                    options={[{ value: "on", label: "" }]}
                    name={`primary-${f.key}-${i}`}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <Input
                    placeholder={i === 0
                      ? (f.key === "phones" ? "+1 (555) 000-0000" : "name@company.com")
                      : `Another ${noun}`}
                    value={value}
                    onChange={e => setRow(f.key, i, e.target.value)}
                  />
                </div>
                {rows.length > 1 && (
                  <Tooltip content={`Remove this ${noun}`} side="cursor">
                    <Button variant="tertiary" size="sm" onClick={() => removeRow(f.key, i)} aria-label={`Remove this ${noun}`}>
                      <Trash2 size={14} />
                    </Button>
                  </Tooltip>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 8 }}>
            <Button variant="tertiary" size="sm" onClick={() => setRows(f.key, [...rows, ""])}>
              <Plus size={12} /> {`Add another ${noun}`}
            </Button>
            {rows.length > 1 && (
              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                {rows[primary]?.trim() ? `${rows[primary].trim()} is primary` : `Pick the primary ${noun}`}
              </span>
            )}
          </div>
        </div>
      )
    }

    /*
      A SEARCH FIELD, NOT A SELECT — Michael, 2026-09-10: "en Account owner haz
      que sea un campo donde se pueda escribir y se despliegue un dropdown
      menu, tipo busqueda inteligente".

      Owners are the one option list here that grows with the tenant. Five
      names fit in a Select; two hundred do not, and a Select's answer to two
      hundred is a scrollbar and a reader hunting alphabetically. Typing is the
      only interaction that stays the same size as the list.

      Substring matching, not prefix, and case-insensitive: somebody looking
      for Priya Nair types "nair" as readily as "priya".

      // DS-GAP: no Combobox / typeahead in src/components/ui/. The closest is
      // Select, a trigger with no text entry. Composed here from Input + Menu
      // + dropdown-anchor — the same pair every other dropdown uses — rather
      // than adding a component from inside a PM prototype.
    */
    if (f.kind === "search") {
      const q      = query[f.key] ?? ""
      const chosen = values[f.key] ?? ""
      const hits   = (f.options ?? []).filter(o => o.toLowerCase().includes(q.trim().toLowerCase()))
      const isOpen = openSel === f.key

      return (
        <div key={f.key}>
          <FormLabel
            optional={f.optional}
            hint="Type to search. Leave it empty and the record goes to the unassigned queue."
          >
            {f.label}
          </FormLabel>
          <div onClickCapture={e => setSelAnchor(anchorFromEvent(e))}>
            <Input
              placeholder={chosen || `Search ${f.label.toLowerCase()}…`}
              value={isOpen ? q : chosen}
              state={invalid ? "error" : undefined}
              /* Anchored off the FIELD, not off a click — Tab into this
                 input and the menu still lands under it. Focus is the event
                 that opens the list, so focus is the event that has to
                 position it. */
              onFocus={e => { setSelAnchor(anchorFromElement(e.currentTarget)); setOpenSel(f.key); setQuery(v => ({ ...v, [f.key]: "" })) }}
              /* The anchor is set here too, not only on focus. Typing is the
                 other event that opens this list — a field that already had
                 focus when the user started typing fires no focus event, and
                 the menu would then have a state saying "open" and no
                 position to open at. Both events open it, so both position
                 it. */
              onChange={e => { setSelAnchor(anchorFromElement(e.currentTarget)); setOpenSel(f.key); setQuery(v => ({ ...v, [f.key]: e.target.value })) }}
              onKeyDown={e => {
                // Enter commits the only remaining match — the whole point of
                // typing is that three letters usually leave one name.
                if (e.key === "Enter" && hits.length === 1) {
                  setValues(v => ({ ...v, [f.key]: hits[0] })); setOpenSel(null)
                }
                if (e.key === "Escape") setOpenSel(null)
              }}
            />
          </div>
          {isOpen && q.trim() !== "" && hits.length === 0 && (
            <span style={{ display: "block", marginTop: 6, fontSize: 11, color: "var(--muted-foreground)" }}>
              {`Nobody matches “${q.trim()}”. Leave it empty and assign later.`}
            </span>
          )}
        </div>
      )
    }

    if (f.kind === "select") {
      return (
        <div key={f.key}>
          <FormLabel optional={f.optional}>{f.label}</FormLabel>
          {/* Select is a trigger only — the options come from the DS Menu,
              positioned by dropdown-anchor. The same mechanism Filters uses,
              which is why there is no second implementation in this file. */}
          <div onClickCapture={e => setSelAnchor(anchorFromEvent(e))}>
            <Select
              placeholder={f.label}
              value={values[f.key] ?? ""}
              state={invalid ? "error" : undefined}
              open={openSel === f.key}
              onClick={() => setOpenSel(k => (k === f.key ? null : f.key))}
              onClear={values[f.key] ? () => setValues(v => ({ ...v, [f.key]: "" })) : undefined}
            />
          </div>
        </div>
      )
    }

    return (
      <div key={f.key}>
        <FormLabel optional={f.optional}>{f.label}</FormLabel>
        <Input
          placeholder={f.label}
          value={values[f.key] ?? ""}
          state={invalid ? "error" : undefined}
          onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
        />
      </div>
    )
  }

  const selField = fields.find(f => f.key === openSel && (f.kind === "select" || f.kind === "search"))
  /** What the open menu lists: every option for a Select, the matches for a
   *  search field. Capped at eight — past that the reader should type another
   *  letter, not scroll. */
  const selOptions = selField
    ? (selField.kind === "search"
        ? (selField.options ?? []).filter(o => o.toLowerCase().includes((query[selField.key] ?? "").trim().toLowerCase())).slice(0, 8)
        : (selField.options ?? []))
    : []

  const name = (values.name ?? "").trim()

  return (
    <ScreenLayout
      workspaceName="Acme Corp"
      userName="Thomas González"
      userEmail="thomas.gonzalez@aimsos.ai"
      sidebarItems={UCP_SIDEBAR_ITEMS}
      activeSidebarId="contacts"
      hideSidebar
      stickyFooter
      header={() => (
        <Header
          size="size-l"
          title={`New ${TYPE_LABEL[type].toLowerCase()}`}
          description="A record created here has no source system. Its facts start on the Sandbox Plane and are promoted as they are verified."
          backButton
          onBack={onCancel}
        />
      )}
    >
      <div style={{ marginBottom: 24 }}>
        <Stepper steps={steps} onStepClick={i => { if (i < step) setStep(i as 0 | 1 | 2) }} />
      </div>

      {/* ── 1 · Identity ──────────────────────────────────────────────── */}
      {step === 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}>
          {/* Customer or Company, and neither Employee, Policy nor Asset.
              Michael took all three out (2026-09-10). The reason is one
              reason: none of them is a person you meet and type in. An
              employee arrives from Workday, a policy is authored in
              Governance, a fleet asset comes off the DMS sync. They keep
              their roster tabs — the records exist — and lose the claim that
              this form is where they come from. */}
          <div>
            <FormLabel hint="What kind of record this is. It decides the fields and the icon it carries everywhere after.">
              What are you creating?
            </FormLabel>
            <div role="radiogroup" aria-label="Record type" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {CREATABLE_TYPES.map(t => (
                <CardContainer key={t} size="sm" selected={type === t} onClick={() => { setType(t); setTried(false) }}>
                  <div style={{ pointerEvents: "none", display: "flex", alignItems: "center", gap: 10 }}>
                    <HighlightIcon size="sm" variant={type === t ? "informative" : "neutral"} iconName={TYPE_ICON[t]} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-title)" }}>{TYPE_LABEL[t]}</span>
                      <span style={{ fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.45 }}>
                        {t === "person" ? "A person you sell to or support." : "An organisation, with people under it."}
                      </span>
                    </div>
                  </div>
                </CardContainer>
              ))}
            </div>
          </div>

          {/* The edge case, on the stage that can still act on it — and it
              gates this stage rather than the final button. */}
          {match && <DuplicateCard match={match} onOpenRecord={onOpenRecord} />}

          {stepFields(0).map(field)}

          {tried && missingIn(0).length > 0 && (
            <span style={{ fontSize: 12, color: "var(--field-text-error)" }}>
              {missingIn(0).length === 1
                ? `${missingIn(0)[0].label} is still empty.`
                : `${missingIn(0).map(f => f.label).join(" and ")} are still empty.`}
            </span>
          )}
        </div>
      )}

      {/* ── 2 · Details ───────────────────────────────────────────────── */}
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}>
          {stepFields(1).map(field)}

          {/* A phone entered HERE can collide with a record the identity
              stage never saw, so the card follows the data rather than the
              stage. It never blocks: two people at one switchboard is a
              normal shape for this data. */}
          {match && !match.blocks && match.kind === "phone" && (
            <DuplicateCard match={match} onOpenRecord={onOpenRecord} />
          )}

          {tried && missingIn(1).length > 0 && (
            <span style={{ fontSize: 12, color: "var(--field-text-error)" }}>
              {`${missingIn(1).map(f => f.label).join(" and ")} is still empty.`}
            </span>
          )}
        </div>
      )}

      {/* ── 3 · Review ────────────────────────────────────────────────── */}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}>
          <div>
            <FormLabel hint="This is the record that gets written, and where its facts land.">Review</FormLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <ReviewRow icon={TYPE_ICON[type]} variant="informative" label={TYPE_LABEL[type]}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-title)" }}>{name}</span>
              </ReviewRow>
              {/* Review reads the same repeatable lists the form wrote, so a
                  type whose mail is a single field and one whose mail is a
                  list both summarise correctly without a branch here. */}
              {byKey("email") && (
                <ReviewRow icon="Mail" variant="neutral" label="Email">
                  <Tag variant="neutral" size="sm">{(values.email ?? "").trim()}</Tag>
                </ReviewRow>
              )}
              {(["emails", "phones"] as const).map(key => {
                const f = byKey(key)
                if (!f) return null
                const rows = filledOf(key)
                const pi   = primaryOf(key)
                const noun = f.noun ?? "entry"
                return (
                  <ReviewRow
                    key={key}
                    icon={key === "phones" ? "Phone" : "Mail"}
                    variant="neutral"
                    label={rows.length > 1 ? `${rows.length} ${noun}s` : f.label}
                  >
                    {rows.length === 0
                      ? <span style={{ fontSize: 12, fontStyle: "italic", color: "var(--muted-foreground)" }}>None</span>
                      : rows.map((v, i) => (
                          <Tag key={v} variant={i === pi ? "informative" : "neutral"} size="sm">
                            {i === pi ? `${v} · primary` : v}
                          </Tag>
                        ))}
                  </ReviewRow>
                )
              })}
              <ReviewRow icon="MapPin" variant="neutral" label={byKey("location")?.label ?? "Location"}>
                <Tag variant="neutral" size="sm">{values.location}</Tag>
              </ReviewRow>
              <ReviewRow icon="User" variant={values.owner ? "neutral" : "yellow"} label="Account owner">
                {values.owner
                  ? <Tag variant="neutral" size="sm">{values.owner}</Tag>
                  : <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Unassigned — goes to the queue</span>}
              </ReviewRow>
            </div>
          </div>

          {/* The domain link is the one match worth repeating here, because it
              is not a warning — it is a consequence of saving, and this is the
              stage that states consequences. */}
          {match?.kind === "domain" && <DuplicateCard match={match} onOpenRecord={onOpenRecord} />}

          <InformativeCard
            state="informative"
            size="sm"
            title="Everything here starts on the Sandbox Plane"
            description={`Nothing typed into a form is attested. ${name || "This record"}'s facts are candidate claims until a source corroborates them or a domain owner confirms them — until then an agent can cite them and cannot treat them as true.`}
          />
        </div>
      )}

      {/* The flow completes here, never in the Header. */}
      {createPortal(
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200,
          background: "var(--step-nav-footer-bg, var(--canvas))",
          borderTop: "1px solid var(--step-nav-footer-separator, var(--border))",
        }}>
          <StepperNavFooter
            variant={step === 0 ? "cancel-next" : "back-next"}
            cancelLabel="Cancel"
            onCancel={onCancel}
            onBack={() => setStep(s => Math.max(0, s - 1) as 0 | 1 | 2)}
            nextLabel={step === 2 ? `Create ${TYPE_LABEL[type].toLowerCase()}` : "Next"}
            nextDisabled={step < 2 && !canContinue && tried}
            onNext={() => {
              if (step === 2) { onCreate(type, name); return }
              if (!canContinue) { setTried(true); return }
              setTried(false)
              setStep(s => Math.min(2, s + 1) as 0 | 1 | 2)
            }}
          />
        </div>,
        document.body,
      )}

      {/*
        Z-INDEX 200 IS THE FOOTER'S, and a dropdown has to clear it. It also
        has to clear nothing else: this is a full page, not an overlay, so the
        10001 the roster's own filter menus use is more than enough. The modal
        this flow replaced needed 10030 to get out from under `z-[10020]`;
        that problem left with the modal.
      */}
      {openSel && selAnchor && selField && selOptions.length > 0 && (
        <div ref={selDrop.ref} style={{ position: "fixed", zIndex: 10001, ...selDrop.style }}>
          <Menu>
            {selOptions.map(opt => (
              <MenuItem
                key={opt}
                size="sm"
                label={opt}
                onClick={() => { setValues(v => ({ ...v, [selField.key]: opt })); setOpenSel(null) }}
              />
            ))}
          </Menu>
        </div>
      )}
    </ScreenLayout>
  )
}

/** A field's label, and the one line of context that stops it needing one. */
function FormLabel({ children, hint, optional }: { children: React.ReactNode; hint?: string; optional?: boolean }) {
  return (
    <div style={{ marginBottom: hint ? 8 : 6 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-title)" }}>
        {children}{optional && <span style={{ fontWeight: 400, color: "var(--muted-foreground)" }}> (optional)</span>}
      </div>
      {hint && <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

/** One reviewed fact: what it is on the left, the actual values on the right. */
function ReviewRow({ icon, variant, label, children }: {
  icon:     string
  variant:  HighlightIconVariant
  label:    string
  children: React.ReactNode
}) {
  return (
    <CardContainer size="sm">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <HighlightIcon size="sm" variant={variant} iconName={icon} />
        <span style={{ width: 140, flexShrink: 0, fontSize: 12, fontWeight: 600, color: "var(--color-text-title)" }}>{label}</span>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, minWidth: 0 }}>{children}</div>
      </div>
    </CardContainer>
  )
}

/**
 * THE TITLE NAMES THE RECORD, not the rule that fired. Michael, 2026-09-10:
 * "como se podría visualizar el nombre del otro contacto creado que usa el
 * mismo nombre o mail".
 *
 * "This email is already on a record" is a validation message — it describes
 * the check. "Sandra Torres already has this email" is an answer: the reader
 * knows in one line whether they are about to duplicate somebody they meant
 * to create, or whether a colleague's typo is standing in their way. The
 * difference costs nothing and it is the whole value of the card.
 *
 * Above two matches the name is dropped for the count, because three names in
 * a title is a list and a title is not the place for one — the rows below
 * carry them, with the email, the phone and the owner on each.
 */
const MATCH_COPY: Record<CreateMatch["kind"], {
  state: "error" | "alert" | "informative"
  title: (who: string, on: string, n: number) => string
  body:  (who: string, on: string, n: number) => string
}> = {
  "email-active": {
    state: "error",
    title: who => `${who} already has this email`,
    body:  (who, on) => `${on} is on ${who}'s record. Open it instead of creating a second one — a duplicate has to be merged later, and a merge is a governance event.`,
  },
  "email-archived": {
    state: "alert",
    title: who => `${who} has this email, on an archived record`,
    body:  (who, on) => `${on} belongs to ${who}, whose record was archived rather than deleted. The facts and drives are still there. Restore it rather than starting again.`,
  },
  phone: {
    state: "alert",
    title: (who, _, n) => (n === 1 ? `${who} already has this number` : `${n} records have this number`),
    body:  (who, on, n) => n === 1
      ? `${on} is on ${who}'s record, under a different email. That is normal for a switchboard or a shared line — check it is not the same person before you continue.`
      : `${on} is on ${n} records already, each under a different email. Check none of them is this person before you continue.`,
  },
  name: {
    state: "informative",
    title: (who, _, n) => (n === 1 ? `${who} already has a record` : `${n} records are already called this`),
    body:  (who, _, n) => n === 1
      ? `The email and phone on ${who}'s record are different, so this is probably not the same person. Worth opening it before you create a second.`
      : "Their emails and phones all differ from what you have entered. Worth a look before you create another.",
  },
  domain: {
    state: "informative",
    title: (_who, on) => `${on} is already on file`,
    body:  (who, _, n) => `${n} record${n === 1 ? "" : "s"} share this domain, ${who} among them. The new contact will be linked to it, so you do not have to come back and do it by hand.`,
  },
}

function DuplicateCard({ match, onOpenRecord }: { match: CreateMatch; onOpenRecord: (id: string) => void }) {
  const copy = MATCH_COPY[match.kind]
  const n    = match.records.length
  const head = match.records[0]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <InformativeCard
        state={copy.state}
        size="sm"
        title={copy.title(head.name, match.on, n)}
        description={copy.body(head.name, match.on, n)}
        /* The way out is on the card, next to the reason for it — not a
           separate button further down the form, where it reads as an
           unrelated action. Only the two blocking cases get one: a phone or
           name match already has its answer, which is to keep typing. */
        cta={match.blocks
          ? { label: match.kind === "email-archived" ? `Restore ${head.name}` : `Open ${head.name}`, onClick: () => onOpenRecord(head.id) }
          : undefined}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {match.records.slice(0, 3).map(c => (
          <CardContainer key={c.id} size="sm" className="!p-0 overflow-hidden">
            <EntityList
              items={[{
                id:          c.id,
                title:       c.name,
                /* A person gets an avatar and everything else an icon — the
                   same rule the Entity Header states, and the same one this
                   roster's own rows already follow. */
                ...(PEOPLE_TYPES.includes(c.type)
                  ? { avatarName: c.name }
                  : { iconName: TYPE_ICON[c.type], iconVariant: "neutral" as const }),
                /* The collided datum first — it is the reason this row is on
                   screen. Then who owns it, which is who to ask. */
                primaryMeta:   [{ iconName: "Mail",  label: c.email }],
                secondaryMeta: [{ iconName: "Phone", label: c.phone }, { iconName: "User", label: c.owner }],
                state:       { label: c.status, variant: entityState(c).variant },
                actions:     [{ label: "Open", variant: "tertiary", icon: "ArrowRight", onClick: () => onOpenRecord(c.id) }],
              }]}
            />
          </CardContainer>
        ))}
        {n > 3 && (
          <span style={{ fontSize: 11, color: "var(--field-supporting)" }}>
            {`and ${n - 3} more on this domain.`}
          </span>
        )}
      </div>
    </div>
  )
}


/**
 * ── The category rail ──────────────────────────────────────────────────────
 *
 * Michael, 2026-09-11: the entity types can grow a long way, so the category
 * choice moves out of a tab bar and into a rail to the LEFT of the list — like
 * SidePanel, but without a container card, with an expand/collapse control and
 * a divider on its right edge, and with a search so somebody can find a
 * category instead of scanning for it.
 *
 * WHY A TAB BAR WAS ALWAYS GOING TO BREAK HERE. A tab bar is horizontal, so it
 * is bounded by the width of the screen — which is why this one grew a `+`
 * picker and a cap of six, and why the picker existed at all. Both of those
 * were workarounds for a shape that does not scale, and both go: a vertical
 * list has as many rows as it needs, and a search field is what replaces the
 * cap when the list gets long. Nothing is hidden behind a preference any more.
 *
 * ── COMPONENT INVENTORY, taken before anything was written ──
 *
 *   SidePanel   the closest thing, and it is not this. It is an overlay-ish
 *               panel with its own surface, a title, a menu and a footer, and
 *               Michael's instruction was explicitly "without a container
 *               card". Borrowed its BEHAVIOUR — the collapsed strip, the
 *               right border — not its chrome.
 *   Sidebar     the app's own nav, at the far left. Two of those on one
 *               screen is two navigations competing; this rail is a filter,
 *               not navigation, so it is not that component either.
 *   MenuItem    REUSED, one per category: leadingIcon, label, subtext, a
 *               trailing count and a selected state. It is already the row
 *               the `+` picker used, so a category looks the same wherever
 *               it is listed.
 *   Input       REUSED for the search, with its own leftIcon.
 *   Tooltip     REUSED for the collapsed rail, where a row is an icon and an
 *               icon-only control without a label is unreadable.
 *
 * NAMED EntityCategoryRail, not CategoryRail: the Widget Marketplace already
 * has a `CategoryRail` and it is a different thing — business-function
 * categories with colour dots. Two screens declaring one name is exactly the
 * drift the duplicate-component check exists to catch, and the fix is a name,
 * not a shared abstraction: these two rails have nothing in common but a
 * shape.
 *
 * WHAT I ADDED: this function. It is a column with a border and a list — a
 * composition of four DS components in a screen file, which is the case
 * CLAUDE.md says NOT to turn into a component. If a second screen wants a
 * category rail, that is when it earns a file in experimental/.
 */
/*
  ── The rail's spacing ──────────────────────────────────────────────────────
  Michael, 2026-09-11: reduce the padding, 12px or less.

  The padding to the divider was already 8. What was actually spending the
  space was everything ELSE around it: a 56px collapsed rail holding a 28px
  icon, and a 24px gap on the other side of the line. Together that was ~88px
  of chrome to the left of the first card, most of it empty.

  44 + 8 + 12 = 64. The icon keeps its own hit area, the divider still reads
  as the rail's edge, and the list starts 24px earlier.
*/
const RAIL_WIDTH           = 208
const RAIL_COLLAPSED_WIDTH = 44

function EntityCategoryRail({
  categories, activeId, onSelect, collapsed, onCollapsedChange, query, onQueryChange,
}: {
  categories: { id: string; label: string; icon: string; count: number }[]
  activeId:   string
  onSelect:   (id: string) => void
  collapsed:  boolean
  onCollapsedChange: (next: boolean) => void
  query:      string
  onQueryChange: (next: string) => void
}) {
  const q     = query.trim().toLowerCase()
  /* Collapsed, the filter does not apply — there is no field to have typed
     into, and hiding icons a reader cannot see the reason for is worse than
     showing all six. */
  const shown = collapsed ? categories : categories.filter(c => !q || c.label.toLowerCase().includes(q))

  return (
    <div
      style={{
        width: collapsed ? RAIL_COLLAPSED_WIDTH : RAIL_WIDTH,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        /* 8, not 16 — Michael, 2026-09-11. The gap to the divider is not the
           gap to the list: the divider belongs to the rail and reads as its
           edge, so a wide inset makes the rows look like they are floating
           away from their own boundary. The 24px breathing room lives on the
           other side of the line, where the list starts. */
        paddingRight: 8,
        /* Rows sit tighter than the 12 between the header, the search and the
           list — a category list is one thing, not three. */
        /* THE DIVIDER RUNS THE FULL HEIGHT. It used to stop where the rail's
           own content stopped — six rows, then nothing — which read as a line
           that had been cut off rather than as the edge of a rail. `stretch`
           on the row makes the rail as tall as the list beside it, and the
           minHeight keeps the line honest when the list is shorter than the
           viewport. */
        alignSelf: "stretch",
        minHeight: "calc(100vh - 260px)",
        borderRight: "1px solid var(--field-border)",
        transition: "width 150ms ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: collapsed ? "center" : "space-between" }}>
        {!collapsed && (
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--field-label)" }}>
            Entities
          </span>
        )}
        {/* The DS's own wording for this control, so it reads the same as the
            app Sidebar's toggle one rail over. */}
        <Tooltip side="cursor" content={collapsed ? "Expand" : "Collapse"}>
          <Button
            variant="tertiary" size="sm" iconPosition="alone"
            icon={collapsed
              ? <PanelLeftOpen  size={16} strokeWidth={1.75} />
              : <PanelLeftClose size={16} strokeWidth={1.75} />}
            aria-label={collapsed ? "Expand entities" : "Collapse entities"}
            onClick={() => onCollapsedChange(!collapsed)}
          />
        </Tooltip>
      </div>

      {/*
        A SMALL SEARCH, AND ONLY WHEN EXPANDED — Michael, 2026-09-11.

        This went out a few hours ago and comes back deliberately, so the
        reasoning is worth keeping straight rather than quietly reversing. The
        objection then was two search fields competing, and that still holds
        for the COLLAPSED rail — 44px of icons has nowhere to put one, and a
        reader scanning six glyphs is not searching. Expanded is a different
        surface: the labels are there, the list will grow past what anybody
        scans, and a size-sm field costs one row.

        It filters CATEGORIES. The field over the list filters RECORDS. They
        never compete because they are never both the obvious thing to type
        into — one sits inside the rail, the other spans the list.
      */}
      {!collapsed && (
        <Input
          size="sm"
          placeholder="Filter entities…"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          leftIcon={<Search size={14} />}
        />
      )}
      <div style={{
        display: "flex", flexDirection: "column", gap: 2,
        /* Collapsed, a row is one icon, so the column centres on the rail's
           axis instead of leaving every glyph hanging off the left edge with
           the label's empty space still reserved beside it. */
        alignItems: collapsed ? "center" : "stretch",
      }}>
        {!collapsed && shown.length === 0 && (
          <span style={{ fontSize: 12, color: "var(--muted-foreground)", padding: "6px 4px" }}>
            {`Nothing matches “${query.trim()}”.`}
          </span>
        )}
        {shown.map(c => {
          const on = c.id === activeId
          const row = (
            <MenuItem
              key={c.id}
              size="sm"
              label={collapsed ? "" : c.label}
              subtext={collapsed ? undefined : `${c.count} records`}
              state={on ? "focus" : "default"}
              /* 8px on the selected background. MenuItem is built for a Menu
                 panel, where a row spans the panel's own radius and squares
                 off; standing alone in a rail it is a card-shaped target, and
                 8 is the radius every other card-shaped thing in this product
                 uses. Collapsed, the row shrinks to its icon so the highlight
                 does not run the width of an empty label. */
              className={`rounded-[8px]${collapsed ? " !w-auto !px-[6px]" : " !px-[8px]"}`}
              leadingIcon={<HighlightIcon size="sm" variant={on ? "informative" : "neutral"} iconName={c.icon} />}
              onClick={() => onSelect(c.id)}
            />
          )
          /* Collapsed, a row is an icon and nothing else, so it needs the
             label somewhere — the same rule that makes every icon-only
             control in this product carry a Tooltip. */
          return collapsed
            ? <Tooltip key={c.id} side="cursor" content={`${c.label} · ${c.count} records`}>{row}</Tooltip>
            : row
        })}
      </div>
    </div>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function PMThomasUcpContactsScreen() {
  const toast = useToast()
  const [openId,     setOpenId]     = useState<string | null>(null)
  const [tab,        setTab]        = useState("all")
  const [page,       setPage]       = useState(1)
  const [pageSize,   setPageSize]   = useState(PAGE_SIZE)
  const [search,     setSearch]     = useState("")

  // Draft vs. applied — a chip never appears before Apply.
  // One bag keyed by facet id, not a named useState per filter. The facets are
  // published by the type now, so the screen cannot know their names ahead of
  // time — and a `status`/`owner` pair would have to grow a variable every time
  // a type publishes a field.
  const [applied,    setApplied]    = useState<Record<string, string>>({})
  /** Set when a tab change dropped filters, so the reset is explained. */
  const [clearedOn,  setClearedOn]  = useState<string | null>(null)
  const [slideOpen,  setSlideOpen]  = useState(false)

  const [sortKey,    setSortKey]    = useState<SortKey>("recent")
  const [openSlot,   setOpenSlot]   = useState<string | null>(null)
  const [anchor,     setAnchor]     = useState<DropdownAnchor | null>(null)
  const dropdown = useDropdownPosition(anchor)

  /*
    ── The tab-preference machine is gone ──────────────────────────────────
    tabIds in localStorage, MAX_VISIBLE_TABS, the `+` picker, its anchor, its
    checkbox menu, "the last tab stays", "the tab you are on is always
    visible" — all of it existed to make a HORIZONTAL bar behave when the list
    of types grows, and the rail is vertical. A list with as many rows as it
    needs has nothing to cap, nothing to hide and nothing to remember per
    user, so every one of those guards had nothing left to guard.

    What replaces the cap is the rail's search, which appears once there are
    enough categories to be worth searching.
  */
  const [railCollapsed, setRailCollapsed] = useState(false)
  const [railQuery,     setRailQuery]     = useState("")

  const [preview,    setPreview]    = useState<UcpContact | null>(null)
  // El anchor y el "abrir" tienen que cambiar en el MISMO commit. useDropdownPosition
  // mide el panel en useLayoutEffect y sale temprano si todavía no está montado;
  // si el anchor se fija en la fase de captura y el panel recién aparece cuando
  // el onMenuClick burbujea, el efecto ya corrió contra un ref nulo y el flip
  // nunca se recalcula — el menú se sale por la derecha en vez de alinearse por
  // el otro borde. Por eso un solo estado lleva las dos cosas, que además es el
  // uso que documenta el propio helper: el panel se gatea SOLO por el anchor.
  const pendingAnchor = useRef<DropdownAnchor | null>(null)
  const [kebab, setKebab] = useState<{ contact: UcpContact; anchor: DropdownAnchor } | null>(null)
  const kebabDropdown = useDropdownPosition(kebab?.anchor ?? null)
  const [archiving,  setArchiving]  = useState<UcpContact | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const activeType = ALL_TYPE_TABS.find(t => t.id === tab)?.type ?? "all"

  const facets = useMemo(() => facetsForType(activeType), [activeType])

  /** The tab's rows before any facet is applied — the pool the counts run on.
   *  On All that pool is the CONTACT types, not every record in the fixture —
   *  see CONTACT_TYPES for why a fleet asset in a contacts list is the repair
   *  order problem over again. */
  const inType = useMemo(
    () => CONTACTS.filter(c => activeType === "all" ? CONTACT_TYPES.includes(c.type) : c.type === activeType),
    [activeType],
  )

  const filtered = useMemo(() => inType.filter(c => {
    for (const [fid, val] of Object.entries(applied)) {
      if (val && facetValue(c, fid) !== val) return false
    }
    if (search) {
      const q = search.toLowerCase()
      if (![c.name, c.subtitle, c.email, c.company, c.owner, c.id].some(f => f.toLowerCase().includes(q))) return false
    }
    return true
  }), [inType, applied, search])

  /**
   * How many rows an option would leave, with every OTHER facet still applied.
   * Zero disables the option rather than removing it: if picking "Inactive"
   * made Owner vanish because no inactive record is Priya's, the viewer would
   * lose the way back out. The count is the honest version of that — it says
   * the combination is empty without hiding the road.
   */
  const countFor = (facetId: string, option: string): number => {
    let base = inType
    for (const [fid, val] of Object.entries(applied)) {
      if (fid !== facetId && val) base = base.filter(c => facetValue(c, fid) === val)
    }
    return base.filter(c => facetValue(c, facetId) === option).length
  }

  const sorted = useMemo(() => {
    const rows = [...filtered]
    if (sortKey === "name")   return rows.sort((a, b) => a.name.localeCompare(b.name))
    if (sortKey === "owner")  return rows.sort((a, b) => a.owner.localeCompare(b.owner) || a.name.localeCompare(b.name))
    return rows.sort((a, b) => Date.parse(b.lastInteraction) - Date.parse(a.lastInteraction))
  }, [filtered, sortKey])

  const paged = sorted.slice((page - 1) * pageSize, page * pageSize)

  const resetPage = () => setPage(1)
  const hasFilters = Boolean(Object.values(applied).some(Boolean) || search)

  const clearAll = () => {
    setApplied({})
    setSearch("")
    setClearedOn(null)
    resetPage()
  }

  const closeSlot = () => { setOpenSlot(null); setAnchor(null) }

  const pickSlot = (facetId: string, value: string) => {
    setApplied(a => ({ ...a, [facetId]: value }))
    setClearedOn(null)
    resetPage()
    closeSlot()
  }

  const pickSort = (key: SortKey) => {
    setSortKey(key)
    resetPage()
    closeSlot()
  }

  /* ── The create flow takes over the whole screen ──
     Not an overlay on top of the roster: the Create pattern hides the Sidebar
     for a full-page create, and a wizard drawn over a list the user can still
     see and click is the panel it stopped being. It is checked BEFORE the
     profile so that a duplicate card's "Open Sandra Torres" leaves the flow
     and lands on the record, rather than opening it behind the wizard. */
  if (createOpen) {
    return (
      <CreateContactWizard
        lockedType={activeType === "all" ? null : activeType}
        onCancel={() => setCreateOpen(false)}
        onOpenRecord={id => { setCreateOpen(false); setOpenId(id) }}
        /* Every create ends in a toast — the Create pattern is explicit that a
           visible landing is not confirmation on its own, because "it appeared
           in the list" only reads as confirmation to somebody who knows what
           the list looked like a second ago. The toast says what happened; the
           roster says where it went. */
        onCreate={(t, name) => {
          setCreateOpen(false)
          toast.success(`${TYPE_LABEL[t]} \u201c${name}\u201d created`, {
            description: "Its facts start on the Sandbox Plane and are promoted as they are verified.",
          })
        }}
      />
    )
  }

  // ── Profile view takes over the whole screen ──
  const open = CONTACTS.find(c => c.id === openId)
  if (open) {
    return (
      <UcpProfileView
        contact={open}
        onBack={() => setOpenId(null)}
        onSidebarItemClick={id => { if (id === "contacts") setOpenId(null) }}
        // A company's People tab opens one of its records. Navigation stays
        // here rather than in the profile: the roster owns which record is open.
        onOpenRecord={c => setOpenId(c.id)}
      />
    )
  }

  const toItem = (c: UcpContact): EntityListItemData => ({
    id:    c.id,
    title: c.name,
    // Una persona lleva avatar; una compañía lleva icono. La pregunta es si la
    // entidad tiene identidad visual propia — una cara o una marca. Customers y
    // employees son personas con nombre, y sus iniciales dicen más que un
    // glifo repetido en diez filas iguales: el icono de tipo era el mismo para
    // todos los employees, así que no distinguía nada. La clasificación sigue
    // visible en el tag de la derecha, que es donde vive.
    //
    // Las compañías se quedan con el HighlightIcon: no hay logo en el modelo,
    // y unas iniciales derivadas de una razón social se leen como una persona.
    //
    // Correction (2026-09-09): the test is the TYPE, not "is it a company".
    // With repair orders, policies and assets in the roster, `avatarName` was
    // deriving initials from a code — "RO-48307" came out as "R" — which is
    // the same bug the Entity Header had and the same rule fixes both: only
    // people carry initials here. Everything that is not a person gets its
    // type's icon, which is also the one place the type is visible for a
    // record whose title is a code.
    ...(PEOPLE_TYPES.includes(c.type)
      ? { avatarName: c.name }
      : { iconName: TYPE_ICON[c.type], iconVariant: "light-blue" as const }),
    // Top row is context plus identifier: the source (one item, always visible,
    // per the shared content model) and the record ID.
    primaryMeta: [
      {
        iconName: c.source.iconName,
        label:    c.source.label,
        tooltip:  `Source · ${c.source.label}. The system this record was pulled from.`,
      },
      { iconName: "Hash", label: c.id, tooltip: `Record ID · ${c.id}` },
      // Only on a record the viewer cannot read through. It belongs on the row
      // rather than only inside the profile: finding out that a record is
      // governed after opening it is the version of this that wastes a click.
      ...(restrictionFor(c)
        ? [{
            iconName: "Lock",
            label:    "Restricted",
            tooltip:  `Restricted · needs the ${restrictionFor(c)!.scope} scope, which your role does not hold.`,
          }]
        : []),
    ],
    // Secondary metadata. Four items, values only — no field labels on the row,
    // because the tooltip is what names the field. The spec puts a job title and
    // a parent company here explicitly ("NOT A SOURCE… they belong in tags or in
    // secondary metadata"), and qualifies the rest by whether someone could act
    // on it or governance needs it visible.
    secondaryMeta: [
      {
        iconName: "Info",
        label:    c.subtitle,
        tooltip:  `${c.type === "company" ? "Profile" : "Role"} · ${c.subtitle}`,
      },
      {
        iconName: "UserRound",
        label:    c.owner,
        tooltip:  `Account owner · ${c.owner}. Last interaction ${c.lastInteraction}.`,
      },
      {
        iconName: "ShieldCheck",
        label:    `${getFacts(c).filter(f => f.plane === "truth").length} verified`,
        tooltip:  `Verified facts · ${getFacts(c).filter(f => f.plane === "truth").length} on the Truth plane of ${getFacts(c).length} total.`,
      },
      // The spec names the assigned agent as qualifying metadata, and AIMS OS
      // is agent-first, so every record has one. An open-items count would sit
      // better here, but it is only modelled on 7 of the 16 records — printing
      // "None open" for the other 9 would be false on several of them, so that
      // number needs a real field before it can go on the row.
      {
        iconName: "Bot",
        label:    c.agent.name,
        tooltip:  `Assigned agent · ${c.agent.name}. Opens a chat scoped to this record.`,
      },
    ],
    // The row carries the record's Next Best Action, not the agent's summary.
    // A roster is scanned to decide what to open next, and the recommendation is
    // what answers that; the agent's read still lives in the Overview widget and
    // in the Eye preview, where there is room for it.
    //
    // The block renders the same purple family the Next Best Action card uses on
    // the profile, so the row and the card speak the same language. Title,
    // when, and why — without the rationale it would be an order, not a
    // proposal. It collapses past 80 characters and View more opens the record,
    // which is the card's own default path.
    //
    // No action, no block: "there is nothing to say when there is nothing to
    // do." The absence is the signal — a reader scans for purple to find the
    // records that want a decision.
    //
    // `showAiPrefix: false` — EntityList's label is `AI {action}` by default,
    // which is right when `action` names a category of output ("AI Summary",
    // "AI Impact"). The Next Best Action is a product concept with a name of its
    // own, so the prefix renames it: "AI Next Best Action" is a different thing
    // from what the card below the profile header calls itself. The prefix is
    // opted out; the label keeps its own styling.
    //
    // One short line, so the block neither collapses nor stretches. EntityList
    // sizes this container from its own content: past `detailThreshold` (80 by
    // default) it treats the text as long, goes full width and grows a chevron
    // to expand; under it, the block takes `self-start` and hugs. Every
    // recommendation here fits in 54 characters or fewer, so the row gets the
    // hugging card and no disclosure — matching the block inside RecordHeader
    // on the profile, which carries no chevron either.
    //
    // The rationale is deliberately not here. A roster is scanned to decide what
    // to open next, and the proposal plus its timestamp answers that; the "why"
    // is a paragraph, and it belongs on the record, where the same
    // recommendation renders with its full description.
    aiInsight: c.nba
      ? {
          action:       "Next Best Action",
          showAiPrefix: false,
          detail:       `${c.nba.title} · ${c.nba.timestamp}`,
        }
      : undefined,
    tags:  [{ label: TYPE_LABEL[c.type] }],
    state: entityState(c),
    showMenu:    true,
    onMenuClick: () => {},
    actions: [{ label: "Preview", variant: "tertiary", icon: "Eye", onClick: () => setPreview(c) }],
    onClick: () => setOpenId(c.id),
  })

  return (
    <ScreenLayout
      workspaceName="Acme Corp"
      userName="Thomas González"
      userEmail="thomas.gonzalez@aimsos.ai"
      sidebarItems={UCP_SIDEBAR_ITEMS}
      activeSidebarId="contacts"
      header={isScrolled => (
        <Header
          size={isScrolled ? "compress" : "size-l"}
          title="Contacts"
          description="Every person, employee and company AIMS OS keeps a unified profile for."
          primaryAction={{
            label:   CREATE_LABEL[tab] ?? CREATE_LABEL.all,
            icon:    Plus,
            onClick: () => setCreateOpen(true),
          }}
        />
      )}
      pagination={
        filtered.length > pageSize
          ? (
              <Pagination
                currentPage={page}
                totalItems={filtered.length}
                itemsPerPage={pageSize}
                onPageChange={setPage}
                onItemsPerPageChange={n => { setPageSize(n); resetPage() }}
                rowsPerPageOptions={[10, 25, 50]}
              />
            )
          : undefined
      }
    >
      {/*
        THE TAB BAR AND THE FILTERS BAR ARE BOTH GONE — Michael, 2026-09-11:
        "no es necesario mantener el componente de filters y tabs, ya que eso
        lo abordaremos en el Sidebar que va a la izquierda del contenido de
        lista."

        The tab bar went because it could not grow: horizontal means bounded
        by the screen, which is why it had sprouted a `+` picker, a cap of six
        and a per-user preference in localStorage — three mechanisms to hide
        the fact that the shape does not scale. A vertical rail has as many
        rows as it needs and a search instead of a cap.

        WHAT LEFT WITH THE FILTERS BAR, stated plainly because it is a real
        subtraction and not a tidy-up: the record search, the per-type facet
        slots (Status, Owner), All filters and sort. The rail replaces the
        CATEGORY half of that and nothing else. Michael's own words are that
        filtering will be addressed in the rail — future tense — so this is
        the intermediate state, not the finished one. Everything removed is
        one component call site to restore, and the state behind it (applied,
        sortKey, openSlot, the FiltersSlideout) is still wired.
      */}
      <div style={{ display: "flex", alignItems: "stretch", gap: 12 }}>
        <EntityCategoryRail
          categories={ALL_TYPE_TABS.map(t => ({
            id:    t.id,
            label: t.label,
            icon:  t.type === "all" ? "LayoutGrid" : TYPE_ICON[t.type],
            count: t.type === "all"
              ? CONTACTS.filter(c => CONTACT_TYPES.includes(c.type)).length
              : CONTACTS.filter(c => c.type === t.type).length,
          }))}
          activeId={tab}
          onSelect={id => {
            /* Facets are published per type, so carrying them across a change
               would keep a filter the new category cannot answer. */
            const had = Object.values(applied).filter(Boolean).length
            setTab(id)
            setApplied({})
            setClearedOn(had > 0 ? (ALL_TYPE_TABS.find(t => t.id === id)?.label ?? null) : null)
            resetPage()
          }}
          collapsed={railCollapsed}
          onCollapsedChange={setRailCollapsed}
          query={railQuery}
          onQueryChange={setRailQuery}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/*
            THE FILTERS BAR IS BACK, ABOVE THE LIST — Michael, 2026-09-11.

            Taking it out with the tabs was the wrong half. The rail answers
            "which KIND of record", which is a navigation question and belongs
            on the left; search and the facets answer "which of THESE", which
            is a question about the list you are looking at and belongs over
            it. Removing both left the roster with no way to find a person by
            name, which is the single most common thing anybody does here.

            It sits inside the right column rather than above both, so it
            spans the list it filters and not the rail it does not.
          */}
          <div className="mb-[24px]" onClickCapture={e => setAnchor(anchorFromEvent(e))}>
            <Filters
              showSearch
              searchPlaceholder="Search by name, company, owner or ID…"
              searchValue={search}
              onSearchChange={v => { setSearch(v); resetPage() }}
              /* Which facets are visible is the TYPE's call, not the screen's —
                 an asset has no Owner in the sense a customer does. The rest
                 live behind All filters. */
              slots={facets.filter(f => f.inline).map(f => ({
                placeholder: f.label,
                value: applied[f.id],
                onOpen: () => setOpenSlot(f.id),
                onRemove: () => {
                  setApplied(a => { const n = { ...a }; delete n[f.id]; return n })
                  resetPage()
                },
              }))}
              showAllFilters
              onAllFiltersClick={() => setSlideOpen(true)}
              showClearFilters={hasFilters}
              onClearFilters={clearAll}
              showSort
              sortLabel={SORT_OPTIONS.find(o => o.key === sortKey)?.label}
              onSortClick={() => setOpenSlot("sort")}
              showViewToggle={false}
            />
          </div>

      {clearedOn && (
        <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--field-supporting)" }}>
          <HighlightIcon size="sm" variant="neutral" iconName="Info" />
          {`Filters cleared — ${clearedOn} publishes a different set of facets.`}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={ContactIcon}
          title={hasFilters ? "No contacts found" : "No contacts yet"}
          description={hasFilters
            ? "Try adjusting your filters or search term."
            : "Records arrive through account sync and ingestion, or you can create the first one here."
          }
          ctaLabel={hasFilters ? "Clear filters" : (CREATE_LABEL[tab] ?? CREATE_LABEL.all)}
          onCta={hasFilters ? clearAll : () => setCreateOpen(true)}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {paged.map(c => (
            <div key={c.id} onClickCapture={e => { pendingAnchor.current = anchorFromEvent(e) }}>
              <CardContainer size="sm" className="!p-0 overflow-hidden">
                <EntityList items={[{ ...toItem(c), onMenuClick: () => {
                  if (pendingAnchor.current) setKebab({ contact: c, anchor: pendingAnchor.current })
                } }]} />
              </CardContainer>
            </div>
          ))}
        </div>
      )}

      {/* ── Filter slot dropdowns ── */}
      {openSlot && anchor && (
        <>
          <div className="fixed inset-0 z-[10000]" onClick={closeSlot} />
          <div ref={dropdown.ref} style={{ position: "fixed", zIndex: 10001, ...dropdown.style }}>
            <Menu>
              {openSlot === "sort"
                ? SORT_OPTIONS.map(option => (
                    <MenuItem
                      key={option.key}
                      size="sm"
                      label={option.label}
                      state={sortKey === option.key ? "focus" : "default"}
                      onClick={() => pickSort(option.key)}
                    />
                  ))
                : facetOptions(inType, openSlot).map(option => {
                    const n = countFor(openSlot, option)
                    return (
                      <MenuItem
                        key={option}
                        size="sm"
                        label={`${option} · ${n}`}
                        state={n === 0 ? "disabled" : applied[openSlot] === option ? "focus" : "default"}
                        onClick={() => { if (n > 0) pickSlot(openSlot, option) }}
                      />
                    )
                  })
              }
            </Menu>
          </div>
        </>
      )}

      {/* ── Row kebab — Archive + Duplicate are the DS defaults ── */}
      {kebab && (
        <>
          <div className="fixed inset-0 z-[10000]" onClick={() => setKebab(null)} />
          <div ref={kebabDropdown.ref} style={{ position: "fixed", zIndex: 10001, ...kebabDropdown.style }}>
            <Menu>
              <MenuItem size="sm" label="Archive"   leadingIcon={<HighlightIcon size="sm" variant="neutral" iconName="Archive" />}  onClick={() => { setArchiving(kebab.contact); setKebab(null) }} />
              <MenuItem size="sm" label="Duplicate" leadingIcon={<HighlightIcon size="sm" variant="neutral" iconName="Copy" />}     onClick={() => setKebab(null)} />
            </Menu>
          </div>
        </>
      )}

      {/* ── All filters ── */}
        </div>
      </div>

      <FiltersSlideout
        isOpen={slideOpen}
        onClose={() => setSlideOpen(false)}
        onApply={() => { resetPage(); setSlideOpen(false) }}
        onClearAll={clearAll}
        activeFilters={facets
          .filter(f => applied[f.id])
          .map(f => ({
            label: f.label,
            value: applied[f.id],
            onRemove: () => {
              setApplied(a => { const n = { ...a }; delete n[f.id]; return n })
              resetPage()
            },
          }))}
      />

      {/* ── Row preview — the profile without leaving the list ── */}
      <SlideOut
        open={preview !== null}
        onClose={() => setPreview(null)}
        type="with-variants"
        size="m"
        title={preview?.name ?? ""}
        subtitle={preview ? `${TYPE_LABEL[preview.type]} · ${preview.company}` : ""}
        showIcon
        /* The entity's own icon, the same glyph and tint the roster row shows.
           It was a Sparkle on every preview, which is the AI mark — it says
           "an agent produced this", not "this is a customer". */
        iconContent={preview ? <HighlightIcon size="sm" variant={TYPE_TAG[preview.type] === "purple" ? "purple" : TYPE_TAG[preview.type] === "lightBlue" ? "light-blue" : "informative"} iconName={TYPE_ICON[preview.type]} /> : undefined}
        showStatus
        statusLabel={preview?.status}
        showTopButton={false}
      showTabs={false}
      showSearchBar={false}
      showChips={false}
      showCta={false}
      >
        {preview && (
          <div className={PANEL_CONTENT_CLASS}>

            {/* The same gate as the profile, applied here too. A preview that
                prints the agent's read, the email and the fact counts of a
                record whose profile says the values are governed would make the
                restriction decorative — the panel is the easier door, so it has
                to be the same door. What survives is directory-level: who owns
                the record and where it came from. */}
            {restrictionFor(preview) ? (
              <div
                style={{
                  background: "var(--card-primary-bg)", border: "1px solid var(--field-border)",
                  borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>
                  <Lock size={13} />
                  Governed by {restrictionFor(preview)!.scope}
                </span>
                <span style={{ fontSize: 12, color: "var(--field-supporting)", lineHeight: 1.6 }}>
                  {restrictionFor(preview)!.note}
                </span>
              </div>
            ) : (
              // The same component the profile's Overview widget uses, so the
              // agent's read looks like one object in both places. It carousels
              // here too when the record has more than one, and it carries the
              // area each read is about. No `onAsk`: the concierge opens from
              // the profile, not from a preview of it.
              <AiSummaryWidget items={toAiInsights(preview)} />
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(restrictionFor(preview)
                ? [
                    { label: "Record ID", value: preview.id            },
                    { label: "Owner",     value: preview.owner         },
                    { label: "Source",    value: preview.source.label  },
                  ]
                : [
                { label: "Record ID",        value: preview.id                                       },
                { label: "Owner",            value: preview.owner                                    },
                { label: "Email",            value: preview.email                                    },
                { label: "Last interaction", value: preview.lastInteraction                          },
                { label: "Verified facts",   value: `${getFacts(preview).filter(f => f.plane === "truth").length} on the Truth plane` },
                { label: "Activity",         value: `${getActivity(preview).length} events`          },
                { label: "Drives attached",  value: `${getDrives(preview).length} sources`           },
              ]).map(row => (
                <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ fontSize: 12, color: "var(--field-supporting)" }}>{row.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>{row.value}</span>
                </div>
              ))}
            </div>

            <Button
              variant="primary"
              size="sm"
              className="self-start"
              onClick={() => { setOpenId(preview.id); setPreview(null) }}
            >
              Open full profile
            </Button>
          </div>
        )}
      </SlideOut>

      <ModalDialog
        isOpen={archiving !== null}
        onClose={() => setArchiving(null)}
        tone="warning"
        iconName="Archive"
        title={`Archive ${archiving?.name ?? "this contact"}?`}
        description="The record moves out of active views and its assigned agent stops acting on it. Facts and drives are kept, and you can restore it later."
        ctaPrimary={{ label: "Archive", onClick: () => setArchiving(null) }}
        ctaSecondary={{ label: "Cancel", onClick: () => setArchiving(null) }}
      />


    </ScreenLayout>
  )
}
