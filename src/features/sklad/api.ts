import { api } from "@/lib/api-client";
import { ENDPOINTS } from "@/lib/api-constants";
import { asPage } from "@/lib/paginate";

import { mapCourierStock, mapOwnSklad, mapSkladMe, mapStockCell, skladStockRows } from "./types";
import type { ChiefSklad } from "./types";

/** `stock/` sahifali (50 tadan) — hamma sahifa olinadi (sklad + kuryerlar ombori bir necha sahifa). */
async function fetchAllStock(signal?: AbortSignal): Promise<unknown[]> {
  const rows: unknown[] = [];
  for (let page = 1; page <= 20; page += 1) {
    const result = asPage(
      await api.get<unknown>(ENDPOINTS.skladStock, { searchParams: { page }, signal, fallbackError: "Skladni yuklashda xatolik" }),
    );
    rows.push(...result.items);
    if (!result.hasMore) break;
  }
  return rows;
}

/**
 * Bosh kuryer skladi — to'rt so'rov parallel (`sklad/me`, `sklads`, `stock`,
 * `couriers`). Hammasi faqat o'qish; `stock/` sahifali, `couriers/` — massiv (V9).
 */
export async function fetchChiefSklad(signal?: AbortSignal): Promise<ChiefSklad> {
  const fallbackError = "Skladni yuklashda xatolik";
  const [meRaw, skladsRaw, stockRaw, couriersRaw] = await Promise.all([
    api.get<unknown>(ENDPOINTS.skladMe, { signal, fallbackError }),
    api.get<unknown>(ENDPOINTS.skladSklads, { signal, fallbackError }),
    fetchAllStock(signal),
    api.get<unknown>(ENDPOINTS.skladCouriers, { signal, fallbackError }),
  ]);
  const me = mapSkladMe(meRaw);
  const sklad = mapOwnSklad(skladsRaw, me.skladId);
  const couriers = asPage(couriersRaw).items.map(mapCourierStock);
  return {
    sklad,
    regions: sklad?.regions.length ? sklad.regions : me.regions,
    stock: skladStockRows(stockRaw.map(mapStockCell), couriers),
    couriers,
  };
}
