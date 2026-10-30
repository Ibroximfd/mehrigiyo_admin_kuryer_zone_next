"use client";

import { FileText, LoaderCircle, Route } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { printRouteSheet } from "@/features/couriers/route-sheet";
import type { Courier } from "@/features/couriers/types";
import type { OrdersBoard } from "@/features/orders/board";
import { printDailyReport } from "@/features/orders/daily-report";
import type { LogistOrder } from "@/features/orders/types";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Chop etish tugmalari: kunlik yakun (A4) va kuryer marshrut varag'i
 * (mavjud printerlar — `daily-report.ts`, `route-sheet.ts`).
 */
export function DashboardActions({
  board,
  couriers,
  couriersPending,
}: {
  board: OrdersBoard<LogistOrder> | undefined;
  couriers: Courier[] | null;
  couriersPending: boolean;
}) {
  const filialName = useAuthStore((state) => state.user?.filialName ?? null);
  const shipping = board?.columns.find((column) => column.status === "shipping")?.orders ?? [];
  const routes = (couriers ?? [])
    .map((courier) => ({
      courier,
      orders: shipping.filter((order) => order.courier?.id === courier.id),
    }))
    .filter((item) => item.orders.length > 0);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        disabled={!board}
        onClick={() => board && printDailyReport({ filialName, board, couriers })}
      >
        <FileText />
        Kunlik hisobot (A4)
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={!board || couriersPending}>
            {couriersPending ? <LoaderCircle className="animate-spin" /> : <Route />}
            Marshrut varaqalari
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>Yo&apos;ldagi kuryerlar</DropdownMenuLabel>
          {routes.length === 0 ? (
            <p className="text-ink-faint px-2 py-1.5 text-meta">Yo&apos;lda buyurtmasi bor kuryer yo&apos;q</p>
          ) : (
            routes.map(({ courier, orders }) => (
              <DropdownMenuItem
                key={courier.id}
                onSelect={() => {
                  printRouteSheet(courier, orders);
                  toast.success(`${courier.fullName} · marshrut varag'i tayyor`);
                }}
              >
                <span className="flex-1 truncate" data-no-translit>
                  {courier.fullName}
                </span>
                <span className="text-ink-faint tabular text-fine">{orders.length} ta</span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
