import { Info } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Markaz filtri tanlanganda bo'lim izohi (136-javob §4): server yolg'on son
 * ko'rsatmaslik uchun ba'zi ustunlarni umumiy qoldiradi — ekran buni ochiq
 * aytadi, nima bo'linadi va nima bo'linmaydi.
 */
export function NotSplitNote({ split, common, className }: { split: string; common: string; className?: string }) {
  return (
    <p role="note" className={cn("bg-subtle text-ink-muted flex items-start gap-2 rounded-2xl px-4 py-3 text-dense", className)}>
      <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>
        <span className="text-ink font-semibold">Markaz bo&apos;yicha: </span>
        {split}
        <span className="block">
          <span className="text-ink font-semibold">Umumiy (markazga bo&apos;linmaydi): </span>
          {common}
        </span>
      </span>
    </p>
  );
}
