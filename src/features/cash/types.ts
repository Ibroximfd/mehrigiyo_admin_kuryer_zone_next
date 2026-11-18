import { differenceInCalendarDays, parseISO } from "date-fns";

import { mapFilial } from "@/features/couriers/types";
import { mapFinanceFilialRow } from "@/features/report/types";
import type { FinanceFilialRow } from "@/features/report/types";

import type { CourierDebt, CourierMoneyTotals } from "./courier-debts";

export type ServerCourierMoney = { debts: CourierDebt[]; totals: CourierMoneyTotals };
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
  /** Shundan naqd va karta (80-javob §5); bosh kuryer ajratmagan bo'lsa — `null`. */
  cash: number | null;
  card: number | null;
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
    cash: asOptionalNumber(raw.cash),
    card: asOptionalNumber(raw.card),
    status: asHandoverStatus(raw.status),
    note: asString(raw.note),
    logistNote: asString(raw.logist_note),
    logistName: asOptionalString(asRecord(raw.logist).full_name),
    createdAt: parseDate(raw.created_at),
  };
}

/** Davrda yetkazilgan zakazlar puli to'lov turi bo'yicha (hujjat 79 §6); uchalasi yig'indisi — `delivered_amount`. */
export type DeliveredByMethod = {
  /** Eshikda naqd. */
  cash: number;
  /** Eshikda kartaga o'tkazma. */
  card: number;
  /** Click/Payme — eshikda havola yoki mijoz oldindan to'lagan. */
  online: number;
};

/** Blok yo'q yoki obyekt emas — `null` (eski server). */
function mapDeliveredByMethod(raw: unknown): DeliveredByMethod | null {
  if (!isRecord(raw)) return null;
  return { cash: asNumber(raw.cash), card: asNumber(raw.card), online: asNumber(raw.online) };
}

export type ChiefCash = {
  dateFrom: string;
  dateTo: string;
  collectedFromCouriers: number;
  /** Davrda yetkazilgan zakazlar soni va puli (80-javob §5); eski serverda `null`. */
  deliveredOrders: number | null;
  deliveredAmount: number | null;
  /** To'lov turi bo'yicha yetkazilgan pul (hujjat 79 §6); eski serverda `null`. */
  deliveredByMethod: DeliveredByMethod | null;
  /** Topshirilmagan jami. */
  outstanding: number;
  /** Topshirilmagan kunlar, eski birinchi. */
  outstandingDays: string[];
  /** Filial kesimi — `to_hand_over` har filialga qancha berish kerakligi (hamma vaqt). */
  byFilial: FinanceFilialRow[];
  /** Davr ichidagi topshiriqlar. */
  handovers: ChiefHandover[];
  /** Filial qabulini kutayotgan HAMMA topshiriqlar, davrdan eski ham (59-javob B3); eski serverda `null`. */
  handoversPending: ChiefHandover[] | null;
  /** Bosh kuryerning filialga topshirmagan puli — hamma vaqt (59-javob B3); eski serverda `null`. */
  outstandingAllTime: { amount: number; days: string[] } | null;
  /** Kuryerlardagi pul (`couriers` bloki, 59-javob B1) — `api.ts` to'ldiradi; eski serverda `null`. */
  courierMoney: ServerCourierMoney | null;
};

export function mapChiefCash(raw: unknown, courierMoney: ServerCourierMoney | null = null): ChiefCash {
  const json = asRecord(raw);
  const rows = asArray(json.by_filial).map(mapFinanceFilialRow);
  return {
    dateFrom: asString(json.date_from),
    dateTo: asString(json.date_to),
    collectedFromCouriers: asNumber(json.collected_from_couriers),
    deliveredOrders: asOptionalNumber(json.delivered_orders),
    deliveredAmount: asOptionalNumber(json.delivered_amount),
    deliveredByMethod: mapDeliveredByMethod(json.delivered_by_method),
    outstanding: asNumber(json.outstanding),
    outstandingDays: asArray(json.outstanding_days).map((day) => asString(day)).filter(Boolean).sort(),
    byFilial: [...rows.filter((row) => row.filial), ...rows.filter((row) => !row.filial)],
    handovers: mapHandovers(json.handovers),
    courierMoney,
    handoversPending: Array.isArray(json.handovers_pending) ? mapHandovers(json.handovers_pending) : null,
    outstandingAllTime: isRecord(json.outstanding_all_time)
      ? {
          amount: asNumber(json.outstanding_all_time.amount),
          days: asArray(json.outstanding_all_time.days).map((day) => asString(day)).filter(Boolean).sort(),
        }
      : null,
  };
}

function mapHandovers(raw: unknown): ChiefHandover[] {
  return asArray(raw)
    .map(mapChiefHandover)
    .filter((item): item is ChiefHandover => item !== null);
}

/** Filial qabulini kutayotgan summa: yangi serverda hamma vaqt, eskisida davr ichidan. */
export function awaitingFilial(cash: Pick<ChiefCash, "handovers" | "handoversPending">): number {
  return (cash.handoversPending ?? cash.handovers.filter((item) => item.status === "pending")).reduce(
    (sum, item) => sum + item.amount,
    0,
  );
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

export type CourierCod = {
  days: CodDay[];
  /** Oraliq so'rovida — oraliq ichida; `?open=1` da — hamma vaqt. */
  outstandingTotal: number;
  outstandingDays: number;
  /** Qabul qilingan kunlardagi kamomad (59-javob B5.6); eski serverda 0. */
  shortageDebt: number;
  /** `?open=1` javobi (qabul qilinmagan HAMMA kunlar) — eski server bilmasa `false`. */
  open: boolean;
  /** Oraliqdan qat'i nazar (59-javob B2, `all_time`); eski serverda `null`. */
  allTime: { outstandingTotal: number; outstandingDays: number; oldestDay: string | null } | null;
};

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
    return {
      days,
      outstandingTotal: settled ? 0 : amount,
      outstandingDays: settled || !orders.length ? 0 : 1,
      shortageDebt: 0,
      open: false,
      allTime: null,
    };
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
  const allTime = isRecord(json.all_time) ? json.all_time : null;
  return {
    days: days.sort((a, b) => b.date.localeCompare(a.date)),
    outstandingTotal: asNumber(json.outstanding_total),
    outstandingDays: asInt(json.outstanding_days),
    shortageDebt: asNumber(json.shortage_debt ?? allTime?.shortage_debt),
    open: json.open === true,
    allTime: allTime
      ? {
          outstandingTotal: asNumber(allTime.outstanding_total),
          outstandingDays: asInt(allTime.outstanding_days),
          oldestDay: asOptionalString(allTime.oldest_day),
        }
      : null,
  };
}
