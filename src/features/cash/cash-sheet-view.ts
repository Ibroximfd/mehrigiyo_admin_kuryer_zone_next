import { regionLabel } from "@/features/orders/regions";
import type { PeriodOption, SheetPeriod } from "@/features/sales-sheet/period";

import type { CashSheetFilial } from "./cash-sheet";

/**
 * Kassa jadvalining ko'rinish qoidalari (hujjat 85 §3) — sof funksiyalar.
 * Raqam hisoblanmaydi: faqat qaysi holat va qaysi tugma ko'rinishi hal qilinadi.
 */

/** Kassa davri (maket): «Kun» · «Sanadan sanagacha». */
export const CASH_PERIODS: readonly PeriodOption[] = [
  { value: "day", label: "Kun" },
  { value: "range", label: "Sanadan sanagacha" },
];

export const CASH_PERIOD_VALUES: readonly SheetPeriod[] = CASH_PERIODS.map((option) => option.value);

/**
 * Filial holati: `pending` — topshirilgan, logist tasdig'ini kutmoqda;
 * `disputed` — logist kam qabul qilgan; `done` — qarz qolmagan; `null` — holat
 * yo'q (qarz bor, topshiriq yo'q yoki raqam kelmagan).
 */
export type FilialStatus = "pending" | "disputed" | "done" | null;

export function filialStatus(row: Pick<CashSheetFilial, "handovers" | "closingDebt">): FilialStatus {
  if (row.handovers.some((handover) => handover.status === "pending")) return "pending";
  if (row.handovers.some((handover) => handover.status === "disputed")) return "disputed";
  return row.closingDebt !== null && row.closingDebt <= 0 ? "done" : null;
}

/** «Topshirdim» — qarz qolgan bo'lsa (server aytgan `closing_debt > 0`). */
export function canHandOver(row: Pick<CashSheetFilial, "closingDebt">): boolean {
  return row.closingDebt !== null && row.closingDebt > 0;
}

/** Filial ostidagi viloyatlar: «Farg'ona viloyati · Andijon viloyati». */
export function regionsText(codes: readonly string[]): string {
  return codes.map(regionLabel).join(" · ");
}
