import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/utils";

/** Matn kiritish. Telefonda 16px shrift — iOS fokusda sahifani kattalashtirmasin. */
export const inputClassName = cn(
  "h-11 w-full min-w-0 rounded-lg border border-input bg-surface px-3 text-base text-ink sm:h-10 sm:text-sm",
  "placeholder:text-ink-faint transition outline-none",
  "focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-ring/25",
  "disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-60",
  "aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-danger/20",
);

export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return <input type={type} className={cn(inputClassName, className)} {...props} />;
}
