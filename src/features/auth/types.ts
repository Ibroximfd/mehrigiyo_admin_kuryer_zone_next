import {
  asBool,
  asOptionalInt,
  asOptionalNumber,
  asOptionalString,
  asRecord,
  asString,
  firstString,
} from "@/lib/parse";

/**
 * Foydalanuvchi profili. Rol shu yerda hal bo'ladi (`BACKEND-LOGIST.md` §1):
 * login javobida `role` maydoni keladi; eski backendda u yo'q — `is_admin`
 * dan taxmin qilinadi.
 */
export type OperatorRole = "logist" | "admin" | "seller";

export type CurrentUser = {
  id: string;
  name: string;
  username: string | null;
  /** Filial admini (CRM) — kuryer akkaunt huquqi EMAS, u `isStaff`. */
  isAdmin: boolean;
  /**
   * Platforma admini (backend #10): login javobida yuqori darajada va
   * `operator.is_staff`. Kuryer akkaunt tugmalari (yaratish, parol,
   * o'chirish) faqat shunga bog'lanadi — logistga backend `403` beradi.
   * `isAdmin` dan farqli: u filial admini (CRM ma'nosi).
   */
  isStaff: boolean;
  role: OperatorRole;
  /** Backend `role` maydonini yuborganmi — qat'iy rejim shunga qaraydi. */
  roleFromServer: boolean;
  filialId: number | null;
  filialName: string | null;
  /** Filial viloyati — erkin matn (`filial.region`); bo'lmasa `null`. */
  filialRegion: string | null;
  /** Filial viloyat kodi (`filial.region_code`, masalan `fargona`) — hudud sukuti uchun. */
  filialRegionCode: string | null;
  /** Filial deposi (`filial.lat/lng`); admin to'ldirmaguncha `null`. */
  filialLocation: { lat: number; lng: number } | null;
};

/** Hudud filtri sukuti: kod ustun, bo'lmasa erkin matn (eski backend). */
export function preferredRegionOf(
  user: Pick<CurrentUser, "filialRegion" | "filialRegionCode"> | null,
): string | null {
  return user?.filialRegionCode ?? user?.filialRegion ?? null;
}

/** `{lat, lng}` — ikkalasi son bo'lsa; aks holda `null`. */
export function asLocation(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  const latitude = asOptionalNumber(lat);
  const longitude = asOptionalNumber(lng);
  return latitude !== null && longitude !== null ? { lat: latitude, lng: longitude } : null;
}

export type LoginResult = {
  user: CurrentUser;
  access: string;
  refresh: string | null;
};

/** Xom satrni ma'lum rollardan biriga keltiradi; notanishi `null`. */
export function asRole(value: unknown): OperatorRole | null {
  const text = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (text === "logist" || text === "admin" || text === "seller") return text;
  return null;
}

/**
 * Operator login javobi (backend §1):
 * {
 *   "access": "...", "refresh": "...", "is_admin": false, "is_staff": false,
 *   "role": "logist",
 *   "operator": { "id": 12, "full_name": "...", "username": "...", "is_staff": false },
 *   "filial": { "id": 3, "name": "Toshkent", "region": "Toshkent",
 *               "region_code": "toshkent_shahar", "lat": 41.3, "lng": 69.2 }
 * }
 * `region_code`, `lat`, `lng` — backend A3 (2026-10-16); eski javobda yo'q.
 *
 * `role` bo'lmasa (eski backend): `is_admin=true` → admin, aks holda
 * vaqtincha logist deb qabul qilinadi — qat'iy tekshiruv
 * `NEXT_PUBLIC_ROLE_STRICT=1` yoqilganda `roleFromServer` orqali ishlaydi.
 */
/**
 * Eski support tizimi javobi (zaxira kirish):
 * { "access": "...", "refresh": "...",
 *   "operator": { "id": 3, "phone": "998...", "full_name": "..." } }
 *
 * Filial ham, rol ham kelmaydi — foydalanuvchi yumshoq rejimda logist deb
 * qabul qilinadi (qat'iy rejimda bunday sessiya kirmaydi).
 */
export function mapSupportLoginResponse(raw: unknown): LoginResult {
  const json = asRecord(raw);
  const operator = asRecord(json.operator);
  const phone = asOptionalString(operator.phone);

  return {
    access: asString(json.access),
    refresh: asOptionalString(json.refresh),
    user: {
      id: asString(operator.id ?? operator.user_id),
      name: firstString(operator.full_name, operator.name) || phone || "Logist",
      username: phone,
      isAdmin: false,
      isStaff: false,
      role: "logist",
      roleFromServer: false,
      filialId: null,
      filialName: null,
      filialRegion: null,
      filialRegionCode: null,
      filialLocation: null,
    },
  };
}

export function mapLoginResponse(raw: unknown): LoginResult {
  const json = asRecord(raw);
  const operator = asRecord(json.operator);
  const filial = asRecord(json.filial);

  const isAdmin = asBool(json.is_admin) || asBool(operator.is_admin);
  const serverRole =
    asRole(json.role) ??
    asRole(operator.role) ??
    (asBool(json.is_logist) || asBool(operator.is_logist) ? "logist" : null);

  return {
    access: asString(json.access),
    refresh: asOptionalString(json.refresh),
    user: {
      id: asString(operator.id),
      name: firstString(operator.full_name, operator.name),
      username: asOptionalString(operator.username),
      isAdmin,
      isStaff: asBool(json.is_staff) || asBool(operator.is_staff),
      role: serverRole ?? (isAdmin ? "admin" : "logist"),
      roleFromServer: serverRole !== null,
      filialId: asOptionalInt(filial.id ?? operator.filial),
      filialName: asOptionalString(filial.name ?? operator.filial_name),
      filialRegion: asOptionalString(filial.region ?? operator.filial_region),
      filialRegionCode: asOptionalString(filial.region_code),
      filialLocation: asLocation(filial.lat, filial.lng),
    },
  };
}
