import { describe, expect, it } from "vitest";

import { courierPaySummary } from "./pay";
import { mapLogistStatistics } from "./types";

describe("statistika: qaytarishlar va kuryer haqi", () => {
  it("yangi kalitlar o'qiladi, `reverts_by` ko'pi birinchi", () => {
    const stats = mapLogistStatistics({
      totals: { reverts: 3, stops: 4, courier_pay_rate: 15000, courier_pay: 60000 },
      reverts_by: [
        { actor_name: "Aziz", count: 1 },
        { actor_name: "Bobur", count: 2 },
        { actor_name: "Nol", count: 0 },
      ],
      couriers: [
        { id: 1, full_name: "Ali", stops: 3, pay: 45000 },
        { id: 2, full_name: "Vali", stops: 1 },
        { id: 3, full_name: "Bo'sh", stops: 0 },
      ],
    });
    expect(stats.totals.reverts).toBe(3);
    expect(stats.revertsBy.map((row) => row.actorName)).toEqual(["Bobur", "Aziz"]);

    const pay = courierPaySummary(stats)!;
    expect(pay).toMatchObject({ stops: 4, rate: 15000, total: 60000 });
    expect(pay.rows.map((row) => [row.fullName, row.pay])).toEqual([
      ["Ali", 45000],
      ["Vali", 15000],
    ]);
  });

  it("eski deploy — `null`, bo'lim chizilmaydi", () => {
    const stats = mapLogistStatistics({ totals: { delivered: 1 } });
    expect(stats.totals.reverts).toBeNull();
    expect(stats.revertsBy).toEqual([]);
    expect(courierPaySummary(stats)).toBeNull();
    expect(courierPaySummary(null)).toBeNull();
  });
});

describe("manzil soni: qo'lda tuzatish", () => {
  it("`stops_manual` o'qiladi; yetkazgan, lekin manzili 0 kuryer ham qoladi", () => {
    const stats = mapLogistStatistics({
      totals: { stops: 3, stops_manual: 1, courier_pay_rate: 10000 },
      couriers: [
        { id: 1, full_name: "Ali", delivered: 2, stops: 3, stops_manual: 1 },
        { id: 2, full_name: "Vali", delivered: 1, stops: 0 },
        { id: 3, full_name: "Bo'sh", delivered: 0, stops: 0 },
      ],
    });
    expect(stats.totals.stopsManual).toBe(1);
    const pay = courierPaySummary(stats)!;
    expect(pay.rows.map((row) => [row.fullName, row.stops, row.manual])).toEqual([
      ["Ali", 3, 1],
      ["Vali", 0, 0],
    ]);
  });
});
