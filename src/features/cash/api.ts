import { api, ApiError } from "@/lib/api-client";
import { ENDPOINTS } from "@/lib/api-constants";
import { asPage } from "@/lib/paginate";

import { mapChiefCash, mapChiefHandover, mapCourierCod, mapCourierHandover, mapFilialChoices } from "./types";
import type { CashSort, ChiefCash, CourierCod, CourierHandover, HandoverResult, HandoverStatus } from "./types";

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

export type HandoverInput = {
  amount: number;
  /** Berilmasa — pul bitta filialda bo'lsa server o'zi tanlaydi, bir nechtada `filial_required`. */
  filialId: number | null;
  date: string;
  periodFrom: string | null;
  periodTo: string | null;
  note: string;
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

export type CourierHandoverQuery = {
  status: HandoverStatus | null;
  courierId: number | null;
  from: string | null;
  to: string | null;
  sort: CashSort;
  page: number;
};

/** Kuryerlar e'lonlari (`chief/cod/handovers/`, V10): sana oralig'i, tartib, sahifa (10 tadan). */
export async function fetchCourierHandovers(
  query: CourierHandoverQuery,
  signal?: AbortSignal,
): Promise<{ rows: CourierHandover[]; count: number; hasMore: boolean }> {
  const raw = await api.get<unknown>(ENDPOINTS.chiefCodHandovers, {
    searchParams: {
      status: query.status,
      courier_id: query.courierId,
      date_from: query.from,
      date_to: query.to,
      ordering: query.sort,
      page: query.page,
    },
    signal,
    fallbackError: "Kuryerlar pulini yuklashda xatolik",
  });
  const page = asPage(raw);
  return { rows: page.items.map(mapCourierHandover), count: page.total ?? page.items.length, hasMore: page.hasMore };
}

/** Kuryerning kunma-kun naqdi — e'lon qilinmagan kunlar ham (V11). */
export async function fetchCourierCod(
  courierId: number,
  range: { from: string; to: string },
  signal?: AbortSignal,
): Promise<CourierCod> {
  return mapCourierCod(
    await api.get<unknown>(ENDPOINTS.chiefCourierCod(courierId), {
      searchParams: { date_from: range.from, date_to: range.to },
      signal,
      fallbackError: "Naqd hisobini yuklashda xatolik",
    }),
    range.to,
  );
}

/**
 * Kuryerdan qabul (`chief/couriers/{id}/settle/`): bir kun yoki oraliq.
 * `confirmedAmount` — sanalgan pul; farq kuryerda qarz bo'lib qoladi.
 */
export async function settleCourierCash(
  courierId: number,
  input: { date: string; dateTo?: string; confirmedAmount: number | null; note: string },
): Promise<void> {
  // Bir kun — `date`; oraliq (bir necha kunni birga) — `date_from` + `date_to` (P4).
  const json: Record<string, unknown> =
    input.dateTo && input.dateTo !== input.date ? { date_from: input.date, date_to: input.dateTo } : { date: input.date };
  if (input.confirmedAmount !== null) json.confirmed_amount = input.confirmedAmount;
  if (input.note.trim()) json.note = input.note.trim();
  await api.post<unknown>(ENDPOINTS.chiefCourierSettle(courierId), { json, fallbackError: "Naqdni qabul qilishda xatolik" });
}
