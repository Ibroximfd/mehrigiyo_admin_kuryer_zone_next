import { containsPart } from "./delivery-address";
import { regionLabel } from "./regions";
import type { DeliveryInfo } from "./types";
import type { OrderZoning } from "./zoning";

/**
 * Manzil qatori va manzil o'zgarishi belgisi (`HUDUD_BACKEND_TALABLAR_3`
 * §1–§2) — sof qoidalar, karta/ro'yxat/detal shu yerdan o'qiydi.
 */

/** `delivery.address_changed_by` — kim o'zgartirgan. */
export type AddressChangedBy = "courier" | "logist" | "client";

export function asAddressChangedBy(value: unknown): AddressChangedBy | null {
  return value === "courier" || value === "logist" || value === "client" ? value : null;
}

/** Tarix sarlavhasi: "Kuryer manzilni o'zgartirdi" (`order.address_changed`). */
const CHANGED_TITLES: Record<AddressChangedBy, string> = {
  courier: "Kuryer manzilni o'zgartirdi",
  logist: "Logist manzilni o'zgartirdi",
  client: "Mijoz manzilni o'zgartirdi",
};

export function addressChangedTitle(by: AddressChangedBy | null): string {
  return by ? CHANGED_TITLES[by] : "Manzil o'zgartirildi";
}

/** Kuryer tahriri sababi (`reason`) — tarixdagi "Sabab" qatori. */
export const ADDRESS_CHANGE_REASONS: Record<string, string> = {
  client_error: "Mijoz xato kiritgan",
  moved: "Ko'chib o'tgan",
  clarified: "Aniqlashtirildi",
  other: "Boshqa",
};

export function addressChangeReasonLabel(reason: string | null): string | null {
  if (!reason) return null;
  return ADDRESS_CHANGE_REASONS[reason] ?? reason;
}

type AddressHost = {
  deliveryInfo: Pick<DeliveryInfo, "address" | "locality" | "region" | "regionDisplay"> | null;
  zoning: Pick<OrderZoning, "district" | "districtDisplay">;
};

/**
 * To'liq manzil — har joyda (detal, doska kartasi, ro'yxat, ulashish,
 * yo'l varaqasi) BITTA tartibda, CRM bilan bir xil (2026-10-17):
 *
 *     Viloyat, Tuman/shahar, mahalla/qishloq, ko'cha-uy
 *
 * Bo'sh qism tashlanadi. Eski buyurtmalarda tuman yoki mahalla ko'cha
 * matnining o'zida yozilgan bo'lishi mumkin — matnda bor qism
 * takrorlanmaydi. Hech narsa yo'q — `null` ("manzilsiz").
 * `withRegion: false` — viloyat alohida belgi bilan chizilgan joyda (karta).
 */
export function formatDeliveryAddress(
  order: AddressHost,
  { withRegion = true }: { withRegion?: boolean } = {},
): string | null {
  const info = order.deliveryInfo;
  const street = info?.address?.trim() ?? "";
  const region = withRegion ? (info?.regionDisplay ?? regionLabel(info?.region)) : "";
  const district = order.zoning.districtDisplay ?? order.zoning.district ?? "";
  const locality = info?.locality ?? "";
  const parts = [region, district, locality]
    .map((part) => part.trim())
    .filter((part) => part && !containsPart(street, part));
  if (street) parts.push(street);
  return parts.length ? parts.join(", ") : null;
}

export type AddressChangedBadge = {
  by: AddressChangedBy;
  label: string;
  /** Tooltip — qayerda to'liq tarixni ko'rish mumkin. */
  hint: string;
};

/** To'liq satrlar — tarjima qatlami butun matnni bitta kalit sifatida oladi. */
const BADGE_LABELS: Record<AddressChangedBy, string> = {
  courier: "Manzil o'zgartirilgan (kuryer)",
  logist: "Manzil o'zgartirilgan (logist)",
  client: "Manzil o'zgartirilgan (mijoz)",
};

/**
 * Kartadagi belgi — faqat `address_changed_by` kelganda. Kuryer o'zgartirgani
 * logist uchun eng muhimi: mijoz manzili ham yangilangan bo'lishi mumkin.
 */
export function addressChangedBadge(
  order: { deliveryInfo: Pick<DeliveryInfo, "addressChangedBy"> | null },
): AddressChangedBadge | null {
  const by = order.deliveryInfo?.addressChangedBy ?? null;
  if (!by) return null;
  return {
    by,
    label: BADGE_LABELS[by],
    hint: "Oldingi va yangi manzil — buyurtma tarixida",
  };
}
