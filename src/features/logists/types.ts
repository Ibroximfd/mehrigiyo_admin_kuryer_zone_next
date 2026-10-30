import { parseDate } from "@/lib/format";
import { asArray, asBool, asInt, asOptionalInt, asOptionalString, asRecord, asString, isRecord } from "@/lib/parse";

/**
 * Logistlar — tuzilma daraxtidagi logist o'rinlari (backend B2 §E).
 * Akkaunt = o'rin; rol — `logist` (filial) yoki `chief_logist` (hammasi),
 * ustiga qo'shimcha dopusklar.
 */
export type StaffRole = {
  id: number;
  role: string;
  scopeKind: string;
  scopeId: string;
  permissions: string[];
  effectivePermissions: string[];
  since: Date | null;
  until: Date | null;
  grantedBy: string | null;
};

export type LogistSeat = {
  id: number;
  username: string;
  fullName: string;
  filialId: number | null;
  isActive: boolean;
  isLogist: boolean;
  roles: StaffRole[];
};

export type LogistFilial = { id: number; name: string; logists: LogistSeat[] };

export type LogistTree = { meRoles: StaffRole[]; filials: LogistFilial[] };

export type MyPermissions = { roles: StaffRole[]; permissions: Record<string, boolean> };

export const LOGIST_ROLE_KEYS = ["logist", "chief_logist"] as const;

const ROLE_LABELS: Record<string, string> = {
  logist: "Logist",
  chief_logist: "Bosh logist",
  chief_courier: "Bosh kuryer",
  seller: "Operator",
  department_admin: "Bo'lim admini",
  zone_admin: "Bosh admin",
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

function strings(value: unknown): string[] {
  return asArray(value).flatMap((item) => (typeof item === "string" && item ? [item] : []));
}

export function mapStaffRole(raw: unknown): StaffRole {
  const json = asRecord(raw);
  const by = json.granted_by;
  return {
    id: asInt(json.id),
    role: asString(json.role),
    scopeKind: asString(json.scope_kind),
    scopeId: asString(json.scope_id),
    permissions: strings(json.permissions),
    effectivePermissions: strings(json.effective_permissions),
    since: parseDate(json.since),
    until: parseDate(json.until),
    grantedBy: isRecord(by) ? asOptionalString(by.full_name) : asOptionalString(by),
  };
}

function mapSeat(raw: unknown): LogistSeat {
  const json = asRecord(raw);
  const occupant = isRecord(json.occupant) ? json.occupant : null;
  return {
    id: asInt(json.id),
    username: asString(json.username),
    fullName: (occupant ? asString(occupant.full_name) : "") || asString(json.full_name),
    filialId: asOptionalInt(json.filial_id),
    isActive: asBool(json.is_active, true),
    isLogist: asBool(json.is_logist),
    roles: asArray(json.roles).map(mapStaffRole),
  };
}

/** Ochiq (muddati o'tmagan) rollar. */
export function activeRoles(roles: readonly StaffRole[], now: Date = new Date()): StaffRole[] {
  return roles.filter((role) => role.until === null || role.until.getTime() > now.getTime());
}

function isLogistSeat(seat: LogistSeat): boolean {
  return seat.isLogist || activeRoles(seat.roles).some((role) => role.role === "logist" || role.role === "chief_logist");
}

/**
 * Daraxtdan logistlarni yig'adi: bo'limlardagi va bo'limsiz o'rinlar,
 * id bo'yicha takrorsiz. Logisti yo'q filial ham qoladi (ochish uchun).
 */
export function mapLogistTree(raw: unknown): LogistTree {
  const json = asRecord(raw);
  const me = asRecord(json.me);
  return {
    meRoles: asArray(me.roles).map(mapStaffRole),
    filials: asArray(json.filials).map((item) => {
      const filial = asRecord(item);
      const id = asInt(filial.id);
      const seats = [
        ...asArray(filial.departments).flatMap((department) => asArray(asRecord(department).seats)),
        ...asArray(filial.unassigned_seats),
      ].map(mapSeat);
      const seen = new Set<number>();
      const logists = seats
        .filter((seat) => isLogistSeat(seat) && !seen.has(seat.id) && Boolean(seen.add(seat.id)))
        .map((seat) => ({ ...seat, filialId: seat.filialId ?? id }))
        .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.fullName.localeCompare(b.fullName));
      return { id, name: asString(filial.name), logists };
    }),
  };
}

export function mapMyPermissions(raw: unknown): MyPermissions {
  const json = asRecord(raw);
  const permissions: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(asRecord(json.permissions))) permissions[key] = value === true;
  return { roles: asArray(json.roles).map(mapStaffRole), permissions };
}

/** Dopusk bormi — faqat aniq `true`; yuklanmagan yoki noma'lum — yo'q. */
export function can(permissions: MyPermissions | null | undefined, key: string): boolean {
  return permissions?.permissions[key] === true;
}

/** Logist sukuti va bosh logist sukuti (B2 §0). */
const LOGIST_DEFAULTS = ["orders.manage", "orders.dispatch", "addresses.adjust", "chat.join_any"];
const ROLE_DEFAULTS: Record<string, readonly string[]> = {
  logist: LOGIST_DEFAULTS,
  chief_logist: [
    ...LOGIST_DEFAULTS,
    "cash.accept",
    "cash.collect_from_chiefs",
    "couriers.manage",
    "zones.manage",
    "logist.create",
    "logist.grant",
    "warehouse.view_courier_stores",
    "view.other_filials",
    "view.finance",
    "view.analytics",
    "view.ai",
  ],
};

export function isRoleDefault(role: string, key: string): boolean {
  return (ROLE_DEFAULTS[role] ?? []).includes(key);
}

export type PermissionInfo = { key: string; label: string };

const LABELS: Record<string, string> = {
  "orders.manage": "Zakazlarni boshqarish",
  "orders.dispatch": "Zakazni yo'lga chiqarish",
  "addresses.adjust": "Kuryer manzil sonini o'zgartirish",
  "chat.join_any": "Istalgan zakaz chatiga kirish",
  "cash.accept": "Pul qabul qilish",
  "cash.collect_from_chiefs": "Bosh kuryerlardan pul yig'ish",
  "couriers.manage": "Kuryerlarni boshqarish",
  "zones.manage": "Zonalarni boshqarish",
  "logist.create": "Logist ochish",
  "logist.grant": "Logist rollarini berish",
  "warehouse.view_courier_stores": "Kuryer omborlarini ko'rish",
  "view.other_filials": "Boshqa filiallar",
  "view.finance": "Moliya",
  "view.analytics": "Analitika",
  "view.ai": "AI tahlil",
};

/** Logistga tegishli kalitlar (katalogdan shu prefikslar olinadi). */
const LOGIST_PREFIXES = ["orders.", "addresses.", "chat.", "cash.", "couriers.", "zones.", "logist.", "warehouse.", "view."];

export function permissionLabel(key: string): string {
  return LABELS[key] ?? key;
}

/**
 * Katalog (`structure/permissions/`) — shakli hujjatda yo'q: ro'yxat,
 * `{key, label}` qatorlar yoki lug'at. Logist sahifasida faqat logistikaga
 * oid kalitlar ko'rsatiladi; server bermasa — ma'lum kalitlar.
 */
export function mapPermissionCatalog(raw: unknown): PermissionInfo[] {
  const json = asRecord(raw);
  const source = Array.isArray(raw) ? raw : (json.results ?? json.permissions ?? json.catalog ?? raw);
  const keys: Array<[string, string | null]> = [];
  if (Array.isArray(source)) {
    for (const item of source) {
      if (typeof item === "string") keys.push([item, null]);
      else if (isRecord(item)) keys.push([asString(item.key ?? item.code), asOptionalString(item.label ?? item.label_uz)]);
    }
  } else if (isRecord(source)) {
    for (const [key, value] of Object.entries(source)) keys.push([key, typeof value === "string" ? value : null]);
  }
  const seen = new Set<string>();
  return keys
    .filter(([key]) => key && LOGIST_PREFIXES.some((prefix) => key.startsWith(prefix)))
    .filter(([key]) => !seen.has(key) && Boolean(seen.add(key)))
    .map(([key, label]) => ({ key, label: label || permissionLabel(key) }));
}

export const KNOWN_PERMISSIONS: PermissionInfo[] = Object.keys(LABELS).map((key) => ({ key, label: LABELS[key]! }));

export function hasAllScope(roles: ReadonlyArray<{ scopeKind: string }>): boolean {
  return roles.some((role) => role.scopeKind === "all");
}
