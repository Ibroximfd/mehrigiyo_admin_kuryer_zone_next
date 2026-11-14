import type { DistrictOption, OrderZoning } from "@/features/orders/zoning";

/**
 * Tuman holati belgisi (60-javob, `district_state`). Ishonchli aniqlangani
 * (`auto`) va qo'yilgani (`set`) odatdagidek — belgi faqat bosh kuryer
 * harakat qilishi kerak bo'lganda: `guess` (taxmin yozilmagan) va `missing`.
 */
export type DistrictBadge = { label: string; color: string };

export function districtBadge(zoning: OrderZoning): DistrictBadge | null {
  if (zoning.districtState === "guess") return { label: "Tuman mos kelmadi", color: "var(--warn)" };
  if (zoning.districtState === "missing") return { label: "Tuman aniqlanmadi", color: "var(--danger)" };
  return null;
}

/** Bir bosishda tanlanadigan variantlar: asosiy taxmin, keyin ikki ma'noli muqobillar (takrorsiz). */
export function districtChoices(zoning: OrderZoning): DistrictOption[] {
  if (zoning.districtState !== "guess" || !zoning.districtGuess) return [];
  const { district, districtDisplay, alternatives } = zoning.districtGuess;
  const seen = new Set<string>();
  return [{ district, districtDisplay }, ...alternatives].filter((option) => {
    if (seen.has(option.district)) return false;
    seen.add(option.district);
    return true;
  });
}

/** Tuman bosh kuryer harakatini kutyaptimi (tasdiqlash yoki tanlash). */
export function needsDistrictAction(zoning: OrderZoning): boolean {
  return zoning.districtState === "guess" || zoning.districtState === "missing";
}
