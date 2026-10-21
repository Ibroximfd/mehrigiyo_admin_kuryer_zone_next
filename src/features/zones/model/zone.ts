import { z } from "zod";

import { idListSchema, listOf, optionalTextSchema } from "@/shared/lib/schema";

/**
 * Zona — tumanlar guruhi + kassa (`/api/admin/zones/`). Zonalar FAQAT admin
 * panelda yaratiladi; har tuman ko'pi bilan bitta zonada bo'ladi.
 */

// ─────────────────────────────────────────────────────────────────────────
// Kassa nuqtasi
// ─────────────────────────────────────────────────────────────────────────

export type CashPointKind = "filial" | "person";

export type CashPoint =
  | { kind: "filial"; filialId: number | null; name: string | null }
  | { kind: "person"; userId: number | null; name: string | null };

const cashPointSchema = z
  .object({
    kind: z.string().nullish(),
    filial_id: z.number().int().nullish(),
    user_id: z.number().int().nullish(),
    name: optionalTextSchema,
  })
  .nullish()
  .transform((raw): CashPoint | null => {
    if (!raw) return null;
    const isPerson = raw.kind === "person" || (raw.kind !== "filial" && raw.user_id != null);
    if (isPerson) return { kind: "person", userId: raw.user_id ?? null, name: raw.name };
    if (raw.kind !== "filial" && raw.filial_id == null && !raw.name) return null;
    return { kind: "filial", filialId: raw.filial_id ?? null, name: raw.name };
  });

// ─────────────────────────────────────────────────────────────────────────
// Zona
// ─────────────────────────────────────────────────────────────────────────

export const zoneSchema = z
  .object({
    id: z.number().int(),
    region: z.string(),
    name: optionalTextSchema,
    is_active: z.boolean().nullish(),
    district_codes: z
      .array(z.string())
      .nullish()
      .transform((codes) => codes ?? []),
    cash_point: cashPointSchema,
    neighbor_zone_ids: idListSchema,
  })
  .transform((raw) => ({
    id: raw.id,
    region: raw.region,
    name: raw.name ?? `#${raw.id}`,
    isActive: raw.is_active ?? true,
    districtCodes: raw.district_codes,
    cashPoint: raw.cash_point,
    neighborZoneIds: raw.neighbor_zone_ids,
  }));

export type Zone = z.output<typeof zoneSchema>;

const unzonedDistrictSchema = z
  .object({ code: z.string().min(1), name: optionalTextSchema })
  .transform(({ code, name }) => ({ code, name: name ?? code }));

export type UnzonedDistrict = z.output<typeof unzonedDistrictSchema>;

/**
 * `{zones, unzoned_districts}`. `unzoned_districts` faqat `region` berilganda
 * keladi (R-11); toza massiv kelsa ham qabul qilinadi.
 */
export const zonesResponseSchema = z.union([
  z
    .object({
      zones: z.array(zoneSchema),
      unzoned_districts: z.array(unzonedDistrictSchema).nullish(),
    })
    .transform((raw) => ({ zones: raw.zones, unzonedDistricts: raw.unzoned_districts ?? [] })),
  listOf(zoneSchema).transform((zones) => ({ zones, unzonedDistricts: [] as UnzonedDistrict[] })),
]);

export type ZonesOverview = z.output<typeof zonesResponseSchema>;

/** Faollar oldin, keyin nom bo'yicha. */
export function sortZones(zones: readonly Zone[]): Zone[] {
  return [...zones].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
