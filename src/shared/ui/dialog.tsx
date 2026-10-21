"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/utils";

/**
 * Moslashuvchan oyna: telefonda pastdan chiqadigan varaq (bottom sheet),
 * `sm` dan kattada markazdagi oyna. Faqat CSS — JS o'lchov kerak emas.
 * Fokus tuzog'i, Escape va fokusni qaytarish Radix'da.
 */

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogOverlay({ className, ...props }: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-scrim backdrop-blur-xs",
        "data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  closeLabel: string;
  hideClose?: boolean;
};

export function DialogContent({ className, children, closeLabel, hideClose = false, ...props }: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-surface text-ink shadow-overlay outline-none",
          // Telefon: pastdan varaq
          "inset-x-0 bottom-0 max-h-(--sheet-max-h) overflow-y-auto rounded-t-2xl p-5 pb-(--safe-pad-lg)",
          "data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom",
          // Desktop: markazda
          "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-(--dialog-max-h) sm:w-full sm:max-w-md",
          "sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-6",
          "sm:data-open:slide-in-from-bottom-4 sm:data-open:zoom-in-95 sm:data-open:fade-in-0",
          "sm:data-closed:slide-out-to-bottom-0 sm:data-closed:zoom-out-95 sm:data-closed:fade-out-0",
          className,
        )}
        {...props}
      >
        <div aria-hidden className="mx-auto -mt-2 h-1.5 w-10 shrink-0 rounded-full bg-line-strong sm:hidden" />
        {children}
        {hideClose ? null : (
          <DialogPrimitive.Close
            className="absolute top-3 right-3 grid size-10 place-items-center rounded-lg text-ink-muted outline-none transition-colors hover:bg-surface-2 hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/40"
            aria-label={closeLabel}
          >
            <X className="size-5" aria-hidden />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5 pr-10", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end *:w-full sm:*:w-auto", className)}
      {...props}
    />
  );
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("text-lg font-semibold tracking-tight", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("text-sm text-ink-muted", className)} {...props} />;
}
