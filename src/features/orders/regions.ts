/**
 * Viloyatlar lug'ati — `delivery.region` enum (`02_DOMAIN_MODEL` §10).
 *
 * Yorliqlar mahalliy: backend `GET /meta/regions/` chiqquncha ham tahrir
 * formasi va filtrlar ishlasin. Backend `region_display` yuborsa, u ustun.
 */
export const REGIONS = [
  { value: "toshkent_shahar", label: "Toshkent shahri" },
  { value: "toshkent", label: "Toshkent viloyati" },
  { value: "andijon", label: "Andijon viloyati" },
  { value: "buxoro", label: "Buxoro viloyati" },
  { value: "fargona", label: "Farg'ona viloyati" },
  { value: "jizzax", label: "Jizzax viloyati" },
  { value: "xorazm", label: "Xorazm viloyati" },
  { value: "namangan", label: "Namangan viloyati" },
  { value: "navoiy", label: "Navoiy viloyati" },
  { value: "qashqadaryo", label: "Qashqadaryo viloyati" },
  { value: "samarqand", label: "Samarqand viloyati" },
  { value: "sirdaryo", label: "Sirdaryo viloyati" },
  { value: "surxondaryo", label: "Surxondaryo viloyati" },
  { value: "qoraqalpogiston", label: "Qoraqalpog'iston Respublikasi" },
] as const;

export type RegionKey = (typeof REGIONS)[number]["value"];

export function isRegionKey(value: string | null | undefined): value is RegionKey {
  return REGIONS.some((region) => region.value === value);
}

/** Kalitning o'qiladigan nomi; noma'lum kalit xom holida qaytadi. */
export function regionLabel(value: string | null | undefined): string {
  const key = (value ?? "").trim();
  if (!key) return "";
  return REGIONS.find((region) => region.value === key)?.label ?? key;
}
