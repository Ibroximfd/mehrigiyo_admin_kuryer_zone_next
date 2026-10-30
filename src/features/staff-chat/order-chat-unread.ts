"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

import { queryKeys } from "@/lib/query-keys";

import { fetchUnreadByOrder } from "./api";
import { useStaffFallbackPoll } from "./poll";
import type { StaffChannelPreview, UnreadByOrder } from "./types";

/**
 * Buyurtma chatlaridagi o'qilmaganlar — doska kartasi, ustun, chip va
 * menyu belgisi uchun YAGONA manba: `GET /staff-chat/unread-by-order/`
 * (2026-10-01 C §13.1).
 *
 * Ilgari belgi `channels/?limit=50` dan olinardi va faol muhokama 50 tadan
 * oshgach qolgan buyurtmalar belgisiz qolardi. Yangi endpoint chegarasiz,
 * parametrsiz va kartochkalar soniga bog'liq emas — bitta so'rov. Real vaqt
 * (`staff_message`, `staff_badge` — endi `order_id` bilan, §9.3) shu keshni
 * joyida yamaydi; soket uzilganda zaxira so'rov (`useStaffFallbackPoll`).
 *
 * `Record` ataylab (`Map` emas): React Query oddiy obyektga struktura
 * ulashishni qo'llaydi — qiymat o'zgarmasa havola ham o'zgarmaydi va
 * doska sababsiz qayta chizilmaydi.
 */
export type OrderChatUnread = {
  /** O'qilmagan xabarlar soni (> 0). O'z xabarlari kirmaydi. */
  count: number;
  /** Oxirgi xabar — kartadagi tooltip/preview uchun. */
  lastMessage: StaffChannelPreview | null;
  /** Chatni ochish: `ROUTES.staffChat + ?channel=<id>`. */
  channelId: number;
};

const EMPTY: Record<string, OrderChatUnread> = {};

export function selectOrderChatUnread(
  data: UnreadByOrder,
): Record<string, OrderChatUnread> {
  const map: Record<string, OrderChatUnread> = {};
  for (const entry of data.orders) {
    map[entry.orderId] = {
      count: entry.unread,
      lastMessage: entry.lastMessage,
      channelId: entry.channelId,
    };
  }
  return map;
}

function selectOrdersCount(data: UnreadByOrder): number {
  return data.ordersCount;
}

function useUnreadByOrderQuery<T>(select: (data: UnreadByOrder) => T) {
  const refetchInterval = useStaffFallbackPoll();
  return useQuery({
    queryKey: queryKeys.staffUnreadByOrder,
    queryFn: ({ signal }) => fetchUnreadByOrder(signal),
    select,
    refetchInterval,
  });
}

/** `orderId` → o'qilmagan chat ma'lumoti. O'qilmagani yo'q buyurtma kalitda yo'q. */
export function useOrderChatUnread(): Record<string, OrderChatUnread> {
  return useUnreadByOrderQuery(selectOrderChatUnread).data ?? EMPTY;
}

/**
 * Bitta karta uchun — `select` faqat o'z yozuvini qaytaradi: boshqa
 * buyurtmaga xabar tushganda bu karta qayta chizilmaydi.
 */
export function useOrderChatUnreadEntry(
  orderId: string,
): OrderChatUnread | null {
  const select = useCallback(
    (data: UnreadByOrder): OrderChatUnread | null => {
      const entry = data.orders.find((item) => item.orderId === orderId);
      return entry
        ? {
            count: entry.unread,
            lastMessage: entry.lastMessage,
            channelId: entry.channelId,
          }
        : null;
    },
    [orderId],
  );
  return useUnreadByOrderQuery(select).data ?? null;
}

/**
 * O'qilmagani bor BUYURTMALAR soni (xabarlar emas) — serverning
 * `orders_count` i (= `unread-count/` dagi `order_channels`, §13.2).
 */
export function useOrdersWithUnreadChatCount(): number {
  return useUnreadByOrderQuery(selectOrdersCount).data ?? 0;
}
