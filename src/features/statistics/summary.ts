import type { LogistStatistics } from "./types";

/**
 * Statistika sahifasining ko'rsatkichlari — `logist/statistics/` dan
 * (2026-10-01 C §14). Ilgari "jami buyurtma" va "to'lanadigan summa" doska
 * ustunlarini qo'shib chiqarilardi — bu ikkinchi so'rov edi va boshqa
 * filialga O'TKAZILGAN buyurtmani yo'qotardi (§14.2). Endi `totals.orders`,
 * `in_progress`, `payable_amount` serverdan.
 *
 * Qoidalar (§14.5):
 *   — `orders`, `delivered`, `cancelled` UCH xil sana maydonidan: biri
 *     boshqasidan chiqarilmaydi va bir-biriga ulush qilinmaydi;
 *   — jami kunlik qatorlardan hisoblanmaydi;
 *   — `assigned = 0` bo'lsa muvaffaqiyat foizi `null` ("—"), `NaN`/`0 %` emas;
 *   — `avg_minutes: null` — "ma'lumot yo'q", `0` emas.
 */

export type CourierRow = {
  key: string;
  fullName: string;
  delivered: number;
  /** Davrda biriktirilgan; ma'lum emas — `null`. */
  assigned: number | null;
  /** Davrdagi urinishlar; ma'lum emas — `null`. */
  attempts: number | null;
  /** `delivered / assigned`, 0–100; biriktirilgani yo'q yoki noma'lum — `null`. */
  successRate: number | null;
  avgMinutes: number | null;
  codTotal: number;
};

export type StatsSummary = {
  /** Davrda yaratilgan buyurtmalar (`created_at`); ma'lum emas — `null`. */
  orders: number | null;
  /** Shulardan hali yopilmaganlar (`created_at` davri). */
  inProgress: number | null;
  /** Davrning hamma buyurtmasi bo'yicha to'lanadigan summa. */
  payableAmount: number | null;
  /** Yetkazilganlar (`delivered_at` davri). */
  delivered: number | null;
  /** Bekor qilinganlar (`cancelled_at` davri). */
  cancelled: number | null;
  /** Kassa tushumi — mijoz haqiqatan to'lagan (`delivered_payable_amount`). */
  cashIn: number | null;
  /** Tovar aylanmasi — mol summasi, chegirmadan OLDIN (`delivered_amount`). */
  goodsTurnover: number | null;
  attempts: number | null;
  avgDeliveryMinutes: number | null;
  codTotal: number | null;
  /** Kamida bitta buyurtma yetkazgan kuryerlar. */
  activeCouriers: number;
  /** Bir faol kuryerga o'rtacha yetkazish; kuryer bo'lmasa `null`. */
  perCourier: number | null;
  couriers: CourierRow[];
};

/** Muvaffaqiyat foizi — bo'luvchi nol yoki noma'lum bo'lsa `null` (§14.4). */
export function successRate(delivered: number, assigned: number | null): number | null {
  if (assigned === null || assigned <= 0) return null;
  return Math.min(100, Math.round((delivered / assigned) * 100));
}

export function summarizeStatistics({
  stats,
  fallbackCouriers = [],
}: {
  stats: LogistStatistics | null;
  /**
   * Statistika endpointi javob bermasa — kuryerlar ro'yxatidagi BUGUNGI
   * hisob (davrga bo'ysunmaydi, sahifa buni alohida aytadi).
   */
  fallbackCouriers?: readonly {
    id: number;
    fullName: string;
    delivered: number;
    codTotal: number;
  }[];
}): StatsSummary {
  const totals = stats?.totals ?? null;

  const couriers: CourierRow[] = stats
    ? // Server tartibi: yetkazgani ko'pi, ishlamayotganlar oxirida (§14.4).
      stats.couriers.map((courier) => ({
        key: String(courier.id),
        fullName: courier.fullName,
        delivered: courier.delivered,
        assigned: courier.assigned,
        attempts: courier.attempts,
        successRate: successRate(courier.delivered, courier.assigned),
        avgMinutes: courier.avgMinutes,
        codTotal: courier.codTotal,
      }))
    : [...fallbackCouriers]
        .sort((a, b) => b.delivered - a.delivered || a.fullName.localeCompare(b.fullName))
        .map((courier) => ({
          key: String(courier.id),
          fullName: courier.fullName,
          delivered: courier.delivered,
          assigned: null,
          attempts: null,
          successRate: null,
          avgMinutes: null,
          codTotal: courier.codTotal,
        }));

  const delivering = couriers.filter((courier) => courier.delivered > 0);
  const deliveredByCouriers = delivering.reduce((sum, courier) => sum + courier.delivered, 0);

  return {
    orders: totals?.orders ?? null,
    inProgress: totals?.inProgress ?? null,
    payableAmount: totals?.payableAmount ?? null,
    delivered: totals?.delivered ?? null,
    cancelled: totals?.cancelled ?? null,
    cashIn: totals?.deliveredPayableAmount ?? null,
    goodsTurnover: totals?.deliveredAmount ?? null,
    attempts: totals?.attempts ?? null,
    avgDeliveryMinutes: totals?.avgDeliveryMinutes ?? null,
    codTotal: totals?.codTotal ?? null,
    activeCouriers: delivering.length,
    perCourier:
      delivering.length > 0
        ? Math.round((deliveredByCouriers / delivering.length) * 10) / 10
        : null,
    couriers,
  };
}
