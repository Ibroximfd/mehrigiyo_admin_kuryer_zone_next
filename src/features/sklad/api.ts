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
 * Bosh kuryer skladi. Avval `sklad/me` — sklad biriktirilmagan yoki ko'rish yopiq bo'lsa
 * qolgan so'rovlar umuman ketmaydi (bo'sh holat, qayta so'rov halqasi yo'q, §10.1).
 * Keyin uchtasi parallel (`sklads`, `stock`, `couriers`) — hammasi faqat o'qish.
 */
export async function fetchChiefSklad(signal?: AbortSignal): Promise<ChiefSklad> {
  const fallbackError = "Skladni yuklashda xatolik";
  const me = mapSkladMe(await api.get<unknown>(ENDPOINTS.skladMe, { signal, fallbackError }));
  if (!me.canView) return { kind: "forbidden" };
  if (!me.sklad) return { kind: "unassigned" };
  const [skladsRaw, stockRaw, couriersRaw] = await Promise.all([
    api.get<unknown>(ENDPOINTS.skladSklads, { signal, fallbackError }),
    fetchAllStock(signal),
    api.get<unknown>(ENDPOINTS.skladCouriers, { signal, fallbackError }),
  ]);
  const sklad = mapOwnSklad(skladsRaw, me.sklad);
  if (!sklad) return { kind: "unassigned" };
  const couriers = asPage(couriersRaw).items.map(mapCourierStock);
  return {
    kind: "ready",
    sklad,
    stock: skladStockRows(stockRaw.map(mapStockCell), couriers),
    couriers,
  };
}
