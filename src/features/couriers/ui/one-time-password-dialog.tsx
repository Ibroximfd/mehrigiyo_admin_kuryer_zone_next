"use client";

import { KeyRound, TriangleAlert } from "lucide-react";

import { useT } from "@/shared/i18n/locale";
import { formatPhone } from "@/shared/lib/phone";
import { Button } from "@/shared/ui/button";
import { CopyButton } from "@/shared/ui/copy-button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";

export type OneTimePassword = { name: string; phone: string; password: string };

/**
 * Server parolni BIR MARTA qaytaradi. Oyna tashqariga bosish bilan
 * yopilmaydi — admin parolni ko'chirmasdan tasodifan yo'qotmasin.
 */
export function OneTimePasswordDialog({ value, onClose }: { value: OneTimePassword | null; onClose: () => void }) {
  const t = useT();
  return (
    <Dialog open={value !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent
        closeLabel={t.common.close}
        onInteractOutside={(event) => event.preventDefault()}
        className="sm:max-w-md"
      >
        <DialogHeader>
          <span className="mb-1 grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">
            <KeyRound className="size-5" aria-hidden />
          </span>
          <DialogTitle>{t.couriers.passwordTitle}</DialogTitle>
          <DialogDescription>{value ? t.couriers.passwordText(value.name) : null}</DialogDescription>
        </DialogHeader>

        {value ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-line bg-surface-2 p-4 text-center">
              <p className="text-xs text-ink-faint tabular">{t.couriers.passwordLogin(formatPhone(value.phone))}</p>
              <p className="mt-1 font-mono text-3xl font-semibold tracking-widest break-all select-all text-ink" aria-live="polite">
                {value.password}
              </p>
            </div>
            <CopyButton value={value.password} className="w-full" />
            <p className="flex items-start gap-2 rounded-lg bg-warn-soft px-3 py-2.5 text-sm text-warn">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {t.couriers.passwordWarning}
            </p>
          </div>
        ) : null}

        <DialogFooter>
          <Button onClick={onClose}>{t.couriers.passwordDone}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
