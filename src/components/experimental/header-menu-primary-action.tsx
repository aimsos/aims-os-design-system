// DS-GAP: HeaderMenuPrimaryAction
//
// A screen's one true CTA can also need to open a menu (a type-chooser, in
// this case) — but `Header.primaryAction` can't do that. Header renders the
// button itself so it can own the gradient `variant="main"` look (see
// header.tsx: "no screen writes variant='main' any more"), which means a
// screen has no ref of its own to anchor a popover to. header.tsx's `aux`
// doc says exactly this: "there's no DOM node to anchor a popover to."
//
// Today that forces a real page-level main action (pm-lex-playbooks.tsx's
// "Create playbook") into `aux` as a plain variant="primary" button, which
// visually reads as a demoted CTA even though it's the one action the
// screen is for.
//
// This composes real DS pieces — Button's own variant="main" classes, and
// the same wrapper-anchored Popover pattern CLAUDE.md now sanctions for
// Select (a div ref carries the anchor, Popover.Root is controlled by the
// caller) — to model what `primaryAction` could look like with menu
// support. It does not touch header.tsx: Button already owns the gradient
// token, so nothing here invents new color.
//
// One call site today: pm-lex-playbooks.tsx's "Create playbook". Flagging
// for @mike (DS Lead) to evaluate whether Header.primaryAction should grow
// this capability directly rather than every screen re-solving it.
//
// `GradientButton` below is the same gap without the menu: a plain-click CTA
// (e.g. a SlideOut footer's "Go to Playbook") that is also the one action
// its context is for, but isn't inside a Header at all — so primaryAction
// doesn't apply to it even in principle. Same reasoning, same fix.

import { useRef, type ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Popover } from "@base-ui/react/popover"
import { Button } from "@/components/ui/button"

export interface GradientButtonProps {
  children: ReactNode
  icon?: ReactNode
  onClick?: () => void
  disabled?: boolean
}

export function GradientButton({ children, icon, onClick, disabled }: GradientButtonProps) {
  return (
    <Button variant="main" icon={icon} onClick={onClick} disabled={disabled}>
      {children}
    </Button>
  )
}

export interface HeaderMenuPrimaryActionProps {
  label: string
  icon?: LucideIcon
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The Popover.Popup content — usually a list of menu options. */
  children: ReactNode
  menuWidth?: number
}

export function HeaderMenuPrimaryAction({
  label,
  icon: Icon,
  open,
  onOpenChange,
  children,
  menuWidth = 320,
}: HeaderMenuPrimaryActionProps) {
  const triggerRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={triggerRef}>
      <Button
        variant="main"
        icon={Icon ? <Icon size={15} /> : undefined}
        onClick={() => onOpenChange(!open)}
      >
        {label}
      </Button>
      <Popover.Root open={open} onOpenChange={onOpenChange}>
        <Popover.Portal>
          <Popover.Positioner anchor={triggerRef} side="bottom" align="end" sideOffset={4} style={{ zIndex: 10030 }}>
            <Popover.Popup
              className="flex flex-col rounded-[8px] overflow-hidden"
              style={{
                width: menuWidth, padding: 6,
                background: "var(--surface-floating-default)",
                border: "0.5px solid var(--color-border-neutral-subtle)",
                boxShadow: "var(--shadow-elevation-5)",
              }}
            >
              {children}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}
