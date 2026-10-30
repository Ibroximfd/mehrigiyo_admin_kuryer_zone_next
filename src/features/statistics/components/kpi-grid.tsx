"use client";

import {
  Banknote,
  PackageCheck,
  PackageX,
  ShoppingBag,
  Timer,
  Truck,
} from "lucide-react";

import { StatTile } from "@/components/kit/stat-tile";
import type { StatsSummary } from "@/features/statistics/summary";
import { formatMinutes, formatSom } from "@/lib/format";

/**
 * Asosiy ko'rsatkichlar — oltita kartochka: hajm → natija → pul → tezlik →
 * jamoa. Telefonda ikki ustun, planshetda uch, keng ekranda bitta qator.
 *
 * Har kartochka O'Z sana maydoni bilan yoziladi (2026-10-01 C §14.5):
 * "Buyurtmalar" — yaratilgan, "Yetkazildi" — yetkazilgan, "Bekor" — bekor
 * qilingan sanasi bo'yicha. Ular bir to'plam emas, shuning uchun ulush
 * chizig'i va "N % buyurtmalardan" yozuvi YO'Q.
 *
 * Pul ikki xil va nomi bilan ajratiladi (§14.2): "Kassa tushumi" — mijoz
 * to'lagani, "tovar aylanmasi" — mol summasi chegirmadan OLDIN.
 *
 * Server bermagan qiymat "—", nol emas: nol "hech narsa bo'lmadi" degani.
 */
export function KpiGrid({ summary }: { summary: StatsSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <StatTile
        Icon={ShoppingBag}
        label="Buyurtmalar"
        {...countProps(summary.orders)}
        sub={<OrdersSub inProgress={summary.inProgress} payable={summary.payableAmount} />}
        color="var(--brand)"
      />
      <StatTile
        Icon={PackageCheck}
        label="Yetkazildi"
        {...countProps(summary.delivered)}
        sub="yetkazilgan sanasi bo'yicha"
        color="var(--order-delivered-mark)"
      />
      <StatTile
        Icon={PackageX}
        label="Bekor qilindi"
        {...countProps(summary.cancelled)}
        sub={
          summary.attempts !== null && summary.attempts > 0
            ? `yana ${summary.attempts} ta yetkazib bo'lmadi`
            : "bekor qilingan sanasi bo'yicha"
        }
        color="var(--order-cancelled-mark)"
      />
      <StatTile
        Icon={Banknote}
        label="Kassa tushumi"
        text={summary.cashIn !== null ? formatSom(summary.cashIn) : "—"}
        sub={
          summary.goodsTurnover !== null
            ? `tovar aylanmasi: ${formatSom(summary.goodsTurnover)}`
            : "yetkazilganlardan mijoz to'lagani"
        }
        color="var(--gold-mark)"
      />
      <StatTile
        Icon={Timer}
        label="O'rtacha yetkazish"
        text={
          summary.avgDeliveryMinutes !== null
            ? formatMinutes(summary.avgDeliveryMinutes)
            : "—"
        }
        sub="tasdiqlangandan yetkazilgangacha"
        color="var(--order-shipping-mark)"
      />
      <StatTile
        Icon={Truck}
        label="Faol kuryerlar"
        value={summary.activeCouriers}
        sub={
          summary.perCourier !== null
            ? `o'rtacha ${summary.perCourier} ta / kuryer`
            : summary.codTotal !== null && summary.codTotal > 0
              ? `naqd: ${formatSom(summary.codTotal)}`
              : "yetkazish qayd etilmagan"
        }
        color="var(--info)"
      />
    </div>
  );
}

/**
 * "Buyurtmalar" izohi — o'sha `created_at` to'plamidan: nechtasi hali ochiq
 * va davrning to'lanadigan summasi (`in_progress`, `payable_amount`).
 */
function OrdersSub({ inProgress, payable }: { inProgress: number | null; payable: number | null }) {
  if (inProgress === null && payable === null) return <>davrda kelgan</>;
  return (
    <>
      {inProgress !== null ? <span>{`${inProgress} ta hali ochiq`}</span> : null}
      {inProgress !== null && payable !== null ? " · " : null}
      {payable !== null ? <span>{`${formatSom(payable)} to'lanadigan`}</span> : null}
    </>
  );
}

/** Sanoq: ma'lum bo'lsa yugurib chiqadi, aks holda "—". */
function countProps(value: number | null): { value: number } | { text: string } {
  return value !== null ? { value } : { text: "—" };
}
