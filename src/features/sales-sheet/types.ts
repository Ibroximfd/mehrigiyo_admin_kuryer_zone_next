import { countsInDona, piecesPerBoxOf } from "@/lib/dona";
import { PIECE_UNIT } from "@/lib/item-ref";
import { asArray, asInt, asNumber, asOptionalInt, asOptionalNumber, asOptionalString, asRecord, asString, isRecord } from "@/lib/parse";

import { mapOptionalCash } from "./cash";
import type { CourierCash } from "./cash";

/**
 * Kunlik sotuv jadvali va berish rejasi (hujjat 83 §2–§4) — bosh kuryerlar
 * Google Sheet'da qo'lda yuritgan «SOTUV» jadvali. Hisob faqat serverda:
 * `given`, `closing`, `handover_due`, `totals`, `to_issue`, `shortage` javobdan
 * o'qiladi — frontend qo'shmaydi va ayirmaydi, faqat formatlaydi.
 */

/**
 * Bitta katak (§2.1): `qty` — katalog birligida (karobka yoki dona), `pieces` — karobkadan
 * tashqari donalar. `piecesTotal` — donada yuritiladigan mahsulotda jami dona (hujjat 84 §2.2),
 * faqat server bersa.
 */
export type QtyCell = { qty: number; pieces: number; piecesTotal?: number };

export const EMPTY_CELL: QtyCell = { qty: 0, pieces: 0 };

/** Kaliti — mahsulot id si. Yo'q kalit = nol: server nol katakni yubormaydi (§2.1). */
export type CellMap = Readonly<Record<string, QtyCell>>;

export function isZeroCell(cell: QtyCell): boolean {
  return cell.qty === 0 && cell.pieces === 0 && !cell.piecesTotal;
}

export function cellOf(cells: CellMap, productId: number): QtyCell {
  return cells[String(productId)] ?? EMPTY_CELL;
}

/** Kamida bitta noldan farqli katak bormi (`mapCells` nolni saqlamaydi). */
export function hasCells(cells: CellMap): boolean {
  return Object.keys(cells).length > 0;
}

function mapCell(raw: unknown): QtyCell {
  // `checks[]` da miqdor son holida ham kelishi mumkin — u sklad birligidagi son.
  if (!isRecord(raw)) return { qty: asInt(raw), pieces: 0 };
  const piecesTotal = asOptionalInt(raw.pieces_total);
  const cell = { qty: asInt(raw.qty), pieces: asInt(raw.pieces) };
  return piecesTotal === null ? cell : { ...cell, piecesTotal };
}

export function mapCells(raw: unknown): CellMap {
  const cells: Record<string, QtyCell> = {};
  if (!isRecord(raw)) return cells;
  for (const [productId, value] of Object.entries(raw)) {
    const cell = mapCell(value);
    if (!isZeroCell(cell)) cells[productId] = cell;
  }
  return cells;
}

/** Ustun: `unitLabel` — sklad birligining nomi («dona» yoki «karobka»). */
export type SheetProduct = {
  id: number;
  name: string;
  unitLabel: string;
  /** Donada yuritiladi (`count_unit: piece`, hujjat 84 §1) — katakda bitta son, donada. */
  countsInDona: boolean;
  /** 1 karobkadagi dona (`pieces_per_box`); kelmasa `null` — taxmin qilinmaydi. */
  piecesPerBox: number | null;
};

/** Tartib — serverniki (katalog tartibi, §2.1). */
function mapProducts(raw: unknown): SheetProduct[] {
  return asArray(raw).map((entry) => {
    const json = asRecord(entry);
    return {
      id: asInt(json.id),
      name: asOptionalString(json.name_uz) ?? asString(json.name),
      unitLabel: asOptionalString(json.unit_label) ?? PIECE_UNIT,
      countsInDona: countsInDona(json),
      piecesPerBox: piecesPerBoxOf(json.pieces_per_box),
    };
  });
}

export type CourierRef = { id: number; fullName: string };

function mapCourierRef(raw: unknown): CourierRef {
  const json = asRecord(raw);
  return { id: asInt(json.id), fullName: asString(json.full_name) };
}

// ── §2. Sotuv jadvali — `chief/report/sales-sheet/` ─────────────────────────

/** Mahsulot qatorlari; tenglama (§2.2): `given = opening + issued`, `closing = given − sold − gift + other`. */
export type SheetFlow = "opening" | "issued" | "given" | "sold" | "gift" | "other" | "closing";

/** Kuryer xizmati (§3) — tizim hisoblamaydi, bosh kuryer yozgan summa. */
export type CourierFee = { amount: number; note: string };

/** Bitta kuryer, bitta kun yoki jami — kalitlar bir xil (§2, `totals`). */
export type SheetFigures = Record<SheetFlow, CellMap> & {
  salesAmount: number;
  /** Kuryer qo'liga olgan pul: eshikda naqd + kartaga o'tkazma. */
  cashAmount: number;
  /** Ilovada oldindan va eshikda Click/Payme. */
  onlineAmount: number;
  discountAmount: number;
  /**
   * Yetkazilgan manzillar (to'xtashlar). Hujjat 108: kuryer «yetkazdim» bosgan
   * zahoti sukut 1 bilan kiradi, logist tasdiqlaganda o'z soni bilan almashadi.
   */
  addresses: number;
  /**
   * Shundan logist hali tasdiqlamagani (108) — `addresses` ichida, jamiga qayta
   * qo'shilmaydi. Server `pending_in_addresses: true` bermasa (eski server:
   * manzil tasdiqni kutgan) — 0, «shundan» deyish noto'g'ri bo'lardi.
   */
  pendingAddresses: number;
  /** Kuryer borgan, mijoz rad etgan manzillar. */
  refusedAddresses: number;
  /**
   * Qo'shimcha manzil (2026-11-26): kuryer borgan, zakaz topshirilmagan —
   * holat o'zgarmagan, logist izoh bilan qo'shgan. Manzil jamiga va kuryer
   * xizmatiga server qo'shadi (sayt qo'shmaydi). Kalit yo'q — `null`
   * (eski server: ustun chizilmaydi).
   */
  extraAddresses: number | null;
  /**
   * «Borganda atkaz» qo'shimcha manzil bilan (2026-11-26, egasi; hujjat 134).
   * Server bermasa `null` — `refusedWithExtra` yig'adi.
   */
  refusedAddressesTotal: number | null;
  /** Davr oxirida kuryerda yetkazilmay qolgan zakazlar. */
  openOrders: number;
  /** `null` — yozilmagan. Oraliqda — kunlik yozuvlar yig'indisi. */
  fee: CourierFee | null;
  /** Kassaga topshiriladigan naqd (`cash − fee`) — serverdan; kelmasa `null` («—», hisoblanmaydi). */
  handoverDue: number | null;
  /** Kuryerdan pul olish (hujjat 85 §2); server hali bermasa — `null`. */
  cash: CourierCash | null;
};

export type SheetDay = SheetFigures & { date: string };

/**
 * Kuryer viloyati (hujjat 96 §6): `code: null` — viloyatsiz kuryer. Server
 * `courier.region` kalitini umuman bermasa — `CourierSheet.region` ning o'zi `null`
 * (noma'lum: viloyat kuryerlar ro'yxatidan olinadi).
 */
export type SheetCourierRegion = { code: string | null; name: string };

export type CourierSheet = SheetFigures & {
  courier: CourierRef;
  region: SheetCourierRegion | null;
  /** Kunma-kun qatorlar (`days=1`); bitta kun so'ralsa bo'sh. */
  days: SheetDay[];
};

/**
 * Viloyat bloki (hujjat 96 §6, `regions[]`): `totals` bilan bir xil kalitlar —
 * shu viloyat kuryerlarining yig'indisi serverda. `code: null` — «Viloyatsiz» (oxirida).
 */
export type SheetRegion = SheetFigures & {
  code: string | null;
  name: string;
  courierIds: number[];
};

/**
 * «Kuryersiz» blokidagi zakaz (hujjat 125 C §4). `courierId` to'la — zakazda kuryer
 * bor, lekin sotuv hali omborda yozilgan: shu kuryer bilan `assign/` qayta
 * yuborilsa server skladni tuzatadi (§2.4). `null` — kuryer umuman yozilmagan.
 */
export type CourierlessOrder = {
  id: string;
  orderNumber: string;
  clientPhone: string;
  reportDate: string | null;
  courierId: number | null;
};

/**
 * Bosh kuryerning o'zida (kuryersiz yoki yashirin o'rinda) yopilgan zakazlar
 * (hujjat 125 C §4). Moli kuryer omboridan emas, bosh kuryer omboridan ayirilgan —
 * shuning uchun `couriers[]` da yo'q, lekin `totals` ichida bor. Ombor kataklari
 * (`opening/issued/given/other/closing`) doim bo'sh, `handoverDue` doim 0 (pul
 * bosh kuryerning o'zida). `totals` ni sayt qayta hisoblamaydi.
 */
export type CourierlessSheet = SheetFigures & {
  /** Blokdagi zakazlar soni (to'liq). */
  ordersCount: number;
  /** Ko'pi bilan 50 ta; ko'p bo'lsa `ordersTruncated`. */
  orders: CourierlessOrder[];
  ordersTruncated: boolean;
  /** Kunma-kun (`days=1`, oraliq 1 kundan uzun). */
  days: SheetDay[];
};

/** Daftar sotuvi zakazlar sotuvidan farq qilgan qator (§2.10) — odatda bo'lmaydi. */
export type SheetCheck = {
  date: string;
  courierId: number | null;
  flow: "sold" | "gift";
  productId: number | null;
  ledger: QtyCell;
  orders: QtyCell;
};

export type SalesSheet = {
  dateFrom: string;
  dateTo: string;
  products: SheetProduct[];
  /** Davrda harakati bo'lgan kuryerlar — nol kuryer kelmaydi (§2.12). */
  couriers: CourierSheet[];
  /** Viloyatlar kesimi; server hali bermasa `null` — guruhlash frontendda (`regions.ts`). */
  regions: SheetRegion[] | null;
  /** «Kuryersiz (bosh kuryer)» bloki (125 C §4); server bermasa yoki `courier_id` filtri bilan — `null`. */
  courierless: CourierlessSheet | null;
  totals: SheetFigures;
  /** Kuryer «yetkazdim» bosgan, logist hali tasdiqlamagan (hujjat 97 §3); yo'q yoki 0 — `null`. */
  pending: SheetPending | null;
  /**
   * Manzil soni kuryer bosgan zahoti hisoblanadi (hujjat 108, `totals.pending_in_addresses`);
   * `false` — eski server: manzil logist tasdig'idan keyin qo'shiladi.
   */
  addressesOnPress: boolean;
  checks: SheetCheck[];
};

/**
 * Tasdiqlanmagan sotuv (97 §3): sotilgan/sovg'a sonlari uni o'z ichiga oladi
 * (kuryer bosgan kunda), pul bloklari esa yo'q — pul logist tasdig'idan keyin.
 */
export type SheetPending = {
  salesAmount: number;
  cashAmount: number;
  /**
   * Pul allaqachon hisoblangan (egasi, 2026-11-20; hujjat 101 §6): bosh kuryerda
   * hech narsa logist tasdig'ini kutmaydi — server `pending_in_cash: true` bersa,
   * tasdiqlanmagan sotuv summasi va «Topshirishi kerak» ga kirgan. Bermasa
   * (eski server) — pul tasdiqdan keyin qo'shiladi.
   */
  moneyIncluded: boolean;
  /** Logist tasdig'ini kutayotgan yetkazilgan manzillar. */
  addresses: number;
  /**
   * `true` (hujjat 108) — ular manzil soniga kuryer bosgan zahoti kirgan, logist
   * tasdig'ida aniqlashadi; `false` (eski server) — tasdiqdan keyin qo'shiladi.
   */
  addressesIncluded: boolean;
  /** Borganda atkaz — manzil soni logist qaroriga bog'liq, tasdiqdan keyin qo'shiladi (108 ham). */
  refusedAddresses: number;
};

function mapFee(raw: unknown): CourierFee | null {
  if (!isRecord(raw)) return null;
  const amount = asOptionalNumber(raw.amount);
  return amount === null ? null : { amount, note: asString(raw.note) };
}

function mapFigures(raw: unknown): SheetFigures {
  const json = asRecord(raw);
  return {
    opening: mapCells(json.opening),
    issued: mapCells(json.issued),
    given: mapCells(json.given),
    sold: mapCells(json.sold),
    gift: mapCells(json.gift),
    other: mapCells(json.other),
    closing: mapCells(json.closing),
    salesAmount: asNumber(json.sales_amount),
    cashAmount: asNumber(json.cash_amount),
    onlineAmount: asNumber(json.online_amount),
    discountAmount: asNumber(json.discount_amount),
    addresses: asInt(json.addresses),
    pendingAddresses: json.pending_in_addresses === true ? asInt(json.pending_addresses) : 0,
    refusedAddresses: asInt(json.refused_addresses),
    extraAddresses: asOptionalInt(json.extra_addresses),
    refusedAddressesTotal: asOptionalInt(json.refused_addresses_total),
    openOrders: asInt(json.open_orders),
    fee: mapFee(json.fee),
    handoverDue: asOptionalNumber(json.handover_due),
    cash: mapOptionalCash(json.cash),
  };
}

/** `courier.region` kaliti bo'lmasa — `null` (noma'lum); `region: null` — viloyatsiz. */
function mapCourierRegion(raw: unknown): SheetCourierRegion | null {
  const json = asRecord(raw);
  if (!("region" in json)) return null;
  return { code: asOptionalString(json.region), name: asString(json.region_name) };
}

function mapRegion(raw: unknown): SheetRegion {
  const json = asRecord(raw);
  return {
    ...mapFigures(json),
    code: asOptionalString(json.region),
    name: asString(json.region_name),
    courierIds: asArray(json.courier_ids).map((id) => asInt(id)),
  };
}

function mapCourierSheet(raw: unknown): CourierSheet {
  const json = asRecord(raw);
  return {
    ...mapFigures(json),
    courier: mapCourierRef(json.courier),
    region: mapCourierRegion(json.courier),
    days: asArray(json.days).map((day) => ({ ...mapFigures(day), date: asString(asRecord(day).date) })),
  };
}

function mapCourierlessOrder(raw: unknown): CourierlessOrder {
  const json = asRecord(raw);
  return {
    id: asString(json.id),
    orderNumber: asString(json.order_number),
    clientPhone: asString(json.client_phone),
    reportDate: asOptionalString(json.report_date),
    courierId: asOptionalInt(json.courier_id),
  };
}

function mapCourierless(raw: unknown): CourierlessSheet | null {
  if (!isRecord(raw)) return null;
  const orders = asArray(raw.orders).map(mapCourierlessOrder).filter((order) => order.id);
  return {
    ...mapFigures(raw),
    // Son kelmasa — ro'yxat uzunligi (kamida shuncha).
    ordersCount: asOptionalInt(raw.orders_count) ?? orders.length,
    orders,
    ordersTruncated: raw.orders_truncated === true,
    days: asArray(raw.days).map((day) => ({ ...mapFigures(day), date: asString(asRecord(day).date) })),
  };
}

/**
 * Blok jadvalda chiziladimi: zakaz, sotuv/sovg'a yoki pul bo'lsa. Hammasi nol —
 * qator ko'rsatilmaydi (har kuni bo'sh qator turmasin).
 */
export function hasCourierlessActivity(block: CourierlessSheet): boolean {
  return (
    block.ordersCount > 0 ||
    hasCells(block.sold) ||
    hasCells(block.gift) ||
    block.salesAmount !== 0 ||
    block.cashAmount !== 0 ||
    block.onlineAmount !== 0 ||
    block.discountAmount !== 0
  );
}

function mapPending(raw: unknown): SheetPending | null {
  const json = asRecord(raw);
  const salesAmount = asOptionalNumber(json.pending_sales_amount) ?? 0;
  const cashAmount = asOptionalNumber(json.pending_cash_amount) ?? 0;
  const addresses = asOptionalInt(json.pending_addresses) ?? 0;
  const refusedAddresses = asOptionalInt(json.pending_refused_addresses) ?? 0;
  if (salesAmount <= 0 && cashAmount <= 0 && addresses <= 0 && refusedAddresses <= 0) return null;
  return {
    salesAmount,
    cashAmount,
    moneyIncluded: json.pending_in_cash === true,
    addresses,
    addressesIncluded: json.pending_in_addresses === true,
    refusedAddresses,
  };
}

function mapCheck(raw: unknown): SheetCheck {
  const json = asRecord(raw);
  // `product` — id yoki `{id, …}`; ikkalasi ham qabul qilinadi.
  const product = isRecord(json.product) ? json.product.id : json.product;
  return {
    date: asString(json.date),
    courierId: asOptionalInt(json.courier_id),
    flow: asString(json.flow) === "gift" ? "gift" : "sold",
    productId: asOptionalInt(product),
    ledger: mapCell(json.ledger),
    orders: mapCell(json.orders),
  };
}

export function mapSalesSheet(raw: unknown): SalesSheet {
  const json = asRecord(raw);
  return {
    dateFrom: asString(json.date_from),
    dateTo: asString(json.date_to),
    products: mapProducts(json.products),
    couriers: asArray(json.couriers).map(mapCourierSheet),
    regions: Array.isArray(json.regions) ? json.regions.map(mapRegion) : null,
    courierless: mapCourierless(json.courierless),
    totals: mapFigures(json.totals),
    pending: mapPending(json.totals),
    addressesOnPress: asRecord(json.totals).pending_in_addresses === true,
    checks: asArray(json.checks).map(mapCheck),
  };
}

// ── §4. Berish rejasi — `chief/report/issue-plan/` (Sotuv jadvalida «Berish kerak») ─

export type PlanCourier = {
  courier: CourierRef;
  /** Reja kunidan oldin biriktirilgan, yetkazilmagan zakazlar. */
  carriedOrders: number;
  /** Reja kuni biriktirilgan zakazlar. */
  newOrders: number;
  /** Kuryer skladining hozirgi qoldig'i. */
  onHand: CellMap;
  /** Kuryer «yetkazdim» bosgan, logist tasdiqlamagan (97 §3). */
  pending: CellMap;
  /** Yetkazilmagan hamma zakazlardagi mahsulot. */
  required: CellMap;
  /** `max(required − on_hand, 0)` — donaga keltirib, serverda hisoblangan. */
  toIssue: CellMap;
  surplus: CellMap;
  /**
   * `to_issue` sklad birligida — «Berish» hujjati qatorlari (`courier_load` ga
   * o'zgartirmasdan yuboriladi). Server bermasa — bo'sh: oyna bo'sh ochiladi.
   */
  issueLines: IssueLine[];
};

/** Hujjat qatori: `item_id` + sklad birligidagi son (`quantity`). */
export type IssueLine = { itemId: number; quantity: number };

export type IssuePlan = {
  date: string;
  products: SheetProduct[];
  couriers: PlanCourier[];
  /** Bosh kuryer ombori: bor, hamma kuryerga berish kerak, yetmaydi; `locationId` — mol shu ombordan beriladi. */
  store: { locationId: number | null; onHand: CellMap; toIssue: CellMap; shortage: CellMap };
};

function mapIssueLines(raw: unknown): IssueLine[] {
  return asArray(raw)
    .map((entry) => {
      const json = asRecord(entry);
      return { itemId: asInt(json.item_id), quantity: asInt(json.quantity) };
    })
    .filter((line) => line.itemId > 0 && line.quantity > 0);
}

function mapPlanCourier(raw: unknown): PlanCourier {
  const json = asRecord(raw);
  return {
    courier: mapCourierRef(json.courier),
    carriedOrders: asInt(json.carried_orders),
    newOrders: asInt(json.new_orders),
    onHand: mapCells(json.on_hand),
    pending: mapCells(json.pending),
    required: mapCells(json.required),
    toIssue: mapCells(json.to_issue),
    surplus: mapCells(json.surplus),
    issueLines: mapIssueLines(json.issue_lines),
  };
}

export function mapIssuePlan(raw: unknown): IssuePlan {
  const json = asRecord(raw);
  const store = asRecord(json.store);
  return {
    date: asString(json.date),
    products: mapProducts(json.products),
    couriers: asArray(json.couriers).map(mapPlanCourier),
    store: {
      locationId: asOptionalInt(store.location_id),
      onHand: mapCells(store.on_hand),
      toIssue: mapCells(store.to_issue),
      shortage: mapCells(store.shortage),
    },
  };
}
