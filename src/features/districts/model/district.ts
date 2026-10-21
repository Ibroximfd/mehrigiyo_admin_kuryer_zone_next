import { z } from "zod";

import { districtKindSchema, listOf, optionalTextSchema } from "@/shared/lib/schema";

/**
 * Admin tumanlari (`GET /api/admin/districts/?region=`). Kod backendniki va
 * o'zgarmaydi — admin faqat nomlarni va faollikni tahrirlaydi.
 */

export const adminDistrictSchema = z
  .object({
    code: z.string().min(1),
    region: z.string().nullish(),
    name_uz: optionalTextSchema,
    name_uz_cyrl: optionalTextSchema,
    name_ru: optionalTextSchema,
    kind: districtKindSchema,
    is_active: z.boolean().nullish(),
    has_boundary: z.boolean().nullish(),
    zone_id: z.number().int().nullish(),
  })
  .transform((raw) => ({
    code: raw.code,
    region: raw.region ?? raw.code.split("/")[0] ?? "",
    nameUz: raw.name_uz ?? "",
    nameUzCyrl: raw.name_uz_cyrl ?? "",
    nameRu: raw.name_ru ?? "",
    kind: raw.kind,
    isActive: raw.is_active ?? true,
    // Maydon kelmasa "chegara bor" deymiz — ogohlantirishni noto'g'ri yoqmaslik uchun.
    hasBoundary: raw.has_boundary ?? true,
    zoneId: raw.zone_id ?? null,
  }));

export type AdminDistrict = z.output<typeof adminDistrictSchema>;

export const adminDistrictsResponseSchema = listOf(adminDistrictSchema);

/** Tahrirlanadigan nom maydonlari — jadval ustunlari shu tartibda. */
export const DISTRICT_NAME_FIELDS = ["nameUz", "nameUzCyrl", "nameRu"] as const;
export type DistrictNameField = (typeof DISTRICT_NAME_FIELDS)[number];

export type DistrictPatch = Partial<Pick<AdminDistrict, DistrictNameField | "isActive">>;

export type DistrictPayload = Partial<{
  name_uz: string;
  name_uz_cyrl: string;
  name_ru: string;
  is_active: boolean;
}>;

/** Domen patch → server tanasi (`{name_uz: "…"}`), nomlar qirqilgan holda. */
export function toDistrictPayload(patch: DistrictPatch): DistrictPayload {
  const payload: DistrictPayload = {};
  if (patch.nameUz !== undefined) payload.name_uz = patch.nameUz.trim();
  if (patch.nameUzCyrl !== undefined) payload.name_uz_cyrl = patch.nameUzCyrl.trim();
  if (patch.nameRu !== undefined) payload.name_ru = patch.nameRu.trim();
  if (patch.isActive !== undefined) payload.is_active = patch.isActive;
  return payload;
}

/** Optimistik yangilash uchun — server javobini kutmasdan ro'yxatni o'zgartiradi. */
export function applyDistrictPatch(
  districts: readonly AdminDistrict[],
  code: string,
  patch: DistrictPatch,
): AdminDistrict[] {
  return districts.map((district) => {
    if (district.code !== code) return district;
    const next = { ...district, ...patch };
    // Nofaol tuman zonadan chiqadi (kontrakt §3) — UI darhol shuni ko'rsatsin.
    return patch.isActive === false ? { ...next, zoneId: null } : next;
  });
}

export function replaceDistrict(
  districts: readonly AdminDistrict[],
  updated: AdminDistrict,
): AdminDistrict[] {
  return districts.map((district) => (district.code === updated.code ? updated : district));
}

export type NameValidation = "ok" | "required" | "unchanged";

/** `name_uz` majburiy; boshqa tillar bo'sh qolishi mumkin. */
export function validateNameEdit(
  field: DistrictNameField,
  value: string,
  previous: string,
): NameValidation {
  const next = value.trim();
  if (next === previous.trim()) return "unchanged";
  if (field === "nameUz" && !next) return "required";
  return "ok";
}

function normalize(text: string): string {
  return text.toLocaleLowerCase().replace(/[ʻʼ'`‘’]/g, "'").trim();
}

/** Qidiruv: kod va uchala nom bo'yicha, apostrof turlariga befarq. */
export function filterDistricts(
  districts: readonly AdminDistrict[],
  query: string,
): readonly AdminDistrict[] {
  const needle = normalize(query);
  if (!needle) return districts;
  return districts.filter((district) =>
    [district.code, district.nameUz, district.nameUzCyrl, district.nameRu].some((value) =>
      normalize(value).includes(needle),
    ),
  );
}

/** Ko'rsatish nomi tanlangan tilda (bo'sh bo'lsa lotin nomi, keyin kod). */
export function districtDisplayName(district: AdminDistrict, locale: "uz" | "ru"): string {
  const localized = locale === "ru" ? district.nameRu : district.nameUz;
  return localized || district.nameUz || district.code;
}
