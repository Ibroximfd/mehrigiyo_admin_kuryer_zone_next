"use client";

import { AnimatedNumber } from "@/components/fx/animated-number";
import type { Courier } from "@/features/couriers/types";
import { overdueDays } from "@/features/orders/card-signals";
import type { OrderBoardColumn } from "@/features/orders/board";
import { cancelReasonBreakdown } from "@/features/orders/dashboard";
import { orderStatusInfo } from "@/features/orders/types";
import type { LogistOrder } from "@/features/orders/types";
import { formatCompactMoney, formatSom } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tile = {
  key: string;
  label: string;
  value: React.ReactNode;
  hint: string;
  mark: string;
  danger?: boolean;
  /** Matnli qiymat (summa) — raqamdan bir pog'ona kichik, 6 ustunga sig'sin. */
  compact?: boolean;
};

function Tile({ tile, index }: { tile: Tile; index: number }) {
  return (
    <div
      style={{ "--t": tile.mark, "--fx-i": index } as React.CSSProperties}
      className="fx-rise glass-card kpi-tile lift flex min-w-0 flex-col gap-1.5 rounded-2xl border px-4 py-4"
    >
      {/* `relative` — matn kartaning burchak tusidan (`::after`) ustida tursin. */}
      <span className="text-ink-faint text-micro relative truncate uppercase">{tile.label}</span>
      <span
        className={cn(
          "tabular relative leading-none font-bold",
          tile.compact ? "text-display" : "text-stat",
          tile.danger ? "text-danger" : "text-ink",
        )}
      >
        {tile.value}
      </span>
      <span className="text-ink-muted relative truncate text-meta">{tile.hint}</span>
    </div>
  );
}

/**
 * 6 ta KPI (dizayn `Logist_Dashboard`): kutilmoqda, kuryersiz, yo'lda,
 * bugun yetkazildi, atkaz, naqd yig'iladi. Sonlar — doska ustunlari
 * (server), sabablar va kechikish — yuklangan kartalardan.
 */
export function KpiTiles({
  column,
  couriers,
  isToday,
}: {
  column: (status: string) => OrderBoardColumn<LogistOrder> | undefined;
  couriers: Courier[] | null;
  /** Davr "bugun" — dizayndagi "Bugun yetkazildi" yorlig'i. */
  isToday: boolean;
}) {
  const confirmed = column("confirmed");
  const shipping = column("shipping");
  const delivered = column("delivered");
  const cancelled = column("cancelled");

  const noCourier = (confirmed?.orders ?? []).filter((order) => order.courier === null).length;
  const late = (shipping?.orders ?? []).filter((order) => overdueDays(order) > 0).length;
  const reasons = cancelReasonBreakdown(cancelled?.orders ?? []);
  const cod = (couriers ?? []).reduce((sum, courier) => sum + courier.today.codTotal, 0);
  const holders = (couriers ?? []).filter((courier) => courier.today.codTotal > 0).length;

  const tiles: Tile[] = [
    {
      key: "no-courier",
      label: "Tasdiqlangan · kuryersiz",
      value: <AnimatedNumber value={noCourier} />,
      hint: "jo'natish kerak",
      mark: orderStatusInfo("confirmed").mark,
      danger: noCourier > 0,
    },
    {
      key: "shipping",
      label: "Yo'lda",
      value: <AnimatedNumber value={shipping?.count ?? 0} />,
      hint: late > 0 ? `${late} ta kechikkan` : "kechikish yo'q",
      mark: orderStatusInfo("shipping").mark,
    },
    {
      key: "delivered",
      label: isToday ? "Bugun yetkazildi" : "Yetkazildi",
      value: <AnimatedNumber value={delivered?.count ?? 0} />,
      hint: delivered?.totalAmount != null ? formatSom(delivered.totalAmount) : "—",
      mark: orderStatusInfo("delivered").mark,
    },
    {
      key: "cancelled",
      label: "Atkaz",
      value: <AnimatedNumber value={cancelled?.count ?? 0} />,
      hint: reasons.length ? reasons.map((item) => `${item.count} · ${item.label.toLowerCase()}`).join(", ") : "sabablar yo'q",
      mark: orderStatusInfo("cancelled").mark,
    },
    {
      key: "cod",
      label: "Naqd yig'iladi",
      value: couriers ? formatCompactMoney(cod) : "—",
      hint: couriers ? `${holders} kuryer · topshirilmagan` : "kuryerlar bo'limi kutilmoqda",
      mark: "var(--amber)",
      compact: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {tiles.map((tile, index) => (
        <Tile key={tile.key} tile={tile} index={index} />
      ))}
    </div>
  );
}
