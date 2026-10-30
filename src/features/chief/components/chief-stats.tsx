"use client";

import { useQuery } from "@tanstack/react-query";
import { ChartColumnBig } from "lucide-react";

import { EmptyView, ErrorView } from "@/components/kit/state-views";
import { StatusPill } from "@/components/kit/status-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchChiefStats } from "@/features/chief/api";
import { errorMessage } from "@/lib/api-client";
import { formatSom, groupThousands } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";

import { ChiefPeriodField, useChiefPeriod } from "./chief-period";

/**
 * Analitika (§C 2.5): kuryerlar kesimida — sana logist YAKUNLAGAN kun,
 * «manzil» logist «Kuryer haqi» va kuryer ilovasi bilan bir xil formula.
 */
export function ChiefStats() {
  const period = useChiefPeriod(0);
  const stats = useQuery({
    queryKey: queryKeys.chiefStats({ from: period.from, to: period.to }),
    queryFn: ({ signal }) => fetchChiefStats({ from: period.from, to: period.to }, signal),
  });
  const data = stats.data;

  return (
    <div className="flex flex-col gap-3.5">
      <ChiefPeriodField period={period} />
      {stats.isPending ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : stats.isError ? (
        <ErrorView message={errorMessage(stats.error, "Analitikani yuklashda xatolik")} onRetry={() => void stats.refetch()} className="border-line bg-surface rounded-xl border" />
      ) : !data || data.couriers.length === 0 ? (
        <EmptyView Icon={ChartColumnBig} title="Bu davrda yakunlangan zakaz yo'q" description="Sanani kengaytiring — logist yakunlagan zakazlar shu yerda kuryerlar bo'yicha chiqadi." className="border-line bg-surface rounded-xl border" />
      ) : (
        <div className="border-line bg-surface overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-xl text-dense">
            <thead>
              <tr className="text-ink-faint border-line border-b text-meta">
                <th className="px-4 py-2.5 text-left font-medium">Kuryer</th>
                <th className="px-3 py-2.5 text-right font-medium">Yetkazildi</th>
                <th className="px-3 py-2.5 text-right font-medium">Atkaz</th>
                <th className="px-3 py-2.5 text-right font-medium" title="Kuryer yakunlagan, logist hali tasdiqlamagan">Jarayonda</th>
                <th className="px-3 py-2.5 text-right font-medium">Manzil</th>
                <th className="px-4 py-2.5 text-right font-medium">Haq</th>
              </tr>
            </thead>
            <tbody>
              {data.couriers.map((row) => (
                <tr key={row.courier.id} className="border-line border-b">
                  <td className="px-4 py-2.5">
                    <span className="text-ink font-semibold" data-no-translit>{row.courier.fullName}</span>{" "}
                    {row.courier.onShift ? <StatusPill label="smenada" color="var(--ok)" size="sm" /> : null}
                  </td>
                  <td className="tabular px-3 py-2.5 text-right">{groupThousands(row.delivered)}</td>
                  <td className="tabular px-3 py-2.5 text-right">{groupThousands(row.refused)}</td>
                  <td className="tabular text-ink-muted px-3 py-2.5 text-right">{groupThousands(row.awaiting)}</td>
                  <td className="tabular px-3 py-2.5 text-right">
                    {groupThousands(row.addresses)}
                    {row.addressesManual ? <span className="text-ink-faint text-fine">{` (qo'lda ${row.addressesManual > 0 ? "+" : ""}${row.addressesManual})`}</span> : null}
                  </td>
                  <td className="tabular px-4 py-2.5 text-right font-semibold">{row.pay === null ? "—" : formatSom(row.pay)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-subtle/60 text-ink font-bold">
                <th scope="row" className="px-4 py-2.5 text-left">Jami</th>
                <td className="tabular px-3 py-2.5 text-right">{groupThousands(data.totals.delivered)}</td>
                <td className="tabular px-3 py-2.5 text-right">{groupThousands(data.totals.refused)}</td>
                <td className="tabular px-3 py-2.5 text-right">{groupThousands(data.totals.awaiting)}</td>
                <td className="tabular px-3 py-2.5 text-right">{groupThousands(data.totals.addresses)}</td>
                <td className="tabular px-4 py-2.5 text-right">{data.totals.pay === null ? "—" : formatSom(data.totals.pay)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
