import { parseDate } from "@/lib/format";
import { distanceMeters } from "@/lib/maps";
import type { LatLng } from "@/lib/maps";
import {
  asArray,
  asBool,
  asInt,
  asOptionalBool,
  asOptionalInt,
  asOptionalNumber,
  asOptionalString,
  asRecord,
  asString,
  isRecord,
} from "@/lib/parse";

import { mapCourierAvatar } from "./avatar";
import type { CourierAvatar } from "./avatar";
import type { Courier } from "./types";

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

const ALERT_LABELS: Record<CourierAlert, string> = {
  gps_off: "GPS o'chiq",
  permission_denied: "Joylashuvga ruxsat yo'q",
  battery_restricted: "Batareya cheklovi yoqiq",
  autostart_off: "Autostart o'chiq",
  stale: "Joylashuv eskirgan",
  mock_location: "Soxta GPS",
  app_killed: "Ilova yopilgan",
  far_from_address: "Manzildan uzoqda yetkazgan",
};

export function alertLabel(alert: CourierAlert): string {
  return ALERT_LABELS[alert];
}

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

/** Aldov belgilari — marker qizil bo'ladi, yangilikdan qat'i nazar. */
export function hasFraudAlert(alerts: readonly CourierAlert[]): boolean {
  return alerts.includes("mock_location") || alerts.includes("far_from_address");
}

/** Belgi rangi: aldov — `danger`, qolgani (ruxsat, GPS, fon ishlashi) — `warn`. */
export type AlertTone = "danger" | "warn";

export function alertTone(alert: CourierAlert): AlertTone {
  return hasFraudAlert([alert]) ? "danger" : "warn";
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

export type LiveOrder = {
  id: string;
  orderNumber: string;
  addressText: string;
  point: LatLng | null;
};

export type LiveCourier = {
  id: number;
  fullName: string;
  phone: string;
  /** Profil rasmi (§8); `null` — bosh harflar. */
  avatar: CourierAvatar | null;
  onShift: boolean;
  lastLocation: LivePoint | null;
  lastHeartbeatAt: Date | null;
  /** Foiz (0–100) yoki `null`. */
  battery: number | null;
  locationPermission: string | null;
  gpsEnabled: boolean | null;
  currentOrder: LiveOrder | null;
  /** `codTotal` — bugun yig'ilgan naqd (so'm); server bermasa `null`. */
  today: { assigned: number; delivered: number; codTotal: number | null };
  alerts: CourierAlert[];
  /** Zona nomlari — qidiruv uchun; server bermasa `[]`. */
  zones: string[];
};

export function mapLiveOrder(raw: unknown): LiveOrder | null {
  if (!isRecord(raw)) return null;
  const id = asOptionalString(raw.id);
  if (!id) return null;
  const lat = asOptionalNumber(raw.lat);
  const lng = asOptionalNumber(raw.lng);
  return {
    id,
    orderNumber: asString(raw.order_number),
    addressText: asString(raw.address_text ?? raw.address),
    point: lat !== null && lng !== null ? { lat, lng } : null,
  };
}

export function mapLiveCourier(raw: unknown): LiveCourier {
  const json = asRecord(raw);
  const today = asRecord(json.today);
  return {
    id: asInt(json.id),
    fullName: asString(json.full_name ?? json.name),
    phone: asString(json.phone),
    avatar: mapCourierAvatar(json.avatar),
    onShift: asBool(json.on_shift),
    lastLocation: mapLivePoint(json.last_location),
    lastHeartbeatAt: parseDate(asOptionalString(json.last_heartbeat_at)),
    battery: normalizeBattery(json.battery),
    locationPermission: asOptionalString(json.location_permission),
    gpsEnabled: asOptionalBool(json.gps_enabled),
    currentOrder: mapLiveOrder(json.current_order),
    today: {
      assigned: asInt(today.assigned),
      delivered: asInt(today.delivered),
      codTotal: asOptionalNumber(today.cod_total),
    },
    alerts: mapCourierAlerts(json.alerts),
    zones: asArray(json.zones)
      .map((zone) => (isRecord(zone) ? asString(zone.name) : asString(zone)))
      .filter(Boolean),
  };
}

/**
 * `couriers/live/` hali yo'q bo'lsa — oddiy ro'yxatdan (`?on_shift=true`)
 * yig'iladi. Joriy buyurtma faqat `id` bilan ma'lum, manzil va nuqta yo'q.
 */
export function liveCourierFromCourier(courier: Courier): LiveCourier {
  const { live } = courier;
  return {
    id: courier.id,
    fullName: courier.fullName,
    phone: courier.phone,
    avatar: courier.avatar,
    onShift: live.onShift,
    lastLocation: live.lastLocation,
    lastHeartbeatAt: live.lastHeartbeatAt,
    battery: live.battery,
    locationPermission: null,
    gpsEnabled: null,
    currentOrder: live.currentOrderId
      ? { id: live.currentOrderId, orderNumber: "", addressText: "", point: null }
      : null,
    today: {
      assigned: courier.today.assigned,
      delivered: courier.today.delivered,
      codTotal: courier.today.codTotal,
    },
    alerts: live.alerts,
    zones: courier.zones.map((zone) => zone.name),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// So'rov: hudud filtri, smenadan tashqaridagilar, jadal rejim
// ─────────────────────────────────────────────────────────────────────────────

/** Sahifadagi Viloyat · Zona · Tuman filtri + "Smenadan tashqaridagilar ham". */
export type LiveFilter = {
  region: string | null;
  zoneIds: readonly number[] | null;
  districts: readonly string[] | null;
  /** `?all=1` — smenada bo'lmaganlar ham (sukut — faqat smenadagilar). */
  includeOffShift: boolean;
};

export const EMPTY_LIVE_FILTER: LiveFilter = {
  region: null,
  zoneIds: null,
  districts: null,
  includeOffShift: false,
};

/** So'rov kaliti va qatori — bo'sh qiymat `null` (yuborilmaydi). */
export type LiveParams = {
  zone: string | null;
  region: string | null;
  district: string | null;
  all: "1" | null;
};

/** `GET couriers/live/?zone=&region=&district=&all=1` (`HUDUD_3` javobi §7.3). */
export function liveCouriersParams(filter: LiveFilter): LiveParams {
  return {
    zone: filter.zoneIds?.length ? filter.zoneIds.join(",") : null,
    region: filter.region?.trim() || null,
    district: filter.districts?.length ? filter.districts.join(",") : null,
    all: filter.includeOffShift ? "1" : null,
  };
}

/** Hudud bilan toraytirilganmi — ro'yxatda yo'q kuryer shu hududdan tashqarida bo'lishi mumkin. */
export function isLiveNarrowed(params: Partial<LiveParams>): boolean {
  return Boolean(params.zone || params.region || params.district);
}

/**
 * Har bir `couriers/live/` so'rovi filial kuryerlarini 60 s ga "jadal rejim"
 * (10 s da nuqta) ga o'tkazadi; so'rov arzon (kuryer soniga bog'liq emas).
 * Xarita ko'rinib turganda 30 s da so'raladi — kuryerlar jadal rejimdan
 * tushmaydi; WS `courier_location` bilan birga ishlaydi.
 */
export const LIVE_INTENSE_POLL_MS = 30_000;
/** Xarita yopiq yoki tab yashirin — so'rov yo'q (jadal rejim o'z-o'zidan tushadi). */
export function liveRefetchInterval(state: {
  mapOpen: boolean;
  documentVisible: boolean;
}): number | false {
  return state.mapOpen && state.documentVisible ? LIVE_INTENSE_POLL_MS : false;
}

/** Bo'sh xarita matni — filtrga qarab, "smenada yo'q" noto'g'ri aytilmasin. */
export function liveEmptyText(params: Partial<LiveParams>): string {
  const narrowed = isLiveNarrowed(params);
  if (params.all === "1") return narrowed ? "Bu hududda kuryer yo'q" : "Kuryer topilmadi";
  return narrowed ? "Bu hududda smenada kuryer yo'q" : "Hozir smenada kuryer yo'q";
}

// ─────────────────────────────────────────────────────────────────────────────
// Yangilik darajasi — marker rangi
// ─────────────────────────────────────────────────────────────────────────────

export const FRESH_MS = 60_000;
export const AGING_MS = 5 * 60_000;

/** Yashil · sariq · kulrang ("aloqa yo'q"). */
export type Freshness = "fresh" | "aging" | "lost";

export function freshness(at: Date | null, now: Date): Freshness {
  if (!at) return "lost";
  const age = now.getTime() - at.getTime();
  if (age < FRESH_MS) return "fresh";
  if (age < AGING_MS) return "aging";
  return "lost";
}

/** Marker rangi: aldov belgisi hamma narsadan ustun. */
export type MarkerTone = Freshness | "alert";

export function markerTone(
  courier: Pick<LiveCourier, "alerts" | "lastLocation">,
  now: Date,
): MarkerTone {
  if (hasFraudAlert(courier.alerts)) return "alert";
  return freshness(courier.lastLocation?.at ?? null, now);
}

/** Strelka faqat harakatda (> 1 m/s) — turgan kuryerda nuqta. */
export const MOVING_SPEED_MPS = 1;

export function isMoving(speed: number | null): boolean {
  return speed !== null && speed > MOVING_SPEED_MPS;
}

// ─────────────────────────────────────────────────────────────────────────────
// Matnlar
// ─────────────────────────────────────────────────────────────────────────────

/** `45 soniya oldin` · `3 daqiqa oldin` · `2 soat oldin` — `now` test uchun. */
export function formatAgo(at: Date, now: Date): string {
  const seconds = Math.max(0, Math.round((now.getTime() - at.getTime()) / 1000));
  if (seconds < 60) return `${seconds} soniya oldin`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} daqiqa oldin`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} soat oldin`;
  return `${Math.floor(hours / 24)} kun oldin`;
}

/** m/s → `12 km/soat`. */
export function formatSpeed(speedMps: number): string {
  return `${Math.round(speedMps * 3.6)} km/soat`;
}

export function formatBattery(percent: number): string {
  return `${percent}%`;
}

/**
 * Kartadagi mini-holat: `2 daqiqa oldin · 12 km/soat · 63%`. Bo'lmagan
 * qiymat tashlab yuboriladi; hech narsa bo'lmasa `null`.
 */
export function miniStatusLine(
  live: { lastLocation: LivePoint | null; battery: number | null },
  now: Date,
): string | null {
  const parts: string[] = [];
  const point = live.lastLocation;
  if (point?.at) parts.push(formatAgo(point.at, now));
  if (point && isMoving(point.speed) && point.speed !== null) {
    parts.push(formatSpeed(point.speed));
  }
  if (live.battery !== null) parts.push(formatBattery(live.battery));
  return parts.length ? parts.join(" · ") : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// WS `courier_location` — kesh yamog'i
// ─────────────────────────────────────────────────────────────────────────────

export type CourierLocationEvent = {
  courierId: number;
  point: LivePoint;
  onShift: boolean | null;
  battery: number | null;
};

export function mapCourierLocationEvent(raw: unknown): CourierLocationEvent | null {
  if (!isRecord(raw)) return null;
  const courierId = asOptionalInt(raw.courier_id);
  const point = mapLivePoint(raw);
  if (courierId === null || !point) return null;
  return {
    courierId,
    point,
    onShift: asOptionalBool(raw.on_shift),
    battery: normalizeBattery(raw.battery),
  };
}

/**
 * Jonli ro'yxatga hodisani qo'llaydi.
 *
 * Smenadan chiqqan kuryer ro'yxatdan tushadi (`keepOffShift` — `?all=1`
 * ro'yxatida qoladi). Ro'yxatda yo'q kuryer
 * (yangi smena ochdi) qo'shilmaydi — ism-telefoni hodisada yo'q, buni
 * chaqiruvchi qayta so'rov bilan hal qiladi (`applied: false`).
 */
export function applyLocationToLiveList(
  list: readonly LiveCourier[],
  event: CourierLocationEvent,
  options: { keepOffShift?: boolean } = {},
): { list: LiveCourier[]; applied: boolean } {
  const index = list.findIndex((courier) => courier.id === event.courierId);
  if (index === -1) return { list: [...list], applied: false };

  // `?all=1` ro'yxatida smenadan chiqqan kuryer qoladi — faqat belgisi o'zgaradi.
  if (event.onShift === false && !options.keepOffShift) {
    return { list: list.filter((courier) => courier.id !== event.courierId), applied: true };
  }

  const current = list[index];
  if (!current) return { list: [...list], applied: false };
  // Eskiroq nuqta (tartibsiz yetib kelgan) joriyini bosib ketmasin.
  if (isOlderPoint(event.point, current.lastLocation)) {
    return { list: [...list], applied: true };
  }

  const next: LiveCourier = {
    ...current,
    onShift: event.onShift ?? current.onShift,
    lastLocation: event.point,
    lastHeartbeatAt: event.point.at ?? current.lastHeartbeatAt,
    battery: event.battery ?? current.battery,
    alerts: event.point.isMock
      ? [...new Set<CourierAlert>([...current.alerts, "mock_location"])]
      : current.alerts.filter((alert) => alert !== "stale" && alert !== "app_killed"),
  };
  const copy = [...list];
  copy[index] = next;
  return { list: copy, applied: true };
}

function isOlderPoint(incoming: LivePoint, current: LivePoint | null): boolean {
  if (!current?.at || !incoming.at) return false;
  return incoming.at.getTime() < current.at.getTime();
}

// ─────────────────────────────────────────────────────────────────────────────
// Kun izi (`GET couriers/{id}/track/`)
// ─────────────────────────────────────────────────────────────────────────────

export type TrackPoint = LatLng & {
  at: Date | null;
  speed: number | null;
  accuracy: number | null;
  isMock: boolean;
};

export type TrackStop = LatLng & {
  from: Date | null;
  to: Date | null;
  durationS: number;
};

export type CourierTrack = {
  points: TrackPoint[];
  /** Server hisoblagan umumiy masofa, metr. */
  totalM: number;
  stops: TrackStop[];
};

export function mapCourierTrack(raw: unknown): CourierTrack {
  const json = asRecord(raw);
  const points = asArray(json.points)
    .map(mapTrackPoint)
    .filter((point): point is TrackPoint => point !== null);
  return {
    points,
    totalM: asOptionalNumber(json.total_m) ?? pathLengthM(points),
    stops: asArray(json.stops)
      .map(mapTrackStop)
      .filter((stop): stop is TrackStop => stop !== null),
  };
}

function mapTrackPoint(raw: unknown): TrackPoint | null {
  if (!isRecord(raw)) return null;
  const lat = asOptionalNumber(raw.lat);
  const lng = asOptionalNumber(raw.lng);
  if (lat === null || lng === null) return null;
  return {
    lat,
    lng,
    at: parseDate(asOptionalString(raw.at)),
    speed: asOptionalNumber(raw.speed),
    accuracy: asOptionalNumber(raw.accuracy),
    isMock: asBool(raw.is_mock),
  };
}

function mapTrackStop(raw: unknown): TrackStop | null {
  if (!isRecord(raw)) return null;
  const lat = asOptionalNumber(raw.lat);
  const lng = asOptionalNumber(raw.lng);
  if (lat === null || lng === null) return null;
  return {
    lat,
    lng,
    from: parseDate(asOptionalString(raw.from)),
    to: parseDate(asOptionalString(raw.to)),
    durationS: asInt(raw.duration_s),
  };
}

/** Server `total_m` bermasa — nuqtalar bo'ylab to'g'ri chiziqlar yig'indisi. */
export function pathLengthM(points: readonly LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const next = points[i];
    if (prev && next) total += distanceMeters(prev, next);
  }
  return Math.round(total);
}

/** To'xtash davomiyligi: `4 daqiqa` · `1 soat 12 daqiqa`. */
export function formatStopDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} daqiqa`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} soat ${rest} daqiqa` : `${hours} soat`;
}
