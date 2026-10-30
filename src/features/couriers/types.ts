import { mapCashPoint, mapZoneRef, asIdList } from "@/features/zones/types";
import type { CashPoint, ZoneRef } from "@/features/zones/types";
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

/** Kuryer holati — kartadagi belgi uchun bitta qiymat. */
export type CourierPresence =
  | "no_account"
  | "off_shift"
  | "online"
  /** Smenada, lekin 5 daqiqadan beri heartbeat yo'q. */
  | "no_connection";

export function courierPresence(courier: Courier): CourierPresence {
  if (!courier.hasAccount) return "no_account";
  if (!courier.live.onShift) return "off_shift";
  return courier.live.online ? "online" : "no_connection";
}

// ─────────────────────────────────────────────────────────────────────────────
// Haftalik naqd yig'im (`KURYER_SAYTLAR_LOGIST_OPERATOR.md` §2.4)
// ─────────────────────────────────────────────────────────────────────────────

export type HandoverStatus = "pending" | "confirmed" | "disputed";

/** Kuryerning kunlik e'loni ("shuncha topshiraman") va logist qarori. */
export type Handover = {
  status: HandoverStatus | null;
  amount: number | null;
  confirmedAmount: number | null;
  createdAt: Date | null;
  confirmedAt: Date | null;
  /** Kuryer izohi. */
  note: string | null;
  logistNote: string | null;
  logistName: string | null;
  /** Pul qayerga topshiriladi; eski e'lonlarda `null`. */
  cashPoint: CashPoint | null;
  /** Filiallar bo'yicha bo'linish; eski e'lonlarda `[]`. */
  byFilial: FilialSplit[];
};

/** E'lon summasining bitta filialga tegishli qismi. */
export type FilialSplit = {
  filialId: number | null;
  filialName: string;
  amount: number;
  orders: number;
  /** Server formatlagan summa; bo'lmasa `null` (mahalliy formatlanadi). */
  amountDisplay: string | null;
};

export function mapFilialSplit(raw: unknown): FilialSplit {
  const json = asRecord(raw);
  return {
    filialId: asOptionalInt(json.filial_id),
    filialName: asString(json.filial_name),
    amount: asNumber(json.amount),
    orders: asInt(json.orders),
    amountDisplay: asOptionalString(json.amount_display),
  };
}

export function mapHandover(raw: unknown): Handover | null {
  if (!isRecord(raw)) return null;
  const status = asOptionalString(raw.status);
  return {
    status:
      status === "pending" || status === "confirmed" || status === "disputed"
        ? status
        : null,
    amount: asOptionalNumber(raw.amount),
    confirmedAmount: asOptionalNumber(raw.confirmed_amount),
    createdAt: parseDate(asOptionalString(raw.created_at)),
    confirmedAt: parseDate(asOptionalString(raw.confirmed_at)),
    note: asOptionalString(raw.note),
    logistNote: asOptionalString(raw.logist_note),
    logistName: asOptionalString(raw.logist_name),
    cashPoint: mapCashPoint(raw.cash_point),
    byFilial: asArray(raw.by_filial).map(mapFilialSplit),
  };
}

export type CodRangeDay = {
  date: string;
  orders: Array<{
    id: string;
    orderNumber: string;
    amount: number;
    deliveredAt: Date | null;
  }>;
  /** Isbotlardan hisoblangan jami. */
  computedTotal: number;
  /** Topshiriladigan summa: kuryer e'loni, bo'lmasa `computedTotal`. */
  amount: number;
  settled: boolean;
  handover: Handover | null;
};

export type CodRange = {
  dateFrom: string;
  dateTo: string;
  /** Faqat buyurtma yoki e'lon bor kunlar. */
  days: CodRangeDay[];
  total: number;
  /** Hali topshirilmagan pul va kunlar. */
  outstandingTotal: number;
  outstandingDays: number;
  settled: boolean;
};

export function mapCodRange(raw: unknown): CodRange {
  const json = asRecord(raw);
  return {
    dateFrom: asString(json.date_from),
    dateTo: asString(json.date_to),
    days: asArray(json.days).map((item) => {
      const day = asRecord(item);
      const computedTotal = asNumber(day.computed_total);
      return {
        date: asString(day.date),
        orders: asArray(day.orders).map((row) => {
          const order = asRecord(row);
          return {
            id: asString(order.id),
            orderNumber: asString(order.order_number),
            amount: asNumber(order.amount),
            deliveredAt: parseDate(asOptionalString(order.delivered_at)),
          };
        }),
        computedTotal,
        amount: asOptionalNumber(day.amount) ?? computedTotal,
        settled: asBool(day.settled),
        handover: mapHandover(day.handover),
      };
    }),
    total: asNumber(json.total),
    outstandingTotal: asNumber(json.outstanding_total),
    outstandingDays: asInt(json.outstanding_days),
    settled: asBool(json.settled),
  };
}

/** Oraliqni yopish natijasi — qaysi kun `disputed` bo'lgani ko'rinadi. */
export type CodSettleResult = {
  settledDays: number;
  confirmedTotal: number;
  days: Array<{ date: string; handover: Handover | null }>;
};

export function mapCodSettleResult(raw: unknown): CodSettleResult {
  const json = asRecord(raw);
  return {
    settledDays: asInt(json.settled_days),
    confirmedTotal: asNumber(json.confirmed_total),
    days: asArray(json.days).map((item) => {
      const day = asRecord(item);
      return { date: asString(day.date), handover: mapHandover(day.handover) };
    }),
  };
}

/** Filial bo'yicha kuryer e'lonlari ro'yxati qatori. */
export type HandoverRow = Handover & {
  date: string;
  /** Kuryer boshqa filialdan bo'lishi mumkin (kassa nuqtasi bizniki). */
  courier: {
    id: number;
    fullName: string;
    filial: { id: number; name: string } | null;
  } | null;
};

export function mapHandoverRow(raw: unknown): HandoverRow {
  const json = asRecord(raw);
  const courier = asRecord(json.courier);
  const courierId = asOptionalInt(courier.id);
  return {
    ...(mapHandover(json) ?? EMPTY_HANDOVER),
    date: asString(json.date),
    courier:
      courierId === null
        ? null
        : {
            id: courierId,
            fullName: asString(courier.full_name ?? courier.name),
            filial: mapFilial(courier.filial ?? json.courier_filial),
          },
  };
}

const EMPTY_HANDOVER: Handover = {
  status: null,
  amount: null,
  confirmedAmount: null,
  createdAt: null,
  confirmedAt: null,
  note: null,
  logistNote: null,
  logistName: null,
  cashPoint: null,
  byFilial: [],
};

/** Akkaunt amallari javobi: parol faqat shu yerda, bir marta keladi. */
export type CourierAccountResult = {
  courier: Courier;
  password: string | null;
};

export function mapCourierAccountResult(raw: unknown): CourierAccountResult {
  return {
    courier: mapCourier(raw),
    password: asOptionalString(asRecord(raw).password),
  };
}
