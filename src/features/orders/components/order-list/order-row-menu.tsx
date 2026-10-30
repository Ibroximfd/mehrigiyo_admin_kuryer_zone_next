"use client";

import { Eye, MessagesSquare, MoreHorizontal, Pencil, Printer } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { printWaybills } from "@/features/orders/components/waybill";
import type { LogistOrder } from "@/features/orders/types";

export type RowActions = {
  onOpen: (id: string) => void;
  onEdit: (order: LogistOrder) => void;
  onDiscuss: (id: string) => void;
  onToggle: (id: string) => void;
};

/** Qator oxiridagi "⋯" — ochish, tahrirlash, muhokama, varaqa. */
export function OrderRowMenu({ order, actions }: { order: LogistOrder; actions: RowActions }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${order.orderNumber} amallari`}
        onClick={(event) => event.stopPropagation()}
        className="bg-surface-3 text-brand hover:bg-brand-soft inline-flex size-6 items-center justify-center rounded-md transition-colors"
      >
        <MoreHorizontal className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48" onClick={(event) => event.stopPropagation()}>
        <DropdownMenuItem onSelect={() => actions.onOpen(order.id)}>
          <Eye />
          Ochish
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.onEdit(order)}>
          <Pencil />
          Tahrirlash
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.onDiscuss(order.id)}>
          <MessagesSquare />
          Muhokama
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void printWaybills([order])}>
          <Printer />
          Yo&apos;l varaqasi
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
