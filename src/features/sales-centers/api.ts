import { api, ApiError } from "@/lib/api-client";
import { isEndpointMissing } from "@/lib/api-availability";
import { ENDPOINTS } from "@/lib/api-constants";

import { mapSalesCenters, type SalesCenter } from "./types";

/** Marshrutsiz 404 bir marta olingach sessiyada qayta urilmaydi (sahifa yangilanganda qayta tekshiriladi). */
let missing = false;

/**
 * Markazlar ro'yxati (136-javob §2). Eski server (marshrutsiz 404) yoki
 * ruxsat yo'q (403) — bo'sh ro'yxat: «Markaz» filtri chiqmaydi, `sales_filial`
 * hech qayerga yuborilmaydi.
 */
export async function fetchSalesCenters(signal?: AbortSignal): Promise<SalesCenter[]> {
  if (missing) return [];
  try {
    return mapSalesCenters(
      await api.get<unknown>(ENDPOINTS.chiefSalesCenters, { signal, fallbackError: "Markazlar ro'yxatini yuklashda xatolik" }),
    );
  } catch (error) {
    if (isEndpointMissing(error)) {
      missing = true;
      return [];
    }
    if (error instanceof ApiError && error.status === 403) return [];
    throw error;
  }
}
