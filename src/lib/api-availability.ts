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
 * Ruxsat yo'q (`403`): dopusk kaliti (`permission_denied`, `fields.permission`), rol
 * (`role_forbidden`) yoki qamrov (`out_of_scope`). Bu «qayta urinish» bilan hal bo'lmaydi —
 * ekran xato emas, «ochilmagan» holatini ko'rsatadi. Matnga emas, `code` ga qaraladi.
 */
export function isAccessDenied(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 403 &&
    (error.code === "permission_denied" || error.code === "role_forbidden" || error.code === "out_of_scope")
  );
}
