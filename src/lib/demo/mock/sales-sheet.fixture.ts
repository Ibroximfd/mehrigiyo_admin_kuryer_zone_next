import { addDays, parseISO } from "date-fns";

import { demoSeed } from "@/lib/demo/mock/dataset";
import { toIsoDay, todayIso } from "@/lib/format";

import { DEMO_CHIEF } from "./fixtures";

/**
 * FAQAT TEST FIKSTURASI — demo router'ga ulanmagan, ilovada hech qachon
 * ko'rsatilmaydi (egasi, 2026-11-18: haqiqiy hisob ekranlarida demo ma'lumot
 * yo'q). `sheet-render.test.ts` shu yerdan javob shaklini oladi.
 *
 * Kunlik sotuv jadvali va berish rejasi javobi (hujjat 83 §2–§5).
 * 16.11.2026 — egasi Google Sheet'idagi haqiqiy raqamlar (uch kuryer),
 * 17.11 — davomi (bitta kuryerda qaytarish bor), keyingi kunlar barqaror
 * «tasodifiy» sonlar bilan to'ldiriladi; `SINCE` dan oldin va kelajakda — bo'sh.
 * Bu fayl server o'rnida: `given`, `closing`, `handover_due`, `totals`,
 * `to_issue`, `shortage` shu yerda hisoblanadi — ekranlar faqat o'qiydi.
 * Kuryer xizmati yozuvlari modul xotirasida (sahifa yangilansa boshiga qaytadi).
 *
 * «Doctor Ali Kremi» — donalab sotiladigan karobkali mahsulot (hujjat 84): 1 karobkada
 * 3 dona, skladda hali karobkada (`unit_label: karobka`). Uning sonlari shu faylda donada
 * yuritiladi; javobda server kabi `{qty: karobka, pieces: ortiqcha dona, pieces_total}`.
 */

/**
 * Egasi jadvali ustunlari, katalog tartibida. `dailyLoad` — to'ldirilgan kunlarda beriladigan
 * mol o'lchami; `price` — shu fayldagi son birligining narxi (Kremi — 1 dona narxi);
 * `piecesPerBox` — karobkasiz mahsulotda 1.
 */
const PRODUCTS = [
  { id: 6, name: "Doctor Ali Tea", nameUz: "Tea (ipak choy)", price: 160_000, dailyLoad: 4, gifted: false, piecesPerBox: 1 },
  { id: 7, name: "Rayhon", nameUz: "Rayhon", price: 190_000, dailyLoad: 60, gifted: true, piecesPerBox: 1 },
  { id: 8, name: "Elixir", nameUz: "Elixir", price: 420_000, dailyLoad: 4, gifted: true, piecesPerBox: 1 },
  { id: 9, name: "Oregado Box", nameUz: "Oregado Box", price: 650_000, dailyLoad: 1, gifted: false, piecesPerBox: 1 },
  { id: 10, name: "Yostiq", nameUz: "Yostiq", price: 350_000, dailyLoad: 1, gifted: false, piecesPerBox: 1 },
  { id: 21, name: "One shot", nameUz: "One shot", price: 120_000, dailyLoad: 1, gifted: false, piecesPerBox: 1 },
  { id: 22, name: "Vanna uchun", nameUz: "Vanna uchun", price: 180_000, dailyLoad: 0, gifted: false, piecesPerBox: 1 },
  { id: 23, name: "Qora ko'z", nameUz: "Qora ko'z", price: 250_000, dailyLoad: 8, gifted: false, piecesPerBox: 1 },
  { id: 24, name: "Chufa yog'i", nameUz: "Chufa yog'i", price: 300_000, dailyLoad: 0, gifted: false, piecesPerBox: 1 },
  { id: 34, name: "Doctor Ali Kremi", nameUz: "Doctor Ali Kremi", price: 200_000, dailyLoad: 12, gifted: false, piecesPerBox: 3 },
] as const;

const COURIERS = [
  { id: 31, fullName: "Bahtiyor aka" },
  { id: 32, fullName: "Xayrullo aka" },
  { id: 33, fullName: "Muhammadqul aka" },
] as const;

/** Kuryer skladi tarixi shu kundan to'liq (§2.5). */
const SINCE = "2026-11-16";

/** Mahsulot bo'yicha sonlar — `PRODUCTS` tartibida. */
type Vector = readonly number[];

const ZERO: Vector = PRODUCTS.map(() => 0);

/** Bir kunlik harakat: sklad daftari + yetkazilgan zakazlar puli. */
type Move = {
  issued: Vector;
  sold: Vector;
  gift: Vector;
  /** Tuzatish va kuryerdan qaytarilgan (manfiy) — ishorali (§2.2). */
  other: Vector;
  cash: number;
  online: number;
  addresses: number;
  refused: number;
  openOrders: number;
};

/** 16.11 boshidagi qoldiq (15.11 dan o'tgan). */
const OPENING: Record<number, Vector> = {
  31: [3, 20, 2, 0, 1, 0, 0, 4, 0, 7],
  32: [1, 15, 1, 0, 0, 0, 0, 4, 0, 4],
  33: [2, 25, 1, 0, 0, 0, 0, 2, 0, 2],
};

const FIXED_DAYS: Record<string, Record<number, Move>> = {
  // Egasi jadvali: berilgan 4·100·7·1·1·0·0·10·0 va h.k. (`given = opening + issued`).
  // Kremi (oxirgi ustun, donada): Bahtiyorga 31 dona berildi — jadvalda «31», «10 kar. 1 dona» emas.
  "2026-11-16": {
    31: { issued: [1, 80, 5, 1, 0, 0, 0, 6, 0, 31], sold: [1, 57, 3, 1, 0, 0, 0, 6, 0, 20], gift: [0, 20, 2, 0, 0, 0, 0, 0, 0, 0], other: ZERO, cash: 12_060_000, online: 5_010_000, addresses: 22, refused: 1, openOrders: 9 },
    32: { issued: [5, 60, 2, 0, 0, 1, 0, 12, 0, 9], sold: [6, 40, 2, 0, 0, 1, 0, 12, 0, 8], gift: [0, 15, 1, 0, 0, 0, 0, 0, 0, 0], other: ZERO, cash: 13_170_000, online: 3_720_000, addresses: 23, refused: 0, openOrders: 6 },
    33: { issued: [3, 50, 4, 0, 0, 0, 0, 10, 0, 6], sold: [3, 33, 0, 0, 0, 0, 0, 2, 0, 5], gift: [0, 12, 0, 0, 0, 0, 0, 0, 0, 0], other: ZERO, cash: 5_850_000, online: 2_950_000, addresses: 12, refused: 0, openOrders: 11 },
  },
  // Berish rejasidagi «yana berish kerak» berilgan; Muhammadqul ortiqchasini qaytargan (`other` manfiy).
  "2026-11-17": {
    31: { issued: [2, 57, 4, 1, 0, 0, 0, 5, 0, 12], sold: [4, 52, 4, 1, 0, 0, 0, 7, 0, 22], gift: [0, 18, 1, 0, 0, 0, 0, 0, 0, 0], other: ZERO, cash: 13_240_000, online: 4_380_000, addresses: 24, refused: 0, openOrders: 4 },
    32: { issued: [4, 50, 3, 0, 0, 1, 0, 6, 0, 6], sold: [3, 45, 2, 0, 0, 1, 0, 8, 0, 7], gift: [0, 15, 1, 0, 0, 0, 0, 0, 0, 0], other: ZERO, cash: 11_950_000, online: 4_110_000, addresses: 21, refused: 1, openOrders: 5 },
    33: { issued: [1, 15, 0, 0, 0, 0, 0, 0, 0, 0], sold: [2, 30, 1, 0, 0, 0, 0, 5, 0, 2], gift: [0, 10, 0, 0, 0, 0, 0, 0, 0, 0], other: [0, 0, -3, 0, 0, 0, 0, -2, 0, -1], cash: 6_420_000, online: 2_260_000, addresses: 14, refused: 0, openOrders: 3 },
  },
};

/** Belgilanmagan kun — barqaror son: mol beriladi, bir qismi sotiladi, qoldiq hech qachon minusga tushmaydi. */
function generatedMove(date: string, courierId: number, opening: Vector): Move {
  const seed = (name: string, productId = 0) => demoSeed(name, date, courierId, productId);
  const issued = PRODUCTS.map((product) => Math.round(seed("issued", product.id) * product.dailyLoad));
  const sold = PRODUCTS.map((product, index) => Math.floor((opening[index] + issued[index]) * (0.4 + seed("sold", product.id) * 0.4)));
  const gift = PRODUCTS.map((product, index) =>
    product.gifted ? Math.min(opening[index] + issued[index] - sold[index], Math.floor(sold[index] / 3)) : 0,
  );
  const sales = PRODUCTS.reduce((sum, product, index) => sum + product.price * sold[index], 0);
  const online = Math.round((sales * 0.27) / 10_000) * 10_000;
  return {
    issued,
    sold,
    gift,
    other: ZERO,
    cash: sales - online,
    online,
    addresses: 10 + Math.floor(seed("addresses") * 14),
    refused: seed("refused") > 0.75 ? 1 : 0,
    openOrders: 2 + Math.floor(seed("open") * 8),
  };
}

type DayEntry = { date: string; opening: Vector; move: Move; closing: Vector };

/**
 * Kuryerning `[from, to]` dagi kunlari. Zanjir `SINCE` dan yuritiladi:
 * `closing(kun) = opening(kun + 1)` — konstruksiya bo'yicha (§2.5).
 */
function courierDays(courierId: number, from: string, to: string, today: string): DayEntry[] {
  const days: DayEntry[] = [];
  const last = to < today ? to : today;
  let opening = OPENING[courierId] ?? ZERO;
  for (let date = SINCE; date <= last; date = toIsoDay(addDays(parseISO(date), 1))) {
    const move = FIXED_DAYS[date]?.[courierId] ?? generatedMove(date, courierId, opening);
    const closing = opening.map((quantity, index) => quantity + move.issued[index] - move.sold[index] - move.gift[index] + move.other[index]);
    if (date >= from) days.push({ date, opening, move, closing });
    opening = closing;
  }
  return days;
}

// ── Kuryer xizmati (§3) ─────────────────────────────────────────────────────

type FeeRecord = { amount: number; note: string; setAt: string };

const feeKey = (courierId: number, date: string) => `${courierId}|${date}`;

/** Egasi jadvalidagi xizmat: manzil (yetkazilgan + atkaz) × 65 000. */
const fees = new Map<string, FeeRecord>([
  [feeKey(31, "2026-11-16"), { amount: 1_495_000, note: "23 manzil × 65 000", setAt: "2026-11-16T19:40:00+05:00" }],
  [feeKey(32, "2026-11-16"), { amount: 1_495_000, note: "23 manzil × 65 000", setAt: "2026-11-16T19:42:00+05:00" }],
  [feeKey(33, "2026-11-16"), { amount: 780_000, note: "12 manzil × 65 000", setAt: "2026-11-16T19:45:00+05:00" }],
]);

/** Bir nechta yozuv (oraliq yoki jami): summa — yig'indi, izoh va vaqt — oxirgisi (§2.8). */
function mergeFees(records: readonly FeeRecord[]): FeeRecord | null {
  if (records.length === 0) return null;
  const latest = [...records].sort((a, b) => a.setAt.localeCompare(b.setAt)).at(-1)!;
  return { ...latest, amount: records.reduce((sum, record) => sum + record.amount, 0) };
}

// ── Raqamlar: kun → davr → jami ─────────────────────────────────────────────

const FLOWS = ["opening", "issued", "given", "sold", "gift", "other", "closing"] as const;

type Figures = Record<(typeof FLOWS)[number], Vector> & {
  cash: number;
  online: number;
  addresses: number;
  refused: number;
  openOrders: number;
  fee: FeeRecord | null;
};

const add = (a: Vector, b: Vector): Vector => a.map((quantity, index) => quantity + b[index]);
const sumVectors = (vectors: readonly Vector[]): Vector => vectors.reduce(add, ZERO);
const sumOf = <T>(rows: readonly T[], pick: (row: T) => number) => rows.reduce((sum, row) => sum + pick(row), 0);

function dayFigures(courierId: number, day: DayEntry): Figures {
  return {
    opening: day.opening,
    issued: day.move.issued,
    given: add(day.opening, day.move.issued),
    sold: day.move.sold,
    gift: day.move.gift,
    other: day.move.other,
    closing: day.closing,
    cash: day.move.cash,
    online: day.move.online,
    addresses: day.move.addresses,
    refused: day.move.refused,
    openOrders: day.move.openOrders,
    fee: fees.get(feeKey(courierId, day.date)) ?? null,
  };
}

/** Oraliq (§2.5): `opening` — birinchi kun boshi, `closing` va ochiq zakazlar — oxirgi kun oxiri, qolgani — yig'indi. */
function overDays(days: readonly Figures[]): Figures {
  const issued = sumVectors(days.map((day) => day.issued));
  const opening = days[0].opening;
  return {
    opening,
    issued,
    given: add(opening, issued),
    sold: sumVectors(days.map((day) => day.sold)),
    gift: sumVectors(days.map((day) => day.gift)),
    other: sumVectors(days.map((day) => day.other)),
    closing: days.at(-1)!.closing,
    cash: sumOf(days, (day) => day.cash),
    online: sumOf(days, (day) => day.online),
    addresses: sumOf(days, (day) => day.addresses),
    refused: sumOf(days, (day) => day.refused),
    openOrders: days.at(-1)!.openOrders,
    fee: mergeFees(days.flatMap((day) => day.fee ?? [])),
  };
}

/** `totals` — kuryerlar bo'yicha hamma kalit yig'indisi. */
function overCouriers(couriers: readonly Figures[]): Figures {
  const total = (flow: (typeof FLOWS)[number]) => sumVectors(couriers.map((courier) => courier[flow]));
  return {
    opening: total("opening"),
    issued: total("issued"),
    given: total("given"),
    sold: total("sold"),
    gift: total("gift"),
    other: total("other"),
    closing: total("closing"),
    cash: sumOf(couriers, (courier) => courier.cash),
    online: sumOf(couriers, (courier) => courier.online),
    addresses: sumOf(couriers, (courier) => courier.addresses),
    refused: sumOf(couriers, (courier) => courier.refused),
    openOrders: sumOf(couriers, (courier) => courier.openOrders),
    fee: mergeFees(couriers.flatMap((courier) => courier.fee ?? [])),
  };
}

/** Kassaga topshiriladigan naqd (§2.8): `cash − fee`. */
const handoverDue = (figures: Figures) => figures.cash - (figures.fee?.amount ?? 0);

// ── Javob shakllari (backenddagidek) ────────────────────────────────────────

/**
 * Katak (§2.1, hujjat 84 §2.2): karobkali mahsulotda `qty` — karobka, `pieces` — ortiqcha
 * dona (ishora saqlanadi), `pieces_total` — jami dona. Karobkasiz mahsulotda `qty` — dona.
 */
function cellJson(quantity: number, piecesPerBox: number) {
  // `+ 0` — manfiy harakatda `-0` chiqmasin (javobda oddiy nol).
  return { qty: Math.trunc(quantity / piecesPerBox) + 0, pieces: (quantity % piecesPerBox) + 0, pieces_total: quantity };
}

/** `{id: {qty, pieces, pieces_total}}` — nol katak yuborilmaydi (§2.1). */
function cellsJson(vector: Vector) {
  return Object.fromEntries(
    PRODUCTS.flatMap((product, index) => (vector[index] ? [[String(product.id), cellJson(vector[index], product.piecesPerBox)]] : [])),
  );
}

/** Faqat shu javobda noldan farqli katagi bor mahsulotlar (§2.1); hammasi donada yuritiladi (hujjat 84 §2.1). */
function productsJson(vectors: readonly Vector[]) {
  return PRODUCTS.flatMap((product, index) =>
    vectors.some((vector) => vector[index] !== 0)
      ? [
          {
            id: product.id,
            name: product.name,
            name_uz: product.nameUz,
            order: index + 1,
            unit_label: product.piecesPerBox > 1 ? "karobka" : "dona",
            count_unit: "piece",
            pieces_per_box: product.piecesPerBox,
          },
        ]
      : [],
  );
}

function feeJson(fee: FeeRecord | null) {
  return fee
    ? { amount: fee.amount, note: fee.note, set_by: { id: DEMO_CHIEF.id, full_name: DEMO_CHIEF.fullName }, set_at: fee.setAt }
    : null;
}

function figuresJson(figures: Figures) {
  return {
    opening: cellsJson(figures.opening),
    issued: cellsJson(figures.issued),
    given: cellsJson(figures.given),
    sold: cellsJson(figures.sold),
    gift: cellsJson(figures.gift),
    other: cellsJson(figures.other),
    closing: cellsJson(figures.closing),
    sales_amount: figures.cash + figures.online,
    cash_amount: figures.cash,
    online_amount: figures.online,
    discount_amount: 0,
    addresses: figures.addresses,
    refused_addresses: figures.refused,
    open_orders: figures.openOrders,
    fee: feeJson(figures.fee),
    handover_due: handoverDue(figures),
  };
}

// ── §2. Sotuv jadvali ───────────────────────────────────────────────────────

export type DemoSheetQuery = { dateFrom: string; dateTo: string; courierId: number | null; withDays: boolean };

/** Davrda harakati bo'lgan kuryerlar (§2.12) — kunlik va davr raqamlari bilan. */
function sheetRows(query: DemoSheetQuery, today: string) {
  return COURIERS.filter((courier) => query.courierId === null || courier.id === query.courierId).flatMap((courier) => {
    const days = courierDays(courier.id, query.dateFrom, query.dateTo, today).map((day) => ({
      date: day.date,
      figures: dayFigures(courier.id, day),
    }));
    return days.length > 0 ? [{ courier, days, period: overDays(days.map((day) => day.figures)) }] : [];
  });
}

export function demoSalesSheet(query: DemoSheetQuery, today = todayIso()) {
  const rows = sheetRows(query, today);
  const periods = rows.map((row) => row.period);
  const multiDay = query.dateFrom !== query.dateTo;
  return {
    date_from: query.dateFrom,
    date_to: query.dateTo,
    since: SINCE,
    products: productsJson(periods.flatMap((period) => FLOWS.map((flow) => period[flow]))),
    couriers: rows.map((row) => ({
      courier: { id: row.courier.id, full_name: row.courier.fullName },
      ...figuresJson(row.period),
      // §2.9: bitta kun so'ralsa `days` bo'sh.
      days: query.withDays && multiDay ? row.days.map((day) => ({ date: day.date, ...figuresJson(day.figures) })) : [],
    })),
    totals: figuresJson(overCouriers(periods)),
    checks: [],
  };
}

// ── §3. Kuryer xizmati — `PUT …/fee/` ───────────────────────────────────────

type FeeResult =
  | { ok: true; data: { fee: ReturnType<typeof feeJson>; handover_due: number } }
  | { ok: false; status: number; code: string; fields?: Record<string, string[]> };

const invalid = (fields: Record<string, string[]>): FeeResult => ({ ok: false, status: 400, code: "validation_error", fields });

/** Upsert: bir kuryer + bir kun = bitta yozuv; `0` yoki `null` — o'chirish. Javob: `fee` va `handover_due`. */
export function demoSaveSheetFee(json: Record<string, unknown>, today = todayIso()): FeeResult {
  const courier = COURIERS.find((item) => item.id === Number(json.courier_id));
  if (!courier) return { ok: false, status: 404, code: "courier_not_found" };
  const date = typeof json.date === "string" ? json.date : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return invalid({ date: ["Sana noto'g'ri"] });
  const amount = json.amount === null || json.amount === undefined ? 0 : Number(json.amount);
  if (!Number.isInteger(amount) || amount < 0) return invalid({ amount: ["Summa butun son bo'lsin, manfiy emas"] });
  const note = typeof json.note === "string" ? json.note : "";
  if (note.length > 255) return invalid({ note: ["Izoh 255 belgidan oshmasin"] });

  const key = feeKey(courier.id, date);
  if (amount === 0) fees.delete(key);
  else fees.set(key, { amount, note, setAt: new Date().toISOString() });

  const cash = courierDays(courier.id, date, date, today)[0]?.move.cash ?? 0;
  const fee = fees.get(key) ?? null;
  return { ok: true, data: { fee: feeJson(fee), handover_due: cash - (fee?.amount ?? 0) } };
}

// ── §4. Berish rejasi (egasi maketidagi 17.11.2026 namunasi) ────────────────

const PLAN = [
  { courierId: 31, carried: 9, fresh: 21, onHand: [3, 23, 2, 0, 1, 0, 0, 4, 0, 8], required: [5, 80, 6, 1, 0, 0, 0, 9, 0, 14] },
  { courierId: 32, carried: 6, fresh: 24, onHand: [0, 20, 0, 0, 0, 0, 0, 4, 0, 5], required: [4, 70, 3, 0, 0, 1, 0, 10, 0, 10] },
  { courierId: 33, carried: 11, fresh: 9, onHand: [2, 30, 5, 0, 0, 0, 0, 10, 0, 3], required: [3, 45, 2, 0, 0, 0, 0, 8, 0, 4] },
] as const;

/** Bosh kuryer omboridagi qoldiq (Kremi — 10 dona: 12 berish kerak, 2 yetmaydi). */
const STORE_ON_HAND: Vector = [20, 90, 15, 3, 2, 2, 0, 30, 0, 10];

/** `max(a − b, 0)` — mahsulot bo'yicha. */
const shortfall = (a: Vector, b: Vector): Vector => a.map((quantity, index) => Math.max(quantity - b[index], 0));

export function demoIssuePlan(date: string) {
  const rows = PLAN.map((row) => ({
    ...row,
    toIssue: shortfall(row.required, row.onHand),
    surplus: shortfall(row.onHand, row.required),
  }));
  const toIssue = sumVectors(rows.map((row) => row.toIssue));
  return {
    date,
    products: productsJson([STORE_ON_HAND, ...rows.flatMap((row) => [row.onHand, row.required])]),
    couriers: rows.map((row) => {
      const courier = COURIERS.find((item) => item.id === row.courierId)!;
      return {
        courier: { id: courier.id, full_name: courier.fullName },
        carried_orders: row.carried,
        new_orders: row.fresh,
        on_hand: cellsJson(row.onHand),
        required: cellsJson(row.required),
        to_issue: cellsJson(row.toIssue),
        surplus: cellsJson(row.surplus),
      };
    }),
    store: {
      on_hand: cellsJson(STORE_ON_HAND),
      to_issue: cellsJson(toIssue),
      shortage: cellsJson(shortfall(toIssue, STORE_ON_HAND)),
    },
  };
}

// ── §5. Eksport ─────────────────────────────────────────────────────────────

const SHEET_ROWS = [
  ["Berilgan", "given"],
  ["Sotilgan", "sold"],
  ["Sovg'a", "gift"],
  ["Qolgan", "closing"],
] as const;

/**
 * Demo eksport: haqiqiy server `.xlsx` yasaydi, demo esa o'sha jadvalni CSV
 * qilib beradi (brauzerda xlsx yig'ilmaydi) — Excel uni ham ochadi.
 */
export function demoSalesSheetFile(query: DemoSheetQuery, today = todayIso()) {
  const rows = sheetRows(query, today);
  const blocks = [
    ...rows.map((row) => ({ name: row.courier.fullName, figures: row.period })),
    { name: "JAMI", figures: overCouriers(rows.map((row) => row.period)) },
  ];
  // Donada yuritiladigan karobkali mahsulot ustunida bitta son, sarlavhada «(dona)» (hujjat 84 §2.5).
  const productHeads = PRODUCTS.map((product) => (product.piecesPerBox > 1 ? `${product.nameUz} (dona)` : product.nameUz));
  const head = ["Kuryer", "Qator", ...productHeads, "Naqd", "Onlayn (ilova)", "Manzil soni", "Borganda atkaz", "Kuryer xizmati", "Topshiradi"];
  const lines = blocks.flatMap(({ name, figures }) =>
    SHEET_ROWS.map(([label, flow], index) => {
      const money = index === 0 ? [figures.cash, figures.online, figures.addresses, figures.refused, figures.fee?.amount ?? 0, handoverDue(figures)] : ["", "", "", "", "", ""];
      return [name, label, ...figures[flow], ...money];
    }),
  );
  const range = query.dateFrom === query.dateTo ? query.dateFrom : `${query.dateFrom}_${query.dateTo}`;
  return {
    fileName: `sotuv_${range}.csv`,
    // BOM — Excel UTF-8 ni tanisin.
    content: `﻿${[head, ...lines].map((line) => line.join(";")).join("\n")}`,
    contentType: "text/csv;charset=utf-8",
  };
}
