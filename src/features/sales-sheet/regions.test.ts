import { describe, expect, it } from "vitest";

import { demoSalesSheet } from "@/lib/demo/mock/sales-sheet.fixture";

import type { CourierCash } from "./cash";
import { groupSheetByRegion, needsCourierRegions, NO_REGION, sumCells, sumFigures } from "./regions";
import { mapSalesSheet } from "./types";
import type { SheetFigures, SheetProduct } from "./types";

const TODAY = "2026-11-20";

function fixture(dateFrom: string, dateTo = dateFrom) {
  return mapSalesSheet(demoSalesSheet({ dateFrom, dateTo, courierId: null, withDays: dateFrom !== dateTo }, TODAY));
}

const LABELS: Record<string, string> = { toshkent: "Toshkent viloyati", samarqand: "Samarqand viloyati" };
const label = (code: string) => LABELS[code] ?? code;

/** Kuryerlar ro'yxatidagi viloyat (zaxira manba): Bahtiyor va Muhammadqul — Toshkent, Xayrullo — Samarqand. */
const LIST = new Map<number, string | null>([
  [31, "toshkent"],
  [32, "samarqand"],
  [33, "toshkent"],
]);

/** Taqqoslash uchun: kuryer xizmati izohi yig'indida yo'q (serverda — oxirgi yozuvniki). */
const comparable = (figures: SheetFigures) => ({ ...figures, fee: figures.fee?.amount ?? null });

describe("viloyat bo'yicha guruhlash — zaxira (kuryerlar ro'yxati)", () => {
  for (const [title, from, to] of [
    ["16.11 (egasi jadvali)", "2026-11-16", "2026-11-16"],
    ["17.11 (qaytarish, `other` manfiy)", "2026-11-17", "2026-11-17"],
    ["oraliq 16–19.11", "2026-11-16", "2026-11-19"],
  ] as const) {
    it(`${title}: viloyatlar yig'indisi = JAMI, viloyat jami = o'z kuryerlari yig'indisi`, () => {
      const sheet = fixture(from, to);
      const groups = groupSheetByRegion(sheet, LIST, label);
      expect(groups?.map((group) => [group.name, group.couriers.map((row) => row.courier.id)])).toEqual([
        ["Samarqand viloyati", [32]],
        ["Toshkent viloyati", [31, 33]],
      ]);
      expect(comparable(sumFigures(groups!.map((group) => group.totals), sheet.products))).toEqual(comparable(sheet.totals));
      const [, toshkent] = groups!;
      expect(toshkent!.totals).toEqual(sumFigures(toshkent!.couriers, sheet.products));
    });
  }

  it("16.11 Toshkent jami: kataklar, pul va kuryer xizmati", () => {
    const groups = groupSheetByRegion(fixture("2026-11-16"), LIST, label)!;
    const toshkent = groups[1]!.totals;
    // Bahtiyor + Muhammadqul: Rayhon sotilgan 57 + 33; Kremi 20 + 5 = 25 dona (8 kar. 1 dona).
    expect(toshkent.sold["7"]).toEqual({ qty: 90, pieces: 0, piecesTotal: 90 });
    expect(toshkent.sold["34"]).toEqual({ qty: 8, pieces: 1, piecesTotal: 25 });
    expect(toshkent).toMatchObject({ cashAmount: 17_910_000, onlineAmount: 7_960_000, addresses: 34, refusedAddresses: 1, openOrders: 20 });
    expect(toshkent.fee).toEqual({ amount: 2_275_000, note: "" });
    expect(toshkent.handoverDue).toBe(15_635_000);
  });

  it("ro'yxatda yo'q yoki viloyati yo'q kuryer — «Viloyatsiz», oxirida", () => {
    const groups = groupSheetByRegion(fixture("2026-11-16"), new Map([[31, "toshkent"], [32, null]]), label)!;
    expect(groups.map((group) => [group.code, group.name, group.couriers.length])).toEqual([
      ["toshkent", "Toshkent viloyati", 1],
      [null, NO_REGION, 2],
    ]);
  });

  it("ro'yxat hali yo'q (yuklanmoqda yoki yiqildi) — `null`: jadval guruhsiz", () => {
    const sheet = fixture("2026-11-16");
    expect(groupSheetByRegion(sheet, null, label)).toBeNull();
    expect(needsCourierRegions(sheet)).toBe(true);
  });
});

describe("viloyat — server maydonlari (hujjat 96 §6)", () => {
  const raw = demoSalesSheet({ dateFrom: "2026-11-16", dateTo: "2026-11-16", courierId: null, withDays: false }, TODAY);
  const regionOf: Record<number, [string | null, string]> = { 31: ["toshkent", "Toshkent viloyati"], 32: ["toshkent", "Toshkent viloyati"], 33: [null, "Viloyatsiz"] };
  const withCourierRegion = {
    ...raw,
    couriers: raw.couriers.map((row) => ({ ...row, courier: { ...row.courier, region: regionOf[row.courier.id]![0], region_name: regionOf[row.courier.id]![1] } })),
  };

  it("`courier.region` bo'lsa — ro'yxat kerak emas, nom serverniki", () => {
    const sheet = mapSalesSheet(withCourierRegion);
    expect(sheet.couriers[2]!.region).toEqual({ code: null, name: "Viloyatsiz" });
    expect(needsCourierRegions(sheet)).toBe(false);
    const groups = groupSheetByRegion(sheet, null, () => "boshqa nom")!;
    expect(groups.map((group) => [group.name, group.couriers.length])).toEqual([
      ["Toshkent viloyati", 2],
      ["Viloyatsiz", 1],
    ]);
  });

  it("`regions[]` bo'lsa — viloyat jamisi serverniki (qayta qo'shilmaydi), tartib ham serverniki", () => {
    const sheet = mapSalesSheet({
      ...withCourierRegion,
      regions: [
        { region: null, region_name: "Viloyatsiz", courier_ids: [33], cash_amount: 1, sold: { "7": { qty: 2, pieces: 0 } } },
        { region: "toshkent", region_name: "Toshkent viloyati", courier_ids: [31, 32], cash_amount: 2, handover_due: 5 },
        { region: "samarqand", region_name: "Samarqand viloyati", courier_ids: [], cash_amount: 0 },
      ],
    });
    const groups = groupSheetByRegion(sheet, null, label)!;
    // Kuryeri yo'q viloyat chizilmaydi.
    expect(groups.map((group) => [group.code, group.couriers.map((row) => row.courier.id), group.totals.cashAmount])).toEqual([
      [null, [33], 1],
      ["toshkent", [31, 32], 2],
    ]);
    expect(groups[0]!.totals.sold).toEqual({ "7": { qty: 2, pieces: 0 } });
    expect(groups[1]!.totals.handoverDue).toBe(5);
  });

  it("`regions[]` bir kuryerni qamramasa — server bloklari ishlatilmaydi, yig'indi o'zimizda", () => {
    const sheet = mapSalesSheet({
      ...raw,
      regions: [{ region: "toshkent", region_name: "Toshkent viloyati", courier_ids: [31, 32], cash_amount: 2 }],
    });
    expect(groupSheetByRegion(sheet, null, label)).toBeNull();
    const groups = groupSheetByRegion(sheet, LIST, label)!;
    expect(groups.map((group) => group.couriers.length)).toEqual([1, 2]);
    expect(groups[1]!.totals.cashAmount).toBe(12_060_000 + 5_850_000);
  });
});

describe("yig'indi qoidalari", () => {
  const BOXED: SheetProduct = { id: 7, name: "Rayhon", unitLabel: "karobka", countsInDona: false, piecesPerBox: 6 };
  const PIECE: SheetProduct = { id: 6, name: "Tea", unitLabel: "dona", countsInDona: false, piecesPerBox: 6 };

  it("karobka mahsuloti donaga keltirib qo'shiladi; dona mahsuloti — oddiy; nol natija tushib qoladi", () => {
    expect(
      sumCells(
        [
          { "7": { qty: 1, pieces: 4 }, "6": { qty: 9, pieces: 0 }, "9": { qty: 2, pieces: 0 } },
          { "7": { qty: 2, pieces: 5 }, "6": { qty: 3, pieces: 0 }, "9": { qty: -2, pieces: 0 } },
        ],
        [BOXED, PIECE],
      ),
    ).toEqual({ "7": { qty: 4, pieces: 3 }, "6": { qty: 12, pieces: 0 } });
    // Manfiy (qaytarish): ishora saqlanadi, `-0` yo'q.
    expect(sumCells([{ "7": { qty: 0, pieces: -1 } }, { "7": { qty: 0, pieces: -2 } }], [BOXED])).toEqual({ "7": { qty: 0, pieces: -3 } });
    // `piecesTotal` — hammasida bo'lsagina.
    expect(sumCells([{ "7": { qty: 1, pieces: 0, piecesTotal: 6 } }, { "7": { qty: 1, pieces: 0 } }], [BOXED])).toEqual({ "7": { qty: 2, pieces: 0 } });
  });

  const cash = (patch: Partial<CourierCash>): CourierCash => ({
    salesAmount: 100,
    onlineAmount: 10,
    onlineSystem: null,
    onlineManual: null,
    discountAmount: 5,
    discountSystem: null,
    discountManual: 5,
    giftAmount: 0,
    feeAmount: 20,
    openingDebt: 0,
    dueTotal: 65,
    received: 60,
    closingDebt: 5,
    receipts: [],
    since: null,
    ...patch,
  });
  const figures = (patch: Partial<SheetFigures>): SheetFigures => ({
    ...sumFigures([], []),
    ...patch,
  });

  it("«Pul olish» bloki: maydon bo'yicha; bitta maydon yoki blok noma'lum — `null`", () => {
    const summed = sumFigures([figures({ cash: cash({}) }), figures({ cash: cash({ received: null, dueTotal: 35 }) })], []).cash;
    expect(summed).toMatchObject({ salesAmount: 200, dueTotal: 100, received: null, closingDebt: 10, discountSystem: null });
    expect(sumFigures([figures({ cash: cash({}) }), figures({ cash: null })], []).cash).toBeNull();
  });

  it("`handoverDue` bittasi kelmasa — `null`; kuryer xizmati — yozilganlari yig'indisi", () => {
    const summed = sumFigures([figures({ handoverDue: 100, fee: { amount: 30, note: "a" } }), figures({ handoverDue: null, fee: null })], []);
    expect(summed.handoverDue).toBeNull();
    expect(summed.fee).toEqual({ amount: 30, note: "" });
    expect(sumFigures([figures({ fee: null })], []).fee).toBeNull();
  });
});

describe("sumFigures — tasdiqlanmagan manzil (hujjat 108)", () => {
  it("«shundan tasdiqlanmagan» ham yig'iladi — frontend guruhlaganda viloyat jamisida yo'qolmaydi", () => {
    const block = (addresses: number, pending: number) =>
      mapSalesSheet({ totals: { addresses, pending_addresses: pending, pending_in_addresses: true } }).totals;
    const sum = sumFigures([block(3, 1), block(5, 2)], []);
    expect(sum.addresses).toBe(8);
    expect(sum.pendingAddresses).toBe(3);
  });
});
