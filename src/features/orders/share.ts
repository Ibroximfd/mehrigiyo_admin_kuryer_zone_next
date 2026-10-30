import { formatPhone, formatSom } from "@/lib/format";
import { tr } from "@/lib/i18n/now";

import { formatDeliveryAddress } from "./address";
import { pointsNote } from "./points";
import { mapLink, paymentView } from "./types";
import type { LogistOrder } from "./types";

/**
 * Kuryerga pul haqida bir og'iz.
 *
 * Naqd bo'lmagan buyurtma ham to'lanmagan bo'lishi mumkin (karta tanlangan,
 * lekin pul tushmagan) — bunda kuryer pulni baribir olishi kerak, aks holda
 * mahsulot tekinga ketadi. Shuning uchun matn to'lov TURIDAN emas, to'lov
 * HOLATIDAN chiqadi.
 */
function moneyNote(order: LogistOrder): string {
  const payment = paymentView(order);
  if (payment.state === "paid" || payment.state === "with_courier") {
    return ` — ${tr("TO'LANGAN")}`;
  }
  if (payment.state === "cod") return ` — ${tr("NAQD OLINADI")}`;
  if (payment.needsAttention) return ` — ${tr("TO'LANMAGAN, PUL OLINADI")}`;
  return "";
}

/**
 * Buyurtmani kuryerga ulashish — Telegram/SMS uchun tayyor matn (tanlangan
 * tilda: DOM emas, shuning uchun `tr`; mijoz ma'lumoti tegilmaydi)
 * (LOGIST-PLAN §14: kuryer ilovasi chiqquncha eng amaliy yo'l).
 */
export function buildCourierText(order: LogistOrder): string {
  const address = formatDeliveryAddress(order);
  const map = mapLink(order.deliveryInfo);

  const lines = [
    `📦 ${order.orderNumber || order.id.slice(0, 8)}`,
    `👤 ${order.client.fullName || tr("Mijoz")} · ${formatPhone(order.client.phone)}`,
    `📍 ${address || tr("Manzil ko'rsatilmagan")}`,
    `💰 ${tr(formatSom(order.payableAmount))}${moneyNote(order)}`,
  ];

  // Ball chegirmasi bo'lsa — alohida qator: kuryer summaning nega kamayganini
  // ko'rsin, mol summasi esa qavs ichida qoladi.
  const points = pointsNote(order);
  if (points) lines.push(`⭐ ${tr(points)}`);

  if (order.deliveryInfo?.note) lines.push(`🚪 ${order.deliveryInfo.note}`);
  if (order.logistNote) lines.push(`📝 ${order.logistNote}`);
  if (map) lines.push(`🗺 ${map}`);

  return lines.join("\n");
}

/** Telegram ulashish oynasi — matn tayyor holda ochiladi. */
export function telegramShareUrl(order: LogistOrder): string {
  const map = mapLink(order.deliveryInfo) ?? "https://yandex.uz/maps/";
  return `https://t.me/share/url?url=${encodeURIComponent(map)}&text=${encodeURIComponent(
    buildCourierText(order),
  )}`;
}

/** SMS ilovasini matn bilan ochadi (kuryer telefoni bo'lsa unga). */
export function smsShareUrl(order: LogistOrder): string {
  const to = order.courier?.phone?.replace(/\D/g, "") ?? "";
  return `sms:${to}?&body=${encodeURIComponent(buildCourierText(order))}`;
}

/** Matnni buferga nusxalaydi; muvaffaqiyatni qaytaradi. */
export async function copyCourierText(order: LogistOrder): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(buildCourierText(order));
    return true;
  } catch {
    return false;
  }
}
