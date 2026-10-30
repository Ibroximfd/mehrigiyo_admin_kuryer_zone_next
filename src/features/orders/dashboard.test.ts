import { describe, expect, it } from "vitest";

import {
  cancelReasonBreakdown,
  flowTimings,
  formatSpan,
  groupOrdersByPayment,
  totalBreakdownRow,
} from "./dashboard";
import { mapLogistOrder } from "./types";

function order(
  id: string,
  status: string,
  paymentMethod: string | null,
  payable: number,
  extra: Record<string, unknown> = {},
) {
  return mapLogistOrder({
    id,
    status,
    payment_method: paymentMethod,
    total_amount: payable,
    payable_amount: payable,
    ...extra,
  });
}

describe("groupOrdersByPayment", () => {
  const orders = [
    order("1", "confirmed", "cash", 100, { courier: null }),
    order("2", "confirmed", "manual", 200, { courier: { id: 4, full_name: "Jasur" } }),
    order("3", "shipping", "cash", 300),
    order("4", "cancelled", "cash", 1000),
    order("5", "delivered", "card", 50),
    order("6", "pending", "payme", 70),
    order("7", "pending", null, 30),
  ];

  it("to'lov turi bo'yicha status sonlari, kuryersiz va summa (atkazsiz)", () => {
    const rows = groupOrdersByPayment(orders);
    expect(rows.map((row) => row.label)).toEqual([
      "Payme",
      "Karta",
      "Naqd",
      "Ko'rsatilmagan",
    ]);

    const cash = rows.find((row) => row.key === "cash");
    expect(cash!.counts).toEqual({
      pending: 0,
      confirmed: 2,
      shipping: 1,
      delivered: 0,
      cancelled: 1,
    });
    expect(cash!.noCourier).toBe(1);
    expect(cash!.amount).toBe(600);
  });

  it("eski `card` yozuvi provayder kalitidan Click/Payme qatoriga tushadi", () => {
    const rows = groupOrdersByPayment([
      order("8", "confirmed", "card", 10, { payment_info: { provider: "click_merchant" } }),
      order("9", "confirmed", "click", 20),
    ]);
    expect(rows.map((row) => row.label)).toEqual(["Click"]);
    expect(rows[0].amount).toBe(30);
  });

  it("jami qatori barcha to'lov turlarini qo'shadi", () => {
    const total = totalBreakdownRow(groupOrdersByPayment(orders));
    expect(total.counts.confirmed).toBe(2);
    expect(total.counts.pending).toBe(2);
    expect(total.noCourier).toBe(1);
    expect(total.amount).toBe(750);
  });
});

describe("flowTimings", () => {
  it("o'rtacha vaqtlar va mijoz tasdig'i ulushi", () => {
    const orders = [
      mapLogistOrder({
        id: "a",
        confirmed_at: "2026-09-29T08:00:00Z",
        shipped_at: "2026-09-29T11:40:00Z",
        delivered_at: "2026-09-29T16:50:00Z",
        confirmation: { channel: "app_slide" },
      }),
      mapLogistOrder({ id: "b", confirmation: { channel: "phone" } }),
    ];
    const timings = flowTimings(orders);
    expect(timings.confirmToShipMinutes).toBe(220);
    expect(timings.shipToDeliverMinutes).toBe(310);
    expect(timings.clientConfirmShare).toBe(0.5);
    expect(formatSpan(220)).toBe("3 s 40 d");
    expect(formatSpan(null)).toBe("—");
  });
});

describe("cancelReasonBreakdown", () => {
  it("eng ko'p sabablar tepada", () => {
    const orders = [
      order("1", "cancelled", "cash", 1, { cancel: { reason: "no_answer" } }),
      order("2", "cancelled", "cash", 1, { cancel: { reason: "no_answer" } }),
      order("3", "cancelled", "cash", 1, { cancel: { reason: "wrong_address" } }),
      order("4", "delivered", "cash", 1),
    ];
    expect(cancelReasonBreakdown(orders)).toEqual([
      { label: "Javob bermadi", count: 2 },
      { label: "Manzil xato", count: 1 },
    ]);
  });
});
