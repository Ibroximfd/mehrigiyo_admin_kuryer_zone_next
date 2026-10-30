import { api, errorCode, errorMessage } from "@/lib/api-client";
import { ENDPOINTS } from "@/lib/api-constants";
import { asOptionalString, asRecord, asString } from "@/lib/parse";

import { mapLogistTree, mapMyPermissions, mapPermissionCatalog, mapStaffRole } from "./types";
import type { LogistTree, MyPermissions, PermissionInfo, StaffRole } from "./types";

export async function fetchMyPermissions(signal?: AbortSignal): Promise<MyPermissions> {
  return mapMyPermissions(await api.get<unknown>(ENDPOINTS.myPermissions, { signal }));
}

export async function fetchLogistTree(signal?: AbortSignal): Promise<LogistTree> {
  return mapLogistTree(await api.get<unknown>(ENDPOINTS.structure, { signal }));
}

export async function fetchPermissionCatalog(signal?: AbortSignal): Promise<PermissionInfo[]> {
  return mapPermissionCatalog(await api.get<unknown>(ENDPOINTS.structurePermissions, { signal }));
}

/** Logist o'rni — server `logist` rolini va dopusklarni beradi; parol bir marta qaytadi. */
export async function createLogist(input: {
  filialId: number;
  fullName: string;
  username: string;
  password: string;
  permissions: string[];
}): Promise<{ seatId: number | null; username: string; password: string }> {
  const raw = await api.post<unknown>(ENDPOINTS.structureSeats, {
    json: {
      role: "logist",
      filial_id: input.filialId,
      full_name: input.fullName,
      username: input.username,
      password: input.password,
      permissions: input.permissions,
    },
  });
  const json = asRecord(raw);
  return {
    seatId: typeof json.id === "number" ? json.id : null,
    username: asString(json.username) || input.username,
    password: asOptionalString(json.password) ?? input.password,
  };
}

export async function grantRole(input: {
  seatId: number;
  role: string;
  scopeKind: string;
  scopeId: string;
  permissions: string[];
  until?: Date | null;
}): Promise<StaffRole> {
  const raw = await api.post<unknown>(ENDPOINTS.structureRoles, {
    json: {
      seat_id: input.seatId,
      role: input.role,
      scope_kind: input.scopeKind,
      scope_id: input.scopeId,
      permissions: input.permissions,
      ...(input.until ? { until: input.until.toISOString() } : {}),
    },
  });
  return mapStaffRole(raw);
}

/** Qator o'chmaydi — `until` qo'yiladi (tarix). */
export async function revokeRole(id: number): Promise<void> {
  await api.delete<unknown>(ENDPOINTS.structureRole(id));
}

/**
 * Dopusklarni o'zgartirish: rol PATCH hujjatda yo'q — yangi rol beriladi,
 * keyin eskisi yopiladi. Server o'sha qatorni qaytarsa (bir xil id) — yopilmaydi.
 */
export async function replaceRolePermissions(previous: StaffRole, seatId: number, permissions: string[]): Promise<StaffRole> {
  const next = await grantRole({
    seatId,
    role: previous.role,
    scopeKind: previous.scopeKind,
    scopeId: previous.scopeId,
    permissions,
    until: previous.until,
  });
  if (next.id !== previous.id) await revokeRole(previous.id);
  return next;
}

/** Bo'shatish + kirishni yopish (`seat.block`). */
export async function blockLogist(seatId: number): Promise<void> {
  await api.post<unknown>(ENDPOINTS.structureSeatVacate(seatId), { json: { block: true } });
}

const HINTS: Record<string, string> = {
  permission_denied: "Bu amalga ruxsatingiz yo'q — dopuskni bosh logist beradi",
  forbidden: "Bu amalga ruxsatingiz yo'q",
  seat_not_found: "O'rin topilmadi — sahifani yangilang",
  role_not_found: "Rol topilmadi — sahifani yangilang",
  filial_not_found: "Filial topilmadi — sahifani yangilang",
  invalid_role: "Noto'g'ri rol",
  invalid_scope: "Noto'g'ri qamrov",
  username_taken: "Bu login band — boshqasini tanlang",
};

export function logistsErrorMessage(error: unknown, fallback: string): string {
  const code = errorCode(error);
  return (code && HINTS[code]) || errorMessage(error, fallback);
}
