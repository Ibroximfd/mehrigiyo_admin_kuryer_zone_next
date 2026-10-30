import { formatCompactMoney, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { OperatorCompare } from "../types";

/**
 * Operator sahifasi (dizayn 5a) uchun «Qanday sotdi» jadvali: o'zi va
 * filialdagi boshqalar yonma-yon; yaxshiroq — yashil, yomonroq — sariq.
 */
const COMPARE_ROWS: Array<{ key: keyof OperatorCompare; label: string; format: (value: number) => string; betterLow?: boolean }> = [
  { key: "leadToOrder", label: "Lid → buyurtma", format: (value) => formatPercent(value * 100) },
  { key: "cancelRate", label: "Otkaz ulushi", format: (value) => formatPercent(value * 100), betterLow: true },
  { key: "avgOrder", label: "O'rtacha chek", format: formatCompactMoney },
  { key: "discounts", label: "Chegirmalar", format: formatCompactMoney, betterLow: true },
  { key: "gifts", label: "Sovg'a (dona)", format: (value) => String(value), betterLow: true },
  { key: "pointsOrders", label: "Ball bilan buyurtma", format: (value) => String(value) },
  { key: "responseMinutes", label: "Javob vaqti (daq.)", format: (value) => String(value), betterLow: true },
];

export function CompareTable({ me, others }: { me: OperatorCompare; others: OperatorCompare }) {
  return (
    <table className="w-full text-dense">
      <thead className="text-ink-faint text-micro uppercase">
        <tr className="border-line bg-subtle border-b">
          <th className="rounded-l-md py-2 pr-3 pl-2 text-left font-semibold">Ko&apos;rsatkich</th>
          <th className="py-2 pr-3 text-right font-semibold">O&apos;zi</th>
          <th className="rounded-r-md py-2 pr-2 text-right font-semibold">Filialdagi boshqalar</th>
        </tr>
      </thead>
      <tbody className="divide-line divide-y">
        {COMPARE_ROWS.map((row) => {
          const mine = me[row.key];
          const theirs = others[row.key];
          const better = row.betterLow ? mine < theirs : mine > theirs;
          const same = mine === theirs;
          return (
            <tr key={row.key}>
              <td className="text-ink-muted py-2 pr-3 pl-2">{row.label}</td>
              <td className={cn("tabular py-2 pr-3 text-right font-mono font-semibold", same ? "text-ink" : better ? "text-ok" : "text-warn")}>{row.format(mine)}</td>
              <td className="text-ink-muted tabular py-2 pr-2 text-right font-mono">{row.format(theirs)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
