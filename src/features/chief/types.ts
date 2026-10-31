import { mapCourier, mapFilial } from "@/features/couriers/types";
import type { Courier } from "@/features/couriers/types";
import { mapZone } from "@/features/zones/types";
import type { Zone } from "@/features/zones/types";
import { mapLogistOrder } from "@/features/orders/types";
import type { LogistOrder } from "@/features/orders/types";
import { parseDate } from "@/lib/format";
import { asArray, asBool, asInt, asOptionalString, asRecord, asString, isRecord } from "@/lib/parse";

/**
 * Bosh kuryer (backend K1, 2026-10-30 §C; `21_TUZILMA_V2` §4.5). Bosh
 * kuryer — o'rin (operator akkaunti) + `chief_courier` roli, qamrovi
 * viloyat(lar). U o'zi tashimaydi: logist bergan zakazni o'z kuryerlariga
 * taqsimlaydi, kuryerlardan pul oladi va filiallarga topshiradi. Yakunlash
 * (yetkazildi / atkaz) — faqat logist.
 */
export type ChiefPermission =
  | "orders.dispatch"
  | "couriers.manage"
  | "zones.manage"
  | "cash.accept"
  | "warehouse.view_courier_stores"
  | "view.analytics";

/**
 * Dopusk kaliti javobda umuman bo'lmasa: `view.analytics` — ochiq (eski
 * javoblarda kalit yo'q, moliya bosh kuryerning o'z hisobi), qolganlari — yopiq.
 * Kalit `false` kelsa — har doim yopiq.
 */
const OPEN_WHEN_MISSING: ReadonlySet<ChiefPermission> = new Set(["view.analytics"]);

export type ChiefMe = {
  seat: { id: number; fullName: string; username: string };
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

/**
 * `GET chief/me/` — ikki shakl o'qiladi: K1 (`seat {id, full_name, username}`)
 * va v2 javobi (`seat_id`, `full_name` yuqori darajada). `regions: null` —
 * hamma viloyat (`scope=all`); sayt viloyat ro'yxatini bo'sh deb oladi.
 */
export function mapChiefMe(raw: unknown): ChiefMe {
  const json = asRecord(raw);
  const seat = asRecord(json.seat);
  const summary = asRecord(json.summary);
  const permissions: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(asRecord(json.permissions))) permissions[key] = value === true;
  return {
    seat: {
      id: asInt(seat.id ?? json.seat_id),
      fullName: asString(seat.full_name ?? json.full_name),
      username: asString(seat.username ?? json.username),
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
  if (!me) return false;
  const value = me.permissions[permission];
  return value === undefined ? OPEN_WHEN_MISSING.has(permission) : value;
}


export type ChiefOrderScope = "incoming" | "active" | "delivered" | "all";

/** Zakaz tarixi: `action` — kod, yorlig'i frontendda (`HISTORY_LABELS`). */
export type OrderHistoryEntry = { at: Date | null; action: string; actor: string | null; courier: string | null };

export type ChiefOrderDetail = { order: LogistOrder; history: OrderHistoryEntry[] };

export function mapChiefOrderDetail(raw: unknown): ChiefOrderDetail {
  const json = asRecord(raw);
  return {
    order: mapLogistOrder(isRecord(json.order) ? json.order : raw),
    history: asArray(json.history).map((item) => {
      const row = asRecord(item);
      return {
        at: parseDate(row.at),
        action: asString(row.action),
        actor: asOptionalString(row.actor),
        courier: asOptionalString(row.courier),
      };
    }),
  };
}

// ── Avto-taqsimlash rejasi (V5) ──────────────────────────────────────────────

export type AutoAssignReason = "ok" | "no_zone" | "no_courier" | "no_courier_on_shift";

export type AutoAssignPreviewRow = {
  orderId: string;
  zone: { id: number; name: string } | null;
  courier: { id: number; fullName: string } | null;
  reason: AutoAssignReason;
};

function asReason(value: unknown): AutoAssignReason {
  return value === "no_zone" || value === "no_courier" || value === "no_courier_on_shift" ? value : "ok";
}

export function mapAutoAssignPreview(raw: unknown): AutoAssignPreviewRow[] {
  return asArray(asRecord(raw).rows).map((item) => {
    const row = asRecord(item);
    const zone = asRecord(row.zone);
    const courier = asRecord(row.courier);
    return {
      orderId: asString(row.order_id),
      zone: isRecord(row.zone) ? { id: asInt(zone.id), name: asString(zone.name) } : null,
      courier: isRecord(row.courier) ? { id: asInt(courier.id), fullName: asString(courier.full_name) } : null,
      reason: asReason(row.reason),
    };
  });
}

export const AUTO_ASSIGN_REASONS: Record<AutoAssignReason, string> = {
  ok: "",
  no_zone: "zona aniqlanmagan",
  no_courier: "zonada kuryer yo'q",
  no_courier_on_shift: "zonada smenadagi kuryer yo'q",
};

export type AutoAssignResult = { assigned: string[]; failed: Array<{ id: string; code: string }> };

export function mapAutoAssignResult(raw: unknown): AutoAssignResult {
  const json = asRecord(raw);
  return {
    assigned: asArray(json.assigned).map((item) => asString(isRecord(item) ? item.id : item)).filter(Boolean),
    failed: asArray(json.failed).map((item) => {
      const row = asRecord(item);
      return { id: asString(row.id), code: asString(row.code) };
    }),
  };
}

// ── Filiallar (V14) ──────────────────────────────────────────────────────────

export type ChiefFilial = { id: number; name: string; isMain: boolean };

export function mapChiefFilials(raw: unknown): ChiefFilial[] {
  const list = Array.isArray(raw) ? raw : asArray(asRecord(raw).results);
  return list.filter(isRecord).map((row) => ({ id: asInt(row.id), name: asString(row.name), isMain: asBool(row.is_main) }));
}

// ── Manzil tuzatish va qaytarish sabablari (`25_MANZIL_OZGARISHI` §4) ───────

export const ADDRESS_FIX_REASONS = ["client_error", "clarified", "moved", "other"] as const;
export type AddressFixReason = (typeof ADDRESS_FIX_REASONS)[number];

export const ADDRESS_FIX_REASON_LABELS: Record<AddressFixReason, string> = {
  client_error: "Mijoz xato aytgan",
  clarified: "Aniqlashtirildi",
  moved: "Mijoz ko'chib o'tgan",
  other: "Boshqa sabab",
};

export const RETURN_REASONS = ["wrong_region", "address_unknown", "client_unreachable", "other"] as const;
export type ReturnReason = (typeof RETURN_REASONS)[number];

export const RETURN_REASON_LABELS: Record<ReturnReason, string> = {
  wrong_region: "Manzil boshqa viloyatda",
  address_unknown: "Manzil topilmadi",
  client_unreachable: "Mijoz javob bermayapti",
  other: "Boshqa sabab",
};

export const HISTORY_LABELS: Record<string, string> = {
  created: "Zakaz yaratildi",
  chief_assigned: "Sizga berildi",
  courier_assigned: "Kuryerga berildi",
  courier_unassigned: "Kuryerdan olindi",
  delivered: "Yetkazildi",
  cash_accepted: "Pul qabul qilindi",
  cash_handed: "Pul filialga topshirildi",
  address_changed: "Manzil o'zgardi",
  returned_to_logist: "Logistga qaytarildi",
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

