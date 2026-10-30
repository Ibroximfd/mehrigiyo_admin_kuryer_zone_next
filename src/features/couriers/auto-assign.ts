import { ApiError, errorCode } from "@/lib/api-client";
import {
  asArray,
  asInt,
  asOptionalInt,
  asOptionalString,
  asRecord,
  asString,
  isRecord,
} from "@/lib/parse";

import { asTier } from "./candidates";
import type { CandidateTier } from "./candidates";

/**
 * Avto-taqsimlash: avval reja (`preview`), logist ko'rib chiqadi va kerak
 * bo'lsa qatorlarni o'zgartiradi, keyin `plan_token` bilan qo'llanadi.
 *
 * Reja `expires_in` soniya yashaydi. Oraliqda buyurtma o'zgarsa server
 * `409 plan_stale` qaytaradi va HECH NARSA qo'llanmaydi — reja qayta
 * tuziladi (`staleOrderIds`, `carryOverrides`).
 */

export type AutoAssignPlanRow = {
  orderId: string;
  orderNumber: string;
  courierId: number | null;
  courierName: string;
  tier: CandidateTier | null;
  /** Biriktirilgandan keyingi yuklama. */
  loadAfter: number | null;
};

/**
 * Biriktirilmagan qator (backend A5): buyurtma raqami, mijoz va hudud shu
 * yerda — alohida ro'yxatdan qidirilmaydi. Eski javobda faqat `order_id` va
 * `reason` — qolgani `null`.
 */
export type AutoAssignUnassigned = {
  orderId: string;
  orderNumber: string | null;
  reason: string;
  clientName: string | null;
  zoneId: number | null;
  region: string | null;
  district: string | null;
  districtDisplay: string | null;
};

export type AutoAssignPlan = {
  plan: AutoAssignPlanRow[];
  unassigned: AutoAssignUnassigned[];
  planToken: string;
  /** Soniya; server bermasa 120. */
  expiresIn: number;
};

export type AutoAssignScope = {
  filialId?: number;
  region?: string;
  zoneIds?: number[];
};

export function mapAutoAssignPlan(raw: unknown): AutoAssignPlan {
  const json = asRecord(raw);
  return {
    plan: asArray(json.plan)
      .filter(isRecord)
      .map((row) => ({
        orderId: asString(row.order_id),
        orderNumber: asString(row.order_number),
        courierId: asOptionalInt(row.courier_id),
        courierName: asString(row.courier_name),
        tier: asTier(row.tier),
        loadAfter: asOptionalInt(row.load_after),
      }))
      .filter((row) => row.orderId),
    unassigned: asArray(json.unassigned)
      .filter(isRecord)
      .map((row) => ({
        orderId: asString(row.order_id),
        orderNumber: asOptionalString(row.order_number),
        reason: asString(row.reason),
        clientName: asOptionalString(row.client_name),
        zoneId: asOptionalInt(row.zone_id),
        region: asOptionalString(row.region),
        district: asOptionalString(row.district),
        districtDisplay: asOptionalString(row.district_display),
      }))
      .filter((row) => row.orderId),
    planToken: asString(json.plan_token),
    expiresIn: asInt(json.expires_in, 120) || 120,
  };
}

export type AutoAssignResult = {
  applied: Array<{ orderId: string; courierId: number | null }>;
  /** `zone_mismatch` · `courier_off_shift` — biriktirish baribir bajarilgan. */
  warnings: Array<{ orderId: string; warning: string }>;
};

export function mapAutoAssignResult(raw: unknown): AutoAssignResult {
  const json = asRecord(raw);
  return {
    applied: asArray(json.applied)
      .filter(isRecord)
      .map((row) => ({
        orderId: asString(row.order_id),
        courierId: asOptionalInt(row.courier_id),
      })),
    // Bulk bilan bir shakl `{id, warning}` (backend A2); eski `{order_id, warning}` ham o'qiladi.
    warnings: asArray(json.warnings)
      .filter(isRecord)
      .map((row) => ({
        orderId: asString(row.id ?? row.order_id),
        warning: asString(row.warning),
      }))
      .filter((row) => row.orderId && row.warning),
  };
}

/** Preview so'rovi tanasi — bo'sh bo'lsa server o'z filialini oladi. */
export function previewBody(
  scope: AutoAssignScope | null,
  orderIds: readonly string[] = [],
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (scope) {
    const wire: Record<string, unknown> = {};
    if (scope.filialId !== undefined) wire.filial_id = scope.filialId;
    else if (scope.region) wire.region = scope.region;
    if (scope.zoneIds?.length) wire.zone_ids = [...scope.zoneIds];
    if (Object.keys(wire).length) body.scope = wire;
  }
  if (orderIds.length) body.order_ids = [...orderIds];
  return body;
}

/** Logist tanlovi: `orderId → courierId`. Faqat rejadan farqlilari ketadi. */
export type PlanOverrides = Record<string, number>;

export function buildOverrides(
  plan: readonly AutoAssignPlanRow[],
  overrides: PlanOverrides,
): Array<{ order_id: string; courier_id: number }> {
  return plan.flatMap((row) => {
    const chosen = overrides[row.orderId];
    return chosen !== undefined && chosen !== row.courierId
      ? [{ order_id: row.orderId, courier_id: chosen }]
      : [];
  });
}

/**
 * Qo'llash tanasi: `{plan_token, overrides, order_ids?}`. `orderIds`
 * berilsa rejaning faqat shu qismi qo'llanadi (backend A4) — tanlovlar ham
 * shu qatorlar bilan cheklanadi, qolganlari keyingi qo'llashga qoladi.
 */
export function applyBody(
  planToken: string,
  plan: readonly AutoAssignPlanRow[],
  overrides: PlanOverrides,
  orderIds: readonly string[] | null = null,
): Record<string, unknown> {
  const body: Record<string, unknown> = { plan_token: planToken };
  if (orderIds) {
    const only = new Set(orderIds);
    body.order_ids = [...orderIds];
    body.overrides = buildOverrides(plan.filter((row) => only.has(row.orderId)), overrides);
  } else {
    body.overrides = buildOverrides(plan, overrides);
  }
  return body;
}

/**
 * `409 plan_stale` bo'lsa eskirgan buyurtmalar ro'yxati (bo'sh bo'lishi
 * mumkin); boshqa xatoda `null`.
 */
export function staleOrderIds(error: unknown): string[] | null {
  if (errorCode(error) !== "plan_stale") return null;
  const data = error instanceof ApiError ? asRecord(error.data) : {};
  return asArray(data.stale_order_ids)
    .map((id) => asString(id))
    .filter(Boolean);
}

/**
 * Qayta tuzilgan rejaga logistning tanlovlarini ko'chiradi: eskirgan
 * buyurtmalar va yangi rejada yo'q buyurtmalar tashlanadi — ular uchun
 * logist qaytadan qaror qiladi.
 */
export function carryOverrides(
  overrides: PlanOverrides,
  plan: readonly AutoAssignPlanRow[],
  stale: readonly string[],
): PlanOverrides {
  const present = new Set(plan.map((row) => row.orderId));
  const dropped = new Set(stale);
  const next: PlanOverrides = {};
  for (const [orderId, courierId] of Object.entries(overrides)) {
    if (present.has(orderId) && !dropped.has(orderId)) next[orderId] = courierId;
  }
  return next;
}

/** Qolgan soniya (manfiy bo'lmaydi). */
export function secondsLeft(expiresAt: number, now: number): number {
  return Math.max(0, Math.ceil((expiresAt - now) / 1000));
}

/** `95` → "1:35". */
export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.trunc(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

/** `unassigned.reason` — backend javobi #15 bo'yicha faqat shu ikkitasi. */
const UNASSIGNED_REASONS: Record<string, string> = {
  no_zone: "Zona aniqlanmagan",
  no_courier_on_shift: "Smenada kuryer yo'q",
};

/** Notanish sabab xom kod emas, umumiy matn bilan ko'rsatiladi. */
export function unassignedReasonLabel(reason: string): string {
  return UNASSIGNED_REASONS[reason] ?? "Biriktirib bo'lmadi";
}

// ─────────────────────────────────────────────────────────────────────────────
// Reja oynasi: kuryer bo'yicha xulosa, tanlangan qatorlar
// ─────────────────────────────────────────────────────────────────────────────

/** Logist qatorga qo'ygan kuryer — ko'rsatish uchun nomi bilan. */
export type PlanCourier = { id: number; name: string };

export type PlanCourierOverrides = Readonly<Record<string, PlanCourier>>;

/** Qatorning amaldagi kuryeri: logist tanlovi, bo'lmasa server taklifi. */
export function effectiveCourier(
  row: Pick<AutoAssignPlanRow, "courierId" | "courierName">,
  override: PlanCourier | null | undefined,
): PlanCourier | null {
  if (override) return override;
  return row.courierId === null ? null : { id: row.courierId, name: row.courierName };
}

export type CourierSummary = PlanCourier & { count: number };

/** "Ibroxim · 4 ta" qatori: ko'p buyurtmali kuryer birinchi, teng bo'lsa nom bo'yicha. */
export function summarizeByCourier(
  plan: readonly AutoAssignPlanRow[],
  overrides: PlanCourierOverrides,
  only: ReadonlySet<string> | null = null,
): CourierSummary[] {
  const summary = new Map<number, CourierSummary>();
  for (const row of plan) {
    if (only && !only.has(row.orderId)) continue;
    const courier = effectiveCourier(row, overrides[row.orderId]);
    if (!courier) continue;
    const existing = summary.get(courier.id);
    if (existing) existing.count += 1;
    else summary.set(courier.id, { ...courier, count: 1 });
  }
  return [...summary.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
}

/** Tanlov rejadagi qatorlar bilan cheklanadi — eskirgan id lar tushib qoladi. */
export function pruneSelection(
  selected: ReadonlySet<string>,
  plan: readonly AutoAssignPlanRow[],
): Set<string> {
  const present = new Set(plan.map((row) => row.orderId));
  return new Set([...selected].filter((id) => present.has(id)));
}

/** Logist tanlovi rejadagi kuryer bilan bir xil bo'lsa — tanlov emas, olib tashlanadi. */
export function withOverride(
  overrides: PlanCourierOverrides,
  row: Pick<AutoAssignPlanRow, "orderId" | "courierId">,
  courier: PlanCourier,
): PlanCourierOverrides {
  const next = { ...overrides };
  if (courier.id === row.courierId) delete next[row.orderId];
  else next[row.orderId] = courier;
  return next;
}

/** Oyna ichida Enter: matn maydoni, tugma yoki ro'yxat ichida bo'lsa qo'llamaydi. */
export function enterAppliesFrom(tagName: string, role: string | null): boolean {
  const tag = tagName.toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON" || tag === "SELECT" || tag === "A") {
    return false;
  }
  return role !== "option" && role !== "combobox" && role !== "menuitem";
}
