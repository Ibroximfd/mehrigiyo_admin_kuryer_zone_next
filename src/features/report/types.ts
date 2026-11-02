import { mapItemRef } from "@/lib/item-ref";
import type { ItemRef } from "@/lib/item-ref";
import { asArray, asBool, asInt, asNumber, asOptionalInt, asOptionalNumber, asOptionalString, asRecord, asString, isRecord } from "@/lib/parse";

/**
 * Moliya va hisobot (`21_TUZILMA_V2` §4.5, §7; backend `TUZILMA_V2` §5.1, V13;
 * `MOLIYA_R_F` §R): hammasi `chief/finance/` dan — filial kesimi (`by_filial`),
 * kuryerlar (`by_courier` + `by_product`). Kuryer haqi tizimga kirmaydi; `fee` —
 * bosh kuryer haqi = Σ (viloyatdagi manzil × o'sha kungi viloyat narxi). Hisob
 * serverda — frontend pulni qayta hisoblamaydi (F-5: logistdagi `finance/chiefs/` bilan ayni son).
 */

/** Viloyat kesimi (`addresses_by_region`, F-2 shakli) — backend bersa. */
export type RegionFee = {
  region: string;
  regionName: string;
  addresses: number;
  /** Narx belgilanmagan viloyatda `null`. */
  perAddress: number | null;
  fee: number | null;
  missingRate: boolean;
};

export type FinanceNumbers = {
  delivered: number;
  addresses: number;
  /**
   * Bosh kuryer haqi — filial alohida to'laydi. `null` — narx yo'q (`0` EMAS).
   * `missingRate: true` bo'lsa — faqat narxi bor viloyatlar yig'indisi (to'liq emas).
   */
  fee: number | null;
  missingRate: boolean;
  /** Narxi belgilanmagan viloyat kodlari. */
  missingRates: string[];
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
  /** Viloyat kesimi; backend bermasa bo'sh. */
  byRegion: RegionFee[];
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
  /** Mahsulot qatorlari — `item.image` to'liq URL yoki `null`. */
  products: Array<{ item: ItemRef; quantity: number }>;
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
      return { item: mapItemRef(row.item), quantity: asInt(row.qty) };
    }),
  };
}

/** Mahsulotlar jami — hamma kuryer bo'yicha, ko'pi birinchi. */
export function productTotals(couriers: readonly FinanceCourierRow[]): Array<{ item: ItemRef; quantity: number }> {
  const byItem = new Map<number, { item: ItemRef; quantity: number }>();
  for (const courier of couriers) {
    for (const entry of courier.products) {
      const row = byItem.get(entry.item.id) ?? { item: entry.item, quantity: 0 };
      // Rasm bir kuryer qatorida bo'lmasa, boshqasidagidan olinadi.
      const item = row.item.image ? row.item : { ...row.item, image: entry.item.image };
      byItem.set(entry.item.id, { item, quantity: row.quantity + entry.quantity });
    }
  }
  return [...byItem.values()].sort((a, b) => b.quantity - a.quantity);
}

export type ChiefFinance = {
  dateFrom: string;
  dateTo: string;
  /** «Manzil soni» ta'rifi (`address_definition`, §R-2) — bersa izoh sifatida. */
  addressDefinition: string | null;
  byFilial: FinanceFilialRow[];
  totals: FinanceNumbers;
  byCourier: FinanceCourierRow[];
};

function mapRegionFee(raw: unknown): RegionFee {
  const json = asRecord(raw);
  const fee = asOptionalNumber(json.fee);
  return {
    region: asString(json.region),
    regionName: asString(json.region_name),
    addresses: asInt(json.addresses),
    perAddress: asOptionalInt(json.per_address),
    fee,
    missingRate: asBool(json.missing_rate) || fee === null,
  };
}

function mapNumbers(raw: unknown): FinanceNumbers {
  const json = asRecord(raw);
  const missingRates = asArray(json.missing_rates).map((code) => asString(code)).filter(Boolean);
  return {
    delivered: asInt(json.delivered),
    addresses: asInt(json.addresses),
    // Narxsiz (yoki maydon umuman yo'q) — `null`, ekranda «—».
    fee: asOptionalNumber(json.fee),
    missingRate: asBool(json.missing_rate) || missingRates.length > 0,
    missingRates,
    cashAccepted: asNumber(json.cash_accepted),
    handedOver: asNumber(json.handed_over),
    toHandOver: Math.max(0, asNumber(json.to_hand_over)),
  };
}

/**
 * Jami qatorida `missing_rates` bo'lmasa (kontrakt faqat `by_filial[]` ni aytadi) — filial
 * qatorlaridan yig'iladi. Pul emas, faqat belgi: haq «to'liq emas» ogohlantirishi yo'qolmasin.
 */
function withMissing(totals: FinanceNumbers, rows: readonly FinanceFilialRow[]): FinanceNumbers {
  const missingRates = [...new Set([...totals.missingRates, ...rows.flatMap((row) => row.missingRates)])];
  return { ...totals, missingRates, missingRate: totals.missingRate || rows.some((row) => row.missingRate) };
}

export function mapFinanceFilialRow(raw: unknown): FinanceFilialRow {
  const json = asRecord(raw);
  const filial = isRecord(json.filial) ? { id: asInt(json.filial.id), name: asString(json.filial.name) } : null;
  return {
    ...mapNumbers(json),
    filial,
    byRegion: asArray(json.addresses_by_region).map(mapRegionFee),
    oldestDay: asOptionalString(json.oldest_day),
  };
}

export function mapChiefFinance(raw: unknown): ChiefFinance {
  const json = asRecord(raw);
  const rows = asArray(json.by_filial).map(mapFinanceFilialRow);
  return {
    dateFrom: asString(json.date_from),
    dateTo: asString(json.date_to),
    addressDefinition: asOptionalString(json.address_definition),
    // Taqsimlanmagan qator — doim oxirida.
    byFilial: [...rows.filter((row) => row.filial), ...rows.filter((row) => !row.filial)],
    totals: withMissing(mapNumbers(json.totals), rows),
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
