import { describe, expect, it } from "vitest";

import { serializeOrderPatch } from "@/features/orders/order-patch";
import { mapLogistOrder } from "@/features/orders/types";
import { escapeTarget } from "@/lib/escape-back";

import {
  chiefCan,
  chiefForRegion,
  mapAutoAssignOutcome,
  mapChiefCash,
  mapChiefHandovers,
  mapChiefMe,
  mapChiefOptions,
  mapChiefStats,
  outstandingPeriod,
} from "./types";

describe("bosh kuryer — logist tomoni (§C 1)", () => {
  it("zakazda `chief_courier`; patchda `chief_courier_id` (null ham)", () => {
    const order = mapLogistOrder({ id: "a", status: "shipping", courier: null, chief_courier: { id: 17, full_name: "Bosh Farg'ona" } });
    expect(order.chiefCourier).toMatchObject({ id: 17, fullName: "Bosh Farg'ona" });
    expect(mapLogistOrder({ id: "b", status: "confirmed" }).chiefCourier).toBeNull();
    expect(serializeOrderPatch({ status: "shipping", chiefCourierId: 17 })).toEqual({ status: "shipping", chief_courier_id: 17 });
    expect(serializeOrderPatch({ chiefCourierId: null })).toEqual({ chief_courier_id: null });
  });

  it("ro'yxat va viloyatga mos bosh kuryer: aniq viloyat, keyin «hammasi»", () => {
    const chiefs = mapChiefOptions({
      results: [
        { id: 1, full_name: "Hammasi", regions: null, couriers: 2 },
        { id: 17, full_name: "Farg'ona", regions: ["fargona"], filial: { id: 2, name: "Qo'qon" }, couriers: 5 },
        { nope: true },
      ],
      count: 2,
    });
    expect(chiefs.map((chief) => chief.id)).toEqual([1, 17]);
    expect(chiefs[0]!.regions).toBeNull();
    expect(chiefForRegion(chiefs, "fargona")?.id).toBe(17);
    expect(chiefForRegion(chiefs, "andijon")?.id).toBe(1);
    expect(chiefForRegion(chiefs, null)).toBeNull();
    expect(chiefForRegion(chiefs.slice(1), "andijon")).toBeNull();
  });

  it("bosh kuryerdan topshiriqlar", () => {
    const { results, count } = mapChiefHandovers({
      results: [
        { id: 3, chief: { id: 17, full_name: "B" }, date: "2026-10-30", amount: 300000, expected_amount: 310000, confirmed_amount: null, status: "pending" },
        { id: 4, status: "disputed", amount: 100, shortage: 20 },
      ],
      count: 2,
    });
    expect(count).toBe(2);
    expect(results[0]).toMatchObject({ id: 3, amount: 300000, expectedAmount: 310000, status: "pending" });
    expect(results[1]!.status).toBe("disputed");
  });
});

describe("bosh kuryer bo'limi (§C 2)", () => {
  it("men: ruxsatlar va qisqacha", () => {
    const me = mapChiefMe({
      seat: { id: 17, full_name: "B", username: "chief" },
      regions: ["fargona"],
      permissions: { "orders.dispatch": true, "cash.accept": false },
      summary: { incoming: 4, active: 12, couriers: 5, couriers_on_shift: 3, finalized_today: 9 },
    });
    expect(me.summary).toEqual({ incoming: 4, active: 12, couriers: 5, couriersOnShift: 3, finalizedToday: 9 });
    expect(chiefCan(me, "orders.dispatch")).toBe(true);
    expect(chiefCan(me, "cash.accept")).toBe(false);
    expect(chiefCan(me, "zones.manage")).toBe(false);
    expect(chiefCan(null, "orders.dispatch")).toBe(false);
  });

  it("avto taqsimlash natijasi", () => {
    expect(
      mapAutoAssignOutcome({ assigned: [{ id: "a", courier_id: 31 }], skipped: [{ id: "b", reason: "no_courier" }] }),
    ).toEqual({ assigned: [{ id: "a", courierId: 31 }], skipped: [{ id: "b", reason: "no_courier" }] });
  });

  it("kassa: topshirilmagan kunlar davri", () => {
    const cash = mapChiefCash({
      date_from: "2026-10-01",
      date_to: "2026-10-30",
      collected_from_couriers: 1250000,
      outstanding: 300000,
      outstanding_days: ["2026-10-29", "2026-10-28"],
      days: [
        { date: "2026-10-28", collected: 150000, status: "none" },
        { date: "2026-10-27", collected: 200000, status: "confirmed" },
        { date: "2026-10-26", collected: 1, status: "weird" },
      ],
      handovers: [{ id: 1, amount: 5, status: "pending", period_from: "2026-10-20", period_to: "2026-10-21" }],
    });
    expect(outstandingPeriod(cash)).toEqual({ from: "2026-10-28", to: "2026-10-29" });
    expect(cash.days.map((row) => row.status)).toEqual(["none", "confirmed", "none"]);
    expect(cash.handovers[0]).toMatchObject({ periodFrom: "2026-10-20", periodTo: "2026-10-21" });
    expect(outstandingPeriod({ outstandingDays: [] })).toBeNull();
  });

  it("analitika: qatorlar va jami", () => {
    const stats = mapChiefStats({
      couriers: [
        { courier: { id: 31, full_name: "K-01", is_active: true, on_shift: true }, delivered: 12, refused: 1, awaiting: 2, addresses: 13, addresses_manual: 1, pay_rate: 15000, pay: 195000 },
      ],
      totals: { delivered: 12, refused: 1, awaiting: 2, addresses: 13, addresses_manual: 1, pay: 195000 },
    });
    expect(stats.couriers[0]).toMatchObject({ addresses: 13, addressesManual: 1, payRate: 15000, pay: 195000 });
    expect(stats.couriers[0]!.courier.onShift).toBe(true);
    expect(stats.totals.pay).toBe(195000);
  });

  it("Esc — ichki sahifalardan «Zakazlar» ga", () => {
    expect(escapeTarget("/chief/cash", "?from=2026-10-01")).toMatch(/^\/chief/);
    expect(escapeTarget("/chief", "")).toBeNull();
  });
});
