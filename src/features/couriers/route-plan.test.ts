import { describe, expect, it } from "vitest";

import {
  asRoutePlanReason,
  mapRoutePlan,
  routePlanReasonLabel,
  routePlanSummary,
} from "./route-plan";
import { mapCourier } from "./types";

/** Backend javobi 2026-10-16 (B3): kuryer kartasidagi `route_plan`. */
const ROUTE_PLAN = {
  order_ids: ["o1", "o2", "o3", 4],
  planned_from: { lat: 40.38, lng: 71.78, at: "2026-10-16T05:32:00Z" },
  total_distance_m: 12480,
  eta_s: 2700,
  reason: "auto",
  source: "road",
  created_at: "2026-10-16T05:32:00Z",
};

describe("mapRoutePlan", () => {
  it("to'liq reja o'qiladi", () => {
    const plan = mapRoutePlan(ROUTE_PLAN);
    expect(plan).toMatchObject({
      orderIds: ["o1", "o2", "o3", "4"],
      plannedFrom: { lat: 40.38, lng: 71.78, at: new Date("2026-10-16T05:32:00Z") },
      totalDistanceM: 12480,
      etaS: 2700,
      reason: "auto",
      source: "road",
      createdAt: new Date("2026-10-16T05:32:00Z"),
    });
  });

  it("null / yo'q / bo'sh obyekt — reja yo'q", () => {
    expect(mapRoutePlan(null)).toBeNull();
    expect(mapRoutePlan(undefined)).toBeNull();
    expect(mapRoutePlan({})).toBeNull();
    expect(mapRoutePlan("plan")).toBeNull();
  });

  it("qisman reja: koordinatasiz boshlanish, manfiy masofa, notanish sabab", () => {
    const plan = mapRoutePlan({
      order_ids: ["o1"],
      planned_from: { lat: null, lng: 71 },
      total_distance_m: -5,
      reason: "something_else",
      source: "satellite",
    });
    expect(plan).toMatchObject({
      orderIds: ["o1"],
      plannedFrom: null,
      totalDistanceM: null,
      etaS: null,
      reason: null,
      source: null,
    });
  });

  it("kuryer mapperi: eski javobda `routePlan` null, yangisida bor", () => {
    const legacy = mapCourier({ id: 1, full_name: "Aziz", phone: "998" });
    expect(legacy.routePlan).toBeNull();
    const fresh = mapCourier({ id: 1, full_name: "Aziz", phone: "998", route_plan: ROUTE_PLAN });
    expect(fresh.routePlan?.orderIds).toHaveLength(4);
  });

  it("sabab sinonimlari", () => {
    expect(asRoutePlanReason("AUTO")).toBe("auto");
    expect(asRoutePlanReason("manual")).toBe("manual");
    expect(asRoutePlanReason("re-optimize")).toBe("reroute");
    expect(asRoutePlanReason("replan")).toBe("reroute");
    expect(asRoutePlanReason("")).toBeNull();
    expect(asRoutePlanReason(null)).toBeNull();
  });
});

describe("routePlanSummary", () => {
  it("to'liq qator: masofa · manzil · vaqt · manba · soat", () => {
    const plan = mapRoutePlan(ROUTE_PLAN)!;
    const summary = routePlanSummary(plan)!;
    expect(summary.startsWith("~12 km · 4 manzil · ~45 daq · yo'l bo'yicha · ")).toBe(true);
    // Soat mahalliy vaqt zonasida — faqat shakli tekshiriladi.
    expect(summary).toMatch(/ · \d{2}:\d{2}$/);
    expect(routePlanReasonLabel(plan)).toBe("avto");
  });

  it("bo'lmagan bo'laklar tushib qoladi", () => {
    const plan = mapRoutePlan({ order_ids: ["a", "b"], source: "estimate" })!;
    expect(routePlanSummary(plan)).toBe("2 manzil · taxminiy");
    expect(routePlanReasonLabel(plan)).toBeNull();
  });

  it("faqat `created_at` bo'lsa ham qator bor; eta 0 — vaqt chiqmaydi", () => {
    const plan = mapRoutePlan({ created_at: "2026-10-16T05:32:00Z", eta_s: 0 })!;
    expect(routePlanSummary(plan)).toMatch(/^\d{2}:\d{2}$/);
  });
});
