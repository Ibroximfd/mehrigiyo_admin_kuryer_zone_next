import { freshness, hasFraudAlert, isMoving } from "./live-tracking";
import type { Freshness, LiveCourier } from "./live-tracking";

/**
 * "Xarita" sahifasining sof qoidalari: hisoblagich chiplari va ular bilan
 * filtr, ro'yxat tartibi, ism yorliqlarining to'qnashuvi va eski
 * `/couriers?view=map` havolalarini yangi sahifaga o'tkazish.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Hisoblagichlar: "Smenada 12 · Harakatda 7 · Aloqa yo'q 2 · Smenadan tashqari 3"
// ─────────────────────────────────────────────────────────────────────────────

export const LIVE_STATUSES = ["shift", "moving", "lost", "offshift"] as const;
export type LiveStatus = (typeof LIVE_STATUSES)[number];

export type LiveCounters = Record<LiveStatus, number>;

/**
 * Sukut ro'yxatida (`all` yo'q) hamma smenada — server `on_shift` ni
 * bermasa ham shunday hisoblanadi.
 */
function onShift(courier: LiveCourier, includeOffShift: boolean): boolean {
  return includeOffShift ? courier.onShift : true;
}

/** Harakatda — tezlik > 1 m/s va nuqta eskirmagan (eski tezlik ma'nosiz). */
export function isCourierMoving(courier: LiveCourier, now: Date): boolean {
  const point = courier.lastLocation;
  if (!point || !isMoving(point.speed)) return false;
  return freshness(point.at, now) !== "lost";
}

/**
 * Smenadan tashqari — faqat "Smenadan tashqaridagilar ham" yoqilganda.
 * Ular xaritada ko'rinadi, demak hisoblagichda ham ko'rinishi shart:
 * aks holda xaritada kuryer turib, chiplar "0 · 0 · 0" deydi.
 */
function isOffShift(courier: LiveCourier, includeOffShift: boolean): boolean {
  return includeOffShift && !courier.onShift;
}

/** Aloqa yo'q — smenada, lekin 5 daqiqadan beri nuqta yo'q. */
function isLost(courier: LiveCourier, now: Date, includeOffShift: boolean): boolean {
  return onShift(courier, includeOffShift) && freshness(courier.lastLocation?.at ?? null, now) === "lost";
}

export function matchesLiveStatus(
  courier: LiveCourier,
  status: LiveStatus | null,
  now: Date,
  includeOffShift: boolean,
): boolean {
  switch (status) {
    case null:
      return true;
    case "shift":
      return onShift(courier, includeOffShift);
    case "moving":
      return isCourierMoving(courier, now);
    case "lost":
      return isLost(courier, now, includeOffShift);
    case "offshift":
      return isOffShift(courier, includeOffShift);
  }
}

export function liveCounters(
  couriers: readonly LiveCourier[],
  now: Date,
  includeOffShift: boolean,
): LiveCounters {
  const counters: LiveCounters = { shift: 0, moving: 0, lost: 0, offshift: 0 };
  for (const courier of couriers) {
    for (const status of LIVE_STATUSES) {
      if (matchesLiveStatus(courier, status, now, includeOffShift)) counters[status] += 1;
    }
  }
  return counters;
}

/** Ko'rinadigan chiplar: "Smenadan tashqari" — faqat ular ham so'ralganda. */
export function visibleLiveStatuses(includeOffShift: boolean): LiveStatus[] {
  return LIVE_STATUSES.filter((status) => status !== "offshift" || includeOffShift);
}

/**
 * URL qiymati (`?status=`) → holat; noma'lum — `null`. "Smenadan tashqari"
 * almashtirgich o'chiq bo'lsa ma'nosiz (ro'yxat bo'sh qolardi) — `null`.
 */
export function parseLiveStatus(value: string | null, includeOffShift = true): LiveStatus | null {
  if (!(LIVE_STATUSES as readonly string[]).includes(value ?? "")) return null;
  const status = value as LiveStatus;
  return visibleLiveStatuses(includeOffShift).includes(status) ? status : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ro'yxat tartibi
// ─────────────────────────────────────────────────────────────────────────────

const FRESHNESS_RANK: Record<Freshness, number> = { fresh: 0, aging: 1, lost: 2 };

/** Aldov belgisi → boshqa ogohlantirish → toza; keyin yangi nuqta oldinda. */
function alertRank(courier: LiveCourier): number {
  if (hasFraudAlert(courier.alerts)) return 0;
  return courier.alerts.length > 0 ? 1 : 2;
}

/**
 * Yon panel tartibi: e'tibor talab qiladiganlar tepada, keyin yangilik
 * (yashil → sariq → kulrang), keyin eng so'nggi nuqta, keyin ism.
 */
export function sortLiveCouriers(couriers: readonly LiveCourier[], now: Date): LiveCourier[] {
  const at = (courier: LiveCourier) => courier.lastLocation?.at?.getTime() ?? 0;
  return [...couriers].sort(
    (a, b) =>
      alertRank(a) - alertRank(b) ||
      FRESHNESS_RANK[freshness(a.lastLocation?.at ?? null, now)] -
        FRESHNESS_RANK[freshness(b.lastLocation?.at ?? null, now)] ||
      at(b) - at(a) ||
      a.fullName.localeCompare(b.fullName),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ism yorliqlari to'qnashuvi
// ─────────────────────────────────────────────────────────────────────────────

/** Ikki marker ekranda shundan yaqin bo'lsa — yorliqlar bir-birini yopadi. */
export const PILL_OVERLAP_PX = 20;

export type ScreenPoint = { id: number; x: number; y: number };
export type PillPlacement = "below" | "above";

/**
 * Oddiy yechim (klasterlash yo'q): yuqoridan pastga yuramiz; marker
 * yaqinidagi oldingi qo'shnining yorlig'i pastda bo'lsa — bunisi tepaga
 * chiqadi. Natija — faqat "tepa"ga chiqqanlar (qolgani sukut — past).
 */
export function pillPlacements(
  points: readonly ScreenPoint[],
  thresholdPx = PILL_OVERLAP_PX,
): Map<number, PillPlacement> {
  const sorted = [...points].sort((a, b) => a.y - b.y || a.x - b.x || a.id - b.id);
  const placement = new Map<number, PillPlacement>();
  sorted.forEach((point, index) => {
    let place: PillPlacement = "below";
    for (let j = index - 1; j >= 0; j -= 1) {
      const other = sorted[j];
      if (!other) continue;
      if (point.y - other.y > thresholdPx) break;
      const near = Math.hypot(point.x - other.x, point.y - other.y) < thresholdPx;
      if (near && placement.get(other.id) === "below") {
        place = "above";
        break;
      }
    }
    placement.set(point.id, place);
  });
  return placement;
}

// ─────────────────────────────────────────────────────────────────────────────
// Eski havolalar: `/couriers?view=map&track=…` → `/map?track=…`
// ─────────────────────────────────────────────────────────────────────────────

/** Xarita sahifasi tushunadigan parametrlar — qolganlari (`shift`, `view`) tashlanadi. */
export const MAP_PARAMS = ["track", "day", "offshift", "region", "zone", "district", "status"] as const;

/**
 * Kuryerlar sahifasi manzili → xarita sahifasi manzili. Ko'chirish faqat
 * `view=map` (eski "Jonli xarita" ochiq) yoki `track` (eski "Kun izi")
 * bo'lganda; aks holda `null` — sahifa o'z joyida qoladi.
 */
export function mapRedirectHref(
  mapPath: string,
  search: URLSearchParams,
): string | null {
  if (search.get("view") !== "map" && !search.get("track")) return null;
  const next = new URLSearchParams();
  for (const key of MAP_PARAMS) {
    const value = search.get(key);
    if (value) next.set(key, value);
  }
  const query = next.toString();
  return query ? `${mapPath}?${query}` : mapPath;
}

/** Kuryerlar sahifasidagi "Xaritada ochish" — joriy hudud filtri saqlanadi. */
export function mapHrefFromArea(
  mapPath: string,
  area: { regions: readonly string[]; zones: readonly string[]; districts: readonly string[] },
): string {
  const next = new URLSearchParams();
  if (area.regions.length) next.set("region", area.regions.join(","));
  if (area.zones.length) next.set("zone", area.zones.join(","));
  if (area.districts.length) next.set("district", area.districts.join(","));
  const query = next.toString();
  return query ? `${mapPath}?${query}` : mapPath;
}
