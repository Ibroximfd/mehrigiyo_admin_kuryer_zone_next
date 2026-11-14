import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { filterQuery, hasTransientParams, readSavedFilters, restoreQuery, writeSavedFilters } from "./filter-memory";

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

describe("filter-memory", () => {
  beforeEach(() => vi.stubGlobal("localStorage", memoryStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it("karta va havola konteksti filtrga kirmaydi", () => {
    expect(filterQuery("region=fargona&order=ab-12&zone=3")).toBe("region=fargona&zone=3");
    expect(hasTransientParams("order=ab-12")).toBe(true);
    expect(hasTransientParams("period=today")).toBe(false);
  });

  it("har xodim va sahifa alohida; tozalash ham saqlanadi", () => {
    writeSavedFilters("7", "/cash", "lsrc=app");
    writeSavedFilters("8", "/cash", "app=yes");
    expect(readSavedFilters("7", "/cash")).toBe("lsrc=app");
    expect(readSavedFilters("8", "/cash")).toBe("app=yes");
    expect(readSavedFilters("7", "/couriers")).toBeUndefined();
    writeSavedFilters("7", "/cash", "");
    expect(readSavedFilters("7", "/cash")).toBe("");
  });

  it("tiklash: faqat toza kirishda — havoladagi filtr va kontekst ustun", () => {
    expect(restoreQuery("", "lsrc=app")).toBe("lsrc=app");
    expect(restoreQuery("region=andijon", "lsrc=app")).toBeNull();
    expect(restoreQuery("order=ab-12", "lsrc=app")).toBeNull();
    expect(restoreQuery("", "")).toBeNull();
    expect(restoreQuery("", undefined)).toBeNull();
  });
});
