import { beforeEach, describe, expect, it, vi } from "vitest";

import { LOCALE_STORAGE_KEY, localeInfo } from "@/lib/i18n/locale";

/** Node muhitida `localStorage` yo'q — xotiradagi o'rinbosar. */
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

async function freshStore() {
  vi.resetModules();
  return import("./locale-store");
}

describe("locale-store", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
  });

  it("sukut — rus tili", async () => {
    const { useLocaleStore, currentLocale } = await freshStore();
    await useLocaleStore.persist.rehydrate();

    expect(useLocaleStore.getState().locale).toBe("ru");
    expect(useLocaleStore.getState().hydrated).toBe(true);
    expect(currentLocale()).toBe("ru");
  });

  it("tanlov saqlanadi va qayta ochilganda tiklanadi", async () => {
    const first = await freshStore();
    await first.useLocaleStore.persist.rehydrate();
    first.useLocaleStore.getState().setLocale("uz-cyrl");

    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    expect(raw && JSON.parse(raw).state).toEqual({ locale: "uz-cyrl" });

    const second = await freshStore();
    // Gidratsiyadan oldin ham API klient saqlangan tilni oladi.
    expect(second.currentLocale()).toBe("uz-cyrl");
    await second.useLocaleStore.persist.rehydrate();
    expect(second.useLocaleStore.getState().locale).toBe("uz-cyrl");
  });

  it("buzuq saqlangan qiymat sukutga tushadi", async () => {
    localStorage.setItem(
      LOCALE_STORAGE_KEY,
      JSON.stringify({ state: { locale: "en" }, version: 1 }),
    );
    const { useLocaleStore, currentLocale } = await freshStore();
    expect(currentLocale()).toBe("ru");
    await useLocaleStore.persist.rehydrate();
    expect(useLocaleStore.getState().locale).toBe("ru");
  });

  it("localStorage yopiq bo'lsa ham ishlaydi", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    });
    const { useLocaleStore, currentLocale } = await freshStore();
    await useLocaleStore.persist.rehydrate();
    useLocaleStore.getState().setLocale("uz-latn");
    expect(useLocaleStore.getState().locale).toBe("uz-latn");
    expect(currentLocale()).toBe("uz-latn");
  });
});

describe("localeInfo", () => {
  it("X-Lang va html lang — mobil ilova shartnomasi", () => {
    expect(localeInfo("ru")).toMatchObject({ apiLang: "ru", htmlLang: "ru" });
    expect(localeInfo("uz-cyrl")).toMatchObject({ apiLang: "uz-Cyrl", htmlLang: "uz-Cyrl" });
    expect(localeInfo("uz-latn")).toMatchObject({ apiLang: "uz", htmlLang: "uz-Latn" });
  });
});
