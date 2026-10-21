"use client";

import { X } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/utils";

import { DialogOverlay } from "./dialog";

/**
 * Forma varag'i: telefonda deyarli to'liq ekranli pastki varaq, desktopda
 * o'ngdan chiqadigan panel. Ichida: sarlavha (qotib turadi) → aylanadigan
 * tana → pastki amallar paneli (qotib turadi).
 */

export const Sheet = SheetPrimitive.Root;
export const SheetClose = SheetPrimitive.Close;

type SheetContentProps = ComponentProps<typeof SheetPrimitive.Content> & {
  closeLabel: string;
  side?: "auto" | "left";
};

export function SheetContent({ className, children, closeLabel, side = "auto", ...props }: SheetContentProps) {
  return (
    <SheetPrimitive.Portal>
      <DialogOverlay />
      <SheetPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col bg-surface text-ink shadow-overlay outline-none",
          side === "auto"
            ? [
                "inset-x-0 bottom-0 h-(--sheet-max-h) rounded-t-2xl",
                "data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom",
                "sm:inset-y-0 sm:right-0 sm:left-auto sm:h-full sm:w-full sm:max-w-xl sm:rounded-none sm:rounded-l-2xl",
                "sm:data-open:slide-in-from-bottom-0 sm:data-open:slide-in-from-right",
                "sm:data-closed:slide-out-to-bottom-0 sm:data-closed:slide-out-to-right",
              ]
            : [
                "inset-y-0 left-0 h-full w-full max-w-xs rounded-r-2xl",
                "data-open:animate-in data-open:slide-in-from-left data-closed:animate-out data-closed:slide-out-to-left",
              ],
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close
          className="absolute top-3 right-3 grid size-10 place-items-center rounded-lg text-ink-muted outline-none transition-colors hover:bg-surface-2 hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/40"
          aria-label={closeLabel}
        >
          <X className="size-5" aria-hidden />
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

export function SheetHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex shrink-0 flex-col gap-1 border-b border-line px-5 py-4 pr-14", className)} {...props} />;
}

export function SheetBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex-1 overflow-y-auto overscroll-contain px-5 py-5", className)} {...props} />;
}

export function SheetFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col-reverse gap-2 border-t border-line bg-surface px-5 py-3 pb-(--safe-pad-sm) sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

export function SheetTitle({ className, ...props }: ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title className={cn("text-lg font-semibold tracking-tight", className)} {...props} />;
}

export function SheetDescription({ className, ...props }: ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description className={cn("text-sm text-ink-muted", className)} {...props} />;
}
