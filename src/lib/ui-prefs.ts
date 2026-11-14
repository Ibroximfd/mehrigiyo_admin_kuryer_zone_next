import { asRecord } from "@/lib/parse";

/**
 * Sahifa filtrlari serverda (52-hujjat, `me/ui-prefs/`) — sof qism:
 * javobni o'qish, server qoidalariga moslash, hajm va birinchi
 * sinxronlashdagi birlashtirish. Tarmoq va holat — `ui-prefs-sync.ts`.
 *
 * Lug'at: kalit — sahifa yo'li (`/op/admin/base`), qiymat — URL filtr
 * qatori (`filter-memory.ts` bilan bir xil shakl; `""` — ataylab tozalangan).
 */
export type UiFilterMap = Record<string, string>;

/** Butun tana (`{"filters":{...}}`, ixcham JSON) UTF-8 baytda. */
export const UI_PREFS_MAX_BYTES = 16_384;
/** Kalit uzunligi 1–200 belgi — oshsa server `400 validation_error`. */
const KEY_MAX_LENGTH = 200;

function isValidKey(key: string): boolean {
  return key.length > 0 && key.length <= KEY_MAX_LENGTH;
}

/** Server qabul qiladigan yozuvlargina (yaroqsiz kalit va satr bo'lmagan qiymat tashlanadi). */
export function sanitizeUiFilters(raw: unknown): UiFilterMap {
  const result: UiFilterMap = {};
  for (const [key, value] of Object.entries(asRecord(raw))) {
    if (isValidKey(key) && typeof value === "string") result[key] = value;
  }
  return result;
}

/** `GET`/`PUT` javobi → lug'at. `filters` doim obyekt, lekin ehtiyot uchun tekshiriladi. */
export function parseUiPrefsFilters(raw: unknown): UiFilterMap {
  return sanitizeUiFilters(asRecord(raw).filters);
}

export function uiPrefsBody(filters: UiFilterMap): { filters: UiFilterMap } {
  return { filters };
}

/** Server o'lchagandek: ixcham JSON, UTF-8 baytlari (kirill — 2, emoji — 4). */
export function uiPrefsByteSize(filters: UiFilterMap): number {
  return new TextEncoder().encode(JSON.stringify(uiPrefsBody(filters))).length;
}

export function fitsUiPrefsLimit(filters: UiFilterMap): boolean {
  return uiPrefsByteSize(filters) <= UI_PREFS_MAX_BYTES;
}

/** Saqlangan filtr to'plamlari kaliti (`presets:/cash`) — sahifa yo'li emas, tiklanmaydi. */
export const PRESET_KEY_PREFIX = "presets:";

/**
 * `preference_too_large` — joriy sahifadan boshqa sahifalarning oxirgi
 * filtri tashlanadi. Xodim nom berib saqlagan to'plamlar qoladi: ular
 * qo'lda yaratilgan, oxirgi filtr esa o'zi qayta yig'iladi.
 */
export function keepOnlyPage(filters: UiFilterMap, pathname: string): UiFilterMap {
  const kept: UiFilterMap = {};
  for (const [key, value] of Object.entries(filters)) {
    if (key === pathname || key.startsWith(PRESET_KEY_PREFIX)) kept[key] = value;
  }
  return kept;
}

export function sameUiFilters(a: UiFilterMap, b: UiFilterMap): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => key in b && a[key] === b[key]);
}

/**
 * Birinchi muvaffaqiyatli `GET` dan keyingi qaror (52 §7):
 *   • server bo'sh emas — u haqiqat manbai, mahalliy nusxa almashtiriladi;
 *     faqat GET kutilayotganda xodim o'zgartirgan sahifalar (`dirty`)
 *     mahalliy qiymatda qoladi va serverga yuboriladi;
 *   • server bo'sh, mahalliyda yozuv bor — bir marta ko'chiriladi (PUT);
 *   • ikkalasi bo'sh — hech narsa.
 */
export function mergeInitialUiFilters(
  server: UiFilterMap,
  local: UiFilterMap,
  dirty: ReadonlySet<string>,
): { filters: UiFilterMap; push: boolean } {
  if (Object.keys(server).length === 0) {
    return { filters: local, push: Object.keys(local).length > 0 };
  }
  const filters: UiFilterMap = { ...server };
  for (const path of dirty) {
    const value = local[path];
    if (value !== undefined) filters[path] = value;
  }
  return { filters, push: !sameUiFilters(filters, server) };
}
