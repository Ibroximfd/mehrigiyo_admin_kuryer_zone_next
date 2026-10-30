import { ApiError } from "@/lib/api-client";

/**
 * Analitika mock — §8 voronkasi. Kunlik urug'li raqamlar: lid → buyurtma
 * → dostavka → yetkazildi; filtr (filial, sana) haqiqiy backend kabi.
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
const rand = mulberry32(20261031);
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const money = (value: number) => value.toFixed(2);

const FILIALS = [
  { id: 1, name: "Qo'qon filiali" },
  { id: 2, name: "Toshkent filiali" },
  { id: 3, name: "Andijon filiali" },
  { id: 4, name: "Samarqand filiali" },
];

const OPERATORS = [
  { id: 300, full_name: "Nilufar Karimova", filial: 1 }, { id: 301, full_name: "Dilnoza Rashidova", filial: 1 }, { id: 302, full_name: "Shahnoza Yusupova", filial: 1 },
  { id: 303, full_name: "Madina Tursunova", filial: 2 }, { id: 304, full_name: "Zarina Alimova", filial: 2 }, { id: 305, full_name: "Gulnora Saidova", filial: 2 }, { id: 306, full_name: "Kamola Ergasheva", filial: 2 },
  { id: 307, full_name: "Feruza Qodirova", filial: 3 }, { id: 308, full_name: "Sevara Nazarova", filial: 3 },
  { id: 309, full_name: "Mohira Rahimova", filial: 4 }, { id: 310, full_name: "Dildora Hamidova", filial: 4 },
];

const CANCEL_REASONS = [
  { code: "not_taken", label: "Mijoz olmadi" },
  { code: "changed_mind", label: "Fikridan qaytdi" },
  { code: "wrong_address", label: "Manzil noto'g'ri" },
  { code: "no_answer", label: "Telefon ko'tarmadi" },
  { code: "price", label: "Narx yoqmadi" },
];

const LEAD_SOURCES = [
  { code: "app", label: "Ilova" },
  { code: "instagram", label: "Instagram" },
  { code: "telegram", label: "Telegram" },
  { code: "call", label: "Qo'ng'iroq" },
  { code: "manual", label: "Qo'lda" },
];

type Day = {
  date: string;
  filial: number;
  operator: number;
  leads: number;
  orders: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  in_transit: number;
  over_2d: number;
  revenue: number;
  fee: number;
  reasons: Record<string, number>;
  sources: Record<string, number>;
};

const DAYS: Day[] = [];

for (let offset = 89; offset >= 0; offset -= 1) {
  const date = new Date();
  date.setDate(date.getDate() - offset);
  const iso = date.toISOString().slice(0, 10);
  for (const operator of OPERATORS) {
    const leads = randInt(3, 12);
    const orders = Math.round(leads * (0.35 + rand() * 0.25));
    const cancelled = Math.round(orders * (0.04 + rand() * 0.08));
    const shipped = orders - cancelled;
    const in_transit = offset === 0 ? randInt(0, 2) : offset < 3 ? randInt(0, 1) : 0;
    const delivered = Math.max(0, shipped - in_transit);
    const avg = randInt(180, 320) * 1000;
    const reasons: Record<string, number> = {};
    for (let n = 0; n < cancelled; n += 1) {
      const reason = CANCEL_REASONS[Math.min(CANCEL_REASONS.length - 1, Math.floor(Math.abs(rand() - rand()) * CANCEL_REASONS.length))]!;
      reasons[reason.code] = (reasons[reason.code] ?? 0) + 1;
    }
    const sources: Record<string, number> = {};
    for (let n = 0; n < leads; n += 1) {
      const source = LEAD_SOURCES[Math.min(LEAD_SOURCES.length - 1, Math.floor(Math.abs(rand() - rand()) * LEAD_SOURCES.length))]!;
      sources[source.code] = (sources[source.code] ?? 0) + 1;
    }
    DAYS.push({
      date: iso,
      filial: operator.filial,
      operator: operator.id,
      leads,
      orders,
      shipped,
      delivered,
      cancelled,
      in_transit,
      over_2d: in_transit > 0 && rand() < 0.2 ? 1 : 0,
      revenue: delivered * avg,
      fee: Math.round(delivered * avg * 0.06),
      reasons,
      sources,
    });
  }
}

function filtered(query: Record<string, unknown>, from: string, to: string): Day[] {
  const filial = String(query.filial ?? "all");
  return DAYS.filter((day) => (filial === "all" || day.filial === Number(filial)) && day.date >= from && day.date <= to);
}

const sum = (rows: Day[], pick: (day: Day) => number) => rows.reduce((acc, day) => acc + pick(day), 0);

function shiftDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const latency = () => new Promise((resolve) => setTimeout(resolve, 150 + Math.random() * 150));

export async function mockFunnel(query: Record<string, unknown>): Promise<unknown> {
  await latency();
  const from = String(query.date_from ?? "0000-00-00");
  const to = String(query.date_to ?? "9999-99-99");
  const rows = filtered(query, from, to);

  // O'tgan davr — xuddi shu uzunlikdagi oldingi oraliq.
  const span = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000) + 1);
  const prev = filtered(query, shiftDays(from, -span), shiftDays(to, -span));
  const prevLeads = sum(prev, (d) => d.leads);

  const reasons = new Map<string, number>();
  const sources = new Map<string, number>();
  for (const day of rows) {
    for (const [code, count] of Object.entries(day.reasons)) reasons.set(code, (reasons.get(code) ?? 0) + count);
    for (const [code, count] of Object.entries(day.sources)) sources.set(code, (sources.get(code) ?? 0) + count);
  }
  const byDay = new Map<string, Day[]>();
  for (const day of rows) byDay.set(day.date, [...(byDay.get(day.date) ?? []), day]);

  const avgOrder = sum(rows, (d) => d.delivered) ? sum(rows, (d) => d.revenue) / sum(rows, (d) => d.delivered) : 0;

  return {
    leads: sum(rows, (d) => d.leads),
    orders: sum(rows, (d) => d.orders),
    orders_sum: money(sum(rows, (d) => d.orders) * avgOrder),
    shipped: sum(rows, (d) => d.shipped),
    delivered: sum(rows, (d) => d.delivered),
    delivered_sum: money(sum(rows, (d) => d.revenue)),
    cancelled: sum(rows, (d) => d.cancelled),
    cancelled_sum: money(sum(rows, (d) => d.cancelled) * avgOrder),
    in_transit: sum(rows, (d) => d.in_transit),
    in_transit_over_2d: sum(rows, (d) => d.over_2d),
    cancel_reasons: CANCEL_REASONS.map((reason) => ({ ...reason, count: reasons.get(reason.code) ?? 0 })).filter((r) => r.count > 0).sort((a, b) => b.count - a.count),
    lead_sources: LEAD_SOURCES.map((source) => ({ ...source, count: sources.get(source.code) ?? 0 })).filter((s) => s.count > 0).sort((a, b) => b.count - a.count),
    by_day: [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, dayRows]) => ({
      date,
      leads: sum(dayRows, (d) => d.leads),
      orders: sum(dayRows, (d) => d.orders),
      delivered: sum(dayRows, (d) => d.delivered),
      cancelled: sum(dayRows, (d) => d.cancelled),
      in_transit: sum(dayRows, (d) => d.in_transit),
      revenue: money(sum(dayRows, (d) => d.revenue)),
    })),
    by_operator: OPERATORS.map((operator) => {
      const mine = rows.filter((d) => d.operator === operator.id);
      return {
        operator: { id: operator.id, full_name: operator.full_name, filial: FILIALS.find((f) => f.id === operator.filial)?.name ?? "" },
        leads: sum(mine, (d) => d.leads),
        orders: sum(mine, (d) => d.orders),
        delivered: sum(mine, (d) => d.delivered),
        cancelled: sum(mine, (d) => d.cancelled),
        revenue: money(sum(mine, (d) => d.revenue)),
        fee: money(sum(mine, (d) => d.fee)),
      };
    }).filter((row) => row.leads > 0).sort((a, b) => b.delivered - a.delivered),
    prev_period: { lead_to_order: prevLeads ? Number((sum(prev, (d) => d.orders) / prevLeads).toFixed(2)) : null },
  };
}

export function mockFunnelError(path: string): never {
  throw new ApiError(`Mock: GET ${path} yo'q`, 404);
}
