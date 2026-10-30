import { describe, expect, it } from "vitest";

import { mapOrdersBoard, moveOrderInBoard } from "./board";
import { mapLogistOrder } from "./types";

function order(id: string, status: string, total: number, payable: number) {
  return mapLogistOrder({
    id,
    order_number: `DA-${id}`,
    status,
    total_amount: total,
    payable_amount: payable,
  });
}

describe("mapOrdersBoard", () => {
  it("4 ustunni LOGIST_STATUSES tartibida quradi, `pending` tashlanadi", () => {
    const board = mapOrdersBoard(
      {
        columns: [
          { status: "pending", count: 5, orders: [] },
          { status: "shipping", count: 2, orders: [] },
        ],
      },
      mapLogistOrder,
    );
    expect(board.columns.map((column) => column.status)).toEqual([
      "confirmed",
      "shipping",
      "delivered",
      "cancelled",
    ]);
    expect(board.columns[1]?.count).toBe(2);
    expect(board.columns[0]?.count).toBe(0);
  });

  it("summa: total_payable_amount ustun, bo'lmasa total_amount, bo'lmasa null", () => {
    const board = mapOrdersBoard(
      {
        columns: [
          {
            status: "confirmed",
            total_amount: 1000,
            total_payable_amount: 900,
            orders: [],
          },
          { status: "shipping", total_amount: 500, orders: [] },
          { status: "delivered", orders: [] },
        ],
      },
      mapLogistOrder,
    );
    const amount = (status: string) =>
      board.columns.find((column) => column.status === status)?.totalAmount;
    expect(amount("confirmed")).toBe(900);
    expect(amount("shipping")).toBe(500);
    expect(amount("delivered")).toBeNull();
  });
});

describe("moveOrderInBoard", () => {
  const board = mapOrdersBoard(
    {
      columns: [
        {
          status: "confirmed",
          count: 1,
          total_payable_amount: 550000,
          orders: [],
        },
        { status: "shipping", count: 0, total_payable_amount: 0, orders: [] },
      ],
    },
    mapLogistOrder,
  );
  // Buyurtmani qo'lda qo'shamiz — mol summasi 600 000, to'lanadigani 550 000.
  const seeded = {
    columns: board.columns.map((column) =>
      column.status === "confirmed"
        ? { ...column, orders: [order("1", "confirmed", 600000, 550000)] }
        : column,
    ),
  };

  const OPTS = { ordering: "-status_changed_at", at: new Date("2026-10-01T09:22:48+05:00") };

  it("hisoblagich va TO'LANADIGAN summa birga siljiydi", () => {
    const next = moveOrderInBoard(seeded, "1", "shipping", OPTS);
    expect(next).not.toBeNull();
    const column = (status: string) =>
      next!.columns.find((item) => item.status === status)!;

    expect(column("confirmed").count).toBe(0);
    expect(column("confirmed").totalAmount).toBe(0);
    expect(column("confirmed").orders).toHaveLength(0);

    expect(column("shipping").count).toBe(1);
    expect(column("shipping").totalAmount).toBe(550000);
    expect(column("shipping").orders[0]?.status).toBe("shipping");
    expect(column("shipping").orders[0]?.statusDisplay).toBe("Yo'lga chiqarilgan");
    // Optimistik: statusga kirgan vaqt — berilgan lahza (server aks-sadosigacha).
    expect(column("shipping").orders[0]?.statusChangedAt?.toISOString()).toBe(
      "2026-10-01T04:22:48.000Z",
    );
  });

  it("`-status_changed_at`: ko'chirilgan karta qadalganlardan keyin, eskilardan oldin", () => {
    const pinned = mapLogistOrder({
      id: "p",
      status: "shipping",
      created_at: "2026-09-01T08:00:00+05:00",
      status_changed_at: "2026-09-02T08:00:00+05:00",
      pinned_at: "2026-09-30T08:00:00+05:00",
    });
    const older = mapLogistOrder({
      id: "z",
      status: "shipping",
      created_at: "2026-09-30T11:04:17+05:00",
      status_changed_at: "2026-10-01T08:00:00+05:00",
    });
    const withShipping = {
      columns: seeded.columns.map((column) =>
        column.status === "shipping" ? { ...column, count: 2, orders: [pinned, older] } : column,
      ),
    };
    const next = moveOrderInBoard(withShipping, "1", "shipping", OPTS)!;
    const ids = next.columns.find((column) => column.status === "shipping")!.orders.map((o) => o.id);
    expect(ids).toEqual(["p", "1", "z"]);
  });

  it("karta yuklangan qismdan pastga tushsa — ko'rinmaydi, faqat son o'zgaradi (\"N more\")", () => {
    const newer = mapLogistOrder({
      id: "n",
      status: "shipping",
      status_changed_at: "2026-10-01T10:00:00+05:00",
    });
    const withHidden = {
      columns: seeded.columns.map((column) =>
        column.status === "shipping" ? { ...column, count: 5, orders: [newer] } : column,
      ),
    };
    const next = moveOrderInBoard(withHidden, "1", "shipping", OPTS)!;
    const shipping = next.columns.find((column) => column.status === "shipping")!;
    expect(shipping.orders.map((o) => o.id)).toEqual(["n"]);
    expect(shipping.count).toBe(6);
  });

  it("summa `null` bo'lsa null qoladi (backend bermagan)", () => {
    const next = moveOrderInBoard(seeded, "1", "delivered", OPTS);
    expect(
      next!.columns.find((item) => item.status === "delivered")?.totalAmount,
    ).toBeNull();
  });

  it("o'sha ustunga — doskaning o'zi; yo'q buyurtma — null", () => {
    expect(moveOrderInBoard(seeded, "1", "confirmed", OPTS)).toBe(seeded);
    expect(moveOrderInBoard(seeded, "404", "shipping", OPTS)).toBeNull();
    expect(moveOrderInBoard(seeded, "1", "unknown", OPTS)).toBeNull();
  });
});
