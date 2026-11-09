import { api } from "@/lib/api-client";
import { ENDPOINTS } from "@/lib/api-constants";
import { asPage } from "@/lib/paginate";

import { mapCourierStock, mapLoadRequest, mapOwnSklad, mapSkladMe, mapStockCell, skladStockRows, skladStore } from "./types";
import type { PackedQuantity } from "./packaging";
import type { ChiefSklad, LoadRequest, LoadRequestStatus } from "./types";

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
  const cells = stockRaw.map(mapStockCell);
  return {
    kind: "ready",
    sklad,
    stock: skladStockRows(cells, couriers),
    couriers,
    canWrite: me.canWrite,
    store: skladStore(cells),
  };
}

export type CourierDocumentInput =
  | { type: "courier_load"; locationId: number; courierId: number; lines: Array<{ itemId: number; quantity: number }> }
  /** `lines` yo'q — kuryerdagi hammasi qaytadi. */
  | { type: "courier_return"; locationId: number; courierId: number; lines: Array<{ itemId: number; quantity: number }> | null }
  /** Tuzatish: `actual_qty` — «sanaganda shuncha chiqdi», qoldiq shunga tenglashadi. */
  | { type: "adjustment"; courierId: number; lines: Array<{ itemId: number; actualQty: number }> };

export async function createCourierDocument(input: CourierDocumentInput): Promise<void> {
  const json =
    input.type === "adjustment"
      ? {
          type: input.type,
          courier_id: input.courierId,
          reason: "count_diff",
          lines: input.lines.map((line) => ({ item_id: line.itemId, actual_qty: line.actualQty })),
        }
      : {
          type: input.type,
          location_id: input.locationId,
          courier_id: input.courierId,
          ...(input.lines ? { lines: input.lines.map((line) => ({ item_id: line.itemId, quantity: line.quantity })) } : {}),
        };
  await api.post<unknown>(ENDPOINTS.skladDocuments, { json, fallbackError: "Hujjatni saqlab bo'lmadi" });
}

export async function fetchLoadRequests(status: LoadRequestStatus, signal?: AbortSignal): Promise<LoadRequest[]> {
  const raw = await api.get<unknown>(ENDPOINTS.chiefLoadRequests, {
    searchParams: { status },
    signal,
    fallbackError: "Kirim so'rovlarini yuklashda xatolik",
  });
  return asPage(raw).items.map(mapLoadRequest);
}

/**
 * `lines` — faqat kamaytirilgan qatorlar (0 = o'sha qator rad); bo'sh — to'liq tasdiq.
 * Miqdor karobka + dona alohida — server ko'paytiradi va so'ralgandan oshmasligini
 * ko'paytirgandan keyin tekshiradi (hujjat 44 §3.2).
 */
export async function approveLoadRequest(id: number, lines: Array<{ itemId: number } & PackedQuantity>): Promise<void> {
  await api.post<unknown>(ENDPOINTS.chiefLoadRequestApprove(id), {
    json: lines.length ? { lines: lines.map(({ itemId, ...packed }) => ({ item_id: itemId, ...packed })) } : {},
    fallbackError: "Tasdiqlab bo'lmadi",
  });
}

export async function rejectLoadRequest(id: number, reason: string): Promise<void> {
  await api.post<unknown>(ENDPOINTS.chiefLoadRequestReject(id), { json: { reason }, fallbackError: "Rad etib bo'lmadi" });
}
