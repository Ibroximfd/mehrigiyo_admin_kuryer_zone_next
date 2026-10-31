import { DEMO_ADDRESS_RATE, DEMO_FILIALS, DEMO_PRODUCTS, DEMO_SKLADS, demoDelay, demoSeed } from "@/lib/demo/mock/dataset";
import type { FilialCode } from "@/lib/demo/mock/dataset";
import { toIsoDay } from "@/lib/format";

import { DEMO_CREDENTIALS, isDemoPhone } from "./credentials";
import {
  allDistricts,
  courierLoad,
  dayOffset,
  demoDb,
  districtName,
  nextDemoId,
  pushHistory,
  zoneOfDistrict,
} from "./db";
import type { DemoCourierRow, DemoFilialHandover, DemoOrderRow, DemoZoneRow } from "./db";
import { DEMO_CHIEF, DEMO_REGIONS } from "./fixtures";

/**
 * Demo rejimdagi «backend»: `api-client` har so'rovni shu yerga beradi va
 * tarmoqqa hech narsa chiqmaydi. Javoblar haqiqiy backend shaklida (snake_case,
 * `{count, results}`), ya'ni ekranlar o'sha `fromJson` lar bilan o'qiydi.
 * Noma'lum yo'l — kodsiz `404` (`endpoint_missing`), haqiqiy backend chiqmagandagidek.
 * Xato matni javobda yo'q: `api-client` chaqiruvchining `fallbackError` ini ko'rsatadi.
 */

export type DemoResponse = { status: number; data: unknown };

export type DemoRequest = {
  method: "get" | "post" | "put" | "patch" | "delete";
  path: string;
  searchParams?: Record<string, string | number | boolean | null | undefined>;
  json?: unknown;
};

const ok = (data: unknown): DemoResponse => ({ status: 200, data });
const fail = (status: number, code: string, fields?: Record<string, string[]>): DemoResponse => ({
  status,
  data: fields ? { code, fields } : { code },
});

function body(request: DemoRequest): Record<string, unknown> {
  return request.json && typeof request.json === "object" ? (request.json as Record<string, unknown>) : {};
}

function param(request: DemoRequest, key: string): string {
  const value = request.searchParams?.[key];
  return value === null || value === undefined ? "" : String(value);
}

// ── Shakllar (backend javobidek) ─────────────────────────────────────────────

function filialJson(code: string) {
  const filial = DEMO_FILIALS.find((item) => item.code === code) ?? DEMO_FILIALS[0]!;
  return { id: filial.id, name: filial.name };
}

function courierRef(id: number | null) {
  const courier = demoDb.couriers.find((item) => item.id === id);
  return courier ? { id: courier.id, full_name: courier.fullName, phone: courier.phone } : null;
}

function orderJson(order: DemoOrderRow) {
  const zone = zoneOfDistrict(order.district);
  return {
    id: order.id,
    order_number: order.number,
    status: order.status,
    total_amount: order.total,
    payable_amount: order.total,
    item_count: order.items.reduce((sum, item) => sum + item.quantity, 0),
    items: order.items.map((item) => {
      const product = DEMO_PRODUCTS.find((row) => row.id === item.productId);
      return {
        product_id: item.productId,
        product_name: product?.name ?? "",
        quantity: item.quantity,
        unit_price: product?.price ?? null,
        total: (product?.price ?? 0) * item.quantity,
        // Demo mahsulotlarida rasm yo'q — backenddek `null` (UI bosh harflarni chizadi).
        image: null,
      };
    }),
    customer_notes: order.note,
    client: { full_name: order.client.name, phone: order.client.phone },
    delivery: {
      region: order.region,
      district: order.district,
      district_display: districtName(order.district),
      address_text: order.address,
      address_changed_by: order.addressChangedBy,
      // TZ 25: bo'sh qiymat — `null`, `""` emas.
      landmark: order.landmark || null,
      zone_id: zone?.id ?? null,
      zone_name: zone?.name ?? null,
    },
    payment: { method: "cash" },
    courier: courierRef(order.courierId),
    chief_courier: { id: DEMO_CHIEF.id, full_name: DEMO_CHIEF.fullName },
    // N-4: sotgan filial.
    filial: filialJson(order.filial),
    return_reason: order.returnReason,
    return_note: order.returnNote,
    needs_redispatch: order.returned,
    created_at: order.createdAt.toISOString(),
    delivered_at: order.deliveredAt?.toISOString() ?? null,
    zone_match: order.courierId === null || !zone ? null : courierZone(order.courierId) === zone.id,
  };
}

function courierZone(courierId: number): number | null {
  return demoDb.couriers.find((item) => item.id === courierId)?.zoneId ?? null;
}

function today(): string {
  return toIsoDay(new Date());
}

function courierJson(courier: DemoCourierRow) {
  const zone = demoDb.zones.find((item) => item.id === courier.zoneId) ?? null;
  const own = demoDb.orders.filter((order) => order.courierId === courier.id);
  const deliveredToday = own.filter((order) => order.deliveredAt && toIsoDay(order.deliveredAt) === today());
  return {
    id: courier.id,
    full_name: courier.fullName,
    phone: courier.phone,
    is_active: courier.isActive,
    zone_ids: zone ? [zone.id] : [],
    zones: zone ? [{ id: zone.id, name: zone.name }] : [],
    region: zone?.region ?? DEMO_CHIEF.regions[0],
    load: courierLoad(courier.id),
    today: {
      assigned: courierLoad(courier.id) + deliveredToday.length,
      delivered: deliveredToday.length,
      cod_total: deliveredToday.filter((order) => !order.settledDay).reduce((sum, order) => sum + order.total, 0),
    },
    has_account: courier.hasAccount,
    on_shift: courier.isActive && courier.onShift,
    online: courier.isActive && courier.onShift,
  };
}

function zoneJson(zone: DemoZoneRow) {
  return { id: zone.id, region: zone.region, name: zone.name, is_active: zone.isActive, district_codes: zone.districtCodes };
}

function isIncoming(order: DemoOrderRow) {
  return order.status === "shipping" && order.courierId === null && !order.returned;
}

function isActiveOrder(order: DemoOrderRow) {
  return order.status === "shipping" && order.courierId !== null && !order.returned;
}

// ── Kirish va bosh kuryer ───────────────────────────────────────────────────

function login(request: DemoRequest): DemoResponse {
  const json = body(request);
  // Haqiqiy backend kabi: bosh kuryer akkaunti faqat `site: "chief"` bilan (§7.2).
  if (json.site !== "chief") return { status: 403, data: { code: "wrong_site", account_kind: "chief" } };
  const phone = String(json.username ?? json.phone ?? "");
  if (!isDemoPhone(phone) || json.password !== DEMO_CREDENTIALS.password) {
    return fail(401, "invalid_credentials");
  }
  return ok({
    access: "demo-access",
    refresh: null,
    account_kind: "chief",
    role: "logist",
    operator: { id: DEMO_CHIEF.id, full_name: DEMO_CHIEF.fullName, username: DEMO_CREDENTIALS.phone },
    filial: filialJson("Q"),
  });
}

function chiefMe(): DemoResponse {
  const active = demoDb.couriers.filter((courier) => courier.isActive);
  return ok({
    seat: { id: DEMO_CHIEF.id, full_name: DEMO_CHIEF.fullName, username: DEMO_CREDENTIALS.phone },
    filial: filialJson("Q"),
    regions: DEMO_CHIEF.regions,
    permissions: {
      "orders.dispatch": true,
      "couriers.manage": true,
      "zones.manage": true,
      "cash.accept": true,
      "warehouse.view_courier_stores": true,
      "view.analytics": true,
    },
    summary: {
      incoming: demoDb.orders.filter(isIncoming).length,
      active: demoDb.orders.filter(isActiveOrder).length,
      couriers: active.length,
      couriers_on_shift: active.filter((courier) => courier.onShift).length,
      finalized_today: demoDb.orders.filter((order) => order.deliveredAt && toIsoDay(order.deliveredAt) === today()).length,
    },
  });
}

const PAGE_SIZE = 10;

/** K1 §2.2: `scope` = `incoming` | `active` | `all`, qo'shimcha `status`, `courier_id`, `date_from`, `date_to`. */
function matchesFilters(order: DemoOrderRow, request: DemoRequest): boolean {
  if (order.returned) return false;
  const scope = param(request, "scope") || "incoming";
  if (scope === "incoming" && !isIncoming(order)) return false;
  if (scope === "active" && !isActiveOrder(order)) return false;
  const status = param(request, "status");
  if (status && order.status !== status) return false;
  const courierId = param(request, "courier_id");
  if (courierId && String(order.courierId ?? "") !== courierId) return false;
  const zoneId = param(request, "zone_id");
  if (zoneId && String(zoneOfDistrict(order.district)?.id ?? "") !== zoneId) return false;
  const filialId = param(request, "filial_id");
  if (filialId && String(filialJson(order.filial).id) !== filialId) return false;
  const region = param(request, "region");
  if (region && order.region !== region) return false;
  const district = param(request, "district");
  if (district && order.district !== district) return false;
  const day = toIsoDay(order.createdAt);
  const from = param(request, "date_from");
  const to = param(request, "date_to");
  return (!from || day >= from) && (!to || day <= to) && matchesQuery(order, param(request, "q"));
}

/** V3: raqam, mijoz, telefon, manzil, mahsulot. */
function matchesQuery(order: DemoOrderRow, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const digits = needle.replace(/\D/g, "");
  const products = order.items.map((item) => DEMO_PRODUCTS.find((row) => row.id === item.productId)?.name ?? "");
  const haystack = [order.number, order.client.name, order.address, districtName(order.district), ...products].join(" ").toLowerCase();
  return haystack.includes(needle) || (digits.length >= 3 && order.client.phone.includes(digits));
}

function chiefOrders(request: DemoRequest): DemoResponse {
  const filtered = demoDb.orders
    .filter((order) => matchesFilters(order, request))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return paged(request, filtered.map(orderJson));
}

/** V4: zakaz + `history[]`, yangisi birinchi. */
function orderDetail(id: string): DemoResponse {
  const order = findOrder(id);
  // Logistga qaytarilgan zakaz bosh kuryerda emas — detali ham `404` (TZ 25 §2).
  if (!order || order.returned) return fail(404, "order_not_found");
  return ok(detailJson(order));
}

function detailJson(order: DemoOrderRow) {
  return {
    ...orderJson(order),
    history: [...order.history]
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .map((entry) => ({ at: entry.at.toISOString(), action: entry.action, actor: entry.actor, courier: entry.courier })),
  };
}

/** `409 order_closed` — yetkazilgan yoki bekor qilingan; qaytarilgan yoki yo'q — `404`. */
function editableOrder(id: string): DemoOrderRow | DemoResponse {
  const order = findOrder(id);
  if (!order || order.returned) return fail(404, "order_not_found");
  if (order.status !== "shipping") return fail(409, "order_closed");
  return order;
}

const isResponse = (value: DemoOrderRow | DemoResponse): value is DemoResponse => "status" in value && "data" in value;

/** `25_MANZIL_OZGARISHI` §5.1: faqat o'z viloyatlari; zona o'zgarsa va kuryer unda bo'lmasa — kuryer olinadi. */
function fixAddress(id: string, request: DemoRequest): DemoResponse {
  const order = editableOrder(id);
  if (isResponse(order)) return order;
  const json = body(request);
  const district = allDistricts().find((item) => item.code === String(json.district ?? ""));
  if (!district) return fail(400, "validation_error", { district: ["Tuman topilmadi"] });
  if (!DEMO_CHIEF.regions.some((code) => code === district.region)) return fail(403, "zone_other_region");
  if (!["client_error", "clarified", "moved", "other"].includes(String(json.reason))) {
    return fail(400, "validation_error", { reason: ["Sabab noto'g'ri"] });
  }
  order.region = district.region;
  order.district = district.code;
  if (typeof json.address_text === "string" && json.address_text.trim()) order.address = json.address_text.trim();
  if (typeof json.landmark === "string") order.landmark = json.landmark.trim() || null;
  order.addressChangedBy = "chief";
  pushHistory(order, "address_changed", null);
  const zone = zoneOfDistrict(order.district);
  if (order.courierId !== null && courierZone(order.courierId) !== zone?.id) {
    pushHistory(order, "courier_unassigned", courierRef(order.courierId)?.full_name ?? null);
    order.courierId = null;
  }
  // Javob — `chief/orders/{id}/` ning aynan o'zi.
  return ok(detailJson(order));
}

/** §5.2: bosh kuryer va kuryer olinadi, zakaz logist taqsimlashiga qaytadi. */
function returnOrder(id: string, request: DemoRequest): DemoResponse {
  const order = editableOrder(id);
  if (isResponse(order)) return order;
  const json = body(request);
  const reason = String(json.reason);
  const note = typeof json.note === "string" ? json.note.trim() : "";
  if (!["wrong_region", "address_unknown", "client_unreachable", "other"].includes(reason)) {
    return fail(400, "validation_error", { reason: ["Sabab noto'g'ri"] });
  }
  if (reason === "other" && !note) return fail(400, "validation_error", { note: ["«Boshqa sabab» uchun izoh majburiy"] });
  pushHistory(order, "returned_to_logist", null);
  order.courierId = null;
  order.returned = true;
  order.returnReason = reason;
  order.returnNote = note || null;
  return ok({ id: order.id, returned: true });
}

/** V5: server rejasi — zona kuryeri, smenadagisi birinchi, keyin yuki kam; hech narsa yozilmaydi. */
function autoAssignPlan(orderIds: unknown) {
  const ids = Array.isArray(orderIds) && orderIds.length > 0 ? orderIds.map(String) : null;
  const planned = new Map<number, number>();
  return demoDb.orders
    .filter((order) => isIncoming(order) && (!ids || ids.includes(order.id)))
    .map((order) => {
      const zone = zoneOfDistrict(order.district);
      if (!zone) return { order_id: order.id, zone: null, courier: null, reason: "no_zone" };
      const team = demoDb.couriers.filter((item) => item.isActive && item.zoneId === zone.id);
      const load = (id: number) => courierLoad(id) + (planned.get(id) ?? 0);
      const onShift = team.filter((item) => item.onShift).sort((a, b) => load(a.id) - load(b.id));
      const courier = onShift[0];
      const zoneJsonRef = { id: zone.id, name: zone.name };
      if (!courier) {
        return { order_id: order.id, zone: zoneJsonRef, courier: null, reason: team.length ? "no_courier_on_shift" : "no_courier" };
      }
      planned.set(courier.id, (planned.get(courier.id) ?? 0) + 1);
      return { order_id: order.id, zone: zoneJsonRef, courier: { id: courier.id, full_name: courier.fullName }, reason: "ok" };
    });
}

function autoAssignApply(request: DemoRequest): DemoResponse {
  const assignments = body(request).assignments;
  const assigned: Array<{ id: string; courier_id: number }> = [];
  const failed: Array<{ id: string; code: string }> = [];
  for (const raw of Array.isArray(assignments) ? assignments : []) {
    const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const id = String(row.order_id ?? "");
    const order = findOrder(id);
    const courier = demoDb.couriers.find((item) => item.id === Number(row.courier_id) && item.isActive);
    if (!order || !isIncoming(order)) {
      failed.push({ id, code: "order_not_found" });
      continue;
    }
    if (!courier) {
      failed.push({ id, code: "courier_not_yours" });
      continue;
    }
    order.courierId = courier.id;
    pushHistory(order, "courier_assigned", courier.fullName);
    assigned.push({ id, courier_id: courier.id });
  }
  return ok({ assigned, failed });
}

/** `page` berilsa — `{count, next, results}` (10 tadan); berilmasa — oddiy massiv (V3, V10). */
function paged<T>(request: DemoRequest, rows: T[]): DemoResponse {
  const raw = param(request, "page");
  if (!raw) return ok(rows);
  const page = Math.max(1, Number(raw) || 1);
  return ok({
    count: rows.length,
    next: page * PAGE_SIZE < rows.length ? `?page=${page + 1}` : null,
    previous: page > 1 ? `?page=${page - 1}` : null,
    results: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  });
}

function findOrder(id: string) {
  return demoDb.orders.find((order) => order.id === id) ?? null;
}

function candidates(orderId: string): DemoResponse {
  const order = findOrder(orderId);
  if (!order) return fail(404, "not_found");
  const zone = zoneOfDistrict(order.district);
  const pool = demoDb.couriers.filter((courier) => courier.isActive);
  const rows = pool
    .map((courier) => ({
      courier: {
        id: courier.id,
        full_name: courier.fullName,
        phone: courier.phone,
        zone_ids: courier.zoneId ? [courier.zoneId] : [],
        on_shift: courier.onShift,
        online: courier.onShift,
      },
      tier: zone && courier.zoneId === zone.id ? "primary" : "region",
      load: courierLoad(courier.id),
      familiar: false,
      suggested: false,
    }))
    .sort((a, b) => (a.tier === b.tier ? a.load - b.load : a.tier === "primary" ? -1 : 1));
  const suggested = rows.find((row) => row.tier === "primary" && row.courier.on_shift) ?? null;
  return ok({
    order_id: order.id,
    zone: zone ? { id: zone.id, name: zone.name } : null,
    candidates: rows.map((row) => ({ ...row, suggested: row === suggested })),
    suggested_courier_id: suggested?.courier.id ?? null,
    reason: zone ? "ok" : "no_zone",
  });
}

function assign(orderId: string, request: DemoRequest): DemoResponse {
  const order = findOrder(orderId);
  if (!order || order.status !== "shipping") return fail(404, "not_found");
  const courierId = body(request).courier_id;
  if (courierId === null || courierId === undefined) {
    pushHistory(order, "courier_unassigned", courierRef(order.courierId)?.full_name ?? null);
    order.courierId = null;
    return ok({ order: orderJson(order), warnings: [] });
  }
  const courier = demoDb.couriers.find((item) => item.id === Number(courierId) && item.isActive);
  if (!courier) return fail(400, "courier_inactive");
  order.courierId = courier.id;
  pushHistory(order, "courier_assigned", courier.fullName);
  const warnings: string[] = [];
  const zone = zoneOfDistrict(order.district);
  if (zone && courier.zoneId !== zone.id) warnings.push("zone_mismatch");
  if (!courier.onShift) warnings.push("courier_off_shift");
  return ok({ order: orderJson(order), warnings });
}

// ── Kuryerlar va zonalar ────────────────────────────────────────────────────

function validZoneIds(raw: unknown): number | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const id = Number(raw[0]);
  return demoDb.zones.some((zone) => zone.id === id) ? id : null;
}

function createCourier(request: DemoRequest): DemoResponse {
  const json = body(request);
  const fullName = String(json.full_name ?? "").trim();
  if (!fullName) return fail(400, "validation_error");
  const courier: DemoCourierRow = {
    id: nextDemoId(),
    fullName,
    phone: String(json.phone ?? ""),
    isActive: true,
    zoneId: validZoneIds(json.zone_ids),
    onShift: false,
    hasAccount: json.create_account === true || typeof json.password === "string",
  };
  demoDb.couriers.push(courier);
  // Parol bir marta ko'rsatiladi — demo uchun tasodifiy to'rt raqam.
  const password = courier.hasAccount ? (typeof json.password === "string" ? json.password : `K-${1000 + (courier.id % 9000)}`) : null;
  return ok({ courier: courierJson(courier), password });
}

function updateCourier(id: number, request: DemoRequest): DemoResponse {
  const courier = demoDb.couriers.find((item) => item.id === id);
  if (!courier) return fail(404, "not_found");
  const json = body(request);
  if (typeof json.full_name === "string") courier.fullName = json.full_name;
  if (typeof json.phone === "string") courier.phone = json.phone;
  if (typeof json.is_active === "boolean") courier.isActive = json.is_active;
  if (Array.isArray(json.zone_ids)) courier.zoneId = validZoneIds(json.zone_ids);
  // Bloklangan kuryer hech qaysi zonaga qaramaydi; ochiq zakazlari «Kelganlar» ga qaytadi.
  if (!courier.isActive) {
    courier.zoneId = null;
    for (const order of demoDb.orders) {
      if (order.status !== "shipping" || order.courierId !== id) continue;
      pushHistory(order, "courier_unassigned", courier.fullName);
      order.courierId = null;
    }
  }
  return ok(courierJson(courier));
}

function zonesList(): DemoResponse {
  const zoned = new Set(demoDb.zones.filter((zone) => zone.isActive).flatMap((zone) => zone.districtCodes));
  const unzoned = allDistricts()
    .map((district) => district.code)
    .filter((code) => !zoned.has(code));
  return ok({ zones: demoDb.zones.map(zoneJson), unzoned_districts: unzoned });
}

function codesOf(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.map(String) : [];
}

function createZone(request: DemoRequest): DemoResponse {
  const json = body(request);
  const zone: DemoZoneRow = {
    id: nextDemoId(),
    region: String(json.region ?? DEMO_CHIEF.regions[0]),
    name: String(json.name ?? "").trim() || "Zona",
    isActive: true,
    districtCodes: codesOf(json.district_codes),
  };
  demoDb.zones.push(zone);
  return ok(zoneJson(zone));
}

function updateZone(id: number, request: DemoRequest): DemoResponse {
  const zone = demoDb.zones.find((item) => item.id === id);
  if (!zone) return fail(404, "not_found");
  const json = body(request);
  if (typeof json.name === "string") zone.name = json.name;
  if (typeof json.is_active === "boolean") zone.isActive = json.is_active;
  if (json.district_codes !== undefined) zone.districtCodes = codesOf(json.district_codes);
  return ok(zoneJson(zone));
}

function regionsDictionary(): DemoResponse {
  return ok(
    DEMO_REGIONS.map((region) => ({
      region: region.region,
      name: region.name,
      districts: [...region.districts, ...demoDb.customPlaces.filter((place) => place.region === region.region)].map((district) => ({
        code: district.code,
        name_uz: district.name,
        kind: district.kind,
        is_active: true,
      })),
    })),
  );
}

/** V6: qo'lda joy — `<region>/c_...`; dublikat — 200 mavjud; begona viloyat — 403. */
function createPlace(request: DemoRequest): DemoResponse {
  const json = body(request);
  const name = String(json.name ?? "").trim();
  const region = String(json.region ?? "");
  if (!name) return fail(400, "validation_error");
  if (!DEMO_CHIEF.regions.some((code) => code === region)) return fail(403, "zone_other_region");
  const existing = allDistricts().find((place) => place.region === region && place.name.toLowerCase() === name.toLowerCase());
  if (existing) return ok({ code: existing.code, name_uz: existing.name, region, kind: existing.kind });
  const place = { code: `${region}/c_${nextDemoId()}`, region, name, kind: "custom" as const };
  demoDb.customPlaces.push(place);
  return { status: 201, data: { code: place.code, name_uz: place.name, region, kind: place.kind } };
}

// ── Hisobot ─────────────────────────────────────────────────────────────────

function deliveredIn(from: string, to: string) {
  return demoDb.orders.filter((order) => {
    if (!order.deliveredAt) return false;
    const day = toIsoDay(order.deliveredAt);
    return day >= from && day <= to;
  });
}


// ── Kassa 1-pog'ona: kuryer → bosh kuryer (`chief/cod/handovers/`, `settle/`) ──

function byFilialSplit(orders: DemoOrderRow[]) {
  const groups = new Map<string, { filial_id: number; filial_name: string; amount: number; orders: number }>();
  for (const order of orders) {
    const filial = filialJson(order.filial);
    const row = groups.get(order.filial) ?? { filial_id: filial.id, filial_name: filial.name, amount: 0, orders: 0 };
    groups.set(order.filial, { ...row, amount: row.amount + order.total, orders: row.orders + 1 });
  }
  return [...groups.values()];
}

function deliveredBy(courierId: number, date: string) {
  return demoDb.orders.filter((order) => order.courierId === courierId && order.deliveredAt && toIsoDay(order.deliveredAt) === date);
}

/** Kuryer e'lonlari (kutilmoqda) va qabul qilingan kunlar — logistniki bilan bir xil satr. */
function codHandovers(request: DemoRequest): DemoResponse {
  const pending = demoDb.declarations.map((item) => ({
    courier: courierRef(item.courierId),
    date: item.date,
    status: "pending",
    amount: item.amount,
    confirmed_amount: null,
    created_at: item.createdAt.toISOString(),
    note: null,
    by_filial: byFilialSplit(deliveredBy(item.courierId, item.date)),
  }));
  const settled = demoDb.settlements.map((item) => ({
    courier: courierRef(item.courierId),
    date: item.date,
    status: item.confirmed === item.declared ? "confirmed" : "disputed",
    amount: item.declared,
    confirmed_amount: item.confirmed,
    created_at: item.at.toISOString(),
    confirmed_at: item.at.toISOString(),
    note: null,
    by_filial: byFilialSplit(deliveredBy(item.courierId, item.date)),
  }));
  const status = param(request, "status");
  const courierId = param(request, "courier_id");
  const date = param(request, "date");
  const from = param(request, "date_from");
  const to = param(request, "date_to");
  const ordering = param(request, "ordering") || "-date";
  const sign = ordering.startsWith("-") ? -1 : 1;
  const field = ordering.replace("-", "");
  const rows = [...pending, ...settled]
    .filter(
      (row) =>
        (!status || row.status === status) &&
        (!courierId || String(row.courier?.id) === courierId) &&
        (!date || row.date === date) &&
        (!from || row.date >= from) &&
        (!to || row.date <= to),
    )
    .sort((a, b) => {
      if (field === "amount") return sign * (a.amount - b.amount);
      if (field === "courier") return (a.courier?.full_name ?? "").localeCompare(b.courier?.full_name ?? "");
      return sign * a.date.localeCompare(b.date);
    });
  return paged(request, rows);
}

/** V11: kuryerning kunma-kun naqdi (logistniki bilan bir xil oraliq shakli). */
function courierCod(courierId: number, request: DemoRequest): DemoResponse {
  if (!demoDb.couriers.some((courier) => courier.id === courierId)) return fail(403, "courier_not_yours");
  const from = param(request, "date_from") || dayOffset(6);
  const to = param(request, "date_to") || today();
  const orders = demoDb.orders.filter(
    (order) => order.courierId === courierId && order.deliveredAt && toIsoDay(order.deliveredAt) >= from && toIsoDay(order.deliveredAt) <= to,
  );
  const days = [...new Set(orders.map((order) => toIsoDay(order.deliveredAt!)))].sort().reverse().map((date) => {
    const dayOrders = orders.filter((order) => toIsoDay(order.deliveredAt!) === date);
    const total = dayOrders.reduce((sum, order) => sum + order.total, 0);
    const settled = dayOrders.every((order) => order.settledDay !== null);
    const declaration = demoDb.declarations.find((item) => item.courierId === courierId && item.date === date);
    return {
      date,
      orders: dayOrders.map((order) => ({ id: order.id, order_number: order.number, amount: order.total, delivered_at: order.deliveredAt!.toISOString() })),
      computed_total: total,
      amount: declaration?.amount ?? total,
      settled,
      handover: settled ? { status: "confirmed", amount: total } : declaration ? { status: "pending", amount: declaration.amount } : null,
    };
  });
  const open = days.filter((item) => !item.settled);
  return ok({
    date_from: from,
    date_to: to,
    days,
    total: days.reduce((sum, item) => sum + item.computed_total, 0),
    outstanding_total: open.reduce((sum, item) => sum + item.amount, 0),
    outstanding_days: open.length,
    settled: open.length === 0,
  });
}

function settle(courierId: number, request: DemoRequest): DemoResponse {
  if (!demoDb.couriers.some((courier) => courier.id === courierId)) return fail(403, "courier_not_yours");
  const json = body(request);
  const from = String(json.date ?? json.date_from ?? "");
  const to = String(json.date ?? json.date_to ?? from);
  if (!from) return fail(400, "validation_error");
  const orders = demoDb.orders.filter(
    (order) =>
      order.courierId === courierId &&
      order.deliveredAt &&
      !order.settledDay &&
      toIsoDay(order.deliveredAt) >= from &&
      toIsoDay(order.deliveredAt) <= to,
  );
  if (orders.length === 0) return fail(400, "already_settled");
  const accepted = today();
  const days = [...new Set(orders.map((order) => toIsoDay(order.deliveredAt!)))].sort();
  const declared = orders.reduce((sum, order) => sum + order.total, 0);
  const confirmed = typeof json.confirmed_amount === "number" ? json.confirmed_amount : declared;
  for (const order of orders) {
    order.settledDay = accepted;
    pushHistory(order, "cash_accepted", courierRef(courierId)?.full_name ?? null);
  }
  for (const date of days) {
    const dayTotal = deliveredBy(courierId, date).reduce((sum, order) => sum + order.total, 0);
    // Kamomad oxirgi kunga yoziladi — kuryerda qarz bo'lib qoladi.
    const share = date === days[days.length - 1] ? dayTotal - (declared - confirmed) : dayTotal;
    demoDb.settlements.push({ courierId, date, declared: dayTotal, confirmed: share, at: new Date() });
  }
  demoDb.declarations = demoDb.declarations.filter((item) => !(item.courierId === courierId && days.includes(item.date)));
  const handover = { status: confirmed === declared ? "confirmed" : "disputed", amount: declared, confirmed_amount: confirmed };
  return json.date
    ? ok({ success: true, settled: true, handover })
    : ok({ days: days.map((date) => ({ date, handover })), settled_days: days.length, confirmed_total: confirmed, handover });
}

// ── Moliya va kassa 2-pog'ona (`TUZILMA_V2` §5) ─────────────────────────────

function settledIn(from: string, to: string) {
  return demoDb.orders.filter((order) => order.settledDay && order.settledDay >= from && order.settledDay <= to);
}

/** Bitta filial qatori: davr sonlari + joriy qoldiq (`to_hand_over`, davrga bog'liq emas). */
function filialRow(code: FilialCode, from: string, to: string) {
  const delivered = deliveredIn(from, to).filter((order) => order.filial === code);
  const addresses = new Set(delivered.map((order) => `${toIsoDay(order.deliveredAt!)}|${order.client.phone}`)).size;
  const handedOver = demoDb.filialHandovers
    .filter((item) => item.filial === code && item.date >= from && item.date <= to)
    .reduce((sum, item) => sum + item.amount, 0);
  return {
    filial: filialJson(code),
    delivered: delivered.length,
    addresses,
    fee: addresses * DEMO_ADDRESS_RATE,
    cash_accepted: settledIn(from, to).filter((order) => order.filial === code).reduce((sum, order) => sum + order.total, 0),
    handed_over: handedOver,
    to_hand_over: unhanded(code).reduce((sum, order) => sum + order.total, 0),
    // V12: eng eski yopilmagan kun (FIFO).
    oldest_day: unhanded(code).map((order) => order.settledDay!).sort()[0] ?? null,
  };
}

/** V13: kuryer kesimi — yetkazgani, manzili, qo'lidagi va topshirgan puli, mahsulotlar. */
function byCourier(from: string, to: string) {
  const delivered = deliveredIn(from, to);
  return demoDb.couriers.map((courier) => {
    const own = delivered.filter((order) => order.courierId === courier.id);
    const products = new Map<number, number>();
    for (const order of own) for (const item of order.items) products.set(item.productId, (products.get(item.productId) ?? 0) + item.quantity);
    return {
      courier: { id: courier.id, full_name: courier.fullName },
      delivered: own.length,
      addresses: new Set(own.map((order) => `${toIsoDay(order.deliveredAt!)}|${order.client.phone}`)).size,
      cash_with_courier: demoDb.orders
        .filter((order) => order.courierId === courier.id && order.deliveredAt && !order.settledDay)
        .reduce((sum, order) => sum + order.total, 0),
      cash_handed: settledIn(from, to).filter((order) => order.courierId === courier.id).reduce((sum, order) => sum + order.total, 0),
      by_product: [...products.entries()].map(([id, qty]) => ({
        item: { id, name: DEMO_PRODUCTS.find((product) => product.id === id)?.name ?? "", image: null },
        qty,
      })),
    };
  });
}

function unhanded(code: FilialCode) {
  return demoDb.orders.filter((order) => order.filial === code && order.settledDay && !order.handedToFilial);
}

function byFilial(from: string, to: string) {
  const rows = DEMO_FILIALS.map((filial) => filialRow(filial.code, from, to));
  const totals = rows.reduce(
    (sum, row) => ({
      delivered: sum.delivered + row.delivered,
      addresses: sum.addresses + row.addresses,
      fee: sum.fee + row.fee,
      cash_accepted: sum.cash_accepted + row.cash_accepted,
      handed_over: sum.handed_over + row.handed_over,
      to_hand_over: sum.to_hand_over + row.to_hand_over,
    }),
    { delivered: 0, addresses: 0, fee: 0, cash_accepted: 0, handed_over: 0, to_hand_over: 0 },
  );
  return { rows, totals };
}

function chiefFinance(request: DemoRequest): DemoResponse {
  const from = param(request, "date_from") || today();
  const to = param(request, "date_to") || from;
  if (to < from) return fail(400, "validation_error");
  const { rows, totals } = byFilial(from, to);
  return ok({ date_from: from, date_to: to, by_filial: rows, totals, by_courier: byCourier(from, to) });
}

function handoverJson(item: DemoFilialHandover) {
  return {
    id: item.id,
    chief: { id: DEMO_CHIEF.id, full_name: DEMO_CHIEF.fullName },
    filial: item.filial ? filialJson(item.filial) : null,
    date: item.date,
    period_from: item.periodFrom,
    period_to: item.periodTo,
    amount: item.amount,
    expected_amount: item.expectedAmount,
    confirmed_amount: item.confirmedAmount,
    shortage: item.confirmedAmount !== null && item.confirmedAmount !== item.amount ? item.amount - item.confirmedAmount : null,
    status: item.status,
    note: item.note,
    logist_note: "",
    logist: item.status === "pending" ? null : { id: 201, full_name: "Sardor Aliyev" },
    created_at: item.createdAt.toISOString(),
    confirmed_at: item.status === "pending" ? null : item.createdAt.toISOString(),
  };
}

function chiefCash(request: DemoRequest): DemoResponse {
  const from = param(request, "date_from") || dayOffset(30);
  const to = param(request, "date_to") || today();
  const open = demoDb.orders.filter((order) => order.settledDay && !order.handedToFilial);
  const { rows, totals } = byFilial(from, to);
  const collected = settledIn(from, to);
  const days = [...new Set(collected.map((order) => order.settledDay!))].sort().reverse();
  return ok({
    date_from: from,
    date_to: to,
    collected_from_couriers: collected.reduce((sum, order) => sum + order.total, 0),
    outstanding: open.reduce((sum, order) => sum + order.total, 0),
    outstanding_days: [...new Set(open.map((order) => order.settledDay!))].sort(),
    days: days.map((date) => ({
      date,
      collected: collected.filter((order) => order.settledDay === date).reduce((sum, order) => sum + order.total, 0),
      status: open.some((order) => order.settledDay === date) ? "none" : "pending",
    })),
    expected_to_logist: totals.to_hand_over,
    by_filial: rows,
    by_filial_totals: totals,
    handovers: [...demoDb.filialHandovers].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).map(handoverJson),
  });
}

/** §5.3: `filial_id` yoki bitta filial — avtomatik; bir nechtada `filial_required`. Summa cheklanmaydi. */
function cashHandover(request: DemoRequest): DemoResponse {
  const json = body(request);
  const amount = Number(json.amount);
  if (!Number.isFinite(amount) || amount <= 0) return fail(400, "invalid_amount");
  const clientActionId = typeof json.client_action_id === "string" ? json.client_action_id : null;
  const repeat = clientActionId ? demoDb.filialHandovers.find((item) => item.clientActionId === clientActionId) : null;
  if (repeat) return ok(handoverJson(repeat));

  let code: FilialCode | null = null;
  if (json.filial_id !== undefined && json.filial_id !== null) {
    const filial = DEMO_FILIALS.find((item) => item.id === Number(json.filial_id));
    if (!filial) return fail(404, "filial_not_found");
    code = filial.code;
  } else {
    const withMoney = DEMO_FILIALS.filter((filial) => unhanded(filial.code).length > 0);
    if (withMoney.length > 1) {
      return {
        status: 400,
        data: {
          code: "filial_required",
          fields: {
            filials: withMoney.map((filial) => ({
              id: filial.id,
              name: filial.name,
              to_hand_over: unhanded(filial.code).reduce((sum, order) => sum + order.total, 0),
            })),
          },
        },
      };
    }
    code = withMoney[0]?.code ?? null;
  }
  const orders = code ? unhanded(code) : [];
  for (const order of orders) {
    order.handedToFilial = true;
    pushHistory(order, "cash_handed", null);
  }
  const item: DemoFilialHandover = {
    id: nextDemoId(),
    filial: code,
    date: typeof json.date === "string" ? json.date : today(),
    periodFrom: typeof json.period_from === "string" ? json.period_from : null,
    periodTo: typeof json.period_to === "string" ? json.period_to : null,
    amount,
    expectedAmount: orders.reduce((sum, order) => sum + order.total, 0),
    confirmedAmount: null,
    status: "pending",
    note: typeof json.note === "string" ? json.note : "",
    clientActionId,
    createdAt: new Date(),
  };
  demoDb.filialHandovers.push(item);
  return { status: 201, data: handoverJson(item) };
}

// ── Sklad (bosh kuryerga faqat o'qish, `JAVOBLAR_SKLAD` S1.3) ────────────────

function courierStockItems(courierId: number) {
  return DEMO_PRODUCTS.flatMap((product) => {
    const quantity = Math.floor(demoSeed("stock", courierId, product.id) * 9) - 3;
    return quantity > 0 ? [{ item: { id: product.id, name: product.name, sku: `P-${product.id}`, image: null }, quantity }] : [];
  });
}

const OWN_SKLAD = () => DEMO_SKLADS.findIndex((sklad) => sklad.chiefId === DEMO_CHIEF.id);

/** V16/V17: bosh kuryerga sklad viloyatlari va `sklad_id`. */
function skladMe(): DemoResponse {
  const index = OWN_SKLAD();
  const sklad = DEMO_SKLADS[index];
  return ok({
    role: "chief_courier",
    filial_id: 1,
    region: sklad?.regions[0] ?? null,
    regions: sklad?.regions ?? [],
    sklad_id: sklad ? index + 1 : null,
    can_write: false,
    granted_item_ids: [],
    user: { id: DEMO_CHIEF.id, full_name: DEMO_CHIEF.fullName },
  });
}

/** V7: bosh kuryer FAQAT o'z skladini ko'radi. */
function skladSklads(): DemoResponse {
  const index = OWN_SKLAD();
  const sklad = DEMO_SKLADS[index];
  if (!sklad) return ok([]);
  return ok([
    {
      id: index + 1,
      name: `${sklad.name} sklad`,
      regions: sklad.regions,
      is_active: true,
      chief: { id: DEMO_CHIEF.id, full_name: DEMO_CHIEF.fullName },
      locations: sklad.regions.length,
    },
  ]);
}

/** V8: o'z skladining viloyat omborlari + kuryerlari ombori (faqat o'qish). */
function skladStock(request: DemoRequest): DemoResponse {
  const sklad = DEMO_SKLADS[OWN_SKLAD()];
  const regionRows = (sklad?.regions ?? []).flatMap((region, regionIndex) =>
    DEMO_PRODUCTS.map((product) => {
      const onHand = Math.round(10 + demoSeed("sklad", region, product.id) * 300);
      return {
        location: { id: 100 + regionIndex, name: `${region} ombori`, kind: "region", region },
        item: { id: product.id, name: product.name, sku: `P-${product.id}`, package_size: 1, image: null },
        on_hand: onHand,
        min_quantity: 40,
        is_low: onHand <= 40,
      };
    }),
  );
  const courierRows = demoDb.couriers
    .filter((courier) => courier.isActive)
    .flatMap((courier) =>
      courierStockItems(courier.id).map((entry) => ({
        location: { id: 1000 + courier.id, name: courier.fullName, kind: "courier", region: null },
        item: entry.item,
        on_hand: entry.quantity,
        min_quantity: 0,
        is_low: false,
      })),
    );
  const rows = [...regionRows, ...courierRows];
  // Haqiqiy backend kabi 50 tadan sahifa.
  const page = Math.max(1, Number(param(request, "page")) || 1);
  const size = 50;
  return ok({
    count: rows.length,
    next: page * size < rows.length ? `?page=${page + 1}` : null,
    previous: page > 1 ? `?page=${page - 1}` : null,
    results: rows.slice((page - 1) * size, page * size),
  });
}

function skladCouriers(): DemoResponse {
  return ok(
    demoDb.couriers.map((courier) => {
      const items = courier.isActive ? courierStockItems(courier.id) : [];
      return {
        id: courier.id,
        full_name: courier.fullName,
        phone: courier.phone,
        on_shift: courier.isActive && courier.onShift,
        location_id: 1000 + courier.id,
        on_hand: items.reduce((sum, entry) => sum + entry.quantity, 0),
        items,
      };
    }),
  );
}

// ── Marshrutlash ────────────────────────────────────────────────────────────

type Route = [method: DemoRequest["method"], pattern: RegExp, handle: (request: DemoRequest, match: RegExpMatchArray) => DemoResponse];

const ROUTES: Route[] = [
  ["post", /^\/operator\/login\/$/, login],
  ["get", /^\/operator\/chief\/me\/$/, chiefMe],
  ["get", /^\/operator\/chief\/orders\/$/, chiefOrders],
  ["post", /^\/operator\/chief\/orders\/auto-assign\/preview\/$/, (request) => ok({ rows: autoAssignPlan(body(request).order_ids) })],
  ["post", /^\/operator\/chief\/orders\/auto-assign\/apply\/$/, autoAssignApply],
  ["get", /^\/operator\/chief\/orders\/([^/]+)\/$/, (_, match) => orderDetail(match[1]!)],
  ["patch", /^\/operator\/chief\/orders\/([^/]+)\/address\/$/, (request, match) => fixAddress(match[1]!, request)],
  ["post", /^\/operator\/chief\/orders\/([^/]+)\/return\/$/, (request, match) => returnOrder(match[1]!, request)],
  ["get", /^\/operator\/chief\/orders\/([^/]+)\/candidates\/$/, (_, match) => candidates(match[1]!)],
  ["post", /^\/operator\/chief\/orders\/([^/]+)\/assign\/$/, (request, match) => assign(match[1]!, request)],
  ["get", /^\/operator\/chief\/couriers\/$/, () => ok({ count: demoDb.couriers.length, results: demoDb.couriers.map(courierJson) })],
  ["post", /^\/operator\/chief\/couriers\/$/, createCourier],
  ["patch", /^\/operator\/chief\/couriers\/(\d+)\/$/, (request, match) => updateCourier(Number(match[1]), request)],
  ["post", /^\/operator\/chief\/couriers\/(\d+)\/settle\/$/, (request, match) => settle(Number(match[1]), request)],
  ["get", /^\/operator\/chief\/cod\/handovers\/$/, codHandovers],
  ["get", /^\/operator\/chief\/zones\/$/, zonesList],
  ["post", /^\/operator\/chief\/zones\/$/, createZone],
  ["patch", /^\/operator\/chief\/zones\/(\d+)\/$/, (request, match) => updateZone(Number(match[1]), request)],
  ["get", /^\/operator\/chief\/filials\/$/, () => ok(DEMO_FILIALS.map((filial) => ({ id: filial.id, name: filial.name, is_main: filial.isMain })))],
  ["post", /^\/operator\/chief\/places\/$/, createPlace],
  ["get", /^\/operator\/chief\/couriers\/(\d+)\/cod\/$/, (request, match) => courierCod(Number(match[1]), request)],
  ["get", /^\/operator\/chief\/finance\/$/, chiefFinance],
  ["get", /^\/operator\/chief\/cash\/$/, chiefCash],
  ["post", /^\/operator\/chief\/cash\/handover\/$/, cashHandover],
  ["get", /^\/meta\/regions\/$/, regionsDictionary],
  ["get", /^\/sklad\/me\/$/, skladMe],
  ["get", /^\/sklad\/sklads\/$/, skladSklads],
  ["get", /^\/sklad\/stock\/$/, skladStock],
  ["get", /^\/sklad\/couriers\/$/, skladCouriers],
];

/** Demo javob — haqiqiy so'rovdek biroz kechikadi (skelet ko'rinsin). */
export async function demoRequest(request: DemoRequest, signal?: AbortSignal): Promise<DemoResponse> {
  await demoDelay(signal, 220);
  for (const [method, pattern, handle] of ROUTES) {
    if (method !== request.method) continue;
    const match = request.path.match(pattern);
    if (match) return handle(request, match);
  }
  // Kodsiz 404 — `isEndpointMissing`: ekran «backend kutilmoqda» holatini ko'rsatadi.
  return { status: 404, data: {} };
}
