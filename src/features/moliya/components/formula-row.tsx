"use client";

import { formatCompactMoney, groupThousands } from "@/lib/format";
import { cn } from "@/lib/utils";

import { financeShares, type FinanceSummary } from "../types";

/**
 * Asosiy hisob (dizayn 4, «3») — bitta qator + taqsimot chizig'i:
 * tushum − operator foizi − logistika = qoldi. Yashil — qoldi, to'q sariq
 * — logistika, och sariq — operator. Boshqa hech narsa ayirilmaydi (§7.2).
 */
export function FormulaRow({ summary }: { summary: FinanceSummary }) {
  const shares = financeShares(summary);
  const operatorPercent = summary.revenue > 0 ? (summary.operatorFee / summary.revenue) * 100 : 0;
  // Logistika manzil bo'yicha: 1 manzil = 1 to'lov. Eski deploy manzil
  // sonini bermasa — buyurtma soni.
  const addresses = summary.addresses ?? summary.orders;
  const perAddress = addresses > 0 ? Math.round(summary.logistics / addresses) : 0;
  const parts = [
    { key: "remaining", label: "Qoldi", color: "var(--ok)", ink: "var(--brand-ink)", value: summary.remaining },
    { key: "logistics", label: "Logistika", color: "var(--warn)", ink: "var(--brand-ink)", value: summary.logistics },
    { key: "operator", label: "Operator foizi", color: "var(--gold-mark)", ink: "var(--ink)", value: summary.operatorFee },
  ] as const;

  return (
    <section className="glass-card border-brand rounded-2xl border p-5">
      <div className="grid grid-cols-2 items-center gap-y-4 lg:grid-cols-[1.2fr_1fr_1fr_1.1fr]">
        <Term label="Tushum" value={summary.revenue} sub={`so'm · ${groupThousands(summary.orders)} buyurtma yetkazildi`} size="lg" />
        <Term label={`− Operator foizi · ${operatorPercent.toFixed(operatorPercent % 1 ? 1 : 0)}%`} value={summary.operatorFee} sub="operatorlarga" color="var(--warn)" divider />
        <Term
          label={`− Logistika · ${groupThousands(perAddress)} × ${groupThousands(addresses)}`}
          value={summary.logistics}
          sub={summary.addresses !== null ? `${groupThousands(addresses)} manzil · kuryer va yetkazish` : "kuryer va yetkazish"}
          color="var(--warn)"
          divider
        />
        <div className="bg-ok-soft min-w-0 rounded-xl px-5 py-3.5 lg:ml-2.5">
          <p className="text-ok text-micro uppercase">= Qoldi</p>
          <p className="text-ok tabular text-stat mt-1 truncate font-extrabold tracking-tight">{groupThousands(summary.remaining)}</p>
          <p className="text-ok text-meta">so&apos;m · tushumning {shares.remaining.toFixed(0)}%</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex h-7 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Tushum taqsimoti">
          {parts.map((part) => {
            const share = shares[part.key];
            if (share <= 0) return null;
            return (
              <span
                key={part.key}
                className="flex items-center overflow-hidden px-3 text-dense font-bold whitespace-nowrap"
                style={{ width: `${share}%`, backgroundColor: part.color, color: part.ink }}
              >
                {share >= 12 ? `${part.label} ${share.toFixed(0)}%` : share >= 4 ? `${share.toFixed(0)}%` : ""}
              </span>
            );
          })}
        </div>
        <ul className="text-ink-muted mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-meta">
          {parts.map((part) => (
            <li key={part.key} className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-sm" style={{ backgroundColor: part.color }} />
              {part.label} {shares[part.key].toFixed(0)}% · {formatCompactMoney(part.value)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Term({
  label,
  value,
  sub,
  color = "var(--ink)",
  size = "md",
  divider = false,
}: {
  label: string;
  value: number;
  sub: string;
  color?: string;
  size?: "md" | "lg";
  divider?: boolean;
}) {
  return (
    <div className={cn("min-w-0", divider ? "border-line lg:border-l lg:px-5" : "lg:pr-5")}>
      <p className="text-ink-faint text-micro uppercase">{label}</p>
      <p className={cn("tabular mt-1 truncate font-bold tracking-tight", size === "lg" ? "text-stat font-extrabold" : "text-h1")} style={{ color }}>
        {groupThousands(value)}
      </p>
      <p className="text-ink-faint text-meta">{sub}</p>
    </div>
  );
}
