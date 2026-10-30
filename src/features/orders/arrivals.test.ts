import { describe, expect, it } from "vitest";

import { detectArrivals, snapshotBoard, unseenInColumn } from "./arrivals";
import { mapOrdersBoard } from "./board";
import { mapLogistOrder } from "./types";

function board(columns: Record<string, string[]>) {
  return mapOrdersBoard(
    {
      columns: Object.entries(columns).map(([status, idList]) => ({
        status,
        count: idList.length,
        orders: idList.map((id) => ({ id, order_number: id, status })),
      })),
    },
    mapLogistOrder,
  ).columns;
}

const never = () => false;
const always = () => true;

describe("detectArrivals", () => {
  it("oldingi holat yo'q (birinchi yuklash / filtr) — kelish yo'q", () => {
    expect(detectArrivals(null, board({ confirmed: ["a"] }), always)).toEqual([]);
  });

  it("doskada umuman bo'lmagan karta — kelish", () => {
    const before = snapshotBoard(board({ confirmed: ["a"] }));
    expect(detectArrivals(before, board({ confirmed: ["b", "a"] }), never)).toEqual([
      { id: "b", status: "confirmed" },
    ]);
  });

  it("ustundan ustunga ko'chish — faqat hali hech kim olmagan bo'lsa", () => {
    const before = snapshotBoard(board({ confirmed: ["a"], shipping: [] }));
    const after = board({ confirmed: [], shipping: ["a"] });
    expect(detectArrivals(before, after, never)).toEqual([]);
    expect(detectArrivals(before, after, always)).toEqual([{ id: "a", status: "shipping" }]);
  });

  it("o'zgarmagan karta — kelish emas", () => {
    const columns = board({ confirmed: ["a", "b"] });
    expect(detectArrivals(snapshotBoard(columns), columns, always)).toEqual([]);
  });
});

describe("unseenInColumn", () => {
  it("faqat hali shu ustunda turgan ko'rilmaganlar sanaladi", () => {
    const [confirmed] = board({ confirmed: ["a", "b"] });
    expect(confirmed && unseenInColumn(new Set(["a", "z"]), confirmed)).toBe(1);
  });
});
