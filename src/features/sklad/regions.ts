/**
 * 14 viloyat (`18_SKLAD…` §3.1) — kodlar backend bilan qat'iy, tartib ham
 * shu: xarita, filtr va hisobotlar bir xil ketma-ketlikda chiqadi.
 *
 * Nomlar backend `GET /regions/` bermaguncha ham kerak (xarita birinchi
 * chizishda bo'sh turmasin); server javobi kelgach o'shanisi ustun.
 */
export const SKLAD_REGIONS = [
  { code: "toshkent_shahar", name: "Toshkent shahri", short: "Toshkent sh." },
  { code: "toshkent", name: "Toshkent viloyati", short: "Toshkent v." },
  { code: "andijon", name: "Andijon", short: "Andijon" },
  { code: "buxoro", name: "Buxoro", short: "Buxoro" },
  { code: "fargona", name: "Farg'ona", short: "Farg'ona" },
  { code: "jizzax", name: "Jizzax", short: "Jizzax" },
  { code: "xorazm", name: "Xorazm", short: "Xorazm" },
  { code: "namangan", name: "Namangan", short: "Namangan" },
  { code: "navoiy", name: "Navoiy", short: "Navoiy" },
  { code: "qashqadaryo", name: "Qashqadaryo", short: "Qashqadaryo" },
  { code: "samarqand", name: "Samarqand", short: "Samarqand" },
  { code: "sirdaryo", name: "Sirdaryo", short: "Sirdaryo" },
  { code: "surxondaryo", name: "Surxondaryo", short: "Surxondaryo" },
  { code: "qoraqalpogiston", name: "Qoraqalpog'iston", short: "Qoraqalpog'iston" },
] as const;

export type RegionCode = (typeof SKLAD_REGIONS)[number]["code"];

const BY_CODE = new Map<string, (typeof SKLAD_REGIONS)[number]>(
  SKLAD_REGIONS.map((region) => [region.code, region]),
);

export function isRegionCode(value: unknown): value is RegionCode {
  return typeof value === "string" && BY_CODE.has(value);
}

/** Noma'lum kod bo'lsa kodning o'zi qaytadi — UI bo'sh qolmasin. */
export function regionName(code: string | null | undefined): string {
  if (!code) return "—";
  return BY_CODE.get(code)?.name ?? code;
}

/** Xarita yorlig'i uchun qisqa nom. */
export function regionShort(code: string): string {
  return BY_CODE.get(code)?.short ?? code;
}
