import { api } from "@/shared/lib/api-client";

import {
  adminDistrictSchema,
  adminDistrictsResponseSchema,
  toDistrictPayload,
  type AdminDistrict,
  type DistrictPatch,
} from "../model/district";

export function fetchDistricts(region: string, signal?: AbortSignal): Promise<AdminDistrict[]> {
  return api.get("admin/districts/", {
    schema: adminDistrictsResponseSchema,
    searchParams: { region },
    signal,
  });
}

/**
 * Kodda `/` bor (`fargona/qoqon_sh`) va kontrakt bo'yicha u URL'da o'z holicha
 * yoziladi; bo'laklarning o'zi esa xavfsiz kodlanadi.
 */
export function districtPath(code: string): string {
  return `admin/districts/${code.split("/").map(encodeURIComponent).join("/")}/`;
}

export function updateDistrict(code: string, patch: DistrictPatch): Promise<AdminDistrict> {
  return api.patch(districtPath(code), { schema: adminDistrictSchema, json: toDistrictPayload(patch) });
}
