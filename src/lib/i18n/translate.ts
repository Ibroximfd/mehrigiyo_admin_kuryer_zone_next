import { toCyrillic } from "@/lib/translit";

import type { Locale } from "./locale";
import { createTranslator } from "./matcher";
import { russianDateWords } from "./ru/dates";
import { RU_DICTIONARY } from "./ru";

/**
 * Bitta matnni tanlangan tilga o'giradi.
 *
 * DOM qatlami (`dom.ts`) shu funksiyadan foydalanadi; DOM'ga tushmaydigan
 * matnlar — brauzer bildirishnomasi, chop etiladigan hujjat, CSV sarlavhasi,
 * nusxalanadigan matn — uni to'g'ridan-to'g'ri chaqiradi.
 */

const missed = new Set<string>();

function reportMiss(text: string) {
  if (process.env.NODE_ENV !== "development" || missed.has(text)) return;
  missed.add(text);
  // Lug'atga qo'shish uchun: `node scripts/i18n-extract.mjs`.
  console.debug("[i18n:ru] tarjima yo'q:", text);
}

let russian: ReturnType<typeof createTranslator> | null = null;

/** Lug'at birinchi kerak bo'lganda bir marta kompilyatsiya qilinadi. */
function russianTranslator() {
  russian ??= createTranslator(RU_DICTIONARY, {
    dateWords: russianDateWords,
    onMiss: reportMiss,
  });
  return russian;
}

export function translateText(text: string, locale: Locale): string {
  switch (locale) {
    case "uz-latn":
      return text;
    case "uz-cyrl":
      return toCyrillic(text);
    case "ru":
      return russianTranslator().translate(text);
  }
}

/** Rus lug'atida bormi — qamrov testi uchun. */
export function hasRussian(text: string): boolean {
  return russianTranslator().has(text);
}

/** DOM qatlami uchun: lotinda `null` — hech narsa o'girilmaydi, faqat tiklanadi. */
export function converterFor(locale: Locale): ((text: string) => string) | null {
  if (locale === "uz-latn") return null;
  return (text) => translateText(text, locale);
}

/**
 * Qidiruv kaliti — matnning uchala tildagi shakli birga. cmdk kabi
 * filtrlar `value` ni DOM o'girilishidan OLDIN o'qiydi, ya'ni faqat lotin
 * shaklini bilardi va rus tilida yozilgan qidiruv hech narsa topmasdi.
 */
export function searchableText(text: string): string {
  return [text, translateText(text, "ru"), translateText(text, "uz-cyrl")].join(" ");
}
