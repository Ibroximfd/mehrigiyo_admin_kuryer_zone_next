import { describe, expect, it } from "vitest";

import { cellOf, EMPTY_CELL, hasCells, isZeroCell, mapCells, mapIssuePlan, mapSalesSheet } from "./types";

/** Hujjat 83 §2 dagi namuna javob (qisqartirilgan). */
const SHEET = {
  date_from: "2026-11-16",
  date_to: "2026-11-16",
  since: "2026-11-01",
  products: [
    { id: 6, name: "Doctor Ali Tea", name_uz: "Doctor Ali Tea (Ipak choy)", order: 1, unit_label: "dona" },
    { id: 7, name: "Rayhon", order: 2, unit_label: "karobka" },
  ],
  couriers: [
    {
      courier: { id: 31, full_name: "Bahtiyor" },
      opening: { "6": { qty: 3, pieces: 0 } },
      issued: { "6": { qty: 1, pieces: 0 } },
      given: { "6": { qty: 4, pieces: 0 }, "7": { qty: 2, pieces: 5 } },
      sold: { "6": { qty: 1, pieces: 0 } },
      gift: {},
      other: {},
      closing: { "6": { qty: 3, pieces: 0 }, "7": { qty: 2, pieces: 5 } },
      sales_amount: 17_070_000,
      cash_amount: 12_060_000,
      online_amount: 5_010_000,
      discount_amount: 0,
      addresses: 22,
      refused_addresses: 1,
      open_orders: 9,
      fee: { amount: 1_495_000, note: "23 manzil × 65 000", set_by: { id: 7, full_name: "Zoirjon" }, set_at: "2026-11-16T19:40:00+05:00" },
      handover_due: 10_565_000,
      days: [],
    },
  ],
  totals: { cash_amount: 12_060_000, fee: { amount: 1_495_000 }, handover_due: 10_565_000 },
  checks: [],
};

describe("sotuv jadvali — `mapSalesSheet` (hujjat 83 §2)", () => {
  it("kontrakt namunasi: mahsulot, kataklar, pul, kuryer xizmati", () => {
    const sheet = mapSalesSheet(SHEET);
    expect(sheet).toMatchObject({ dateFrom: "2026-11-16", dateTo: "2026-11-16" });
    // Nom — `name_uz`, bo'lmasa `name`; birlik — `unit_label`.
    expect(sheet.products).toEqual([
      { id: 6, name: "Doctor Ali Tea (Ipak choy)", unitLabel: "dona" },
      { id: 7, name: "Rayhon", unitLabel: "karobka" },
    ]);
    const [bahtiyor] = sheet.couriers;
    expect(bahtiyor!.courier).toEqual({ id: 31, fullName: "Bahtiyor" });
    expect(cellOf(bahtiyor!.given, 6)).toEqual({ qty: 4, pieces: 0 });
    expect(cellOf(bahtiyor!.closing, 7)).toEqual({ qty: 2, pieces: 5 });
    expect(bahtiyor).toMatchObject({
      salesAmount: 17_070_000,
      cashAmount: 12_060_000,
      onlineAmount: 5_010_000,
      addresses: 22,
      refusedAddresses: 1,
      openOrders: 9,
      fee: { amount: 1_495_000, note: "23 manzil × 65 000" },
      handoverDue: 10_565_000,
      days: [],
    });
    expect(sheet.totals).toMatchObject({ cashAmount: 12_060_000, fee: { amount: 1_495_000, note: "" }, handoverDue: 10_565_000 });
  });

  it("yo'q kalit = nol katak; nol kelgan katak ham saqlanmaydi (§2.1)", () => {
    const [bahtiyor] = mapSalesSheet(SHEET).couriers;
    expect(cellOf(bahtiyor!.gift, 6)).toBe(EMPTY_CELL);
    expect(cellOf(bahtiyor!.sold, 7)).toBe(EMPTY_CELL);
    expect(hasCells(bahtiyor!.other)).toBe(false);
    expect(mapCells({ "6": { qty: 0, pieces: 0 }, "7": { qty: 0, pieces: 2 }, "8": null })).toEqual({ "7": { qty: 0, pieces: 2 } });
    expect(isZeroCell({ qty: 0, pieces: 0 })).toBe(true);
    expect(isZeroCell({ qty: -3, pieces: 0 })).toBe(false);
  });

  it("kalitlar umuman bo'lmasa — nol va `null`, yiqilmaydi", () => {
    const sheet = mapSalesSheet({ couriers: [{}] });
    expect(sheet).toMatchObject({ dateFrom: "", dateTo: "", products: [], checks: [] });
    const [row] = sheet.couriers;
    expect(row).toMatchObject({
      courier: { id: 0, fullName: "" },
      given: {},
      closing: {},
      salesAmount: 0,
      cashAmount: 0,
      onlineAmount: 0,
      discountAmount: 0,
      addresses: 0,
      refusedAddresses: 0,
      openOrders: 0,
      // Yozilmagan xizmat va kelmagan `handover_due` — `null`: «0 so'm» emas, hisoblanmaydi ham.
      fee: null,
      handoverDue: null,
      days: [],
    });
    expect(sheet.totals).toMatchObject({ cashAmount: 0, fee: null, handoverDue: null });
    expect(mapSalesSheet(null).couriers).toEqual([]);
    expect(mapSalesSheet("xato").totals.handoverDue).toBeNull();
  });

  it("`fee: null` va summasiz `fee` — yozilmagan", () => {
    const fees = mapSalesSheet({ couriers: [{ fee: null }, { fee: { note: "izoh" } }, { fee: { amount: "780000" } }] }).couriers.map((row) => row.fee);
    expect(fees).toEqual([null, null, { amount: 780_000, note: "" }]);
  });

  it("kunma-kun qatorlar (`days[]`, §2.9) — o'sha kalitlar + sana", () => {
    const sheet = mapSalesSheet({
      couriers: [{ courier: { id: 31 }, days: [{ date: "2026-11-16", sold: { "6": { qty: 1 } }, cash_amount: 500, fee: { amount: 100 }, handover_due: 400 }, {}] }],
    });
    expect(sheet.couriers[0]!.days).toMatchObject([
      { date: "2026-11-16", sold: { "6": { qty: 1, pieces: 0 } }, cashAmount: 500, fee: { amount: 100 }, handoverDue: 400 },
      { date: "", cashAmount: 0, fee: null, handoverDue: null },
    ]);
  });

  it("`checks[]` — mahsulot id yoki obyekt, miqdor juft yoki son", () => {
    const { checks } = mapSalesSheet({
      checks: [
        { date: "2026-11-16", courier_id: 31, flow: "sold", product: 6, ledger: { qty: 5, pieces: 1 }, orders: { qty: 4 } },
        { date: "2026-11-16", flow: "gift", product: { id: 7, name: "Rayhon" }, ledger: 3, orders: 2 },
        {},
      ],
    });
    expect(checks).toEqual([
      { date: "2026-11-16", courierId: 31, flow: "sold", productId: 6, ledger: { qty: 5, pieces: 1 }, orders: { qty: 4, pieces: 0 } },
      { date: "2026-11-16", courierId: null, flow: "gift", productId: 7, ledger: { qty: 3, pieces: 0 }, orders: { qty: 2, pieces: 0 } },
      { date: "", courierId: null, flow: "sold", productId: null, ledger: EMPTY_CELL, orders: EMPTY_CELL },
    ]);
  });
});

describe("berish rejasi — `mapIssuePlan` (hujjat 83 §4)", () => {
  it("kontrakt namunasi", () => {
    const plan = mapIssuePlan({
      date: "2026-11-17",
      products: [{ id: 6, name: "Doctor Ali Tea" }],
      couriers: [
        {
          courier: { id: 31, full_name: "Bahtiyor" },
          carried_orders: 9,
          new_orders: 21,
          on_hand: { "6": { qty: 3, pieces: 0 } },
          required: { "6": { qty: 5, pieces: 0 } },
          to_issue: { "6": { qty: 2, pieces: 0 } },
          surplus: {},
        },
      ],
      store: { on_hand: { "6": { qty: 20, pieces: 0 } }, to_issue: { "6": { qty: 7, pieces: 0 } }, shortage: {} },
    });
    // `unit_label` kelmasa — «dona».
    expect(plan.products).toEqual([{ id: 6, name: "Doctor Ali Tea", unitLabel: "dona" }]);
    expect(plan.couriers[0]).toEqual({
      courier: { id: 31, fullName: "Bahtiyor" },
      carriedOrders: 9,
      newOrders: 21,
      onHand: { "6": { qty: 3, pieces: 0 } },
      required: { "6": { qty: 5, pieces: 0 } },
      toIssue: { "6": { qty: 2, pieces: 0 } },
      surplus: {},
    });
    expect(plan.store).toEqual({ onHand: { "6": { qty: 20, pieces: 0 } }, toIssue: { "6": { qty: 7, pieces: 0 } }, shortage: {} });
  });

  it("bo'sh javob — bo'sh reja, yiqilmaydi", () => {
    expect(mapIssuePlan({})).toEqual({ date: "", products: [], couriers: [], store: { onHand: {}, toIssue: {}, shortage: {} } });
    expect(mapIssuePlan({ couriers: [{}] }).couriers[0]).toMatchObject({ carriedOrders: 0, newOrders: 0, toIssue: {} });
  });
});
