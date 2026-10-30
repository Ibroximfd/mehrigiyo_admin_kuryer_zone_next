import { describe, expect, it } from "vitest";

import { mapOrdersBoard } from "./board";
import { boardTransition } from "./permissions";
import { REVIEW_COLUMN, boardColumnOf, isInReview, reportedDelivered, reviewLabel } from "./review";
import { withReviewColumn } from "./review-board";
import { mapLogistOrder } from "./types";

function order(id: string, status: string, extra: Record<string, unknown> = {}) {
  return mapLogistOrder({ id, order_number: `DA-${id}`, status, payable_amount: 100, ...extra });
}

describe("«Jarayonda» (backend 2026-10-30 §A)", () => {
  it("maydonlar o'qiladi; noma'lum qiymat — none", () => {
    const o = order("a", "delivered", {
      courier_outcome: "delivered",
      outcome_source: "courier",
      courier_addresses: 2,
      courier_addresses_manual: true,
      finalized_at: "2026-10-30T10:00:00Z",
    });
    expect(o.review).toMatchObject({ outcome: "delivered", source: "courier", courierAddresses: 2, courierAddressesManual: true });
    expect(o.review.finalizedAt).toBeInstanceOf(Date);
    expect(order("b", "shipping", { courier_outcome: "xyz" }).review.outcome).toBe("none");
  });

  it("qoida: shipping + natija, operator atkazi pending/confirmed da, eski backend bosqichi", () => {
    expect(isInReview(order("a", "shipping", { courier_outcome: "delivered" }))).toBe(true);
    expect(isInReview(order("b", "shipping"))).toBe(false);
    expect(isInReview(order("c", "pending", { courier_outcome: "refused", outcome_source: "operator" }))).toBe(true);
    expect(isInReview(order("d", "confirmed", { courier_outcome: "delivered" }))).toBe(false);
    // Natija maydoni yo'q, lekin kuryer bosqichi «yetkazildi».
    const legacy = order("e", "shipping", { delivery_stage: "delivered" });
    expect(isInReview(legacy)).toBe(true);
    expect(reportedDelivered(legacy)).toBe(true);
    // Yakunlangan — jarayon emas.
    expect(isInReview(order("f", "delivered", { courier_outcome: "delivered" }))).toBe(false);
  });

  it("yozuvlar va ustun kaliti", () => {
    expect(reviewLabel(order("a", "shipping", { courier_outcome: "delivered" }))).toBe("Kuryer: yetkazdim");
    expect(reviewLabel(order("b", "shipping", { courier_outcome: "refused", outcome_source: "courier" }))).toBe("Kuryer: qaytaraman");
    expect(reviewLabel(order("c", "pending", { courier_outcome: "refused", outcome_source: "operator" }))).toBe("Operator: atkaz");
    expect(boardColumnOf(order("a", "shipping", { courier_outcome: "refused" }))).toBe(REVIEW_COLUMN);
    expect(boardColumnOf(order("b", "shipping"))).toBe("shipping");
  });

  it("operator atkazi — logist atkazga yakunlaydi; boshqa yo'l matritsadan", () => {
    const refused = order("a", "pending", { courier_outcome: "refused", outcome_source: "operator" });
    expect(boardTransition(refused, "cancelled")).toBe("cancel");
    expect(boardTransition(refused, "confirmed")).toBeNull();
    expect(boardTransition(order("b", "pending"), "cancelled")).toBeNull();
    expect(boardTransition(order("c", "shipping", { courier_outcome: "delivered" }), "delivered")).toBe("deliver");
  });
});

describe("doska: «Jarayonda» ustuni", () => {
  it("«Yo'lda» dan keyin; son va summa ko'chganlar bilan; pending dan faqat operator atkazi", () => {
    const board = mapOrdersBoard(
      {
        columns: [
          {
            status: "pending",
            count: 2,
            orders: [
              { id: "p1", status: "pending", courier_outcome: "refused", outcome_source: "operator", payable_amount: 50 },
              { id: "p2", status: "pending", payable_amount: 50 },
            ],
          },
          {
            status: "shipping",
            count: 5,
            total_payable_amount: 500,
            orders: [
              { id: "s1", status: "shipping", payable_amount: 100, courier_outcome: "delivered", outcome_requested_at: "2026-10-30T09:00:00Z" },
              { id: "s2", status: "shipping", payable_amount: 100 },
              { id: "s3", status: "shipping", payable_amount: 100, courier_outcome: "refused", outcome_requested_at: "2026-10-30T08:00:00Z" },
            ],
          },
        ],
      },
      mapLogistOrder,
    );
    const columns = withReviewColumn(board);
    expect(columns.map((column) => column.status)).toEqual(["confirmed", "shipping", REVIEW_COLUMN, "delivered", "cancelled"]);
    const shipping = columns[1]!;
    expect(shipping.orders.map((o) => o.id)).toEqual(["s2"]);
    expect(shipping.count).toBe(3);
    expect(shipping.totalAmount).toBe(300);
    const review = columns[2]!;
    expect(review.label).toBe("Jarayonda");
    // Eng eski so'rov tepada, vaqtsizi oxirida; pending dan faqat atkaz so'ralgani.
    expect(review.orders.map((o) => o.id)).toEqual(["s3", "s1", "p1"]);
    expect(review.count).toBe(3);
  });
});

describe("doska: serverdagi `review` ustuni (backend 2026-10-30 §1)", () => {
  it("server ustuni ishlatiladi; WS dan keyin natijasi o'zgargan karta o'z ustuniga o'tadi", () => {
    const board = mapOrdersBoard(
      {
        columns: [
          { status: "shipping", count: 10, total_payable_amount: 1000, orders: [
            // WS yamog'i: kuryer hozirgina «yetkazdim» bosdi.
            { id: "s1", status: "shipping", payable_amount: 100, courier_outcome: "delivered", outcome_requested_at: "2026-10-30T10:00:00Z" },
            { id: "s2", status: "shipping", payable_amount: 100 },
          ] },
          { status: "review", label: "Jarayonda", count: 7, total_payable_amount: 700, orders: [
            { id: "r1", status: "shipping", payable_amount: 100, courier_outcome: "refused", outcome_requested_at: "2026-10-30T08:00:00Z" },
            // Logist orqaga qaytardi — natija tozalandi, endi «Tasdiqlangan».
            { id: "r2", status: "confirmed", payable_amount: 100 },
          ] },
        ],
      },
      mapLogistOrder,
    );
    const columns = withReviewColumn(board);
    expect(columns.map((column) => column.status)).toEqual(["confirmed", "shipping", REVIEW_COLUMN, "delivered", "cancelled"]);
    const [confirmed, shipping, review] = columns;
    expect(review!.orders.map((o) => o.id)).toEqual(["r1", "s1"]);
    expect(review!.count).toBe(7);
    expect(review!.totalAmount).toBe(700);
    expect(shipping!.count).toBe(9);
    expect(confirmed!.orders.map((o) => o.id)).toEqual(["r2"]);
    expect(confirmed!.count).toBe(1);
  });
});

