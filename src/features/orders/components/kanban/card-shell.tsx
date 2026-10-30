"use client";

import { orderStatusInfo } from "@/features/orders/types";
import type { LogistOrder } from "@/features/orders/types";
import { cn } from "@/lib/utils";

/**
 * Kartochka ramkasi — umurtqa (status rangi), hover ko'tarilishi, sudrash
 * holatlari va tanlov halqasi. Mazmun bosqichga qarab ichkarida.
 *
 * Ramka o'zi `role="button"` emas: ichida qo'ng'iroq, katakcha va amal
 * tugmalari bor (ichma-ich interaktiv element bo'lmasin). Sichqoncha bilan
 * istalgan joyini bosish ochadi; klaviatura uchun — sarlavhadagi raqam tugmasi.
 */
export function CardShell({
  order,
  dragging,
  overlay,
  locked,
  selected,
  muted = false,
  fresh = false,
  onOpen,
  children,
}: {
  order: LogistOrder;
  dragging: boolean;
  overlay: boolean;
  locked: boolean;
  selected: boolean;
  /** Yopilgan bosqich (yetkazilgan) — fon biroz xira. */
  muted?: boolean;
  /** Hali hech kim olmagan yangi buyurtma — amber ramka va fon. */
  fresh?: boolean;
  onOpen: (order: LogistOrder) => void;
  children: React.ReactNode;
}) {
  return (
    <article
      onClick={() => onOpen(order)}
      style={{ "--spine": orderStatusInfo(order.status).mark } as React.CSSProperties}
      className={cn(
        "group spine border-line flex flex-col gap-1.5 rounded-xl border px-3 pt-2.5 pb-2 elev-1",
        "transition-[border-color,box-shadow,transform] duration-(--dur-micro) ease-out",
        "hover:border-line-strong hover:elev-2 hover:-translate-y-0.5",
        fresh ? "bg-amber-soft border-amber-line card-fresh" : muted ? "bg-canvas" : "bg-surface",
        locked ? "cursor-pointer active:cursor-not-allowed" : "cursor-grab active:cursor-grabbing",
        selected && "ring-brand ring-2",
        dragging && !overlay && "opacity-40",
        overlay && "kanban-lift border-brand cursor-grabbing",
      )}
    >
      {children}
    </article>
  );
}
