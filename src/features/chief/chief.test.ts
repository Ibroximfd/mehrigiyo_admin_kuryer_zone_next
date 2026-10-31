import { describe, expect, it } from "vitest";

import { mapZone } from "@/features/zones/types";
import type { Zone } from "@/features/zones/types";

import { mapCourier } from "@/features/couriers/types";
import { mapLogistOrder } from "@/features/orders/types";

import { pickCourier, planFromPreview, readyRows } from "./auto-plan";
import { chiefCan, mapAutoAssignPreview, mapAutoAssignResult, mapChiefMe, mapChiefOrderDetail } from "./types";
import { districtMoves } from "./zones";
import { addressChangedBy } from "./order-view";
import { formatMoneyInput, parseMoneyInput } from "@/lib/format";

describe("bosh kuryer bo'limi (§C 2)", () => {
  it("men: ruxsatlar va qisqacha", () => {
    const me = mapChiefMe({
      seat: { id: 17, full_name: "B", username: "chief" },
      regions: ["fargona"],
      permissions: { "orders.dispatch": true, "cash.accept": false },
      summary: { incoming: 4, active: 12, couriers: 5, couriers_on_shift: 3, finalized_today: 9 },
    });
    expect(me.seat).toEqual({ id: 17, fullName: "B", username: "chief" });
    expect(me.summary).toEqual({ incoming: 4, active: 12, couriers: 5, couriersOnShift: 3, finalizedToday: 9 });
    expect(chiefCan(me, "orders.dispatch")).toBe(true);
    expect(chiefCan(me, "cash.accept")).toBe(false);
    expect(chiefCan(me, "zones.manage")).toBe(false);
    expect(chiefCan(null, "orders.dispatch")).toBe(false);
    // `view.analytics` backendda hali yo'q — kalit kelmaguncha ochiq, `false` kelsa yopiladi.
    expect(chiefCan(me, "view.analytics")).toBe(true);
    expect(chiefCan({ ...me, permissions: { "view.analytics": false } }, "view.analytics")).toBe(false);
  });
});

describe("zonalar: tuman boshqa zonaga o'tadi (§5b)", () => {
  const zone = (id: number, codes: string[]): Zone =>
    mapZone({ id, region: "fargona", name: `Z${id}`, is_active: true, district_codes: codes })!;

  it("olingan tuman eski zonasidan chiqariladi, o'zgarmagan zona tegilmaydi", () => {
    const zones = [zone(1, ["a", "b"]), zone(2, ["c", "d"]), zone(3, ["e"])];
    expect(districtMoves(zones, 1, ["a", "b", "c"])).toEqual([{ zoneId: 2, districtCodes: ["d"] }]);
  });

  it("yangi zona (`null`) uchun ham ishlaydi", () => {
    const zones = [zone(1, ["a", "b"])];
    expect(districtMoves(zones, null, ["b"])).toEqual([{ zoneId: 1, districtCodes: ["a"] }]);
    expect(districtMoves(zones, null, ["x"])).toEqual([]);
  });
});

describe("avto-taqsimlash rejasi — server preview (V5)", () => {
  const couriers = [
    mapCourier({ id: 10, full_name: "Smenada", is_active: true, zone_ids: [1], on_shift: true, load: 3 }),
    mapCourier({ id: 11, full_name: "Bo'sh", is_active: true, zone_ids: [1], on_shift: true, load: 0 }),
    mapCourier({ id: 12, full_name: "Bloklangan", is_active: false, zone_ids: [1], on_shift: true }),
  ];
  const order = (id: string) => mapLogistOrder({ id, status: "shipping" });
  const preview = mapAutoAssignPreview({
    rows: [
      { order_id: "x", zone: { id: 1, name: "Markaz" }, courier: { id: 10, full_name: "Smenada" }, reason: "ok" },
      { order_id: "y", zone: null, courier: null, reason: "no_zone" },
      { order_id: "z", zone: { id: 2, name: "Qo'qon" }, courier: null, reason: "no_courier_on_shift" },
      { order_id: "yo'q", zone: null, courier: null, reason: "boshqa" },
    ],
  });

  it("reja zakaz kartasi bilan qo'shiladi; noma'lum sabab — `ok`, rejadan tashqari zakaz tushmaydi", () => {
    const plan = planFromPreview(preview, [order("x"), order("y"), order("z")]);
    expect(plan.map((row) => [row.order.id, row.zoneId, row.courierId, row.reason])).toEqual([
      ["x", 1, 10, "ok"],
      ["y", null, null, "no_zone"],
      ["z", 2, null, "no_courier_on_shift"],
    ]);
    expect(preview[3]!.reason).toBe("ok");
  });

  it("chiqarilgan va kuryersiz qatorlar yuborilmaydi; qo'lda zona — eng kam yuklamali faol kuryer", () => {
    const plan = planFromPreview(preview, [order("x"), order("y")]);
    expect(readyRows(plan).map((row) => row.order.id)).toEqual(["x"]);
    expect(readyRows([{ ...plan[0]!, excluded: true }])).toEqual([]);
    expect(pickCourier(couriers, 1)?.id).toBe(11);
    expect(pickCourier(couriers, null)).toBeNull();
  });

  it("apply natijasi", () => {
    expect(mapAutoAssignResult({ assigned: [{ id: "x", courier_id: 10 }], failed: [{ id: "y", code: "courier_not_yours" }] })).toEqual({
      assigned: ["x"],
      failed: [{ id: "y", code: "courier_not_yours" }],
    });
  });

  it("detal: zakaz va tarix", () => {
    const detail = mapChiefOrderDetail({ id: "x", status: "shipping", history: [{ at: "2026-10-30T10:00:00Z", action: "created" }] });
    expect(detail.order.id).toBe("x");
    expect(detail.history[0]).toMatchObject({ action: "created", actor: null });
  });
});

describe("zakaz kartasi: mahsulotlar qatori", () => {
  it("ikkitasi nomi bilan, qolgani «+N»", async () => {
    const { orderProductsLine } = await import("./order-view");
    const order = mapLogistOrder({
      id: "x",
      items: [
        { product_name: "A", quantity: 2 },
        { product_name: "B", quantity: 1 },
        { product_name: "C", quantity: 1 },
        { product_name: "D", quantity: 3 },
      ],
    });
    expect(orderProductsLine(order)).toBe("A × 2, B × 1 +2");
    expect(orderProductsLine(mapLogistOrder({ id: "y", items: [] }))).toBe("");
  });
});

describe("chief/me — v2 shakli ham o'qiladi", () => {
  it("`seat_id` va `full_name` yuqori darajada, `regions: null`", () => {
    const me = mapChiefMe({ seat_id: 88, full_name: "Vodiy", regions: null, filial: { id: 1, name: "Qo'qon" } });
    expect(me.seat).toMatchObject({ id: 88, fullName: "Vodiy" });
    expect(me.regions).toEqual([]);
    expect(me.filial).toEqual({ id: 1, name: "Qo'qon" });
  });
});

describe("manzil kim tomonidan o'zgargani", () => {
  it("kod → o'qiladigan nom, bo'sh bo'lsa null", () => {
    const order = (who: unknown) => mapLogistOrder({ id: 1, order_number: "N-1", status: "shipping", delivery: { address_changed_by: who } });
    expect(addressChangedBy(order("chief"))).toBe("bosh kuryer");
    expect(addressChangedBy(order("courier"))).toBe("kuryer");
    expect(addressChangedBy(order(null))).toBeNull();
  });
});

describe("summa maydoni", () => {
  it("bo'shliq bilan guruhlanadi va qayta o'qiladi", () => {
    expect(formatMoneyInput("1250000")).toBe("1 250 000");
    expect(formatMoneyInput("00a12 5")).toBe("125");
    expect(formatMoneyInput(980000.4)).toBe("980 000");
    expect(parseMoneyInput("1 250 000")).toBe(1250000);
    expect(Number.isNaN(parseMoneyInput(""))).toBe(true);
  });
});
