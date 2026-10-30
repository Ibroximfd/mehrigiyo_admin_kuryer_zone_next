/**
 * JSON'dan xavfsiz o'qish yordamchilari.
 *
 * Dart'da har bir model `fromJson` fabrikasida `json['x'] ?? ''` yozardi.
 * TypeScript'da backend javobi `unknown` bo'lgani uchun shu yerdagi kichik
 * funksiyalar orqali o'qiymiz — bironta maydon kutilmagan turda kelsa ham
 * UI qulamaydi.
 */

export type Json = Record<string, unknown>;

export function asRecord(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Json)
    : {};
}

export function isRecord(value: unknown): value is Json {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
}

/** Bo'sh satr ham `null` hisoblanadi — Dart'dagi `isNotEmpty` tekshiruvi. */
export function asOptionalString(value: unknown): string | null {
  const text = asString(value).trim();
  return text.length > 0 ? text : null;
}

export function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function asInt(value: unknown, fallback = 0): number {
  return Math.trunc(asNumber(value, fallback));
}

/** Pul summasi kabi maydonlar uchun: yo'q bo'lsa `null`, bor bo'lsa son. */
export function asOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = asNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

export function asOptionalInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = asNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

export function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

/**
 * Uch holatli bayroq: `true`, `false` yoki **maydon umuman yo'q** (`null`).
 *
 * `asBool` bilan farqi shunda: u yo'q maydonni `false` deb ko'rsatadi va
 * "to'lanmagan" bilan "backend hali yubormayapti" bir xil ko'rinib qoladi.
 * To'lov kabi maydonlarda bu ikkisi aralashmasligi kerak.
 */
export function asOptionalBool(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === 1 || value === "1") return true;
  if (value === "false" || value === 0 || value === "0") return false;
  return null;
}

/**
 * Backend ba'zi maydonlarni bir nechta nomda qaytaradi (masalan `status_name`
 * va nested `status.name`). Birinchi to'ldirilganini oladi.
 */
export function firstString(...values: unknown[]): string {
  for (const value of values) {
    const text = asString(value).trim();
    if (text.length > 0) return text;
  }
  return "";
}

/*
 * Sahifalangan javoblar `lib/paginate.ts` da o'qiladi — u `results` bilan
 * birga `next` va `count` ni ham hisobga oladi.
 */
