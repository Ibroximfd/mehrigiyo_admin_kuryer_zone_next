import { describe, expect, it } from "vitest";

import { mapCourierStock, mapStockCell, skladStockRows, type StockCell } from "./types";

const item = { id: 14, name: "Alatoo bals", image: null };

const cell = (onHand: number, isLow: boolean): StockCell => ({
  kind: "region",
  item,
  onHand,
  minQuantity: 50,
  isLow,
});

describe("skladStockRows", () => {
  it("bo'sh qolgan birlashgan ombor mahsulotni «kam» qilmaydi — yig'indi hal qiladi", () => {
    const [row] = skladStockRows(
      [cell(2460, false), cell(0, true), cell(0, true)],
      [],
    );
    expect(row?.inSklad).toBe(2460);
    expect(row?.isLow).toBe(false);
  });

  it("jami qoldiq minimumdan past bo'lsa — «kam»", () => {
    const [row] = skladStockRows([cell(20, true), cell(0, true)], []);
    expect(row?.isLow).toBe(true);
  });
});

describe("sklad item.image", () => {
  it("to'liq URL saqlanadi, bo'sh yoki yo'q — null", () => {
    expect(mapCourierStock({ id: 1, items: [{ item: { id: 2, name: "G", image: "https://x.uz/m/g.png" }, quantity: 1 }] }).items[0]?.item).toEqual({
      id: 2,
      name: "G",
      image: "https://x.uz/m/g.png",
    });
    expect(mapStockCell({ item: { id: 2, name: "G", image: null } }).item.image).toBeNull();
    expect(mapStockCell({ item: { id: 2, name: "G" } }).item.image).toBeNull();
  });
});
