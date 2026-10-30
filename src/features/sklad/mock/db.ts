import { SKLAD_REGIONS } from "@/features/sklad/regions";

/**
 * Mock baza — backend chiqquncha brauzer ichida yashaydi. Hammasi
 * SHARTNOMA SHAKLIDA (snake_case, ISO sana) saqlanadi, ishlovchilar
 * shunchaki qaytaradi yoki o'zgartiradi — UI haqiqiy backendga o'tganda
 * farqni sezmaydi.
 *
 * Tasodif urug'li — har yuklashda bir xil sonlar.
 */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261029);

export function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(rand() * list.length)]!;
}

/** Toshkent vaqti bilan ISO: `2026-10-29T14:00:00+05:00`. */
export function iso(date: Date): string {
  const local = new Date(date.getTime() + 5 * 3600_000);
  return `${local.toISOString().slice(0, 19)}+05:00`;
}

export function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 3600_000);
}

let sequence = 100_000;
export function nextId(): number {
  sequence += 1;
  return sequence;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sessiya — rol sinash uchun `?sklad_role=` bilan almashtiriladi
// ─────────────────────────────────────────────────────────────────────────────

export const FILIALS = [
  { id: 1, name: "Qo'qon filiali" },
  { id: 2, name: "Toshkent filiali" },
  { id: 3, name: "Andijon filiali" },
  { id: 4, name: "Samarqand filiali" },
];

export const session = {
  role: "logist.main" as "logist.main" | "logist.branch",
  filial_id: 1,
  user: { id: 5, full_name: "Dilshod Karimov", kind: "logist" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Omborlar
// ─────────────────────────────────────────────────────────────────────────────

export type MockLocation = {
  id: number;
  kind: "region" | "courier";
  name: string;
  region: string;
  is_primary: boolean;
  is_active: boolean;
  courier: { id: number; full_name: string; phone: string } | null;
};

const CITY: Record<string, string> = {
  toshkent_shahar: "Toshkent — Yunusobod ombori",
  toshkent: "Chirchiq ombori",
  andijon: "Andijon ombori",
  buxoro: "Buxoro ombori",
  fargona: "Farg'ona ombori",
  jizzax: "Jizzax ombori",
  xorazm: "Urganch ombori",
  namangan: "Namangan ombori",
  navoiy: "Navoiy ombori",
  qashqadaryo: "Qarshi ombori",
  samarqand: "Samarqand ombori",
  sirdaryo: "Guliston ombori",
  surxondaryo: "Termiz ombori",
  qoraqalpogiston: "Nukus ombori",
};

export const LOCATIONS: MockLocation[] = [];

SKLAD_REGIONS.forEach((region, index) => {
  LOCATIONS.push({
    id: 7 + index,
    kind: "region",
    name: CITY[region.code] ?? region.name,
    region: region.code,
    is_primary: true,
    is_active: true,
    courier: null,
  });
});
// Toshkent shahrida 3 ombor — `by_location` ustunlari ko'rinsin.
LOCATIONS.push(
  { id: 30, kind: "region", name: "Toshkent — Chilonzor ombori", region: "toshkent_shahar", is_primary: false, is_active: true, courier: null },
  { id: 31, kind: "region", name: "Toshkent — Sergeli ombori", region: "toshkent_shahar", is_primary: false, is_active: true, courier: null },
);

// ─────────────────────────────────────────────────────────────────────────────
// Kuryerlar
// ─────────────────────────────────────────────────────────────────────────────

export type MockCourier = {
  id: number;
  name: string;
  phone: string;
  region: string;
  on_shift: boolean;
  location_id: number;
  last_sale_at: string | null;
};

const COURIER_SEED: Array<{ name: string; region: string }> = [
  { name: "Rustam Tursunov", region: "toshkent_shahar" },
  { name: "Jasur Qodirov", region: "toshkent_shahar" },
  { name: "Bekzod Alimov", region: "toshkent_shahar" },
  { name: "Sherzod Ergashev", region: "toshkent" },
  { name: "Ulug'bek Nazarov", region: "andijon" },
  { name: "Davron Xasanov", region: "andijon" },
  { name: "Farrux Yo'ldoshev", region: "fargona" },
  { name: "Otabek Mirzayev", region: "fargona" },
  { name: "Sanjar Rahimov", region: "namangan" },
  { name: "Jamshid To'xtayev", region: "samarqand" },
  { name: "Abror Saidov", region: "samarqand" },
  { name: "Bobur Karimov", region: "buxoro" },
  { name: "Aziz Rasulov", region: "qashqadaryo" },
  { name: "Nodir Qosimov", region: "surxondaryo" },
  { name: "Elyor Matkarimov", region: "xorazm" },
  { name: "Timur Jumaniyozov", region: "qoraqalpogiston" },
  { name: "Mansur Hamidov", region: "navoiy" },
  { name: "Sardor Olimov", region: "jizzax" },
  { name: "Ilhom Boboyev", region: "sirdaryo" },
];

export const COURIERS: MockCourier[] = COURIER_SEED.map((seed, index) => ({
  id: 42 + index,
  name: seed.name,
  phone: `99890${randInt(1000000, 9999999)}`,
  region: seed.region,
  on_shift: index % 4 !== 3,
  location_id: 61 + index,
  // Har 7-kuryer 6 kundan beri harakatsiz — `idle_days` ko'rinsin.
  last_sale_at: index % 7 === 6 ? iso(hoursAgo(6 * 24)) : iso(hoursAgo(randInt(1, 30))),
}));

COURIERS.forEach((courier) => {
  LOCATIONS.push({
    id: courier.location_id,
    kind: "courier",
    name: `Kuryer — ${courier.name}`,
    region: courier.region,
    is_primary: false,
    is_active: true,
    courier: { id: courier.id, full_name: courier.name, phone: courier.phone },
  });
});

export function locationById(id: number): MockLocation | undefined {
  return LOCATIONS.find((location) => location.id === id);
}

export function courierById(id: number): MockCourier | undefined {
  return COURIERS.find((courier) => courier.id === id);
}

export function primaryOf(region: string): MockLocation | undefined {
  return LOCATIONS.find((location) => location.kind === "region" && location.region === region && location.is_primary);
}

// ─────────────────────────────────────────────────────────────────────────────
// Mahsulotlar
// ─────────────────────────────────────────────────────────────────────────────

export type MockItem = {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  package_size: number;
  is_active: boolean;
  stock_tracking: boolean;
  tracking_since: string | null;
  min_quantity: number;
};

const PRODUCT_SEED = [
  { name: "Shifo choy" },
  { name: "Jigar yig'masi" },
  { name: "Immunitet balzami" },
  { name: "Asal-zanjabil siropi" },
  { name: "Bo'g'im kremi" },
  { name: "Yurak quvvati damlamasi" },
  { name: "Oshqozon yig'masi" },
  { name: "Tinchlantiruvchi choy" },
  { name: "Buyrak choyi" },
  { name: "Qand nazorati yig'masi" },
  { name: "Ko'z vitamini" },
  { name: "Soch moyi" },
  { name: "Teri malhami" },
  { name: "Bronx siropi" },
  { name: "Qon bosimi choyi" },
  { name: "Ayollar yig'masi" },
  { name: "Erkaklar balzami" },
  { name: "Bolalar siropi" },
  { name: "Detoks choyi" },
  { name: "Uyqu damlamasi" },
  { name: "Xotira yig'masi" },
  { name: "Ishtaha siropi" },
  { name: "Bel malhami" },
  { name: "Allergiya choyi" },
];

export const ITEMS: MockItem[] = PRODUCT_SEED.map((seed, index) => ({
  id: 120 + index,
  name: seed.name,
  sku: `SH-${String(index + 1).padStart(3, "0")}`,
  barcode: `478000000${String(1000 + index * 7).padStart(4, "0")}`,
  package_size: pick([6, 10, 12, 12, 20, 24]),
  is_active: index !== 23,
  // Oxirgi 6 tasi nazoratsiz — «cheksiz» holati ko'rinsin.
  stock_tracking: index < 18,
  tracking_since: index < 18 ? iso(hoursAgo((28 - index) * 24)) : null,
  min_quantity: pick([100, 150, 200, 250, 300, 500]),
}));

export function itemById(id: number): MockItem | undefined {
  return ITEMS.find((item) => item.id === id);
}

export function itemRef(id: number) {
  const item = itemById(id);
  return item
    ? { id: item.id, name: item.name, sku: item.sku, package_size: item.package_size }
    : { id, name: `#${id}`, sku: "", package_size: 1 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Qoldiq va daftar
// ─────────────────────────────────────────────────────────────────────────────

export const STOCK = new Map<string, number>();

export const cellKey = (locationId: number, itemId: number) => `${locationId}:${itemId}`;

export function onHand(locationId: number, itemId: number): number {
  return STOCK.get(cellKey(locationId, itemId)) ?? 0;
}

export type MockLedger = {
  id: number;
  created_at: string;
  region: string;
  location: { id: number; name: string; kind: "region" | "courier" };
  item: { id: number; name: string; sku: string };
  movement_type: string;
  quantity: number;
  balance_after: number;
  source: { type: string; id: number; number: string } | null;
  actor: { id: number; full_name: string; kind: string };
  note: string;
};

export const LEDGER: MockLedger[] = [];

const SYSTEM = { id: 0, full_name: "Tizim", kind: "system" };

/** Daftarga qator yozadi va qoldiqni o'zgartiradi — yagona yozuv nuqtasi. */
export function move(
  locationId: number,
  itemId: number,
  type: string,
  quantity: number,
  source: MockLedger["source"],
  actor: MockLedger["actor"] = SYSTEM,
  note = "",
  at: Date = new Date(),
): MockLedger {
  const location = locationById(locationId);
  const balance = onHand(locationId, itemId) + quantity;
  STOCK.set(cellKey(locationId, itemId), balance);
  const row: MockLedger = {
    id: nextId(),
    created_at: iso(at),
    region: location?.region ?? "",
    location: { id: locationId, name: location?.name ?? `#${locationId}`, kind: location?.kind ?? "region" },
    item: itemRef(itemId),
    movement_type: type,
    quantity,
    balance_after: balance,
    source,
    actor,
    note,
  };
  LEDGER.push(row);
  return row;
}

// ── Urug' ────────────────────────────────────────────────────────────────────

let orderSeq = 88_000;

function seed() {
  const tracked = ITEMS.filter((item) => item.stock_tracking);
  const regionLocations = LOCATIONS.filter((location) => location.kind === "region");

  // Boshlang'ich qoldiq — 28 kun oldin inventarizatsiya.
  for (const location of regionLocations) {
    for (const item of tracked) {
      const base = location.region === "toshkent_shahar" ? randInt(200, 900) : randInt(60, 500);
      move(location.id, item.id, "opening_balance", base, { type: "document", id: 1, number: "BOSH-20261001-001" }, session.user, "inventarizatsiya", hoursAgo(28 * 24));
    }
  }

  // Kuryerlar bir marta mol olgan (3–9 kun oldin) va shu bilan yuradi.
  for (const courier of COURIERS) {
    const store = primaryOf(courier.region);
    if (!store) continue;
    const when = hoursAgo(randInt(3, 9) * 24);
    const docNumber = `KYU-2026${String(randInt(1001, 1028)).padStart(4, "0")}-${String(randInt(1, 9)).padStart(3, "0")}`;
    for (const item of tracked.slice(0, randInt(4, 8))) {
      const qty = randInt(6, 36);
      move(store.id, item.id, "courier_load", -qty, { type: "document", id: 2, number: docNumber }, session.user, "", when);
      move(courier.location_id, item.id, "courier_load", qty, { type: "document", id: 2, number: docNumber }, session.user, "", when);
    }
  }

  // Oxirgi 7 kun: sotuvlar (buyurtma yetkazildi) + bugungi kirimlar.
  for (let day = 7; day >= 0; day -= 1) {
    const sales = day === 0 ? randInt(40, 70) : randInt(60, 110);
    for (let n = 0; n < sales; n += 1) {
      const courier = pick(COURIERS);
      const held = tracked.filter((item) => onHand(courier.location_id, item.id) > 0);
      if (held.length === 0) continue;
      const item = pick(held);
      orderSeq += 1;
      const hour = randInt(9, 20);
      const at = new Date(Date.now() - day * 24 * 3600_000);
      at.setHours(hour, randInt(0, 59), 0, 0);
      const kind = rand() < 0.1 ? "gift" : rand() < 0.05 ? "sale_points" : "sale";
      move(courier.location_id, item.id, kind, -1, { type: "order", id: orderSeq, number: `ORD-${orderSeq}` }, SYSTEM, "", at);
    }
  }

  // Bugun 3 ta kirim.
  const receiptStores = [primaryOf("toshkent_shahar"), primaryOf("fargona"), primaryOf("andijon")];
  receiptStores.forEach((store, index) => {
    if (!store) return;
    const number = `KIR-20261029-00${index + 1}`;
    for (const item of tracked.slice(index * 3, index * 3 + 3)) {
      move(store.id, item.id, "receipt", randInt(10, 40) * item.package_size, { type: "document", id: 3, number }, session.user, "Ishlab chiqarish", hoursAgo(randInt(1, 5)));
    }
  });

  // Bitta kuryerda ataylab manfiy qoldiq — `alert` holati ko'rinsin.
  const unlucky = COURIERS[4]!;
  const item = tracked[2]!;
  const have = onHand(unlucky.location_id, item.id);
  move(unlucky.location_id, item.id, "sale", -(have + 2), { type: "order", id: orderSeq + 1, number: `ORD-${orderSeq + 1}` }, SYSTEM, "", hoursAgo(2));
}

seed();

// ─────────────────────────────────────────────────────────────────────────────
// Hujjatlar, dopusklar, pinlar
// ─────────────────────────────────────────────────────────────────────────────

export const DOCUMENTS: Array<Record<string, unknown>> = [];

export type MockGrant = {
  id: number;
  item_id: number;
  filial_id: number;
  granted_by: { id: number; full_name: string };
  granted_at: string;
  revoked_at: string | null;
  note: string;
};

export const GRANTS: MockGrant[] = [
  { id: 1, item_id: 120, filial_id: 2, granted_by: session.user, granted_at: iso(hoursAgo(17 * 24)), revoked_at: null, note: "Toshkent o'zi ishlab chiqaradi" },
  { id: 2, item_id: 124, filial_id: 2, granted_by: session.user, granted_at: iso(hoursAgo(17 * 24)), revoked_at: null, note: "" },
  { id: 3, item_id: 124, filial_id: 3, granted_by: session.user, granted_at: iso(hoursAgo(9 * 24)), revoked_at: null, note: "" },
  { id: 4, item_id: 122, filial_id: 2, granted_by: session.user, granted_at: iso(hoursAgo(5 * 24)), revoked_at: null, note: "" },
];

export const PINS = new Set<number>([120, 123]);

/** Hujjat raqami: `KIR-20261029-003`. */
const DOC_PREFIX: Record<string, string> = {
  receipt: "KIR",
  write_off: "CHQ",
  courier_load: "KYU",
  courier_return: "KQB",
  adjustment: "TZ",
  opening_balance: "BOSH",
};
const docCounters = new Map<string, number>();

export function nextDocNumber(type: string): string {
  const day = iso(new Date()).slice(0, 10).replaceAll("-", "");
  const key = `${type}:${day}`;
  const next = (docCounters.get(key) ?? 3) + 1;
  docCounters.set(key, next);
  return `${DOC_PREFIX[type] ?? "DOC"}-${day}-${String(next).padStart(3, "0")}`;
}
