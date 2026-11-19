import { describe, expect, it } from "vitest";

import type { ItemRef } from "@/lib/item-ref";

import { documentRows, draftQuantity, initialDraft, planDocument } from "./courier-document";
import type { CourierStock, SkladStockRow } from "./types";

const product = (id: number, name: string, stockFactor = 1): ItemRef => ({
  id,
  name,
  image: null,
  unitLabel: stockFactor > 1 ? "karobka" : "dona",
  countsInDona: stockFactor > 1,
  stockFactor,
});

const ELIXIR = product(8, "Elixir");
const RAYHON = product(7, "Rayhon");
const TEA = product(6, "Tea");
/** Donada yuritiladi, skladda karobkada: 1 karobka = 3 dona (hujjat 84 §3). */
const KREMI = product(34, "Kremi", 3);
/** Skladda qatori yo'q, lekin kuryerda bor. */
const YOSTIQ = product(10, "Yostiq");

const inStore = (item: ItemRef, inSklad: number): SkladStockRow => ({ item, inSklad, withCouriers: 0, minQuantity: 0, isLow: false });

const STOCK = [inStore(ELIXIR, 0), inStore(KREMI, 4), inStore(RAYHON, -2), inStore(TEA, 40)];

const courier = (items: Array<[ItemRef, number]>): CourierStock => ({
  courier: { id: 31, fullName: "Bahtiyor", onShift: true },
  onHand: 0,
  items: items.map(([item, quantity]) => ({ item, quantity })),
});

describe("tuzatish — hamma mahsulot (egasi, 2026-11-19)", () => {
  it("avval kuryerdagilar (minus ham), keyin skladdagi qolganlari 0 bilan — har guruh nom bo'yicha", () => {
    const rows = documentRows("adjustment", courier([[YOSTIQ, 2], [TEA, -1]]), STOCK);
    expect(rows.map((row) => [row.item.name, row.available, row.held])).toEqual([
      ["Tea", -1, true],
      // Skladda qatori yo'q mahsulot ham qoladi — u kuryerda.
      ["Yostiq", 2, true],
      ["Elixir", 0, false],
      ["Kremi", 0, false],
      ["Rayhon", 0, false],
    ]);
  });

  it("qo'lida hech narsa yo'q kuryer — sklad mahsulotlari to'liq, hammasi 0", () => {
    const rows = documentRows("adjustment", courier([]), STOCK);
    expect(rows.map((row) => row.item.id)).toEqual([8, 34, 7, 6]);
    expect(rows.every((row) => row.available === 0 && !row.held)).toBe(true);
    expect(initialDraft("adjustment", rows)).toEqual({ 8: "0", 34: "0", 7: "0", 6: "0" });
  });

  it("kuryerdagi son ekran birligida (karobkadagi dona mahsuloti — donada)", () => {
    const [kremi] = documentRows("adjustment", courier([[KREMI, 2]]), STOCK);
    expect(kremi).toMatchObject({ item: KREMI, available: 6, held: true });
  });

  it("faqat o'zgargan qator yuboriladi: 0 → N ham, N → 0 ham; dona → karobka aniq", () => {
    const rows = documentRows("adjustment", courier([[TEA, 5]]), STOCK);
    const draft = { ...initialDraft("adjustment", rows), 6: "4", 34: "6", 8: "0", 7: "" };
    const plan = planDocument("adjustment", rows, draft);
    expect(plan.lines.map(({ row, qty }) => [row.item.name, qty])).toEqual([
      ["Tea", 4],
      ["Kremi", 6],
    ]);
    // Kremi: 6 dona = 2 karobka (server birligi).
    expect(plan.sendable).toEqual([
      { itemId: 6, quantity: 4 },
      { itemId: 34, quantity: 2 },
    ]);
    expect(plan).toMatchObject({ notWhole: false, overLimit: false });
    expect(planDocument("adjustment", rows, { ...draft, 6: "0" }).sendable).toContainEqual({ itemId: 6, quantity: 0 });
  });

  it("tegilmagan minus qator yuborilmaydi; 0 yozilsa — yuboriladi", () => {
    const rows = documentRows("adjustment", courier([[TEA, -3], [RAYHON, 5]]), []);
    const draft = initialDraft("adjustment", rows);
    expect(draft[TEA.id]).toBe("-3");
    // Faqat Rayhon o'zgardi — Tea (minus) jimgina 0 bo'lib ketmasin.
    expect(planDocument("adjustment", rows, { ...draft, [RAYHON.id]: "4" }).sendable).toEqual([{ itemId: RAYHON.id, quantity: 4 }]);
    expect(planDocument("adjustment", rows, { ...draft, [TEA.id]: "0" }).sendable).toEqual([{ itemId: TEA.id, quantity: 0 }]);
    expect(planDocument("adjustment", rows, draft).sendable).toEqual([]);
  });

  it("hech narsa o'zgarmasa — yuboriladigan qator yo'q", () => {
    const rows = documentRows("adjustment", courier([[TEA, 5], [ELIXIR, 1]]), STOCK);
    expect(planDocument("adjustment", rows, initialDraft("adjustment", rows)).lines).toEqual([]);
  });

  it("butun karobka chiqmasa — qator yuborilmaydi va saqlash yopiq", () => {
    const rows = documentRows("adjustment", courier([]), STOCK);
    const plan = planDocument("adjustment", rows, { ...initialDraft("adjustment", rows), 34: "4" });
    expect(plan.lines).toHaveLength(1);
    expect(plan.sendable).toEqual([]);
    expect(plan.notWhole).toBe(true);
  });
});

describe("berish va qabul — avvalgidek", () => {
  it("berish: sklad qoldig'idagi hamma mahsulot, 0 va minus ham; sukut bo'sh", () => {
    const rows = documentRows("courier_load", courier([[TEA, 1]]), STOCK);
    expect(rows.map((row) => [row.item.name, row.available])).toEqual([
      ["Elixir", 0],
      ["Kremi", 12],
      ["Rayhon", -2],
      ["Tea", 40],
    ]);
    expect(initialDraft("courier_load", rows)).toEqual({ 8: "", 34: "", 7: "", 6: "" });
    const plan = planDocument("courier_load", rows, { 6: "45", 8: "0" });
    expect(plan.sendable).toEqual([{ itemId: 6, quantity: 45 }]);
    // Bordan ko'p — saqlanadi, faqat ogohlantirish (hujjat 90).
    expect(plan.overLimit).toBe(true);
  });

  it("qabul: faqat kuryer qo'lidagi musbat mol, sukut — hammasi", () => {
    const rows = documentRows("courier_return", courier([[TEA, 3], [ELIXIR, -1], [YOSTIQ, 2]]), STOCK);
    expect(rows.map((row) => row.item.name)).toEqual(["Tea", "Yostiq"]);
    expect(planDocument("courier_return", rows, initialDraft("courier_return", rows)).sendable).toEqual([
      { itemId: 6, quantity: 3 },
      { itemId: 10, quantity: 2 },
    ]);
  });

  it("maydon matni: bo'sh, noto'g'ri yoki manfiy — 0", () => {
    expect(draftQuantity("12")).toBe(12);
    expect(draftQuantity("")).toBe(0);
    expect(draftQuantity(undefined)).toBe(0);
    expect(draftQuantity("abc")).toBe(0);
    expect(draftQuantity("-3")).toBe(0);
  });
});
