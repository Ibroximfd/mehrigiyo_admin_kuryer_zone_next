import { api } from "@/shared/lib/api-client";

import { cashUsersResponseSchema, type CashUser } from "../model/cash-user";
import { filialsResponseSchema, type Filial } from "../model/filial";
import { zoneSchema, zonesResponseSchema, type Zone, type ZonesOverview } from "../model/zone";
import type { ZoneCreatePayload, ZonePatchPayload } from "../model/zone-form";

/** `region` berilmasa — hamma viloyat zonalari (`unzoned_districts` siz). */
export function fetchZones(region: string | null, signal?: AbortSignal): Promise<ZonesOverview> {
  return api.get("admin/zones/", { schema: zonesResponseSchema, searchParams: { region }, signal });
}

export function createZone(payload: ZoneCreatePayload): Promise<Zone> {
  return api.post("admin/zones/", { schema: zoneSchema, json: payload });
}

export function updateZone(id: number, patch: ZonePatchPayload): Promise<Zone> {
  return api.patch(`admin/zones/${id}/`, { schema: zoneSchema, json: patch });
}

/** Kassa tanlovi uchun hamma filiallar (nofaollar oxirida) — backend #21. */
export function fetchFilials(signal?: AbortSignal): Promise<Filial[]> {
  return api.get("admin/filials/", { schema: filialsResponseSchema, signal });
}

/** Kassa-shaxs nomzodlari, server qidiruvi (ism/login/telefon), ≤ 100 — backend #22. */
export function fetchCashUsers(search: string, signal?: AbortSignal): Promise<CashUser[]> {
  return api.get("admin/cash-users/", {
    schema: cashUsersResponseSchema,
    searchParams: { search: search.trim() },
    signal,
  });
}
