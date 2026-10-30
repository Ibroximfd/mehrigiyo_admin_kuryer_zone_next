"use client";

import { ArrowUp } from "lucide-react";
import { useEffect } from "react";

import type { ColumnScrollState } from "@/features/kanban/components/drag-board";

/**
 * "N yangi buyurtma ↑" — logist ustunni pastga surgan paytda tepaga yangi
 * karta tushsa chiqadi; bosilsa ustun tepasiga silliq qaytadi.
 *
 * Ustun tepasi ko'rinib turgan bo'lsa (yoki logist o'zi tepaga chiqsa)
 * kelishlar "ko'rildi" hisoblanadi va tabletka chiqmaydi. Ustun tanasida
 * yopishib turadi, balandligi nol — kartalar joyidan siljimaydi.
 */
export function NewArrivalsPill({
  count,
  scroll,
  onSeen,
}: {
  count: number;
  scroll: ColumnScrollState;
  onSeen: () => void;
}) {
  const { scrolledDown, scrollToTop } = scroll;

  useEffect(() => {
    if (count > 0 && !scrolledDown) onSeen();
  }, [count, scrolledDown, onSeen]);

  if (count === 0 || !scrolledDown) return null;

  return (
    <div className="pointer-events-none sticky top-1 z-20 mb-0! flex h-0 justify-center">
      <button
        type="button"
        onClick={() => {
          scrollToTop();
          onSeen();
        }}
        onPointerDown={(event) => event.stopPropagation()}
        className="bg-brand text-brand-ink hover:bg-brand-hover elev-2 animate-in fade-in slide-in-from-top-2 pointer-events-auto inline-flex h-7 items-center gap-1 rounded-full px-3 text-fine font-semibold whitespace-nowrap"
      >
        <ArrowUp className="size-3.5" aria-hidden />
        {count} yangi buyurtma
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        Ustun tepasida {count} ta yangi buyurtma
      </span>
    </div>
  );
}
