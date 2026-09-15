import { type ReactNode } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Tag Component — AIMS OS Design System
 * Component set: Figma v6rmYKA2zmyXWOahlxLOeI · node 4607:619
 *
 * All colors reference CSS custom properties defined in index.css.
 * Light / dark mode handled by the token layer — no `dark:` prefix needed.
 *
 * 11 semantic variants, 2 sizes.
 * Primary variant has no border (solid fill only).
 * All other variants: 1px border + tinted background.
 *
 * DS slot structure (HORIZONTAL auto-layout, gap=4px):
 *   [leadingIcon?] · [children?] · [trailingIcon?]
 *
 *   Left icon  (Person-icon, DS prop "Left icon")  → leadingIcon
 *   Right icon (Close-icon,  DS prop "Right icon") → trailingIcon
 *   Just icon=Yes → only leadingIcon, no text, no trailingIcon
 *
 * Sizes (DS exact):
 *   S: h=20px  px=8px  py=4px  font=12px  radius=8px  gap=4px
 *   M: h=24px  px=8px  py=4px  font=14px  radius=8px  gap=4px
 *
 * Icon-only (Just icon=Yes): px collapses to 4px for a square feel.
 */

const tagVariants = cva(
  [
    // `w-fit` is what makes a Tag hug its text in EVERY container, not just
    // in a row. `inline-flex` + `shrink-0` already sized it to content
    // horizontally, but a flex COLUMN stretches its children on the cross
    // axis, so a Tag placed in one grew to the full panel width — a status
    // pill as wide as the panel reads as a banner. Width fit-content is
    // inert in a row and fixes it in a column and in a grid cell.
    "inline-flex w-fit items-center shrink-0 rounded-[8px] border font-medium leading-none",
    "gap-[4px] transition-opacity",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        success:    "bg-[var(--tag-success-bg)]     border-[var(--tag-success-bd)]     text-[var(--tag-success-fg)]",
        secondary:  "bg-[var(--tag-secondary-bg)]   border-[var(--tag-secondary-bd)]   text-[var(--tag-secondary-fg)]",
        primary:    "bg-[var(--tag-primary-bg)]     border-transparent                 text-[var(--tag-primary-fg)]",
        informative:"bg-[var(--tag-informative-bg)] border-[var(--tag-informative-bd)] text-[var(--tag-informative-fg)]",
        error:      "bg-[var(--tag-error-bg)]       border-[var(--tag-error-bd)]       text-[var(--tag-error-fg)]",
        alert:      "bg-[var(--tag-alert-bg)]       border-[var(--tag-alert-bd)]       text-[var(--tag-alert-fg)]",
        limeGreen:  "bg-[var(--tag-limegreen-bg)]   border-[var(--tag-limegreen-bd)]   text-[var(--tag-limegreen-fg)]",
        yellow:     "bg-[var(--tag-yellow-bg)]      border-[var(--tag-yellow-bd)]      text-[var(--tag-yellow-fg)]",
        purple:     "bg-[var(--tag-purple-bg)]      border-[var(--tag-purple-bd)]      text-[var(--tag-purple-fg)]",
        lightBlue:  "bg-[var(--tag-lightblue-bg)]   border-[var(--tag-lightblue-bd)]   text-[var(--tag-lightblue-fg)]",
        neutral:    "bg-[var(--tag-neutral-bg)]     border-[var(--tag-neutral-bd)]     text-[var(--tag-neutral-fg)]",
      },
      size: {
        sm:      "h-[20px] px-[8px] py-[4px] text-xs",
        default: "h-[24px] px-[8px] py-[4px] text-sm",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "default",
    },
  }
)

export type TagVariant =
  | "success"
  | "secondary"
  | "primary"
  | "informative"
  | "error"
  | "alert"
  | "limeGreen"
  | "yellow"
  | "purple"
  | "lightBlue"
  | "neutral"

type TagProps = VariantProps<typeof tagVariants> & {
  leadingIcon?:  ReactNode
  trailingIcon?: ReactNode
  disabled?:     boolean
  className?:    string
  children?:     ReactNode
}

function Tag({
  variant      = "secondary",
  size         = "default",
  leadingIcon,
  trailingIcon,
  disabled     = false,
  className,
  children,
}: TagProps) {
  const iconOnly = !children && !trailingIcon && !!leadingIcon

  return (
    <span
      data-slot="tag"
      className={cn(
        tagVariants({ variant, size }),
        iconOnly && "gap-0 px-[4px]",
        disabled && "opacity-40",
        className
      )}
    >
      {leadingIcon  && <span className="shrink-0 flex items-center">{leadingIcon}</span>}
      {children}
      {trailingIcon && <span className="shrink-0 flex items-center">{trailingIcon}</span>}
    </span>
  )
}

export { Tag, tagVariants }
