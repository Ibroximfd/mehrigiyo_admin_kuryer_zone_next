import { asArray, asInt, asOptionalInt, asOptionalNumber, asOptionalString, asRecord, asString, isRecord } from "@/lib/parse";
import { isZeroQty, mapCellUnit, mapQtyCell } from "@/lib/qty-cell";
import type { CellUnit, QtyCell } from "@/lib/qty-cell";

/**
 * Sklad jadvali (hujjat 85 §1) — `GET chief/report/sklad-sheet/`: egasining
 * Google Sheet'idagi kunlik va davr jadvali. Hisob faqat serverda: tenglama
 * `closing = opening + from_company − sold − gift − to_company − write_off + other`
 * (hujjat 92 §3: chiqim alohida blok, `other` — faqat tuzatish va boshqa),
 * `sold`/`gift` jamilari, `current.total`, summalar — javobdan o'qiladi;
 * frontend qo'shmaydi va ayirmaydi, faqat formatlaydi. Yagona istisno —
 * `day-state.ts`: server `day_state` ni chiqarguncha kun holatining «Jami» si
 * shu tenglamaning o'zidan (`closing + sold + gift`) olinadi.
 *
 * Bular haqiqiy hisob raqamlari — o'ylab topilgan son chizilmaydi (egasi,
 * 2026-11-18): harakat ichida yo'q mahsulot kaliti — nol (server nol katakni
 * yubormaydi), lekin javobda umuman yo'q blok yoki summa — `null` («—»).
 */

/**
 * Kaliti — mahsulot id si; yo'q kalit = nol (server nol katakni yubormaydi).
 * Katakdagi `amount` o'qilmaydi — jadvalda faqat qator summasi chiziladi.
 */
export type SkladCellMap = Readonly<Record<string, QtyCell>>;

/** Bitta harakat: mahsulot kataklari va ularning summasi (`amount` — serverniki; yo'q — `null`). */
export type SkladFlow = { items: SkladCellMap; amount: number | null };

export type SkladProduct = CellUnit & { id: number; name: string };

export type CourierRef = { id: number; fullName: string };

/** Hudud × kuryer qatori (§1.3); kuryersiz yetkazilgan zakaz — `courier: null`. */
export type SkladRegionRow = {
  region: string;
  regionName: string;
  courier: CourierRef | null;
  sold: SkladFlow | null;
  gift: SkladFlow | null;
};

/** Davr ko'rinishida har kun (§1.5); hudud tanlangan bo'lsa — shu hudud bo'yicha. */
export type SkladDay = { date: string; sold: SkladFlow | null; gift: SkladFlow | null };

/** Kunlik manzil va kuryer xizmati (§1.5). `fee` — bosh kuryer yozgani; yozilmagan — `null`. */
export type SkladAddressRow = {
  date: string;
  /** Yo'q maydon — `null` («—»), nol emas. */
  addresses: number | null;
  refusedAddresses: number | null;
  /** Kuryer xizmati narxi (viloyat narxi); bir nechta hududda — `null` bo'lishi mumkin. */
  rate: number | null;
  fee: number | null;
};

/** So'rov paytidagi qoldiq (§1.1) — sanaga bog'liq emas. `min` — kalit yo'q bo'lsa chegara yo'q. */
export type SkladCurrent = {
  store: Readonly<Record<string, QtyCell>>;
  couriers: Readonly<Record<string, QtyCell>>;
  total: Readonly<Record<string, QtyCell>>;
  /** Kuryer «yetkazdim» bosgan, logist tasdiqlamagan (97 §3) — `total` dan allaqachon ayirilgan. */
  pending: Readonly<Record<string, QtyCell>>;
  min: Readonly<Record<string, number>>;
};

/**
 * Kunning saqlangan holati (egasi, 2026-11-23; hujjat 117): kuryerlar sotuv
 * qilmasdan oldingi holat — Jami · kuryerlarga berilgani · omborda qolgani.
 * Kun davomidagi sotuv va sovg'a bu sonlardan AYRILMAYDI (ular ayrilgan qoldiq
 * ertangi kunning boshi bo'ladi); o'tgan kun uchun o'sha kunning holati qaytadi.
 * `total = couriers + store` — serverda.
 */
export type SkladDayState = { total: SkladCellMap; couriers: SkladCellMap; store: SkladCellMap };

export type SkladSheet = {
  dateFrom: string;
  dateTo: string;
  products: SkladProduct[];
  /** `null` — server hali bermaydi (yoki oraliq so'ralgan): bo'linish chizilmaydi, o'ylab topilmaydi. */
  dayState: SkladDayState | null;
  /** `null` — javobda blok yo'q (eski server): sahifa hozirgi qoldiqni sklad ma'lumotidan oladi. */
  current: SkladCurrent | null;
  /** Harakatlar; javobda blok yo'q — `null` (qator «—» bilan chiziladi). */
  opening: SkladFlow | null;
  fromCompany: SkladFlow | null;
  rows: SkladRegionRow[];
  sold: SkladFlow | null;
  gift: SkladFlow | null;
  /**
   * Kuryer «yetkazdim» bosgan, logist hali tasdiqlamagan sotuv va sovg'a (97 §3):
   * `sold`/`gift` va «kun oxiri» ga kirmagan, hozirgi qoldiqdan esa ayirilgan.
   */
  soldPending: SkladFlow | null;
  giftPending: SkladFlow | null;
  /**
   * Tasdiqlanmagan sotuv `sold`/`gift`/`rows` va «kun oxiri» ga allaqachon kirgan
   * (egasi, 2026-11-20; hujjat 101 §6 — bosh kuryerda hech narsa logist tasdig'ini
   * kutmaydi). Server `pending_included: true` bersa — `soldPending`/`giftPending`
   * faqat «shundan» ma'lumoti; bermasa (eski server) — alohida qatorlar.
   */
  pendingIncluded: boolean;
  toCompany: SkladFlow | null;
  /** Chiqim (spisaniye) — musbat son (hujjat 92 §3); eski serverda chiqim `other` ichida, blok yo'q — `null`. */
  writeOff: SkladFlow | null;
  /** Tuzatish va boshqa harakatlar — ishorali; noldan farqli bo'lsa ogohlantiriladi. */
  other: SkladFlow | null;
  closing: SkladFlow | null;
  days: SkladDay[];
  addressRows: SkladAddressRow[];
};

export function cellOf<T extends QtyCell>(cells: Readonly<Record<string, T>>, productId: number): T | undefined {
  return cells[String(productId)];
}

/** Harakat bo'shmi: hamma katak nol va summa nol (yo'q blok ham — u haqda hech narsa ma'lum emas). */
export function isEmptyFlow(flow: SkladFlow | null): boolean {
  return !flow || ((flow.amount ?? 0) === 0 && Object.keys(flow.items).length === 0);
}

function mapQtyCells(raw: unknown): Record<string, QtyCell> {
  const cells: Record<string, QtyCell> = {};
  if (!isRecord(raw)) return cells;
  for (const [productId, value] of Object.entries(raw)) {
    const cell = mapQtyCell(value);
    if (!isZeroQty(cell)) cells[productId] = cell;
  }
  return cells;
}

function mapFlow(raw: unknown): SkladFlow | null {
  if (!isRecord(raw)) return null;
  return { items: mapQtyCells(raw.items), amount: asOptionalNumber(raw.amount) };
}

/** Tartib — serverniki (katalog tartibi). */
function mapProducts(raw: unknown): SkladProduct[] {
  return asArray(raw).map((entry) => {
    const json = asRecord(entry);
    return {
      id: asInt(json.id),
      name: asOptionalString(json.name_uz) ?? asString(json.name),
      ...mapCellUnit(json),
    };
  });
}

/** Uchala qoldiq bloki bo'lmasa — `null`: yarim blokdan son yasalmaydi, sahifa sklad ma'lumotiga qaytadi. */
function mapCurrent(raw: unknown): SkladCurrent | null {
  if (!isRecord(raw) || !isRecord(raw.store) || !isRecord(raw.couriers) || !isRecord(raw.total)) return null;
  const min: Record<string, number> = {};
  for (const [productId, value] of Object.entries(asRecord(raw.min))) {
    const limit = asOptionalInt(value);
    if (limit !== null) min[productId] = limit;
  }
  return { store: mapQtyCells(raw.store), couriers: mapQtyCells(raw.couriers), total: mapQtyCells(raw.total), pending: mapQtyCells(raw.pending), min };
}

/** Blok `{items: {...}}` yoki to'g'ridan-to'g'ri kataklar (`current` dagidek) — ikkalasi ham o'qiladi. */
function blockCells(raw: unknown): Record<string, QtyCell> | null {
  if (!isRecord(raw)) return null;
  return mapQtyCells(isRecord(raw.items) ? raw.items : raw);
}

/** Uchala blok bo'lmasa — `null`: yarim holatdan son yasalmaydi. */
function mapDayState(raw: unknown): SkladDayState | null {
  if (!isRecord(raw)) return null;
  const total = blockCells(raw.total);
  const couriers = blockCells(raw.couriers);
  const store = blockCells(raw.store);
  return total && couriers && store ? { total, couriers, store } : null;
}

function mapCourier(raw: unknown): CourierRef | null {
  if (!isRecord(raw)) return null;
  const id = asOptionalInt(raw.id);
  return id === null ? null : { id, fullName: asString(raw.full_name) };
}

function mapRegionRow(raw: unknown): SkladRegionRow {
  const json = asRecord(raw);
  const region = asString(json.region);
  return {
    region,
    regionName: asOptionalString(json.region_name) ?? region,
    courier: mapCourier(json.courier),
    sold: mapFlow(json.sold),
    gift: mapFlow(json.gift),
  };
}

function mapDay(raw: unknown): SkladDay {
  const json = asRecord(raw);
  return { date: asString(json.date), sold: mapFlow(json.sold), gift: mapFlow(json.gift) };
}

function mapAddressRow(raw: unknown): SkladAddressRow {
  const json = asRecord(raw);
  return {
    date: asString(json.date),
    addresses: asOptionalInt(json.addresses),
    refusedAddresses: asOptionalInt(json.refused_addresses),
    rate: asOptionalNumber(json.rate),
    fee: asOptionalNumber(json.fee),
  };
}

export function mapSkladSheet(raw: unknown): SkladSheet {
  const json = asRecord(raw);
  return {
    dateFrom: asString(json.date_from),
    dateTo: asString(json.date_to),
    products: mapProducts(json.products),
    dayState: mapDayState(json.day_state),
    current: mapCurrent(json.current),
    opening: mapFlow(json.opening),
    fromCompany: mapFlow(json.from_company),
    rows: asArray(json.rows).map(mapRegionRow),
    sold: mapFlow(json.sold),
    gift: mapFlow(json.gift),
    soldPending: mapFlow(json.sold_pending),
    giftPending: mapFlow(json.gift_pending),
    pendingIncluded: json.pending_included === true,
    toCompany: mapFlow(json.to_company),
    writeOff: mapFlow(json.write_off),
    other: mapFlow(json.other),
    closing: mapFlow(json.closing),
    days: asArray(json.days).map(mapDay),
    addressRows: asArray(json.address_rows).map(mapAddressRow),
  };
}
