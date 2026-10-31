/**
 * Sessiya `localStorage` da saqlanadi — CRM bilan bir xil mantiq.
 *
 * Operator API'da profil endpointi yo'q: login javobidagi ma'lumot to'liq
 * saqlanadi va sahifa yangilanganda o'shandan tiklanadi.
 */

export type StoredSession = {
  token: string;
  refreshToken: string | null;
  id: string;
  name: string;
  username: string | null;
  isAdmin: boolean;
  /** Django `is_staff` — kuryer akkaunti amallari uchun. */
  isStaff: boolean;
  /** Server roli: bosh kuryer saytida `"chief_courier"`. Eski javobda bo'lmaydi. */
  role: string | null;
  filialId: number | null;
  filialName: string | null;
  filialRegion: string | null;
  /** Backend A3: viloyat kodi va depo koordinatasi; eski javobda yo'q. */
  filialRegionCode: string | null;
  filialLocation: { lat: number; lng: number } | null;
};

const KEYS = {
  token: "auth_token",
  refresh: "operator_refresh",
  id: "operator_id",
  name: "operator_name",
  username: "operator_phone",
  isAdmin: "operator_is_admin",
  isStaff: "operator_is_staff",
  role: "operator_role",
  filialId: "operator_filial_id",
  filialName: "operator_filial_name",
  filialRegion: "operator_filial_region",
  filialRegionCode: "operator_filial_region_code",
  filialLat: "operator_filial_lat",
  filialLng: "operator_filial_lng",
} as const;

function readNumber(key: string): number | null {
  const raw = read(key);
  if (raw === null || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function read(key: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

function write(key: string, value: string | null | undefined) {
  if (typeof window === "undefined") return;
  if (value === null || value === undefined || value === "") {
    window.localStorage.removeItem(key);
  } else {
    window.localStorage.setItem(key, value);
  }
}

function readLocation(): { lat: number; lng: number } | null {
  const lat = readNumber(KEYS.filialLat);
  const lng = readNumber(KEYS.filialLng);
  return lat !== null && lng !== null ? { lat, lng } : null;
}

export const sessionStorage = {
  get accessToken(): string | null {
    return read(KEYS.token);
  },

  get refreshToken(): string | null {
    return read(KEYS.refresh);
  },

  get canRefresh(): boolean {
    return Boolean(read(KEYS.refresh));
  },

  /** Saqlangan sessiyani to'liq o'qiydi; token bo'lmasa `null`. */
  read(): StoredSession | null {
    const token = read(KEYS.token);
    if (!token) return null;

    const filialId = read(KEYS.filialId);

    return {
      token,
      refreshToken: read(KEYS.refresh),
      id: read(KEYS.id) ?? "",
      name: read(KEYS.name) ?? "",
      username: read(KEYS.username),
      isAdmin: read(KEYS.isAdmin) === "true",
      isStaff: read(KEYS.isStaff) === "true",
      role: read(KEYS.role),
      filialId: filialId ? Number(filialId) : null,
      filialName: read(KEYS.filialName),
      filialRegion: read(KEYS.filialRegion),
      filialRegionCode: read(KEYS.filialRegionCode),
      filialLocation: readLocation(),
    };
  },

  save(session: StoredSession) {
    write(KEYS.token, session.token);
    write(KEYS.refresh, session.refreshToken);
    write(KEYS.id, session.id);
    write(KEYS.name, session.name);
    write(KEYS.username, session.username);
    write(KEYS.isAdmin, String(session.isAdmin));
    write(KEYS.isStaff, String(session.isStaff));
    write(KEYS.role, session.role);
    write(KEYS.filialId, session.filialId?.toString() ?? null);
    write(KEYS.filialName, session.filialName);
    write(KEYS.filialRegion, session.filialRegion);
    write(KEYS.filialRegionCode, session.filialRegionCode);
    write(KEYS.filialLat, session.filialLocation?.lat.toString() ?? null);
    write(KEYS.filialLng, session.filialLocation?.lng.toString() ?? null);
  },

  /** Refresh natijasida faqat tokenlar yangilanadi. */
  saveTokens({ access, refresh }: { access: string; refresh?: string | null }) {
    write(KEYS.token, access);
    if (refresh) write(KEYS.refresh, refresh);
  },

  clear() {
    if (typeof window === "undefined") return;
    for (const key of Object.values(KEYS)) {
      window.localStorage.removeItem(key);
    }
  },
};
