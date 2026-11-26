import { api } from "@/lib/api-client";
import type { QueryValue } from "@/lib/api-client";
import { ENDPOINTS } from "@/lib/api-constants";

import { isSingleDay } from "./period";
import type { SheetRange } from "./period";
import { mapIssuePlan, mapSalesSheet } from "./types";
import type { IssuePlan, SalesSheet } from "./types";

/**
 * Kunma-kun qatorlar (`days=1`) faqat oraliqda so'raladi — bitta kunda `days[]` bo'sh (§2.9).
 * `salesFilial` — markaz (136-javob); berilmasa kalit yo'q (umumiy).
 */
export function salesSheetParams(range: SheetRange, salesFilial: string | null = null): Record<string, QueryValue> {
  return {
    date_from: range.dateFrom,
    date_to: range.dateTo,
    days: isSingleDay(range) ? null : 1,
    ...(salesFilial ? { sales_filial: salesFilial } : {}),
  };
}

/** Sotuv jadvali (hujjat 83 §2) — bosh kuryerning o'z kuryerlari, kun yoki oraliq. */
export async function fetchSalesSheet(range: SheetRange, salesFilial: string | null, signal?: AbortSignal): Promise<SalesSheet> {
  return mapSalesSheet(
    await api.get<unknown>(ENDPOINTS.chiefSalesSheet, {
      searchParams: salesSheetParams(range, salesFilial),
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

/** Bir kuryer + bir kun (hujjat 85 §2): skidka yoki «Oldim» summasi, butun so'm. */
export type CourierCashInput = {
  courierId: number;
  /** `YYYY-MM-DD` — jadvalda ochiq kun. */
  date: string;
  amount: number;
  note: string;
};

function cashBody(input: CourierCashInput) {
  const note = input.note.trim();
  return { courier_id: input.courierId, date: input.date, amount: input.amount, ...(note ? { note } : {}) };
}

/**
 * Skidka — bosh kuryer o'zi yozadi (§2): bir kuryer + kun = bitta yozuv, `0` —
 * o'chirish. Javobdagi yangi `cash` o'qilmaydi: jadval qayta so'raladi, shunda
 * jami qatori va tenglama ham serverdan keladi.
 */
export async function saveCourierDiscount(input: CourierCashInput): Promise<void> {
  await api.put<unknown>(ENDPOINTS.chiefSalesSheetDiscount, { json: cashBody(input), fallbackError: "Skidkani saqlab bo'lmadi" });
}

/**
 * Click/onlayn — bosh kuryer qo'lda yozadi (egasi, 2026-11-20; hujjat 101 §1):
 * skidka bilan bir xil qoida — bir kuryer + kun = bitta yozuv, `0` — o'chirish.
 * «Topshirishi kerak» serverda qayta hisoblanadi, jadval qayta so'raladi.
 */
export async function saveCourierOnline(input: CourierCashInput): Promise<void> {
  await api.put<unknown>(ENDPOINTS.chiefSalesSheetOnline, { json: cashBody(input), fallbackError: "Click summasini saqlab bo'lmadi" });
}

/** «Oldim» (§2): kuryerdan olingan summa; bir kunda bir nechta yozuv yig'iladi. */
export async function addCashReceipt(input: CourierCashInput): Promise<void> {
  await api.post<unknown>(ENDPOINTS.chiefSalesSheetReceipts, { json: cashBody(input), fallbackError: "Pulni yozib bo'lmadi" });
}

/** «Oldim» ni bekor qilish (§2) — server faqat o'sha kuni va o'zi yozganiga ruxsat beradi. */
export async function cancelCashReceipt(receiptId: number): Promise<void> {
  await api.delete<unknown>(ENDPOINTS.chiefSalesSheetReceipt(receiptId), { fallbackError: "Yozuvni bekor qilib bo'lmadi" });
}

/** Berish rejasi (§4): `date` — reja kuni (Sotuv jadvalida — bugun). */
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

/** Excel (§5) — fayl serverda yasaladi, sayt o'zi yig'maydi. Markaz — jadvaldagi bilan bir xil. Qaytaradi: fayl nomi. */
export async function downloadSalesSheetExcel(range: SheetRange, salesFilial: string | null = null): Promise<string> {
  const file = await api.download(ENDPOINTS.chiefSalesSheetExport, {
    searchParams: { date_from: range.dateFrom, date_to: range.dateTo, sales_filial: salesFilial },
    fallbackError: "Excel faylini yuklab bo'lmadi",
  });
  const name = file.fileName ?? salesSheetFileName(range);
  saveBlob(file.blob, name);
  return name;
}
