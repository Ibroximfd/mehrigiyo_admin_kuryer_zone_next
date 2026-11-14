import { describe, expect, it } from "vitest";

import { activePreset, addPreset, MAX_PRESETS, normalizeQuery, parsePresets, presetsKey, removePreset, serializePresets } from "./filter-presets";
import type { FilterPreset } from "./filter-presets";

describe("nomli filtrlar", () => {
  it("kalit sahifa yo'lidan, sukut to'plam yo'q", () => {
    expect(presetsKey("/")).toBe("presets:/");
    expect(parsePresets(undefined)).toEqual([]);
    expect(parsePresets("buzuq")).toEqual([]);
    expect(parsePresets('[{"id":"1","name":"","query":"a=1"},{"id":"2","name":"N","query":"zone=3"}]')).toEqual([
      { id: "2", name: "N", query: "zone=3" },
    ]);
  });

  it("qo'shish: nom tekshiriladi, takror nom va bo'sh filtr rad etiladi", () => {
    const first = addPreset([], "  Namangan   kremlar ", "products=34&zone=3", "a");
    expect(first).toEqual({
      ok: true,
      preset: { id: "a", name: "Namangan kremlar", query: "products=34&zone=3" },
      presets: [{ id: "a", name: "Namangan kremlar", query: "products=34&zone=3" }],
    });
    if (!first.ok) return;
    expect(addPreset(first.presets, "namangan KREMLAR", "zone=4", "b")).toEqual({ ok: false, error: "duplicate_name" });
    expect(addPreset(first.presets, "", "zone=4", "b")).toEqual({ ok: false, error: "empty_name" });
    expect(addPreset(first.presets, "X", "", "b")).toEqual({ ok: false, error: "empty_query" });
    expect(addPreset(first.presets, "x".repeat(41), "zone=4", "b")).toEqual({ ok: false, error: "name_too_long" });
  });

  it("chegara — 20 ta", () => {
    const many: FilterPreset[] = Array.from({ length: MAX_PRESETS }, (_, index) => ({ id: String(index), name: `F${index}`, query: `zone=${index}` }));
    expect(addPreset(many, "Yangi", "zone=99", "z")).toEqual({ ok: false, error: "limit" });
  });

  it("faol to'plam — parametrlar tartibidan qat'i nazar", () => {
    const presets: FilterPreset[] = [{ id: "a", name: "A", query: "products=34&zone=3" }];
    expect(normalizeQuery("zone=3&products=34&q=")).toBe("products=34&zone=3");
    expect(activePreset(presets, "zone=3&products=34")?.id).toBe("a");
    expect(activePreset(presets, "zone=3")).toBeNull();
    expect(activePreset(presets, "")).toBeNull();
  });

  it("saqlash va o'chirish qaytariladi", () => {
    const presets: FilterPreset[] = [
      { id: "a", name: "A", query: "zone=3" },
      { id: "b", name: "B", query: "zone=4" },
    ];
    expect(parsePresets(serializePresets(presets))).toEqual(presets);
    expect(removePreset(presets, "a")).toEqual([{ id: "b", name: "B", query: "zone=4" }]);
  });
});
