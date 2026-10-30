import { ACTIVE_STATUSES } from "./types";
import type { LogistOrder, OrderStatus } from "./types";

/**
 * Kartadagi ogohlantirish belgilari uchun sof hisob-kitoblar:
 * SLA (qancha turibdi), manzil nazorati, dublikat telefonlar.
 * Hammasi klientda, pulga tegmaydi (A5 qoidasi buzilmaydi).
 */

/** Logist ishlaydigan faol bosqichlar (`confirmed`, `shipping`) — belgilar faqat shularda. */
export function isActiveOrder(order: Pick<LogistOrder, "status">): boolean {
  return ACTIVE_STATUSES.includes(order.status as OrderStatus);
}

/** Kuryer yo'lga chiqishidan OLDIN ko'rinishi kerak bo'lgan muammo. */
/**
 * Manzil "aniqlanmagan" — na viloyat, na yaroqli manzil matni bor.
 * Viloyat yolg'iz ham, manzil yolg'iz ham yetarli: manzil viloyatdan
 * keyingi aniqlashtirish.
 */
export function hasAddressIssue(
  order: Pick<LogistOrder, "deliveryInfo">,
): boolean {
  const info = order.deliveryInfo;
  const region = (info?.regionDisplay ?? info?.region ?? "").trim();
  const address = info?.address?.trim() ?? "";
  return !region && address.length < 5;
}

/** Telefonni raqamlargagina keltiradi — turli yozuvlar bitta kalitga tushadi. */
export function normalizePhoneKey(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Bir raqamdan bir nechta FAOL buyurtma — dublikat bo'lishi mumkin.
 * Qaytgan to'plamda shunday telefonlar kaliti yotadi.
 */
export function buildDuplicatePhones(
  orders: Array<Pick<LogistOrder, "status" | "client">>,
): Set<string> {
  const counts = new Map<string, number>();

  for (const order of orders) {
    if (!isActiveOrder(order)) continue;
    const key = normalizePhoneKey(order.client.phone);
    if (key.length < 7) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const duplicates = new Set<string>();
  for (const [key, count] of counts) {
    if (count > 1) duplicates.add(key);
  }
  return duplicates;
}
