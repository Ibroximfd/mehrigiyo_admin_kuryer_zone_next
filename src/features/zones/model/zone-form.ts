import { z } from "zod";

import { isAppError } from "@/shared/lib/app-error";

import type { Zone } from "./zone";

/**
 * Zona formasi. Xato matnlari — i18n kalitlari (`validation.*`), tarjimani
 * UI qiladi.
 */
export const zoneFormSchema = z
  .object({
    name: z.string().trim().min(1, "required").max(100, "tooLong"),
    districtCodes: z.array(z.string()),
    cashPointKind: z.enum(["filial", "person"]),
    filialId: z.number().int().nullable(),
    person: z.object({ userId: z.number().int().positive(), name: z.string() }).nullable(),
    neighborZoneIds: z.array(z.number().int()),
    isActive: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.cashPointKind === "filial" && values.filialId === null) {
      ctx.addIssue({ code: "custom", path: ["filialId"], message: "required" });
    }
    if (values.cashPointKind === "person" && values.person === null) {
      ctx.addIssue({ code: "custom", path: ["person"], message: "cashPersonRequired" });
    }
  });

export type ZoneFormValues = z.infer<typeof zoneFormSchema>;

export const ZONE_FORM_FIELDS = [
  "name",
  "districtCodes",
  "filialId",
  "person",
  "neighborZoneIds",
  "isActive",
] as const satisfies ReadonlyArray<keyof ZoneFormValues>;

export type ZoneFormField = (typeof ZONE_FORM_FIELDS)[number];

/** Server maydon nomi → forma maydoni (400 `fields` uchun). `cash_point` alohida — `mapZoneServerErrors`. */
export const ZONE_FIELD_ALIASES = {
  name: "name",
  district_codes: "districtCodes",
  neighbor_zone_ids: "neighborZoneIds",
  is_active: "isActive",
  "cash_point.filial_id": "filialId",
  "cash_point.user_id": "person",
} as const satisfies Record<string, ZoneFormField>;

export function emptyZoneForm(): ZoneFormValues {
  return {
    name: "",
    districtCodes: [],
    cashPointKind: "filial",
    filialId: null,
    person: null,
    neighborZoneIds: [],
    isActive: true,
  };
}

export function zoneToForm(zone: Zone): ZoneFormValues {
  const point = zone.cashPoint;
  return {
    name: zone.name,
    districtCodes: [...zone.districtCodes],
    cashPointKind: point?.kind ?? "filial",
    filialId: point?.kind === "filial" ? point.filialId : null,
    // Tahrirda nom qidiruvsiz ham ko'rinsin — `cash_point.name` dan.
    person: point?.kind === "person" && point.userId !== null ? { userId: point.userId, name: point.name ?? `#${point.userId}` } : null,
    neighborZoneIds: [...zone.neighborZoneIds],
    isActive: zone.isActive,
  };
}

type CashPointPayload = { kind: "filial"; filial_id: number } | { kind: "person"; user_id: number };

function toCashPointPayload(values: ZoneFormValues): CashPointPayload | null {
  if (values.cashPointKind === "filial") {
    return values.filialId === null ? null : { kind: "filial", filial_id: values.filialId };
  }
  return values.person === null ? null : { kind: "person", user_id: values.person.userId };
}

export type ZoneCreatePayload = {
  region: string;
  name: string;
  district_codes: string[];
  cash_point: CashPointPayload | null;
  neighbor_zone_ids: number[];
};

export function toZoneCreatePayload(region: string, values: ZoneFormValues): ZoneCreatePayload {
  return {
    region,
    name: values.name.trim(),
    district_codes: values.districtCodes,
    cash_point: toCashPointPayload(values),
    neighbor_zone_ids: values.neighborZoneIds,
  };
}

export type ZonePatchPayload = Partial<{
  name: string;
  district_codes: string[];
  cash_point: CashPointPayload | null;
  neighbor_zone_ids: number[];
  is_active: boolean;
}>;

function sameSet<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((item) => set.has(item));
}

function sameCashPoint(zone: Zone, next: CashPointPayload | null): boolean {
  const point = zone.cashPoint;
  if (!point || !next) return point === null && next === null;
  if (point.kind === "filial" && next.kind === "filial") return point.filialId === next.filial_id;
  if (point.kind === "person" && next.kind === "person") return point.userId === next.user_id;
  return false;
}

/**
 * Faqat o'zgargan maydonlar yuboriladi. Har PATCH logist doskalarida qayta
 * hisob-kitob uyg'otadi (`zone_updated`), shuning uchun tegilmagan
 * `district_codes` ni qayta jo'natmaymiz. Ro'yxat to'liq almashtiriladi.
 */
export function diffZonePatch(zone: Zone, values: ZoneFormValues): ZonePatchPayload {
  const patch: ZonePatchPayload = {};
  const name = values.name.trim();
  if (name !== zone.name) patch.name = name;
  if (!sameSet(zone.districtCodes, values.districtCodes)) patch.district_codes = values.districtCodes;
  if (!sameSet(zone.neighborZoneIds, values.neighborZoneIds)) {
    patch.neighbor_zone_ids = values.neighborZoneIds;
  }
  const cashPoint = toCashPointPayload(values);
  if (!sameCashPoint(zone, cashPoint)) patch.cash_point = cashPoint;
  if (values.isActive !== zone.isActive) patch.is_active = values.isActive;
  return patch;
}

export function isEmptyPatch(patch: ZonePatchPayload): boolean {
  return Object.keys(patch).length === 0;
}

// ─────────────────────────────────────────────────────────────────────────
// Server xatolari → forma
// ─────────────────────────────────────────────────────────────────────────

export const DISTRICT_IN_ZONE = "district_in_zone";

/** 409 `district_in_zone`: birinchi to'qnashgan tuman va u band bo'lgan zona. */
export type DistrictConflict = { districtCode: string | null; zoneId: number | null; detail: string | null };

export type ZoneServerErrors = {
  fields: Array<{ name: ZoneFormField; message: string }>;
  /** 409 — tumanlar maydoni ostida nom bilan ko'rsatiladi. */
  districtConflict: DistrictConflict | null;
  /** 400 `{cash_point: [...]}` — kassa tanlanmagan (backend #27). */
  cashPointMissing: boolean;
  rest: string[];
};

const CONFLICT_KEYS = new Set(["district", "district_codes", "zone_id"]);

function firstId(values: readonly string[] | undefined): number | null {
  const id = Number(values?.[0]);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Zona so'rovi xatosini formaga ajratadi.
 *
 *  - `409 district_in_zone` (backend #25): `fields: {district: ["fargona/qoqon_sh"], zone_id: [7]}`,
 *    `detail` da zona nomi. Bir nechta to'qnashuvda server birinchisini qaytaradi.
 *    Qo'llanmada kalit `district_codes` deb yozilgan — ikkalasi ham qabul qilinadi.
 *  - `400 {cash_point: ["filial_id"]}` (backend #27): qiymat — maydon nomi, matn emas;
 *    shuning uchun tanlangan kassa turi maydoniga "majburiy" sifatida tushadi.
 */
export function mapZoneServerErrors(error: unknown): ZoneServerErrors {
  const result: ZoneServerErrors = { fields: [], districtConflict: null, cashPointMissing: false, rest: [] };
  if (!isAppError(error)) return result;

  const isConflict = error.code === DISTRICT_IN_ZONE;
  if (isConflict) {
    result.districtConflict = {
      districtCode: error.fields.district?.[0] ?? error.fields.district_codes?.[0] ?? null,
      zoneId: firstId(error.fields.zone_id),
      detail: error.detail,
    };
  }

  for (const [serverName, messages] of Object.entries(error.fields)) {
    if (isConflict && CONFLICT_KEYS.has(serverName)) continue;
    if (serverName === "cash_point") {
      result.cashPointMissing = true;
      continue;
    }
    const aliases: Readonly<Record<string, ZoneFormField>> = ZONE_FIELD_ALIASES;
    const root = serverName.split(".")[0] ?? serverName;
    const name = aliases[serverName] ?? aliases[root] ?? ZONE_FORM_FIELDS.find((field) => field === root) ?? null;
    const message = messages.join(" ");
    if (name) result.fields.push({ name, message });
    else result.rest.push(message);
  }
  return result;
}
