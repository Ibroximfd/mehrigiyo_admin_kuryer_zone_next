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
 * Zonalar viloyat bo'yicha: bosh kuryerga biriktirilgan **har** viloyat chiqadi —
 * zonasi yo'q bo'lsa ham (bo'sh ro'yxat bilan), o'sha tartibda. Biriktirilmagan
 * viloyatdagi zona (masalan, `scope=all`) oxirida keladi.
 */
export function zonesByRegion(zones: readonly Zone[], assigned: readonly string[]): Array<[string, Zone[]]> {
  const groups = new Map<string, Zone[]>(assigned.map((region) => [region, []]));
  for (const zone of zones) groups.set(zone.region, [...(groups.get(zone.region) ?? []), zone]);
  return [...groups.entries()];
}
