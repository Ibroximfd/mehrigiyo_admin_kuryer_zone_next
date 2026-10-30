"use client";

import type { CourierRow } from "@/features/statistics/summary";
import { formatMinutes, formatSom } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Kuryerlar reytingi — jadval: o'rin, ism, yetkazildi (chiziq + muvaffaqiyat
 * foizi `delivered / assigned`), biriktirilgan, urinishlar, o'rtacha vaqt,
 * naqd (COD). Tartib serverniki: hali bitta ham yetkazmagan kuryerlar
 * oxirida (2026-10-01 C §14.4) — ularning foizi "0 %", biriktirilmagani "—".
 *
 * Ustunlar ko'p — tor ekranda jadval kartochka ichida gorizontal suriladi,
 * sahifaning o'zi esa surilmaydi. Raqam ustunlari `tabular`: ular tikka
 * tizilib solishtiriladi.
 */
export function CourierRankingTable({
  rows,
  showAvg,
}: {
  rows: CourierRow[];
  /** Davr ustunlari (o'rtacha vaqt, biriktirilgan, urinish) — bugungi kesimda yo'q. */
  showAvg: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-ink-faint text-meta py-8 text-center">
        Bu davrda kuryer faoliyati yo&apos;q
      </p>
    );
  }

  const top = Math.max(...rows.map((row) => row.delivered), 1);

  return (
    <div className="scrollbar-thin -mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-line text-ink-faint border-b text-fine">
            <th scope="col" className="w-10 py-2 pr-2 font-medium">#</th>
            <th scope="col" className="py-2 pr-3 font-medium">Kuryer</th>
            <th scope="col" className="w-[34%] py-2 pr-3 font-medium">Yetkazildi</th>
            {showAvg ? (
              <>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Biriktirilgan</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Urinish</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">
                  O&apos;rtacha vaqt
                </th>
              </>
            ) : null}
            <th scope="col" className="py-2 text-right font-medium">Naqd (COD)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.key}
              className="border-line/60 hover:bg-subtle/60 border-b last:border-b-0"
            >
              <td className="py-2.5 pr-2">
                <span
                  className={cn(
                    "tabular inline-flex size-6 items-center justify-center rounded-full text-fine font-semibold",
                    index < 3 && row.delivered > 0
                      ? "bg-brand-soft text-brand"
                      : "text-ink-faint",
                  )}
                >
                  {index + 1}
                </span>
              </td>
              <td className="text-ink max-w-[180px] truncate py-2.5 pr-3 text-dense font-medium" data-no-translit>
                {row.fullName || "—"}
              </td>
              <td className="py-2.5 pr-3">
                <div className="flex items-center gap-2">
                  <span className="text-ink tabular w-8 shrink-0 text-dense font-semibold">
                    {row.delivered}
                  </span>
                  <span className="bg-surface-3 h-1.5 min-w-0 flex-1 overflow-hidden rounded-full">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${(row.delivered / top) * 100}%`,
                        backgroundColor: "var(--order-delivered-mark)",
                      }}
                    />
                  </span>
                  {showAvg ? (
                    <span
                      title="Muvaffaqiyat: yetkazgani / biriktirilgani"
                      className="text-ink-faint tabular w-10 shrink-0 text-right text-fine"
                    >
                      {row.successRate !== null ? `${row.successRate}%` : "—"}
                    </span>
                  ) : null}
                </div>
              </td>
              {showAvg ? (
                <>
                  <td className="text-ink-muted tabular py-2.5 pr-3 text-right text-dense">
                    {row.assigned ?? "—"}
                  </td>
                  <td className="text-ink-muted tabular py-2.5 pr-3 text-right text-dense">
                    {row.attempts ?? "—"}
                  </td>
                  <td className="text-ink-muted tabular py-2.5 pr-3 text-right text-dense whitespace-nowrap">
                    {row.avgMinutes !== null ? formatMinutes(row.avgMinutes) : "—"}
                  </td>
                </>
              ) : null}
              <td className="text-ink-muted tabular py-2.5 text-right text-dense whitespace-nowrap">
                {row.codTotal > 0 ? formatSom(row.codTotal) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
