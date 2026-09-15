// ────────────────────────────────────────────────────────────────────────
// Shared primitives for the Configuration form's sections.
//
// A SECTION IS A HEADING AND A RULE, NOT A CARD (changed 2026-09-15).
//
// Every section used to be a `CardContainer`. That reads fine for one section
// and badly for seven: the sections that hold cards of their own — the tenant
// scope options, the priority options, the knowledge packs — put a card inside
// a card, and a form that is nothing but stacked surfaces gives the eye no way
// to tell a GROUP of fields from an ITEM you can pick. A card should mean
// "this is a thing" — an option, a pack, a phase — so the grouping is carried
// by a label and a 1px rule instead, and the cards are left to the items that
// are actually selectable.
//
// `Field` exists for the other half of the same problem: a `Select` with one
// short value in it does not need 900px. `width="narrow"` caps it at 360,
// which is the difference between a form and a row of stretched boxes.
// ────────────────────────────────────────────────────────────────────────

import { useRef, useState, type ReactNode } from "react"
import { Popover } from "@base-ui/react/popover"
import { Sparkle, Loader2 } from "lucide-react"
import { Select } from "@/components/ui/select"
import { MenuItem } from "@/components/ui/menu-item"
import { Button } from "@/components/ui/button"

const SUB = "var(--field-supporting)"
const TXT = "var(--foreground)"

/** Single-field controls are capped here rather than filling the column. */
const NARROW_FIELD = 360

// ── Layout ──────────────────────────────────────────────────────────────

/** The stack a section list lives in. Owns the rules between sections so no
 *  section has to know whether it is the last one. */
export function FormSections({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col [&>section]:pt-[24px] [&>section:first-child]:pt-0 [&>section]:pb-[24px] [&>section:last-child]:pb-0 [&>section]:border-b [&>section:last-child]:border-b-0">
      {children}
    </div>
  )
}

export function FormSection({ title, description, children }: {
  title:        string
  description?: string
  children:     ReactNode
}) {
  return (
    <section
      className="flex flex-col gap-[16px]"
      style={{ borderBottomColor: "var(--color-border-neutral-subtle)" }}
    >
      <div className="flex flex-col gap-[3px]">
        <span style={{ fontSize: 14, fontWeight: 600, color: TXT }}>{title}</span>
        {description && <p style={{ fontSize: 12, color: SUB, margin: 0, lineHeight: 1.5 }}>{description}</p>}
      </div>
      {children}
    </section>
  )
}

/** Heading above a field, replacing Input/Textarea's `label` prop — that's a
 *  mobile-only floating label per DS Guardrails; on desktop the label is a
 *  plain heading above the field instead. */
export function FieldHeading({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 500, color: TXT, marginBottom: 6 }}>
      {children}
      {required && <span style={{ color: "var(--tag-error-fg)" }}> *</span>}
    </div>
  )
}

export function HelperText({ children }: { children: ReactNode }) {
  return <p style={{ fontSize: 12, color: SUB, margin: "6px 0 0" }}>{children}</p>
}

/**
 * One labelled control. `width="narrow"` caps the control at 360px — use it for
 * anything holding a single short value (a Select, a name, a number). Leave it
 * full for prose, for a grid of option cards, or for a row of sub-fields.
 *
 * Pass `action` for the thing that sits opposite the label (an Assist button, a
 * "Clear all"), so label and action share one row instead of each bringing
 * their own margin.
 */
export function Field({ label, required, helper, action, width = "full", children }: {
  label?:    string
  required?: boolean
  helper?:   ReactNode
  action?:   ReactNode
  width?:    "narrow" | "full"
  children:  ReactNode
}) {
  return (
    <div style={{ maxWidth: width === "narrow" ? NARROW_FIELD : undefined }}>
      {(label || action) && (
        <div className="flex items-center justify-between gap-[12px]">
          {label ? <FieldHeading required={required}>{label}</FieldHeading> : <span style={{ marginBottom: 6 }} />}
          {action}
        </div>
      )}
      {children}
      {helper && <HelperText>{helper}</HelperText>}
    </div>
  )
}

// ── SelectField — Select is a trigger only (DS Guardrails); compose a
// working dropdown with @base-ui/react's Popover anchored to the trigger,
// never hand-computed coordinates. Mirrors PgInteractiveSelect in App.tsx
// (Patterns → Forms doc page), the DS's own reference composition. ──────

export function SelectField({ value, onChange, options, placeholder }: {
  value: string | null
  onChange: (v: string) => void
  options: readonly string[]
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={triggerRef}>
      <Select
        placeholder={placeholder}
        value={value ?? undefined}
        open={open}
        onClick={() => setOpen(o => !o)}
        onClear={() => onChange("")}
      />
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Portal>
          <Popover.Positioner anchor={triggerRef} side="bottom" align="start" sideOffset={4} style={{ zIndex: 10030 }}>
            <Popover.Popup
              className="flex flex-col rounded-[8px] overflow-hidden"
              style={{
                minWidth: 220,
                maxHeight: 280,
                overflowY: "auto",
                background: "var(--surface-floating-default)",
                border: "0.5px solid var(--color-border-neutral-subtle)",
                boxShadow: "var(--shadow-elevation-5)",
              }}
            >
              {options.map(opt => (
                <MenuItem key={opt} label={opt} size="sm" onClick={() => { onChange(opt); setOpen(false) }} />
              ))}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}

// ── AssistButton — AI-assist trigger. Stub: shows a loading state, then
// no-ops. Real generation lands in a later prompt. ──────────────────────

export function AssistButton({ onClick }: { onClick?: () => void }) {
  const [loading, setLoading] = useState(false)

  function handleClick() {
    if (loading) return
    setLoading(true)
    window.setTimeout(() => setLoading(false), 1200)
    onClick?.()
  }

  return (
    <Button variant="tertiary" size="sm" onClick={handleClick} disabled={loading}
      icon={loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkle size={13} />}>
      {loading ? "Generating…" : "Assist"}
    </Button>
  )
}
