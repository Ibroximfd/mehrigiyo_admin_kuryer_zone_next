import { PRESET_KEY_PREFIX } from "@/lib/ui-prefs";

/**
 * Xodimning nomli filtr to'plamlari — har sahifaga alohida. Sukut to'plam
 * berilmaydi: kerak bo'lsa xodim o'zi nom berib saqlaydi.
 *
 * Saqlanadi filtr xotirasi bilan bir lug'atda (`presets:/yo'l` kaliti,
 * qiymati — JSON satr), shuning uchun server (`me/ui-prefs/`) bilan birga
 * sinxronlanadi va boshqa qurilmada ham ochiladi.
 */
export type FilterPreset = { id: string; name: string; query: string };

export const PRESET_NAME_MAX = 40;
export const MAX_PRESETS = 20;

export function presetsKey(pathname: string): string {
  return `${PRESET_KEY_PREFIX}${pathname}`;
}

/** Buzilgan yoki eski satr — bo'sh ro'yxat (sahifa yiqilmasin). */
export function parsePresets(raw: string | undefined): FilterPreset[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item: unknown) => {
      if (!item || typeof item !== "object") return [];
      const { id, name, query } = item as Record<string, unknown>;
      return typeof id === "string" && typeof name === "string" && typeof query === "string" && name.trim()
        ? [{ id, name, query }]
        : [];
    });
  } catch {
    return [];
  }
}

export function serializePresets(presets: readonly FilterPreset[]): string {
  return JSON.stringify(presets.map(({ id, name, query }) => ({ id, name, query })));
}

/** Parametrlar tartibi farq qilmasin: `a=1&b=2` = `b=2&a=1`. */
export function normalizeQuery(query: string): string {
  const params = [...new URLSearchParams(query).entries()].filter(([, value]) => value !== "");
  params.sort(([a, x], [b, y]) => a.localeCompare(b) || x.localeCompare(y));
  return new URLSearchParams(params).toString();
}

export type PresetError = "empty_name" | "name_too_long" | "duplicate_name" | "empty_query" | "limit";

export type AddPresetResult = { ok: true; presets: FilterPreset[]; preset: FilterPreset } | { ok: false; error: PresetError };

export function addPreset(presets: readonly FilterPreset[], name: string, query: string, id: string): AddPresetResult {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return { ok: false, error: "empty_name" };
  if (trimmed.length > PRESET_NAME_MAX) return { ok: false, error: "name_too_long" };
  const normalized = normalizeQuery(query);
  if (!normalized) return { ok: false, error: "empty_query" };
  if (presets.some((item) => item.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase())) {
    return { ok: false, error: "duplicate_name" };
  }
  if (presets.length >= MAX_PRESETS) return { ok: false, error: "limit" };
  const preset = { id, name: trimmed, query: normalized };
  return { ok: true, preset, presets: [...presets, preset] };
}

export function removePreset(presets: readonly FilterPreset[], id: string): FilterPreset[] {
  return presets.filter((item) => item.id !== id);
}

/** Joriy URL filtri aynan qaysi to'plamga teng (bo'lmasa `null`). */
export function activePreset(presets: readonly FilterPreset[], query: string): FilterPreset | null {
  const normalized = normalizeQuery(query);
  if (!normalized) return null;
  return presets.find((item) => normalizeQuery(item.query) === normalized) ?? null;
}

export const PRESET_ERROR_TEXT: Record<PresetError, string> = {
  empty_name: "Nom kiriting",
  name_too_long: `Nom ${PRESET_NAME_MAX} belgidan oshmasin`,
  duplicate_name: "Bunday nomli filtr bor",
  empty_query: "Avval filtr tanlang",
  limit: `Ko'pi bilan ${MAX_PRESETS} ta filtr saqlanadi`,
};
