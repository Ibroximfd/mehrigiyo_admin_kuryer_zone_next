import { api, ApiError } from "@/lib/api-client";
import { ENDPOINTS } from "@/lib/api-constants";

import { mapCashSheet } from "./cash-sheet";
import type { CashSheet } from "./cash-sheet";
import { mapChiefCash, mapChiefHandover, mapFilialChoices } from "./types";
import type { ChiefCash, HandoverResult } from "./types";

/** `GET chief/cash/` — sukut oxirgi 31 kun (`TUZILMA_V2` §5.2). */
export async function fetchChiefCash(range: { from?: string; to?: string } = {}, signal?: AbortSignal): Promise<ChiefCash> {
  return mapChiefCash(
    await api.get<unknown>(ENDPOINTS.chiefCash, {
      searchParams: { date_from: range.from, date_to: range.to },
      signal,
      fallbackError: "Kassani yuklashda xatolik",
    }),
  );
}

/** Filialga topshirish jadvali (hujjat 85 §3): kun yoki oraliq. */
export async function fetchCashSheet(range: { dateFrom: string; dateTo: string }, signal?: AbortSignal): Promise<CashSheet> {
  return mapCashSheet(
    await api.get<unknown>(ENDPOINTS.chiefCashSheet, {
      searchParams: { date_from: range.dateFrom, date_to: range.dateTo },
      signal,
      fallbackError: "Kassa jadvalini yuklashda xatolik",
    }),
  );
}

export type HandoverInput = {
  amount: number;
  /** Berilmasa — pul bitta filialda bo'lsa server o'zi tanlaydi, bir nechtada `filial_required`. */
  filialId: number | null;
  date: string;
  periodFrom: string | null;
  periodTo: string | null;
  note: string;
  /**
   * Shundan kartaga o'tkazilgani (80-javob §5, ixtiyoriy). Berilsa naqd —
   * qoldiq, ikkalasi yuboriladi (yig'indi `amount` ga teng); `null` — ajratilmaydi.
   */
  card: number | null;
  /** Bir e'lon — bitta kalit: takror yuborilsa server o'sha qatorni qaytaradi. */
  clientActionId: string;
};

/** Filialga topshirish e'loni (§5.3). `filial_required` — xato emas, tanlov sifatida qaytadi. */
export async function submitChiefHandover(input: HandoverInput): Promise<HandoverResult> {
  const json: Record<string, unknown> = {
    amount: input.amount,
    date: input.date,
    client_action_id: input.clientActionId,
  };
  if (input.filialId !== null) json.filial_id = input.filialId;
  if (input.periodFrom) json.period_from = input.periodFrom;
  if (input.periodTo) json.period_to = input.periodTo;
  if (input.note.trim()) json.note = input.note.trim();
  if (input.card !== null) {
    json.card = input.card;
    json.cash = input.amount - input.card;
  }
  try {
    const raw = await api.post<unknown>(ENDPOINTS.chiefCashHandover, { json, fallbackError: "Pulni topshirishda xatolik" });
    return { kind: "created", handover: mapChiefHandover(raw) };
  } catch (error) {
    if (error instanceof ApiError && error.code === "filial_required") {
      const fields = error.data && typeof error.data === "object" ? (error.data as Record<string, unknown>).fields : null;
      return { kind: "filial_required", filials: mapFilialChoices(fields) };
    }
    throw error;
  }
}
