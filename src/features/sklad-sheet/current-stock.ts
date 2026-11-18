import { groupThousands } from "@/lib/format";
import { PIECE_UNIT, shownQuantity, shownUnit } from "@/lib/item-ref";
import type { ItemRef } from "@/lib/item-ref";
import { columnUnit, EMPTY_QTY, qtyCount, qtyText } from "@/lib/qty-cell";

import { cellOf } from "./types";
import type { SkladCurrent, SkladProduct } from "./types";

/**
 * «Hozirgi qoldiq» jadvali (hujjat 85 §1.1): ustun — mahsulot, qator —
 * Omborda · Kuryerlarda · Jami. Manba — javobdagi `current` bloki; u hali
 * kelmasa (endpoint yo'q, eski server) — sahifa allaqachon yuklagan sklad
 * qoldig'i (`sklad/stock` + `sklad/couriers`), yangi son o'ylab topilmaydi.
 * Minimaldan kam — sariq, tugagan yoki minus — qizil (ombor va jami qatorida).
 */

export type StockTone = "plain" | "warn" | "danger";

/** Katak: ustun birligidagi son (rang va qator jamisi uchun) va ekrandagi matni. */
export type StockValue = { count: number; text: string };

export type StockColumn = { id: number; name: string; /** «dona» bo'lmasa sarlavhada yoziladi. */ unit: string };

export type StockRowKey = "store" | "couriers" | "total";

export type StockRowView = {
  key: StockRowKey;
  label: string;
  cells: Array<StockValue & { tone: StockTone }>;
  /** Qator jami — ekrandagi sonlar yig'indisi (birliklar aralash bo'lishi mumkin, birlik yozilmaydi). */
  total: number;
};

export type CurrentStockModel = {
  columns: StockColumn[];
  rows: StockRowView[];
  /** Asosiy raqamlar: omborda va kuryerlarda (qator jamilari), kam qolgan mahsulotlar soni. */
  storeTotal: number;
  couriersTotal: number;
  lowCount: number;
};

/** Mahsulot bo'yicha bitta qator — ikki manba shu shaklga keltiriladi. */
export type StockLine = {
  column: StockColumn;
  store: StockValue;
  couriers: StockValue;
  total: StockValue;
  /** Kam qoldiq chegarasi (ekran birligida); yo'q — `null`. */
  min: number | null;
};

/** Sklad bo'limidagi mahsulot qatori (`skladStockRows`) — zaxira manba; sonlar sklad birligida. */
export type SkladStockFallback = {
  item: ItemRef;
  inSklad: number;
  withCouriers: number;
  minQuantity: number;
};

export function toneOf(count: number, min: number | null): StockTone {
  if (count <= 0) return "danger";
  return min !== null && count < min ? "warn" : "plain";
}

function plainValue(count: number): StockValue {
  return { count, text: groupThousands(count) };
}

/** Server `current` bloki: hamma son serverdan, `total` ham (§1.1). */
export function linesFromCurrent(products: readonly SkladProduct[], current: SkladCurrent): StockLine[] {
  return products.map((product) => {
    const valueOf = (cells: SkladCurrent["store"]): StockValue => {
      const cell = cellOf(cells, product.id) ?? EMPTY_QTY;
      return { count: qtyCount(cell, product), text: qtyText(cell, product) };
    };
    const unit = columnUnit(product);
    return {
      column: { id: product.id, name: product.name, unit: unit === PIECE_UNIT ? "" : unit },
      store: valueOf(current.store),
      couriers: valueOf(current.couriers),
      total: valueOf(current.total),
      min: current.min[String(product.id)] ?? null,
    };
  });
}

/**
 * Zaxira: sklad qoldig'i ekran birligida (`shownQuantity` — donada yuritiladigan
 * mahsulot donada, hujjat 84). Server `total` bermagani uchun «Jami» qatori shu
 * yerda ombor + kuryerlar — endpoint chiqqach serverniki o'qiladi.
 */
export function linesFromSklad(rows: readonly SkladStockFallback[]): StockLine[] {
  return rows.map((row) => {
    const unit = shownUnit(row.item);
    const store = shownQuantity(row.item, row.inSklad);
    const couriers = shownQuantity(row.item, row.withCouriers);
    return {
      column: { id: row.item.id, name: row.item.name, unit: unit === PIECE_UNIT ? "" : unit },
      store: plainValue(store),
      couriers: plainValue(couriers),
      total: plainValue(store + couriers),
      min: row.minQuantity > 0 ? shownQuantity(row.item, row.minQuantity) : null,
    };
  });
}

const sumOf = (values: readonly StockValue[]) => values.reduce((sum, value) => sum + value.count, 0);

export function buildCurrentStock(lines: readonly StockLine[]): CurrentStockModel {
  const store = lines.map((line) => ({ ...line.store, tone: toneOf(line.store.count, line.min) }));
  // Kuryerlar qatori rangsiz; nol — bo'sh katak («kimda yo'q» ko'zga tashlanmasin).
  const couriers = lines.map((line) => ({ ...line.couriers, text: line.couriers.count === 0 ? "" : line.couriers.text, tone: "plain" as const }));
  const total = lines.map((line) => ({ ...line.total, tone: toneOf(line.total.count, line.min) }));
  return {
    columns: lines.map((line) => line.column),
    rows: [
      { key: "store", label: "Omborda", cells: store, total: sumOf(store) },
      { key: "couriers", label: "Kuryerlarda", cells: couriers, total: sumOf(couriers) },
      { key: "total", label: "Jami", cells: total, total: sumOf(total) },
    ],
    storeTotal: sumOf(store),
    couriersTotal: sumOf(couriers),
    lowCount: store.filter((cell) => cell.tone !== "plain").length,
  };
}
