import { mapZoneRef, asIdList } from "@/features/zones/types";
import type { ZoneRef } from "@/features/zones/types";
import {
  mapCourierAlerts,
  mapLivePoint,
  normalizeBattery,
} from "@/features/couriers/live-tracking";
import type { CourierAlert, LivePoint } from "@/features/couriers/live-tracking";
import { mapCourierAvatar } from "@/features/couriers/avatar";
import type { CourierAvatar } from "@/features/couriers/avatar";
import { mapRoutePlan } from "@/features/couriers/route-plan";
import type { RoutePlan } from "@/features/couriers/route-plan";
import { parseDate } from "@/lib/format";
import {
  asArray,
  asBool,
  asInt,
  asNumber,
  asOptionalInt,
  asOptionalNumber,
  asOptionalString,
  asRecord,
  asString,
  isRecord,
} from "@/lib/parse";

/**
 * Kuryer — backend yozuvi (`BACKEND-LOGIST.md` §4) va kuryer ilovasidan
 * jonli holat (`KURYER_SAYTLAR_LOGIST_OPERATOR.md` §2.3). Akkauntsiz kuryer
 * ham bo'ladi (`hasAccount=false`) — u ilovaga kirmaydi, qo'lda yuritiladi.
 */
export type CourierDevice = {
  deviceName: string | null;
  platform: string | null;
  appVersion: string | null;
  since: Date | null;
  lastSeenAt: Date | null;
};

export type CourierLive = {
  onShift: boolean;
  /** Oxirgi 5 daqiqada heartbeat kelganmi. */
  online: boolean;
  lastHeartbeatAt: Date | null;
  /** Ilovada yuborilmay turgan oflayn amallar (0 — hammasi serverda). */
  queueLength: number;
  oldestPendingAt: Date | null;
  /** Oxirgi nuqta — §7.2 dan tezlik, yo'nalish, aniqlik ham (eski javobda `null`). */
  lastLocation: LivePoint | null;
  /** Hozir olib ketayotgan buyurtma (`picked_up`/`on_the_way`/`arrived`). */
  currentOrderId: string | null;
  /** Batareya foizi; server bermasa `null`. */
  battery: number | null;
  /** Server hisoblagan ogohlantirishlar (§7.2); eski javobda `[]`. */
  alerts: CourierAlert[];
};

export type Courier = {
  id: number;
  fullName: string;
  phone: string;
  /** Profil rasmi (§8); yo'q bo'lsa `null` — bosh harflar chiziladi. */
  avatar: CourierAvatar | null;
  isActive: boolean;
  /**
   * Kuryer filiali. 2026-10-15 dan ro'yxat filial bilan cheklanmaydi —
   * boshqa filial kuryeri ham chiqadi, shuning uchun kartada ko'rsatiladi.
   */
  filialName: string | null;
  filial: { id: number; name: string } | null;
  /** Kuryer biriktirilgan zonalar (eski javobda bo'sh). */
  zoneIds: number[];
  zones: ZoneRef[];
  /** Viloyat kodi; bo'lmasa `null`. */
  region: string | null;
  /** Barcha filiallar bo'yicha ochiq buyurtmalar; server bermasa `null`. */
  load: number | null;
  today: {
    assigned: number;
    delivered: number;
    codTotal: number;
    /** Bugungi to'xtashlar va kuryer haqi (`LOGIST_03` §2); eski deploy — `null`. */
    stops: number | null;
    pay: number | null;
  };
  /** Ilova akkaunti bormi (parol bilan kira oladimi). */
  hasAccount: boolean;
  /** Hozir ochiq qurilma yoki `null`. */
  device: CourierDevice | null;
  live: CourierLive;
  /** Ilova tasdiqlagan marshrut rejasi (48 soat); yo'q bo'lsa `null`. */
  routePlan: RoutePlan | null;
};

export function mapCourier(raw: unknown): Courier {
  const json = asRecord(raw);
  const today = asRecord(json.today);

  return {
    id: asInt(json.id),
    fullName: asString(json.full_name ?? json.name),
    phone: asString(json.phone),
    avatar: mapCourierAvatar(json.avatar),
    isActive: asBool(json.is_active, true),
    filialName: asOptionalString(asRecord(json.filial).name ?? json.filial_name),
    filial: mapFilial(json.filial),
    zoneIds: asIdList(json.zone_ids),
    zones: asArray(json.zones)
      .map(mapZoneRef)
      .filter((zone): zone is ZoneRef => zone !== null),
    region: asOptionalString(json.region),
    load: asOptionalInt(json.load),
    today: {
      assigned: asInt(today.assigned),
      delivered: asInt(today.delivered),
      codTotal: asNumber(today.cod_total),
      stops: asOptionalInt(today.stops),
      pay: asOptionalNumber(today.pay),
    },
    hasAccount: asBool(json.has_account),
    device: mapDevice(json.device),
    live: {
      onShift: asBool(json.on_shift),
      online: asBool(json.online),
      lastHeartbeatAt: parseDate(asOptionalString(json.last_heartbeat_at)),
      queueLength: asInt(json.queue_length),
      oldestPendingAt: parseDate(asOptionalString(json.oldest_pending_at)),
      lastLocation: mapLivePoint(json.last_location),
      currentOrderId: asOptionalString(json.current_order_id),
      battery: normalizeBattery(json.battery),
      alerts: mapCourierAlerts(json.alerts),
    },
    routePlan: mapRoutePlan(json.route_plan),
  };
}

/** `{id, name}` filial havolasi; id yo'q bo'lsa `null`. */
export function mapFilial(raw: unknown): { id: number; name: string } | null {
  if (!isRecord(raw)) return null;
  const id = asOptionalInt(raw.id);
  if (id === null) return null;
  return { id, name: asString(raw.name) };
}

function mapDevice(raw: unknown): CourierDevice | null {
  if (!isRecord(raw)) return null;
  return {
    deviceName: asOptionalString(raw.device_name),
    platform: asOptionalString(raw.platform),
    appVersion: asOptionalString(raw.app_version),
    since: parseDate(asOptionalString(raw.since)),
    lastSeenAt: parseDate(asOptionalString(raw.last_seen_at)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Haftalik naqd yig'im (`KURYER_SAYTLAR_LOGIST_OPERATOR.md` §2.4)
// ─────────────────────────────────────────────────────────────────────────────

export type HandoverStatus = "pending" | "confirmed" | "disputed";

/** E'lon summasining bitta filialga tegishli qismi. */
export type FilialSplit = {
  filialId: number | null;
  filialName: string;
  amount: number;
  orders: number;
  /** Server formatlagan summa; bo'lmasa `null` (mahalliy formatlanadi). */
  amountDisplay: string | null;
};

