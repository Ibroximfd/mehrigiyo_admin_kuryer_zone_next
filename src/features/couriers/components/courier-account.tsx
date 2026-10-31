"use client";

import { CopyButton } from "@/components/kit/copy-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Courier } from "@/features/couriers/types";
import { formatPhone } from "@/lib/format";

/**
 * Parol faqat shu oynada, bir marta ko'rinadi — keyin uni hech qayerdan
 * o'qib bo'lmaydi. Bosh kuryer uni kuryerga aytadi.
 */
export function PasswordRevealDialog({
  courier,
  password,
  onClose,
}: {
  courier: Pick<Courier, "fullName" | "phone"> | null;
  password: string | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={password !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="w-[24rem] max-w-[calc(100vw-2rem)]">
        <DialogTitle>Kuryerga ayting</DialogTitle>
        <DialogDescription>
          Parol faqat hozir ko&apos;rinadi — keyin uni qayta ko&apos;rib
          bo&apos;lmaydi.
        </DialogDescription>

        <dl className="bg-subtle mt-3 grid gap-2 rounded-xl p-4">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-muted text-meta">Telefon</dt>
            <dd className="text-ink tabular font-semibold">
              {courier ? formatPhone(courier.phone) : "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-muted text-meta">Parol</dt>
            <dd>
              <CopyButton
                value={password ?? ""}
                label="Parolni nusxalash"
                successMessage="Parol nusxalandi"
              >
                <span className="text-ink tabular text-title font-semibold tracking-wide">
                  {password}
                </span>
              </CopyButton>
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex justify-end">
          <Button onClick={onClose}>Aytdim</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
