import { describe, expect, it } from "vitest";

import { mapCourierCash } from "./cash";
import type { CashReceipt } from "./cash";
import { addressNote, canCancelReceipt, cashAction, cashStrip, discountHint, receiptHint, remainingDebt } from "./cash-view";

/** «Pul olish» maketidagi jami (18.11.2026, uch kuryer) — server javobi, test ichida. */
const TOTALS = mapCourierCash({
  sales_amount: 54_400_000,
  online_amount: 11_680_000,
  discount_amount: 450_000,
  gift_amount: 9_400_000,
  fee_amount: 3_770_000,
  opening_debt: 200_000,
  due_total: 29_300_000,
  received: 11_395_000,
  closing_debt: 17_905_000,
});

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

describe("pul olish — ko'rinish qoidalari", () => {
  it("tenglama: yetti bo'lak — sovg'a kirmaydi (85-javob), qiymatlar serverdan", () => {
    const strip = cashStrip(TOTALS, true);
    expect(strip.map((item) => `${item.op}${item.label}`)).toEqual([
      "Umumiy sotuv",
      "−Onlayn",
      "−Skidka",
      "−Kuryer xizmati",
      "+O'tgan qarz",
      "=Olinishi kerak",
      "−Olindi",
    ]);
    expect(strip.map((item) => item.value)).toEqual(["54 400 000", "11 680 000", "450 000", "3 770 000", "200 000", "29 300 000", "11 395 000"]);
    expect(strip.filter((item) => item.result).map((item) => item.label)).toEqual(["Olinishi kerak"]);
    // Oraliqda — davr boshidagi qarz; kelmagan raqam — «—».
    const range = cashStrip(mapCourierCash({}), false);
    expect(range[4]!.label).toBe("Davr boshidagi qarz");
    expect(range.every((item) => item.value === "—")).toBe(true);
  });

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

  it("kuryer izohi va skidka izohi", () => {
    expect(addressNote(22, 1)).toBe("22 manzil · 1 atkaz");
    expect(addressNote(23, 0)).toBe("23 manzil");
    expect(discountHint(mapCourierCash({ discount_system: 150_000, discount_manual: 0 }))).toBe("+ tizimda 150 000 (ball)");
    expect(discountHint(mapCourierCash({ discount_amount: 300_000 }))).toBe("so'm, o'zingiz yozasiz");
  });
});
