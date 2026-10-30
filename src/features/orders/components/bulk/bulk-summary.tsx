"use client";

import { CircleCheck, TriangleAlert } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import type { BulkProgress, BulkSummary } from "@/features/orders/bulk";
import { orderCodeMessage } from "@/features/orders/error-hints";

/** Jarayon chizig'i: "12 / 30". */
export function BulkProgressView({ progress }: { progress: BulkProgress }) {
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <div role="status" aria-live="polite" className="space-y-1.5">
      <div className="text-ink-muted flex justify-between text-meta">
        <span>Yuborilmoqda…</span>
        <span className="tabular">
          {progress.done} / {progress.total}
        </span>
      </div>
      <Progress value={percent} className="h-1.5" />
    </div>
  );
}

/**
 * Yakuniy xulosa — qisman muvaffaqiyat modeli: o'tganlari, sabab bo'yicha
 * guruhlangan xatolar (buyurtma raqamlari bilan) va yuborilmay qolganlar.
 */
export function BulkSummaryView({
  summary,
  successLabel,
  numberOf,
}: {
  summary: BulkSummary;
  /** "yo'lga chiqdi", "teg qo'shildi". */
  successLabel: string;
  numberOf: (id: string) => string;
}) {
  return (
    <div role="status" aria-live="polite" className="space-y-2">
      {summary.succeeded.length > 0 ? (
        <p className="bg-ok-soft text-ok flex items-center gap-2 rounded-lg px-3 py-2 text-dense font-medium">
          <CircleCheck className="size-4 shrink-0" />
          {summary.succeeded.length} ta buyurtma {successLabel}
        </p>
      ) : null}
      {summary.failed.map((group) => (
        <div key={group.code} className="bg-danger-soft text-danger rounded-lg px-3 py-2 text-meta">
          <p className="flex items-start gap-2 font-semibold">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            {group.count} ta: {orderCodeMessage(group.code)}
          </p>
          <p className="tabular mt-0.5 pl-5.5 opacity-80">
            {group.ids.map(numberOf).join(", ")}
          </p>
        </div>
      ))}
      {summary.skipped > 0 ? (
        <p className="text-ink-muted text-meta">
          {summary.skipped} ta buyurtma yuborilmadi — jarayon to&apos;xtatildi.
        </p>
      ) : null}
    </div>
  );
}
