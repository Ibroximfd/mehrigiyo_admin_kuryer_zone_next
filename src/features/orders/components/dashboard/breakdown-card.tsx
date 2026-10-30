import Link from "next/link";

import { DashboardCard } from "@/features/orders/components/dashboard/dashboard-card";
import {
  NO_PAYMENT_KEY,
  groupOrdersByPayment,
  totalBreakdownRow,
} from "@/features/orders/dashboard";
import type { StatusCounts } from "@/features/orders/dashboard";
import type { LogistOrder } from "@/features/orders/types";
import { groupThousands } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

const HEAD = "border-line text-ink-faint text-micro border-b px-2 py-1.5 text-left font-semibold uppercase whitespace-nowrap";
const CELL = "border-line/70 border-b px-2 py-2 tabular";
const STATUS_KEYS: Array<[keyof StatusCounts, string]> = [
  ["confirmed", "Tasdiqlangan"],
  ["shipping", "Yo'lda"],
  ["delivered", "Yetkazildi"],
  ["cancelled", "Atkaz"],
];

/**
 * O'z filialining taqsimoti — to'lov turi × status: sonlar, kuryersizlar
 * (qizil), summa va jami qatori. Logist faqat o'z filialida ishlaydi
 * (backend filial bo'yicha cheklaydi), shuning uchun filiallar kesimi yo'q.
 * Doska ustunlari to'liq yuklanmagan bo'lsa bu ochiq aytiladi.
 */
export function BreakdownCard({
  title,
  orders,
  partial,
}: {
  title: string;
  orders: LogistOrder[];
  /** Kamida bitta ustun to'liq yuklanmagan — sonlar yuklangan qism bo'yicha. */
  partial: boolean;
}) {
  const rows = groupOrdersByPayment(orders);
  const total = totalBreakdownRow(rows);

  return (
    <DashboardCard
      title={title}
      aside={
        <Link href={`${ROUTES.orders}?view=list&group=status`} className="text-link hover:text-brand">
          barchasi
        </Link>
      }
      className="flex-1"
    >
      {rows.length === 0 ? (
        <p className="text-ink-faint py-6 text-center text-meta">Tanlangan davrda buyurtma yo&apos;q.</p>
      ) : (
        <div className="scrollbar-thin -mx-1 overflow-x-auto px-1">
          <table className="w-full border-separate border-spacing-0 text-dense">
            <thead>
              <tr>
                <th scope="col" className={HEAD}>To&apos;lov</th>
                {STATUS_KEYS.map(([key, label]) => (
                  <th key={key} scope="col" className={HEAD}>{label}</th>
                ))}
                <th scope="col" className={HEAD}>Kuryersiz</th>
                <th scope="col" className={cn(HEAD, "text-right")}>Summa</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <th
                    scope="row"
                    className={cn(
                      "border-line/70 border-b px-2 py-2 text-left font-semibold whitespace-nowrap",
                      row.key === NO_PAYMENT_KEY && "text-ink-faint font-medium",
                    )}
                  >
                    {row.label}
                  </th>
                  {STATUS_KEYS.map(([key]) => (
                    <td key={key} className={CELL}>{row.counts[key]}</td>
                  ))}
                  <td className={cn(CELL, row.noCourier > 0 ? "text-danger font-semibold" : "text-ink-faint")}>
                    {row.noCourier}
                  </td>
                  <td className={cn(CELL, "text-right font-semibold")}>{groupThousands(row.amount)}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="px-2 py-2">Jami</td>
                {STATUS_KEYS.map(([key]) => (
                  <td key={key} className="tabular px-2 py-2">{total.counts[key]}</td>
                ))}
                <td className="text-danger tabular px-2 py-2">{total.noCourier}</td>
                <td className="tabular px-2 py-2 text-right">{groupThousands(total.amount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {partial ? (
        <p className="text-ink-faint text-fine">
          Doskadagi yuklangan buyurtmalar bo&apos;yicha — to&apos;liq kesim statistikada.
        </p>
      ) : null}
    </DashboardCard>
  );
}
