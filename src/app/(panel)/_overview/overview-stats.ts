/**
 * Bosh sahifa ko'rsatkichlari — bir nechta bo'lim ma'lumotidan yig'iladi,
 * shuning uchun app qatlamida (feature'lar bir-birini import qilmaydi).
 * Kirishlar strukturaviy: faqat kerakli maydonlar.
 */

type DistrictLike = { code: string; isActive: boolean };
type RegionLike = { districts: readonly DistrictLike[] };
type ZoneLike = { isActive: boolean; districtCodes: readonly string[] };
type CourierLike = { isActive: boolean; onShift: boolean };

export type OverviewStats = {
  activeZones: number;
  inactiveZones: number;
  unzonedDistricts: number;
  activeCouriers: number;
  couriersOnShift: number;
};

/** Faol tuman, hech bir FAOL zonada emas → zonasiz. */
export function countUnzoned(regions: readonly RegionLike[], zones: readonly ZoneLike[]): number {
  const zoned = new Set(zones.filter((zone) => zone.isActive).flatMap((zone) => zone.districtCodes));
  return regions.flatMap((region) => region.districts).filter((district) => district.isActive && !zoned.has(district.code)).length;
}

export function buildOverviewStats(
  regions: readonly RegionLike[],
  zones: readonly ZoneLike[],
  couriers: readonly CourierLike[],
): OverviewStats {
  const active = couriers.filter((courier) => courier.isActive);
  return {
    activeZones: zones.filter((zone) => zone.isActive).length,
    inactiveZones: zones.filter((zone) => !zone.isActive).length,
    unzonedDistricts: countUnzoned(regions, zones),
    activeCouriers: active.length,
    couriersOnShift: active.filter((courier) => courier.onShift).length,
  };
}
