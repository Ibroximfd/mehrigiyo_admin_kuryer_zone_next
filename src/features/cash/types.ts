import { differenceInCalendarDays, parseISO } from "date-fns";

import { mapFilial } from "@/features/couriers/types";
import { mapFinanceFilialRow } from "@/features/report/types";
import type { FinanceFilialRow } from "@/features/report/types";
import { parseDate } from "@/lib/format";
import { asArray, asBool, asInt, asNumber, asOptionalNumber, asOptionalString, asRecord, asString, isRecord } from "@/lib/parse";

/**
 * Kassa (`21_TUZILMA_V2` §6; backend `TUZILMA_V2` §5.2–5.3, K1 javoblari):
 * 1-pog'ona — kuryer → bosh kuryer (`chief/cod/handovers/`, `settle/`);
 * 2-pog'ona — bosh kuryer → har filialga alohida (`chief/cash/handover/`).
 * Summa cheklanmaydi: to'liq summa topshiriladi, farq tasdiqda `shortage`.
 */
export const MAX_HANDOVER_DELAY_DAYS = 3;

export type HandoverStatus = "pending" | "confirmed" | "disputed";

function asHandoverStatus(value: unknown): HandoverStatus {
  return value === "confirmed" || value === "disputed" ? value : "pending";
}

// ── 2-pog'ona: bosh kuryer → filial ─────────────────────────────────────────

export type ChiefHandover = {
  id: number;
  /** Eski qatorlarda `null` — filialsiz e'lon. */
  filial: { id: number; name: string } | null;
  date: string;
  periodFrom: string | null;
  periodTo: string | null;
  amount: number;
  expectedAmount: number | null;
  confirmedAmount: number | null;
  /** `amount − confirmed_amount` — filial kam qabul qilgan bo'lsa. */
  shortage: number | null;
  status: HandoverStatus;
  note: string;
  logistNote: string;
  logistName: string | null;
  createdAt: Date | null;
};

export function mapChiefHandover(raw: unknown): ChiefHandover | null {
  if (!isRecord(raw)) return null;
  const id = asInt(raw.id, -1);
  if (id < 0) return null;
  return {
    id,
    filial: mapFilial(raw.filial),
    date: asString(raw.date),
    periodFrom: asOptionalString(raw.period_from),
    periodTo: asOptionalString(raw.period_to),
    amount: asNumber(raw.amount),
    expectedAmount: asOptionalNumber(raw.expected_amount),
    confirmedAmount: asOptionalNumber(raw.confirmed_amount),
    shortage: asOptionalNumber(raw.shortage),
    status: asHandoverStatus(raw.status),
    note: asString(raw.note),
    logistNote: asString(raw.logist_note),
    logistName: asOptionalString(asRecord(raw.logist).full_name),
    createdAt: parseDate(raw.created_at),
  };
}

export type ChiefCash = {
  dateFrom: string;
  dateTo: string;
  collectedFromCouriers: number;
  /** Topshirilmagan jami. */
  outstanding: number;
  /** Topshirilmagan kunlar, eski birinchi. */
  outstandingDays: string[];
  /** Filial kesimi — `to_hand_over` har filialga qancha berish kerakligi. */
  byFilial: FinanceFilialRow[];
  handovers: ChiefHandover[];
};

export function mapChiefCash(raw: unknown): ChiefCash {
  const json = asRecord(raw);
  const rows = asArray(json.by_filial).map(mapFinanceFilialRow);
  return {
    dateFrom: asString(json.date_from),
    dateTo: asString(json.date_to),
    collectedFromCouriers: asNumber(json.collected_from_couriers),
    outstanding: asNumber(json.outstanding),
    outstandingDays: asArray(json.outstanding_days).map((day) => asString(day)).filter(Boolean).sort(),
    byFilial: [...rows.filter((row) => row.filial), ...rows.filter((row) => !row.filial)],
    handovers: asArray(json.handovers)
      .map(mapChiefHandover)
      .filter((item): item is ChiefHandover => item !== null),
  };
}

/** `400 filial_required` dagi tanlov — qoldig'i kattasi birinchi. */
export type FilialChoice = { id: number; name: string; toHandOver: number };

export function mapFilialChoices(raw: unknown): FilialChoice[] {
  return asArray(asRecord(raw).filials)
    .map((item) => {
      const row = asRecord(item);
      return { id: asInt(row.id), name: asString(row.name), toHandOver: asNumber(row.to_hand_over) };
    })
    .filter((row) => row.id > 0)
    .sort((a, b) => b.toHandOver - a.toHandOver);
}

/** Topshirish natijasi — xato qiymat sifatida: filial tanlash kerak bo'lsa tanlov qaytadi. */
export type HandoverResult =
  | { kind: "created"; handover: ChiefHandover | null }
  | { kind: "filial_required"; filials: FilialChoice[] };

export type HandoverTiming = "settled" | "on_time" | "late_allowed" | "overdue";

/**
 * Topshirish muddati: eng eski topshirilmagan kunning ertasi — topshirish kuni;
 * 3 kungacha kechikish ruxsat, undan keyin — muddati o'tgan.
 */
export function handoverTiming(outstandingDays: readonly string[], today: Date): { timing: HandoverTiming; daysLate: number } {
  const oldest = outstandingDays[0];
  if (!oldest) return { timing: "settled", daysLate: 0 };
  const daysLate = Math.max(0, differenceInCalendarDays(today, parseISO(oldest)) - 1);
  if (daysLate === 0) return { timing: "on_time", daysLate };
  return { timing: daysLate <= MAX_HANDOVER_DELAY_DAYS ? "late_allowed" : "overdue", daysLate };
}

// ── 1-pog'ona: kuryer → bosh kuryer ─────────────────────────────────────────

export type CourierHandover = {
  courier: { id: number; fullName: string } | null;
  date: string;
  status: HandoverStatus;
  amount: number;
  confirmedAmount: number | null;
  note: string | null;
  createdAt: Date | null;
  byFilial: Array<{ filialId: number | null; filialName: string; amount: number }>;
};

export function mapCourierHandover(raw: unknown): CourierHandover {
  const json = asRecord(raw);
  const courier = asRecord(json.courier);
  const courierId = asInt(courier.id, -1);
  return {
    courier: courierId < 0 ? null : { id: courierId, fullName: asString(courier.full_name) },
    date: asString(json.date),
    status: asHandoverStatus(json.status),
    amount: asNumber(json.amount),
    confirmedAmount: asOptionalNumber(json.confirmed_amount),
    note: asOptionalString(json.note),
    createdAt: parseDate(json.created_at),
    byFilial: asArray(json.by_filial).map((item) => {
      const row = asRecord(item);
      const id = asInt(row.filial_id, -1);
      return { filialId: id < 0 ? null : id, filialName: asString(row.filial_name), amount: asNumber(row.amount) };
    }),
  };
}

/** Ekrandagi holat: kutilayotgan e'lon 3 kundan ko'p tursa — muddati o'tgan. */
export type CourierHandoverView = HandoverStatus | "overdue";

export function courierHandoverView(row: Pick<CourierHandover, "status" | "date">, today: Date): CourierHandoverView {
  if (row.status !== "pending" || !row.date) return row.status;
  return differenceInCalendarDays(today, parseISO(row.date)) > MAX_HANDOVER_DELAY_DAYS ? "overdue" : "pending";
}

export const CASH_STATUSES = ["pending", "confirmed", "disputed", "overdue"] as const;
/** Server tartibi (`ordering`, V10). */
export const CASH_SORTS = ["-date", "date", "-amount", "amount", "courier"] as const;
export type CashSort = (typeof CASH_SORTS)[number];

// ── Kuryerning naqd hisobi (`chief/couriers/{id}/cod/`, V11) ─────────────────

export type CodDay = {
  date: string;
  orders: Array<{ id: string; orderNumber: string; amount: number }>;
  /** Topshiriladigan summa: kuryer e'loni, bo'lmasa zakazlar jami. */
  amount: number;
  settled: boolean;
  /** Kuryer ilovadan e'lon qilganmi. */
  declared: boolean;
};

export type CourierCod = { days: CodDay[]; outstandingTotal: number; outstandingDays: number };

/**
 * Ikki shakl: oraliq (`date_from`/`date_to` bilan) — `days[]`; sanasiz so'rovda
 * bitta kun — `{orders[{total_amount}], total, settled}` (jonli javob). Ikkinchisi
 * `fallbackDate` kuni sifatida o'qiladi.
 */
export function mapCourierCod(raw: unknown, fallbackDate = ""): CourierCod {
  const json = asRecord(raw);
  if (!Array.isArray(json.days) && Array.isArray(json.orders)) {
    const orders = asArray(json.orders).map((row) => {
      const order = asRecord(row);
      return { id: asString(order.id), orderNumber: asString(order.order_number), amount: asNumber(order.amount ?? order.total_amount) };
    });
    const settled = asBool(json.settled);
    const amount = asNumber(json.total);
    const days = orders.length ? [{ date: fallbackDate, orders, amount, settled, declared: false }] : [];
    return { days, outstandingTotal: settled ? 0 : amount, outstandingDays: settled || !orders.length ? 0 : 1 };
  }
  const days = asArray(json.days).map((item) => {
    const day = asRecord(item);
    const computed = asNumber(day.computed_total);
    const handover = asRecord(day.handover);
    return {
      date: asString(day.date),
      orders: asArray(day.orders).map((row) => {
        const order = asRecord(row);
        return { id: asString(order.id), orderNumber: asString(order.order_number), amount: asNumber(order.amount ?? order.total_amount) };
      }),
      amount: asOptionalNumber(day.amount) ?? computed,
      settled: asBool(day.settled),
      declared: isRecord(day.handover) && asString(handover.status) === "pending",
    };
  });
  return {
    days: days.sort((a, b) => b.date.localeCompare(a.date)),
    outstandingTotal: asNumber(json.outstanding_total),
    outstandingDays: asInt(json.outstanding_days),
  };
}
