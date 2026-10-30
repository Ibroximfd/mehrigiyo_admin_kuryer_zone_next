"use client";

import { MessagesSquare } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useOrderChatUnreadFor } from "@/features/orders/use-order-chat-unread";
import { formatTime, parseDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Buyurtma chatida o'qilmagan xabar — kartochka va ro'yxat qatorida.
 *
 * Bosilsa o'sha buyurtma chati ochiladi (`?discuss=`), ustiga kelinsa
 * oxirgi xabar ko'rinadi — logist kartani ochmasdan nima so'ralganini
 * biladi. O'qilmagan bo'lmasa hech narsa chizilmaydi.
 */
export function OrderChatBadge({
  orderId,
  onOpen,
  className,
}: {
  orderId: string;
  /** Berilmasa belgi faqat ko'rsatadi (bosilmaydi). */
  onOpen?: (orderId: string) => void;
  className?: string;
}) {
  const chat = useOrderChatUnreadFor(orderId);
  if (!chat) return null;

  const count = chat.count > 99 ? "99+" : String(chat.count);
  const label = `Chatda ${chat.count} ta yangi xabar`;
  const last = chat.lastMessage;
  const at = last?.at ? parseDate(last.at) : null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onOpen?.(orderId);
          }}
          className={cn(
            "bg-danger tabular text-micro inline-flex h-[18px] shrink-0 items-center gap-0.5 rounded-full px-1.5 font-bold text-white",
            "transition-[filter] duration-(--dur-micro) hover:brightness-110",
            className,
          )}
        >
          <MessagesSquare className="size-3" aria-hidden />
          {count}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="flex max-w-72 flex-col items-start gap-0.5 text-left">
        <span className="font-semibold">{label}</span>
        {last?.text ? (
          <span className="line-clamp-3 opacity-90" data-no-translit>
            {last.by ? `${last.by}: ` : ""}
            {last.text}
          </span>
        ) : null}
        {at ? <span className="tabular opacity-70">{formatTime(at)}</span> : null}
      </TooltipContent>
    </Tooltip>
  );
}
