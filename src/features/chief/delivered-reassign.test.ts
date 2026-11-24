import { describe, expect, it } from "vitest";

import { mapCourierRef } from "@/features/orders/types";
import { ApiError } from "@/lib/api-client";

import { canAttachAfterDelivery, reassignErrorText } from "./delivered-reassign";
import { historyLabel } from "./types";

describe("yetkazilgan zakazga kuryerni keyin biriktirish (hujjat 125 C)", () => {
  const real = mapCourierRef({ id: 17, full_name: "Aziz" });
  const virtual = mapCourierRef({ id: 21, full_name: "Bosh kuryer o'rni", is_virtual: true });

  it("yetkazilgan va kuryersiz — biriktirsa bo'ladi", () => {
    expect(canAttachAfterDelivery({ status: "delivered", courier: null })).toBe(true);
  });

  it("bosh kuryerning yashirin o'rni — haqiqiy kuryer emas, biriktirsa bo'ladi", () => {
    expect(virtual?.isVirtual).toBe(true);
    expect(canAttachAfterDelivery({ status: "delivered", courier: virtual })).toBe(true);
  });

  it("haqiqiy kuryerda yopilgan — tugma yo'q (faqat logist o'zgartiradi)", () => {
    expect(real?.isVirtual).toBeUndefined();
    expect(canAttachAfterDelivery({ status: "delivered", courier: real })).toBe(false);
  });

  it("yetkazilmagan zakaz — bu oqim emas (oddiy «Kuryerga berish»)", () => {
    for (const status of ["shipping", "confirmed", "cancelled", "pending"]) {
      expect(canAttachAfterDelivery({ status, courier: null })).toBe(false);
    }
  });

  it("server belgini bermasa: o'z kuryerlari ro'yxatida yo'q o'rin — yashirin o'rin (prod, 2026-11-24)", () => {
    const own = new Set([17, 18]);
    const hiddenSeat = mapCourierRef({ id: 8, full_name: "Bosh kuryer" });
    expect(canAttachAfterDelivery({ status: "delivered", courier: hiddenSeat }, own)).toBe(true);
    // O'z kuryerida yopilgan — haqiqiy kuryer, tugma yo'q.
    expect(canAttachAfterDelivery({ status: "delivered", courier: real }, own)).toBe(false);
    // Ro'yxat hali kelmagan — xulosa chiqarilmaydi.
    expect(canAttachAfterDelivery({ status: "delivered", courier: hiddenSeat }, null)).toBe(false);
    // Yetkazilmagan zakazda ro'yxat ahamiyatsiz.
    expect(canAttachAfterDelivery({ status: "shipping", courier: hiddenSeat }, own)).toBe(false);
  });

  it("`is_virtual` faqat aniq `true` bo'lsa o'qiladi", () => {
    expect(mapCourierRef({ id: 1, full_name: "A", is_virtual: false })?.isVirtual).toBeUndefined();
    expect(mapCourierRef({ id: 1, full_name: "A", is_virtual: "true" })?.isVirtual).toBeUndefined();
  });
});

describe("biriktirish xatolari — tushunarli matn", () => {
  const text = (code: string, status: number) => reassignErrorText(new ApiError("server", status, {}, code), "fallback");

  it("haqiqiy kuryerda yopilgan zakaz — faqat logist", () => {
    expect(text("delivered_courier_locked", 409)).toBe("Kuryerni faqat logist o'zgartira oladi");
  });

  it("sabab talab qilinsa — logistga yo'naltiradi", () => {
    expect(text("edit_reason_required", 400)).toContain("logist");
  });

  it("kuryer xatolari va notanish kod", () => {
    expect(text("courier_not_yours", 403)).toBe("Bu kuryer sizning jamoangizda emas");
    expect(text("courier_inactive", 403)).toContain("bloklangan");
    expect(text("something_else", 400)).toBe("server");
    expect(reassignErrorText(new Error("tarmoq"), "fallback")).toBe("tarmoq");
    expect(reassignErrorText(null, "fallback")).toBe("fallback");
  });
});

describe("tarix yorlig'i", () => {
  it("yetkazilgandan keyingi biriktirish — prefiksli kod bilan ham", () => {
    expect(historyLabel("courier_reassigned_after_delivery")).toBe("Kuryer yetkazilgandan keyin biriktirildi");
    expect(historyLabel("order.courier_reassigned_after_delivery")).toBe("Kuryer yetkazilgandan keyin biriktirildi");
  });

  it("mavjud kodlar o'zgarmadi; notanish kod — o'z holicha", () => {
    expect(historyLabel("delivered")).toBe("Yetkazildi");
    expect(historyLabel("order.urgent_set")).toBe("Shoshilinch qilindi");
    expect(historyLabel("mystery")).toBe("mystery");
  });
});
