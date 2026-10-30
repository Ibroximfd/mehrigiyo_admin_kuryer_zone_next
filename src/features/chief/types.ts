import { mapCourier, mapFilial } from "@/features/couriers/types";
import type { Courier } from "@/features/couriers/types";
import { mapZone } from "@/features/zones/types";
import type { Zone } from "@/features/zones/types";
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
 * Bosh kuryer (backend K1, 2026-10-30 §C). Bosh kuryer — o'rin (operator
 * akkaunti) + `chief_courier` roli, qamrovi viloyat(lar). U o'zi
 * tashimaydi: logist bergan zakazni o'z kuryerlariga taqsimlaydi,
 * kuryerlardan pul oladi va bosh logistga topshiradi. Yakunlash (yetkazildi
 * / atkaz) — faqat logist.
 */
export type ChiefRef = { id: number; fullName: string };

export function mapChiefRef(raw: unknown): ChiefRef | null {
  if (!isRecord(raw)) return null;
  const id = asOptionalInt(raw.id);
  if (id === null) return null;
  return { id, fullName: asString(raw.full_name ?? raw.name) || `#${id}` };
}

/** Tanlov ro'yxati (`GET logist/chiefs/`). `regions: null` — hamma viloyat. */
export type ChiefOption = ChiefRef & {
  regions: string[] | null;
  /**
   * Viloyatning sukut bosh kuryeri (`?region=` bilan so'ralganda); viloyatsiz
   * so'rovda `null` (backend 2026-10-30 §2).
   */
  isDefault: boolean | null;
  filial: { id: number; name: string } | null;
  couriers: number;
};

export function mapChiefOptions(raw: unknown): ChiefOption[] {
  const list = Array.isArray(raw) ? raw : asArray(asRecord(raw).results);
  return list.flatMap((item) => {
    const ref = mapChiefRef(item);
    if (!ref) return [];
    const json = asRecord(item);
    return [
      {
        ...ref,
        regions: json.regions === null ? null : asArray(json.regions).map((code) => asString(code)).filter(Boolean),
        isDefault: typeof json.is_default === "boolean" ? json.is_default : null,
        filial: mapFilial(json.filial),
        couriers: asInt(json.couriers),
      },
    ];
  });
}

/**
 * Zakaz viloyatiga mos bosh kuryer: server belgilagan sukut (`is_default`),
 * so'ng viloyati mos birinchisi; hamma viloyatli — zaxira.
 */
export function chiefForRegion(chiefs: readonly ChiefOption[], region: string | null): ChiefOption | null {
  if (!region) return null;
  const matching = chiefs.filter((chief) => chief.regions?.includes(region));
  return (
    matching.find((chief) => chief.isDefault === true) ??
    matching[0] ??
    chiefs.find((chief) => chief.regions === null) ??
    null
  );
}

export type ChiefPermission =
  | "orders.dispatch"
  | "couriers.manage"
  | "zones.manage"
  | "cash.accept"
  | "warehouse.view_courier_stores";

export type ChiefMe = {
  seat: ChiefRef & { username: string };
  filial: { id: number; name: string } | null;
  regions: string[];
  permissions: Record<string, boolean>;
  summary: {
    incoming: number;
    active: number;
    couriers: number;
    couriersOnShift: number;
    finalizedToday: number;
  };
};

export function mapChiefMe(raw: unknown): ChiefMe {
  const json = asRecord(raw);
  const seat = asRecord(json.seat);
  const summary = asRecord(json.summary);
  const permissions: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(asRecord(json.permissions))) permissions[key] = value === true;
  return {
    seat: {
      id: asInt(seat.id),
      fullName: asString(seat.full_name),
      username: asString(seat.username),
    },
    filial: mapFilial(json.filial),
    regions: asArray(json.regions).map((code) => asString(code)).filter(Boolean),
    permissions,
    summary: {
      incoming: asInt(summary.incoming),
      active: asInt(summary.active),
      couriers: asInt(summary.couriers),
      couriersOnShift: asInt(summary.couriers_on_shift),
      finalizedToday: asInt(summary.finalized_today),
    },
  };
}

export function chiefCan(me: ChiefMe | null, permission: ChiefPermission): boolean {
  return me?.permissions[permission] === true;
}

export type ChiefOrderScope = "incoming" | "active" | "all";

/** `POST chief/orders/auto-assign/` natijasi. */
export type AutoAssignOutcome = {
  assigned: Array<{ id: string; courierId: number }>;
  skipped: Array<{ id: string; reason: string }>;
};

export function mapAutoAssignOutcome(raw: unknown): AutoAssignOutcome {
  const json = asRecord(raw);
  return {
    assigned: asArray(json.assigned).map((item) => {
      const row = asRecord(item);
      return { id: asString(row.id), courierId: asInt(row.courier_id) };
    }),
    skipped: asArray(json.skipped).map((item) => {
      const row = asRecord(item);
      return { id: asString(row.id), reason: asString(row.reason) };
    }),
  };
}

export const SKIP_REASON_LABELS: Record<string, string> = {
  no_courier: "mos kuryer yo'q",
  no_zone: "zona aniqlanmagan",
};

export function mapChiefCouriers(raw: unknown): Courier[] {
  const list = Array.isArray(raw) ? raw : asArray(asRecord(raw).results);
  return list.map(mapCourier);
}

export type ChiefZones = { zones: Zone[]; unzonedDistricts: string[] };

export function mapChiefZones(raw: unknown): ChiefZones {
  const json = asRecord(raw);
  const list = Array.isArray(raw) ? raw : asArray(json.zones ?? json.results);
  return {
    zones: list.map(mapZone).filter((zone): zone is Zone => zone !== null),
    unzonedDistricts: asArray(json.unzoned_districts).map((code) => asString(isRecord(code) ? code.code : code)).filter(Boolean),
  };
}

// ── Kassa: bosh kuryer → bosh logist (2-pog'ona) ───────────────────────────

export type ChiefHandoverStatus = "pending" | "confirmed" | "disputed";

export type ChiefHandover = {
  id: number;
  chief: ChiefRef | null;
  date: string;
  periodFrom: string | null;
  periodTo: string | null;
  amount: number;
  expectedAmount: number | null;
  confirmedAmount: number | null;
  shortage: number | null;
  status: ChiefHandoverStatus;
  note: string;
  logistNote: string;
  logist: ChiefRef | null;
  createdAt: Date | null;
  confirmedAt: Date | null;
};

function asHandoverStatus(value: unknown): ChiefHandoverStatus {
  const text = asString(value);
  return text === "confirmed" || text === "disputed" ? text : "pending";
}

export function mapChiefHandover(raw: unknown): ChiefHandover | null {
  if (!isRecord(raw)) return null;
  const id = asOptionalInt(raw.id);
  if (id === null) return null;
  return {
    id,
    chief: mapChiefRef(raw.chief),
    date: asString(raw.date),
    periodFrom: asOptionalString(raw.period_from),
    periodTo: asOptionalString(raw.period_to),
    amount: asNumber(raw.amount),
    expectedAmount: asOptionalNumber(raw.expected_amount),
    confirmedAmount: asOptionalNumber(raw.confirmed_amount),
    shortage: asOptionalNumber(raw.shortage),
    status: asHandoverStatus(raw.status),
    note: asString(raw.note),
    logistNote: asString(raw.logist_note),
    logist: mapChiefRef(raw.logist),
    createdAt: parseDate(raw.created_at),
    confirmedAt: parseDate(raw.confirmed_at),
  };
}

export function mapChiefHandovers(raw: unknown): { results: ChiefHandover[]; count: number } {
  const json = asRecord(raw);
  const list = Array.isArray(raw) ? raw : asArray(json.results);
  const results = list.map(mapChiefHandover).filter((item): item is ChiefHandover => item !== null);
  return { results, count: asInt(json.count, results.length) };
}

export type CashDayStatus = "none" | ChiefHandoverStatus;

export type ChiefCash = {
  dateFrom: string;
  dateTo: string;
  collectedFromCouriers: number;
  /** Hali topshirilmagan kunlar jami — «Hammasini topshirish» summasi. */
  outstanding: number;
  outstandingDays: string[];
  days: Array<{ date: string; collected: number; status: CashDayStatus }>;
  handovers: ChiefHandover[];
};

export function mapChiefCash(raw: unknown): ChiefCash {
  const json = asRecord(raw);
  return {
    dateFrom: asString(json.date_from),
    dateTo: asString(json.date_to),
    collectedFromCouriers: asNumber(json.collected_from_couriers),
    outstanding: asNumber(json.outstanding),
    outstandingDays: asArray(json.outstanding_days).map((day) => asString(day)).filter(Boolean).sort(),
    days: asArray(json.days).map((item) => {
      const row = asRecord(item);
      const status = asString(row.status);
      return {
        date: asString(row.date),
        collected: asNumber(row.collected),
        status: status === "pending" || status === "confirmed" || status === "disputed" ? status : "none",
      };
    }),
    handovers: asArray(json.handovers)
      .map(mapChiefHandover)
      .filter((item): item is ChiefHandover => item !== null),
  };
}

/** «Hammasini topshirish» davri: topshirilmagan kunlarning chegarasi. */
export function outstandingPeriod(cash: Pick<ChiefCash, "outstandingDays">): { from: string; to: string } | null {
  const days = cash.outstandingDays;
  if (days.length === 0) return null;
  return { from: days[0]!, to: days[days.length - 1]! };
}

// ── Analitika ──────────────────────────────────────────────────────────────

export type ChiefStatsRow = {
  courier: { id: number; fullName: string; isActive: boolean; onShift: boolean };
  delivered: number;
  refused: number;
  awaiting: number;
  addresses: number;
  addressesManual: number;
  payRate: number | null;
  pay: number | null;
};

export type ChiefStats = {
  dateFrom: string;
  dateTo: string;
  couriers: ChiefStatsRow[];
  totals: Omit<ChiefStatsRow, "courier" | "payRate">;
};

function mapStatsNumbers(json: Record<string, unknown>) {
  return {
    delivered: asInt(json.delivered),
    refused: asInt(json.refused),
    awaiting: asInt(json.awaiting),
    addresses: asInt(json.addresses),
    addressesManual: asInt(json.addresses_manual),
    pay: asOptionalNumber(json.pay),
  };
}

export function mapChiefStats(raw: unknown): ChiefStats {
  const json = asRecord(raw);
  return {
    dateFrom: asString(json.date_from),
    dateTo: asString(json.date_to),
    couriers: asArray(json.couriers).map((item) => {
      const row = asRecord(item);
      const courier = asRecord(row.courier);
      return {
        courier: {
          id: asInt(courier.id),
          fullName: asString(courier.full_name),
          isActive: asBool(courier.is_active, true),
          onShift: asBool(courier.on_shift),
        },
        ...mapStatsNumbers(row),
        payRate: asOptionalNumber(row.pay_rate),
      };
    }),
    totals: mapStatsNumbers(asRecord(json.totals)),
  };
}
