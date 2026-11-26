import { asArray, asBool, asOptionalInt, asRecord, asString, isRecord } from "@/lib/parse";

/**
 * Markazlar (136-javob «Markazlar, bitta logistika», 2026-11-26): bir nechta
 * call-markaz (Qo'qon 1, 2, 3) sotgan zakazlarni bitta logistika filiali —
 * uning bosh kuryeri va kuryerlari — yetkazadi. «Markaz» filtri —
 * `?sales_filial=3`; berilmasa umumiy. Har zakaz aniq bitta markazga tushadi.
 *
 * Ro'yxatning birinchisi — logistika filialining o'zi (`is_hub`): uning
 * ustuniga o'zi sotgani, eski va transfer zakazlar ham kiradi. Bitta element
 * yoki eski server (marshrutsiz 404) — filtr ko'rsatilmaydi va parametr
 * yuborilmaydi. Sof modul.
 */
export type SalesCenter = { id: number; name: string; code: string; isHub: boolean };

export function mapSalesCenters(raw: unknown): SalesCenter[] {
  const rows = Array.isArray(raw) ? raw : asArray(asRecord(raw).results);
  const seen = new Set<number>();
  return rows.flatMap((item) => {
    const row = asRecord(item);
    const id = asOptionalInt(row.id);
    if (id === null || id <= 0 || seen.has(id)) return [];
    seen.add(id);
    return [{ id, name: asString(row.name) || `#${id}`, code: asString(row.code), isHub: asBool(row.is_hub) }];
  });
}

/** Tanlov faqat ikki va undan ko'p markazda ma'noli (136 §2). */
export function hasCenterChoice(centers: readonly SalesCenter[] | null): boolean {
  return (centers?.length ?? 0) > 1;
}

/**
 * URLdagi markaz → `sales_filial`.
 * - `centers === null` — ro'yxat hali kelmagan: tanlov o'zgarishsiz (kalit keyin o'zgarmaydi);
 * - markaz tanlovi yo'q (eski server, bitta markaz) yoki ro'yxatda yo'q id — `null`.
 */
export function salesFilialParam(selected: number | null, centers: readonly SalesCenter[] | null): string | null {
  if (selected === null || !Number.isInteger(selected) || selected <= 0) return null;
  if (centers === null) return String(selected);
  if (!hasCenterChoice(centers)) return null;
  return centers.some((center) => center.id === selected) ? String(selected) : null;
}

/**
 * `not_by_sales_filial` (136 §4) — markaz filtrida bo'linmaydigan qismlar.
 * Faqat filtr berilganda keladi: `true` (butun javob umumiy) yoki kalitlar
 * ro'yxati. Kalit yo'q — `null`.
 */
export type NotSplit = { all: boolean; keys: string[] } | null;

export function mapNotSplit(value: unknown): NotSplit {
  if (value === true) return { all: true, keys: [] };
  if (Array.isArray(value)) {
    const keys = value.flatMap((item) => (typeof item === "string" && item.trim() ? [item.trim()] : []));
    return keys.length ? { all: false, keys } : null;
  }
  // Ehtiyot: `{"keys": [...]}` yoki `{"<kalit>": true}` shakli ham o'qiladi.
  if (isRecord(value)) {
    if (Array.isArray(value.keys)) return mapNotSplit(value.keys);
    const keys = Object.entries(value).flatMap(([key, flag]) => (flag === true ? [key] : []));
    return keys.length ? { all: false, keys } : null;
  }
  return null;
}
