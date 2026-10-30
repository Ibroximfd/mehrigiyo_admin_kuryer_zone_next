import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";

import type { StaffChannelPreview, UnreadByOrder } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Real vaqt yamog'i (`realtime.ts` chaqiradi)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Buyurtma kanaliga begona xabar tushdi: hisoblagich +1, oxirgi xabar
 * yangilanadi, yangi buyurtma ro'yxat boshiga qo'shiladi (`orders_count`
 * ham +1). Kesh hali yuklanmagan bo'lsa tegilmaydi — birinchi so'rov
 * haqiqatni o'zi olib keladi.
 */
export function bumpOrderChatUnread(
  queryClient: QueryClient,
  entry: {
    orderId: string;
    channelId: number;
    lastMessage: StaffChannelPreview;
    /** Tizim xabari — sanaladi, lekin oxirgi ODAM xabarini almashtirmaydi. */
    system?: boolean;
  },
): void {
  queryClient.setQueryData<UnreadByOrder>(
    queryKeys.staffUnreadByOrder,
    (current) => {
      if (!current) return current;
      const existing = current.orders.find(
        (item) => item.orderId === entry.orderId,
      );
      const next = {
        orderId: entry.orderId,
        channelId: entry.channelId,
        unread: (existing?.unread ?? 0) + 1,
        systemUnread: (existing?.systemUnread ?? 0) + (entry.system ? 1 : 0),
        lastMessage: entry.system
          ? (existing?.lastMessage ?? null)
          : entry.lastMessage,
      };
      return {
        // Tartib — oxirgi xabar (§13.1): yangilangani tepaga.
        orders: [
          next,
          ...current.orders.filter((item) => item.orderId !== entry.orderId),
        ],
        ordersCount: existing ? current.ordersCount : current.ordersCount + 1,
      };
    },
  );
}

/** Kanal o'qildi — o'sha buyurtma belgidan chiqadi. */
export function clearOrderChatUnread(
  queryClient: QueryClient,
  channelId: number,
): void {
  queryClient.setQueryData<UnreadByOrder>(
    queryKeys.staffUnreadByOrder,
    (current) => {
      if (!current) return current;
      if (!current.orders.some((item) => item.channelId === channelId))
        return current;
      return {
        orders: current.orders.filter((item) => item.channelId !== channelId),
        ordersCount: Math.max(0, current.ordersCount - 1),
      };
    },
  );
}
