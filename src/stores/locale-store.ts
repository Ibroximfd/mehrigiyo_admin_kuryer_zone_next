import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  isLocale,
  type Locale,
} from "@/lib/i18n/locale";

/**
 * Tanlangan til. Sukut — rus tili; tanlov brauzerda saqlanadi.
 *
 * `skipHydration` ataylab: statik eksport HTML'i sukut bilan chizilgan,
 * saqlangan qiymat esa `LocaleProvider` da gidratsiyadan KEYIN o'qiladi —
 * aks holda tanlagich serverdagi bilan farq qilib, gidratsiya xatosi
 * berardi. `hydrated` shu paytgacha DOM tarjimasini to'xtatib turadi
 * (sukut bilan bir marta, saqlangani bilan yana bir marta o'girmaslik uchun).
 */
type LocaleState = {
  locale: Locale;
  hydrated: boolean;
  setLocale: (locale: Locale) => void;
};

/** `localStorage` yopiq bo'lishi mumkin (maxfiy oyna, bloklangan sayt ma'lumoti). */
function safeStorage(): Storage {
  try {
    const storage = globalThis.localStorage;
    const probe = "__locale_probe__";
    storage.setItem(probe, probe);
    storage.removeItem(probe);
    return storage;
  } catch {
    const memory = new Map<string, string>();
    return {
      get length() {
        return memory.size;
      },
      clear: () => memory.clear(),
      getItem: (key) => memory.get(key) ?? null,
      key: (index) => [...memory.keys()][index] ?? null,
      removeItem: (key) => void memory.delete(key),
      setItem: (key, value) => void memory.set(key, value),
    };
  }
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: DEFAULT_LOCALE,
      hydrated: false,
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: LOCALE_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(safeStorage),
      skipHydration: true,
      partialize: (state) => ({ locale: state.locale }),
      merge: (persisted, current) => {
        const stored = (persisted as { locale?: unknown } | undefined)?.locale;
        return { ...current, locale: isLocale(stored) ? stored : current.locale };
      },
      onRehydrateStorage: () => () => {
        useLocaleStore.setState({ hydrated: true });
      },
    },
  ),
);

/** React'dan tashqarida (API klient, bildirishnoma, chop etish) joriy til. */
export function currentLocale(): Locale {
  const state = useLocaleStore.getState();
  if (state.hydrated) return state.locale;
  // Gidratsiyadan oldingi so'rovlar ham to'g'ri tilda ketsin.
  return readStoredLocale() ?? state.locale;
}

function readStoredLocale(): Locale | null {
  try {
    const raw = globalThis.localStorage?.getItem(LOCALE_STORAGE_KEY);
    if (!raw) return null;
    const stored = (JSON.parse(raw) as { state?: { locale?: unknown } }).state?.locale;
    return isLocale(stored) ? stored : null;
  } catch {
    return null;
  }
}
