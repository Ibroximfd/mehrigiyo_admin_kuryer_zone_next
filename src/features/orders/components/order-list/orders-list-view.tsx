"use client";

import { ChevronDown, Receipt, SearchX, X } from "lucide-react";

import { EmptyView, ErrorView, TableSkeleton } from "@/components/kit/state-views";
import { Button } from "@/components/ui/button";
import type { RowActions } from "@/features/orders/components/order-list/order-row-menu";
import { OrdersTable } from "@/features/orders/components/order-list/orders-table";
import { groupOrders } from "@/features/orders/list-grouping";
import type { LogistOrder } from "@/features/orders/types";
import { errorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/**
 * Ro'yxat ko'rinishi — holatlar galereyasi bilan: skeleton · xato+qayta ·
 * bo'sh · filtr bo'yicha topilmadi · tayyor (+ "yana yuklash").
 */
export function OrdersListView({
  rows,
  status,
  error,
  hasFilters,
  grouping,
  selected,
  actions,
  onToggleAll,
  onClearFilters,
  onRetry,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  dimmed,
}: {
  rows: LogistOrder[];
  status: "pending" | "error" | "success";
  error: unknown;
  hasFilters: boolean;
  grouping: string | null;
  selected: ReadonlySet<string>;
  actions: RowActions;
  onToggleAll: (checked: boolean) => void;
  onClearFilters: () => void;
  onRetry: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  dimmed: boolean;
}) {
  const frame = "border-line bg-surface rounded-xl border";

  if (status === "pending") {
    return (
      <div className={cn(frame, "overflow-hidden")}>
        <TableSkeleton rows={8} />
      </div>
    );
  }
  if (status === "error" && rows.length === 0) {
    return (
      <ErrorView
        message={errorMessage(error, "Buyurtmalarni yuklashda xatolik")}
        onRetry={onRetry}
        className={frame}
      />
    );
  }
  if (rows.length === 0) {
    return hasFilters ? (
      <EmptyView
        Icon={SearchX}
        title="Filtr bo'yicha buyurtma topilmadi"
        description="Filtrlarni yumshating yoki tozalang."
        className={frame}
        action={
          <Button variant="outline" size="lg" onClick={onClearFilters}>
            <X className="size-4" />
            Filtrlarni tozalash
          </Button>
        }
      />
    ) : (
      <EmptyView
        Icon={Receipt}
        title="Hozircha buyurtma yo'q"
        description="Yangi buyurtmalar ilova va CRMdan real vaqtda tushadi."
        className={frame}
      />
    );
  }

  return (
    <>
      <OrdersTable
        orders={rows}
        groups={groupOrders(rows, grouping)}
        selected={selected}
        actions={actions}
        onToggleAll={onToggleAll}
        dimmed={dimmed}
      />
      {hasNextPage ? (
        <div className="mt-3 flex justify-center">
          <Button variant="outline" size="lg" onClick={onLoadMore} disabled={isFetchingNextPage}>
            <ChevronDown className={cn("size-4", isFetchingNextPage && "animate-bounce")} />
            Yana yuklash
          </Button>
        </div>
      ) : null}
    </>
  );
}
