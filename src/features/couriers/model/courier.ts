import { z } from "zod";

import {
  idListSchema,
  listOf,
  optionalAmountSchema,
  optionalCountSchema,
  optionalTextSchema,
  refSchema,
} from "@/shared/lib/schema";

/**
 * Kuryer (`/api/admin/couriers/`). Akkaunt FAQAT admin panelda ochiladi
 * (R-03). `zone_ids` tartibli — birinchisi asosiy zona.
 */

const deviceSchema = z
  .object({
    device_name: optionalTextSchema,
    platform: optionalTextSchema,
    app_version: optionalTextSchema,
    since: optionalTextSchema,
    last_seen_at: optionalTextSchema,
  })
  .nullish()
  .transform((raw) =>
    raw
      ? {
          name: raw.device_name,
          platform: raw.platform,
          appVersion: raw.app_version,
          since: raw.since,
          lastSeenAt: raw.last_seen_at,
        }
      : null,
  );

export type CourierDevice = NonNullable<z.output<typeof deviceSchema>>;

const todaySchema = z
  .object({
    assigned: optionalCountSchema,
    delivered: optionalCountSchema,
    cod_total: optionalAmountSchema,
  })
  .nullish()
  .transform((raw) => ({
    assigned: raw?.assigned ?? 0,
    delivered: raw?.delivered ?? 0,
    codTotal: raw?.cod_total ?? 0,
  }));

const locationSchema = z
  .object({ lat: z.number(), lng: z.number(), at: optionalTextSchema })
  .nullish()
  .transform((raw) => raw ?? null);

const courierObjectSchema = z.object({
    id: z.number().int(),
    full_name: optionalTextSchema,
    phone: z.string().nullish(),
    is_active: z.boolean().nullish(),
    region: optionalTextSchema,
    zone_ids: idListSchema,
    zones: z
      .array(refSchema)
      .nullish()
      .transform((zones) => zones ?? []),
    filial: refSchema.nullish().transform((filial) => filial ?? null),
    today: todaySchema,
    load: optionalCountSchema,
    has_account: z.boolean().nullish(),
    device: deviceSchema,
    on_shift: z.boolean().nullish(),
    online: z.boolean().nullish(),
    last_heartbeat_at: optionalTextSchema,
    last_location: locationSchema,
});

type RawCourier = z.output<typeof courierObjectSchema>;

function toCourier(raw: RawCourier) {
  return {
    id: raw.id,
    fullName: raw.full_name ?? `#${raw.id}`,
    phone: raw.phone ?? "",
    isActive: raw.is_active ?? true,
    region: raw.region,
    zoneIds: raw.zone_ids,
    zones: raw.zones,
    filial: raw.filial,
    today: raw.today,
    load: raw.load,
    hasAccount: raw.has_account ?? false,
    device: raw.device,
    onShift: raw.on_shift ?? false,
    online: raw.online ?? false,
    lastHeartbeatAt: raw.last_heartbeat_at,
    lastLocation: raw.last_location,
  };
}

export const courierSchema = courierObjectSchema.transform(toCourier);

export type Courier = z.output<typeof courierSchema>;

export const couriersResponseSchema = listOf(courierSchema);

/** POST/PATCH javobi: kuryer + (berilgan bo'lsa) BIR MARTALIK parol. */
export const courierWithPasswordSchema = courierObjectSchema
  .extend({ password: optionalTextSchema })
  .transform((raw) => ({ courier: toCourier(raw), password: raw.password }));

export const setPasswordResponseSchema = z
  .object({
    id: z.number().int(),
    phone: z.string().nullish(),
    password: optionalTextSchema,
    has_account: z.boolean().nullish(),
    device: deviceSchema,
  })
  .transform((raw) => ({
    id: raw.id,
    password: raw.password,
    hasAccount: raw.has_account ?? true,
    device: raw.device,
  }));

export const deactivateResponseSchema = z
  .object({ id: z.number().int(), is_active: z.boolean().nullish() })
  .transform((raw) => ({ id: raw.id, isActive: raw.is_active ?? false }));

export const logoutDeviceResponseSchema = z
  .object({
    id: z.number().int(),
    logged_out: z.boolean().nullish(),
    has_account: z.boolean().nullish(),
    device: deviceSchema,
  })
  .transform((raw) => ({
    id: raw.id,
    loggedOut: raw.logged_out ?? true,
    hasAccount: raw.has_account ?? true,
    device: raw.device,
  }));

// ─────────────────────────────────────────────────────────────────────────
// Ro'yxat qoidalari
// ─────────────────────────────────────────────────────────────────────────

export type CourierStatusFilter = "active" | "inactive" | "all";
export type ShiftFilter = "on" | "off" | "all";

/**
 * Server filtri (backend #23, sahifalash yo'q): `?search=&is_active=&region=&zone=&on_shift=`.
 * `search` — ism/telefon (`icontains`), chaqiruvchi debounce qiladi.
 */
export type CourierServerFilter = {
  region: string | null;
  zone: number | null;
  shift: ShiftFilter;
  status: CourierStatusFilter;
  search: string;
};

export function toCourierSearchParams(filter: CourierServerFilter) {
  const search = filter.search.trim();
  return {
    search: search || null,
    is_active: filter.status === "all" ? null : filter.status === "active",
    region: filter.region,
    zone: filter.zone,
    on_shift: filter.shift === "all" ? null : filter.shift === "on",
  };
}

/** Ro'yxat tartibi: faollar, smenadagilar oldin, keyin ism. */
export function sortCouriers(couriers: readonly Courier[]): Courier[] {
  return [...couriers].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    if (a.onShift !== b.onShift) return a.onShift ? -1 : 1;
    return a.fullName.localeCompare(b.fullName);
  });
}

/** Zona kartochkasidagi "N kuryer" — faqat faol kuryerlar sanaladi. */
export function countCouriersByZone(couriers: readonly Courier[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const courier of couriers) {
    if (!courier.isActive) continue;
    for (const zoneId of new Set(courier.zoneIds)) {
      counts.set(zoneId, (counts.get(zoneId) ?? 0) + 1);
    }
  }
  return counts;
}

/** Zonalar asosiy birinchi bo'lib — `zones[]` tartibi kafolatlanmagan, `zone_ids` bo'yicha. */
export function orderedCourierZones(
  courier: Courier,
  zoneNames: ReadonlyMap<number, string>,
): Array<{ id: number; name: string; isPrimary: boolean }> {
  const fromRefs = new Map(courier.zones.map((zone) => [zone.id, zone.name]));
  return courier.zoneIds.map((id, index) => ({
    id,
    name: fromRefs.get(id) ?? zoneNames.get(id) ?? `#${id}`,
    isPrimary: index === 0,
  }));
}
