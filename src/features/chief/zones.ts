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
