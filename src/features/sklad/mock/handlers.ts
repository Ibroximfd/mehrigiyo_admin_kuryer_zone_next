import { SKLAD_REGIONS, regionName } from "@/features/sklad/regions";

import {
  COURIERS,
  DOCUMENTS,
  FILIALS,
  GRANTS,
  ITEMS,
  LEDGER,
  LOCATIONS,
  PINS,
  courierById,
  hoursAgo,
  iso,
  itemById,
  itemRef,
  locationById,
  move,
  nextDocNumber,
  nextId,
  onHand,
  primaryOf,
  session,
  type MockItem,
  type MockLedger,
} from "./db";
import { fail, route, type MockContext } from "./router";

/**
 * Sklad mock ishlovchilari — shartnoma §1, §3–§6, §15–§17. Har ishlovchi
 * haqiqiy backend qaytaradigan JSON'ni qaytaradi.
 */

const asNum = (value: unknown): number => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

const asObj = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asList = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

function activeGrants() {
  return GRANTS.filter((grant) => grant.revoked_at === null);
}

function grantedItemIds(filialId: number): number[] {
  return activeGrants()
    .filter((grant) => grant.filial_id === filialId)
    .map((grant) => grant.item_id);
}

function assertCanWrite(itemIds: number[]) {
  if (session.role === "logist.main") return;
  const granted = grantedItemIds(session.filial_id);
  const missing = itemIds.find((id) => !granted.includes(id));
  if (missing !== undefined) fail(403, "grant_required", "Bu mahsulot bo'yicha dopusk yo'q", { item_id: missing });
}

function assertMain() {
  if (session.role !== "logist.main") fail(403, "role_forbidden", "Faqat asosiy logist");
}

function trackedItems(): MockItem[] {
  return ITEMS.filter((item) => item.stock_tracking);
}

function sold7d(locationIds: number[], itemId: number): number {
  const since = hoursAgo(7 * 24).getTime();
  return -LEDGER.filter(
    (row) =>
      locationIds.includes(row.location.id) &&
      row.item.id === itemId &&
      (row.movement_type === "sale" || row.movement_type === "gift" || row.movement_type === "sale_points") &&
      new Date(row.created_at).getTime() >= since,
  ).reduce((sum, row) => sum + row.quantity, 0);
}

function daysLeft(onHandQty: number, sold: number): number | null {
  if (sold <= 0) return null;
  return Math.round(onHandQty / (sold / 7));
}

function itemPublic(item: MockItem) {
  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    barcode: item.barcode,
    package_size: item.package_size,
    package_label: "karobka",
    unit_label: "dona",
    is_active: item.is_active,
    stock_tracking: item.stock_tracking,
    tracking_since: item.tracking_since,
    pinned: PINS.has(item.id),
    min_quantity: item.min_quantity,
  };
}

/** Qadalganlar oldin, keyin kam qolganlar, keyin nom (§17). */
function sortItems<T extends { item: { id: number; name: string }; is_low?: boolean }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const pin = Number(PINS.has(b.item.id)) - Number(PINS.has(a.item.id));
    if (pin !== 0) return pin;
    const low = Number(Boolean(b.is_low)) - Number(Boolean(a.is_low));
    if (low !== 0) return low;
    return a.item.name.localeCompare(b.item.name);
  });
}

function isToday(at: string): boolean {
  return at.slice(0, 10) === iso(new Date()).slice(0, 10);
}

function regionStats(code: string) {
  const stores = LOCATIONS.filter((location) => location.kind === "region" && location.region === code);
  const couriers = COURIERS.filter((courier) => courier.region === code);
  const tracked = trackedItems();
  let on_hand = 0;
  let with_couriers = 0;
  let low_items = 0;
  let negative = false;
  for (const item of tracked) {
    const inStores = stores.reduce((sum, store) => sum + onHand(store.id, item.id), 0);
    const held = couriers.reduce((sum, courier) => sum + onHand(courier.location_id, item.id), 0);
    on_hand += inStores;
    with_couriers += held;
    if (inStores < item.min_quantity) low_items += 1;
    // Manfiy qoldiq — bitta ombor/kuryerda ham bo'lsa `alert` (§6.1).
    if (
      stores.some((store) => onHand(store.id, item.id) < 0) ||
      couriers.some((courier) => onHand(courier.location_id, item.id) < 0)
    ) {
      negative = true;
    }
  }
  const delivered_today = LEDGER.filter(
    (row) => row.region === code && row.source?.type === "order" && isToday(row.created_at),
  ).length;
  return {
    code,
    name: regionName(code),
    on_hand,
    with_couriers,
    couriers: couriers.length,
    locations: stores.length,
    low_items,
    delivered_today,
    status: negative || stores.length === 0 ? "alert" : low_items > 0 ? "low" : "ok",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// §1 me · §3.1 regions · §3.2 locations · filials
// ─────────────────────────────────────────────────────────────────────────────

route("get", "/sklad/me/", () => ({
  role: session.role,
  filial_id: session.filial_id,
  region: session.role === "logist.main" ? "fargona" : "toshkent_shahar",
  can_write: true,
  granted_item_ids: session.role === "logist.main" ? [] : grantedItemIds(session.filial_id),
}));

route("get", "/sklad/regions/", () => SKLAD_REGIONS.map((region) => ({ code: region.code, name: region.name })));

route("get", "/sklad/locations/", ({ query }) =>
  LOCATIONS.filter(
    (location) =>
      (!query.kind || location.kind === query.kind) && (!query.region || location.region === query.region),
  ),
);

route("get", "/sklad/filials/", () => FILIALS);

// ─────────────────────────────────────────────────────────────────────────────
// §3.3 items · §16 tracking · §17 pin
// ─────────────────────────────────────────────────────────────────────────────

route("get", "/sklad/items/", ({ query }) => {
  const q = (query.q ?? "").toLowerCase();
  const rows = ITEMS.filter((item) => {
    if (query.barcode) return item.barcode === query.barcode;
    if (query.is_active === "true" && !item.is_active) return false;
    if (query.tracking === "on" && !item.stock_tracking) return false;
    if (query.tracking === "off" && item.stock_tracking) return false;
    if (!q) return true;
    return item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q) || item.barcode.includes(q);
  }).map((item) => ({ item: itemPublic(item), is_low: false }));
  return sortItems(rows).map((row) => row.item);
});

route("post", "/sklad/items/:id/tracking/on/", ({ params, json }) => {
  assertMain();
  const item = itemById(Number(params.id)) ?? fail(404, "not_found", "Mahsulot topilmadi");
  if (item.stock_tracking) fail(409, "validation_error", "Nazorat allaqachon yoqilgan");
  const body = asObj(json);
  const number = nextDocNumber("opening_balance");
  const stock: Array<{ location_id: number; item_id: number; on_hand: number }> = [];
  for (const entry of asList(body.opening)) {
    const row = asObj(entry);
    const locationId = asNum(row.location_id);
    const quantity = asNum(row.quantity);
    if (!locationById(locationId) || quantity <= 0) continue;
    const ledger = move(locationId, item.id, "opening_balance", quantity, { type: "document", id: nextId(), number }, session.user, String(body.note ?? ""));
    stock.push({ location_id: locationId, item_id: item.id, on_hand: ledger.balance_after });
  }
  item.stock_tracking = true;
  item.tracking_since = iso(new Date());
  if (body.min_quantity !== undefined) item.min_quantity = Math.max(0, asNum(body.min_quantity));
  return { item: itemPublic(item), document_number: number, stock };
});

route("post", "/sklad/items/:id/tracking/off/", ({ params }) => {
  assertMain();
  const item = itemById(Number(params.id)) ?? fail(404, "not_found", "Mahsulot topilmadi");
  item.stock_tracking = false;
  item.tracking_since = null;
  const now = iso(new Date());
  for (const grant of GRANTS) {
    if (grant.item_id === item.id && grant.revoked_at === null) grant.revoked_at = now;
  }
  return itemPublic(item);
});

route("put", "/sklad/items/:id/pin/", ({ params }) => {
  if (PINS.size >= 30) fail(409, "validation_error", "30 tadan ko'p qadab bo'lmaydi");
  PINS.add(Number(params.id));
  return { pinned: true };
});

route("delete", "/sklad/items/:id/pin/", ({ params }) => {
  PINS.delete(Number(params.id));
  return { pinned: false };
});

route("patch", "/sklad/stock/:location/:item/", ({ params, json }) => {
  const item = itemById(Number(params.item)) ?? fail(404, "not_found", "Mahsulot topilmadi");
  assertCanWrite([item.id]);
  item.min_quantity = Math.max(0, asNum(asObj(json).min_quantity));
  return { item_id: item.id, min_quantity: item.min_quantity };
});

// ─────────────────────────────────────────────────────────────────────────────
// §3.4 stock
// ─────────────────────────────────────────────────────────────────────────────

route("get", "/sklad/stock/", ({ query }) => {
  const locationId = query.location ? Number(query.location) : null;
  const itemId = query.item ? Number(query.item) : null;
  const rows: Array<Record<string, unknown>> = [];
  for (const location of LOCATIONS) {
    if (locationId !== null && location.id !== locationId) continue;
    for (const item of trackedItems()) {
      if (itemId !== null && item.id !== itemId) continue;
      const qty = onHand(location.id, item.id);
      const sold = sold7d([location.id], item.id);
      rows.push({
        location: { id: location.id, name: location.name, kind: location.kind, region: location.region },
        item: itemRef(item.id),
        on_hand: qty,
        min_quantity: item.min_quantity,
        is_low: location.kind === "region" && qty < item.min_quantity,
        sold_7d: sold,
        days_left: daysLeft(qty, sold),
        updated_at: iso(new Date()),
      });
    }
  }
  return rows;
});

// ─────────────────────────────────────────────────────────────────────────────
// §3.5 ledger · §6.3 summary
// ─────────────────────────────────────────────────────────────────────────────

function ledgerFiltered(query: Record<string, string>): MockLedger[] {
  const from = query.date_from ? `${query.date_from}T00:00:00` : null;
  const to = query.date_to ? `${query.date_to}T23:59:59` : null;
  const q = (query.q ?? "").toLowerCase();
  return LEDGER.filter((row) => {
    if (query.region && row.region !== query.region) return false;
    if (query.location && row.location.id !== Number(query.location)) return false;
    if (query.item && row.item.id !== Number(query.item)) return false;
    if (query.movement_type && !query.movement_type.split(",").includes(row.movement_type)) return false;
    if (query.source_type && row.source?.type !== query.source_type) return false;
    if (from && row.created_at < from) return false;
    if (to && row.created_at > to) return false;
    if (q && !(row.source?.number.toLowerCase().includes(q) || row.item.name.toLowerCase().includes(q))) return false;
    return true;
  }).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

route("get", "/sklad/ledger/", ({ query }) => {
  const rows = ledgerFiltered(query);
  const page = Math.max(1, Number(query.page ?? 1));
  const size = Math.max(1, Number(query.page_size ?? 50));
  const start = (page - 1) * size;
  return {
    count: rows.length,
    next: start + size < rows.length ? page + 1 : null,
    previous: page > 1 ? page - 1 : null,
    results: rows.slice(start, start + size),
  };
});

route("get", "/sklad/ledger/summary/", ({ query }) => {
  const rows = ledgerFiltered(query);
  const sum = (type: string) => rows.filter((row) => row.movement_type === type).reduce((acc, row) => acc + row.quantity, 0);
  const orders = new Set(rows.filter((row) => row.source?.type === "order").map((row) => row.source!.id));
  const receiptDocs = new Set(rows.filter((row) => row.movement_type === "receipt").map((row) => row.source?.number));
  return {
    sale: sum("sale"),
    gift: sum("gift"),
    sale_points: sum("sale_points"),
    courier_load: rows.filter((row) => row.movement_type === "courier_load" && row.quantity < 0).reduce((acc, row) => acc + row.quantity, 0),
    receipt: sum("receipt"),
    write_off: sum("write_off"),
    orders_delivered: orders.size,
    receipt_docs: receiptDocs.size,
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// §3.6, §4 documents
// ─────────────────────────────────────────────────────────────────────────────

type Line = { item_id: number; quantity: number; actual_qty?: number };

function readLines(json: Record<string, unknown>): Line[] {
  const lines = asList(json.lines).map((entry) => {
    const row = asObj(entry);
    return {
      item_id: asNum(row.item_id),
      quantity: asNum(row.quantity),
      actual_qty: row.actual_qty === undefined ? undefined : asNum(row.actual_qty),
    };
  });
  if (lines.length === 0) fail(400, "validation_error", "Kamida bitta qator kerak", { fields: { lines: ["bo'sh"] } });
  for (const line of lines) {
    const item = itemById(line.item_id) ?? fail(404, "not_found", `Mahsulot #${line.item_id} topilmadi`);
    if (!item.is_active) fail(409, "item_inactive", `${item.name} faol emas`);
    if (!item.stock_tracking) fail(409, "tracking_off", `${item.name} nazoratga olinmagan`);
  }
  assertCanWrite(lines.map((line) => line.item_id));
  return lines;
}

function assertStock(locationId: number, lines: Line[]) {
  const shortages = lines
    .filter((line) => onHand(locationId, line.item_id) < line.quantity)
    .map((line) => ({
      item_id: line.item_id,
      name: itemRef(line.item_id).name,
      need: line.quantity,
      available: onHand(locationId, line.item_id),
      location_id: locationId,
    }));
  if (shortages.length > 0) fail(409, "insufficient_stock", "Omborda yetarli emas", { shortages });
}

function buildDocument(
  type: string,
  location: ReturnType<typeof locationById>,
  courier: ReturnType<typeof courierById> | null,
  body: Record<string, unknown>,
  lines: Array<{ item: ReturnType<typeof itemRef>; quantity: number; before: number | null; after: number | null }>,
  stock: Array<{ location_id: number; item_id: number; on_hand: number }>,
) {
  const doc = {
    id: nextId(),
    number: nextDocNumber(type),
    type,
    status: "confirmed",
    location: location ? { id: location.id, name: location.name, region: location.region } : null,
    courier: courier ? { id: courier.id, full_name: courier.name } : null,
    reason: body.reason ?? null,
    supplier: body.supplier ?? "",
    ref_number: body.ref_number ?? "",
    note: body.note ?? "",
    lines,
    total_qty: lines.reduce((sum, line) => sum + Math.abs(line.quantity), 0),
    lines_count: lines.length,
    created_by: session.user,
    created_at: iso(new Date()),
    version: 1,
    stock,
  };
  DOCUMENTS.unshift(doc);
  return doc;
}

route("post", "/sklad/documents/", ({ json }) => {
  const body = asObj(json);
  const type = String(body.type ?? "");
  const lines = readLines(body);
  const source = (number: string) => ({ type: "document", id: nextId(), number });

  if (type === "receipt" || type === "write_off") {
    const location = locationById(asNum(body.location_id)) ?? fail(404, "not_found", "Ombor topilmadi");
    if (location.kind !== "region") fail(400, "validation_error", "Faqat viloyat ombori");
    if (type === "write_off") {
      if (!body.reason) fail(400, "validation_error", "Sabab majburiy", { fields: { reason: ["majburiy"] } });
      assertStock(location.id, lines);
    }
    const number = nextDocNumber(type);
    const stock = lines.map((line) => {
      const row = move(location.id, line.item_id, type, type === "receipt" ? line.quantity : -line.quantity, source(number), session.user, String(body.note ?? ""));
      return { location_id: location.id, item_id: line.item_id, on_hand: row.balance_after };
    });
    return buildDocument(type, location, null, body, lines.map((line) => ({ item: itemRef(line.item_id), quantity: line.quantity, before: null, after: null })), stock);
  }

  if (type === "courier_load" || type === "courier_return") {
    const location = locationById(asNum(body.location_id)) ?? fail(404, "not_found", "Ombor topilmadi");
    const courier = courierById(asNum(body.courier_id)) ?? fail(404, "not_found", "Kuryer topilmadi");
    if (courier.region !== location.region) fail(409, "courier_region_mismatch", "Kuryer boshqa viloyatniki");
    const fromId = type === "courier_load" ? location.id : courier.location_id;
    const toId = type === "courier_load" ? courier.location_id : location.id;
    let effective = lines;
    if (type === "courier_return" && body.mode === "all") {
      effective = trackedItems()
        .map((item) => ({ item_id: item.id, quantity: onHand(courier.location_id, item.id) }))
        .filter((line) => line.quantity > 0);
    }
    assertStock(fromId, effective);
    const number = nextDocNumber(type);
    const stock: Array<{ location_id: number; item_id: number; on_hand: number }> = [];
    for (const line of effective) {
      const out = move(fromId, line.item_id, type, -line.quantity, source(number), session.user, String(body.note ?? ""));
      const into = move(toId, line.item_id, type, line.quantity, source(number), session.user, String(body.note ?? ""));
      stock.push({ location_id: fromId, item_id: line.item_id, on_hand: out.balance_after });
      stock.push({ location_id: toId, item_id: line.item_id, on_hand: into.balance_after });
    }
    return buildDocument(type, location, courier, body, effective.map((line) => ({ item: itemRef(line.item_id), quantity: line.quantity, before: null, after: null })), stock);
  }

  if (type === "adjustment") {
    const courier = body.courier_id ? courierById(asNum(body.courier_id)) ?? fail(404, "not_found", "Kuryer topilmadi") : null;
    const location = courier ? locationById(courier.location_id) : locationById(asNum(body.location_id));
    if (!location) fail(404, "not_found", "Ombor topilmadi");
    const number = nextDocNumber(type);
    const stock: Array<{ location_id: number; item_id: number; on_hand: number }> = [];
    const docLines = lines.map((line) => {
      const before = onHand(location.id, line.item_id);
      const after = line.actual_qty ?? line.quantity;
      const row = move(location.id, line.item_id, "adjustment", after - before, source(number), session.user, String(body.note ?? ""));
      stock.push({ location_id: location.id, item_id: line.item_id, on_hand: row.balance_after });
      return { item: itemRef(line.item_id), quantity: after - before, before, after };
    });
    return buildDocument(type, courier ? primaryOf(courier.region) : location, courier, body, docLines, stock);
  }

  return fail(400, "validation_error", "Noma'lum hujjat turi", { fields: { type: ["noma'lum"] } });
});

route("get", "/sklad/documents/", () => DOCUMENTS);

// ─────────────────────────────────────────────────────────────────────────────
// §6.1 overview · §6.2 region panel
// ─────────────────────────────────────────────────────────────────────────────

route("get", "/sklad/overview/", () => {
  const regions = SKLAD_REGIONS.map((region) => regionStats(region.code));
  const today = LEDGER.filter((row) => isToday(row.created_at));
  const receipts = today.filter((row) => row.movement_type === "receipt");
  return {
    as_of: iso(new Date()),
    totals: {
      on_hand: regions.reduce((sum, r) => sum + r.on_hand, 0),
      locations: LOCATIONS.filter((location) => location.kind === "region").length,
      with_couriers: regions.reduce((sum, r) => sum + r.with_couriers, 0),
      couriers: COURIERS.length,
      low_items: regions.reduce((sum, r) => sum + r.low_items, 0),
      low_regions: regions.filter((r) => r.status !== "ok").length,
      delivered_today: new Set(today.filter((row) => row.source?.type === "order").map((row) => row.source!.id)).size,
      sold_today_qty: -today.filter((row) => row.source?.type === "order").reduce((sum, row) => sum + row.quantity, 0),
      receipt_today_qty: receipts.reduce((sum, row) => sum + row.quantity, 0),
      receipt_today_docs: new Set(receipts.map((row) => row.source?.number)).size,
    },
    regions,
  };
});

route("get", "/sklad/regions/:code/", ({ params }) => {
  const code = params.code!;
  if (!SKLAD_REGIONS.some((region) => region.code === code)) fail(404, "not_found", "Viloyat topilmadi");
  const stores = LOCATIONS.filter((location) => location.kind === "region" && location.region === code);
  const couriers = COURIERS.filter((courier) => courier.region === code);
  const stats = regionStats(code);
  const items = trackedItems().map((item) => {
    const by_location: Record<string, number> = {};
    let inStores = 0;
    for (const store of stores) {
      const qty = onHand(store.id, item.id);
      by_location[String(store.id)] = qty;
      inStores += qty;
    }
    const held = couriers.reduce((sum, courier) => sum + onHand(courier.location_id, item.id), 0);
    const sold = sold7d(couriers.map((courier) => courier.location_id), item.id);
    return {
      item: itemRef(item.id) && { ...itemRef(item.id), pinned: PINS.has(item.id) },
      by_location,
      on_hand: inStores,
      with_couriers: held,
      total: inStores + held,
      min_quantity: item.min_quantity,
      is_low: inStores < item.min_quantity,
      sold_7d: sold,
      days_left: daysLeft(inStores, sold),
    };
  });
  const recent = LEDGER.filter((row) => row.region === code).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 10);
  const byHour = new Map<number, number>();
  for (const row of LEDGER) {
    if (row.region !== code || row.source?.type !== "order" || !isToday(row.created_at)) continue;
    const hour = Number(row.created_at.slice(11, 13));
    byHour.set(hour, (byHour.get(hour) ?? 0) + 1);
  }
  return {
    region: { code, name: regionName(code) },
    locations: stores.map((store) => ({
      id: store.id,
      name: store.name,
      is_primary: store.is_primary,
      on_hand: trackedItems().reduce((sum, item) => sum + onHand(store.id, item.id), 0),
    })),
    totals: {
      on_hand: stats.on_hand,
      with_couriers: stats.with_couriers,
      low_items: stats.low_items,
      delivered_today: stats.delivered_today,
    },
    items: sortItems(items),
    couriers: couriers.map((courier) => courierRow(courier)).map((row) => ({
      id: row.id,
      full_name: row.full_name,
      on_shift: row.on_shift,
      on_hand: row.on_hand,
      last_load_at: row.last_load?.at ?? null,
      last_load_number: row.last_load?.number ?? null,
      last_sale_at: row.last_sale_at,
    })),
    recent,
    delivered_by_hour: [...byHour.entries()].sort((a, b) => a[0] - b[0]).map(([hour, count]) => ({ hour, count })),
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// §6.4 couriers · §6.5 courier detail
// ─────────────────────────────────────────────────────────────────────────────

function courierRow(courier: (typeof COURIERS)[number]) {
  const items = trackedItems()
    .map((item) => ({ item: itemRef(item.id), quantity: onHand(courier.location_id, item.id) }))
    .filter((row) => row.quantity !== 0);
  const rows = LEDGER.filter((row) => row.location.id === courier.location_id);
  const loads = rows.filter((row) => row.movement_type === "courier_load" && row.quantity > 0);
  const lastLoad = loads.at(-1) ?? null;
  const sales = rows.filter((row) => row.source?.type === "order");
  const lastSale = sales.map((row) => row.created_at).sort().at(-1) ?? courier.last_sale_at;
  const lastActivity = [lastSale, lastLoad?.created_at].filter(Boolean).sort().at(-1);
  const idle = lastActivity ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / 86_400_000) : 0;
  return {
    id: courier.id,
    full_name: courier.name,
    phone: courier.phone,
    region: courier.region,
    on_shift: courier.on_shift,
    location_id: courier.location_id,
    on_hand: items.reduce((sum, row) => sum + row.quantity, 0),
    items,
    delivered_today: sales.filter((row) => isToday(row.created_at)).length,
    delivered_7d: sales.filter((row) => new Date(row.created_at).getTime() >= hoursAgo(7 * 24).getTime()).length,
    last_load: lastLoad ? { number: lastLoad.source?.number ?? "", at: lastLoad.created_at } : null,
    last_sale_at: lastSale,
    idle_days: idle,
  };
}

route("get", "/sklad/couriers/", ({ query }) =>
  COURIERS.filter((courier) => !query.region || courier.region === query.region).map(courierRow),
);

route("get", "/sklad/couriers/:id/", ({ params }) => {
  const courier = courierById(Number(params.id)) ?? fail(404, "not_found", "Kuryer topilmadi");
  const rows = LEDGER.filter((row) => row.location.id === courier.location_id);
  const lastLoadAt = rows.filter((row) => row.movement_type === "courier_load" && row.quantity > 0).at(-1)?.created_at ?? "";
  const stock = trackedItems()
    .map((item) => {
      const mine = rows.filter((row) => row.item.id === item.id && row.created_at >= lastLoadAt);
      const loaded = mine.filter((row) => row.quantity > 0 && row.movement_type !== "adjustment").reduce((sum, row) => sum + row.quantity, 0);
      const sold = -mine.filter((row) => row.source?.type === "order").reduce((sum, row) => sum + row.quantity, 0);
      return { item: itemRef(item.id), loaded, sold, on_hand: onHand(courier.location_id, item.id) };
    })
    .filter((row) => row.loaded !== 0 || row.sold !== 0 || row.on_hand !== 0);
  return {
    courier: courierRow(courier),
    stock,
    ledger: [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 50),
    returns_7d: rows.filter((row) => row.movement_type === "courier_return").length,
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// §15 grants
// ─────────────────────────────────────────────────────────────────────────────

function grantPublic(grant: (typeof GRANTS)[number]) {
  const filial = FILIALS.find((entry) => entry.id === grant.filial_id);
  return {
    id: grant.id,
    item_id: grant.item_id,
    item: itemRef(grant.item_id),
    filial_id: grant.filial_id,
    filial: filial ?? { id: grant.filial_id, name: `#${grant.filial_id}` },
    granted_by: grant.granted_by,
    granted_at: grant.granted_at,
    revoked_at: grant.revoked_at,
    note: grant.note,
  };
}

route("get", "/sklad/grants/", ({ query }) =>
  activeGrants()
    .filter((grant) => (!query.item || grant.item_id === Number(query.item)) && (!query.filial || grant.filial_id === Number(query.filial)))
    .map(grantPublic),
);

route("get", "/sklad/grants/mine/", () =>
  activeGrants().filter((grant) => grant.filial_id === session.filial_id).map(grantPublic),
);

route("post", "/sklad/grants/", ({ json }) => {
  assertMain();
  const body = asObj(json);
  const filialId = asNum(body.filial_id);
  if (!FILIALS.some((filial) => filial.id === filialId)) fail(404, "not_found", "Filial topilmadi");
  const created: unknown[] = [];
  for (const raw of asList(body.item_ids)) {
    const itemId = asNum(raw);
    const item = itemById(itemId) ?? fail(404, "not_found", "Mahsulot topilmadi");
    if (!item.stock_tracking) fail(409, "tracking_required_for_grant", `${item.name}: avval nazoratni yoqing`);
    if (activeGrants().some((grant) => grant.item_id === itemId && grant.filial_id === filialId)) continue;
    const grant = { id: nextId(), item_id: itemId, filial_id: filialId, granted_by: session.user, granted_at: iso(new Date()), revoked_at: null, note: String(body.note ?? "") };
    GRANTS.push(grant);
    created.push(grantPublic(grant));
  }
  return created;
});

route("delete", "/sklad/grants/:id/", ({ params }) => {
  assertMain();
  const grant = GRANTS.find((entry) => entry.id === Number(params.id)) ?? fail(404, "not_found", "Dopusk topilmadi");
  grant.revoked_at = iso(new Date());
  return undefined;
});

export type { MockContext };
