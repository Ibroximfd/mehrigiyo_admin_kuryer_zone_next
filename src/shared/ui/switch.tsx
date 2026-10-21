"use client";

import { Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/utils";

/** Kalit. Ko'rinishi kichik, lekin bosiladigan maydoni 44px gacha kengaytirilgan. */
export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full",
        "border border-transparent transition-colors outline-none",
        "after:absolute after:-inset-2.5",
        "focus-visible:ring-3 focus-visible:ring-ring/40",
        "data-checked:bg-brand data-unchecked:bg-line-strong",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-surface shadow-card transition-transform",
          "data-checked:translate-x-4 data-unchecked:translate-x-0.5",
        )}
      />
    </SwitchPrimitive.Root>
  );
}
