import { describe, expect, it } from "vitest";

import { buildDayStock, dayStockOf, sumQty } from "./day-state";
import { mapSkladSheet } from "./types";

/** Mahsulotlar serverdagidek: choy — dona, krem — donada yuritiladi (1 kar. = 3 dona), eliksir — karobkada. */
const PRODUCTS = [
  { id: 5, name_uz: "Doctor Ali Tea", count_unit: "piece", pieces_per_box: 1, unit_label: "dona" },
  { id: 34, name_uz: "Doctor Ali Kremi", count_unit: "piece", pieces_per_box: 3, unit_label: "karobka" },
  { id: 50, name_uz: "Elixir Premium", count_unit: "box", pieces_per_box: 2, unit_label: "karobka" },
];

const dona = (count: number, perBox = 1) => ({ qty: Math.trunc(count / perBox), pieces: count % perBox, pieces_total: count });

/** 21.11.2026 — prod javobidagi sonlar (hujjat 113): kun oxiri, sotuv, sovg'a. */
const DAY = {
  date_from: "2026-11-21",
  date_to: "2026-11-21",
  products: PRODUCTS,
  opening: { items: {}, amount: 0 },
  sold: { items: { "5": dona(8), "34": dona(226, 3), "50": { qty: 8, pieces: 0 } }, amount: 0 },
  gift: { items: { "5": dona(1), "34": dona(75, 3), "50": { qty: 1, pieces: 0 } }, amount: 0 },
  other: { items: { "5": dona(80), "34": dona(984, 3), "50": { qty: 93, pieces: 0 } }, amount: 0 },
  closing: { items: { "5": dona(71), "34": dona(683, 3), "50": { qty: 84, pieces: 0 } }, amount: 0 },
};

const textsOf = (model: ReturnType<typeof buildDayStock>) => model.table.rows.map((row) => [row.label, ...row.cells.map((cell) => cell.text)]);

describe("kataklar yig'indisi", () => {
  const [tea, kremi, elixir] = mapSkladSheet({ products: PRODUCTS }).products;

  it("donada yuritiladigan mahsulot — jami dona; ortiqcha donalar karobkaga yig'iladi", () => {
    expect(
      sumQty(
        [
          { qty: 227, pieces: 2, piecesTotal: 683 },
          { qty: 75, pieces: 1, piecesTotal: 226 },
          { qty: 25, pieces: 0, piecesTotal: 75 },
        ],
        kremi!,
      ),
    ).toEqual({ qty: 328, pieces: 0, piecesTotal: 984 });
    expect(sumQty([{ qty: 71, pieces: 0, piecesTotal: 71 }, { qty: 0, pieces: 0 }, { qty: 9, pieces: 0, piecesTotal: 9 }], tea!)).toEqual({
      qty: 80,
      pieces: 0,
      piecesTotal: 80,
    });
  });

  it("karobka mahsuloti — karobkada; `pieces_total` kelmagan katak bo'lsa u yasalmaydi", () => {
    expect(sumQty([{ qty: 84, pieces: 0 }, { qty: 8, pieces: 1 }, { qty: 1, pieces: 1 }], elixir!)).toEqual({ qty: 94, pieces: 0 });
    expect(sumQty([{ qty: 2, pieces: 0, piecesTotal: 6 }, { qty: 1, pieces: 0 }], kremi!)).toEqual({ qty: 3, pieces: 0 });
  });

  it("bo'sh ro'yxat — nol", () => {
    expect(sumQty([], tea!)).toEqual({ qty: 0, pieces: 0 });
  });
});

describe("kunning saqlangan holati (egasi, 2026-11-23)", () => {
  it("server `day_state` — uch qator ham serverdan, sotuv ayrilmagan; asosiy raqamlar shu holatdan", () => {
    const sheet = mapSkladSheet({
      ...DAY,
      day_state: {
        total: { items: { "5": dona(80), "34": dona(984, 3), "50": { qty: 93, pieces: 0 } } },
        couriers: { items: { "5": dona(37), "34": dona(474, 3), "50": { qty: 36, pieces: 0 } } },
        store: { items: { "5": dona(43), "34": dona(510, 3), "50": { qty: 57, pieces: 0 } } },
      },
      current: { store: {}, couriers: {}, total: {}, min: { "5": 50 } },
    });
    const stock = dayStockOf(sheet);
    expect(stock?.split).not.toBeNull();
    const model = buildDayStock(sheet.products, stock!, sheet.current?.min);
    expect(model.kind).toBe("split");
    expect(textsOf(model)).toEqual([
      ["Jami", "80", "984", "93"],
      ["Kuryerlarga berilgan", "37", "474", "36"],
      ["Omborda qolgan", "43", "510", "57"],
    ]);
    if (model.kind !== "split") throw new Error("split kutilgan");
    expect(model.table).toMatchObject({ storeTotal: 610, couriersTotal: 547, lowCount: 1 });
    // Choy omborda 43 < minimal 50 — sariq.
    expect(model.table.rows[2]?.cells[0]?.tone).toBe("warn");
  });

  it("server hali bermaydi — faqat «Jami»: kun oxiri + sotuv + sovg'a; bo'linish o'ylab topilmaydi", () => {
    const sheet = mapSkladSheet(DAY);
    const stock = dayStockOf(sheet);
    expect(stock?.split).toBeNull();
    const model = buildDayStock(sheet.products, stock!);
    // 71 + 8 + 1 = 80; 683 + 226 + 75 = 984 (328 kar.); 84 + 8 + 1 = 93 — 21.11 Tuzatish yig'indisi bilan bir xil.
    expect(textsOf(model)).toEqual([["Jami", "80", "984", "93"]]);
    expect(model).toMatchObject({ kind: "total", total: 1157 });
  });

  it("sotuv bo'lmagan kun — Jami = kun oxiri (22.11, dam olish kuni)", () => {
    const quiet = mapSkladSheet({ ...DAY, sold: { items: {}, amount: 0 }, gift: { items: {}, amount: 0 } });
    expect(textsOf(buildDayStock(quiet.products, dayStockOf(quiet)!))).toEqual([["Jami", "71", "683", "84"]]);
  });

  it("javobda kun oxiri, sotuv yoki sovg'a bloki yo'q — holat yo'q (son yasalmaydi)", () => {
    expect(dayStockOf(mapSkladSheet({ products: PRODUCTS, sold: DAY.sold, gift: DAY.gift }))).toBeNull();
    expect(dayStockOf(mapSkladSheet({ products: PRODUCTS, closing: DAY.closing, sold: DAY.sold }))).toBeNull();
  });
});
