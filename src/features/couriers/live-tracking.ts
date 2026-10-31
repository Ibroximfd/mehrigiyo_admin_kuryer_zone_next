import { parseDate } from "@/lib/format";
import type { LatLng } from "@/lib/maps";
import { asArray, asBool, asOptionalNumber, asOptionalString, isRecord } from "@/lib/parse";


/**
 * Kuryerni real vaqtda kuzatish (`HUDUD_BACKEND_TALABLAR_3.md` §7).
 *
 * Sof modul: mapperlar, yangilik darajasi, ogohlantirish yorliqlari, kun izi.
 * Xarita va kartalar shu yerdagi qoidalardan foydalanadi — rang va matn
 * bir joyda hisoblanadi, test ham shu yerda.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Ogohlantirishlar
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Server hisoblaydigan belgilar (§7.2, `HUDUD_JAVOBLAR_4` §3 — fon ishlashi:
 * `battery_restricted`, `autostart_off`) + yetkazish isbotidagi
 * `far_from_address`.
 */
export const COURIER_ALERTS = [
  "permission_denied",
  "gps_off",
  "battery_restricted",
  "autostart_off",
  "app_killed",
  "stale",
  "mock_location",
  "far_from_address",
] as const;

export type CourierAlert = (typeof COURIER_ALERTS)[number];

function isCourierAlert(value: string): value is CourierAlert {
  return (COURIER_ALERTS as readonly string[]).includes(value);
}

/** Noma'lum belgilar tashlab yuboriladi — eski frontend yangi serverda sinmaydi. */
export function mapCourierAlerts(raw: unknown): CourierAlert[] {
  const seen = new Set<CourierAlert>();
  for (const item of asArray(raw)) {
    const code = asOptionalString(item);
    if (code && isCourierAlert(code)) seen.add(code);
  }
  return [...seen];
}

// ─────────────────────────────────────────────────────────────────────────────
// Joylashuv nuqtasi
// ─────────────────────────────────────────────────────────────────────────────

export type LivePoint = LatLng & {
  at: Date | null;
  /** Metr; server bermasa `null`. */
  accuracy: number | null;
  /** m/s. */
  speed: number | null;
  /** Gradus, 0 — shimol. */
  heading: number | null;
  isMock: boolean;
};

export function mapLivePoint(raw: unknown): LivePoint | null {
  if (!isRecord(raw)) return null;
  const lat = asOptionalNumber(raw.lat);
  const lng = asOptionalNumber(raw.lng);
  if (lat === null || lng === null) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return {
    lat,
    lng,
    at: parseDate(asOptionalString(raw.at)),
    accuracy: asOptionalNumber(raw.accuracy),
    speed: asOptionalNumber(raw.speed),
    heading: normalizeHeading(asOptionalNumber(raw.heading)),
    isMock: asBool(raw.is_mock),
  };
}

/** `heading` 0–360 oralig'ida; manfiy yoki ma'nosiz qiymat — `null`. */
export function normalizeHeading(value: number | null): number | null {
  if (value === null || !Number.isFinite(value) || value < 0) return null;
  return value % 360;
}

/**
 * Batareya: ilova `0.63` (ulush) yuboradi, server `63` (foiz) qaytarishi
 * mumkin — ikkalasi ham foizga keltiriladi.
 */
export function normalizeBattery(raw: unknown): number | null {
  const value = asOptionalNumber(raw);
  if (value === null || value < 0) return null;
  const percent = value <= 1 ? value * 100 : value;
  if (percent > 100) return null;
  return Math.round(percent);
}

// ─────────────────────────────────────────────────────────────────────────────
// Jonli kuryer (`GET couriers/live/`)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// So'rov: hudud filtri, smenadan tashqaridagilar, jadal rejim
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Yangilik darajasi — marker rangi
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Matnlar
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// WS `courier_location` — kesh yamog'i
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Kun izi (`GET couriers/{id}/track/`)
// ─────────────────────────────────────────────────────────────────────────────
