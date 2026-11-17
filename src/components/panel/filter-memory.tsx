"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  filterQuery,
  hasTransientParams,
  isOneOffLink,
  readSavedFilters,
  restoreQuery,
  writeSavedFilters,
} from "@/lib/filter-memory";
import { queueUiPrefsPush, startUiPrefsSync } from "@/lib/ui-prefs-sync";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Server javobini kutish chegarasi: shundan oshsa sahifa `localStorage`
 * nusxasi bilan tiklanadi (endpoint sekin bo'lsa ham filtr kechikmasin).
 */
const SERVER_WAIT_MS = 2_000;

/**
 * Server filtrlari (52-hujjat) yuklanib, mahalliy nusxaga yozildimi — yoki
 * kutish vaqti o'tdimi. Endpoint yo'q serverda 404 tez qaytadi.
 */
function useServerFiltersSettled(userId: string | null): boolean {
  const [settledFor, setSettledFor] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    const settle = () => {
      if (alive) setSettledFor(userId);
    };
    const timer = setTimeout(settle, SERVER_WAIT_MS);
    void startUiPrefsSync(userId).finally(() => {
      clearTimeout(timer);
      settle();
    });
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [userId]);

  return userId !== null && settledFor === userId;
}

/**
 * Har sahifaning filtrlari xodim bo'yicha eslab qolinadi (`lib/filter-memory`).
 *
 * Sahifaga kirilganda URLda filtr ham, karta konteksti ham bo'lmasa —
 * saqlangani qaytariladi. Keyingi har bir o'zgarish saqlanadi, tozalash ham
 * (bo'sh qator). Kontekstli havola bilan kelinganda (`?order=`)
 * filtr bo'sh turgan payt saqlanmaydi — oldingi tanlov o'chib ketmasin.
 *
 * Server (`me/ui-prefs/`, 52-hujjat) haqiqat manbai: birinchi qaror server
 * nusxasi kelgach (yoki kutish tugagach) qabul qilinadi, har o'zgarish
 * serverga ham yuboriladi (`lib/ui-prefs-sync`).
 */
export function FilterMemory() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const router = useRouter();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const settled = useServerFiltersSettled(userId);
  /** Shu yo'lda qaror qabul qilinganmi — har kirishda bir marta. */
  const decidedFor = useRef<string | null>(null);
  /** Kirish kontekstli havola orqali bo'lganmi. */
  const contextual = useRef(false);

  useEffect(() => {
    if (!userId || !settled) return;
    // Bir martalik havola — xotiraga tegilmaydi; undan chiqqach qaror qaytadan qabul qilinadi.
    if (isOneOffLink(search)) {
      decidedFor.current = null;
      return;
    }
    const current = filterQuery(search);
    if (decidedFor.current !== pathname) {
      decidedFor.current = pathname;
      contextual.current = hasTransientParams(search);
      const restored = restoreQuery(search, readSavedFilters(userId, pathname));
      if (restored) {
        const extra = new URLSearchParams(search);
        const merged = new URLSearchParams(restored);
        extra.forEach((value, key) => merged.set(key, value));
        router.replace(`${pathname}?${merged.toString()}`, { scroll: false });
        return;
      }
    }
    if (contextual.current && !current) return;
    if (writeSavedFilters(userId, pathname, current)) queueUiPrefsPush(userId, pathname);
  }, [pathname, search, userId, router, settled]);

  return null;
}
