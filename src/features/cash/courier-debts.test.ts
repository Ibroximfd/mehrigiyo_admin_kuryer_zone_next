import { describe, expect, it } from "vitest";

import { clampCodRange, codWindow, courierDebt, debtTotals, mapServerCourierMoney, sortDebts } from "./courier-debts";
import { awaitingFilial, mapChiefCash, mapCourierCod } from "./types";

/** Prod javobi (2026-11-13, kuryer 7): uch kun, hech biri qabul qilinmagan, e'lon yo'q. */
const live = {
  date_from: "2026-10-15",
  date_to: "2026-11-14",
  days: [
    { date: "2026-10-31", orders: [{ id: "a", order_number: "O1", amount: 241000 }], computed_total: 241000, amount: 241000, settled: false, handover: null },
    { date: "2026-11-06", orders: [{ id: "b", order_number: "O2", amount: 700000 }], computed_total: 700000, amount: 700000, settled: false, handover: null },
    { date: "2026-11-13", orders: [{ id: "c", order_number: "O3", amount: 599600 }], computed_total: 599600, amount: 599600, settled: false, handover: null },
  ],
  total: 1540600,
  outstanding_total: 1540600,
  outstanding_days: 3,
  settled: true,
};

const today = new Date(2026, 10, 14, 11, 0);
const ibroxim = { id: 7, fullName: "Ibroxim" };

describe("kuryerlardagi pul — eski server (kunlar bo'yicha yig'iladi)", () => {
  it("e'lon qilinmagan kunlar ham hisobga kiradi (Kassa «0» ko'rsatgan holat)", () => {
    const debt = courierDebt(ibroxim, mapCourierCod(live), today);
    expect(debt).toMatchObject({
      total: 1_540_600,
      openDays: 3,
      oldestDay: "2026-10-31",
      declaredAmount: 0,
      // 31.10 → 14.11: topshirish kuni 01.11 — 13 kun kechikkan
      daysLate: 13,
      // 3 kundan eskisi: 31.10 va 06.11
      overdueAmount: 941_000,
      mismatch: null,
      complete: false,
    });
  });

  it("qabul qilingan kun hisobga kirmaydi; server jami bilan farq belgilanadi", () => {
    const partly = { ...live, days: live.days.map((day, index) => (index === 0 ? { ...day, settled: true } : day)) };
    const debt = courierDebt(ibroxim, mapCourierCod(partly), today);
    expect(debt.mismatch).toEqual({ server: 1_540_600, days: 1_299_600 });
    expect(debt.overdueAmount).toBe(700_000);
  });

  it("`?open=1` javobi — cheklovsiz, kamomad bilan", () => {
    const open = mapCourierCod({ ...live, open: true, shortage_debt: 50_000 });
    expect(open.open).toBe(true);
    expect(courierDebt(ibroxim, open, today)).toMatchObject({ complete: true, shortageDebt: 50_000 });
  });

  it("qarzi yo'q kuryer chiqmaydi, muddati o'tgan summasi kattasi birinchi", () => {
    const empty = courierDebt({ id: 18, fullName: "Azimov" }, mapCourierCod({ days: [], outstanding_total: 0 }), today);
    const fresh = courierDebt(
      { id: 9, fullName: "Ali" },
      mapCourierCod({ days: [{ date: "2026-11-14", orders: [], amount: 5_000_000, settled: false }], outstanding_total: 5_000_000 }),
      today,
    );
    const late = courierDebt(ibroxim, mapCourierCod(live), today);
    expect(sortDebts([empty, fresh, late]).map((debt) => debt.courier.id)).toEqual([7, 9]);
    expect(debtTotals([empty, fresh, late])).toEqual({ total: 6_540_600, overdue: 941_000, declared: 0, shortage: 0 });
  });
});

/** 59-javob B1 shakli (test server, 2026-11-14). */
const serverCash = {
  date_from: "2026-10-15",
  date_to: "2026-11-14",
  collected_from_couriers: 0,
  outstanding: 0,
  outstanding_days: [],
  by_filial: [],
  handovers: [{ id: 3, date: "2026-11-10", amount: 500000, status: "confirmed" }],
  couriers: [
    {
      courier: { id: 7, full_name: "Ibroxim" },
      outstanding: 941000,
      outstanding_days: 2,
      oldest_day: "2026-10-31",
      declared_amount: 0,
      overdue_amount: 941000,
      shortage_debt: 0,
    },
  ],
  couriers_totals: { outstanding: 941000, overdue_amount: 941000, declared_amount: 0, shortage_debt: 0, outstanding_days: 2 },
  outstanding_all_time: { amount: 120000, days: ["2026-09-01"] },
  handovers_pending: [{ id: 1, date: "2026-09-02", amount: 120000, status: "pending" }],
};

describe("kuryerlardagi pul — yangi server (`chief/cash.couriers`)", () => {
  it("blok o'qiladi, server jamisi ishlatiladi", () => {
    const money = mapServerCourierMoney(serverCash, today);
    expect(money?.totals).toEqual({ total: 941_000, overdue: 941_000, declared: 0, shortage: 0 });
    expect(money?.debts[0]).toMatchObject({ courier: ibroxim, total: 941_000, openDays: 2, daysLate: 13, complete: true });
  });

  it("eski server — blok yo'q, `null` (zaxira yo'li)", () => {
    expect(mapServerCourierMoney({ ...serverCash, couriers: undefined }, today)).toBeNull();
  });

  it("filial kutayotgan pul — davrdan eski topshiriq ham; eski serverda davr ichidan", () => {
    const cash = mapChiefCash(serverCash);
    expect(cash.outstandingAllTime).toEqual({ amount: 120_000, days: ["2026-09-01"] });
    expect(awaitingFilial(cash)).toBe(120_000);
    const old = mapChiefCash({ ...serverCash, handovers_pending: undefined, handovers: [{ id: 4, date: "2026-11-12", amount: 70000, status: "pending" }] });
    expect(old.handoversPending).toBeNull();
    expect(awaitingFilial(old)).toBe(70_000);
  });
});

describe("naqd hisobi oralig'i (tarix)", () => {
  it("31 kun, oshsa boshlanish suriladi", () => {
    expect(codWindow(today)).toEqual({ from: "2026-10-15", to: "2026-11-14" });
    expect(clampCodRange("2026-10-01", "2026-11-14")).toEqual({ from: "2026-10-15", to: "2026-11-14", clamped: true });
    expect(clampCodRange("2026-11-01", "2026-11-14")).toEqual({ from: "2026-11-01", to: "2026-11-14", clamped: false });
  });
});
