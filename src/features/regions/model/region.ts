import { z } from "zod";

import { districtKindSchema, listOf, optionalTextSchema } from "@/shared/lib/schema";

/**
 * Viloyat + tumanlar ma'lumotnomasi (`GET /api/meta/regions/`, tokensiz).
 * `region` — viloyat kodi (`fargona`), tuman kodi `"<region>/<slug>"`.
 */

const metaDistrictSchema = z
  .object({
    code: z.string().min(1),
    region: z.string().nullish(),
    name_uz: optionalTextSchema,
    name_ru: optionalTextSchema,
    name_uz_cyrl: optionalTextSchema,
    kind: districtKindSchema,
    is_active: z.boolean().nullish(),
  })
  .transform((raw) => ({
    code: raw.code,
    region: raw.region ?? raw.code.split("/")[0] ?? "",
    nameUz: raw.name_uz ?? raw.code,
    nameRu: raw.name_ru,
    nameUzCyrl: raw.name_uz_cyrl,
    kind: raw.kind,
    isActive: raw.is_active ?? true,
  }));

export type MetaDistrict = z.output<typeof metaDistrictSchema>;

const regionSchema = z
  .object({
    region: z.string().min(1),
    name: optionalTextSchema,
    districts: z.array(metaDistrictSchema).nullish(),
  })
  .transform((raw) => ({
    code: raw.region,
    name: raw.name ?? raw.region,
    districts: raw.districts ?? [],
  }));

export type Region = z.output<typeof regionSchema>;

export const regionsResponseSchema = listOf(regionSchema);

export function findRegion(regions: readonly Region[], code: string | null): Region | null {
  if (!code) return null;
  return regions.find((region) => region.code === code) ?? null;
}

/** Faol tumanlar soni — viloyat tanlovida yordamchi matn uchun. */
export function activeDistrictCount(region: Region): number {
  return region.districts.filter((district) => district.isActive).length;
}
