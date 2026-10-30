import { currentLocale } from "@/stores/locale-store";

import { translateText } from "./translate";

/**
 * Joriy tilda tarjima — React daraxtidan tashqaridagi matnlar uchun:
 * brauzer bildirishnomasi, chop etiladigan hujjat, CSV, nusxalanadigan
 * matn. DOM'dagi matnni bu bilan o'rash SHART EMAS — uni `LocaleProvider`
 * o'zi o'giradi.
 */
export function tr(text: string): string {
  return translateText(text, currentLocale());
}
