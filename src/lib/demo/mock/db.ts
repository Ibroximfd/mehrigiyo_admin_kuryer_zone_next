import { startOfDay, subDays } from "date-fns";

import { DEMO_FILIALS, DEMO_PRODUCTS, demoSeed } from "@/lib/demo/mock/dataset";
import type { FilialCode } from "@/lib/demo/mock/dataset";
import { toIsoDay } from "@/lib/format";

import {
  DEMO_CHIEF,
  DEMO_CLIENTS,
  DEMO_COURIERS,
  DEMO_DECLARED_YESTERDAY,
  DEMO_ORDER_PLAN,
  DEMO_REGIONS,
  DEMO_STREETS,
  DEMO_NOTES,
  DEMO_ZONES,
} from "./fixtures";
import type { DemoDistrict } from "./fixtures";

/**
 * Demo rejimning xotiradagi bazasi. Brauzer sahifasi yangilansa modul qayta
 * yuklanadi va hammasi boshlang'ich holatga qaytadi — ataylab, saqlanmaydi.
 * Kassa 2-pog'ona (`features/cash/demo.ts`) ham shu bazadan o'qiydi: kuryerdan
 * qabul qilingan pul filiallar bo'yicha shu yerda yig'iladi.
 */

export type DemoCourierRow = {
  id: number;
  fullName: string;
  phone: string;
  isActive: boolean;
  zoneId: number | null;
  onShift: boolean;
  hasAccount: boolean;
};

export type DemoZoneRow = { id: number; region: string; name: string; isActive: boolean; districtCodes: string[] };

export type DemoOrderRow = {
  id: string;
  number: string;
  filial: FilialCode;
  client: { name: string; phone: string };
  region: string;
  district: string;
  address: string;
  items: Array<{ productId: number; quantity: number }>;
  total: number;
  createdAt: Date;
  courierId: number | null;
  status: "shipping" | "delivered";
  deliveredAt: Date | null;
  /** Bosh kuryer kuryerdan pulni qabul qilgan kun; `null` — pul hali kuryerda. */
  settledDay: string | null;
  /** Pul filialga topshirilganmi. */
  handedToFilial: boolean;
  /** Mijoz izohi. */
  note: string | null;
  /** Kim manzilni o'zgartirgan (`chief` — bosh kuryer tuzatgan). */
  addressChangedBy: "chief" | "courier" | null;
  landmark: string | null;
  /** Logistga qaytarilgan — bosh kuryer ro'yxatlaridan chiqadi. */
  returned: boolean;
  /** Qaytarish sababi va izohi (`return_reason` / `return_note`); qaytarilmagan — `null`. */
  returnReason: string | null;
  returnNote: string | null;
  history: DemoHistoryEntry[];
};

/** Zakaz tarixi — `action` kodi, yorlig'ini frontend beradi. */
export type DemoHistoryEntry = { at: Date; action: string; actor: string | null; courier: string | null };

/** Kuryer ilovasidan «topshiraman» e'loni. */
export type DemoDeclaration = { courierId: number; date: string; amount: number; createdAt: Date };

export type DemoFilialHandover = {
  id: number;
  /** `null` — eski, filialsiz e'lon. */
  filial: FilialCode | null;
  date: string;
  periodFrom: string | null;
  periodTo: string | null;
  amount: number;
  expectedAmount: number;
  confirmedAmount: number | null;
  status: "pending" | "confirmed" | "disputed";
  note: string;
  clientActionId: string | null;
  createdAt: Date;
};

/** Kuryerdan qabul — kun bo'yicha; sanalgan summa e'londan farq qilsa `disputed`. */
export type DemoSettlement = { courierId: number; date: string; declared: number; confirmed: number; at: Date };

export function dayOffset(daysAgo: number, now = new Date()): string {
  return toIsoDay(subDays(now, daysAgo));
}

function at(daysAgo: number, hour: number, now: Date): Date {
  const date = subDays(now, daysAgo);
  date.setHours(hour, (hour * 7) % 60, 0, 0);
  return date;
}

/**
 * Sana `now` dan keyin bo'lsa — `minutes` daqiqa oldinga suriladi, lekin o'sha
 * kun ichida qoladi (tun yarmidan keyin ham «bugun yetkazilgan» bo'lsin).
 */
function notAfter(date: Date, now: Date, minutes: number): Date {
  if (date.getTime() < now.getTime()) return date;
  const room = now.getTime() - startOfDay(now).getTime();
  return new Date(now.getTime() - Math.min(minutes * 60_000, room * 0.9));
}

function regionOf(district: string): string {
  return DEMO_REGIONS.find((region) => region.districts.some((item) => item.code === district))?.region ?? "";
}

function buildOrders(now: Date): DemoOrderRow[] {
  return DEMO_ORDER_PLAN.map((plan, index) => {
    const seed = demoSeed("order", index);
    const products = DEMO_PRODUCTS.filter((product) => product.filial === plan.filial);
    const product = products[index % products.length]!;
    const quantity = 1 + Math.floor(seed * 3);
    const daysAgo = plan.daysAgo ?? 0;
    const delivered = plan.kind === "delivered";
    // Bugungi soatlar kelajakda qolmasin (tun yarmida ochilsa ham tarix to'g'ri tursin).
    const deliveredAt = delivered ? notAfter(at(daysAgo, 11 + (index % 7), now), now, 30 + index * 3) : null;
    const createdRaw = notAfter(at(daysAgo + (delivered ? 1 : 0), 8 + (index % 9), now), now, 90 + index * 10);
    const createdAt =
      deliveredAt && createdRaw >= deliveredAt ? new Date(deliveredAt.getTime() - 3 * 3_600_000) : createdRaw;
    const courier = DEMO_COURIERS.find((item) => item.id === plan.courierId)?.fullName ?? null;
    const later = (minutes: number) => new Date(createdAt.getTime() + minutes * 60_000);
    const history: DemoHistoryEntry[] = [
      { at: createdAt, action: "created", actor: null, courier: null },
      { at: later(25), action: "chief_assigned", actor: null, courier: null },
    ];
    if (courier) history.push({ at: later(70), action: "courier_assigned", actor: DEMO_CHIEF.fullName, courier });
    if (deliveredAt) history.push({ at: deliveredAt, action: "delivered", actor: courier, courier });
    if (plan.settled && deliveredAt) history.push({ at: new Date(deliveredAt.getTime() + 5 * 3_600_000), action: "cash_accepted", actor: DEMO_CHIEF.fullName, courier });
    return {
      id: `demo-${1000 + index}`,
      number: `DA-${184_100 + index * 7}`,
      filial: plan.filial,
      client: {
        name: DEMO_CLIENTS[index % DEMO_CLIENTS.length]!,
        phone: `99890${String(5_100_000 + index * 3_731).padStart(7, "0")}`,
      },
      region: regionOf(plan.district),
      district: plan.district,
      address: `${DEMO_STREETS[index % DEMO_STREETS.length]!}, ${3 + ((index * 5) % 40)}-uy`,
      items: [{ productId: product.id, quantity }],
      total: product.price * quantity,
      // Kelganlar eng yangi, yetkazilganlar — yetkazilgan kunidan oldin.
      createdAt,
      courierId: plan.courierId ?? null,
      status: delivered ? "delivered" : "shipping",
      deliveredAt,
      settledDay: plan.settled && deliveredAt ? toIsoDay(deliveredAt) : null,
      handedToFilial: false,
      note: index % 4 === 1 ? DEMO_NOTES[index % DEMO_NOTES.length]! : null,
      // Bitta zakazda kuryer manzilni o'zgartirgan — kartadagi belgi ko'rinsin.
      addressChangedBy: index === 9 ? ("courier" as const) : null,
      landmark: null,
      returned: false,
      returnReason: null,
      returnNote: null,
      history,
    };
  });
}

function buildDeclarations(orders: DemoOrderRow[], now: Date): DemoDeclaration[] {
  const yesterday = dayOffset(1, now);
  return DEMO_DECLARED_YESTERDAY.map((courierId) => ({
    courierId,
    date: yesterday,
    amount: orders
      .filter((order) => order.courierId === courierId && order.deliveredAt && toIsoDay(order.deliveredAt) === yesterday)
      .reduce((sum, order) => sum + order.total, 0),
    createdAt: at(0, 9, now),
  })).filter((item) => item.amount > 0);
}

function buildHistory(now: Date): DemoFilialHandover[] {
  const code = (index: number) => DEMO_FILIALS[index % DEMO_FILIALS.length]!.code;
  return [4, 4, 5, 6, 6, 7].map((daysAgo, index) => {
    const amount = 1_000_000 + Math.round(demoSeed("handover", index) * 40) * 100_000;
    // Bittasi kamomad bilan qabul qilingan — `disputed` holati ham ko'rinsin.
    const confirmed = index === 2 ? amount - 50_000 : amount;
    return {
      id: index + 1,
      filial: code(index),
      date: dayOffset(daysAgo, now),
      periodFrom: dayOffset(daysAgo + 1, now),
      periodTo: dayOffset(daysAgo, now),
      amount,
      expectedAmount: amount,
      confirmedAmount: confirmed,
      status: confirmed === amount ? ("confirmed" as const) : ("disputed" as const),
      note: "",
      clientActionId: null,
      createdAt: at(daysAgo, 18, now),
    };
  });
}

/** Oldindan qabul qilingan kunlar — to'liq summa bilan. */
function buildSettlements(orders: DemoOrderRow[]): DemoSettlement[] {
  const groups = new Map<string, DemoSettlement>();
  for (const order of orders) {
    if (!order.settledDay || !order.deliveredAt || order.courierId === null) continue;
    const date = toIsoDay(order.deliveredAt);
    const key = `${order.courierId}|${date}`;
    const row = groups.get(key) ?? { courierId: order.courierId, date, declared: 0, confirmed: 0, at: order.deliveredAt };
    groups.set(key, { ...row, declared: row.declared + order.total, confirmed: row.confirmed + order.total });
  }
  return [...groups.values()];
}

function initialState(now = new Date()) {
  const orders = buildOrders(now);
  return {
    couriers: DEMO_COURIERS.map((courier): DemoCourierRow => ({ ...courier, hasAccount: true })),
    zones: DEMO_ZONES.map((zone): DemoZoneRow => ({ ...zone, districtCodes: [...zone.districtCodes] })),
    orders,
    declarations: buildDeclarations(orders, now),
    filialHandovers: buildHistory(now),
    /** Bosh kuryer qo'lda qo'shgan joylar (V6) — lug'atga tushadi. */
    customPlaces: [] as DemoDistrict[],
    settlements: buildSettlements(orders),
    nextId: 900,
  };
}

/** Yagona holat — o'qish va yozish shu obyekt orqali. */
export const demoDb = initialState();

export function nextDemoId(): number {
  demoDb.nextId += 1;
  return demoDb.nextId;
}

/** Zakaz manzili tushadigan faol zona. */
export function zoneOfDistrict(district: string): DemoZoneRow | null {
  return demoDb.zones.find((zone) => zone.isActive && zone.districtCodes.includes(district)) ?? null;
}

export function allDistricts(): DemoDistrict[] {
  return [...DEMO_REGIONS.flatMap((region) => region.districts), ...demoDb.customPlaces];
}

export function districtName(code: string): string {
  return allDistricts().find((district) => district.code === code)?.name ?? code;
}

export function pushHistory(order: DemoOrderRow, action: string, courier: string | null): void {
  order.history.push({ at: new Date(), action, actor: DEMO_CHIEF.fullName, courier });
}

/** Kuryerdagi ochiq zakazlar soni — yuklama. */
export function courierLoad(courierId: number): number {
  return demoDb.orders.filter((order) => order.status === "shipping" && order.courierId === courierId).length;
}
