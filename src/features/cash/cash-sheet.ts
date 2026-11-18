import { mapFilial } from "@/features/couriers/types";
import { parseDate } from "@/lib/format";
import { asArray, asInt, asOptionalNumber, asOptionalString, asRecord, asString } from "@/lib/parse";
import { isZeroQty, mapCellUnit, mapQtyCell } from "@/lib/qty-cell";
import type { CellUnit, QtyCell } from "@/lib/qty-cell";

import { asHandoverStatus } from "./types";
import type { HandoverStatus } from "./types";

/**
 * Kassa — filialga topshirish jadvali (hujjat 85 §3, `chief/report/cash-sheet/`).
 * Hisob faqat serverda: `due_total = sales − online − gift − discount + opening_debt`,
 * `closing_debt = due_total − handed_over`; kam topshirilsa qarz ertaga o'tadi.
 * Frontend qo'shmaydi va ayirmaydi — kelmagan maydon «—».
 */

/** Ustun — mahsulot; birlik qoidasi hujjat 84 (`lib/qty-cell`). */
export type CashSheetProduct = { id: number; name: string; unit: CellUnit };

/** Mahsulot katagi: miqdor + shu miqdorning katalog narxidagi summasi (kelmasa `null`). */
export type ProductCell = QtyCell & { amount: number | null };

/** «Sotildi» yoki «Sovg'a» qatori: kalit — mahsulot id si (nol katak kelmaydi), `amount` — qator summasi. */
export type ProductRow = { items: Readonly<Record<string, ProductCell>>; amount: number | null };

/** Filialga topshiriq (mavjud `chief/cash/handover/`): `pending` — logist tasdig'ini kutmoqda. */
export type FilialHandoverMark = { id: number; amount: number | null; status: HandoverStatus; at: Date | null };

/**
 * Bir filial yoki jami — pul kalitlari bir xil (`totals` = `filials[]` yig'indisi,
 * serverda). Hamma pul `number | null`: kelmagan maydon «—», o'ylab topilgan `0` emas.
 */
export type CashSheetMoney = {
  salesAmount: number | null;
  /** Kuryerlardan olingan naqd (85 §2 «Oldim» yig'indisi) — ma'lumot uchun. */
  cashAmount: number | null;
  onlineAmount: number | null;
  giftAmount: number | null;
  discountAmount: number | null;
  openingDebt: number | null;
  /** Topshirishi kerak. */
  dueTotal: number | null;
  /** Topshirgan — e'lon qilingan (logist tasdiqlamagani ham). */
  handedOver: number | null;
  /** Logist «Oldim» bilan tasdiqlagani. */
  confirmed: number | null;
  /** Qoldi (qarz). */
  closingDebt: number | null;
};

export type CashSheetFilial = CashSheetMoney & {
  /** `null` — filialsiz (server topshirishda o'zi tanlaydi). */
  filial: { id: number; name: string } | null;
  /** Viloyat kodlari (`fargona`, …). */
  regions: string[];
  handovers: FilialHandoverMark[];
};

export type CashSheet = {
  dateFrom: string;
  dateTo: string;
  products: CashSheetProduct[];
  sold: ProductRow;
  gift: ProductRow;
  filials: CashSheetFilial[];
  totals: CashSheetMoney;
};

/** Tartib — serverniki (katalog tartibi). */
function mapProducts(raw: unknown): CashSheetProduct[] {
  return asArray(raw).map((entry) => {
    const json = asRecord(entry);
    return { id: asInt(json.id), name: asOptionalString(json.name_uz) ?? asString(json.name), unit: mapCellUnit(json) };
  });
}

function mapProductRow(raw: unknown): ProductRow {
  const json = asRecord(raw);
  const items: Record<string, ProductCell> = {};
  for (const [productId, value] of Object.entries(asRecord(json.items))) {
    const cell = { ...mapQtyCell(value), amount: asOptionalNumber(asRecord(value).amount) };
    if (!isZeroQty(cell)) items[productId] = cell;
  }
  return { items, amount: asOptionalNumber(json.amount) };
}

function mapMoney(raw: unknown): CashSheetMoney {
  const json = asRecord(raw);
  return {
    salesAmount: asOptionalNumber(json.sales_amount),
    cashAmount: asOptionalNumber(json.cash_amount),
    onlineAmount: asOptionalNumber(json.online_amount),
    giftAmount: asOptionalNumber(json.gift_amount),
    discountAmount: asOptionalNumber(json.discount_amount),
    openingDebt: asOptionalNumber(json.opening_debt),
    dueTotal: asOptionalNumber(json.due_total),
    handedOver: asOptionalNumber(json.handed_over),
    confirmed: asOptionalNumber(json.confirmed),
    closingDebt: asOptionalNumber(json.closing_debt),
  };
}

function mapHandoverMark(raw: unknown): FilialHandoverMark | null {
  const json = asRecord(raw);
  const id = asInt(json.id, -1);
  if (id < 0) return null;
  return { id, amount: asOptionalNumber(json.amount), status: asHandoverStatus(json.status), at: parseDate(json.at) };
}

function mapFilialRow(raw: unknown): CashSheetFilial {
  const json = asRecord(raw);
  return {
    ...mapMoney(json),
    filial: mapFilial(json.filial),
    regions: asArray(json.regions).map((code) => asString(code)).filter(Boolean),
    handovers: asArray(json.handovers)
      .map(mapHandoverMark)
      .filter((mark): mark is FilialHandoverMark => mark !== null),
  };
}

export function mapCashSheet(raw: unknown): CashSheet {
  const json = asRecord(raw);
  return {
    dateFrom: asString(json.date_from),
    dateTo: asString(json.date_to),
    products: mapProducts(json.products),
    sold: mapProductRow(json.sold),
    gift: mapProductRow(json.gift),
    filials: asArray(json.filials).map(mapFilialRow),
    totals: mapMoney(json.totals),
  };
}
