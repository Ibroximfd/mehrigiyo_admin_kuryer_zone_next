import { describe, expect, it } from "vitest";

import { skladStockRows, type StockCell } from "./types";

const item = { id: 14, name: "Alatoo bals", sku: "M-14" };

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
