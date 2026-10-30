"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Inbox, LoaderCircle, MapPin, Truck, Undo2, Wand2 } from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";

import { FilterChips } from "@/components/kit/filter-chips";
import { EmptyView, ErrorView } from "@/components/kit/state-views";
import { StatusPill } from "@/components/kit/status-pill";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { assignChiefOrder, autoAssignChiefOrders, fetchChiefOrders } from "@/features/chief/api";
import { SKIP_REASON_LABELS, chiefCan } from "@/features/chief/types";
import type { ChiefMe, ChiefOrderScope } from "@/features/chief/types";
import { formatDeliveryAddress } from "@/features/orders/address";
import { isInReview, reviewLabel } from "@/features/orders/review";
import { orderStatusInfo } from "@/features/orders/types";
import type { LogistOrder } from "@/features/orders/types";
import { errorMessage } from "@/lib/api-client";
import { formatSom } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";

import { ChiefAssignDialog } from "./chief-assign-dialog";

const SCOPES = ["incoming", "active", "all"] as const;

/**
 * Bosh kuryer zakazlari (§C 2.2): «Kelganlar» — logist bergan, hali
 * kuryersiz; «Faoliyatda» — kuryerlarga berilgan; «Hammasi». Eski
 * birinchi — navbat bilan taqsimlanadi. Yakunlash logistda.
 */
export function ChiefOrders({ me }: { me: ChiefMe }) {
  const queryClient = useQueryClient();
  const [scope, setScope] = useQueryState(
    "scope",
    parseAsStringLiteral(SCOPES).withDefault("incoming").withOptions({ clearOnDefault: true }),
  );
  const [assigning, setAssigning] = useState<LogistOrder | null>(null);
  const canDispatch = chiefCan(me, "orders.dispatch");

  const orders = useInfiniteQuery({
    queryKey: queryKeys.chiefOrders({ scope }),
    queryFn: ({ pageParam, signal }) => fetchChiefOrders({ scope: scope as ChiefOrderScope, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (last.hasMore ? all.length + 1 : undefined),
  });
  const rows = orders.data?.pages.flatMap((page) => page.orders) ?? [];
  const total = orders.data?.pages[0]?.count ?? 0;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.chief });
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
  };

  const auto = useMutation({
    mutationFn: () => autoAssignChiefOrders(),
    onSuccess: (result) => {
      const skipped = result.skipped.length;
      if (result.assigned.length === 0 && skipped === 0) toast.info("Taqsimlanadigan zakaz yo'q");
      else
        toast.success(
          skipped > 0
            ? `${result.assigned.length} ta taqsimlandi · ${skipped} tasi qoldi (${SKIP_REASON_LABELS[result.skipped[0]!.reason] ?? result.skipped[0]!.reason})`
            : `${result.assigned.length} ta zakaz kuryerlarga taqsimlandi`,
        );
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error, "Avto taqsimlashda xatolik")),
  });

  const unassign = useMutation({
    mutationFn: (order: LogistOrder) => assignChiefOrder(order.id, null),
    onSuccess: ({ order }) => {
      toast.success(`${order.orderNumber} — yana «Kelganlar» da`);
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error, "Kuryerdan olishda xatolik")),
  });

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <FilterChips<(typeof SCOPES)[number]>
          label="Zakazlar"
          options={[
            { value: "incoming", label: "Kelganlar", count: me.summary.incoming },
            { value: "active", label: "Faoliyatda", count: me.summary.active },
            { value: "all", label: "Hammasi" },
          ]}
          value={scope}
          onChange={(next) => void setScope(next)}
        />
        {canDispatch && scope === "incoming" ? (
          <Button className="ml-auto" disabled={auto.isPending || rows.length === 0} onClick={() => auto.mutate()}>
            {auto.isPending ? <LoaderCircle className="animate-spin" /> : <Wand2 />}
            Hammasini avto taqsimlash
          </Button>
        ) : null}
      </div>

      {orders.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : orders.isError ? (
        <ErrorView
          message={errorMessage(orders.error, "Zakazlarni yuklashda xatolik")}
          onRetry={() => void orders.refetch()}
          className="border-line bg-surface rounded-xl border"
        />
      ) : rows.length === 0 ? (
        <EmptyView
          Icon={Inbox}
          title={scope === "incoming" ? "Kelgan zakaz yo'q" : "Zakaz yo'q"}
          description={
            scope === "incoming"
              ? "Logist zakazni sizga bersa shu yerda paydo bo'ladi."
              : "Bu ro'yxatda hozircha zakaz yo'q."
          }
          className="border-line bg-surface rounded-xl border"
        />
      ) : (
        <div className="border-line bg-surface overflow-hidden rounded-2xl border">
          <p className="text-ink-faint border-line border-b px-4 py-2 text-meta">{`${total} ta zakaz · eski birinchi`}</p>
          <ul className="divide-line divide-y">
            {rows.map((order) => (
              <ChiefOrderRow
                key={order.id}
                order={order}
                canDispatch={canDispatch}
                busy={unassign.isPending && unassign.variables?.id === order.id}
                onAssign={() => setAssigning(order)}
                onUnassign={() => unassign.mutate(order)}
              />
            ))}
          </ul>
          {orders.hasNextPage ? (
            <div className="border-line border-t p-2 text-center">
              <Button variant="ghost" size="sm" disabled={orders.isFetchingNextPage} onClick={() => void orders.fetchNextPage()}>
                {orders.isFetchingNextPage ? <LoaderCircle className="animate-spin" /> : null}
                Yana yuklash
              </Button>
            </div>
          ) : null}
        </div>
      )}

      <ChiefAssignDialog order={assigning} onClose={() => setAssigning(null)} />
    </div>
  );
}

function ChiefOrderRow({
  order,
  canDispatch,
  busy,
  onAssign,
  onUnassign,
}: {
  order: LogistOrder;
  canDispatch: boolean;
  busy: boolean;
  onAssign: () => void;
  onUnassign: () => void;
}) {
  const status = orderStatusInfo(order.status);
  const address = formatDeliveryAddress(order);
  const open = order.status === "shipping" && !isInReview(order);

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="text-ink tabular text-dense font-semibold" data-no-translit>
            {order.orderNumber}
          </span>
          <StatusPill label={status.label} color={status.color} size="sm" />
          {isInReview(order) ? <StatusPill label={reviewLabel(order)} color="var(--order-review)" size="sm" /> : null}
          <span className="text-ink truncate text-dense" data-no-translit>
            {order.client.fullName || order.client.phone}
          </span>
        </p>
        <p className="text-ink-muted mt-0.5 flex min-w-0 items-center gap-1 text-meta">
          <MapPin className="size-3 shrink-0" aria-hidden />
          <span className="truncate" data-no-translit>{address ?? "Manzil yo'q"}</span>
        </p>
      </div>
      <span className="text-ink tabular shrink-0 text-dense font-semibold">{formatSom(order.payableAmount)}</span>
      <span className="text-ink-muted inline-flex shrink-0 items-center gap-1 text-meta">
        <Truck className="size-3.5" aria-hidden />
        {order.courier ? <span data-no-translit>{order.courier.fullName}</span> : "Kuryersiz"}
      </span>
      {canDispatch && open ? (
        <span className="flex shrink-0 gap-1.5">
          {order.courier ? (
            <Button size="sm" variant="ghost" disabled={busy} onClick={onUnassign} title="Kuryerdan olib, «Kelganlar» ga qaytarish">
              {busy ? <LoaderCircle className="animate-spin" /> : <Undo2 />}
              Olish
            </Button>
          ) : null}
          <Button size="sm" variant={order.courier ? "outline" : "default"} onClick={onAssign}>
            <Truck />
            {order.courier ? "Almashtirish" : "Kuryerga berish"}
          </Button>
        </span>
      ) : null}
    </li>
  );
}
