import { describe, expect, it } from "vitest";

import { mapChiefCash, mapChiefHandover } from "./types";

describe("kassa — yetkazilgan pul to'lov turi bo'yicha (hujjat 79 §6)", () => {
  it("blok bor — uch qism son sifatida o'qiladi (satr ham)", () => {
    const cash = mapChiefCash({ delivered_by_method: { cash: 15_600_000, card: "4250000", online: 2_000_000 } });
    expect(cash.deliveredByMethod).toEqual({ cash: 15_600_000, card: 4_250_000, online: 2_000_000 });
  });

  it("blok yo'q yoki obyekt emas — `null` (eski server, ekranda chizilmaydi)", () => {
    expect(mapChiefCash({ outstanding: 0 }).deliveredByMethod).toBeNull();
    expect(mapChiefCash({ delivered_by_method: null }).deliveredByMethod).toBeNull();
    expect(mapChiefCash({ delivered_by_method: 21_850_000 }).deliveredByMethod).toBeNull();
  });
});

describe("kassa — 80-javob qo'shimchalari", () => {
  it("yetkazilgan zakazlar soni va jami; eski serverda `null`", () => {
    const cash = mapChiefCash({ delivered_orders: 26, delivered_amount: 21_850_000 });
    expect([cash.deliveredOrders, cash.deliveredAmount]).toEqual([26, 21_850_000]);
    expect([mapChiefCash({}).deliveredOrders, mapChiefCash({}).deliveredAmount]).toEqual([null, null]);
  });

  it("topshiriq qatorida naqd/karta — ajratilmagan bo'lsa `null`", () => {
    expect(mapChiefHandover({ id: 1, amount: 1000, cash: 700, card: 300 })).toMatchObject({ cash: 700, card: 300 });
    expect(mapChiefHandover({ id: 2, amount: 1000 })).toMatchObject({ cash: null, card: null });
  });
});
