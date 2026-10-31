/**
 * Ro'yxat javoblarini sahifalash.
 *
 * Backend Django REST Framework uslubida qaytaradi:
 * `{count, next, previous, results}` — bir sahifada 20 ta yozuv.
 * Faqat `results` ni o'qib qo'yish yetarli emas: qolgan sahifalar
 * ekranga umuman chiqmay qoladi.
 *
 * `hasMore` `next` maydonidan olinadi — Dart versiyasidagi
 * "20 ta kelgan bo'lsa yana bordir" taxminidan aniqroq: yozuvlar soni
 * aynan 20 ta bo'lganda bo'sh "yana yuklash" tugmasi chiqmaydi.
 */

import { asArray, asRecord } from "@/lib/parse";

export type Page = {
  items: unknown[];
  hasMore: boolean;
  /** Jami yozuvlar soni; backend bermasa `null`. */
  total: number | null;
};

export function asPage(value: unknown): Page {
  // Sahifalanmagan endpointlar oddiy massiv qaytaradi.
  if (Array.isArray(value)) {
    return { items: value, hasMore: false, total: value.length };
  }

  const json = asRecord(value);
  const total = json.count;

  return {
    items: asArray(json.results),
    hasMore: Boolean(json.next),
    total: typeof total === "number" ? total : null,
  };
}
