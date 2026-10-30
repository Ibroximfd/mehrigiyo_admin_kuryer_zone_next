/**
 * Panel tillari.
 *
 * Manba matn — o'zbek lotin (komponentlarda shunday yozilgan). Qolgan ikki
 * til DOM qatlamida hisoblanadi (`dom.ts`): kirill — transliteratsiya,
 * rus — lug'at (`ru/`). Logist va CRM panellarida sukut — rus tili.
 */
export type Locale = "ru" | "uz-cyrl" | "uz-latn";

export const DEFAULT_LOCALE: Locale = "ru";

/** `localStorage` kaliti — `layout.tsx` dagi boot skripti ham shuni o'qiydi. */
export const LOCALE_STORAGE_KEY = "mehrigiyo-logist-locale";

export type LocaleInfo = {
  value: Locale;
  /** Tanlagichdagi nom — har til o'z yozuvida. */
  label: string;
  /** Tor joy uchun qisqa belgi. */
  short: string;
  /** `<html lang>` qiymati (BCP 47). */
  htmlLang: string;
  /**
   * `X-Lang` sarlavhasi — mobil ilova bilan bir xil shartnoma
   * (`SupportedLocale.id`): `ru`, `uz`, `uz-Cyrl`.
   */
  apiLang: string;
};

export const LOCALES: readonly LocaleInfo[] = [
  { value: "ru", label: "Русский", short: "RU", htmlLang: "ru", apiLang: "ru" },
  {
    value: "uz-cyrl",
    label: "Ўзбекча",
    short: "ЎЗ",
    htmlLang: "uz-Cyrl",
    apiLang: "uz-Cyrl",
  },
  {
    value: "uz-latn",
    label: "O'zbekcha",
    short: "UZ",
    htmlLang: "uz-Latn",
    apiLang: "uz",
  },
];

export function isLocale(value: unknown): value is Locale {
  return value === "ru" || value === "uz-cyrl" || value === "uz-latn";
}

export function localeInfo(locale: Locale): LocaleInfo {
  return LOCALES.find((item) => item.value === locale) ?? LOCALES[0]!;
}
