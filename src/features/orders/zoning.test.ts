import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildOrderFilters, mapBulkResult, zoneMismatchCount, zonesParam } from "./api";
import { mapOrdersBoard } from "./board";
import type { OrdersBoard } from "./board";
import { mergeOrderSnapshot } from "./order-snapshot";
import { serializeOrderPatch } from "./order-patch";
import { applyOrderEvent, boardAcceptsNewOrder } from "./realtime";
import { serverFilterParams, toggleZoneFilter, zoneFilterValue } from "./server-filters";
import { mapTimelineEvent } from "./timeline";
import { mapLogistOrder } from "./types";
import type { LogistOrder, LogistOrderDetail } from "./types";
import {
  AUTO_HOLD_HINT,
  EMPTY_ZONING,
  actionableSuggestion,
  confidencePercent,
  districtGuessText,
  mapOrderZoning,
  mergeZoningSnapshot,
  suggestionMissingText,
  suggestionText,
  suggestionTitle,
  zoneState,
  zoningLine,
} from "./zoning";

/** Hujjatdagi yangi maydonlar bilan buyurtma (2026-10-15). */
const ORDER = {
  id: "o1",
  order_number: "MH-1",
  status: "confirmed",
  total_amount: 100000,
  client: { full_name: "Aziza", phone: "998901234567" },
  items: [{ id: "i1", medicine_name: "Omega", quantity: 1, price: 100000 }],
  delivery: {
    region: "fargona",
    district: "fargona/qoqon_sh",
    district_display: "Qo'qon shahri",
    zone_id: 7,
    zone_name: "Qo'qon markaz",
  },
  zone_match: null,
  assignment_suggestion: {
    courier_id: 12,
    courier_name: "Aziz",
    tier: "primary",
    reason: "ok",
    computed_at: "2026-10-15T08:00:00Z",
  },
  district_guess: null,
};

describe("mapOrderZoning", () => {
  it("yangi maydonlar to'liq o'qiladi", () => {
    const zoning = mapLogistOrder(ORDER).zoning;
    expect(zoning).toMatchObject({
      district: "fargona/qoqon_sh",
      districtDisplay: "Qo'qon shahri",
      zoneId: 7,
      zoneName: "Qo'qon markaz",
      zoneMatch: null,
      districtGuess: null,
    });
    expect(zoning.suggestion).toMatchObject({ courierId: 12, tier: "primary", reason: "ok", autoHold: false });
    expect(zoning.suggestion?.computedAt).toBeInstanceOf(Date);
  });

  it("assigned_auto — Avto belgisi faqat shu maydondan", () => {
    expect(mapOrderZoning({ assigned_auto: true }).autoAssigned).toBe(true);
    expect(mapOrderZoning({ assigned_auto: false }).autoAssigned).toBe(false);
    expect(mapOrderZoning({ courier_auto: true, auto_assigned: true }).autoAssigned).toBeNull();
    expect(mergeZoningSnapshot(EMPTY_ZONING, { assigned_auto: false }).autoAssigned).toBe(false);
  });

  it("eski javob (maydonlarsiz) — hammasi null, yiqilmaydi", () => {
    expect(mapOrderZoning({ id: "x" })).toEqual(EMPTY_ZONING);
    expect(mapOrderZoning(null)).toEqual(EMPTY_ZONING);
    expect(mapOrderZoning({ delivery: "Toshkent", assignment_suggestion: "?" })).toEqual(EMPTY_ZONING);
  });

  it("district_guess va ishonch foizi (server 0–1)", () => {
    const zoning = mapOrderZoning({
      district_guess: { district: "fargona/qoqon_sh", district_display: "Qo'qon shahri", confidence: 0.7 },
    });
    expect(zoning.districtGuess).toEqual({
      district: "fargona/qoqon_sh",
      districtDisplay: "Qo'qon shahri",
      confidence: 70,
    });
    expect(districtGuessText(zoning.districtGuess!)).toBe("Qo'qon shahri (70%)");
    // Backend #13: faqat 0–1.
    expect(confidencePercent(1)).toBe(100);
    expect(confidencePercent(0)).toBe(0);
    expect(confidencePercent(85)).toBeNull();
    expect(confidencePercent(null)).toBeNull();
    expect(mapOrderZoning({ district_guess: { confidence: 1 } }).districtGuess).toBeNull();
  });

  it("auto_hold va noma'lum daraja", () => {
    const zoning = mapOrderZoning({
      assignment_suggestion: { courier_id: null, tier: "galaxy", reason: "no_courier_on_shift", auto_hold: true },
    });
    expect(zoning.suggestion).toMatchObject({ courierId: null, tier: null, reason: "no_courier_on_shift", autoHold: true });
  });
});

describe("hudud ko'rinish qoidalari", () => {
  it("zoneState: zonali · zonasiz tuman · noma'lum", () => {
    expect(zoneState({ ...EMPTY_ZONING, district: "a/b", zoneId: 1 })).toBe("zoned");
    expect(zoneState({ ...EMPTY_ZONING, district: "a/b" })).toBe("district_without_zone");
    expect(zoneState(EMPTY_ZONING)).toBe("unknown");
  });

  it("taklif faqat tasdiqlangan va kuryersiz buyurtmada", () => {
    const order = mapLogistOrder(ORDER);
    expect(actionableSuggestion(order)?.courierId).toBe(12);
    expect(suggestionText(actionableSuggestion(order)!)).toBe("Taklif: Aziz (asosiy zona)");
    expect(actionableSuggestion({ ...order, status: "shipping" })).toBeNull();
    expect(actionableSuggestion({ ...order, courier: { id: 3 } })).toBeNull();
  });

  it("taklif yo'qligining sababi", () => {
    const order = mapLogistOrder({
      ...ORDER,
      assignment_suggestion: { courier_id: null, reason: "no_courier_on_shift" },
    });
    expect(actionableSuggestion(order)).toBeNull();
    expect(suggestionMissingText(order)).toBe("Zonada smenadagi kuryer yo'q");
  });

  it("hudud qatori", () => {
    expect(zoningLine(mapLogistOrder(ORDER).zoning)).toBe("Qo'qon shahri · Qo'qon markaz");
    expect(zoningLine(EMPTY_ZONING)).toBeNull();
  });
});

describe("mergeZoningSnapshot (qisqa karta)", () => {
  const base = mapLogistOrder(ORDER).zoning;

  it("faqat kelgan kalitlar qo'llanadi", () => {
    const next = mergeZoningSnapshot(base, { zone_match: false });
    expect(next.zoneMatch).toBe(false);
    expect(next.zoneName).toBe("Qo'qon markaz");
    expect(next.suggestion?.courierId).toBe(12);
  });

  it("assignment_suggestion: null — taklif olib tashlanadi", () => {
    expect(mergeZoningSnapshot(base, { assignment_suggestion: null }).suggestion).toBeNull();
  });

  it("delivery bloki tumanni almashtiradi", () => {
    const next = mergeZoningSnapshot(base, { delivery: { district: null, zone_id: null } });
    expect(next.district).toBeNull();
    expect(next.zoneId).toBeNull();
    expect(next.zoneName).toBe("Qo'qon markaz");
  });

  it("mergeOrderSnapshot kuryer va hududni ham yamaydi", () => {
    const order = mapLogistOrder(ORDER);
    const merged = mergeOrderSnapshot(order, {
      courier: { id: 12, full_name: "Aziz" },
      zone_match: true,
      assigned_auto: true,
    });
    expect(merged.courier?.fullName).toBe("Aziz");
    expect(merged.zoning.zoneMatch).toBe(true);
    expect(merged.zoning.autoAssigned).toBe(true);
    // Taxminiy eski nomlar endi o'qilmaydi (#12).
    expect(mergeOrderSnapshot(order, { courier_auto: true }).zoning.autoAssigned).toBe(
      order.zoning.autoAssigned,
    );
    // Zonasiz eski karta ham yiqilmaydi.
    const legacy = { ...order, zoning: undefined } as unknown as LogistOrder;
    expect(mergeOrderSnapshot(legacy, { zone_match: false }).zoning.zoneMatch).toBe(false);
  });
});

describe("filtr so'rovi", () => {
  it("district, zone, suggested parametrlari", () => {
    const params = buildOrderFilters({
      districts: ["fargona/qoqon_sh", "fargona/qoqon_sh", "fargona/rishton"],
      zones: [7, 8, 7],
      suggested: "yes",
    });
    expect(params.district).toBe("fargona/qoqon_sh,fargona/rishton");
    expect(params.zone).toBe("7,8");
    expect(params.suggested).toBe("yes");
  });

  it("geocode=review — faqat 'review' qiymatida", () => {
    expect(buildOrderFilters({ geocode: "review" }).geocode).toBe("review");
    expect(buildOrderFilters({ geocode: null })).not.toHaveProperty("geocode");
  });

  it("zone=none — Hududi noma'lum savati", () => {
    expect(buildOrderFilters({ zones: "none" }).zone).toBe("none");
    expect(zonesParam([])).toBeNull();
    expect(zonesParam([0, -1])).toBeNull();
  });

  it("bo'sh filtrlar parametr qo'shmaydi", () => {
    const params = buildOrderFilters({ districts: [], zones: [], suggested: null });
    expect(params).not.toHaveProperty("district");
    expect(params).not.toHaveProperty("zone");
    expect(params).not.toHaveProperty("suggested");
  });

  it("URL holatidan: none boshqa zonalarni bosadi, notanish taklif tashlanadi", () => {
    const base = {
      creator: null,
      app: null,
      deliveryDate: null,
      region: null,
      quick: null,
      paidFilter: null,
      methodFilter: null,
      courierId: null,
    };
    expect(serverFilterParams({ ...base, zones: ["7", "none"] }).zones).toBe("none");
    expect(serverFilterParams({ ...base, zones: ["7", "x", "8"] }).zones).toEqual([7, 8]);
    expect(serverFilterParams({ ...base, suggested: "maybe" }).suggested).toBeNull();
    expect(serverFilterParams({ ...base, flag: "address-issue" }).geocode).toBe("review");
    expect(serverFilterParams({ ...base, flag: "duplicate" }).geocode).toBeNull();
    expect(serverFilterParams({ ...base, districts: [" a/b ", ""] }).districts).toEqual(["a/b"]);
    // Eski chaqiruv (yangi kalitlarsiz) — bo'sh qiymatlar.
    expect(serverFilterParams(base)).toMatchObject({ districts: [], zones: [], suggested: null });
  });

  it("zona pilli: none va zonalar bir-birini chiqaradi", () => {
    expect(toggleZoneFilter(["7"], "none")).toEqual(["none"]);
    expect(toggleZoneFilter(["none"], "7")).toEqual(["7"]);
    expect(toggleZoneFilter(["7", "8"], "7")).toEqual(["8"]);
    expect(toggleZoneFilter(["none"], "none")).toEqual([]);
    expect(zoneFilterValue([])).toEqual([]);
  });

  it("hudud filtri bilan doskaga yangi karta qo'yilmaydi", () => {
    expect(boardAcceptsNewOrder({ zones: "none" })).toBe(false);
    expect(boardAcceptsNewOrder({ districts: ["a/b"] })).toBe(false);
    expect(boardAcceptsNewOrder({ suggested: "yes" })).toBe(false);
    expect(boardAcceptsNewOrder({ zones: [], districts: [], suggested: null })).toBe(true);
  });

  it("PATCH tanasi: district (null — tozalash)", () => {
    expect(serializeOrderPatch({ district: "fargona/qoqon_sh" })).toEqual({ district: "fargona/qoqon_sh" });
    expect(serializeOrderPatch({ district: null })).toEqual({ district: null });
    expect(serializeOrderPatch({ courierId: null })).toEqual({ courier_id: null });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WS hodisalari
// ─────────────────────────────────────────────────────────────────────────────

const KEY = ["orders", "board", "logist", {}];

function setup() {
  const client = new QueryClient();
  const board = mapOrdersBoard(
    { columns: [{ status: "confirmed", count: 1, orders: [ORDER] }] },
    mapLogistOrder,
  );
  client.setQueryData(KEY, board);
  client.setQueryData<LogistOrderDetail>(["orders", "detail", "o1"], {
    order: mapLogistOrder(ORDER),
    audit: [],
  });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  return { client, invalidate };
}

function card(client: QueryClient): LogistOrder | undefined {
  return client
    .getQueryData<OrdersBoard<LogistOrder>>(KEY)
    ?.columns.find((column) => column.status === "confirmed")?.orders[0];
}

function detail(client: QueryClient): LogistOrder | undefined {
  return client.getQueryData<LogistOrderDetail>(["orders", "detail", "o1"])?.order;
}

describe("WS: zonalar bo'yicha taqsimlash", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("order_suggestion — taklif joyida almashadi, so'rov yo'q", () => {
    const { client, invalidate } = setup();
    applyOrderEvent(client, "order_suggestion", {
      order_id: "o1",
      suggested_courier_id: 15,
      suggested_courier_name: "Bobur",
      tier: "secondary",
      reason: "ok",
    });
    expect(card(client)?.zoning.suggestion).toMatchObject({ courierId: 15, courierName: "Bobur", tier: "secondary" });
    expect(detail(client)?.zoning.suggestion?.courierId).toBe(15);
    vi.runAllTimers();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("order_suggestion auto_hold va computed_at (backend #14)", () => {
    const { client } = setup();
    applyOrderEvent(client, "order_suggestion", {
      order_id: "o1",
      suggested_courier_id: 15,
      suggested_courier_name: "Bobur",
      tier: "primary",
      reason: "ok",
      auto_hold: true,
      computed_at: "2026-10-15T09:30:00Z",
    });
    const suggestion = card(client)?.zoning.suggestion;
    expect(suggestion).toMatchObject({ courierId: 15, autoHold: true });
    expect(suggestion?.computedAt).toBeInstanceOf(Date);
    if (!suggestion) throw new Error("taklif yo'q");
    expect(suggestionTitle(suggestion)).toContain(AUTO_HOLD_HINT);
    expect(suggestionTitle({ ...suggestion, autoHold: false, computedAt: null })).toBe(
      suggestionText(suggestion),
    );
  });

  it("order_suggestion reason=cleared — taklif olib tashlanadi", () => {
    const { client } = setup();
    applyOrderEvent(client, "order_suggestion", { order_id: "o1", reason: "cleared" });
    expect(card(client)?.zoning.suggestion).toBeNull();
  });

  it("order_courier_assigned — kuryer, zona mosligi, avto belgisi", () => {
    const { client } = setup();
    applyOrderEvent(client, "order_courier_assigned", {
      order_id: "o1",
      courier: { id: 12, full_name: "Aziz" },
      changed_by: "Avto taqsimlash",
      zone_match: false,
      tier: "neighbor",
      auto: true,
    });
    const order = card(client);
    expect(order?.courier).toMatchObject({ id: 12, fullName: "Aziz" });
    expect(order?.zoning).toMatchObject({ zoneMatch: false, autoAssigned: true, suggestion: null });
    expect(detail(client)?.courier?.id).toBe(12);
  });

  it("order_courier_assigned eski shakli (faqat courier) ham ishlaydi", () => {
    const { client } = setup();
    applyOrderEvent(client, "order_courier_assigned", { order_id: "o1", courier: { id: 3, name: "Eski" } });
    expect(card(client)?.courier?.fullName).toBe("Eski");
    expect(card(client)?.zoning.autoAssigned).toBe(false);
    expect(card(client)?.zoning.zoneMatch).toBeNull();
  });

  it("order_auto_assigned — taklifdagi ism bilan, avto belgisi", () => {
    const { client, invalidate } = setup();
    applyOrderEvent(client, "order_auto_assigned", {
      order_id: "o1",
      courier_id: 12,
      order: { id: "o1", status: "confirmed" },
    });
    expect(card(client)?.courier).toMatchObject({ id: 12, fullName: "Aziz" });
    expect(card(client)?.zoning).toMatchObject({ autoAssigned: true, suggestion: null });
    vi.runAllTimers();
    // Ism ma'lum — butun `orders` emas, faqat ro'yxatlar.
    expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ predicate: expect.any(Function) }));
  });

  it("order_auto_assigned — ism noma'lum bo'lsa keshlar serverdan olinadi", () => {
    const { client, invalidate } = setup();
    applyOrderEvent(client, "order_auto_assigned", { order_id: "o1", courier_id: 99 });
    expect(card(client)?.courier?.id).toBe(99);
    vi.runAllTimers();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["orders"], refetchType: "active" });
  });

  it("order_zone_mismatch — belgi qo'yiladi", () => {
    const { client } = setup();
    applyOrderEvent(client, "order_zone_mismatch", { order_id: "o1", courier_id: 12, zone_id: 7 });
    expect(card(client)?.zoning.zoneMatch).toBe(false);
  });

  it("order_updated changes.courier.to=null — kuryer olib tashlanadi", () => {
    const { client } = setup();
    applyOrderEvent(client, "order_courier_assigned", { order_id: "o1", courier: { id: 12, full_name: "Aziz" }, auto: true });
    applyOrderEvent(client, "order_updated", {
      order_id: "o1",
      changes: { courier: { from: "Aziz", to: null } },
    });
    expect(card(client)?.courier).toBeNull();
    expect(card(client)?.zoning.autoAssigned).toBeNull();
  });

  it("notanish order_* hodisasi yiqitmaydi — keshlar eskiradi", () => {
    const { client, invalidate } = setup();
    expect(() => applyOrderEvent(client, "order_something_new", { order_id: "o1" })).not.toThrow();
    vi.runAllTimers();
    expect(invalidate).toHaveBeenCalled();
  });
});

describe("tarix: order.courier_assigned", () => {
  it("avto biriktirish — tizim nomi, daraja, zona mos emas", () => {
    const item = mapTimelineEvent({
      id: "e1",
      kind: "order.courier_assigned",
      created_at: "2026-10-15T09:00:00Z",
      actor: { type: "system", name: "Avto taqsimlash" },
      payload: { courier_id: 12, courier_name: "Aziz", zone_match: false, tier: "primary", auto: true },
    });
    expect(item.title).toBe("Avto biriktirildi");
    expect(item.who).toBe("Avto taqsimlash");
    expect(item.text).toBe("Aziz · asosiy zona · zona mos emas");
    expect(item.tone).toBe("warn");
  });

  it("operator biriktirishi va eski payload", () => {
    const manual = mapTimelineEvent({
      kind: "order.courier_assigned",
      actor: { type: "logist", name: "Dilnoza" },
      payload: { courier_id: 12, courier_name: "Aziz", zone_match: true, tier: "secondary", auto: false },
    });
    expect(manual.title).toBe("Kuryer biriktirildi");
    expect(manual.text).toBe("Aziz · ikkinchi zona");
    expect(manual.tone).toBe("brand");

    const legacy = mapTimelineEvent({
      kind: "order.courier_assigned",
      payload: { courier: { full_name: "Eski" } },
    });
    expect(legacy.text).toBe("Eski");
  });

  it("kuryer olib tashlangan va nomsiz tizim", () => {
    const removed = mapTimelineEvent({
      kind: "order.courier_assigned",
      actor: { type: "system" },
      payload: { courier_id: null, courier_name: null },
    });
    expect(removed.title).toBe("Kuryer olib tashlandi");
    expect(removed.who).toBe("Tizim");
  });
});

describe("ommaviy biriktirish ogohlantirishlari (backend #16)", () => {
  it("warnings o'qiladi, zone_mismatch sanaladi", () => {
    const result = mapBulkResult({
      applied: ["a", "b", "c"],
      failed: [{ id: "d", code: "order_not_confirmed" }],
      warnings: [
        { id: "a", warning: "zone_mismatch" },
        { id: "b", warning: "zone_mismatch" },
        { id: "c", warning: "boshqa" },
      ],
    });
    expect(result.applied).toEqual(["a", "b", "c"]);
    expect(result.failed).toEqual([{ id: "d", code: "order_not_confirmed" }]);
    expect(result.warnings).toHaveLength(3);
    expect(zoneMismatchCount(result)).toBe(2);
  });

  it("warnings yo'q (eski javob) — bo'sh", () => {
    const result = mapBulkResult({ applied: ["a"], failed: [] });
    expect(result.warnings).toEqual([]);
    expect(zoneMismatchCount(result)).toBe(0);
  });
});
