"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

import { ErrorView } from "@/components/kit/state-views";
import { Skeleton } from "@/components/ui/skeleton";
import { DragBoard } from "@/features/kanban/components/drag-board";
import type { LogistOrderPatch } from "@/features/orders/api";
import type { CardAckState } from "@/features/orders/components/kanban/ack-parts";
import { ColumnHeader } from "@/features/orders/components/kanban/column-header";
import { NewArrivalsPill } from "@/features/orders/components/kanban/new-arrivals-pill";
import { OrderCard } from "@/features/orders/components/kanban/order-card";
import type { CardActions } from "@/features/orders/components/kanban/card-types";
import { toastStatusChanged } from "@/features/orders/components/status-toast";
import { orderErrorMessage } from "@/features/orders/error-hints";
import {
  boardTransition,
  canDragOrder,
  nextFlowStatus,
  transitionNeedsDialog,
} from "@/features/orders/permissions";
import { visibleColumns } from "@/features/orders/board-columns";
import { boardColumnOf } from "@/features/orders/review";
import { useUiStore } from "@/stores/ui-store";
import type { OrderBoardColumn } from "@/features/orders/board";
import type { OrderChatUnread } from "@/features/orders/use-order-chat-unread";
import type { LogistOrder } from "@/features/orders/types";
import { isAckFallback } from "@/features/orders/acknowledgement";
import { useBoardArrivals } from "@/features/orders/use-board-arrivals";
import { markOrderSeen } from "@/features/orders/use-order-acks";
import type { OrderAcksApi } from "@/features/orders/use-order-acks";
import type { OrderBoardData } from "@/features/orders/use-order-board";
import { errorMessage } from "@/lib/api-client";

/**
 * Buyurtmalar doskasi — 4 ustun: Tasdiqlangan → Yo'lda (jarayon) →
 * Yetkazilgan / Atkaz. `Kutilmoqda` logistga ko'rsatilmaydi (2026-10-29):
 * logist tasdiqlangandan keyingi ishga javob beradi.
 *
 * Komponent faqat chizadi va sudrashni boshqaradi; ma'lumot `useOrderBoard`
 * dan keladi. Ruxsatlar `permissions.ts` dan (`02` §2.3): `shipping` ga
 * o'tish kuryer+cheklist oynasi orqali, bekor/qaytarish/tiklash — sabab
 * oynasi orqali; ikkala oyna ham chaqiruvchida.
 */

/** Jarayondagi zakaz «Jarayonda» ustunida, qolgani — statusida. */
function orderColumnId(order: LogistOrder): string {
  return boardColumnOf(order);
}

type MoveVariables = {
  id: string;
  patch: LogistOrderPatch & { status: string };
  fromStatus: string;
};

export type BoardSelection = {
  selected: ReadonlySet<string>;
  toggle: (id: string) => void;
};

export function OrderBoard({
  board,
  visibleOrders,
  changeStatus,
  onOpenOrder,
  onShip,
  onEdit,
  onRequestReason,
  onShowMore,
  selection,
  acks,
  chatUnread,
  onDiscuss,
  onFilterUnreadChat,
}: {
  board: OrderBoardData;
  /**
   * Klient filtrlari qo'llangan buyurtmalar; `null` — filtr yo'q, ustun
   * sonlari va summalari serverdan (butun ustun bo'yicha).
   */
  visibleOrders: LogistOrder[] | null;
  changeStatus: (id: string, patch: LogistOrderPatch) => Promise<LogistOrder>;
  onOpenOrder: (order: LogistOrder) => void;
  onShip: (order: LogistOrder) => void;
  onEdit: (order: LogistOrder) => void;
  onRequestReason: (order: LogistOrder, toStatus: string) => void;
  onShowMore?: (status: string) => void;
  selection: BoardSelection;
  /** "Yangi" / "Oldim" holati (`useOrderAcks`). */
  acks: OrderAcksApi;
  /** Buyurtma chatidagi o'qilmaganlar — id bo'yicha (`useOrderChatUnreadMap`). */
  chatUnread: Record<string, OrderChatUnread>;
  /** Buyurtma chatini ochish. */
  onDiscuss: (orderId: string) => void;
  /** Ustun sarlavhasidagi chat belgisi — doskani "Yangi xabar" ga suzadi. */
  onFilterUnreadChat: () => void;
}) {
  const queryClient = useQueryClient();
  const { applyMove, applyOrder, invalidate } = board;

  /*
   * Ustun ichidagi tartib — serverniki (`?ordering=`, 2026-10-01 C §8):
   * `?limit=` kesimi tartibdan keyin, ya'ni mijozdagi saralash faqat
   * yuklangan 20 ta ichida ishlardi. Optimistik ko'chirish va WS kartasi
   * o'sha qoida bilan joylanadi (`order-sort.ts`). `DragBoard` kartalarni
   * kelgan tartibda guruhlaydi.
   */
  const items = visibleOrders ?? board.orders;
  // Logist tanlagan ustunlargina (`board-columns.ts`).
  const hiddenColumns = useUiStore((state) => state.hiddenBoardColumns);
  const columns = useMemo(
    () => visibleColumns(withVisibleTotals(board.columns, visibleOrders), hiddenColumns),
    [board.columns, visibleOrders, hiddenColumns],
  );

  // Hozirgina kelgan kartalar: kirish animatsiyasi, ustun yonishi, "N yangi ↑".
  const arrivals = useBoardArrivals({
    columns: board.columns,
    filtersKey: board.filtersKey,
    ready: !board.isPending && !board.isPlaceholder,
    isFresh: acks.isFresh,
  });

  const ordersById = useMemo(
    () => new Map(board.orders.map((order) => [order.id, order])),
    [board.orders],
  );

  const move = useMutation({
    mutationFn: ({ id, patch }: MoveVariables) => changeStatus(id, patch),
    onSuccess: (order, variables) => {
      const before = ordersById.get(variables.id) ?? null;
      markOrderSeen(order.id);
      applyOrder(order);
      toastStatusChanged({
        order,
        before,
        fromStatus: variables.fromStatus,
        onUndo: (patch) => {
          applyMove(variables.id, patch.status);
          move.mutate({ id: variables.id, patch, fromStatus: variables.patch.status });
        },
      });
    },
    onError: (error) => {
      toast.error(orderErrorMessage(error, "Statusni o'zgartirishda xatolik"));
      invalidate();
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ["orders"],
        predicate: (query) => query.queryKey[1] !== "board",
      });
      void queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
  });

  const moveOrder = move.mutate;
  const handleMove = useCallback(
    (itemId: string | number, columnId: string | number) => {
      const id = String(itemId);
      const status = String(columnId);
      const order = ordersById.get(id);
      if (!order) return;

      const kind = boardTransition(order, status);
      if (kind === null) return;
      if (kind === "ship") {
        onShip(order);
        return;
      }
      if (transitionNeedsDialog(kind)) {
        onRequestReason(order, status);
        return;
      }
      applyMove(id, status);
      moveOrder({ id, patch: { status }, fromStatus: order.status });
    },
    [applyMove, moveOrder, ordersById, onShip, onRequestReason],
  );

  const actions: CardActions = useMemo(
    () => ({
      onOpen: onOpenOrder,
      onShip,
      onEdit,
      onRequestReason,
      onToggleSelect: selection.toggle,
      onDiscuss,
      onAdvance: (order) => {
        const next = nextFlowStatus(order.status);
        if (next) handleMove(order.id, next);
      },
    }),
    [onOpenOrder, onShip, onEdit, onRequestReason, selection.toggle, onDiscuss, handleMove],
  );

  const cardAck = (order: LogistOrder): CardAckState => ({
    fresh: acks.isFresh(order),
    acks: acks.acksOf(order),
    unseen: acks.hasUnseen(order),
    pending: acks.pendingId === order.id,
    fallback: isAckFallback(order),
    onAcknowledge: () => acks.acknowledge(order),
  });
  const freshIn = (column: OrderBoardColumn<LogistOrder>) =>
    column.orders.reduce((sum, order) => sum + (acks.isFresh(order) ? 1 : 0), 0);

  if (board.isPending) return <BoardSkeleton />;

  if (board.error && board.columns.length === 0) {
    return (
      <ErrorView
        message={errorMessage(board.error, "Doskani yuklashda xatolik")}
        onRetry={board.refetch}
        className="border-line bg-surface mx-4 rounded-xl border sm:mx-5"
      />
    );
  }

  const selectionActive = selection.selected.size > 0;

  return (
    <>
      {board.error ? (
        <p className="text-warn bg-warn-soft mx-4 mb-3 rounded-lg px-3 py-2 text-dense sm:mx-5">
          Yangilash muvaffaqiyatsiz tugadi — doskadagi ma&apos;lumot eskirgan bo&apos;lishi mumkin
        </p>
      ) : null}

      <DragBoard
        fluid
        appearance="open"
        scrollMemoryKey="orders-board"
        columns={columns}
        items={items}
        getColumnId={orderColumnId}
        onMove={handleMove}
        isDraggable={(order) => canDragOrder(order)}
        columnAccent={(column) => column.mark}
        isColumnHighlighted={(column) => arrivals.isHighlighted(column.status)}
        renderColumnTopNotice={(column, scroll) => (
          <NewArrivalsPill
            count={arrivals.unseenCount(column)}
            scroll={scroll}
            onSeen={() => arrivals.clearUnseen(column.status)}
          />
        )}
        renderCard={(order, state) => (
          <div className={!state.overlay && arrivals.isArriving(order.id) ? "card-arrive" : undefined}>
            <OrderCard
              order={order}
              dragging={state.dragging}
              overlay={state.overlay}
              locked={!canDragOrder(order)}
              selected={selection.selected.has(order.id)}
              selectionActive={selectionActive}
              actions={actions}
              ack={cardAck(order)}
            />
          </div>
        )}
        renderColumnHeader={(column) => {
          return (
            <ColumnHeader
              label={column.label}
              count={column.count}
              totalAmount={column.totalAmount}
              mark={column.mark}
              unread={column.orders.reduce(
                (sum, order) => sum + (order.id in chatUnread ? 1 : 0),
                0,
              )}
              onUnreadClick={onFilterUnreadChat}
              fresh={freshIn(column)}
            />
          );
        }}
        renderColumnFooter={(column) => (
          <ColumnFooter
            column={column}
            filtered={visibleOrders !== null}
            onShowMore={onShowMore}
          />
        )}
      />
    </>
  );
}

/** Klient filtri faol bo'lsa son va summa ko'rinib turgan kartalardan. */
function withVisibleTotals(
  columns: OrderBoardColumn<LogistOrder>[],
  visible: LogistOrder[] | null,
) {
  return columns.map((column) => {
    if (visible === null) return { ...column, id: column.status };
    const own = visible.filter((order) => boardColumnOf(order) === column.status);
    return {
      ...column,
      id: column.status,
      count: own.length,
      totalAmount: own
        .filter((order) => order.status !== "cancelled")
        .reduce((sum, order) => sum + order.payableAmount, 0),
    };
  });
}

function ColumnFooter({
  column,
  filtered,
  onShowMore,
}: {
  column: OrderBoardColumn<LogistOrder> & { id: string };
  filtered: boolean;
  onShowMore?: (status: string) => void;
}) {
  const hidden = filtered ? 0 : column.count - column.orders.length;
  return (
    <>
      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => onShowMore?.(column.status)}
          className="text-ink-faint hover:text-brand hover:bg-brand-soft w-full rounded-lg py-2 text-center text-fine font-medium transition-colors"
        >
          Yana {hidden} ta — ro&apos;yxatda ochish
        </button>
      ) : null}
      {column.status === "cancelled" ? (
        <p className="border-line-strong text-ink-faint flex min-h-20 items-center justify-center rounded-lg border border-dashed p-3 text-center text-meta">
          Tashlang — sabab so&apos;raladi
        </p>
      ) : null}
    </>
  );
}

function BoardSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden px-4 sm:px-5" aria-hidden>
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className="flex w-[17rem] shrink-0 flex-col gap-2.5 md:w-auto md:flex-1">
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="mx-auto h-6 w-28 rounded-full" />
          <Skeleton className="h-52 rounded-lg" />
          <Skeleton className="h-52 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
