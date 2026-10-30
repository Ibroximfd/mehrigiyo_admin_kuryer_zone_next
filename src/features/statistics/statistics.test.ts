import { describe, expect, it } from "vitest";

import { niceScale } from "./scale";
import { successRate, summarizeStatistics } from "./summary";
import { singleStatDay } from "./filter";
import { mapLogistStatistics } from "./types";

describe("niceScale", () => {
  it("rounds the axis up to clean steps", () => {
    expect(niceScale(37)).toEqual({ max: 40, ticks: [0, 10, 20, 30, 40] });
  });

  it("never produces fractional steps for counts", () => {
    expect(niceScale(2).ticks.every(Number.isInteger)).toBe(true);
  });

  it("draws an axis for an all-zero series", () => {
    expect(niceScale(0)).toEqual({ max: 1, ticks: [0, 1] });
  });

  it("handles money scale", () => {
    expect(niceScale(3_400_000).max).toBe(4_000_000);
  });
});

/** 2026-10-01 C §14 — hujjatdagi javob. */
const DOC = {
  totals: {
    delivered: 42,
    delivered_amount: "18400000.00",
    cancelled: 6,
    attempts: 9,
    avg_delivery_minutes: 318,
    cod_total: "9120000.00",
    orders: 71,
    in_progress: 23,
    payable_amount: "28650000.00",
    delivered_payable_amount: "17930000.00",
  },
  daily: [
    { date: "2026-09-30", delivered: 7, amount: "3100000.00", orders: 11, cancelled: 1 },
    { date: "2026-10-01", delivered: 5, amount: "2240000.00", orders: 14, cancelled: 0 },
  ],
  couriers: [
    {
      id: 7,
      full_name: "Bekzod Tursunov",
      delivered: 19,
      avg_minutes: 284,
      cod_total: "4380000.00",
      assigned: 26,
      attempts: 3,
    },
    {
      id: 11,
      full_name: "Sardor Eshonqulov",
      delivered: 0,
      avg_minutes: null,
      cod_total: "0",
      assigned: 4,
      attempts: 2,
    },
  ],
};

describe("mapLogistStatistics / summarizeStatistics (§14)", () => {
  const stats = mapLogistStatistics(DOC);
  const summary = summarizeStatistics({ stats });

  it("yangi kalitlar serverdan — doska ustunlari qo'shilmaydi", () => {
    expect(summary.orders).toBe(71);
    expect(summary.inProgress).toBe(23);
    expect(summary.payableAmount).toBe(28_650_000);
  });

  it("(a) `orders ≠ delivered + cancelled + in_progress` — biri boshqasidan chiqarilmaydi", () => {
    expect(summary.delivered).toBe(42);
    expect(summary.cancelled).toBe(6);
    // Uch sana maydoni — uch to'plam. Hujjat misolida yig'indi tasodifan 71,
    // lekin har biri o'z kalitidan: qiymatlar ajralganda ham hech biri
    // boshqasidan qayta hisoblanmaydi.
    const apart = summarizeStatistics({
      stats: mapLogistStatistics({
        ...DOC,
        totals: { ...DOC.totals, orders: 10, in_progress: 4, delivered: 42, cancelled: 6 },
      }),
    });
    expect(apart.orders).toBe(10);
    expect(apart.inProgress).toBe(4);
    expect(apart.delivered).toBe(42);
    expect(apart.cancelled).toBe(6);
    // Ulush (`N % buyurtmalardan`) hisoblanmaydi.
    expect(summary).not.toHaveProperty("deliveredRate");
    expect(summary).not.toHaveProperty("cancelledRate");
  });

  it("(b) jami kunliklardan hisoblanmaydi: `sum(daily.cancelled)` ≤ `totals.cancelled`", () => {
    const dailyCancelled = stats.daily.reduce((sum, day) => sum + (day.cancelled ?? 0), 0);
    expect(dailyCancelled).toBe(1);
    expect(summary.cancelled).toBe(6);
    expect(stats.daily.map((day) => day.orders)).toEqual([11, 14]);
  });

  it("pul ikki xil: kassa tushumi ≠ tovar aylanmasi (§14.2)", () => {
    expect(summary.cashIn).toBe(17_930_000);
    expect(summary.goodsTurnover).toBe(18_400_000);
  });

  it("kuryerlar: server tartibi, muvaffaqiyat = delivered / assigned; ishlamayotgan kuryer ham bor", () => {
    expect(summary.couriers.map((row) => row.fullName)).toEqual([
      "Bekzod Tursunov",
      "Sardor Eshonqulov",
    ]);
    expect(summary.couriers[0]).toMatchObject({ assigned: 26, attempts: 3, successRate: 73 });
    expect(summary.couriers[1]).toMatchObject({ successRate: 0, avgMinutes: null });
    expect(summary.activeCouriers).toBe(1);
  });

  it("`assigned: 0` yoki noma'lum — foiz `null` (NaN/Infinity emas)", () => {
    expect(successRate(3, 0)).toBeNull();
    expect(successRate(0, null)).toBeNull();
    expect(successRate(5, 4)).toBe(100);
  });

  it("eski deploy (yangi kalitsiz) — `null` (\"—\"), nol emas; `previous` kutilmaydi", () => {
    const old = mapLogistStatistics({ totals: { delivered: 3, delivered_amount: "100" } });
    const oldSummary = summarizeStatistics({ stats: old });
    expect(oldSummary.orders).toBeNull();
    expect(oldSummary.inProgress).toBeNull();
    expect(oldSummary.cashIn).toBeNull();
    expect(oldSummary.goodsTurnover).toBe(100);
    expect(old).not.toHaveProperty("previous");
  });

  it("statistika yo'q — bugungi kuryer kesimi zaxira, jami ma'lum emas", () => {
    const empty = summarizeStatistics({
      stats: null,
      fallbackCouriers: [
        { id: 1, fullName: "B", delivered: 3, codTotal: 100 },
        { id: 2, fullName: "A", delivered: 9, codTotal: 600 },
      ],
    });
    expect(empty.orders).toBeNull();
    expect(empty.delivered).toBeNull();
    expect(empty.couriers.map((row) => row.fullName)).toEqual(["A", "B"]);
    expect(empty.perCourier).toBe(6);
  });
});

describe("singleStatDay — qo'lda tuzatish qaysi kunga", () => {
  const now = new Date(2026, 9, 29, 10, 0);
  it("bugun / kecha / aniq kun / bir kunlik oraliq", () => {
    expect(singleStatDay({ period: "today", date: null, dateFrom: null, dateTo: null }, now)).toBe("2026-10-29");
    expect(singleStatDay({ period: "yesterday", date: null, dateFrom: null, dateTo: null }, now)).toBe("2026-10-28");
    expect(singleStatDay({ period: "week", date: "2026-10-20", dateFrom: null, dateTo: null }, now)).toBe("2026-10-20");
    expect(singleStatDay({ period: "week", date: null, dateFrom: "2026-10-21", dateTo: "2026-10-21" }, now)).toBe("2026-10-21");
  });
  it("bir necha kun — `null`", () => {
    expect(singleStatDay({ period: "week", date: null, dateFrom: null, dateTo: null }, now)).toBeNull();
    expect(singleStatDay({ period: "today", date: null, dateFrom: "2026-10-20", dateTo: "2026-10-22" }, now)).toBeNull();
  });
});
