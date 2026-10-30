import type { LogistStatistics } from "./types";

export type CourierPayRow = {
  id: number;
  fullName: string;
  /** Manzil soni — avto + qo'lda. */
  stops: number;
  /** Shundan logist qo'lda qo'shgan/ayirgani. */
  manual: number;
  pay: number;
};

export type CourierPaySummary = {
  stops: number;
  rate: number;
  total: number;
  rows: CourierPayRow[];
};

/**
 * Kuryer haqi kesimi (`LOGIST_03` §3): manzil soni = to'xtashsiz yetkazilgan
 * + alohida to'xtashlar + qo'lda tuzatish, `pay = manzil × stavka`. Hamma
 * son serverdan — bu yerda faqat tartib va filtr.
 *
 * Davrda yetkazgan, lekin manzili 0 bo'lgan kuryer ham ro'yxatda qoladi —
 * logist unga qo'lda +1 qila olsin.
 *
 * Eski deploy `stops` bermasa `null` — bo'lim umuman chizilmaydi (nol
 * "hech kim ishlamadi" degani bo'lib qolardi).
 */
export function courierPaySummary(stats: LogistStatistics | null): CourierPaySummary | null {
  if (!stats || stats.totals.stops === null) return null;
  const rate = stats.totals.courierPayRate ?? 0;
  const rows = stats.couriers
    .filter((courier) => (courier.stops ?? 0) > 0 || courier.delivered > 0 || (courier.stopsManual ?? 0) !== 0)
    .map((courier) => ({
      id: courier.id,
      fullName: courier.fullName,
      stops: courier.stops ?? 0,
      manual: courier.stopsManual ?? 0,
      pay: courier.pay ?? (courier.stops ?? 0) * rate,
    }))
    .sort((a, b) => b.stops - a.stops || a.fullName.localeCompare(b.fullName));

  return {
    stops: stats.totals.stops,
    rate,
    total: stats.totals.courierPay ?? stats.totals.stops * rate,
    rows,
  };
}
