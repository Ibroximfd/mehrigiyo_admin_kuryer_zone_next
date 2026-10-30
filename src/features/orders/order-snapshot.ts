import { parseDate } from "@/lib/format";
import { asOptionalBool, asOptionalNumber, asOptionalString, isRecord } from "@/lib/parse";

import type { DistrictNameLookup } from "@/features/zones/district-lookup";

import { asAddressChangedBy } from "./address";
import { mapOrderCashback } from "./cashback";
import { mapNeedsReview, mapOrderGeocode } from "./geocode";

import {
  mapCancelInfo,
  mapConfirmation,
  mapAcks,
  mapCourierRef,
  mapFilialRef,
  mapLogistOrder,
  mapPendingReason,
  mapPersonRef,
} from "./types";
import type { DeliveryInfo, LogistOrder } from "./types";
import { EMPTY_ZONING, mergeZoningSnapshot } from "./zoning";

/**
 * WS hodisasidagi `order` bloki bilan kartochkani yamash.
 *
 * `order_status_changed`, `order_updated` va `order_payment_changed`
 * hodisalari `order` ni **qisqa karta** sifatida olib keladi
 * (`FLUTTER_ORDER_PIPELINE_V2` §5.4, §5.7; 2026-10-01 §6.5): `{id,
 * order_number, status, created_at, payment, lock, confirmation,
 * responsible_operator, filial}` — mijoz, tarkib, summa YO'Q. Uni `mapLogistOrder` bilan to'liq
 * buyurtma deb o'qish kartochkani bo'sh ism, `0 so'm` va bo'sh tarkib bilan
 * almashtirardi. Shuning uchun faqat **kelgan** kalitlar qo'llanadi.
 *
 * To'liq buyurtma (mijoz yoki tarkib bilan) kelsa — o'zi to'liq o'qiladi.
 */

/** Hodisa to'liq buyurtmani olib kelganmi (qisqa karta emas). */
export function isFullOrderPayload(raw: unknown): boolean {
  return isRecord(raw) && (isRecord(raw.client) || Array.isArray(raw.items));
}

/** Yuk faqat `has` bo'lgan kalitlarni qo'llash uchun. */
function has(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

export function mergeOrderSnapshot(
  order: LogistOrder,
  raw: unknown,
): LogistOrder {
  if (!isRecord(raw)) return order;
  if (isFullOrderPayload(raw)) {
    const full = mapLogistOrder(raw);
    // Ustun sarlavhasi bilan bir xil yorliq qolsin — status ko'chirishni
    // chaqiruvchi boshqaradi.
    return {
      ...full,
      id: order.id,
      statusDisplay: order.statusDisplay,
      // Javobda `acknowledged_by` bo'lmasa (qisqa serializer) "Oldim" yo'qolmasin.
      acknowledgedBy: full.acknowledgedBy ?? order.acknowledgedBy,
      confirmation: mergeConfirmation(order, full.confirmation),
    };
  }

  const next: LogistOrder = { ...order };

  if (isRecord(raw.payment)) {
    const payment = raw.payment;
    if (has(payment, "status")) {
      next.paymentStatus = asOptionalString(payment.status);
    }
    if (has(payment, "is_paid")) {
      next.isPaid = asOptionalBool(payment.is_paid);
    } else if (has(payment, "status")) {
      // `payment.is_paid` = `payment_status == "paid"` — bir ma'noli.
      next.isPaid = isPaidStatus(next.paymentStatus);
    }
    if (has(payment, "method")) {
      next.paymentMethod = asOptionalString(payment.method) ?? order.paymentMethod;
    }
    if (has(payment, "provider")) {
      next.paymentProvider = asOptionalString(payment.provider);
    }
    if (has(payment, "paid_at")) next.paidAt = parseDate(payment.paid_at);
  }

  if (has(raw, "pending_reason")) {
    next.pendingReason = mapPendingReason(raw.pending_reason);
  }
  // `responsible_operator` har doim keladi, oldindan hisoblanmagan bo'lsa
  // `null` (§5.4) — `null` "yo'q" emas, "hisoblanmagan": eskisi qoladi.
  if (isRecord(raw.responsible_operator)) {
    next.responsibleOperator =
      mapPersonRef(raw.responsible_operator) ?? order.responsibleOperator;
  }
  if (has(raw, "confirmation")) {
    next.confirmation = mergeConfirmation(order, mapConfirmation(raw.confirmation));
    next.confirmedAt = next.confirmation?.confirmedAt ?? order.confirmedAt;
  }
  if (has(raw, "created_at")) {
    next.createdAt = parseDate(raw.created_at) ?? order.createdAt;
  }
  if (has(raw, "confirmed_at")) {
    next.confirmedAt = parseDate(raw.confirmed_at) ?? next.confirmedAt;
  }
  /*
   * Vaqt maydonlari (2026-10-01 C §7, §9.1). `updated_at` ataylab
   * olinmaydi: WS dagisi `pre_save` tufayli bir qadam orqada (§9.1).
   */
  if (has(raw, "status_changed_at")) {
    next.statusChangedAt = parseDate(raw.status_changed_at) ?? order.statusChangedAt;
  }
  if (has(raw, "shipped_at")) next.shippedAt = parseDate(raw.shipped_at);
  if (has(raw, "delivered_at")) next.deliveredAt = parseDate(raw.delivered_at);
  if (has(raw, "pinned_at")) next.pinnedAt = parseDate(raw.pinned_at);
  if (has(raw, "cashback")) next.cashback = mapOrderCashback(raw.cashback);
  if (has(raw, "cancel")) next.cancel = mapCancelInfo(raw.cancel);
  if (isRecord(raw.filial)) next.filial = mapFilialRef(raw.filial) ?? order.filial;
  if (has(raw, "acknowledged_by")) {
    next.acknowledgedBy = mapAcks(raw.acknowledged_by) ?? order.acknowledgedBy;
  }

  // Kuryer (`null` — olib tashlangan) va hudud bloklari (2026-10-15).
  if (has(raw, "courier")) next.courier = mapCourierRef(raw.courier);
  next.zoning = mergeZoningSnapshot(order.zoning ?? EMPTY_ZONING, raw);
  // Geokod (2026-10-16 B4): `delivery` kelsa — o'qiladi, kelmasa eskisi qoladi.
  if (isRecord(raw.delivery)) {
    next.geocode = mapOrderGeocode(raw.delivery) ?? order.geocode ?? null;
    next.deliveryInfo = mergeDeliveryInfoSnapshot(order.deliveryInfo, raw.delivery);
  }
  if (has(raw, "needs_review")) next.needsReview = mapNeedsReview(raw);

  const payable = asOptionalNumber(raw.payable_amount);
  if (payable !== null) next.payableAmount = payable;
  const total = asOptionalNumber(raw.total_amount);
  if (total !== null) next.totalAmount = total;

  return next;
}

const EMPTY_DELIVERY_INFO: DeliveryInfo = {
  address: null,
  locality: null,
  addressChangedBy: null,
  region: null,
  regionDisplay: null,
  note: null,
  contactName: null,
  contactPhone: null,
  lat: null,
  lng: null,
};

/**
 * Qisqa kartadagi `delivery` bloki — manzil maydonlari (`HUDUD_3` §1–§2:
 * kuryer manzilni o'zgartirganda `order_updated` keladi). Faqat **kelgan**
 * kalitlar qo'llanadi; `null` — "tozalangan".
 */
export function mergeDeliveryInfoSnapshot(
  info: DeliveryInfo | null,
  delivery: Record<string, unknown>,
): DeliveryInfo | null {
  const next: DeliveryInfo = { ...(info ?? EMPTY_DELIVERY_INFO) };
  if (has(delivery, "address_text")) next.address = asOptionalString(delivery.address_text);
  else if (has(delivery, "address")) next.address = asOptionalString(delivery.address);
  if (has(delivery, "locality")) next.locality = asOptionalString(delivery.locality);
  if (has(delivery, "address_changed_by")) {
    next.addressChangedBy = asAddressChangedBy(delivery.address_changed_by);
  }
  if (has(delivery, "region")) next.region = asOptionalString(delivery.region);
  if (has(delivery, "region_display")) next.regionDisplay = asOptionalString(delivery.region_display);
  if (has(delivery, "note")) next.note = asOptionalString(delivery.note);
  if (has(delivery, "lat")) next.lat = asOptionalNumber(delivery.lat);
  if (has(delivery, "lng")) next.lng = asOptionalNumber(delivery.lng);
  return Object.values(next).some((value) => value !== null) ? next : info;
}

/**
 * WS qisqa kartasida `district_display` ATAYLAB yo'q (`HUDUD_3` javobi Q7 —
 * karta to'lov signali ichida yasaladi), faqat `delivery.district` kodi.
 * Nom `/meta/regions/` katalogidan qo'yiladi — karta kod ko'rsatmaydi va
 * eski nomini yo'qotmaydi. Katalogda topilmasa yuk o'zgarmaydi
 * (`mergeZoningSnapshot` o'zi hal qiladi).
 */
export function withDistrictDisplay(raw: unknown, nameOf: DistrictNameLookup): unknown {
  if (!isRecord(raw) || !isRecord(raw.delivery)) return raw;
  const delivery = raw.delivery;
  if (has(delivery, "district_display")) return raw;
  const code = asOptionalString(delivery.district);
  if (!code) return raw;
  const name = nameOf(code);
  if (!name) return raw;
  return { ...raw, delivery: { ...delivery, district_display: name } };
}

/**
 * WS yo'lida `confirmed_by_party.name` ATAYLAB `null` (2026-10-01 §6.5 —
 * to'lov tranzaksiyasida qo'shimcha so'rov qilinmaydi), ism faqat REST
 * javobida. Shu tasdiqlovchining ismi kartada bo'lsa — saqlanadi, aks holda
 * "Logist Aziz tasdiqladi" hodisadan keyin "Logist tasdiqladi" ga tushardi.
 */
function mergeConfirmation(
  order: LogistOrder,
  incoming: LogistOrder["confirmation"],
): LogistOrder["confirmation"] {
  if (!incoming) return order.confirmation;
  const previous = order.confirmation?.confirmer ?? null;
  const next = incoming.confirmer;
  if (!next || next.name || !previous?.name) return incoming;
  const samePerson =
    (next.type ?? previous.type) === previous.type &&
    (next.id === null || previous.id === null || next.id === previous.id);
  return samePerson ? { ...incoming, confirmer: { ...next, name: previous.name } } : incoming;
}

/**
 * `order_payment_changed` (§5.7): `to_status` — **to'lov** holati
 * (`payment_status`), buyurtma statusi EMAS.
 */
export function applyPaymentStatus(
  order: LogistOrder,
  paymentStatus: string | null,
  paymentMethod?: string | null,
): LogistOrder {
  if (!paymentStatus && !paymentMethod) return order;
  return {
    ...order,
    ...(paymentStatus
      ? { paymentStatus, isPaid: isPaidStatus(paymentStatus) }
      : {}),
    ...(paymentMethod ? { paymentMethod } : {}),
  };
}

/** Mijoz to'laganmi: kassada (`paid`) yoki kuryerda (`with_courier`). */
function isPaidStatus(status: string | null): boolean {
  return status === "paid" || status === "with_courier";
}
