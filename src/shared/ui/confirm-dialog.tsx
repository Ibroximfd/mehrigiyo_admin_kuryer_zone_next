"use client";

import type { ReactNode } from "react";

import { useT } from "@/shared/i18n/locale";

import { Button } from "./button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./dialog";

/**
 * Tasdiq oynasi: oqibat aniq yoziladi, tugmada fe'l ("O'chirish", "OK" emas).
 * `onConfirm` va'da qaytarsa, tugma kutish holatida turadi.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  intent = "danger",
  pending = false,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  intent?: "danger" | "primary";
  pending?: boolean;
  onConfirm: () => void;
  children?: ReactNode;
}) {
  const t = useT();
  return (
    <Dialog open={open} onOpenChange={(next) => (pending ? undefined : onOpenChange(next))}>
      <DialogContent closeLabel={t.common.close} role="alertdialog">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {t.common.cancel}
          </Button>
          <Button variant={intent === "danger" ? "danger" : "primary"} onClick={onConfirm} pending={pending}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
