import { describe, expect, it } from "vitest";

import { mapCourierDocumentResult } from "./api";

describe("hujjat javobi — juft tuzatish kalitlari (hujjat 125 §A)", () => {
  it("`store_effect`, `jami_delta` va minus qoldiq o'qiladi", () => {
    const result = mapCourierDocumentResult({
      id: 9012,
      number: "TZ-20261124-004",
      type: "adjustment",
      store_effect: [
        { item_id: 34, qty: -30 },
        { item_id: 6, qty: 8 },
      ],
      jami_delta: 0,
      found: false,
      negative_stock: [{ location_id: 3, item_id: 34, on_hand: -2 }],
    });
    expect(result.storeEffect).toEqual([
      { itemId: 34, qty: -30 },
      { itemId: 6, qty: 8 },
    ]);
    expect(result.jamiDelta).toBe(0);
    expect(result.negative).toEqual([{ locationId: 3, itemId: 34, onHand: -2 }]);
  });

  it("eski server (kalitlar yo'q) — `null`: natija matni taxmin qilinmaydi", () => {
    expect(mapCourierDocumentResult({ id: 1, negative_stock: [] })).toEqual({ negative: [], storeEffect: null, jamiDelta: null });
    expect(mapCourierDocumentResult(null)).toEqual({ negative: [], storeEffect: null, jamiDelta: null });
  });

  it("kuryersiz hujjat: `store_effect: []`, `jami_delta: null`", () => {
    expect(mapCourierDocumentResult({ store_effect: [], jami_delta: null })).toMatchObject({ storeEffect: [], jamiDelta: null });
  });

  it("kuryerning ombori topilmagan — jami o'zgargan (cheklov 10)", () => {
    expect(mapCourierDocumentResult({ store_effect: [], jami_delta: 30 }).jamiDelta).toBe(30);
  });
});
