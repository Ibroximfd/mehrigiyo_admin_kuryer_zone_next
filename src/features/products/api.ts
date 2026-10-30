import { api } from "@/lib/api-client";
import { ENDPOINTS } from "@/lib/api-constants";
import { asArray, asRecord } from "@/lib/parse";

import { mapProduct } from "./types";
import type { ProductsPage } from "./types";

/** Nomi bo'yicha mahsulot qidiruvi — tavsiya va savat uchun. */
export async function searchProducts(
  query: string,
  options: { page?: number; signal?: AbortSignal } = {},
): Promise<ProductsPage> {
  const raw = await api.get<unknown>(ENDPOINTS.shopMedicines, {
    searchParams: { page: options.page ?? 1, search: query || undefined },
    signal: options.signal,
    fallbackError: "Mahsulotlarni yuklashda xatolik",
  });

  const json = asRecord(raw);
  return {
    products: asArray(json.results).map(mapProduct),
    hasMore: json.next !== null && json.next !== undefined,
  };
}
