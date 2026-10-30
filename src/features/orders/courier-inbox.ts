import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { fetchOrderDetail } from "@/features/orders/api";
import {
  courierMessagePreview,
  findOrderNumberInCache,
  mapCourierMessage,
} from "@/features/orders/courier-messages";
import { asString } from "@/lib/parse";
import { useCourierInboxStore } from "@/stores/courier-inbox-store";

/** Logist hozir aynan shu buyurtmani ochib turibdimi (chat ko'rinib turibdi). */
function isViewingOrder(orderId: string): boolean {
  if (typeof window === "undefined" || document.hidden) return false;
  const url = new URL(window.location.href);
  return (
    url.pathname.replace(/\/$/, "") === "/orders" &&
    url.searchParams.get("order") === orderId
  );
}

export type CourierMessageNotice = {
  orderId: string;
  title: string;
  body: string;
};

/**
 * Kuryer chatga yozdi (`order_message_created`): qaysi buyurtma, kim va
 * nima yozgani — xabarnoma, buyurtma kartasidagi belgi va menyu hisobi.
 * Logist o'sha buyurtmani ochib turgan bo'lsa jim (chat o'zi yangilanadi).
 *
 * Qaytaradi: ovoz/brauzer bildirishnomasi uchun matn, yoki `null`.
 */
export function notifyCourierMessage(
  queryClient: QueryClient,
  payload: Record<string, unknown>,
  openOrder: (orderId: string) => void,
): CourierMessageNotice | null {
  const orderId = asString(payload.order_id);
  const message = mapCourierMessage(payload.message);
  if (!orderId || message.role !== "courier") return null;
  if (isViewingOrder(orderId)) return null;

  const inbox = useCourierInboxStore.getState();
  const orderNumber = findOrderNumberInCache(queryClient, orderId);
  const courierName = message.authorName || "Kuryer";
  const preview = courierMessagePreview(message);

  inbox.add({
    orderId,
    orderNumber,
    courierName,
    preview,
    at: message.createdAt?.getTime() ?? Date.now(),
  });

  const title = orderNumber
    ? `#${orderNumber} · ${courierName}`
    : `Kuryerdan xabar · ${courierName}`;

  // Raqam keshda bo'lmasa (buyurtma ro'yxatda ko'rinmagan) — keyin to'ldiramiz.
  if (!orderNumber) {
    void fetchOrderDetail(orderId)
      .then((detail) => {
        if (detail.order.orderNumber) {
          useCourierInboxStore
            .getState()
            .setOrderNumber(orderId, detail.order.orderNumber);
        }
      })
      .catch(() => {
        // Raqamsiz ham belgi va havola ishlaydi.
      });
  }

  toast.info(title, {
    description: preview,
    duration: 10_000,
    action: { label: "Ochish", onClick: () => openOrder(orderId) },
  });

  return { orderId, title, body: preview };
}
