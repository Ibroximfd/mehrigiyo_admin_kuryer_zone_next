import type { LogistOrder } from "@/features/orders/types";

import type { AutoAssignUnassigned } from "./auto-assign";
import type { Courier } from "./types";

/**
 * Taqsimlash oynasi va avto-reja — sof mantiq: zona kaliti, kuryer-zona
 * mosligi, smena ko'rinishi, biriktirilmaydiganlar guruhi. Hudud kaskadi
 * (Viloyat → Zona → Tuman) `features/zones/area-filter.ts` da.
 */

/** Zonasi aniqlanmagan buyurtmalar ("Hududi noma'lum" savati). */
export const ZONE_NONE = "none";

/** Zona id si satr ko'rinishida yoki `none`. */
export type ZoneKey = string;

/** Buyurtma qaysi savatga tushadi: zona id si yoki `none`. */
export function zoneKeyOf(order: Pick<LogistOrder, "zoning">): ZoneKey {
  const id = order.zoning.zoneId;
  return id === null ? ZONE_NONE : String(id);
}

/** Kuryer shu zonaga biriktirilganmi (`zone_ids` yoki `zones[]` bo'yicha). */
export function courierInZone(
  courier: Pick<Courier, "zoneIds" | "zones">,
  key: ZoneKey,
): boolean {
  const id = Number(key);
  if (!Number.isInteger(id)) return false;
  return (
    courier.zoneIds.includes(id) || courier.zones.some((zone) => zone.id === id)
  );
}

/**
 * Kuryer tanlangan buyurtmalarning zonasidan emas — biriktirishdan oldin
 * sariq ogohlantirish. Zonasiz buyurtmalar hisobga olinmaydi.
 */
export function courierMismatchesSelection(
  courier: Pick<Courier, "zoneIds" | "zones">,
  selected: readonly Pick<LogistOrder, "zoning">[],
): boolean {
  const keys = new Set(
    selected.map(zoneKeyOf).filter((key) => key !== ZONE_NONE),
  );
  if (keys.size === 0) return false;
  for (const key of keys) {
    if (courierInZone(courier, key)) return false;
  }
  return true;
}

/** Smenadagilar tepada, har guruh ichida kam bandi birinchi. */
type AssignableCourier = {
  live: { onShift: boolean };
  load: number | null;
  today: { assigned: number };
};

export function sortCouriersForAssign<T extends AssignableCourier>(
  couriers: readonly T[],
): T[] {
  const load = (courier: T) => courier.load ?? courier.today.assigned;
  return [...couriers].sort((a, b) => {
    if (a.live.onShift !== b.live.onShift) return a.live.onShift ? -1 : 1;
    return load(a) - load(b);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Smena: smenadagilar / hammasi, smenadan tashqari kuryerga tasdiq
// ─────────────────────────────────────────────────────────────────────────────

/** Kuryer ustuni ko'rinishi: faqat smenadagilar yoki hammasi. */
export type ShiftView = "on_shift" | "all";

type ShiftCourier = { isActive: boolean; live: { onShift: boolean } };

/** Faol kuryerlar; `on_shift` ko'rinishida smenadan tashqaridagilar yashirinadi. */
export function visibleCouriers<T extends ShiftCourier>(
  couriers: readonly T[],
  view: ShiftView,
): T[] {
  return couriers.filter(
    (courier) => courier.isActive && (view === "all" || courier.live.onShift),
  );
}

/**
 * Smenadan tashqaridagi kuryerga biriktirish mumkin, lekin bitta qo'shimcha
 * tasdiq bilan — kuryer ilovada buyurtmani darhol ko'rmasligi mumkin.
 */
export function needsOffShiftConfirm(courier: Pick<ShiftCourier, "live">): boolean {
  return !courier.live.onShift;
}

/** Smenadagi / hammasi sonlari — tugma yorlig'i uchun. */
export function shiftCounts<T extends ShiftCourier>(
  couriers: readonly T[],
): { onShift: number; all: number } {
  const active = couriers.filter((courier) => courier.isActive);
  return {
    onShift: active.filter((courier) => courier.live.onShift).length,
    all: active.length,
  };
}

/**
 * Kuryer tanlovi uchun tartib: buyurtma zonasining kuryerlari oldin
 * (smenadagilar tepada, kam bandi birinchi), keyin qolganlar shu tartibda.
 * Zona bo'lmasa (`null`) — hammasi bitta guruhda.
 */
export function orderCouriersForZone<T extends AssignableCourier & Pick<Courier, "zoneIds" | "zones">>(
  couriers: readonly T[],
  zoneId: number | null,
): { zone: T[]; others: T[] } {
  const sorted = sortCouriersForAssign(couriers);
  if (zoneId === null) return { zone: [], others: sorted };
  const key = String(zoneId);
  return {
    zone: sorted.filter((courier) => courierInZone(courier, key)),
    others: sorted.filter((courier) => !courierInZone(courier, key)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Avto-taqsimlash: biriktirilmaydiganlar sabab bo'yicha
// ─────────────────────────────────────────────────────────────────────────────

export type UnassignedReasonGroup = {
  reason: string;
  /** Sarlavha — logistga tushunarli matn. */
  title: string;
  /** Nima qilish kerak. */
  hint: string;
  items: AutoAssignUnassigned[];
};

const REASON_TEXT: Record<string, { title: string; hint: string }> = {
  no_zone: {
    title: "Tuman belgilanmagan",
    hint: "Tumanni belgilang — zona serverda hisoblanadi, keyin rejani qayta tuzing.",
  },
  no_courier_on_shift: {
    title: "Zonada smenadagi kuryer yo'q",
    hint: "Kuryerni smenaga chiqaring yoki qo'lda boshqa zona kuryeriga biriktiring.",
  },
};

const UNKNOWN_REASON = {
  title: "Biriktirib bo'lmadi",
  hint: "Buyurtmani qo'lda biriktiring.",
};

/** Sabab bo'yicha guruhlar — ma'lum sabablar oldin, server tartibida. */
export function groupUnassignedByReason(
  unassigned: readonly AutoAssignUnassigned[],
): UnassignedReasonGroup[] {
  const order = [...Object.keys(REASON_TEXT)];
  const groups = new Map<string, UnassignedReasonGroup>();
  for (const item of unassigned) {
    const existing = groups.get(item.reason);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    const text = REASON_TEXT[item.reason] ?? UNKNOWN_REASON;
    groups.set(item.reason, { reason: item.reason, ...text, items: [item] });
  }
  return [...groups.values()].sort((a, b) => {
    const ia = order.indexOf(a.reason);
    const ib = order.indexOf(b.reason);
    return (ia === -1 ? order.length : ia) - (ib === -1 ? order.length : ib);
  });
}

/**
 * Hech narsa biriktirilmasa — bitta eng foydali keyingi qadam.
 * `null` — rejada biriktiriladigan qator bor.
 */
export function nothingToApplyText(
  planCount: number,
  groups: readonly UnassignedReasonGroup[],
): string | null {
  if (planCount > 0 || groups.length === 0) return null;
  const noZone = groups.find((group) => group.reason === "no_zone");
  if (noZone) {
    return `${noZone.items.length} ta buyurtmada tuman yo'q — avval tumanlarni belgilang`;
  }
  const noCourier = groups.find((group) => group.reason === "no_courier_on_shift");
  if (noCourier) {
    return `${noCourier.items.length} ta buyurtma zonasida smenadagi kuryer yo'q — qo'lda taqsimlang`;
  }
  return "Hech qaysi buyurtma biriktirilmaydi — qo'lda taqsimlang";
}
