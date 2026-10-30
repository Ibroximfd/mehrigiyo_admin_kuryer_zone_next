import { describe, expect, it } from "vitest";

import { serializeOrderPatch, withoutPaymentKeys } from "./order-patch";
import {
  confirmSwitchesToCash,
  unexpectedPaymentChange,
} from "./payment-guard";
import { mapLogistOrder } from "./types";
import { undoPatch } from "./permissions";

/**
 * Status o'tishi to'lovga tegmaydi (`00` 2-qaror): frontend status PATCH
 * tanasida hech qachon pul kaliti bo'lmaydi.
 */
const PAYMENT_KEYS = [
  "payment_method",
  "payment_status",
  "payment_type",
  "is_paid",
];

function expectNoPayment(json: Record<string, unknown>) {
  for (const key of PAYMENT_KEYS) expect(json).not.toHaveProperty(key);
}

describe("status PATCH — pul kalitlarisiz", () => {
  it("har bir status yo'li faqat status oilasini yuboradi", () => {
    const patches = [
      { status: "confirmed", confirmReason: "client_no_app", note: "tel" },
      { status: "shipping", courierId: 4 },
      { status: "delivered" },
      { status: "cancelled", cancelReason: "no_answer", cancelNote: "" },
      { status: "confirmed", revertReason: "mistake", note: null },
    ];
    for (const patch of patches) expectNoPayment(serializeOrderPatch(patch));
  });

  it("tasdiq sababi `confirm_reason` bo'lib ketadi", () => {
    expect(
      serializeOrderPatch({
        status: "confirmed",
        confirmReason: "client_confirmed_by_phone",
        note: "Aziz bilan",
      }),
    ).toEqual({
      status: "confirmed",
      confirm_reason: "client_confirmed_by_phone",
      note: "Aziz bilan",
    });
  });

  it("status bilan birga pul kaliti tushib qolsa — olib tashlanadi", () => {
    const json = serializeOrderPatch({
      status: "shipping",
      paymentMethod: "cash",
    });
    expect(json).toHaveProperty("payment_method", "cash");
    expect(withoutPaymentKeys(json)).toEqual({ status: "shipping" });
  });

  it("statussiz tahrir PATCH to'lov usulini saqlaydi", () => {
    const json = serializeOrderPatch({ paymentMethod: "payme" });
    expect(withoutPaymentKeys(json)).toEqual({ payment_method: "payme" });
  });

  it("undo ham pulga tegmaydi", () => {
    for (const [from, to] of [
      ["confirmed", "shipping"],
      ["shipping", "delivered"],
      ["shipping", "cancelled"],
    ] as const) {
      const patch = undoPatch(from, to);
      expect(patch).not.toBeNull();
      expectNoPayment(serializeOrderPatch(patch!));
    }
  });
});

describe("unexpectedPaymentChange — server usulni almashtirsa", () => {
  it("Click → Naqd aniqlanadi", () => {
    expect(
      unexpectedPaymentChange(
        { paymentMethod: "click" },
        { paymentMethod: "cash" },
      ),
    ).toEqual({
      from: "Click",
      to: "Naqd",
    });
  });

  it("o'zgarmasa yoki oldingisi noma'lum bo'lsa — jim", () => {
    expect(
      unexpectedPaymentChange(
        { paymentMethod: "cash" },
        { paymentMethod: " CASH " },
      ),
    ).toBeNull();
    expect(
      unexpectedPaymentChange(
        { paymentMethod: null },
        { paymentMethod: "cash" },
      ),
    ).toBeNull();
    expect(unexpectedPaymentChange(null, { paymentMethod: "cash" })).toBeNull();
  });

  it("usul yo'qolsa ham aytiladi", () => {
    expect(
      unexpectedPaymentChange(
        { paymentMethod: "payme" },
        { paymentMethod: null },
      ),
    ).toEqual({
      from: "Payme",
      to: "yo'q",
    });
  });
});

describe("to'lamay qaytgan onlayn buyurtma tasdiqlansa — naqdga o'tadi", () => {
  const base = {
    id: "o1",
    order_number: "ORD-1",
    client: { full_name: "A", phone: "998901234567" },
  };

  it("pending + Payme + to'lanmagan → naqdga o'tishi kutiladi", () => {
    const order = mapLogistOrder({
      ...base,
      status: "pending",
      payment_method: "payme",
      payment_status: "awaiting_online_payment",
      is_paid: false,
    });
    expect(confirmSwitchesToCash(order)).toBe(true);
  });

  it("to'langan onlayn, naqd yoki boshqa status → o'zgarmaydi", () => {
    expect(
      confirmSwitchesToCash(
        mapLogistOrder({
          ...base,
          status: "pending",
          payment_method: "click",
          payment_status: "paid",
          is_paid: true,
        }),
      ),
    ).toBe(false);
    expect(
      confirmSwitchesToCash(
        mapLogistOrder({ ...base, status: "pending", payment_method: "cash" }),
      ),
    ).toBe(false);
    expect(
      confirmSwitchesToCash(
        mapLogistOrder({
          ...base,
          status: "confirmed",
          payment_method: "payme",
          is_paid: false,
        }),
      ),
    ).toBe(false);
  });

  it("pending → confirmed da Payme → Naqd ogohlantirish bermaydi, boshqa o'tishda beradi", () => {
    const before = mapLogistOrder({
      ...base,
      status: "pending",
      payment_method: "payme",
      payment_status: "awaiting_online_payment",
      is_paid: false,
    });
    const after = mapLogistOrder({
      ...base,
      status: "confirmed",
      payment_method: "cash",
      is_paid: false,
    });
    expect(unexpectedPaymentChange(before, after)).toBeNull();
    const shipBefore = mapLogistOrder({
      ...base,
      status: "confirmed",
      payment_method: "payme",
      is_paid: false,
    });
    const shipAfter = mapLogistOrder({
      ...base,
      status: "shipping",
      payment_method: "cash",
      is_paid: false,
    });
    expect(unexpectedPaymentChange(shipBefore, shipAfter)).not.toBeNull();
  });
});
