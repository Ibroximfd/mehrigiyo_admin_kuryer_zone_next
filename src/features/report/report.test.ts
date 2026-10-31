import { describe, expect, it } from "vitest";

import { isEmptyReport, mapChiefFinance, productTotals } from "./types";

describe("moliya: chief/finance (TUZILMA_V2 §5.1)", () => {
  const finance = mapChiefFinance({
    date_from: "2026-10-31",
    date_to: "2026-10-31",
    by_filial: [
      { filial: null, delivered: 0, addresses: 0, fee: 0, cash_accepted: 120000, handed_over: 0, to_hand_over: 120000 },
      { filial: { id: 1, name: "Qo'qon" }, delivered: 12, addresses: 15, fee: 225000, cash_accepted: 3400000, handed_over: 2000000, to_hand_over: 1400000 },
    ],
    totals: { cash_accepted: 3520000, handed_over: 2000000, to_hand_over: -5, delivered: 12, addresses: 15, fee: 225000 },
  });

  it("taqsimlanmagan qator oxirida, manfiy qoldiq 0", () => {
    expect(finance.byFilial.map((row) => row.filial?.id ?? null)).toEqual([1, null]);
    expect(finance.byFilial[0]).toMatchObject({ fee: 225000, cashAccepted: 3400000, toHandOver: 1400000 });
    expect(finance.totals.toHandOver).toBe(0);
  });

  it("kuryer kesimi va mahsulotlar jami (V13)", () => {
    const report = mapChiefFinance({
      by_courier: [
        { courier: { id: 1, full_name: "A" }, delivered: 2, addresses: 2, cash_with_courier: 100, cash_handed: 50, by_product: [{ item: { id: 11, name: "G" }, qty: 2 }] },
        { courier: { id: 2, full_name: "B" }, delivered: 1, addresses: 1, cash_with_courier: 0, cash_handed: 0, by_product: [{ item: { id: 11, name: "G" }, qty: 1 }, { item: { id: 12, name: "K" }, qty: 5 }] },
      ],
    });
    expect(report.byCourier[0]).toMatchObject({ cashWithCourier: 100, cashHanded: 50 });
    expect(productTotals(report.byCourier)).toEqual([
      { item: { id: 12, name: "K" }, quantity: 5 },
      { item: { id: 11, name: "G" }, quantity: 3 },
    ]);
  });

  it("bo'sh hisobot: kuryer yo'q, yetkazilmagan va qoldiq yo'q", () => {
    expect(isEmptyReport(finance)).toBe(false);
    expect(isEmptyReport(mapChiefFinance({ by_courier: [{ courier: { id: 1, full_name: "A" }, delivered: 0, addresses: 0 }] }))).toBe(true);
  });
});
