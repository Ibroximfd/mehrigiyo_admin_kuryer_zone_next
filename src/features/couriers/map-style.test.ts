import { describe, expect, it } from "vitest";

import {
  MAP_STYLES,
  MAP_STYLE_STORAGE_KEY,
  availableMapStyles,
  isVectorStyle,
  MAP_STYLE_URL,
  parseMapStyle,
  readSavedMapStyle,
  resolveMapStyle,
  saveMapStyle,
} from "./map-style";

describe("xarita uslubi", () => {
  it("tanlanmagan — mavzuga ergashadi", () => {
    expect(resolveMapStyle(null)).toBe("standard");
    expect(resolveMapStyle(null)).toBe("standard");
    expect(resolveMapStyle(null)).toBe("standard");
  });

  it("tanlangani mavzudan ustun", () => {
    expect(resolveMapStyle("detailed")).toBe("detailed");
    expect(MAP_STYLE_URL.plain).toContain("/styles/positron");
    expect(MAP_STYLE_URL.detailed).toContain("/styles/liberty");
  });

  it("noma'lum qiymat — null", () => {
    expect(parseMapStyle("satellite")).toBeNull();
    expect(parseMapStyle(null)).toBeNull();
  });

  it("saqlash ishlamasa xato otilmaydi", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => undefined,
    };
    expect(readSavedMapStyle(broken)).toBeNull();
    expect(() => saveMapStyle("dark", broken)).not.toThrow();
  });

  it("saqlangan qiymat o'qiladi", () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
    };
    saveMapStyle("detailed", storage);
    expect(data.get(MAP_STYLE_STORAGE_KEY)).toBe("detailed");
    expect(readSavedMapStyle(storage)).toBe("detailed");
  });

  it("Yandex: kalit bo'lsa sukut, kalitsiz — Standart va tanlovda yo'q", () => {
    expect(resolveMapStyle(null, "key")).toBe("yandex");
    expect(resolveMapStyle("plain", "key")).toBe("plain");
    expect(resolveMapStyle("yandex", null)).toBe("standard");
    expect(resolveMapStyle(null, null)).toBe("standard");
    expect(availableMapStyles("key")).toEqual(MAP_STYLES);
    expect(availableMapStyles(null)).not.toContain("yandex");
    expect(isVectorStyle("yandex")).toBe(false);
    expect(parseMapStyle("yandex")).toBe("yandex");
  });
});
