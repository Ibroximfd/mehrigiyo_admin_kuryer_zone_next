"use client";

import { useQuery } from "@tanstack/react-query";
import { Banknote } from "lucide-react";
import { useState } from "react";

import { fetchChiefCouriers } from "@/features/chief/api";
import { CourierCodSheet } from "@/features/couriers/components/cod-sheet";
import { HandoversPanel } from "@/features/couriers/components/handovers-panel";
import type { Courier } from "@/features/couriers/types";
import { formatSom } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";

/**
 * Kassa 1-pog'ona: kuryer → bosh kuryer (qo'llanma §C 2.4). Kuryer ilovadan
 * topshirgan pulni bosh kuryer shu yerda qabul qiladi; har kuryerning naqd
 * yig'imi (kunlar, «qabul qildim») yon panelda. Endpointlar hozircha logist
 * yo'li (`logist/cod/handovers/`, `couriers/{id}/settle/`) — backend savoli K1.
 */
export function ChiefCourierCash() {
  const [open, setOpen] = useState<Courier | null>(null);
  const couriers = useQuery({
    queryKey: queryKeys.chiefCouriers,
    queryFn: ({ signal }) => fetchChiefCouriers(signal),
  });
  const list = couriers.data ?? [];
  const withCash = list.filter((courier) => (courier.today.codTotal) > 0);

  return (
    <section className="border-line bg-surface rounded-2xl border p-4 sm:px-5">
      <h2 className="text-ink flex items-center gap-2 text-body font-semibold">
        <Banknote className="text-gold size-4" aria-hidden />
        Kuryerlardan qabul
      </h2>
      <p className="text-ink-muted mt-0.5 text-meta">
        Kuryer topshirgan pulni qabul qiling — keyin pastdagi «Topshirish» bilan bosh logistga berasiz.
      </p>
      <HandoversPanel couriers={list} onOpen={setOpen} />
      {list.length > 0 ? (
        <ul className="divide-line mt-3 divide-y">
          {(withCash.length > 0 ? withCash : list).map((courier) => (
            <li key={courier.id} className="flex items-center gap-2 py-2">
              <span className="text-ink min-w-0 flex-1 truncate text-dense font-medium" data-no-translit>
                {courier.fullName}
              </span>
              <span className="text-ink-muted tabular text-meta">{formatSom(courier.today.codTotal)}</span>
              <button
                type="button"
                onClick={() => setOpen(courier)}
                className="text-link hover:text-brand text-meta font-medium"
              >
                Naqd hisobi
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <CourierCodSheet courier={open} onClose={() => setOpen(null)} />
    </section>
  );
}
