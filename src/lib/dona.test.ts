import { describe, expect, it } from "vitest";

import { boxesToDona, countsInDona, donaToBoxes, piecesPerBoxOf } from "./dona";
import { mapItemRef, shownQuantity, shownUnit, stockQuantityOf } from "./item-ref";

describe("faqat dona — qaysi mahsulot (hujjat 84 §1)", () => {
  it("`count_unit` bo'lsa — u hal qiladi", () => {
    expect(countsInDona({ count_unit: "piece" })).toBe(true);
    expect(countsInDona({ count_unit: "box", piece_sale: true })).toBe(false);
  });

  it("`count_unit` yo'q — donalab sotish belgisi (hujjat 77 §4)", () => {
    expect(countsInDona({ piece_sale: true })).toBe(true);
    expect(countsInDona({ units_allowed: ["box", "piece"] })).toBe(true);
    expect(countsInDona({ piece_sale: false, units_allowed: ["box"] })).toBe(false);
    expect(countsInDona({})).toBe(false);
  });

  it("karobkadagi dona — faqat musbat butun son, aks holda taxmin yo'q", () => {
    expect(piecesPerBoxOf(3)).toBe(3);
    expect(piecesPerBoxOf("12")).toBe(12);
    for (const bad of [0, -3, 2.5, "", null, undefined, "abc"]) expect(piecesPerBoxOf(bad)).toBeNull();
  });
});

describe("aniq aylantirish", () => {
  it("karobka → dona, ishora saqlanadi", () => {
    expect(boxesToDona(10, 3, 1)).toBe(31);
    expect(boxesToDona(41, 3)).toBe(123);
    expect(boxesToDona(-1, 3, -1)).toBe(-4);
  });

  it("dona → karobka faqat butun bo'lsa", () => {
    expect(donaToBoxes(30, 3)).toBe(10);
    expect(donaToBoxes(31, 3)).toBeNull();
    expect(donaToBoxes(0, 3)).toBe(0);
    expect(donaToBoxes(31, 1)).toBe(31);
  });
});

describe("sklad `item{}` — ekrandagi son va birlik", () => {
  const kremi = mapItemRef({
    id: 34,
    name: "Doctor Ali Kremi",
    unit_label: "karobka",
    stock_unit: "box",
    pieces_per_box: 3,
    piece_sale: true,
  });

  it("skladda karobkada turgan dona mahsuloti — donaga, kiritish donadan butun karobkaga", () => {
    expect(kremi).toMatchObject({ countsInDona: true, stockFactor: 3, unitLabel: "karobka" });
    expect(shownQuantity(kremi, 41)).toBe(123);
    expect(shownUnit(kremi)).toBe("dona");
    expect(stockQuantityOf(kremi, 30)).toBe(10);
    expect(stockQuantityOf(kremi, 31)).toBeNull();
  });

  it("karobkadagi dona kelmagan — son va birlik serverdagidek", () => {
    const unknown = mapItemRef({ id: 34, unit_label: "karobka", stock_unit: "box", piece_sale: true });
    expect(unknown).toMatchObject({ countsInDona: true, stockFactor: 1 });
    expect(shownQuantity(unknown, 41)).toBe(41);
    expect(shownUnit(unknown)).toBe("karobka");
  });

  it("skladda donada turgan yoki faqat karobkada sotiladigan — o'zgarmaydi", () => {
    const inPieces = mapItemRef({ id: 30, unit_label: "dona", stock_unit: "piece", pieces_per_box: 3, piece_sale: true });
    expect(inPieces).toMatchObject({ countsInDona: true, stockFactor: 1 });
    const boxOnly = mapItemRef({ id: 3, unit_label: "karobka", stock_unit: "box", pieces_per_box: 2, piece_sale: false });
    expect(boxOnly).toMatchObject({ countsInDona: false, stockFactor: 1 });
    expect(shownUnit(boxOnly)).toBe("karobka");
    expect(stockQuantityOf(boxOnly, 7)).toBe(7);
  });

  it("eski javob (yangi kalitlarsiz) — avvalgidek", () => {
    expect(mapItemRef({ id: 1, name: "G" })).toEqual({ id: 1, name: "G", image: null, unitLabel: "dona", countsInDona: false, stockFactor: 1 });
  });
});
