import type { District, RegionDistricts, Zone } from "@/features/zones/types";

/**
 * Tumanlar ro'yxati (Zonalar → «Tumanlar», hujjat 51): bosh kuryer lug'atdagi
 * tumanlarni sukut holida ko'radi, nomini tuzatadi, keraksizini yashiradi,
 * yo'g'ini qo'shadi. Ko'rinadiganlar avval, keyin yashirilganlar.
 */
export type DistrictRow = {
  district: District;
  /** Tuman qaysi zonada — yashirishdan oldin zonadan chiqarilishi kerak. */
  zone: Zone | null;
};

export function districtRows(region: RegionDistricts | undefined, zones: readonly Zone[]): DistrictRow[] {
  if (!region) return [];
  return region.districts
    .map((district) => ({
      district,
      zone: zones.find((zone) => zone.districtCodes.includes(district.code)) ?? null,
    }))
    .sort((a, b) => Number(b.district.isActive) - Number(a.district.isActive));
}

/** Nom tekshiruvi: 2–80 belgi, shu viloyatda boshqa tumanda takrorlanmasin. */
export function districtNameError(
  name: string,
  region: RegionDistricts | undefined,
  selfCode: string | null,
): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 2) return "Nomi kamida 2 harf bo'lsin";
  if (trimmed.length > 80) return "Nomi 80 belgidan oshmasin";
  const taken = region?.districts.some(
    (district) => district.code !== selfCode && district.nameUz.trim().toLowerCase() === trimmed.toLowerCase(),
  );
  return taken ? "Bu viloyatda shu nomli tuman bor" : null;
}
