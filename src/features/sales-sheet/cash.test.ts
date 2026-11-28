import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api-client";

import { cashErrorText, mapCourierCash, mapOptionalCash } from "./cash";
import { mapSalesSheet } from "./types";

/** Hujjat 85 §2 dagi namuna (Bahtiyor, 18.11.2026) — server javobi, test ichida. */
const BAHTIYOR_CASH = {
  sales_amount: 22_000_000,
  online_amount: 5_010_000,
  discount_system: 0,
  discount_manual: 300_000,
  discount_amount: 300_000,
  gift_amount: 4_000_000,
  fee_amount: 1_495_000,
  opening_debt: 200_000,
  due_total: 11_395_000,
  received: 11_395_000,
  closing_debt: 0,
  receipts: [{ id: 9, amount: 11_395_000, at: "2026-11-18T20:10:00+05:00", by: { id: 7, full_name: "Zoirjon" } }],
};

const TEXTS = { fallback: "Pulni yozib bo'lmadi", forbidden: "Bu kuryer sizga biriktirilmagan" };

describe("pul olish — `mapCourierCash` (hujjat 85 §2)", () => {
  it("namuna javob: hamma raqam serverdagidek o'qiladi, hech biri qayta hisoblanmaydi", () => {
    const cash = mapCourierCash(BAHTIYOR_CASH);
    expect(cash).toMatchObject({
      salesAmount: 22_000_000,
      onlineAmount: 5_010_000,
      discountAmount: 300_000,
      discountSystem: 0,
      discountManual: 300_000,
      giftAmount: 4_000_000,
      feeAmount: 1_495_000,
      openingDebt: 200_000,
      dueTotal: 11_395_000,
      received: 11_395_000,
      closingDebt: 0,
    });
    expect(cash.receipts).toEqual([
      { id: 9, amount: 11_395_000, at: new Date("2026-11-18T20:10:00+05:00"), byName: "Zoirjon", note: "", canDelete: null },
    ]);
  });

  it("server bermagan pul maydoni — `null` («—»), o'ylab topilgan `0` emas", () => {
    const cash = mapCourierCash({ sales_amount: "21200000" });
    expect(cash.salesAmount).toBe(21_200_000);
    for (const key of ["onlineAmount", "discountAmount", "giftAmount", "feeAmount", "openingDebt", "dueTotal", "received", "closingDebt"] as const) {
      expect(cash[key], key).toBeNull();
    }
    expect(cash.receipts).toEqual([]);
  });

  it("skidka: qo'lda yozilgani alohida; server ajratmasa — jami; tizim qismi bor-u qo'lda yo'q — noma'lum", () => {
    expect(mapCourierCash({ discount_amount: 450_000, discount_system: 150_000, discount_manual: 300_000 }).discountManual).toBe(300_000);
    expect(mapCourierCash({ discount_amount: 300_000 }).discountManual).toBe(300_000);
    expect(mapCourierCash({ discount_amount: 450_000, discount_system: 150_000 }).discountManual).toBeNull();
    expect(mapCourierCash({}).discountManual).toBeNull();
  });

  it("yozuvlar: `id` siz qator tashlanadi; `can_delete` bo'lsa o'qiladi", () => {
    const cash = mapCourierCash({
      receipts: [{ amount: 1 }, { id: 3, amount: 500_000, created_at: "2026-11-18T10:00:00+05:00", note: "qolgani ertaga", can_delete: false }],
    });
    expect(cash.receipts).toHaveLength(1);
    expect(cash.receipts[0]).toMatchObject({ id: 3, amount: 500_000, note: "qolgani ertaga", canDelete: false, byName: null });
  });

  it("blok yo'q yoki obyekt emas — `null`; sotuv jadvalida kuryer va jami uchun ham", () => {
    expect(mapOptionalCash(undefined)).toBeNull();
    expect(mapOptionalCash(12_000)).toBeNull();
    const sheet = mapSalesSheet({ couriers: [{ courier: { id: 31, full_name: "Bahtiyor" }, cash: BAHTIYOR_CASH }], totals: {} });
    expect(sheet.couriers[0]!.cash?.dueTotal).toBe(11_395_000);
    expect(sheet.totals.cash).toBeNull();
  });
});

describe("pul olish — xato matni", () => {
  it("`400` — maydon matni; `404` — sabab; `403` — amalga qarab; kodsiz `404` — endpoint yo'q", () => {
    const validation = new ApiError("x", 400, { code: "validation_error", fields: { amount: ["Summa noldan katta bo'lsin"] } }, "validation_error");
    expect(cashErrorText(validation, TEXTS)).toBe("Summa noldan katta bo'lsin");
    expect(cashErrorText(new ApiError("x", 404, { code: "courier_not_found" }, "courier_not_found"), TEXTS)).toBe("Kuryer topilmadi — jadvalni yangilang");
    expect(cashErrorText(new ApiError("x", 404, { code: "not_found" }, "not_found"), TEXTS)).toBe("Yozuv topilmadi — jadvalni yangilang");
    expect(cashErrorText(new ApiError("x", 403, { code: "forbidden" }, "forbidden"), TEXTS)).toBe("Bu kuryer sizga biriktirilmagan");
    expect(cashErrorText(new ApiError("x", 404, {}), TEXTS)).toBe("Bu amal serverda hali yoqilmagan");
    expect(cashErrorText("nimadir", TEXTS)).toBe("Pulni yozib bo'lmadi");
  });
});

describe("javob 140 §5 — xizmat qarzdan ayirilmaydi (28.11 dan)", () => {
  it("`fee_deducted` o'qiladi; kalit yo'q — null (taxmin qilinmaydi)", () => {
    expect(mapCourierCash({ fee_amount: 40000, fee_deducted: 0 })).toMatchObject({ feeAmount: 40000, feeDeducted: 0 });
    expect(mapCourierCash({ fee_amount: 40000, fee_deducted: 40000 }).feeDeducted).toBe(40000);
    expect(mapCourierCash({ fee_amount: 40000 }).feeDeducted).toBeNull();
  });
});

