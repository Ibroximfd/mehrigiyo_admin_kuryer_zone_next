import { parseDate } from "@/lib/format";
import {
  asArray,
  asInt,
  asNumber,
  asOptionalInt,
  asOptionalString,
  asRecord,
  asString,
} from "@/lib/parse";

/**
 * Moliya modellari — `18_SKLAD_MOLIYA_ANALITIKA_BACKEND_TZ.md` §7.
 * Faqat `delivered` buyurtmalar, `delivered_at` bo'yicha. Pul backenddan
 * string so'm (`"412600000.00"`) keladi — `asNumber` songa keltiradi.
 *
 * Formula (§7.2): tushum − operator foizi − logistika = qoldi.
 * **Boshqa hech narsa ayirilmaydi** — tannarx, o'rtacha, marja yo'q.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Sozlamalar (§7.1)
// ─────────────────────────────────────────────────────────────────────────────

export type FinanceSettings = {
  logisticsPerOrder: number;
  operatorPercent: number;
  history: Array<{
    at: Date | null;
    field: "logistics_per_order" | "operator_percent" | string;
    old: string;
    new: string;
    by: string | null;
    note: string;
  }>;
};

export function mapFinanceSettings(raw: unknown): FinanceSettings {
  const json = asRecord(raw);
  return {
    logisticsPerOrder: asNumber(json.logistics_per_order),
    operatorPercent: asNumber(json.operator_percent),
    history: asArray(json.history).map((entry) => {
      const row = asRecord(entry);
      return {
        at: parseDate(row.at),
        field: asString(row.field),
        old: asString(row.old),
        new: asString(row.new),
        by: asOptionalString(typeof row.by === "object" ? asRecord(row.by).full_name : row.by),
        note: asString(row.note),
      };
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Umumiy (§7.2)
// ─────────────────────────────────────────────────────────────────────────────

export type FinanceSummary = {
  period: { from: string; to: string };
  revenue: number;
  orders: number;
  operatorFee: number;
  logistics: number;
  /**
   * Manzil soni — logistika shunga ko'paytiriladi (1 manzil = 1 to'lov,
   * bitta manzildagi bir nechta buyurtma — bitta). Qo'lda tuzatish ham
   * kiradi. Eski deploy bermasa `null` — UI buyurtma sonini ko'rsatadi.
   */
  addresses: number | null;
  remaining: number;
  soldQty: number;
  giftQty: number;
  gift11: number;
  giftBonus: number;
  pointsOrders: number;
  pointsAmount: number;
  discountAmount: number;
  discountOrders: number;
  byDay: Array<{ date: string; revenue: number; orders: number; remaining: number }>;
  byFilial: Array<{ filial: { id: number; name: string }; orders: number; revenue: number; remaining: number }>;
};

export function mapFinanceSummary(raw: unknown): FinanceSummary {
  const json = asRecord(raw);
  const period = asRecord(json.period);
  return {
    period: { from: asString(period.from), to: asString(period.to) },
    revenue: asNumber(json.revenue),
    orders: asInt(json.orders),
    operatorFee: asNumber(json.operator_fee),
    logistics: asNumber(json.logistics),
    addresses: asOptionalInt(json.addresses),
    remaining: asNumber(json.remaining),
    soldQty: asInt(json.sold_qty),
    giftQty: asInt(json.gift_qty),
    gift11: asInt(json.gift_1_1),
    giftBonus: asInt(json.gift_bonus),
    pointsOrders: asInt(json.points_orders),
    pointsAmount: asNumber(json.points_amount),
    discountAmount: asNumber(json.discount_amount),
    discountOrders: asInt(json.discount_orders),
    byDay: asArray(json.by_day).map((entry) => {
      const row = asRecord(entry);
      return {
        date: asString(row.date),
        revenue: asNumber(row.revenue),
        orders: asInt(row.orders),
        remaining: asNumber(row.remaining),
      };
    }),
    byFilial: asArray(json.by_filial).map((entry) => {
      const row = asRecord(entry);
      const filial = asRecord(row.filial);
      return {
        filial: { id: asInt(filial.id), name: asString(filial.name) },
        orders: asInt(row.orders),
        revenue: asNumber(row.revenue),
        remaining: asNumber(row.remaining),
      };
    }),
  };
}

/** Ulushlar (0–100) — taqsimot chizig'i uchun; tushum nol bo'lsa hammasi 0. */
export function financeShares(summary: Pick<FinanceSummary, "revenue" | "operatorFee" | "logistics" | "remaining">) {
  const base = summary.revenue > 0 ? summary.revenue : 0;
  const share = (value: number) => (base > 0 ? Math.max(0, Math.min(100, (value / base) * 100)) : 0);
  return {
    operator: share(summary.operatorFee),
    logistics: share(summary.logistics),
    remaining: share(summary.remaining),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mahsulotlar (§7.3), sovg'a va ball (§7.5)
// ─────────────────────────────────────────────────────────────────────────────

export type ItemRef = { id: number; name: string; sku: string };

export function mapItemRef(raw: unknown): ItemRef {
  const json = asRecord(raw);
  return { id: asInt(json.id), name: asString(json.name), sku: asString(json.sku) };
}

export type FinanceProduct = {
  item: ItemRef;
  soldQty: number;
  giftQty: number;
  pointsOrders: number;
  discountAmount: number;
  revenue: number;
};

export function mapFinanceProduct(raw: unknown): FinanceProduct {
  const json = asRecord(raw);
  return {
    item: mapItemRef(json.item),
    soldQty: asInt(json.sold_qty),
    giftQty: asInt(json.gift_qty),
    pointsOrders: asInt(json.points_orders),
    discountAmount: asNumber(json.discount_amount),
    revenue: asNumber(json.revenue),
  };
}

export const GIFT_REASONS = {
  promo_1_1: "Aksiya 1+1",
  bonus: "Qo'shib berildi",
} as const;

export function giftReasonLabel(code: string): string {
  return (GIFT_REASONS as Record<string, string>)[code] ?? code;
}

export type GiftRow = {
  orderNumber: string;
  giftReason: string;
  item: ItemRef;
  qty: number;
  filial: string;
  date: Date | null;
};

export function mapGiftRow(raw: unknown): GiftRow {
  const json = asRecord(raw);
  return {
    orderNumber: asString(json.order_number),
    giftReason: asString(json.gift_reason),
    item: mapItemRef(json.item),
    qty: asInt(json.qty),
    filial: asString(typeof json.filial === "object" ? asRecord(json.filial).name : json.filial),
    date: parseDate(json.date),
  };
}

export type PointsRow = {
  orderNumber: string;
  items: string;
  pointsAmount: number;
  cashAmount: number;
  filial: string;
  date: Date | null;
};

export function mapPointsRow(raw: unknown): PointsRow {
  const json = asRecord(raw);
  return {
    orderNumber: asString(json.order_number),
    items: Array.isArray(json.items) ? json.items.map((entry) => asString(asRecord(entry).name ?? entry)).join(", ") : asString(json.items),
    pointsAmount: asNumber(json.points_amount),
    cashAmount: asNumber(json.cash_amount),
    filial: asString(typeof json.filial === "object" ? asRecord(json.filial).name : json.filial),
    date: parseDate(json.date),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Operatorlar (§7.4)
// ─────────────────────────────────────────────────────────────────────────────

export type OperatorRow = {
  operator: { id: number; fullName: string; filial: string };
  leads: number;
  orders: number;
  delivered: number;
  cancelled: number;
  revenue: number;
  percent: number;
  fee: number;
};

export function mapOperatorRow(raw: unknown): OperatorRow {
  const json = asRecord(raw);
  const operator = asRecord(json.operator);
  return {
    operator: {
      id: asInt(operator.id),
      fullName: asString(operator.full_name),
      filial: asString(typeof operator.filial === "object" ? asRecord(operator.filial).name : operator.filial),
    },
    leads: asInt(json.leads),
    orders: asInt(json.orders),
    delivered: asInt(json.delivered),
    cancelled: asInt(json.cancelled),
    revenue: asNumber(json.revenue),
    percent: asNumber(json.percent),
    fee: asNumber(json.fee),
  };
}

export type OperatorCompare = {
  leadToOrder: number;
  cancelRate: number;
  avgOrder: number;
  discounts: number;
  gifts: number;
  pointsOrders: number;
  responseMinutes: number;
};

function mapCompare(raw: unknown): OperatorCompare {
  const json = asRecord(raw);
  return {
    leadToOrder: asNumber(json.lead_to_order),
    cancelRate: asNumber(json.cancel_rate),
    avgOrder: asNumber(json.avg_order),
    discounts: asNumber(json.discounts),
    gifts: asNumber(json.gifts),
    pointsOrders: asNumber(json.points_orders),
    responseMinutes: asNumber(json.response_minutes),
  };
}

export const ORDER_FLAGS = {
  promo_1_1: "1+1",
  gift: "sovg'a",
  points: "ball",
  discount: "chegirma",
} as const;

export type OperatorDetail = OperatorRow & {
  /** Davrdagi yetkazilgan buyurtmalar (oxirgi 50). */
  recentOrders: Array<{
    number: string;
    date: Date | null;
    customer: string;
    items: string;
    flags: string[];
    total: number;
    status: string;
    fee: number;
  }>;
  products: Array<{ item: ItemRef; qty: number; giftQty: number; revenue: number }>;
  /** O'zi va filialdagi boshqalar — yonma-yon solishtirish. */
  compare: { me: OperatorCompare; others: OperatorCompare };
};

export function mapOperatorDetail(raw: unknown): OperatorDetail {
  const json = asRecord(raw);
  const compare = asRecord(json.compare);
  return {
    ...mapOperatorRow(json),
    products: asArray(json.products).map((entry) => {
      const row = asRecord(entry);
      return {
        item: mapItemRef(row.item),
        qty: asInt(row.qty),
        giftQty: asInt(row.gift_qty),
        revenue: asNumber(row.revenue),
      };
    }),
    compare: { me: mapCompare(compare.me), others: mapCompare(compare.others) },
    recentOrders: asArray(json.orders).map((entry) => {
      const row = asRecord(entry);
      return {
        number: asString(row.number),
        date: parseDate(row.date),
        customer: asString(row.customer),
        items: Array.isArray(row.items) ? row.items.map((item) => asString(asRecord(item).name ?? item)).join(", ") : asString(row.items),
        flags: asArray(row.flags).map((flag) => asString(flag)),
        total: asNumber(row.total),
        status: asString(row.status),
        fee: asNumber(row.fee),
      };
    }),
  };
}
