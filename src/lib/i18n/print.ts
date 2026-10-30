import { currentLocale } from "@/stores/locale-store";

import { convertTree } from "./dom";
import { localeInfo } from "./locale";
import { converterFor } from "./translate";

/**
 * Chop etiladigan hujjatni (yo'l varaqasi, marshrut, kunlik hisobot)
 * tanlangan tilga o'giradi. Hujjat iframe'da ochiladi — `LocaleProvider`
 * unga yetmaydi, shuning uchun HTML shu yerda bir marta, o'sha DOM
 * qoidalari bilan (`data-no-translit` hurmat qilinadi) o'giriladi.
 */
export function localizeDocumentHtml(html: string): string {
  if (typeof DOMParser === "undefined") return html;

  const locale = currentLocale();
  const parsed = new DOMParser().parseFromString(html, "text/html");
  parsed.documentElement.lang = localeInfo(locale).htmlLang;

  const convert = converterFor(locale);
  if (convert) {
    convertTree(parsed.body, convert);
    parsed.title = convert(parsed.title);
  }
  return `<!doctype html>\n${parsed.documentElement.outerHTML}`;
}

/** Foydalanuvchi/server ma'lumoti — chop etilganda tarjima qilinmaydi. */
export function rawHtml(escaped: string): string {
  return `<span data-no-translit>${escaped}</span>`;
}
