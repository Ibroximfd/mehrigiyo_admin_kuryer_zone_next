import { describe, expect, it } from "vitest";

import {
  fitsUiPrefsLimit,
  keepOnlyPage,
  mergeInitialUiFilters,
  parseUiPrefsFilters,
  sameUiFilters,
  sanitizeUiFilters,
  UI_PREFS_MAX_BYTES,
  uiPrefsByteSize,
} from "./ui-prefs";

describe("ui-prefs (52-hujjat)", () => {
  it("javobdan faqat satr qiymatli, yaroqli kalitlar olinadi", () => {
    expect(
      parseUiPrefsFilters({
        success: true,
        filters: { "/op/admin/base": "lsrc=app", "/op/admin/orders": "", "/x": 5, "/y": null, "": "a", ["/" + "z".repeat(200)]: "b" },
        updated_at: null,
      }),
    ).toEqual({ "/op/admin/base": "lsrc=app", "/op/admin/orders": "" });
    expect(parseUiPrefsFilters({ filters: null })).toEqual({});
    expect(parseUiPrefsFilters("<html>")).toEqual({});
    expect(sanitizeUiFilters({ ["z".repeat(200)]: "ok" })).toEqual({ ["z".repeat(200)]: "ok" });
  });

  it("hajm server kabi — ixcham JSON, UTF-8 baytda", () => {
    expect(uiPrefsByteSize({})).toBe('{"filters":{}}'.length);
    expect(uiPrefsByteSize({ "/a": "b" })).toBe('{"filters":{"/a":"b"}}'.length);
    // Kirill harfi 2 bayt.
    expect(uiPrefsByteSize({ "/a": "ж" })).toBe('{"filters":{"/a":""}}'.length + 2);
    const overhead = uiPrefsByteSize({ "/a": "" });
    expect(fitsUiPrefsLimit({ "/a": "x".repeat(UI_PREFS_MAX_BYTES - overhead) })).toBe(true);
    expect(fitsUiPrefsLimit({ "/a": "x".repeat(UI_PREFS_MAX_BYTES - overhead + 1) })).toBe(false);
  });

  it("katta bo'lsa joriy sahifa qoladi", () => {
    const map = { "/a": "x=1", "/b": "y=2" };
    expect(keepOnlyPage(map, "/b")).toEqual({ "/b": "y=2" });
    expect(keepOnlyPage(map, "/c")).toEqual({});
  });

  it("katta bo'lsa ham nomli to'plamlar tashlanmaydi", () => {
    const map = { "/a": "x=1", "/b": "y=2", "presets:/a": "[]" };
    expect(keepOnlyPage(map, "/b")).toEqual({ "/b": "y=2", "presets:/a": "[]" });
  });

  it("birinchi sinxronlash: server ustun, bo'sh bo'lsa ko'chirish", () => {
    const none = new Set<string>();
    // Server bor — mahalliy almashtiriladi, yuborilmaydi.
    expect(mergeInitialUiFilters({ "/a": "s=1" }, { "/a": "l=1", "/b": "l=2" }, none)).toEqual({
      filters: { "/a": "s=1" },
      push: false,
    });
    // Server bo'sh — mahalliy bir marta ko'chiriladi.
    expect(mergeInitialUiFilters({}, { "/b": "l=2" }, none)).toEqual({ filters: { "/b": "l=2" }, push: true });
    // Ikkalasi bo'sh.
    expect(mergeInitialUiFilters({}, {}, none)).toEqual({ filters: {}, push: false });
    // GET kutilayotganda o'zgargan sahifa mahalliy qiymatda qoladi.
    expect(mergeInitialUiFilters({ "/a": "s=1", "/c": "s=3" }, { "/a": "l=1", "/c": "l=3" }, new Set(["/a"]))).toEqual({
      filters: { "/a": "l=1", "/c": "s=3" },
      push: true,
    });
    expect(mergeInitialUiFilters({ "/a": "s=1" }, { "/a": "s=1" }, new Set(["/a"])).push).toBe(false);
  });

  it("taqqoslash tartibga qaramaydi", () => {
    expect(sameUiFilters({ a: "1", b: "2" }, { b: "2", a: "1" })).toBe(true);
    expect(sameUiFilters({ a: "1" }, { a: "1", b: "" })).toBe(false);
    expect(sameUiFilters({ a: "1" }, { a: "2" })).toBe(false);
  });
});
