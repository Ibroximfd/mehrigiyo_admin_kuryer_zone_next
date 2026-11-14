import { api, errorCode } from "@/lib/api-client";
import { ENDPOINTS } from "@/lib/api-constants";
import { isEndpointMissing } from "@/lib/api-availability";
import { readUserFilters, replaceUserFilters } from "@/lib/filter-memory";
import {
  fitsUiPrefsLimit,
  keepOnlyPage,
  mergeInitialUiFilters,
  parseUiPrefsFilters,
  sameUiFilters,
  sanitizeUiFilters,
  uiPrefsBody,
} from "@/lib/ui-prefs";
import type { UiFilterMap } from "@/lib/ui-prefs";

/**
 * Filtr xotirasini server bilan sinxronlash (52-hujjat §7):
 *   1. kirgandan keyin bir marta `GET` — server bo'sh bo'lmasa mahalliy
 *      nusxa almashtiriladi, bo'sh bo'lsa mahalliysi bir marta `PUT`;
 *   2. har o'zgarishda ~1 s debounce bilan BUTUN lug'at `PUT` (server
 *      birlashtirmaydi, almashtiradi);
 *   3. `PUT` xatosi — `localStorage` da qoladi, keyingi o'zgarishda yana;
 *   4. endpoint yo'q (404/405 kodsiz) — sessiya oxirigacha faqat
 *      `localStorage`, boshqa so'rov yuborilmaydi;
 *   5. `preference_too_large` — joriy sahifadan boshqa kalitlar tashlanadi
 *      va bir marta qayta yuboriladi.
 *
 * Holat modul darajasida — ilova bitta, xodim almashsa sessiya yangilanadi.
 */

const PUSH_DEBOUNCE_MS = 1_000;

type Phase = "pending" | "synced" | "disabled";

type Session = {
  userId: string;
  phase: Phase;
  fetching: Promise<void> | null;
  /** GET kutilayotganda xodim o'zgartirgan sahifalar — server qiymati ularni bosmaydi. */
  dirty: Set<string>;
  timer: ReturnType<typeof setTimeout> | null;
  /** Oxirgi muvaffaqiyatli yuborilgan nusxa — bir xilini qayta yubormaslik uchun. */
  lastPushed: UiFilterMap | null;
};

let session: Session | null = null;

function sessionFor(userId: string): Session {
  if (session?.userId === userId) return session;
  if (session?.timer) clearTimeout(session.timer);
  session = { userId, phase: "pending", fetching: null, dirty: new Set(), timer: null, lastPushed: null };
  return session;
}

/**
 * Bir marta `GET` va birlashtirish. Takror chaqiruv o'sha so'rovni kutadi;
 * tugagan (yoki o'chirilgan) sessiyada darhol qaytadi. Xato tashlamaydi.
 */
export function startUiPrefsSync(userId: string): Promise<void> {
  const current = sessionFor(userId);
  if (current.phase !== "pending") return Promise.resolve();
  current.fetching ??= fetchAndMerge(current).finally(() => {
    current.fetching = null;
  });
  return current.fetching;
}

async function fetchAndMerge(current: Session): Promise<void> {
  try {
    const raw = await api.get<unknown>(ENDPOINTS.myUiPrefs, { fallbackError: "Filtrlarni yuklashda xatolik" });
    if (session !== current) return;
    const local = sanitizeUiFilters(readUserFilters(current.userId));
    const { filters, push } = mergeInitialUiFilters(parseUiPrefsFilters(raw), local, current.dirty);
    replaceUserFilters(current.userId, filters);
    current.phase = "synced";
    current.dirty.clear();
    if (push) await pushFilters(current, null);
    else current.lastPushed = filters;
  } catch (error) {
    if (session !== current) return;
    // Endpoint yo'q — jim; boshqa xato — `pending` qoladi, keyingi o'zgarishda qayta GET.
    if (isEndpointMissing(error)) current.phase = "disabled";
  }
}

/** Mahalliy filtr o'zgardi (`filter-memory.ts` yozgandan keyin). */
export function queueUiPrefsPush(userId: string, pathname: string): void {
  const current = sessionFor(userId);
  if (current.phase === "disabled") return;
  if (current.phase === "pending") {
    current.dirty.add(pathname);
    void startUiPrefsSync(userId);
    return;
  }
  if (current.timer) clearTimeout(current.timer);
  current.timer = setTimeout(() => {
    current.timer = null;
    void pushFilters(current, pathname);
  }, PUSH_DEBOUNCE_MS);
}

/** `preference_too_large` — mahalliy nusxa ham qisqaradi, server bilan bir xil tursin. */
function trimToPage(current: Session, filters: UiFilterMap, pathname: string): UiFilterMap {
  const trimmed = keepOnlyPage(filters, pathname);
  replaceUserFilters(current.userId, trimmed);
  return trimmed;
}

async function pushFilters(current: Session, pathname: string | null): Promise<void> {
  let filters = sanitizeUiFilters(readUserFilters(current.userId));
  if (!fitsUiPrefsLimit(filters) && pathname) filters = trimToPage(current, filters, pathname);
  if (current.lastPushed && sameUiFilters(current.lastPushed, filters)) return;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await api.put<unknown>(ENDPOINTS.myUiPrefs, {
        json: uiPrefsBody(filters),
        fallbackError: "Filtrlarni saqlashda xatolik",
      });
      if (session === current) current.lastPushed = filters;
      return;
    } catch (error) {
      if (session !== current) return;
      if (isEndpointMissing(error)) {
        current.phase = "disabled";
        return;
      }
      const tooLarge = errorCode(error) === "preference_too_large";
      if (!tooLarge || attempt > 0 || !pathname) return;
      filters = trimToPage(current, filters, pathname);
    }
  }
}
