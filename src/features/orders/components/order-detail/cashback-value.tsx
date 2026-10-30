"use client";

import { Gift } from "lucide-react";

import type { CashbackView } from "@/features/orders/cashback";
import { cn } from "@/lib/utils";

const TONE: Record<CashbackView["tone"], string> = {
  pending: "text-ink-muted",
  credited: "text-ok",
  awaiting: "text-warn",
  reversed: "text-danger",
};

/**
 * Ball keshbegi (2026-10-01 C §3) — faqat o'qish. Mijoz SARFLAGAN ball
 * (`points_used`) summalar blokida; bu yerda OLADIGANI. Ko'rinish
 * `cashbackView` dan (`null` bo'lsa chaqiruvchi qatorni chizmaydi).
 */
export function CashbackValue({ view }: { view: CashbackView }) {
  return (
    <span className="flex flex-col items-end gap-0.5 text-right">
      <span className={cn("inline-flex items-center gap-1 font-semibold", TONE[view.tone])}>
        <Gift className="size-3.5 shrink-0" aria-hidden />
        <span className="tabular">{view.title}</span>
      </span>
      {view.money || view.hint ? (
        <span className="text-ink-faint text-fine">
          {view.money ? (
            <span className="tabular" data-no-translit>
              {view.money}
            </span>
          ) : null}
          {view.money && view.hint ? " · " : null}
          {view.hint ? <span className="tabular">{view.hint}</span> : null}
        </span>
      ) : null}
    </span>
  );
}
