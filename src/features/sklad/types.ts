import { parseDate } from "@/lib/format";
import {
  asArray,
  asBool,
  asInt,
  asOptionalInt,
  asOptionalString,
  asRecord,
  asString,
  isRecord,
} from "@/lib/parse";

/**
 * Sklad modellari — `18_SKLAD_MOLIYA_ANALITIKA_BACKEND_TZ.md` §1, §3, §6,
 * §15–17. Backend javobi hom holda o'qilmaydi: har model `map*` orqali
 * keladi, maydon kutilmagan turda bo'lsa UI qulamaydi.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Rol (§1)
// ─────────────────────────────────────────────────────────────────────────────

export type SkladRole = "logist.main" | "logist.branch" | "crm";

export type SkladMe = {
  role: SkladRole;
  filialId: number | null;
  region: string | null;
  canWrite: boolean;
  /** `logist.branch` uchun o'z filialiga dopusk berilgan mahsulotlar. */
  grantedItemIds: number[];
};

export function mapSkladMe(raw: unknown): SkladMe {
  const json = asRecord(raw);
  const role = asString(json.role);
  return {
    role:
      role === "logist.main" || role === "logist.branch" ? role : "crm",
    filialId: asOptionalInt(json.filial_id),
    region: asOptionalString(json.region),
    canWrite: asBool(json.can_write),
    grantedItemIds: asArray(json.granted_item_ids).map((id) => asInt(id)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Ombor (§3.2)
// ─────────────────────────────────────────────────────────────────────────────

export type LocationKind = "region" | "courier";

export type SkladLocation = {
  id: number;
  kind: LocationKind;
  name: string;
  region: string | null;
  /** Viloyatdagi sukut ombor — kuryer shu yerdan oladi. */
  isPrimary: boolean;
  isActive: boolean;
  courier: { id: number; fullName: string } | null;
};

export function mapLocation(raw: unknown): SkladLocation {
  const json = asRecord(raw);
  const courier = isRecord(json.courier) ? json.courier : null;
  return {
    id: asInt(json.id),
    kind: asString(json.kind) === "courier" ? "courier" : "region",
    name: asString(json.name),
    region: asOptionalString(json.region),
    isPrimary: asBool(json.is_primary),
    isActive: asBool(json.is_active, true),
    courier: courier
      ? { id: asInt(courier.id), fullName: asString(courier.full_name) }
      : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mahsulot (§3.3, §16, §17)
// ─────────────────────────────────────────────────────────────────────────────

export type SkladItem = {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  /** Karobkada nechta dona. */
  packageSize: number;
  isActive: boolean;
  /** Qoldiq nazorati yoqiqmi (§16); o'chiq — skladda «cheksiz». */
  stockTracking: boolean;
  trackingSince: Date | null;
  /** So'rovchi o'zi uchun qadaganmi (§17). */
  pinned: boolean;
};

export function mapItem(raw: unknown): SkladItem {
  const json = asRecord(raw);
  return {
    id: asInt(json.id),
    name: asString(json.name ?? json.title),
    sku: asString(json.sku),
    barcode: asString(json.barcode),
    packageSize: Math.max(1, asInt(json.package_size, 1)),
    isActive: json.is_active !== false,
    stockTracking: asBool(json.stock_tracking),
    trackingSince: parseDate(json.tracking_since),
    pinned: asBool(json.pinned),
  };
}

/** Qisqa mahsulot havolasi — daftar, hujjat, kuryer qatorlarida. */
export type ItemRef = { id: number; name: string; sku: string };

export function mapItemRef(raw: unknown): ItemRef {
  const json = asRecord(raw);
  return {
    id: asInt(json.id),
    name: asString(json.name ?? json.title),
    sku: asString(json.sku),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Qoldiq (§3.4)
// ─────────────────────────────────────────────────────────────────────────────

export type StockRow = {
  location: { id: number; name: string; kind: LocationKind; region: string | null };
  item: ItemRef & { packageSize: number };
  onHand: number;
  minQuantity: number;
  isLow: boolean;
  sold7d: number;
  daysLeft: number | null;
};

export function mapStockRow(raw: unknown): StockRow {
  const json = asRecord(raw);
  const location = asRecord(json.location);
  const item = asRecord(json.item);
  return {
    location: {
      id: asInt(location.id),
      name: asString(location.name),
      kind: asString(location.kind) === "courier" ? "courier" : "region",
      region: asOptionalString(location.region),
    },
    item: { ...mapItemRef(item), packageSize: Math.max(1, asInt(item.package_size, 1)) },
    onHand: asInt(json.on_hand),
    minQuantity: asInt(json.min_quantity),
    isLow: asBool(json.is_low),
    sold7d: asInt(json.sold_7d),
    daysLeft: asOptionalInt(json.days_left),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Daftar (§3.5)
// ─────────────────────────────────────────────────────────────────────────────

export const MOVEMENT_TYPES = [
  { value: "receipt", label: "Kirim", color: "var(--ok)", sign: 1 },
  { value: "write_off", label: "Chiqim", color: "var(--danger)", sign: -1 },
  { value: "courier_load", label: "Kuryerga", color: "var(--info)", sign: -1 },
  { value: "courier_return", label: "Kuryerdan", color: "var(--info)", sign: 1 },
  { value: "adjustment", label: "Tuzatish", color: "var(--warn)", sign: 0 },
  { value: "sale", label: "Sotuv", color: "var(--order-delivered)", sign: -1 },
  { value: "gift", label: "Sovg'a", color: "var(--transfer-preparing)", sign: -1 },
  { value: "sale_points", label: "Ball bilan", color: "var(--transfer-preparing)", sign: -1 },
  { value: "sale_return", label: "Qaytdi", color: "var(--warn)", sign: 1 },
  { value: "opening_balance", label: "Boshlang'ich", color: "var(--ink-muted)", sign: 1 },
] as const;

export type MovementType = (typeof MOVEMENT_TYPES)[number]["value"];

const UNKNOWN_MOVEMENT = {
  value: "adjustment",
  label: "Harakat",
  color: "var(--ink-muted)",
  sign: 0,
} as const;

export function movementInfo(type: string) {
  return MOVEMENT_TYPES.find((entry) => entry.value === type) ?? UNKNOWN_MOVEMENT;
}

export type LedgerRow = {
  id: number;
  createdAt: Date | null;
  region: string | null;
  location: { id: number; name: string; kind: LocationKind };
  item: ItemRef;
  movementType: string;
  quantity: number;
  balanceAfter: number;
  source: { type: string; id: number; number: string } | null;
  actor: { id: number; fullName: string; kind: string } | null;
  note: string;
};

export function mapLedgerRow(raw: unknown): LedgerRow {
  const json = asRecord(raw);
  const location = asRecord(json.location);
  const source = isRecord(json.source) ? json.source : null;
  const actor = isRecord(json.actor) ? json.actor : null;
  return {
    id: asInt(json.id),
    createdAt: parseDate(json.created_at),
    region: asOptionalString(json.region),
    location: {
      id: asInt(location.id),
      name: asString(location.name),
      kind: asString(location.kind) === "courier" ? "courier" : "region",
    },
    item: mapItemRef(json.item),
    movementType: asString(json.movement_type),
    quantity: asInt(json.quantity),
    balanceAfter: asInt(json.balance_after),
    source: source
      ? { type: asString(source.type), id: asInt(source.id), number: asString(source.number) }
      : null,
    actor: actor
      ? { id: asInt(actor.id), fullName: asString(actor.full_name), kind: asString(actor.kind) }
      : null,
    note: asString(json.note),
  };
}

export type LedgerSummary = {
  sale: number;
  gift: number;
  salePoints: number;
  courierLoad: number;
  receipt: number;
  writeOff: number;
  ordersDelivered: number;
  receiptDocs: number;
};

export function mapLedgerSummary(raw: unknown): LedgerSummary {
  const json = asRecord(raw);
  return {
    sale: asInt(json.sale),
    gift: asInt(json.gift),
    salePoints: asInt(json.sale_points),
    courierLoad: asInt(json.courier_load),
    receipt: asInt(json.receipt),
    writeOff: asInt(json.write_off),
    ordersDelivered: asInt(json.orders_delivered),
    receiptDocs: asInt(json.receipt_docs),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hujjat (§3.6, §4)
// ─────────────────────────────────────────────────────────────────────────────

export type DocumentType =
  | "receipt"
  | "write_off"
  | "courier_load"
  | "courier_return"
  | "adjustment";

/** Chiqim va tuzatish sabablari (§4.2, §4.5). */
export const WRITE_OFF_REASONS = [
  { value: "damaged", label: "Shikastlangan" },
  { value: "expired", label: "Muddati o'tgan" },
  { value: "sample", label: "Namuna" },
  { value: "lost", label: "Yo'qolgan" },
  { value: "other", label: "Boshqa" },
] as const;

export const ADJUSTMENT_REASONS = [
  { value: "count_diff", label: "Sanoq farqi" },
  { value: "app_error", label: "Ilova xatosi" },
  { value: "other", label: "Boshqa" },
] as const;

export type SkladDocument = {
  id: number;
  number: string;
  type: DocumentType;
  status: "confirmed" | "cancelled";
  location: { id: number; name: string; region: string | null };
  courier: { id: number; fullName: string } | null;
  reason: string | null;
  note: string;
  lines: Array<{ item: ItemRef; quantity: number; before: number | null; after: number | null }>;
  totalQty: number;
  createdBy: string | null;
  createdAt: Date | null;
  /** Yozuvdan keyingi yangi qoldiqlar (§4.8) — UI qayta so'ramaydi. */
  stock: Array<{ locationId: number; itemId: number; onHand: number }>;
};

export function mapDocument(raw: unknown): SkladDocument {
  const json = asRecord(raw);
  const location = asRecord(json.location);
  const courier = isRecord(json.courier) ? json.courier : null;
  const type = asString(json.type);
  return {
    id: asInt(json.id),
    number: asString(json.number),
    type: isDocumentType(type) ? type : "adjustment",
    status: asString(json.status) === "cancelled" ? "cancelled" : "confirmed",
    location: {
      id: asInt(location.id),
      name: asString(location.name),
      region: asOptionalString(location.region),
    },
    courier: courier ? { id: asInt(courier.id), fullName: asString(courier.full_name) } : null,
    reason: asOptionalString(json.reason),
    note: asString(json.note),
    lines: asArray(json.lines).map((line) => {
      const row = asRecord(line);
      return {
        item: mapItemRef(row.item),
        quantity: asInt(row.quantity),
        before: asOptionalInt(row.before),
        after: asOptionalInt(row.after),
      };
    }),
    totalQty: asInt(json.total_qty),
    createdBy: asOptionalString(asRecord(json.created_by).full_name),
    createdAt: parseDate(json.created_at),
    stock: asArray(json.stock).map((entry) => {
      const row = asRecord(entry);
      return {
        locationId: asInt(row.location_id),
        itemId: asInt(row.item_id),
        onHand: asInt(row.on_hand),
      };
    }),
  };
}

function isDocumentType(value: string): value is DocumentType {
  return (
    value === "receipt" ||
    value === "write_off" ||
    value === "courier_load" ||
    value === "courier_return" ||
    value === "adjustment"
  );
}

/** `409 insufficient_stock` javobidagi yetishmovchilik qatorlari. */
export type Shortage = {
  itemId: number;
  name: string;
  need: number;
  available: number;
  locationId: number | null;
};

export function mapShortages(data: unknown): Shortage[] {
  return asArray(asRecord(data).shortages).map((entry) => {
    const row = asRecord(entry);
    return {
      itemId: asInt(row.item_id),
      name: asString(row.name),
      need: asInt(row.need),
      available: asInt(row.available),
      locationId: asOptionalInt(row.location_id),
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Doska (§6.1) va viloyat paneli (§6.2)
// ─────────────────────────────────────────────────────────────────────────────

export type RegionStatus = "ok" | "low" | "alert";

export type RegionSummary = {
  code: string;
  name: string;
  onHand: number;
  withCouriers: number;
  couriers: number;
  locations: number;
  lowItems: number;
  deliveredToday: number;
  status: RegionStatus;
};

export type SkladOverview = {
  asOf: Date | null;
  totals: {
    onHand: number;
    locations: number;
    withCouriers: number;
    couriers: number;
    lowItems: number;
    lowRegions: number;
    deliveredToday: number;
    soldTodayQty: number;
    receiptTodayQty: number;
    receiptTodayDocs: number;
  };
  regions: RegionSummary[];
};

function asRegionStatus(value: unknown): RegionStatus {
  const text = asString(value);
  return text === "low" || text === "alert" ? text : "ok";
}

export function mapOverview(raw: unknown): SkladOverview {
  const json = asRecord(raw);
  const totals = asRecord(json.totals);
  return {
    asOf: parseDate(json.as_of),
    totals: {
      onHand: asInt(totals.on_hand),
      locations: asInt(totals.locations),
      withCouriers: asInt(totals.with_couriers),
      couriers: asInt(totals.couriers),
      lowItems: asInt(totals.low_items),
      lowRegions: asInt(totals.low_regions),
      deliveredToday: asInt(totals.delivered_today),
      soldTodayQty: asInt(totals.sold_today_qty),
      receiptTodayQty: asInt(totals.receipt_today_qty),
      receiptTodayDocs: asInt(totals.receipt_today_docs),
    },
    regions: asArray(json.regions).map((entry) => {
      const row = asRecord(entry);
      return {
        code: asString(row.code),
        name: asString(row.name),
        onHand: asInt(row.on_hand),
        withCouriers: asInt(row.with_couriers),
        couriers: asInt(row.couriers),
        locations: asInt(row.locations),
        lowItems: asInt(row.low_items),
        deliveredToday: asInt(row.delivered_today),
        status: asRegionStatus(row.status),
      };
    }),
  };
}

export type RegionItem = {
  item: ItemRef & { packageSize: number; pinned: boolean };
  byLocation: Record<string, number>;
  onHand: number;
  withCouriers: number;
  total: number;
  minQuantity: number;
  isLow: boolean;
  sold7d: number;
  daysLeft: number | null;
};

export type RegionCourier = {
  id: number;
  fullName: string;
  onShift: boolean;
  onHand: number;
  lastLoadAt: Date | null;
  lastLoadNumber: string | null;
  lastSaleAt: Date | null;
};

export type RegionPanel = {
  region: { code: string; name: string };
  locations: Array<{ id: number; name: string; isPrimary: boolean; onHand: number }>;
  totals: { onHand: number; withCouriers: number; lowItems: number; deliveredToday: number };
  items: RegionItem[];
  couriers: RegionCourier[];
  recent: LedgerRow[];
  deliveredByHour: Array<{ hour: number; count: number }>;
};

export function mapRegionPanel(raw: unknown): RegionPanel {
  const json = asRecord(raw);
  const region = asRecord(json.region);
  const totals = asRecord(json.totals);
  return {
    region: { code: asString(region.code), name: asString(region.name) },
    locations: asArray(json.locations).map((entry) => {
      const row = asRecord(entry);
      return {
        id: asInt(row.id),
        name: asString(row.name),
        isPrimary: asBool(row.is_primary),
        onHand: asInt(row.on_hand),
      };
    }),
    totals: {
      onHand: asInt(totals.on_hand),
      withCouriers: asInt(totals.with_couriers),
      lowItems: asInt(totals.low_items),
      deliveredToday: asInt(totals.delivered_today),
    },
    items: asArray(json.items).map(mapRegionItem),
    couriers: asArray(json.couriers).map((entry) => {
      const row = asRecord(entry);
      return {
        id: asInt(row.id),
        fullName: asString(row.full_name),
        onShift: asBool(row.on_shift),
        onHand: asInt(row.on_hand),
        lastLoadAt: parseDate(row.last_load_at),
        lastLoadNumber: asOptionalString(row.last_load_number),
        lastSaleAt: parseDate(row.last_sale_at),
      };
    }),
    recent: asArray(json.recent).map(mapLedgerRow),
    deliveredByHour: asArray(json.delivered_by_hour).map((entry) => {
      const row = asRecord(entry);
      return { hour: asInt(row.hour), count: asInt(row.count) };
    }),
  };
}

function mapRegionItem(raw: unknown): RegionItem {
  const json = asRecord(raw);
  const item = asRecord(json.item);
  const byLocation: Record<string, number> = {};
  for (const [key, value] of Object.entries(asRecord(json.by_location))) {
    byLocation[key] = asInt(value);
  }
  return {
    item: {
      ...mapItemRef(item),
      packageSize: Math.max(1, asInt(item.package_size, 1)),
      pinned: asBool(item.pinned),
    },
    byLocation,
    onHand: asInt(json.on_hand),
    withCouriers: asInt(json.with_couriers),
    total: asInt(json.total),
    minQuantity: asInt(json.min_quantity),
    isLow: asBool(json.is_low),
    sold7d: asInt(json.sold_7d),
    daysLeft: asOptionalInt(json.days_left),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Kuryerlar (§6.4, §6.5)
// ─────────────────────────────────────────────────────────────────────────────

export type CourierStock = {
  id: number;
  fullName: string;
  phone: string;
  region: string | null;
  onShift: boolean;
  locationId: number;
  onHand: number;
  items: Array<{ item: ItemRef; quantity: number }>;
  deliveredToday: number;
  delivered7d: number;
  lastLoad: { number: string; at: Date | null } | null;
  lastSaleAt: Date | null;
  /** Oxirgi sotuv/olishdan beri kun; 5+ — UI ko'rsatadi (ayb emas, ma'lumot). */
  idleDays: number;
};

export function mapCourierStock(raw: unknown): CourierStock {
  const json = asRecord(raw);
  const lastLoad = isRecord(json.last_load) ? json.last_load : null;
  return {
    id: asInt(json.id),
    fullName: asString(json.full_name),
    phone: asString(json.phone),
    region: asOptionalString(json.region),
    onShift: asBool(json.on_shift),
    locationId: asInt(json.location_id),
    onHand: asInt(json.on_hand),
    items: asArray(json.items).map((entry) => {
      const row = asRecord(entry);
      return { item: mapItemRef(row.item), quantity: asInt(row.quantity) };
    }),
    deliveredToday: asInt(json.delivered_today),
    delivered7d: asInt(json.delivered_7d),
    lastLoad: lastLoad
      ? { number: asString(lastLoad.number), at: parseDate(lastLoad.at) }
      : null,
    lastSaleAt: parseDate(json.last_sale_at),
    idleDays: asInt(json.idle_days),
  };
}

export type CourierDetail = {
  courier: CourierStock;
  /** Oxirgi olishdan beri: oldi · sotdi · qoldi. */
  stock: Array<{ item: ItemRef; loaded: number; sold: number; onHand: number }>;
  ledger: LedgerRow[];
  returns7d: number;
};

export function mapCourierDetail(raw: unknown): CourierDetail {
  const json = asRecord(raw);
  return {
    courier: mapCourierStock(json.courier),
    stock: asArray(json.stock).map((entry) => {
      const row = asRecord(entry);
      return {
        item: mapItemRef(row.item),
        loaded: asInt(row.loaded),
        sold: asInt(row.sold),
        onHand: asInt(row.on_hand),
      };
    }),
    ledger: asArray(json.ledger).map(mapLedgerRow),
    returns7d: asInt(json.returns_7d),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dopusk (§15)
// ─────────────────────────────────────────────────────────────────────────────

export type StockGrant = {
  id: number;
  itemId: number;
  filial: { id: number; name: string };
  grantedBy: string | null;
  grantedAt: Date | null;
  note: string;
};

export function mapGrant(raw: unknown): StockGrant {
  const json = asRecord(raw);
  const filial = asRecord(json.filial);
  return {
    id: asInt(json.id),
    itemId: asInt(json.item_id ?? asRecord(json.item).id),
    filial: {
      id: asInt(filial.id ?? json.filial_id),
      name: asString(filial.name),
    },
    grantedBy: asOptionalString(
      isRecord(json.granted_by) ? json.granted_by.full_name : json.granted_by,
    ),
    grantedAt: parseDate(json.granted_at),
    note: asString(json.note),
  };
}

export type FilialRef = { id: number; name: string };

export function mapFilialRef(raw: unknown): FilialRef {
  const json = asRecord(raw);
  return { id: asInt(json.id), name: asString(json.name) };
}
