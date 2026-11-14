import { differenceInCalendarDays, parseISO, subDays } from "date-fns";

import { toIsoDay } from "@/lib/format";
import { asArray, asInt, asNumber, asOptionalString, asRecord, asString, isRecord } from "@/lib/parse";

import { MAX_HANDOVER_DELAY_DAYS } from "./types";
import type { CourierCod } from "./types";

/**
 * Kuryerlardagi pul — qabul qilinmagan HAMMA pul, filtrsiz, muddat cheklovisiz.
 *
 * Manba (59-javob): `chief/cash/` dagi `couriers` bloki — davrdan mustaqil, hamma
 * vaqt uchun. Eski serverda u yo'q — o'shanda har kuryerning naqd hisobi
 * (`chief/couriers/{id}/cod/`, 31 kun) dan yig'iladi. 2026-11-14 gacha Kassa
 * e'lon qilinmagan pulni umuman ko'rsatmas edi («0 so'm»).
 */
export const COD_WINDOW_DAYS = 31;

/** Server chegarasidagi eng keng oraliq: bugun va oldingi 30 kun. */
export function codWindow(today: Date): { from: string; to: string } {
  return { from: toIsoDay(subDays(today, COD_WINDOW_DAYS - 1)), to: toIsoDay(today) };
}

/** Oraliq (tarix) 31 kundan oshmasin — oshsa boshlanishi suriladi (server `400` bermasin). */
export function clampCodRange(from: string, to: string): { from: string; to: string; clamped: boolean } {
  if (!from || !to) return { from, to, clamped: false };
  const end = parseISO(to);
  if (differenceInCalendarDays(end, parseISO(from)) < COD_WINDOW_DAYS) return { from, to, clamped: false };
  return { from: toIsoDay(subDays(end, COD_WINDOW_DAYS - 1)), to, clamped: true };
}

export type CourierDebt = {
  courier: { id: number; fullName: string };
  /** Kuryer qo'lidagi, bosh kuryer qabul qilmagan naqd. */
  total: number;
  openDays: number;
  oldestDay: string | null;
  /** Eng eski ochiq kun topshirish kunidan necha kun o'tgan. */
  daysLate: number;
  /** Kuni + 3 kundan eski ochiq kunlar summasi. */
  overdueAmount: number;
  /** Kuryer ilovadan e'lon qilgan qismi. */
  declaredAmount: number;
  /** Qabul qilingan kunlardagi kamomad — kuryer zimmasida (59-javob B5.6). */
  shortageDebt: number;
  /** Server jami kunlar yig'indisiga teng emas (faqat kunlar bo'yicha yig'ilganda tekshiriladi). */
  mismatch: { server: number; days: number } | null;
  /** Muddat cheklovisiz (server `open=1` yoki `couriers` bloki) — `false` bo'lsa faqat oxirgi 31 kun. */
  complete: boolean;
};

export type CourierMoneyTotals = { total: number; overdue: number; declared: number; shortage: number };

export function isDayOverdue(date: string, today: Date): boolean {
  return differenceInCalendarDays(today, parseISO(date)) - 1 > MAX_HANDOVER_DELAY_DAYS;
}

function daysLateOf(oldestDay: string | null, today: Date): number {
  return oldestDay ? Math.max(0, differenceInCalendarDays(today, parseISO(oldestDay)) - 1) : 0;
}

/** Bitta kuryerning naqd hisobidan (eski server yoki `?open=1`). */
export function courierDebt(courier: { id: number; fullName: string }, cod: CourierCod, today: Date): CourierDebt {
  const open = cod.days.filter((day) => !day.settled && day.amount > 0).sort((a, b) => a.date.localeCompare(b.date));
  const daysTotal = open.reduce((sum, day) => sum + day.amount, 0);
  const oldestDay = open[0]?.date ?? null;
  const total = cod.outstandingTotal;
  return {
    courier,
    total,
    openDays: open.length,
    oldestDay,
    daysLate: daysLateOf(oldestDay, today),
    overdueAmount: open.filter((day) => isDayOverdue(day.date, today)).reduce((sum, day) => sum + day.amount, 0),
    declaredAmount: open.filter((day) => day.declared).reduce((sum, day) => sum + day.amount, 0),
    shortageDebt: cod.shortageDebt,
    mismatch: Math.round(total) === Math.round(daysTotal) ? null : { server: total, days: daysTotal },
    complete: cod.open,
  };
}

/** `chief/cash/` `couriers[]` qatori (59-javob B1). */
function mapServerDebt(raw: unknown, today: Date): CourierDebt | null {
  const row = asRecord(raw);
  const courier = asRecord(row.courier);
  const id = asInt(courier.id, -1);
  if (id < 0) return null;
  const oldestDay = asOptionalString(row.oldest_day);
  return {
    courier: { id, fullName: asString(courier.full_name) },
    total: asNumber(row.outstanding),
    openDays: asInt(row.outstanding_days),
    oldestDay,
    daysLate: daysLateOf(oldestDay, today),
    overdueAmount: asNumber(row.overdue_amount),
    declaredAmount: asNumber(row.declared_amount),
    shortageDebt: asNumber(row.shortage_debt),
    mismatch: null,
    complete: true,
  };
}

/**
 * `chief/cash/` dagi `couriers` bloki. Blok yo'q (eski server) — `null`:
 * o'shanda kuryerlar naqd hisobidan yig'iladi.
 */
export function mapServerCourierMoney(cash: unknown, today: Date): { debts: CourierDebt[]; totals: CourierMoneyTotals } | null {
  const json = asRecord(cash);
  if (!Array.isArray(json.couriers)) return null;
  const debts = asArray(json.couriers)
    .map((row) => mapServerDebt(row, today))
    .filter((row): row is CourierDebt => row !== null);
  const totals = isRecord(json.couriers_totals)
    ? {
        total: asNumber(json.couriers_totals.outstanding),
        overdue: asNumber(json.couriers_totals.overdue_amount),
        declared: asNumber(json.couriers_totals.declared_amount),
        shortage: asNumber(json.couriers_totals.shortage_debt),
      }
    : debtTotals(debts);
  return { debts, totals };
}

/** Muddati o'tgan summasi kattasi birinchi, keyin qarz. Qarzi ham, kamomadi ham yo'q kuryer chiqmaydi. */
export function sortDebts(debts: readonly CourierDebt[]): CourierDebt[] {
  return debts
    .filter((debt) => debt.total > 0 || debt.shortageDebt > 0)
    .sort(
      (a, b) =>
        b.overdueAmount - a.overdueAmount || b.total - a.total || a.courier.fullName.localeCompare(b.courier.fullName),
    );
}

export function debtTotals(debts: readonly CourierDebt[]): CourierMoneyTotals {
  const sum = (pick: (debt: CourierDebt) => number) => debts.reduce((total, debt) => total + pick(debt), 0);
  return {
    total: sum((debt) => debt.total),
    overdue: sum((debt) => debt.overdueAmount),
    declared: sum((debt) => debt.declaredAmount),
    shortage: sum((debt) => debt.shortageDebt),
  };
}
