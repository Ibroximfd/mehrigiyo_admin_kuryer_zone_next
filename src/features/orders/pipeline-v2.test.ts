import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api-client";
import { openReconnectingSocket } from "@/lib/reconnecting-socket";
import { parseSearchQuery, scoreDigits } from "@/lib/search";

import { mapOrdersBoard } from "./board";
import { changedEditFields, editMoneyLocks, orderToEditValues } from "./edit-order";
import { isMoneyGuardError, orderErrorMessage } from "./error-hints";
import { mapLogistOrder, paymentView } from "./types";

/**
 * `FLUTTER_ORDER_PIPELINE_V2` (2026-09-30) bilan moslik: to'lov o'qi,
 * 8 status, telefonda `+` yo'q, xato shakllari, pul qorovullari.
 */

describe("to'lov o'qi (§2.2, §8)", () => {
  it("payment.is_paid yuqori darajadagi eski is_paid dan ustun", () => {
    const order = mapLogistOrder({
      id: "a",
      is_paid: false,
      payment: { status: "paid", is_paid: true },
    });
    expect(order.isPaid).toBe(true);
  });

  it("bekor + to'langan → 'Qaytarilishi kerak', 'Qaytarildi' emas (§8.3)", () => {
    const order = mapLogistOrder({
      id: "a",
      status: "cancelled",
      payment: { method: "click", status: "paid", is_paid: true },
    });
    const view = paymentView(order);
    expect(view.state).toBe("refund_due");
    expect(view.label).toBe("Qaytarilishi kerak");
    // Kuryer ro'yxatiga "pul olinadi" bo'lib tushmasin.
    expect(view.needsAttention).toBe(false);
  });

  it("naqd cod_pending — to'lanmagan emas, 'olganda'", () => {
    const order = mapLogistOrder({
      id: "a",
      status: "confirmed",
      payment: { method: "cash", status: "cod_pending", is_paid: false },
    });
    expect(paymentView(order).state).toBe("cod");
  });
});

describe("8 status (§2.1, §2.5)", () => {
  it("confirming/paid/preparing ustunlari kanonik ustunga qo'shiladi", () => {
    const board = mapOrdersBoard(
      {
        columns: [
          { status: "confirmed", count: 1, total_payable_amount: 100, orders: [{ id: "a", status: "confirmed" }] },
          { status: "paid", count: 2, total_payable_amount: 50, orders: [{ id: "b", status: "paid" }] },
          { status: "preparing", count: 1, orders: [] },
          { status: "confirming", count: 3, orders: [{ id: "c", status: "confirming" }] },
        ],
      },
      mapLogistOrder,
    );
    const statuses = board.columns.map((column) => column.status);
    expect(statuses).not.toContain("paid");
    expect(statuses).not.toContain("confirming");
    const confirmed = board.columns.find((column) => column.status === "confirmed");
    expect(confirmed?.count).toBe(4);
    expect(confirmed?.totalAmount).toBe(150);
    expect(confirmed?.orders.map((order) => order.id)).toEqual(["a", "b"]);
    // `confirming` → `pending`; logist doskasida bu ustun yo'q (2026-10-29).
    expect(statuses).not.toContain("pending");
  });

  it("noma'lum status alohida ustun bo'lib qoladi", () => {
    const board = mapOrdersBoard(
      { columns: [{ status: "returned", count: 1, orders: [] }] },
      mapLogistOrder,
    );
    expect(board.columns.at(-1)?.status).toBe("returned");
  });
});

describe("telefonda + yo'q (§9.1)", () => {
  it("bir raqamning ikki yozuvi takrorlanmaydi", () => {
    const order = mapLogistOrder({
      id: "a",
      client: { phone: "998901234567", phones: [{ number: "+998 90 123 45 67" }, { number: "998935005050" }] },
    });
    expect(order.client.phones).toEqual(["998901234567", "998935005050"]);
  });

  it("qidiruv + li va + siz raqamni bir xil topadi", () => {
    const query = parseSearchQuery("90 123")!;
    expect(scoreDigits("+998901234567", query)).toBe(scoreDigits("998901234567", query));
  });

  it("tahrirda faqat yozuv shakli o'zgarsa — o'zgarish emas", () => {
    const order = mapLogistOrder({ id: "a", client: { phone: "998901234567", ordered_for_phone: "998901234567" }, items: [{ id: "1", quantity: 1 }] });
    const initial = orderToEditValues(order);
    expect(changedEditFields(initial, { ...initial, orderedForPhone: "+998 90 123 45 67" })).not.toContain(
      "orderedForPhone",
    );
  });
});

describe("xato kodlari (§7)", () => {
  it("status_transition_forbidden: 400 — noma'lum qiymat, 403 — matritsa", () => {
    const unknown = new ApiError("x", 400, {}, "status_transition_forbidden");
    const matrix = new ApiError("x", 403, {}, "status_transition_forbidden");
    expect(orderErrorMessage(unknown, "f")).toContain("tanimadi");
    expect(orderErrorMessage(matrix, "f")).toContain("ruxsat etilmagan");
  });

  it("tanilmagan kod — serverning o'z matni", () => {
    const error = new ApiError("Server matni", 400, { code: "brand_new", detail: "Server matni" }, "brand_new");
    expect(orderErrorMessage(error, "f")).toBe("Server matni");
  });

  it("pul qorovullari alohida belgilanadi", () => {
    expect(isMoneyGuardError(new ApiError("x", 409, {}, "paid_order_amount_locked"))).toBe(true);
    expect(isMoneyGuardError(new ApiError("x", 409, {}, "online_payment_in_progress"))).toBe(true);
    expect(isMoneyGuardError(new ApiError("x", 400, {}, "invalid_phone"))).toBe(false);
  });
});

describe("tahrirdagi pul qulflari (§7.5, §8.2)", () => {
  it("onlayn to'langan — summa ham, usul ham qulf", () => {
    expect(
      editMoneyLocks({ paymentStatus: "paid", isPaid: true, paymentMethod: "click" }),
    ).toEqual({ amountLocked: true, methodLocked: true });
  });

  it("onlayn to'lov boshlangan — faqat usul qulf", () => {
    expect(
      editMoneyLocks({ paymentStatus: "online_pending", isPaid: false, paymentMethod: "payme" }),
    ).toEqual({ amountLocked: false, methodLocked: true });
  });

  it("naqd — qulf yo'q", () => {
    expect(
      editMoneyLocks({ paymentStatus: "cod_pending", isPaid: false, paymentMethod: "cash" }),
    ).toEqual({ amountLocked: false, methodLocked: false });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WS jonlilik tekshiruvi (§5.6)
// ─────────────────────────────────────────────────────────────────────────────

class FakeSocket {
  static OPEN = 1;
  static instances: FakeSocket[] = [];
  readyState = 0;
  sent: string[] = [];
  closed = false;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public url: string) {
    FakeSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.closed = true;
  }
  open() {
    this.readyState = FakeSocket.OPEN;
    this.onopen?.();
  }
  receive(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

describe("reconnecting socket heartbeat", () => {
  it("pong onEvent ga tushmaydi, javobsiz ulanish tashlanib qayta ulanadi", () => {
    vi.useFakeTimers();
    vi.stubGlobal("WebSocket", FakeSocket);
    FakeSocket.instances = [];
    const events: unknown[] = [];

    const socket = openReconnectingSocket({
      url: () => "ws://test",
      onEvent: (event) => events.push(event),
      heartbeat: {
        intervalMs: 1000,
        maxMissed: 2,
        ping: { action: "ping" },
        isPong: (event) => event.type === "pong",
      },
    });

    const first = FakeSocket.instances[0]!;
    first.open();
    vi.advanceTimersByTime(1000);
    expect(first.sent).toEqual([JSON.stringify({ action: "ping" })]);
    first.receive({ type: "pong" });
    first.receive({ type: "order_created" });
    expect(events).toEqual([{ type: "order_created" }]);

    // Endi server jim: 2 ta javobsiz ping + keyingi tik — ulanish tashlanadi.
    vi.advanceTimersByTime(3000);
    expect(first.closed).toBe(true);
    vi.advanceTimersByTime(4000);
    expect(FakeSocket.instances.length).toBe(2);

    socket.close();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
});
