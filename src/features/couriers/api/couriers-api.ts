import { api } from "@/shared/lib/api-client";

import {
  couriersResponseSchema,
  courierWithPasswordSchema,
  deactivateResponseSchema,
  logoutDeviceResponseSchema,
  setPasswordResponseSchema,
  toCourierSearchParams,
  type Courier,
  type CourierServerFilter,
} from "../model/courier";
import type { CourierCreatePayload, CourierPatchPayload, SetPasswordPayload } from "../model/courier-form";

export function fetchCouriers(filter: CourierServerFilter, signal?: AbortSignal): Promise<Courier[]> {
  return api.get("admin/couriers/", {
    schema: couriersResponseSchema,
    searchParams: toCourierSearchParams(filter),
    signal,
  });
}

export function createCourier(payload: CourierCreatePayload) {
  return api.post("admin/couriers/", { schema: courierWithPasswordSchema, json: payload });
}

export function updateCourier(id: number, patch: CourierPatchPayload) {
  return api.patch(`admin/couriers/${id}/`, { schema: courierWithPasswordSchema, json: patch });
}

/** `password` yo'q — server o'zi yaratadi va javobda BIR MARTA qaytaradi (backend #24). */
export function setCourierPassword(id: number, payload: SetPasswordPayload) {
  return api.post(`admin/couriers/${id}/set-password/`, { schema: setPasswordResponseSchema, json: payload });
}

/** `PATCH {is_active: true}` — kuryer ham, akkaunt ham tiklanadi (backend #26). */
export function reactivateCourier(id: number) {
  return api.patch(`admin/couriers/${id}/`, { schema: courierWithPasswordSchema, json: { is_active: true } });
}

export function deactivateCourier(id: number) {
  return api.post(`admin/couriers/${id}/deactivate/`, { schema: deactivateResponseSchema, json: {} });
}

export function logoutCourierDevice(id: number) {
  return api.post(`admin/couriers/${id}/logout-device/`, { schema: logoutDeviceResponseSchema, json: {} });
}
