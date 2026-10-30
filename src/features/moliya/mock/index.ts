import { ApiError } from "@/lib/api-client";

/**
 * Moliya mock — §7 javoblari shartnoma shaklida (string pul). 60 kunlik
 * yetkazilgan buyurtmalar urug'li tasodif bilan; filtr (filial, sana)
 * haqiqiy backend kabi qo'llanadi, shuning uchun formula har davrda
 * to'g'ri yig'iladi.
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
const rand = mulberry32(20261030);
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T,>(list: readonly T[]): T => list[Math.floor(rand() * list.length)]!;
const money = (value: number) => value.toFixed(2);

export const FILIALS = [
  { id: 1, name: "Qo'qon filiali" },
  { id: 2, name: "Toshkent filiali" },
  { id: 3, name: "Andijon filiali" },
  { id: 4, name: "Samarqand filiali" },
];

const ITEMS = [
  { id: 120, name: "Shifo choy", sku: "SH-001", price: 85_000 },
  { id: 121, name: "Jigar yig'masi", sku: "SH-002", price: 120_000 },
  { id: 122, name: "Immunitet balzami", sku: "SH-003", price: 150_000 },
  { id: 123, name: "Asal-zanjabil siropi", sku: "SH-004", price: 95_000 },
  { id: 124, name: "Bo'g'im kremi", sku: "SH-005", price: 110_000 },
  { id: 125, name: "Yurak quvvati damlamasi", sku: "SH-006", price: 130_000 },
  { id: 126, name: "Oshqozon yig'masi", sku: "SH-007", price: 90_000 },
  { id: 127, name: "Tinchlantiruvchi choy", sku: "SH-008", price: 70_000 },
];

const OPERATOR_SEED = [
  { name: "Nilufar Karimova", filial: 1 }, { name: "Dilnoza Rashidova", filial: 1 }, { name: "Shahnoza Yusupova", filial: 1 },
  { name: "Madina Tursunova", filial: 2 }, { name: "Zarina Alimova", filial: 2 }, { name: "Gulnora Saidova", filial: 2 }, { name: "Kamola Ergasheva", filial: 2 },
  { name: "Feruza Qodirova", filial: 3 }, { name: "Sevara Nazarova", filial: 3 },
  { name: "Mohira Rahimova", filial: 4 }, { name: "Dildora Hamidova", filial: 4 },
];

const CUSTOMERS = ["Aziza opa", "Bekzod aka", "Malika", "Rustam aka", "Nodira opa", "Sardor", "Gulbahor opa", "Jamshid aka"];

type Operator = { id: number; name: string; filial: number; percent: number; responseMinutes: number; leads: number; cancelled: number };

const OPERATORS: Operator[] = OPERATOR_SEED.map((seed, index) => ({
  id: 300 + index,
  name: seed.name,
  filial: seed.filial,
  percent: 6,
  responseMinutes: randInt(2, 14),
  leads: 0,
  cancelled: 0,
}));

type Line = { item: (typeof ITEMS)[number]; qty: number; giftQty: number; giftReason: "promo_1_1" | "bonus" | null; discount: number; points: number };
type Order = {
  id: number;
  number: string;
  date: string;
  deliveredAt: string;
  filial: number;
  operator: Operator;
  customer: string;
  lines: Line[];
  total: number;
  pointsAmount: number;
  discountAmount: number;
  logistics: number;
  percent: number;
  fee: number;
};

const SETTINGS = {
  logistics_per_order: 70_000,
  operator_percent: 6,
  history: [
    { at: "2026-09-01T10:00:00+05:00", field: "logistics_per_order", old: "65000.00", new: "70000.00", by: "Dilshod Karimov", note: "benzin oshdi" },
    { at: "2026-06-15T10:00:00+05:00", field: "operator_percent", old: "5.00", new: "6.00", by: "Dilshod Karimov", note: "" },
  ] as Array<{ at: string; field: string; old: string; new: string; by: string; note: string }>,
};

const ORDERS: Order[] = [];
let orderSeq = 88_000;

function isoDay(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() - offset);
  return date.toISOString().slice(0, 10);
}

for (let dayOffset = 59; dayOffset >= 0; dayOffset -= 1) {
  const date = isoDay(dayOffset);
  const count = dayOffset === 0 ? randInt(14, 26) : randInt(24, 48);
  for (let n = 0; n < count; n += 1) {
    const operator = pick(OPERATORS);
    operator.leads += randInt(1, 3);
    if (rand() < 0.08) operator.cancelled += 1;
    const lines: Line[] = [];
    for (let k = 0; k < randInt(1, 3); k += 1) {
      const item = pick(ITEMS);
      const qty = randInt(1, 3);
      const promo = rand() < 0.1;
      const bonus = !promo && rand() < 0.05;
      lines.push({
        item,
        qty,
        giftQty: promo ? qty : bonus ? 1 : 0,
        giftReason: promo ? "promo_1_1" : bonus ? "bonus" : null,
        discount: rand() < 0.17 ? Math.round(item.price * qty * 0.1) : 0,
        points: 0,
      });
    }
    const gross = lines.reduce((sum, line) => sum + line.item.price * line.qty, 0);
    const discountAmount = lines.reduce((sum, line) => sum + line.discount, 0);
    const pointsAmount = rand() < 0.05 ? Math.min(gross - discountAmount, randInt(50, 300) * 1000) : 0;
    const total = gross - discountAmount;
    orderSeq += 1;
    const hour = randInt(9, 20);
    ORDERS.push({
      id: orderSeq,
      number: `ORD-${orderSeq}`,
      date,
      deliveredAt: `${date}T${String(hour).padStart(2, "0")}:${String(randInt(0, 59)).padStart(2, "0")}:00+05:00`,
      filial: operator.filial,
      operator,
      customer: pick(CUSTOMERS),
      lines,
      total,
      pointsAmount,
      discountAmount,
      logistics: SETTINGS.logistics_per_order,
      percent: operator.percent,
      fee: Math.round((total * operator.percent) / 100),
    });
  }
}

function filtered(query: Record<string, unknown>): Order[] {
  const filial = String(query.filial ?? "all");
  const from = String(query.date_from ?? "0000-00-00");
  const to = String(query.date_to ?? "9999-99-99");
  return ORDERS.filter((order) => (filial === "all" || order.filial === Number(filial)) && order.date >= from && order.date <= to);
}

function sum<T>(rows: T[], pickValue: (row: T) => number): number {
  return rows.reduce((acc, row) => acc + pickValue(row), 0);
}

/**
 * Manzil soni: bir kunda bitta kuryer bitta manzilga olib borgan buyurtmalar
 * bitta manzil (namunada har 12-buyurtma oldingisi bilan bir manzilda).
 * Logistika = manzil × stavka.
 */
function summaryOf(rows: Order[]) {
  const revenue = sum(rows, (o) => o.total);
  const operator_fee = sum(rows, (o) => o.fee);
  const addresses = rows.length - Math.floor(rows.length / 12);
  const logistics = addresses * SETTINGS.logistics_per_order;
  return { revenue, operator_fee, logistics, addresses, remaining: revenue - operator_fee - logistics };
}

const flagsOf = (order: Order): string[] => {
  const flags = new Set<string>();
  for (const line of order.lines) {
    if (line.giftReason === "promo_1_1") flags.add("promo_1_1");
    if (line.giftReason === "bonus") flags.add("gift");
    if (line.discount > 0) flags.add("discount");
  }
  if (order.pointsAmount > 0) flags.add("points");
  return [...flags];
};

function operatorRow(operator: Operator, rows: Order[]) {
  const mine = rows.filter((order) => order.operator.id === operator.id);
  const span = rows.length > 0 ? 1 : 0;
  return {
    operator: { id: operator.id, full_name: operator.name, filial: FILIALS.find((f) => f.id === operator.filial)?.name ?? "" },
    leads: Math.round(operator.leads * (mine.length / Math.max(1, ORDERS.filter((o) => o.operator.id === operator.id).length))) * span,
    orders: mine.length + Math.round(mine.length * 0.12),
    delivered: mine.length,
    cancelled: Math.round(operator.cancelled * (mine.length / Math.max(1, ORDERS.filter((o) => o.operator.id === operator.id).length))),
    revenue: money(sum(mine, (o) => o.total)),
    percent: money(operator.percent),
    fee: money(sum(mine, (o) => o.fee)),
  };
}

function compareOf(rows: Order[], operators: Operator[]) {
  const mine = rows.filter((order) => operators.some((op) => op.id === order.operator.id));
  const leads = sum(operators, (op) => op.leads) || 1;
  const delivered = mine.length;
  return {
    lead_to_order: Number((delivered / leads).toFixed(2)),
    cancel_rate: Number((sum(operators, (op) => op.cancelled) / Math.max(1, delivered + sum(operators, (op) => op.cancelled))).toFixed(2)),
    avg_order: money(delivered ? sum(mine, (o) => o.total) / delivered : 0),
    discounts: money(sum(mine, (o) => o.discountAmount)),
    gifts: sum(mine, (o) => sum(o.lines, (l) => l.giftQty)),
    points_orders: mine.filter((o) => o.pointsAmount > 0).length,
    response_minutes: operators.length ? Math.round(sum(operators, (op) => op.responseMinutes) / operators.length) : 0,
  };
}

const latency = () => new Promise((resolve) => setTimeout(resolve, 150 + Math.random() * 150));

export async function mockFinance(method: "get" | "patch", path: string, query: Record<string, unknown> = {}, json?: unknown): Promise<unknown> {
  await latency();
  const rows = filtered(query);

  if (path === "/sklad/finance/settings/") {
    if (method === "patch") {
      const body = (json ?? {}) as Record<string, unknown>;
      const now = new Date().toISOString();
      for (const field of ["logistics_per_order", "operator_percent"] as const) {
        if (body[field] === undefined) continue;
        const next = Number(body[field]);
        if (!Number.isFinite(next) || next < 0) throw new ApiError("Noto'g'ri qiymat", 400, { code: "validation_error", fields: { [field]: ["noto'g'ri"] } }, "validation_error");
        SETTINGS.history.unshift({ at: now, field, old: money(SETTINGS[field]), new: money(next), by: "Dilshod Karimov", note: String(body.note ?? "") });
        SETTINGS[field] = next;
      }
    }
    return { logistics_per_order: money(SETTINGS.logistics_per_order), operator_percent: money(SETTINGS.operator_percent), history: SETTINGS.history };
  }

  if (path === "/sklad/finance/summary/") {
    const totals = summaryOf(rows);
    const byDay = new Map<string, Order[]>();
    for (const order of rows) byDay.set(order.date, [...(byDay.get(order.date) ?? []), order]);
    const lines = rows.flatMap((o) => o.lines);
    return {
      period: { from: query.date_from, to: query.date_to },
      filial: query.filial ?? "all",
      revenue: money(totals.revenue),
      orders: rows.length,
      operator_fee: money(totals.operator_fee),
      logistics: money(totals.logistics),
      addresses: totals.addresses,
      remaining: money(totals.remaining),
      sold_qty: sum(lines, (l) => l.qty),
      gift_qty: sum(lines, (l) => l.giftQty),
      gift_1_1: sum(lines.filter((l) => l.giftReason === "promo_1_1"), (l) => l.giftQty),
      gift_bonus: sum(lines.filter((l) => l.giftReason === "bonus"), (l) => l.giftQty),
      points_orders: rows.filter((o) => o.pointsAmount > 0).length,
      points_amount: money(sum(rows, (o) => o.pointsAmount)),
      discount_amount: money(sum(rows, (o) => o.discountAmount)),
      discount_orders: rows.filter((o) => o.discountAmount > 0).length,
      by_day: [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, dayRows]) => {
        const day = summaryOf(dayRows);
        return { date, revenue: money(day.revenue), orders: dayRows.length, remaining: money(day.remaining) };
      }),
      by_filial: FILIALS.map((filial) => {
        const mine = rows.filter((o) => o.filial === filial.id);
        const part = summaryOf(mine);
        return { filial, orders: mine.length, revenue: money(part.revenue), remaining: money(part.remaining) };
      }).filter((row) => row.orders > 0),
    };
  }

  if (path === "/sklad/finance/products/") {
    return ITEMS.map((item) => {
      const lines = rows.flatMap((o) => o.lines.filter((l) => l.item.id === item.id));
      return {
        item: { id: item.id, name: item.name, sku: item.sku },
        sold_qty: sum(lines, (l) => l.qty),
        gift_qty: sum(lines, (l) => l.giftQty),
        points_orders: rows.filter((o) => o.pointsAmount > 0 && o.lines.some((l) => l.item.id === item.id)).length,
        discount_amount: money(sum(lines, (l) => l.discount)),
        revenue: money(sum(lines, (l) => l.item.price * l.qty - l.discount)),
      };
    }).filter((row) => row.sold_qty > 0).sort((a, b) => Number(b.revenue) - Number(a.revenue));
  }

  if (path === "/sklad/finance/gifts/") {
    return rows.flatMap((o) =>
      o.lines.filter((l) => l.giftQty > 0).map((l) => ({
        order_number: o.number,
        gift_reason: l.giftReason,
        item: { id: l.item.id, name: l.item.name, sku: l.item.sku },
        qty: l.giftQty,
        filial: FILIALS.find((f) => f.id === o.filial)?.name ?? "",
        date: o.deliveredAt,
      })),
    ).sort((a, b) => b.date.localeCompare(a.date));
  }

  if (path === "/sklad/finance/points/") {
    return rows.filter((o) => o.pointsAmount > 0).map((o) => ({
      order_number: o.number,
      items: o.lines.map((l) => l.item.name),
      points_amount: money(o.pointsAmount),
      cash_amount: money(o.total - o.pointsAmount),
      filial: FILIALS.find((f) => f.id === o.filial)?.name ?? "",
      date: o.deliveredAt,
    })).sort((a, b) => b.date.localeCompare(a.date));
  }

  if (path === "/sklad/finance/operators/") {
    const filial = String(query.filial ?? "all");
    return OPERATORS.filter((op) => filial === "all" || op.filial === Number(filial))
      .map((op) => operatorRow(op, rows))
      .sort((a, b) => Number(b.revenue) - Number(a.revenue));
  }

  const detail = path.match(/^\/sklad\/finance\/operators\/(\d+)\/$/);
  if (detail) {
    const operator = OPERATORS.find((op) => op.id === Number(detail[1]));
    if (!operator) throw new ApiError("Operator topilmadi", 404, { code: "not_found" }, "not_found");
    const mine = rows.filter((o) => o.operator.id === operator.id);
    const others = OPERATORS.filter((op) => op.filial === operator.filial && op.id !== operator.id);
    return {
      ...operatorRow(operator, rows),
      products: ITEMS.map((item) => {
        const lines = mine.flatMap((o) => o.lines.filter((l) => l.item.id === item.id));
        return { item: { id: item.id, name: item.name, sku: item.sku }, qty: sum(lines, (l) => l.qty), gift_qty: sum(lines, (l) => l.giftQty), revenue: money(sum(lines, (l) => l.item.price * l.qty - l.discount)) };
      }).filter((row) => row.qty > 0).sort((a, b) => Number(b.revenue) - Number(a.revenue)),
      compare: { me: compareOf(rows, [operator]), others: compareOf(rows, others) },
      orders: [...mine].sort((a, b) => b.deliveredAt.localeCompare(a.deliveredAt)).slice(0, 50).map((o) => ({
        number: o.number,
        date: o.deliveredAt,
        customer: o.customer,
        items: o.lines.map((l) => `${l.item.name} ×${l.qty}`),
        flags: flagsOf(o),
        total: money(o.total),
        status: "delivered",
        fee: money(o.fee),
      })),
    };
  }

  throw new ApiError(`Mock: ${method.toUpperCase()} ${path} yo'q`, 404);
}

/** `?format=xlsx` ning mock o'rni — o'sha javob qatorlari CSV sifatida. */
export async function mockFinanceExport(path: string, query: Record<string, unknown>): Promise<Blob> {
  const data = await mockFinance("get", path, query);
  const rows: unknown[] = Array.isArray(data) ? data : [data];
  const flat = rows.map((row) => flatten(row));
  const columns = [...new Set(flat.flatMap((row) => Object.keys(row)))];
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [columns.join(";"), ...flat.map((row) => columns.map((column) => escape(row[column])).join(";"))].join("\n");
  return new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
}

function flatten(value: unknown, prefix = "", out: Record<string, unknown> = {}): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, inner] of Object.entries(value)) flatten(inner, prefix ? `${prefix}.${key}` : key, out);
  } else if (Array.isArray(value)) {
    out[prefix] = value.length;
  } else {
    out[prefix] = value;
  }
  return out;
}
