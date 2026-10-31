import { containsPart } from "./delivery-address";
import { regionLabel } from "./regions";
import type { DeliveryInfo } from "./types";
import type { OrderZoning } from "./zoning";

/**
 * Manzil qatori va manzil o'zgarishi belgisi (`HUDUD_BACKEND_TALABLAR_3`
 * §1–§2) — sof qoidalar, karta/ro'yxat/detal shu yerdan o'qiydi.
 */

/** `delivery.address_changed_by` — kim o'zgartirgan. */
export type AddressChangedBy = "courier" | "logist" | "client" | "chief" | "crm";

export function asAddressChangedBy(value: unknown): AddressChangedBy | null {
  return value === "courier" || value === "logist" || value === "client" || value === "chief" || value === "crm"
    ? value
    : null;
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

