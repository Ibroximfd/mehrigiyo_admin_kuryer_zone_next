import { api } from "@/lib/api-client";
import type { QueryValue } from "@/lib/api-client";
import { ENDPOINTS } from "@/lib/api-constants";

import { isSingleDay } from "./period";
import type { SheetRange } from "./period";
import { mapIssuePlan, mapSalesSheet } from "./types";
import type { IssuePlan, SalesSheet } from "./types";

/** Kunma-kun qatorlar (`days=1`) faqat oraliqda so'raladi — bitta kunda `days[]` bo'sh (§2.9). */
export function salesSheetParams(range: SheetRange): Record<string, QueryValue> {
  return {
    date_from: range.dateFrom,
    date_to: range.dateTo,
    days: isSingleDay(range) ? null : 1,
  };
}

/** Sotuv jadvali (hujjat 83 §2) — bosh kuryerning o'z kuryerlari, kun yoki oraliq. */
export async function fetchSalesSheet(range: SheetRange, signal?: AbortSignal): Promise<SalesSheet> {
  return mapSalesSheet(
    await api.get<unknown>(ENDPOINTS.chiefSalesSheet, {
      searchParams: salesSheetParams(range),
      signal,
      fallbackError: "Sotuv jadvalini yuklashda xatolik",
    }),
  );
}

export type CourierFeeInput = {
  courierId: number;
  /** `YYYY-MM-DD` — bir kuryer + bir kun = bitta yozuv. */
  date: string;
  /** Butun so'm; `null` — yozuvni o'chirish. */
  amount: number | null;
  note: string;
};

/**
 * Kuryer xizmati (§3) — upsert. Javobdagi `fee` va `handover_due` o'qilmaydi:
 * jadval qayta so'raladi, shunda jami qatori ham serverdan keladi.
 */
export async function saveCourierFee(input: CourierFeeInput): Promise<void> {
  await api.put<unknown>(ENDPOINTS.chiefSalesSheetFee, {
    json: { courier_id: input.courierId, date: input.date, amount: input.amount, note: input.note.trim() },
    fallbackError: "Kuryer xizmatini saqlab bo'lmadi",
  });
}

/** Berish rejasi (§4): `date` — reja kuni. */
export async function fetchIssuePlan(date: string, signal?: AbortSignal): Promise<IssuePlan> {
  return mapIssuePlan(
    await api.get<unknown>(ENDPOINTS.chiefIssuePlan, {
      searchParams: { date },
      signal,
      fallbackError: "Berish rejasini yuklashda xatolik",
    }),
  );
}

/** Server nom bermasa (§5): `sotuv_2026-11-16.xlsx` / `sotuv_2026-11-10_2026-11-16.xlsx`. */
export function salesSheetFileName(range: SheetRange): string {
  return `sotuv_${isSingleDay(range) ? range.dateFrom : `${range.dateFrom}_${range.dateTo}`}.xlsx`;
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Excel (§5) — fayl serverda yasaladi, sayt o'zi yig'maydi. Qaytaradi: fayl nomi. */
export async function downloadSalesSheetExcel(range: SheetRange): Promise<string> {
  const file = await api.download(ENDPOINTS.chiefSalesSheetExport, {
    searchParams: { date_from: range.dateFrom, date_to: range.dateTo },
    fallbackError: "Excel faylini yuklab bo'lmadi",
  });
  const name = file.fileName ?? salesSheetFileName(range);
  saveBlob(file.blob, name);
  return name;
}
