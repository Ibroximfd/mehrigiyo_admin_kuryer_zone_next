import { asArray, asInt, asNumber, asOptionalString, asRecord, asString, isRecord } from "@/lib/parse";

/**
 * Moliya va hisobot (`21_TUZILMA_V2` §4.5, §7; backend `TUZILMA_V2` §5.1, V13):
 * hammasi `chief/finance/` dan — filial kesimi (`by_filial`), kuryerlar
 * (`by_courier` + `by_product`). Kuryer haqi tizimga kirmaydi; `fee` — bosh
 * kuryer haqi (manzil × bitta narx).
 */
export type FinanceNumbers = {
  delivered: number;
  addresses: number;
  /** Bosh kuryer haqi — filial alohida to'laydi. */
  fee: number;
  /** Davrda kuryerlardan qabul qilingan pul. */
  cashAccepted: number;
  /** Davrda filialga topshirilgan. */
  handedOver: number;
  /** JORIY qoldiq (butun tarix bo'yicha, davrga bog'liq emas). */
  toHandOver: number;
};

/** `filial: null` — «taqsimlanmagan» pul (eski yoki zakazsiz), ro'yxat oxirida. */
export type FinanceFilialRow = FinanceNumbers & {
  filial: { id: number; name: string } | null;
  /** Eng eski yopilmagan kun (FIFO, `chief/cash/` da, V12); bo'lmasa `null`. */
  oldestDay: string | null;
};

/** Kuryer kesimi (V13): `cash_with_courier` — joriy, `cash_handed` — davrda. */
export type FinanceCourierRow = {
  courier: { id: number; fullName: string };
  delivered: number;
  addresses: number;
  cashWithCourier: number;
  cashHanded: number;
  products: Array<{ item: { id: number; name: string }; quantity: number }>;
};

export function mapFinanceCourierRow(raw: unknown): FinanceCourierRow {
  const json = asRecord(raw);
  const courier = asRecord(json.courier);
  return {
    courier: { id: asInt(courier.id), fullName: asString(courier.full_name) },
    delivered: asInt(json.delivered),
    addresses: asInt(json.addresses),
    cashWithCourier: asNumber(json.cash_with_courier),
    cashHanded: asNumber(json.cash_handed),
    products: asArray(json.by_product).map((entry) => {
      const row = asRecord(entry);
      const item = asRecord(row.item);
      return { item: { id: asInt(item.id), name: asString(item.name) }, quantity: asInt(row.qty) };
    }),
  };
}

/** Mahsulotlar jami — hamma kuryer bo'yicha, ko'pi birinchi. */
export function productTotals(couriers: readonly FinanceCourierRow[]): Array<{ item: { id: number; name: string }; quantity: number }> {
  const byItem = new Map<number, { item: { id: number; name: string }; quantity: number }>();
  for (const courier of couriers) {
    for (const entry of courier.products) {
      const row = byItem.get(entry.item.id) ?? { item: entry.item, quantity: 0 };
      byItem.set(entry.item.id, { ...row, quantity: row.quantity + entry.quantity });
    }
  }
  return [...byItem.values()].sort((a, b) => b.quantity - a.quantity);
}

export type ChiefFinance = {
  dateFrom: string;
  dateTo: string;
  byFilial: FinanceFilialRow[];
  totals: FinanceNumbers;
  byCourier: FinanceCourierRow[];
};

function mapNumbers(raw: unknown): FinanceNumbers {
  const json = asRecord(raw);
  return {
    delivered: asInt(json.delivered),
    addresses: asInt(json.addresses),
    fee: asNumber(json.fee),
    cashAccepted: asNumber(json.cash_accepted),
    handedOver: asNumber(json.handed_over),
    toHandOver: Math.max(0, asNumber(json.to_hand_over)),
  };
}

export function mapFinanceFilialRow(raw: unknown): FinanceFilialRow {
  const json = asRecord(raw);
  const filial = isRecord(json.filial) ? { id: asInt(json.filial.id), name: asString(json.filial.name) } : null;
  return { ...mapNumbers(json), filial, oldestDay: asOptionalString(json.oldest_day) };
}

export function mapChiefFinance(raw: unknown): ChiefFinance {
  const json = asRecord(raw);
  const rows = asArray(json.by_filial).map(mapFinanceFilialRow);
  return {
    dateFrom: asString(json.date_from),
    dateTo: asString(json.date_to),
    // Taqsimlanmagan qator — doim oxirida.
    byFilial: [...rows.filter((row) => row.filial), ...rows.filter((row) => !row.filial)],
    totals: mapNumbers(json.totals),
    byCourier: asArray(json.by_courier).map(mapFinanceCourierRow),
  };
}

/**
 * Davrda hech narsa bo'lmagan va pul ham yo'q. `by_courier` jamoadagi har
 * kuryerni nol sonlar bilan ham qaytaradi — bunday qatorlar faoliyat emas.
 */
export function isEmptyReport(finance: ChiefFinance): boolean {
  const active = finance.byCourier.some((row) => row.delivered + row.addresses + row.cashWithCourier + row.cashHanded > 0);
  const { totals } = finance;
  return !active && totals.delivered === 0 && totals.toHandOver === 0 && totals.cashAccepted === 0;
}
