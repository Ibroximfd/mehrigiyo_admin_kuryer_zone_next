"use client";

import { LoaderCircle, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Qaytarib bo'lmaydigan amal uchun tasdiq oynasi.
 *
 * `window.confirm()` ning o'rni. Nega almashtirildi:
 *  • OS oynasi bezalmaydi — xavfli amal xavfli ko'rinmaydi;
 *  • oqibatini ajratib yozib bo'lmaydi (hammasi bitta kulrang matn);
 *  • butun sahifani bloklaydi.
 *
 * Bu yerda tasdiqlash tugmasi `destructive` ko'rinishida va oqibat alohida
 * qatorda turadi — operator nima bo'lishini bosishdan oldin o'qiydi.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  /** Nima qaytarib bo'lmasligi — ogohlantirish qatorida ko'rinadi. */
  consequence,
  confirmLabel = "Tasdiqlash",
  cancelLabel = "Bekor qilish",
  isPending = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  consequence?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isPending?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[26rem] max-w-[calc(100vw-2rem)]">
        <div className="flex gap-3">
          <span
            aria-hidden
            className="bg-danger-soft mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg"
          >
            <TriangleAlert className="text-danger size-4.5" />
          </span>

          <div className="min-w-0 flex-1">
            <DialogTitle className="text-ink text-title">{title}</DialogTitle>
            {description ? (
              <DialogDescription className="text-ink-muted text-dense mt-1.5">
                {description}
              </DialogDescription>
            ) : null}
          </div>
        </div>

        {consequence ? (
          <p className="bg-warn-soft text-warn text-meta mt-4 rounded-lg px-3 py-2 leading-relaxed">
            {consequence}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
