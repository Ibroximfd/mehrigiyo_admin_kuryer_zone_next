"use client";

import {
  useOrderChatUnread,
  useOrderChatUnreadEntry,
  useOrdersWithUnreadChatCount,
  type OrderChatUnread,
} from "@/features/staff-chat/order-chat-unread";

/**
 * Buyurtma chatidagi o'qilmaganlar — buyurtmalar bo'limi uchun ko'rinishlar.
 *
 * Yagona manba — `GET /staff-chat/unread-by-order/` (2026-10-01 C §13.1,
 * `staff-chat/order-chat-unread.ts`): chegarasiz, bitta so'rov, real vaqtda
 * joyida yamaladi. Bu yerda faqat undan hosilalar: butun xarita (doska,
 * chip), bitta karta va menyu soni.
 */
export type { OrderChatUnread };

export function useOrderChatUnreadMap(): Record<string, OrderChatUnread> {
  return useOrderChatUnread();
}

/** Bitta karta uchun; o'qilmagani bo'lmasa `null`. */
export function useOrderChatUnreadFor(orderId: string): OrderChatUnread | null {
  return useOrderChatUnreadEntry(orderId);
}

/** Yon panel va chip: o'qilmagan xabari bor BUYURTMALAR soni (server `orders_count`). */
export function useOrdersWithUnreadChat(): number {
  return useOrdersWithUnreadChatCount();
}
