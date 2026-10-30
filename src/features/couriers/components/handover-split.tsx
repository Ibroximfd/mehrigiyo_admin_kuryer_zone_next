import { Landmark } from "lucide-react";

import type { Handover } from "@/features/couriers/types";
import { cashPointLabel } from "@/features/zones/types";
import { formatSom } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Pul qayerga topshiriladi (kassa nuqtasi) va filiallar bo'yicha bo'linishi.
 * Eski e'lonlarda ikkalasi ham yo'q — komponent hech narsa chizmaydi.
 * Bo'linish bitta filialdan iborat bo'lsa ham ko'rsatiladi: summaning
 * qaysi filialga tegishli ekani pul kassaga tushganda muhim.
 *
 * Faqat `span` — tugma (bosiladigan qator) ichida ham to'g'ri HTML.
 */
export function HandoverSplit({
  handover,
  className,
}: {
  handover: Pick<Handover, "cashPoint" | "byFilial"> | null;
  className?: string;
}) {
  if (!handover || (!handover.cashPoint && handover.byFilial.length === 0)) return null;

  return (
    <span className={cn("flex flex-col gap-1", className)}>
      {handover.cashPoint ? (
        <span className="text-ink-muted flex items-center gap-1 text-fine">
          <Landmark className="size-3 shrink-0" aria-hidden />
          Kassa:
          {/* Xodim/kassa nomi — tarjima qilinmaydi; zaxira yorliq — tarjima qilinadi. */}
          <span
            className="text-ink font-medium"
            data-no-translit={handover.cashPoint.name ? "" : undefined}
          >
            {cashPointLabel(handover.cashPoint)}
          </span>
        </span>
      ) : null}
      {handover.byFilial.length > 0 ? (
        <span className="flex flex-wrap gap-1">
          {handover.byFilial.map((part, index) => (
            <span
              key={`${part.filialId ?? "x"}-${index}`}
              className="bg-subtle text-ink-muted inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-fine"
            >
              <span data-no-translit>{part.filialName || "—"}</span>
              <span className="text-ink tabular font-semibold">
                {part.amountDisplay ?? formatSom(part.amount)}
              </span>
              <span className="tabular">{`· ${part.orders} ta`}</span>
            </span>
          ))}
        </span>
      ) : null}
    </span>
  );
}
