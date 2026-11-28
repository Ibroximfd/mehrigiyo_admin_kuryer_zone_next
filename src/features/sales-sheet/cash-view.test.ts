import { describe, expect, it } from "vitest";

import { mapCourierCash } from "./cash";
import type { CashReceipt } from "./cash";
import { canCancelReceipt, cashAction, cashWritable, discountHint, onlineHint, receiptHint, remainingDebt, sheetMoney } from "./cash-view";
import { mapSalesSheet } from "./types";

const withDebt = (closing: number | null) => mapCourierCash({ due_total: 12_985_000, received: 0, closing_debt: closing });

const receipt = (patch: Partial<CashReceipt>): CashReceipt => ({
  id: 1,
  amount: 1_000_000,
  at: new Date(2026, 10, 18, 20, 10),
  byName: "Zoirjon",
  note: "",
  canDelete: null,
  ...patch,
});

describe("sotuv jadvalidagi pul — ko'rinish qoidalari", () => {
  it("amal: qarz bor — «Oldim» (bitta kun, dopusk bilan); qarz yo'q — «✓ olindi»; qolgan holatda hech narsa", () => {
    const open = { single: true, canAccept: true };
    expect(cashAction(withDebt(12_985_000), open)).toBe("take");
    expect(cashAction(withDebt(0), open)).toBe("taken");
    expect(cashAction(withDebt(-200_000), open)).toBe("taken");
    expect(cashAction(withDebt(12_985_000), { single: false, canAccept: true })).toBe("none");
    expect(cashAction(withDebt(12_985_000), { single: true, canAccept: false })).toBe("none");
    expect(cashAction(withDebt(0), { single: true, canAccept: false })).toBe("taken");
    // Qarz raqami kelmagan — tugma ham, «olindi» ham yo'q (taxmin qilinmaydi).
    expect(cashAction(withDebt(null), open)).toBe("none");
    expect(cashAction(null, open)).toBe("none");
  });

  it("«Oldim» maydoniga — qolgan qarz; qarz yo'q yoki ortiqcha — bo'sh", () => {
    expect(remainingDebt(withDebt(12_985_000))).toBe(12_985_000);
    expect(remainingDebt(withDebt(-200_000))).toBe(0);
    expect(remainingDebt(withDebt(null))).toBe(0);
  });

  it("jonli izoh: kam — qarz ertaga, ko'p — ortig'i; teng yoki bo'sh — izohsiz", () => {
    expect(receiptHint(12_985_000, 12_500_000)).toEqual({ kind: "short", amount: 485_000 });
    expect(receiptHint(12_985_000, 13_000_000)).toEqual({ kind: "over", amount: 15_000 });
    expect(receiptHint(12_985_000, 12_985_000)).toBeNull();
    expect(receiptHint(12_985_000, Number.NaN)).toBeNull();
    expect(receiptHint(0, 100_000)).toEqual({ kind: "over", amount: 100_000 });
  });

  it("«Bekor qilish»: server aytsa — o'sha; aytmasa — faqat bugun yozilgani", () => {
    expect(canCancelReceipt(receipt({}), "2026-11-18")).toBe(true);
    expect(canCancelReceipt(receipt({}), "2026-11-19")).toBe(false);
    expect(canCancelReceipt(receipt({ at: null }), "2026-11-18")).toBe(false);
    expect(canCancelReceipt(receipt({ canDelete: false }), "2026-11-18")).toBe(false);
    expect(canCancelReceipt(receipt({ canDelete: true }), "2026-11-25")).toBe(true);
  });

  it("skidka va Click izohi: tizimdagi qismi bo'lsa — u ham ko'rinadi", () => {
    expect(onlineHint(mapCourierCash({ online_system: 2_000_000, online_manual: 0 }))).toBe("+ ilovada 2 000 000");
    expect(onlineHint(mapCourierCash({ online_amount: 300_000 }))).toBe("so'm, o'zingiz yozasiz");
    expect(discountHint(mapCourierCash({ discount_system: 150_000, discount_manual: 0 }))).toBe("+ tizimda 150 000 (ball)");
    expect(discountHint(mapCourierCash({ discount_amount: 300_000 }))).toBe("so'm, o'zingiz yozasiz");
  });

  it("Click qo'lda (hujjat 101 §1): server `online_manual` bermaguncha `null` — maydon chiqmaydi", () => {
    expect(mapCourierCash({ online_amount: 500_000 })).toMatchObject({ onlineAmount: 500_000, onlineSystem: null, onlineManual: null });
    expect(mapCourierCash({ online_amount: 700_000, online_system: 500_000, online_manual: 200_000 })).toMatchObject({ onlineSystem: 500_000, onlineManual: 200_000 });
  });

  it("jadval puli `cash` blokidan (sovg'asiz sotuv, Click va skidka qo'lda bilan); blok yo'q — umumiy kalitlar, noma'lum — `null`", () => {
    const sheet = mapSalesSheet({
      totals: {
        sales_amount: 9_000_000,
        online_amount: 100,
        discount_amount: 50,
        cash: { sales_amount: 9_000_000, online_amount: 2_000_000, discount_amount: 300_000, fee_amount: 150_000, opening_debt: 135_000, due_total: 6_685_000, received: 5_000_000, closing_debt: 1_685_000, gift_in_sales: false },
      },
    });
    expect(sheetMoney(sheet.totals)).toEqual({
      sales: 9_000_000,
      online: 2_000_000,
      discount: 300_000,
      fee: 150_000,
      // Javob 140 §5: server `fee_deducted` bermagan — taxmin qilinmaydi.
      feeDeducted: null,
      due: 6_685_000,
      received: 5_000_000,
      debt: 1_685_000,
      openingDebt: 135_000,
    });
    const old = mapSalesSheet({ totals: { sales_amount: 1_000, online_amount: 100, discount_amount: 50, fee: { amount: 20 } } });
    expect(sheetMoney(old.totals)).toEqual({ sales: 1_000, online: 100, discount: 50, fee: 20, feeDeducted: null, due: null, received: null, debt: null, openingDebt: null });
  });

  it("javob 104: pul zanjiri boshidan oldingi kunga yozilmaydi; boshi noma'lum — ochiq", () => {
    expect(cashWritable("2026-11-20", "2026-11-21")).toBe(false);
    expect(cashWritable("2026-11-21", "2026-11-21")).toBe(true);
    expect(cashWritable("2026-11-20", null)).toBe(true);
    expect(mapCourierCash({ since: "2026-11-21" }).since).toBe("2026-11-21");
    expect(mapCourierCash({}).since).toBeNull();
  });
});
