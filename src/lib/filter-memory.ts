/**
 * Filtr xotirasi — har xodim o'z filtrlarini saqlaydi: sahifaga qayta
 * kirganda (boshqa bo'limdan, saytni yopib ochib, akkauntdan chiqib kirib)
 * oxirgi tanlovi qaytadi. O'zi o'zgartirmaguncha turadi (logist sayti bilan
 * bir xil qoida).
 *
 * Manba — URL qatori (filtrlar shu yerda, `nuqs`), shuning uchun har sahifa
 * alohida kod yozmaydi. Saqlanadi `localStorage` da, foydalanuvchi id si
 * bo'yicha: chiqishda sessiya kalitlari tozalanadi, bu qoladi; bitta
 * brauzerda ikki xodim bir-birining filtrini ko'rmaydi.
 *
 * 52-hujjat: server (`me/ui-prefs/`) haqiqat manbai — `ui-prefs-sync.ts`
 * bu nusxani u bilan almashtiradi va o'zgarishlarni yuboradi. Server
 * endpointi yo'q yoki xato bersa shu `localStorage` nusxasi ishlayveradi.
 */

const STORAGE_KEY = "mehrigiyo-chief-filters.v1";

/**
 * Filtr emas — ochiq karta/oyna yoki boshqa sahifadan kelgan havola
 * konteksti (zakaz kartasi `?order=`).
 * Saqlanmaydi va qaytarilmaydi: aks holda sahifaga kirganda eski karta
 * ochilib yoki ro'yxat bitta mijozga qisilib qolardi.
 */
const TRANSIENT_PARAMS = new Set(["order"]);

type Store = Record<string, Record<string, string>>;

/** URL qatoridan faqat filtr qismi (tartib saqlanadi). */
export function filterQuery(search: string): string {
  const params = new URLSearchParams(search);
  const kept = new URLSearchParams();
  params.forEach((value, key) => {
    if (!TRANSIENT_PARAMS.has(key)) kept.append(key, value);
  });
  return kept.toString();
}

/** URLda karta/havola konteksti bormi. */
export function hasTransientParams(search: string): boolean {
  let found = false;
  new URLSearchParams(search).forEach((_, key) => {
    if (TRANSIENT_PARAMS.has(key)) found = true;
  });
  return found;
}

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

/** `undefined` — bu sahifada hali hech narsa saqlanmagan; `""` — xodim filtrni ataylab tozalagan. */
export function readSavedFilters(userId: string, pathname: string): string | undefined {
  return readStore()[userId]?.[pathname];
}

function writeStore(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Xotira to'la yoki taqiqlangan (maxfiy oyna) — filtr shunchaki eslab qolinmaydi.
  }
}

/** Saqlandi — `true`; qiymat o'zgarmagan bo'lsa `false` (serverga yuborish shunga qarab). */
export function writeSavedFilters(userId: string, pathname: string, query: string): boolean {
  const store = readStore();
  if (store[userId]?.[pathname] === query) return false;
  store[userId] = { ...store[userId], [pathname]: query };
  writeStore(store);
  return true;
}

/** Xodimning butun lug'ati — server sinxronlashi uchun (`ui-prefs-sync.ts`). */
export function readUserFilters(userId: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [path, query] of Object.entries(readStore()[userId] ?? {})) {
    if (typeof query === "string") result[path] = query;
  }
  return result;
}

/** Server nusxasi bilan almashtirish — server haqiqat manbai (52-hujjat §7). */
export function replaceUserFilters(userId: string, filters: Record<string, string>): void {
  const store = readStore();
  store[userId] = { ...filters };
  writeStore(store);
}

/**
 * Sahifaga kirgandagi qaror (sof funksiya — test qilinadi):
 *   • URLda filtr bor (ulashilgan havola) — havola ustun, tiklanmaydi;
 *   • URLda karta/havola konteksti bor — tiklanmaydi (kontekst buzilmasin);
 *   • aks holda saqlangan filtr qaytariladi.
 */
export function restoreQuery(search: string, saved: string | undefined): string | null {
  if (!saved || filterQuery(search) || hasTransientParams(search)) return null;
  return saved;
}
