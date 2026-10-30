"use client";

import { useQuery } from "@tanstack/react-query";

import type { NavItem } from "@/components/panel/nav";
import { fetchStaffUnread } from "@/features/staff-chat/api";
import { useOrdersWithUnreadChat } from "@/features/orders/use-order-chat-unread";
import { queryKeys } from "@/lib/query-keys";
import { useBadgeStore } from "@/stores/badge-store";
import { useCourierInboxCount } from "@/stores/courier-inbox-store";

/**
 * Bo'lim yonidagi signallar — rail, tepa panel va mobil menyu uchun bitta.
 *
 *   `count`      — yangi yozuv (buyurtma, transfer) yoki xodimlar chatidagi
 *                  o'qilmaganlar soni;
 *   `discussion` — buyurtma muhokamasida javob kutilmoqda — xabar ikonkasi;
 *   `chats`      — chatida o'qilmagan xabari bor BUYURTMALAR soni (faqat
 *                  "Buyurtmalar" bo'limi uchun; xabarlar soni emas).
 */
export function useNavSignals(badge: NavItem["badge"]): {
  count: number;
  discussion: boolean;
  chats: number;
} {
  const newOrders = useBadgeStore((state) => state.newOrders);
  const incomingTransfers = useBadgeStore((state) => state.incomingTransfers);
  const orderChats = useOrdersWithUnreadChat();
  // Kuryer xabari kutayotgan buyurtmalar ham "Buyurtmalar" belgisiga qo'shiladi.
  const courierChats = useCourierInboxCount();

  const staff = useQuery({
    queryKey: queryKeys.staffUnread,
    queryFn: ({ signal }) => fetchStaffUnread(signal),
    enabled: badge === "staff",
    // Soket asosiy kanal; so'rov — uzilib qolgan holat uchun zaxira.
    refetchInterval: 60_000,
  });

  if (badge === "orders") {
    const chats = orderChats + courierChats;
    return { count: newOrders, discussion: chats > 0, chats };
  }
  if (badge === "transfers") {
    return { count: incomingTransfers, discussion: false, chats: 0 };
  }
  if (badge === "staff") {
    return { count: staff.data?.unread ?? 0, discussion: false, chats: 0 };
  }
  return { count: 0, discussion: false, chats: 0 };
}
