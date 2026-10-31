import { api } from "@/lib/api-client";
import { ENDPOINTS } from "@/lib/api-constants";

import { mapChiefFinance } from "./types";
import type { ChiefFinance } from "./types";

/** Moliya sahifasi — bitta so'rov (`chief/finance/`: filial, kuryer va mahsulot kesimi). */
export async function fetchChiefFinance(range: { from: string; to: string }, signal?: AbortSignal): Promise<ChiefFinance> {
  return mapChiefFinance(
    await api.get<unknown>(ENDPOINTS.chiefFinance, {
      searchParams: { date_from: range.from, date_to: range.to },
      signal,
      fallbackError: "Moliyani yuklashda xatolik",
    }),
  );
}
