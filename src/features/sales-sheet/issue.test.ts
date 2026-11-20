import { describe, expect, it } from "vitest";

import { closingMismatch, idleCourierSheet, idleCouriers, issueOf, planOnlyCouriers } from "./issue";
import { mapIssuePlan, mapSalesSheet } from "./types";

/** Test server javobi shaklida (2026-11-20): Test Kuryer — qoldig'i bor, zakazlarga choy va bals yetmaydi. */
const PLAN = mapIssuePlan({
  date: "2026-11-20",
  products: [
    { id: 12, name_uz: "Shifo choy", count_unit: "piece", pieces_per_box: 1 },
    { id: 14, name_uz: "Alatoo bals", count_unit: "piece", pieces_per_box: 1 },
  ],
  couriers: [
    {
      courier: { id: 27, full_name: "Test Kuryer" },
      carried_orders: 5,
      new_orders: 2,
      on_hand: { "12": { qty: 9, pieces: 0, pieces_total: 9 }, "14": { qty: 2, pieces: 0, pieces_total: 2 } },
      pending: {},
      required: { "12": { qty: 17, pieces: 0, pieces_total: 17 }, "14": { qty: 3, pieces: 0, pieces_total: 3 } },
      to_issue: { "12": { qty: 8, pieces: 0, pieces_total: 8 }, "14": { qty: 1, pieces: 0, pieces_total: 1 } },
      issue_lines: [
        { item_id: 12, quantity: 8 },
        { item_id: 14, quantity: 1 },
      ],
    },
    { courier: { id: 40, full_name: "Bo'sh kuryer" }, new_orders: 3, to_issue: { "12": { qty: 2, pieces: 0 } } },
    { courier: { id: 41, full_name: "Zakazsiz" } },
  ],
  store: { location_id: 1 },
});

const SHEET = mapSalesSheet({
  products: [
    { id: 12, name_uz: "Shifo choy", count_unit: "piece", pieces_per_box: 1 },
    { id: 14, name_uz: "Alatoo bals", count_unit: "piece", pieces_per_box: 1 },
  ],
  couriers: [{ courier: { id: 27, full_name: "Test Kuryer" }, closing: { "12": { qty: 9, pieces: 0, pieces_total: 9 }, "14": { qty: 2, pieces: 0, pieces_total: 2 } } }],
});

describe("bugungi berish — Sotuv jadvalida (egasi, 2026-11-20)", () => {
  it("kuryer qatori rejadan; rejada yo'q yoki reja kelmagan — `null`", () => {
    expect(issueOf(PLAN, 27)?.toIssue).toEqual({ "12": { qty: 8, pieces: 0, piecesTotal: 8 }, "14": { qty: 1, pieces: 0, piecesTotal: 1 } });
    expect(issueOf(PLAN, 99)).toBeNull();
    expect(issueOf(null, 27)).toBeNull();
  });

  it("jadvalda yo'q, lekin zakazi yoki berilishi kerak moli bor kuryer — alohida; zakazsiz va bo'sh kuryer — yo'q", () => {
    expect(planOnlyCouriers(PLAN, SHEET).map((row) => row.courier.id)).toEqual([40]);
    expect(planOnlyCouriers(null, SHEET)).toEqual([]);
    // Bo'sh blok: mahsulot qatorlari nol, pul noma'lum («—»).
    expect(idleCourierSheet({ id: 40, fullName: "Bo'sh kuryer" })).toMatchObject({ closing: {}, cash: null, fee: null, handoverDue: null, days: [] });
  });

  it("hujjat 104: jadvalda yo'q hamma o'z kuryeri — avval rejadagilar, keyin qolganlar nom bo'yicha, takrorsiz", () => {
    const own = [
      { id: 27, fullName: "Test Kuryer" },
      { id: 52, fullName: "Zafar" },
      { id: 40, fullName: "Bo'sh kuryer" },
      { id: 51, fullName: "Anvar" },
    ];
    expect(idleCouriers(PLAN, SHEET, own).map((courier) => courier.id)).toEqual([40, 51, 52]);
    expect(idleCouriers(null, SHEET, own).map((courier) => courier.id)).toEqual([51, 40, 52]);
    expect(idleCouriers(PLAN, SHEET, [])).toEqual([{ id: 40, fullName: "Bo'sh kuryer" }]);
  });

  it("«Qolgan» = skladdagi qoldiq — mos bo'lsa jim; farq bo'lsa mahsulot bo'yicha ochiq", () => {
    const products = SHEET.products;
    expect(closingMismatch(SHEET.couriers[0]!.closing, issueOf(PLAN, 27)!.onHand, products)).toEqual([]);
    const drift = closingMismatch({ "12": { qty: 9, pieces: 0, piecesTotal: 9 } }, issueOf(PLAN, 27)!.onHand, products);
    expect(drift.map((row) => [row.product.id, row.closing, row.onHand])).toEqual([[14, { qty: 0, pieces: 0 }, { qty: 2, pieces: 0, piecesTotal: 2 }]]);
  });
});
