import { describe, expect, it } from "vitest";

import { cashbackView, mapOrderCashback } from "./cashback";
import { mapLogistOrder } from "./types";

const fmt = (date: Date) => date.toISOString().slice(0, 10);

/** 2026-10-01 C §3 — hujjatdagi JSON misollari. */
describe("mapOrderCashback (§3.2, §3.4)", () => {
  it("credited — `display` OBYEKT, matn `display.display`; ball faqat `points`", () => {
    const order = mapLogistOrder({
      id: "9f1c0f6e-5b72-4a4e-9a3c-7d2b81e4c510",
      order_number: "ORD-20261001-0042",
      status: "delivered",
      total_amount: "255900.00",
      points_used: 0,
      points_discount: "0.00",
      payable_amount: "255900.00",
      cashback: {
        points: 25,
        display: { amount: 2500, currency: "UZS", display: "2 500 so'm", market: "UZ" },
        status: "credited",
        credited_at: "2026-10-03T14:02:52.004000+05:00",
        expires_at: "2026-11-01T00:00:00+05:00",
        awaiting_account: false,
        reversed_points: 0,
      },
    });
    const cashback = order.cashback!;
    expect(cashback.points).toBe(25);
    expect(cashback.displayText).toBe("2 500 so'm");
    expect(cashback.status).toBe("credited");
    expect(cashback.expiresAt).not.toBeNull();
    // Sarflangan ball (points_used) bilan aralashmaydi.
    expect(order.pointsUsed).toBe(0);
    expect(cashbackView(cashback, fmt)).toMatchObject({
      tone: "credited",
      title: "25 ball hisobga tushdi",
      money: "2 500 so'm",
    });
  });

  it("reversed — `reversed_points` ko'rsatiladi (points dan kichik — qolgani kechirilgan)", () => {
    const cashback = mapOrderCashback({
      points: 10,
      display: { amount: 1000, currency: "UZS", display: "1 000 so'm", market: "UZ" },
      status: "reversed",
      credited_at: "2026-10-03T14:02:52.004000+05:00",
      expires_at: null,
      awaiting_account: false,
      reversed_points: 2,
    });
    expect(cashback?.expiresAt).toBeNull();
    const view = cashbackView(cashback, fmt);
    expect(view?.title).toBe("Keshbek bekor qilindi: 2 ball qaytarib olindi");
    expect(view?.hint).toBe("10 ball yozilgan edi, qolgani kechirildi");
  });

  it("pending — va'da, kelasi zamonda; awaiting_account — raqamda saqlanmoqda", () => {
    const pending = mapOrderCashback({ points: 7, display: null, status: "pending", expires_at: null });
    expect(cashbackView(pending, fmt)?.title).toBe("Yetkazilganda 7 ball tushadi");
    expect(cashbackView(pending, fmt)?.money).toBeNull();
    const awaiting = mapOrderCashback({ points: 25, status: "credited", awaiting_account: true });
    expect(cashbackView(awaiting, fmt)?.tone).toBe("awaiting");
  });

  it("cancelled, 0 ball, blok yo'q yoki buzuq shakl — satr chizilmaydi, crash yo'q", () => {
    expect(cashbackView(mapOrderCashback({ points: 0, status: "cancelled" }), fmt)).toBeNull();
    expect(cashbackView(mapOrderCashback({ points: 0, status: "pending" }), fmt)).toBeNull();
    expect(mapOrderCashback(undefined)).toBeNull();
    expect(mapOrderCashback({ points: 5, status: "weird" })).toBeNull();
    // `display` satr bo'lib kelsa ham — obyekt kutiladi, satr chizilmaydi.
    expect(mapOrderCashback({ points: 5, status: "pending", display: "500" })?.displayText).toBeNull();
    // `status/` endpointida kalit yo'q (§3.1) — kartada ham yo'q.
    expect(mapLogistOrder({ id: "x", status: "delivered" }).cashback).toBeNull();
  });
});
