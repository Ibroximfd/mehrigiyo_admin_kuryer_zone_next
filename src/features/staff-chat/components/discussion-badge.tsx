"use client";

import { MessagesSquare } from "lucide-react";

import {
  useOrderChatUnreadEntry,
  useOrdersWithUnreadChatCount,
} from "@/features/staff-chat/order-chat-unread";
import { cn } from "@/lib/utils";

/**
 * Shu buyurtma muhokamasida o'qilmagan xabarlar soni.
 *
 * Manba — `unread-by-order/` (2026-10-01 C §13.1): chegarasiz, bitta
 * kesh, kartochkalar soniga bog'liq emas. Har chaqiruvchi `select` orqali
 * faqat o'z sonini oladi; real vaqt shu keshni joyida to'g'rilaydi.
 */
export function useDiscussionUnread(orderId: string): number {
  return useOrderChatUnreadEntry(orderId)?.count ?? 0;
}

/**
 * Javob kutayotgan buyurtma muhokamalari bormi — yon/pastki menyudagi
 * "Buyurtmalar" belgisi. Son — o'qilmagani bor BUYURTMALAR (§13.2).
 */
export function useOrderDiscussionUnread(): number {
  return useOrdersWithUnreadChatCount();
}

/**
 * "Muhokamada yangi xabar" belgisi — buyurtma kartochkasi va ro'yxat
 * qatorida.
 *
 * Operator buyurtmalar bilan ishlab turadi va xodimlar chatini har doim
 * ochib o'tirmaydi; savol aynan shu buyurtma haqida bo'lsa, u shu yerda
 * ko'rinishi kerak.
 *
 * O'qilmagani bo'lmasa hech narsa chizilmaydi — doska belgi bilan to'lib
 * ketmaydi.
 */
export function DiscussionBadge({
  orderId,
  className,
}: {
  orderId: string;
  className?: string;
}) {
  const unread = useDiscussionUnread(orderId);
  if (unread === 0) return null;

  const label = `Muhokamada ${unread} ta yangi xabar`;

  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "bg-danger text-white tabular text-micro inline-flex h-[17px] shrink-0 items-center gap-0.5 rounded-full px-1.5 font-bold tracking-normal",
        className,
      )}
    >
      <MessagesSquare className="size-3" aria-hidden />
      {unread > 99 ? "99+" : unread}
    </span>
  );
}
