"use client";

import { Tooltip as TooltipPrimitive } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;

/** Qisqa izoh (desktopda hover/fokus). Muhim ma'lumot faqat tooltipda turmaydi. */
export function Tooltip({
  content,
  children,
  className,
  ...props
}: { content: ReactNode; children: ReactNode } & ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          sideOffset={6}
          className={cn(
            "z-50 max-w-xs rounded-lg bg-ink px-2.5 py-1.5 text-xs text-surface shadow-raised",
            "data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
            className,
          )}
          {...props}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
