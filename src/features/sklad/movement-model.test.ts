import { describe, expect, it } from "vitest";

import {
  addItem,
  filterCatalog,
  overdraft,
  readyToSave,
  scanMatch,
  setQuantity,
  sortCatalog,
  summarize,
  takeEverything,
  type CatalogItem,
} from "./movement-model";

const item = (id: number, name: string, available: number | null, extra: Partial<CatalogItem> = {}): CatalogItem => ({
  id,
  name,
  sku: `SKU-${id}`,
  barcode: `47800${id}`,
  packageSize: 12,
  pinned: false,
  available,
  ...extra,
});

const A = item(1, "Bronx siropi", 30);
const B = item(2, "Asal", 0);
const C = item(3, "Choy", 5, { pinned: true });

describe("katalog", () => {
  it("qadalgan → bori → nomi (chiqimda); kirimda bor-yo'qligi ahamiyatsiz", () => {
    expect(sortCatalog([A, B, C], "write_off").map((row) => row.id)).toEqual([3, 1, 2]);
    expect(sortCatalog([A, B, C], "receipt").map((row) => row.id)).toEqual([3, 2, 1]);
  });

  it("qidiruv nom/SKU bo'yicha, skaner aniq shtrix-kodni topadi", () => {
    expect(filterCatalog([A, B, C], "sir").map((row) => row.id)).toEqual([1]);
    expect(filterCatalog([A, B, C], "sku-2").map((row) => row.id)).toEqual([2]);
    expect(scanMatch([A, B, C], "478003")?.id).toBe(3);
    expect(scanMatch([A, B, C], "o")).toBeNull();
    expect(scanMatch([A, B, C], "asal")?.id).toBe(2);
  });
});

describe("qatorlar", () => {
  it("qo'shish tepaga, takror bosish soni oshiradi, karobka qadami", () => {
    let lines = addItem([], "receipt", A);
    lines = addItem(lines, "receipt", C);
    lines = addItem(lines, "receipt", A, 12);
    expect(lines.map((line) => [line.item.id, line.quantity])).toEqual([
      [3, 1],
      [1, 13],
    ]);
  });

  it("tuzatishda yangi qator hozirgi qoldiqdan boshlanadi", () => {
    expect(addItem([], "adjustment", A)[0]!.quantity).toBe(30);
  });

  it("ortiqcha va bo'sh son saqlashni to'xtatadi", () => {
    const lines = setQuantity(addItem([], "courier_load", A), 1, 31);
    expect(overdraft(lines[0]!, "courier_load")).toBe(true);
    expect(readyToSave(lines, "courier_load")).toBe(false);
    expect(readyToSave(setQuantity(lines, 1, 30), "courier_load")).toBe(true);
    expect(readyToSave(setQuantity(lines, 1, 0), "courier_load")).toBe(false);
    expect(readyToSave(setQuantity(lines, 1, 999), "receipt")).toBe(true);
  });

  it("«hammasini» — faqat bor mahsulotlar, to'liq soni", () => {
    expect(takeEverything([A, B, C]).map((line) => [line.item.id, line.quantity])).toEqual([
      [1, 30],
      [3, 5],
    ]);
  });

  it("jami: mahsulot, dona, karobka", () => {
    expect(summarize([{ item: A, quantity: 26 }, { item: C, quantity: 3 }], "receipt")).toMatchObject({
      items: 2,
      pieces: 29,
      boxesHint: 2,
    });
  });
});
