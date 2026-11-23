import { groupThousands } from "@/lib/format";
import { PIECE_UNIT, shownQuantity, shownUnit } from "@/lib/item-ref";
import type { ItemRef } from "@/lib/item-ref";
import { columnUnit, EMPTY_QTY, qtyCount, qtyText } from "@/lib/qty-cell";

import { cellOf } from "./types";
import type { SkladCurrent, SkladProduct } from "./types";

/**
 * «Hozirgi qoldiq» jadvali (hujjat 85 §1.1): ustun — mahsulot, qator —
 * Jami · Kuryerlarda · Omborda (egasi, 2026-11-19: jami tepada, ombor qoldig'i pastda). Manba — javobdagi `current` bloki; u hali
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

/** Jadvalning o'zi — «Hozirgi qoldiq» ham, kunning saqlangan holati (`day-state`) ham shu shaklda chiziladi. */
export type StockTableModel = {
  columns: StockColumn[];
  rows: StockRowView[];
};

export type CurrentStockModel = StockTableModel & {
  /** Asosiy raqamlar: omborda va kuryerlarda (qator jamilari), kam qolgan mahsulotlar soni. */
  storeTotal: number;
  couriersTotal: number;
  lowCount: number;
};

/** Faqat «Jami» ma'lum bo'lgan qator (bo'linishsiz) — `day-state` dagi zaxira holat. */
export type TotalLine = {
  column: StockColumn;
  total: StockValue;
  /** Kam qoldiq chegarasi (ekran birligida); yo'q — `null`. */
  min: number | null;
};

/** Mahsulot bo'yicha bitta qator — ikki manba shu shaklga keltiriladi. */
export type StockLine = TotalLine & {
  store: StockValue;
  couriers: StockValue;
};

export type StockLabels = Readonly<Record<StockRowKey, string>>;

const CURRENT_LABELS: StockLabels = { total: "Jami", couriers: "Kuryerlarda", store: "Omborda" };

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

function totalRow(lines: readonly TotalLine[], label: string): StockRowView {
  const cells = lines.map((line) => ({ ...line.total, tone: toneOf(line.total.count, line.min) }));
  return { key: "total", label, cells, total: sumOf(cells) };
}

/** `labels` — qator nomlari: «Hozirgi qoldiq» (sukut) yoki kunning saqlangan holati. */
export function buildCurrentStock(lines: readonly StockLine[], labels: StockLabels = CURRENT_LABELS): CurrentStockModel {
  const store = lines.map((line) => ({ ...line.store, tone: toneOf(line.store.count, line.min) }));
  // Kuryerlar qatori rangsiz; nol — bo'sh katak («kimda yo'q» ko'zga tashlanmasin).
  const couriers = lines.map((line) => ({ ...line.couriers, text: line.couriers.count === 0 ? "" : line.couriers.text, tone: "plain" as const }));
  return {
    columns: lines.map((line) => line.column),
    rows: [
      totalRow(lines, labels.total),
      { key: "couriers", label: labels.couriers, cells: couriers, total: sumOf(couriers) },
      { key: "store", label: labels.store, cells: store, total: sumOf(store) },
    ],
    storeTotal: sumOf(store),
    couriersTotal: sumOf(couriers),
    lowCount: store.filter((cell) => cell.tone !== "plain").length,
  };
}

/** Bo'linish noma'lum — faqat «Jami» qatori (kuryerlar va ombor qatori o'ylab topilmaydi). */
export function buildTotalOnly(lines: readonly TotalLine[], label: string = CURRENT_LABELS.total): StockTableModel {
  return { columns: lines.map((line) => line.column), rows: [totalRow(lines, label)] };
}
