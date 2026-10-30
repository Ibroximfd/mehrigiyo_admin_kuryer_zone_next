import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Tugma — butun ilovada 20 ta joyda ishlatiladi, shuning uchun holatlar
 * to'liq: default / hover / active / focus-visible / disabled / loading.
 *
 * Harakat faqat `transform` va `opacity` orqali: bosilganda 1px pastga
 * tushadi, hover'da fon o'zgaradi. Balandlik `--control-h` zichlik
 * tokenidan keladi, ya'ni "compact" rejimda hamma tugma birga kichrayadi.
 */
/*
 * Logist imzosi: tugmalar pill (to'liq yumaloq) — yumshoq inputlar bilan
 * yonma-yon turganda bosiladigan narsa bir qarashda ajralib turadi.
 */
const buttonVariants = cva(
  [
    "group/button relative inline-flex shrink-0 items-center justify-center gap-1.5",
    "rounded-full border border-transparent bg-clip-padding",
    "text-dense font-medium whitespace-nowrap select-none",
    "transition-[background-color,border-color,color,box-shadow,transform]",
    "duration-(--dur-micro) ease-out outline-none",
    "focus-visible:ring-brand/45 focus-visible:border-brand focus-visible:ring-[3px]",
    "active:not-aria-[haspopup]:translate-y-px",
    "disabled:pointer-events-none disabled:opacity-45",
    "aria-invalid:border-danger aria-invalid:ring-danger/25 aria-invalid:ring-[3px]",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "[&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default: "btn-rich bg-brand text-brand-ink",
        outline:
          "border-border-control/70 text-ink bg-surface hover:bg-subtle hover:border-border-control aria-expanded:bg-subtle",
        secondary:
          "bg-subtle text-ink border-line hover:bg-surface-3 aria-expanded:bg-surface-3",
        ghost: "text-ink-muted hover:bg-subtle hover:text-ink aria-expanded:bg-subtle aria-expanded:text-ink",
        destructive:
          "bg-danger-soft text-danger border-danger/25 hover:bg-danger hover:text-white hover:border-danger focus-visible:ring-danger/35 focus-visible:border-danger",
        link: "text-brand h-auto px-0 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-(--control-h) px-4",
        xs: "h-6 gap-1 px-2.5 text-micro [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-3 text-meta [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-(--control-h) px-4.5",
        icon: "size-(--control-h) px-0",
        "icon-xs": "size-6 px-0 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 px-0 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-(--control-h) px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
