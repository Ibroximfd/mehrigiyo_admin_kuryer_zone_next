import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  filterQuery,
  hasTransientParams,
  isOneOffLink,
  oneOffHref,
  readSavedFilters,
  restoreQuery,
  writeSavedFilters,
} from "./filter-memory";

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

describe("bir martalik havola (`once=1`)", () => {
  it("kuryer kartasidan — belgi bilan, filtr qismiga kirmaydi", () => {
    const href = oneOffHref("/", { scope: "delivered", courier: 20, from: "2026-11-17", to: "2026-11-17" });
    expect(href).toBe("/?scope=delivered&courier=20&from=2026-11-17&to=2026-11-17&once=1");
    const search = href.slice(2);
    expect(isOneOffLink(search)).toBe(true);
    expect(filterQuery(search)).toBe("scope=delivered&courier=20&from=2026-11-17&to=2026-11-17");
    expect(isOneOffLink("courier=20")).toBe(false);
    expect(isOneOffLink("once=0")).toBe(false);
  });
});
