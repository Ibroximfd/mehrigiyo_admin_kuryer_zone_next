import { api } from "@/lib/api-client";
import type { QueryValue } from "@/lib/api-client";
import { ENDPOINTS } from "@/lib/api-constants";
import { saveBlob } from "@/lib/save-file";

import type { DayRange } from "./period";
import { mapSkladSheet } from "./types";
import type { SkladSheet } from "./types";

/** So'rov: kun (`dateFrom = dateTo`) yoki oraliq; `region` — faqat davr ko'rinishida (`null` — hammasi). */
export type SkladSheetQuery = DayRange & { region: string | null };

export function skladSheetParams(query: SkladSheetQuery): Record<string, QueryValue> {
  return { date_from: query.dateFrom, date_to: query.dateTo, region: query.region };
}

/** Sklad jadvali (hujjat 85 §1) — bosh kuryerning o'z skladi: ombor + kuryerlari qo'lidagi. */
export async function fetchSkladSheet(query: SkladSheetQuery, signal?: AbortSignal): Promise<SkladSheet> {
  return mapSkladSheet(
    await api.get<unknown>(ENDPOINTS.chiefSkladSheet, {
      searchParams: skladSheetParams(query),
      signal,
      fallbackError: "Sklad jadvalini yuklashda xatolik",
    }),
  );
}

/** Server nom bermasa: `sklad_2026-11-17.xlsx` / `sklad_2026-11-09_2026-11-14.xlsx`. */
export function skladSheetFileName(query: SkladSheetQuery): string {
  return `sklad_${query.dateFrom === query.dateTo ? query.dateFrom : `${query.dateFrom}_${query.dateTo}`}.xlsx`;
}

/** Excel (§1.6) — egasining sheet ko'rinishida serverda yasaladi, sayt o'zi yig'maydi. Qaytaradi: fayl nomi. */
export async function downloadSkladSheetExcel(query: SkladSheetQuery): Promise<string> {
  const file = await api.download(ENDPOINTS.chiefSkladSheetExport, {
    searchParams: skladSheetParams(query),
    fallbackError: "Excel faylini yuklab bo'lmadi",
  });
  const name = file.fileName ?? skladSheetFileName(query);
  saveBlob(file.blob, name);
  return name;
}
