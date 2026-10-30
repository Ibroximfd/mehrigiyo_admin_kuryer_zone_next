import { ApiError } from "@/lib/api-client";

/**
 * Backend hali chiqarmagan endpointlarni yumshoq aniqlash.
 *
 * Logist kontrakti (`BACKEND-LOGIST.md`) bosqichma-bosqich chiqadi. Marshrut
 * hali yo'q bo'lsa Django oddiy 404 qaytaradi — **mashina kodisiz**. Kontrakt
 * bo'yicha ishlaydigan endpointlar esa xatoni doim `{"code": "..."}` bilan
 * beradi (masalan `order_not_found`). Shu farq orqali "endpoint yo'q" va
 * "resurs topilmadi" ajratiladi.
 */
export function isEndpointMissing(error: unknown): boolean {
  return (
    error instanceof ApiError && error.status === 404 && error.code === undefined
  );
}

/**
 * Bir marta 404 (marshrutsiz) olgan bo'lim qayta-qayta urilmasin — sessiya
 * davomida eslab qolamiz. Sahifa yangilanganda qaytadan tekshiriladi, ya'ni
 * backend chiqarilgach hech narsa qilish shart emas.
 */
const missing = new Set<string>();

export function markEndpointMissing(key: string) {
  missing.add(key);
}

export function isKnownMissing(key: string): boolean {
  return missing.has(key);
}
