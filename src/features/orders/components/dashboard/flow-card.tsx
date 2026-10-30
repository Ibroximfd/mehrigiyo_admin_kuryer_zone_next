import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { FlowPulse } from "@/components/fx/flow-pulse";
import { DashboardCard } from "@/features/orders/components/dashboard/dashboard-card";
import type { OrderBoardColumn } from "@/features/orders/board";
import { flowTimings, formatSpan } from "@/features/orders/dashboard";
import { orderStatusInfo } from "@/features/orders/types";
import type { LogistOrder } from "@/features/orders/types";
import { formatPercent } from "@/lib/format";
import { ROUTES } from "@/lib/routes";

const FLOW = ["confirmed", "shipping", "delivered"] as const;

/**
 * Oqim kartasi: Tasdiqlangan → Yo'lga chiqarilgan → Yetkazilgan (+ Atkaz
 * alohida) va o'rtacha vaqtlar. Har blok ro'yxatni shu status bilan ochadi.
 */
export function FlowCard({
  column,
  orders,
  periodLabel,
}: {
  column: (status: string) => OrderBoardColumn<LogistOrder> | undefined;
  orders: LogistOrder[];
  /** Sarlavhadagi davr: "Oqim (bugun)". */
  periodLabel: string | null;
}) {
  const timings = flowTimings(orders);
  const cancelled = column("cancelled");

  return (
    <DashboardCard
      title={periodLabel ? `Oqim (${periodLabel})` : "Oqim"}
      aside={
        <Link href={ROUTES.orders} className="text-link hover:text-brand">
          kanbanga →
        </Link>
      }
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            {FLOW.map((status, index) => {
              const info = orderStatusInfo(status);
              return (
                <div key={status} className="flex flex-1 items-center gap-2 sm:gap-0">
                  <Link
                    href={`${ROUTES.orders}?status=${status}&view=list`}
                    style={{ "--mark": info.mark } as React.CSSProperties}
                    className="mark-glow lift flex flex-1 flex-col gap-1 rounded-xl bg-(--mark) px-3.5 py-3 text-white hover:brightness-110"
                  >
                    <b className="tabular text-display leading-none">{column(status)?.count ?? 0}</b>
                    <span className="text-meta opacity-90">{info.label}</span>
                  </Link>
                  {index < FLOW.length - 1 ? (
                    <ArrowRight className="text-ink-faint mx-1.5 hidden size-4 shrink-0 sm:block" aria-hidden />
                  ) : null}
                </div>
              );
            })}
          </div>
          {/* Imzo harakat: bloklar ostida buyurtma oqimi "yuradi" (Tungi yo'l). */}
          <FlowPulse className="hidden sm:block" />
        </div>
        <Link
          href={`${ROUTES.orders}?status=cancelled&view=list`}
          className="bg-danger-soft text-danger flex flex-col gap-1 rounded-xl px-3.5 py-3 sm:ml-3.5 sm:w-30"
        >
          <b className="tabular text-display leading-none">{cancelled?.count ?? 0}</b>
          <span className="text-meta">Atkaz</span>
        </Link>
      </div>
      <div className="text-ink-muted flex flex-wrap gap-x-4 gap-y-1 text-dense">
        <span>
          Tasdiq → jo&apos;natish o&apos;rtacha:{" "}
          <b className="text-ink tabular">{formatSpan(timings.confirmToShipMinutes)}</b>
        </span>
        <span>
          Jo&apos;natish → yetkazish:{" "}
          <b className="text-ink tabular">{formatSpan(timings.shipToDeliverMinutes)}</b>
        </span>
        <span>
          Mijoz tasdiqlash ulushi:{" "}
          <b className="text-ink tabular">
            {timings.clientConfirmShare === null ? "—" : formatPercent(Math.round(timings.clientConfirmShare * 100))}
          </b>
        </span>
      </div>
    </DashboardCard>
  );
}
