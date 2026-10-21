import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/utils";

/**
 * Tugma. Telefonda balandlik 44px (barmoq uchun), desktopda 40px.
 * `pending` — so'rov ketayotganda: aylanuvchi belgi + bosib bo'lmaydi.
 */
export const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 items-center justify-center gap-2 rounded-lg",
    "text-sm font-medium whitespace-nowrap select-none",
    "transition duration-150 ease-out",
    "outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
    "active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        primary: "bg-brand text-brand-ink shadow-card hover:bg-brand-hover",
        secondary: "bg-surface-2 text-ink hover:bg-surface-3",
        outline: "border border-line-strong bg-surface text-ink hover:bg-surface-2",
        ghost: "text-ink-muted hover:bg-surface-2 hover:text-ink",
        danger: "bg-danger text-danger-ink hover:opacity-90 focus-visible:ring-danger/40",
        "danger-ghost": "text-danger hover:bg-danger-soft focus-visible:ring-danger/40",
        link: "h-auto px-0 text-brand underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-4 sm:h-10",
        lg: "h-12 px-5 text-base",
        icon: "size-11 sm:size-10",
        "icon-sm": "size-10 sm:size-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    pending?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  pending = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  if (asChild) {
    return (
      <Slot.Root className={cn(buttonVariants({ variant, size }), className)} {...props}>
        {children}
      </Slot.Root>
    );
  }
  return (
    <button
      type="button"
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...props}
    >
      {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}
