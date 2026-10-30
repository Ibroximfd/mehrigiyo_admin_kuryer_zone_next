"use client";

import { Truck } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCourierInboxFor } from "@/stores/courier-inbox-store";

/**
 * Kuryerdan kelgan, hali ochilmagan xabar — kartochka va ro'yxat qatorida.
 * Ustiga kelinsa kim va nima yozgani; bosilsa buyurtma (chati bilan)
 * ochiladi. Xabar bo'lmasa hech narsa chizilmaydi.
 */
export function CourierMessageBadge({
  orderId,
  onOpen,
  className,
}: {
  orderId: string;
  onOpen?: (orderId: string) => void;
  className?: string;
}) {
  const entry = useCourierInboxFor(orderId);
  if (!entry) return null;

  const count = entry.count > 99 ? "99+" : String(entry.count);
  const label = `Kuryerdan ${entry.count} ta yangi xabar`;

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
            "bg-brand text-brand-ink tabular text-micro inline-flex h-[18px] shrink-0 items-center gap-0.5 rounded-full px-1.5 font-bold",
            "transition-[filter] duration-(--dur-micro) hover:brightness-110",
            className,
          )}
        >
          <Truck className="size-3" aria-hidden />
          {count}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="flex max-w-72 flex-col items-start gap-0.5 text-left"
      >
        <span className="font-semibold">{label}</span>
        <span className="line-clamp-3 opacity-90" data-no-translit>
          {`${entry.courierName}: ${entry.preview}`}
        </span>
        <span className="tabular opacity-70">
          {formatTime(new Date(entry.at))}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}
