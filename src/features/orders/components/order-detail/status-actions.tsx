"use client";

import { BadgeCheck, ChevronDown, LoaderCircle, Truck, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NEXT_ACTION_LABEL,
  allowedStatusChanges,
  nextFlowStatus,
} from "@/features/orders/permissions";
import { orderStatusInfo } from "@/features/orders/types";
import type { LogistOrder, OrderStatus } from "@/features/orders/types";

/**
 * Holat blokidagi tugmalar: tabiiy keyingi qadam — katta amber tugma,
 * qolgan ruxsatli o'tishlar (orqaga, atkaz, tiklash) — "Boshqa status ▾".
 * Ruxsatsiz o'tish umuman ko'rinmaydi (`02` §2.3).
 */
export function StatusActions({
  order,
  pending,
  onSelect,
}: {
  order: LogistOrder;
  pending: boolean;
  onSelect: (status: string) => void;
}) {
  const next = nextFlowStatus(order.status);
  const others = allowedStatusChanges(order.status).filter((status) => status !== next);
  const NextIcon =
    order.status === "shipping" ? Check : order.status === "pending" ? BadgeCheck : Truck;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {next ? (
        <Button
          size="lg"
          disabled={pending}
          onClick={() => onSelect(next)}
          className="bg-amber text-amber-ink hover:bg-amber-hover h-10"
        >
          {pending ? <LoaderCircle className="animate-spin" /> : <NextIcon />}
          {NEXT_ACTION_LABEL[order.status as OrderStatus] ?? orderStatusInfo(next).label}
        </Button>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="lg" disabled={pending || others.length === 0} className="h-10">
            Boshqa status
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {others.map((status) => {
            const info = orderStatusInfo(status);
            return (
              <DropdownMenuItem key={status} onSelect={() => onSelect(status)}>
                <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: info.mark }} />
                {status === "cancelled"
                  ? "Atkaz qilish…"
                  : order.status === "pending" && status === "shipping"
                    ? "Tasdiqlab, yo'lga chiqarish…"
                    : info.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
