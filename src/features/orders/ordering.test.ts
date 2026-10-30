import { describe, expect, it } from "vitest";

import { mapOrdersBoard } from "./board";
import { boardOrdering, insertOrderInBoard, mergeOrderPages } from "./ordering";
import { mapLogistOrder } from "./types";

/**
 * Tartib serverda (2026-10-01 C §8): mijoz javobni qayta saralamaydi,
 * faqat bitta kartani tartibdagi o'rniga qo'yadi.
 */
function order(id: string, createdAt: string | null, status = "confirmed", payable = 100) {
  return mapLogistOrder({
    id,
    order_number: `DA-${id}`,
    status,
    total_amount: payable,
    payable_amount: payable,
    created_at: createdAt,
  });
}

const ids = (list: { id: string }[]) => list.map((item) => item.id);

describe("mergeOrderPages", () => {
  it("sahifalar orasidagi takror (offset siljishi) bir marta qoladi", () => {
    const page1 = [order("5", "2026-10-01T15:00:00Z"), order("4", "2026-10-01T14:00:00Z")];
    const page2 = [order("4", "2026-10-01T14:00:00Z"), order("3", "2026-10-01T13:00:00Z")];
    expect(ids(mergeOrderPages([{ orders: page1 }, { orders: page2 }]))).toEqual(["5", "4", "3"]);
  });

  it("server tartibi QAYTA SARALANMAYDI (masalan `?ordering=delivery_date`)", () => {
    const page = [order("1", "2026-10-01T08:00:00Z"), order("2", "2026-10-01T09:00:00Z")];
    expect(ids(mergeOrderPages([{ orders: page }]))).toEqual(["1", "2"]);
  });
});

describe("doska", () => {
  const raw = (status: string, list: unknown[]) => ({ status, count: list.length, orders: list });
  const json = (id: string, createdAt: string, status: string) => ({
    id,
    order_number: `DA-${id}`,
    status,
    created_at: createdAt,
    total_amount: 100,
    payable_amount: 100,
  });

  it("mapOrdersBoard ustun ichidagi server tartibini saqlaydi", () => {
    const board = mapOrdersBoard(
      {
        columns: [
          raw("confirmed", [
            json("1", "2026-10-01T08:00:00Z", "confirmed"),
            json("2", "2026-10-01T09:00:00Z", "confirmed"),
          ]),
        ],
      },
      mapLogistOrder,
    );
    expect(ids(board.columns.find((column) => column.status === "confirmed")!.orders)).toEqual(["1", "2"]);
  });

  it("insertOrderInBoard — `ordering` bo'yicha o'rniga, son va summa bilan; takror e'tiborsiz", () => {
    const board = mapOrdersBoard(
      { columns: [{ ...raw("confirmed", [json("1", "2026-10-01T08:00:00Z", "confirmed")]), total_payable_amount: 100 }] },
      mapLogistOrder,
    );
    const fresh = order("2", "2026-10-01T12:00:00Z", "confirmed", 250);
    const next = insertOrderInBoard(board, fresh, "-created_at");
    const confirmed = next?.columns.find((column) => column.status === "confirmed");
    expect(ids(confirmed?.orders ?? [])).toEqual(["2", "1"]);
    expect(confirmed?.count).toBe(2);
    expect(confirmed?.totalAmount).toBe(350);
    expect(next && insertOrderInBoard(next, fresh, "-created_at")).toBeNull();
  });

  it("ustun to'liq yuklanmagan bo'lsa va karta oxiriga tushsa — faqat son (\"N more\" ichida)", () => {
    const board = mapOrdersBoard(
      { columns: [{ status: "confirmed", count: 7, orders: [json("1", "2026-10-01T08:00:00Z", "confirmed")] }] },
      mapLogistOrder,
    );
    const older = order("0", "2026-09-01T08:00:00Z");
    const confirmed = insertOrderInBoard(board, older, "-created_at")!.columns.find(
      (column) => column.status === "confirmed",
    )!;
    expect(ids(confirmed.orders)).toEqual(["1"]);
    expect(confirmed.count).toBe(8);
  });

  it("boardOrdering — kesh filtridan; yo'q bo'lsa sukut", () => {
    expect(boardOrdering({ ordering: "delivery_date" })).toBe("delivery_date");
    expect(boardOrdering({})).toBe("-created_at");
    expect(boardOrdering(undefined)).toBe("-created_at");
  });
});
