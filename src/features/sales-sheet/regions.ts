import { PIECE_UNIT } from "@/lib/item-ref";

import type { CourierCash } from "./cash";
import { isZeroCell } from "./types";
import type { CellMap, CourierSheet, QtyCell, SalesSheet, SheetFigures, SheetFlow, SheetProduct } from "./types";

/**
 * «Sotuv jadvali» viloyatlar kesimida (egasi, 2026-11-19; backend so'rovi —
 * hujjat 96 §6). Server `regions[]` bersa — viloyat jamisi serverniki. Bermasa
 * (hozircha) — kuryer viloyati kuryerlar ro'yxatidan (`chief/couriers/`), jami
 * esa shu yerda kuryer bloklarini qo'shib olinadi: `regions[]` chiqqach shu
 * yig'indi ishlatilmay qoladi. Kuryer bloki va «JAMI» o'zgarmaydi — serverniki.
 */

/** Viloyatsiz kuryerlar guruhi — oxirida (backend ham `region_name: "Viloyatsiz"` beradi). */
export const NO_REGION = "Viloyatsiz";

export type RegionGroup = {
  /** Viloyat kodi; `null` — viloyatsiz kuryerlar. */
  code: string | null;
  name: string;
  /** Shu viloyat kuryerlari — jadvaldagi tartibda. */
  couriers: CourierSheet[];
  /** Viloyat jami: server bloki yoki kuryerlar yig'indisi (`sumFigures`). */
  totals: SheetFigures;
};

const FLOWS: readonly SheetFlow[] = ["opening", "issued", "given", "sold", "gift", "other", "closing"];

/**
 * Bir mahsulot kataklari yig'indisi. Karobkada yuritiladigan mahsulotda karobkadagi
 * dona ma'lum bo'lsa — donaga keltirib qo'shiladi va server shaklida qaytadi (`qty`
 * karobka + ortiqcha `pieces`, ishora saqlanadi): «1 kar. 2 dona» + «1 kar. 2 dona»
 * (3 donali) = «3 kar. 1 dona». Dona birligidagi mahsulotda — oddiy yig'indi.
 * `piecesTotal` — hamma qo'shiluvchida bo'lsagina.
 */
function sumCell(cells: readonly QtyCell[], product: SheetProduct | undefined): QtyCell {
  const qty = cells.reduce((sum, cell) => sum + cell.qty, 0);
  const pieces = cells.reduce((sum, cell) => sum + cell.pieces, 0);
  const totals = cells.map((cell) => cell.piecesTotal);
  const piecesTotal = totals.every((value) => value !== undefined) ? totals.reduce<number>((sum, value) => sum + (value ?? 0), 0) : undefined;
  const perBox = product && product.unitLabel !== PIECE_UNIT ? product.piecesPerBox : null;
  // `+ 0` — `-0` chiqmasin (server javobidagidek oddiy nol).
  const cell = perBox === null ? { qty, pieces } : { qty: Math.trunc((qty * perBox + pieces) / perBox) + 0, pieces: ((qty * perBox + pieces) % perBox) + 0 };
  return piecesTotal === undefined ? cell : { ...cell, piecesTotal };
}

/** Kataklar yig'indisi mahsulot bo'yicha; nol natija saqlanmaydi (`mapCells` dagidek). */
export function sumCells(maps: readonly CellMap[], products: readonly SheetProduct[]): CellMap {
  const productOf = new Map(products.map((product) => [String(product.id), product]));
  const ids = [...new Set(maps.flatMap((cells) => Object.keys(cells)))];
  const out: Record<string, QtyCell> = {};
  for (const id of ids) {
    const cell = sumCell(
      maps.flatMap((cells) => cells[id] ?? []),
      productOf.get(id),
    );
    if (!isZeroCell(cell)) out[id] = cell;
  }
  return out;
}

/** Pul: bittasi noma'lum (`null`) bo'lsa — yig'indi ham noma'lum (taxmin qilinmaydi). */
function sumNullable(values: ReadonlyArray<number | null>): number | null {
  return values.some((value) => value === null) ? null : values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

const sumOf = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0);

/** «Pul olish» bloki: bitta kuryerda blok yo'q bo'lsa — viloyatda ham yo'q; maydonlar `sumNullable`. */
function sumCash(blocks: ReadonlyArray<CourierCash | null>): CourierCash | null {
  if (blocks.length === 0 || blocks.some((block) => block === null)) return null;
  const list = blocks as readonly CourierCash[];
  const field = (pick: (cash: CourierCash) => number | null) => sumNullable(list.map(pick));
  return {
    salesAmount: field((cash) => cash.salesAmount),
    onlineAmount: field((cash) => cash.onlineAmount),
    onlineSystem: field((cash) => cash.onlineSystem),
    onlineManual: field((cash) => cash.onlineManual),
    discountAmount: field((cash) => cash.discountAmount),
    discountSystem: field((cash) => cash.discountSystem),
    discountManual: field((cash) => cash.discountManual),
    giftAmount: field((cash) => cash.giftAmount),
    feeAmount: field((cash) => cash.feeAmount),
    openingDebt: field((cash) => cash.openingDebt),
    dueTotal: field((cash) => cash.dueTotal),
    received: field((cash) => cash.received),
    closingDebt: field((cash) => cash.closingDebt),
    receipts: list.flatMap((cash) => cash.receipts),
    since: list[0]?.since ?? null,
  };
}

/**
 * Bir nechta blok yig'indisi — `totals` qanday qo'shilsa shunday: kataklar
 * mahsulot bo'yicha, pul va sonlar oddiy yig'indi; `handoverDue` va «Pul olish»
 * bloki bittasi kelmasa — `null`; kuryer xizmati — yozilganlari yig'indisi
 * (hech biri yozilmagan bo'lsa `null`).
 */
export function sumFigures(list: readonly SheetFigures[], products: readonly SheetProduct[]): SheetFigures {
  const cells = Object.fromEntries(FLOWS.map((flow) => [flow, sumCells(list.map((figures) => figures[flow]), products)])) as Record<SheetFlow, CellMap>;
  const fees = list.flatMap((figures) => (figures.fee ? [figures.fee.amount] : []));
  return {
    ...cells,
    salesAmount: sumOf(list.map((figures) => figures.salesAmount)),
    cashAmount: sumOf(list.map((figures) => figures.cashAmount)),
    onlineAmount: sumOf(list.map((figures) => figures.onlineAmount)),
    discountAmount: sumOf(list.map((figures) => figures.discountAmount)),
    addresses: sumOf(list.map((figures) => figures.addresses)),
    refusedAddresses: sumOf(list.map((figures) => figures.refusedAddresses)),
    openOrders: sumOf(list.map((figures) => figures.openOrders)),
    fee: fees.length > 0 ? { amount: sumOf(fees), note: "" } : null,
    handoverDue: sumNullable(list.map((figures) => figures.handoverDue)),
    cash: sumCash(list.map((figures) => figures.cash)),
  };
}

/** Server viloyat bloklari — har kuryer `courier_ids` (yoki o'z viloyat kodi) bo'yicha topilsagina. */
function serverGroups(sheet: SalesSheet): RegionGroup[] | null {
  const regions = sheet.regions;
  if (!regions || regions.length === 0) return null;
  const regionOf = (courier: CourierSheet) =>
    regions.find((region) => region.courierIds.includes(courier.courier.id)) ??
    (courier.region ? regions.find((region) => region.code === courier.region?.code) : undefined);
  const owners = sheet.couriers.map(regionOf);
  // Bitta kuryer ham blokdan tashqarida qolsa — server bloklariga tayanilmaydi (kuryer jadvaldan yo'qolmasin).
  if (owners.some((owner) => owner === undefined)) return null;
  return (
    regions
      .map((region) => ({
        code: region.code,
        name: region.name || NO_REGION,
        couriers: sheet.couriers.filter((_, index) => owners[index] === region),
        // Blok `totals` kalitlarini o'zi olib yuradi — jami sifatida to'g'ridan-to'g'ri.
        totals: region,
      }))
      // Davrda kuryeri yo'q viloyat (nol blok) chizilmaydi.
      .filter((group) => group.couriers.length > 0)
  );
}

/**
 * Kuryerlarni viloyat bo'yicha guruhlash. Manba tartibi: server `regions[]` →
 * kuryer javobidagi `courier.region` → kuryerlar ro'yxati (`courierRegions`,
 * id → viloyat kodi; ro'yxatda yo'q kuryer — viloyatsiz). Birontasining
 * viloyati aniqlanmasa (ro'yxat yuklanmoqda yoki yiqildi) — `null`: jadval
 * avvalgidek, guruhsiz chiziladi. Tartib: viloyat nomi bo'yicha, viloyatsiz — oxirida.
 */
export function groupSheetByRegion(
  sheet: SalesSheet,
  courierRegions: ReadonlyMap<number, string | null> | null,
  regionName: (code: string) => string,
): RegionGroup[] | null {
  const fromServer = serverGroups(sheet);
  if (fromServer) return fromServer;

  const codes = sheet.couriers.map((courier) => {
    if (courier.region) return courier.region.code;
    return courierRegions ? (courierRegions.get(courier.courier.id) ?? null) : undefined;
  });
  if (codes.some((code) => code === undefined)) return null;

  const groups = new Map<string | null, CourierSheet[]>();
  sheet.couriers.forEach((courier, index) => {
    const code = codes[index] ?? null;
    groups.set(code, [...(groups.get(code) ?? []), courier]);
  });
  const nameOf = (code: string | null, couriers: readonly CourierSheet[]) =>
    couriers.find((courier) => courier.region?.name)?.region?.name || (code === null ? NO_REGION : regionName(code) || code);
  return [...groups.entries()]
    .map(([code, couriers]) => ({ code, name: nameOf(code, couriers), couriers, totals: sumFigures(couriers, sheet.products) }))
    .sort((a, b) => Number(a.code === null) - Number(b.code === null) || a.name.localeCompare(b.name, "uz"));
}

/** Kuryerlar ro'yxati kerakmi: server viloyatni bermagan va guruhlash usiz bo'lmaydi. */
export function needsCourierRegions(sheet: SalesSheet): boolean {
  return groupSheetByRegion(sheet, null, (code) => code) === null;
}
