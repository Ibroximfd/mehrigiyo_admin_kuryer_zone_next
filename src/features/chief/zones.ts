import { regionOfDistrict } from "@/features/zones/types";
import type { Zone } from "@/features/zones/types";

/**
 * Tahrir qilinayotgan zonaga olingan tumanlar boshqa zonalardan chiqariladi
 * (bitta tuman — bitta zona, §5b). Faqat o'zgaradigan zonalar qaytadi.
 */
export function districtMoves(
  zones: readonly Zone[],
  targetZoneId: number | null,
  codes: readonly string[],
): Array<{ zoneId: number; districtCodes: string[] }> {
  return zones.flatMap((zone) => {
    if (zone.id === targetZoneId) return [];
    const kept = zone.districtCodes.filter((code) => !codes.includes(code));
    return kept.length === zone.districtCodes.length ? [] : [{ zoneId: zone.id, districtCodes: kept }];
  });
}

/**
 * Zona tumanlari viloyat bo'yicha (hujjat 69 §1: zona bir nechta viloyatdan).
 * Viloyatlar `order` tartibida (bosh kuryerning o'z viloyatlari avval), qolgani oxirida.
 */
export function codesByRegion(codes: readonly string[], order: readonly string[]): Array<[string, string[]]> {
  const groups = new Map<string, string[]>();
  for (const code of codes) {
    const region = regionOfDistrict(code);
    groups.set(region, [...(groups.get(region) ?? []), code]);
  }
  const rank = (region: string) => {
    const index = order.indexOf(region);
    return index === -1 ? order.length : index;
  };
  return [...groups.entries()].sort(([a], [b]) => rank(a) - rank(b));
}

/** Zonalar tartibi: ishlayotganlari avval, keyin nom bo'yicha. */
export function sortZones(zones: readonly Zone[]): Zone[] {
  return [...zones].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name));
}

/**
 * Zona tuzishda viloyatlar: o'zinikilar avval, keyin boshqa viloyatlar —
 * zonaga begona viloyat tumani ham qo'shiladi (hujjat 69 §1).
 */
export function splitRegions<T extends { region: string }>(all: readonly T[], own: readonly string[]): { own: T[]; other: T[] } {
  if (own.length === 0) return { own: [...all], other: [] };
  return {
    own: own.map((region) => all.find((item) => item.region === region)).filter((item): item is T => item !== undefined),
    other: all.filter((item) => !own.includes(item.region)),
  };
}
