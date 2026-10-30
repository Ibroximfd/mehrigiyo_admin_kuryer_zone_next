import { asArray, asInt, asNumber, asRecord, asString } from "@/lib/parse";

/**
 * Analitika — voronka (`18_SKLAD…` §8): lid → buyurtma → dostavka →
 * yetkazildi; otkaz, yo'lda, sabablar, manbalar, kunlar, operatorlar.
 * Hammasi bitta so'rovda.
 */
export type Funnel = {
  leads: number;
  orders: number;
  ordersSum: number;
  shipped: number;
  delivered: number;
  deliveredSum: number;
  cancelled: number;
  cancelledSum: number;
  inTransit: number;
  inTransitOver2d: number;
  cancelReasons: Array<{ code: string; label: string; count: number }>;
  leadSources: Array<{ code: string; label: string; count: number }>;
  byDay: Array<{ date: string; leads: number; orders: number; delivered: number; cancelled: number; inTransit: number; revenue: number }>;
  byOperator: Array<{ operator: { id: number; fullName: string; filial: string }; leads: number; orders: number; delivered: number; cancelled: number; revenue: number; fee: number }>;
  /** O'tgan davrning lid → buyurtma ulushi (0–1) — solishtirish uchun. */
  prevLeadToOrder: number | null;
};

function mapCount(raw: unknown) {
  const json = asRecord(raw);
  return { code: asString(json.code), label: asString(json.label), count: asInt(json.count) };
}

export function mapFunnel(raw: unknown): Funnel {
  const json = asRecord(raw);
  const prev = asRecord(json.prev_period);
  return {
    leads: asInt(json.leads),
    orders: asInt(json.orders),
    ordersSum: asNumber(json.orders_sum),
    shipped: asInt(json.shipped),
    delivered: asInt(json.delivered),
    deliveredSum: asNumber(json.delivered_sum),
    cancelled: asInt(json.cancelled),
    cancelledSum: asNumber(json.cancelled_sum),
    inTransit: asInt(json.in_transit),
    inTransitOver2d: asInt(json.in_transit_over_2d),
    cancelReasons: asArray(json.cancel_reasons).map(mapCount),
    leadSources: asArray(json.lead_sources).map(mapCount),
    byDay: asArray(json.by_day).map((entry) => {
      const row = asRecord(entry);
      return {
        date: asString(row.date),
        leads: asInt(row.leads),
        orders: asInt(row.orders),
        delivered: asInt(row.delivered),
        cancelled: asInt(row.cancelled),
        inTransit: asInt(row.in_transit),
        revenue: asNumber(row.revenue),
      };
    }),
    byOperator: asArray(json.by_operator).map((entry) => {
      const row = asRecord(entry);
      const operator = asRecord(row.operator);
      return {
        operator: {
          id: asInt(operator.id),
          fullName: asString(operator.full_name),
          filial: asString(typeof operator.filial === "object" ? asRecord(operator.filial).name : operator.filial),
        },
        leads: asInt(row.leads),
        orders: asInt(row.orders),
        delivered: asInt(row.delivered),
        cancelled: asInt(row.cancelled),
        revenue: asNumber(row.revenue),
        fee: asNumber(row.fee),
      };
    }),
    prevLeadToOrder: prev.lead_to_order === undefined || prev.lead_to_order === null ? null : asNumber(prev.lead_to_order),
  };
}

/** Qadamlar orasidagi o'tish ulushi (0–100); oldingi qadam nol — 0. */
export function stepRate(current: number, previous: number): number {
  if (previous <= 0) return 0;
  return Math.max(0, Math.min(100, (current / previous) * 100));
}

/** Voronka qadamlari — tartib va rang bitta joyda. */
export function funnelSteps(funnel: Funnel) {
  return [
    { key: "leads", label: "Lid", value: funnel.leads, sum: null, color: "var(--ink-muted)" },
    { key: "orders", label: "Buyurtma", value: funnel.orders, sum: funnel.ordersSum, color: "var(--order-confirmed)" },
    { key: "shipped", label: "Dostavka", value: funnel.shipped, sum: null, color: "var(--order-shipping)" },
    { key: "delivered", label: "Yetkazildi", value: funnel.delivered, sum: funnel.deliveredSum, color: "var(--order-delivered)" },
  ] as const;
}
