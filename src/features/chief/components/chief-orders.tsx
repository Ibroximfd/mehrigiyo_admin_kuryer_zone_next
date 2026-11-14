"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Inbox, LoaderCircle, MapPin, MapPinned, MapPinOff, SearchX, Store, Truck, Undo2, Wand2 } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";

import { FilterChips } from "@/components/kit/filter-chips";
import { ProductThumbs } from "@/components/kit/product-thumb";
import { EmptyView, ErrorView, TableSkeleton } from "@/components/kit/state-views";
import { StatusPill } from "@/components/kit/status-pill";
import { NextPageSentinel } from "@/components/kit/next-page-sentinel";
import { Button } from "@/components/ui/button";
import { assignChiefOrder, fetchChiefOrders } from "@/features/chief/api";
import { chiefCan } from "@/features/chief/types";
import type { ChiefMe, ChiefOrderScope } from "@/features/chief/types";
import { ORDER_SORT_LABELS } from "@/features/chief/order-sort";
import { useOrderFilters } from "@/features/chief/use-order-filters";
import { formatDeliveryAddress } from "@/features/orders/address";
import { isInReview, reviewLabel } from "@/features/orders/review";
import { orderStatusInfo } from "@/features/orders/types";
import type { LogistOrder } from "@/features/orders/types";
import { ApiError, errorMessage } from "@/lib/api-client";
import { formatSom } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";

import { districtBadge } from "../district-view";
import { fieldErrors } from "../order-action-rules";
import { addressChangedBy, isOpenOrder, orderProductsLine, shortOrderNumber } from "../order-view";
import { AutoAssignPreview } from "./auto-assign-preview";
import { ChiefAssignDialog } from "./chief-assign-dialog";
import { OrderDetailSheet } from "./order-detail-sheet";
import { OrderFilters } from "./order-filters";

/**
 * Bosh kuryer zakazlari (§5a, 2-bosqich): holat chiplari, qidiruv va
 * filtrlar (URLda), kartada mahsulotlar; karta bosilsa — to'liq detal.
 * Avto-taqsimlash avval reja ko'rsatadi, tasdiqlangach yuboradi.
 */
export function ChiefOrders({ me }: { me: ChiefMe }) {
  const queryClient = useQueryClient();
  const controls = useOrderFilters();
  const { scope, filters } = controls;
  const [openId, setOpenId] = useQueryState("order", parseAsString);
  const [assigning, setAssigning] = useState<LogistOrder | null>(null);
  const [planning, setPlanning] = useState(false);
  const canDispatch = chiefCan(me, "orders.dispatch");

  // Filtr va tartib — faqat serverda (60-javob); sayt o'zi saralamaydi.
  const orders = useInfiniteQuery({
    queryKey: queryKeys.chiefOrders({ scope, ...filters }),
    queryFn: ({ pageParam, signal }) => fetchChiefOrders({ scope, ...filters, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (last.hasMore ? all.length + 1 : undefined),
  });
  const rows = orders.data?.pages.flatMap((page) => page.orders) ?? [];
  const total = orders.data?.pages[0]?.count ?? 0;
  // Summa son bo'lmasa server `400 fields.amount_min/max` qaytaradi — maydon ostida ko'rsatiladi.
  const amountError = orders.isError ? amountFieldError(orders.error) : null;
  const filtered = controls.activeCount > 0 || controls.hasQuery;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.chief });
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
  };

  const unassign = useMutation({
    mutationFn: (order: LogistOrder) => assignChiefOrder(order.id, null),
    onSuccess: ({ order }) => {
      toast.success(`${order.orderNumber} — yana «Kelganlar» da`);
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error, "Kuryerdan olishda xatolik")),
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <FilterChips<ChiefOrderScope>
          label="Holat"
          options={[
            { value: "incoming", label: "Kelganlar", count: me.summary.incoming },
            { value: "active", label: "Faoliyatda", count: me.summary.active },
            { value: "delivered", label: "Yetkazilgan" },
            { value: "all", label: "Hammasi" },
          ]}
          value={scope}
          onChange={(next) => controls.set({ scope: next === "incoming" ? null : next })}
          className="min-w-0 flex-1"
        />
        {canDispatch && scope === "incoming" ? (
          <Button className="w-full sm:w-auto" disabled={me.summary.incoming === 0} onClick={() => setPlanning(true)}>
            <Wand2 />
            Avto taqsimlash
          </Button>
        ) : null}
      </div>

      <OrderFilters me={me} controls={controls} amountError={amountError} />

      {orders.isPending ? (
        <TableSkeleton rows={6} className="border-line overflow-hidden rounded-2xl border" />
      ) : orders.isError ? (
        <ErrorView
          message={errorMessage(orders.error, "Zakazlarni yuklashda xatolik")}
          onRetry={() => void orders.refetch()}
          className="border-line bg-surface rounded-2xl border"
        />
      ) : rows.length === 0 && filtered ? (
        <EmptyView
          Icon={SearchX}
          title="Hech narsa topilmadi"
          description="Qidiruv yoki filtrlarni o'zgartiring."
          action={
            <Button variant="outline" onClick={controls.clear}>
              Filtrni tozalash
            </Button>
          }
          className="border-line bg-surface rounded-2xl border"
        />
      ) : rows.length === 0 ? (
        <EmptyView
          Icon={Inbox}
          title={scope === "incoming" ? "Kelgan zakaz yo'q" : "Zakaz yo'q"}
          description={
            scope === "incoming" ? "Logist zakazni sizga bersa shu yerda paydo bo'ladi." : "Bu ro'yxatda hozircha zakaz yo'q."
          }
          className="border-line bg-surface rounded-2xl border"
        />
      ) : (
        <div className="border-line bg-surface overflow-hidden rounded-2xl border">
          <p className="text-ink-faint border-line border-b px-4 py-2 text-meta">
            <span>{`${total} zakaz`}</span>
            {" · "}
            <span>{ORDER_SORT_LABELS[controls.selection.sort]}</span>
          </p>
          <ul className="divide-line divide-y">
            {rows.map((order) => (
              <ChiefOrderRow
                key={order.id}
                order={order}
                canDispatch={canDispatch}
                busy={unassign.isPending && unassign.variables?.id === order.id}
                onOpen={() => void setOpenId(order.id)}
                onAssign={() => setAssigning(order)}
                onUnassign={() => unassign.mutate(order)}
              />
            ))}
          </ul>
          <NextPageSentinel
            hasMore={orders.hasNextPage}
            isLoading={orders.isFetchingNextPage}
            onLoadMore={() => void orders.fetchNextPage()}
          />
        </div>
      )}

      <OrderDetailSheet
        orderId={openId}
        fallback={rows.find((order) => order.id === openId) ?? null}
        canDispatch={canDispatch}
        regions={me.regions}
        onClose={() => void setOpenId(null)}
        onAssign={setAssigning}
      />
      <ChiefAssignDialog order={assigning} onClose={() => setAssigning(null)} />
      {planning ? <AutoAssignPreview onClose={() => setPlanning(false)} /> : null}
    </div>
  );
}

function ChiefOrderRow({
  order,
  canDispatch,
  busy,
  onOpen,
  onAssign,
  onUnassign,
}: {
  order: LogistOrder;
  canDispatch: boolean;
  busy: boolean;
  onOpen: () => void;
  onAssign: () => void;
  onUnassign: () => void;
}) {
  const status = orderStatusInfo(order.status);
  const address = formatDeliveryAddress(order);
  const products = orderProductsLine(order);
  const changedBy = addressChangedBy(order);
  const landmark = order.deliveryInfo?.landmark ?? null;
  const district = districtBadge(order.zoning);

  const courierLine = (
    <>
      <span className="inline-flex min-w-0 items-center gap-1">
        <Truck className="size-3.5 shrink-0" aria-hidden />
        {order.courier ? (
          <span className="truncate" data-no-translit>
            {order.courier.fullName}
          </span>
        ) : (
          <span>Kuryersiz</span>
        )}
      </span>
      {order.filial ? (
        <span className="text-ink-faint inline-flex min-w-0 items-center gap-1" title="Sotgan filial">
          <Store className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate" data-no-translit>
            {order.filial.name}
          </span>
        </span>
      ) : null}
    </>
  );

  return (
    <li className="hover:bg-subtle flex flex-wrap items-center gap-x-4 gap-y-2.5 px-4 py-3.5 transition-colors sm:py-3">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${order.orderNumber}: batafsil`}
        className="focus-visible:ring-brand/40 min-w-0 flex-1 basis-64 rounded-lg text-left focus-visible:ring-2 focus-visible:outline-none"
      >
        <span className="flex items-start gap-2">
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
            {/* Telefonda qisqa raqam (kuryer ilovasidagidek), to'liq — kompyuterda. */}
            <span className="text-ink tabular text-dense font-semibold sm:hidden" data-no-translit>
              {`#${shortOrderNumber(order.orderNumber)}`}
            </span>
            <span className="text-ink tabular text-dense hidden font-semibold sm:inline" data-no-translit>
              {order.orderNumber}
            </span>
            <StatusPill label={status.label} color={status.color} size="sm" />
            {isInReview(order) ? <StatusPill label={reviewLabel(order)} color="var(--order-review)" size="sm" /> : null}
            {changedBy ? <StatusPill label="Manzil o'zgardi" color="var(--warn)" size="sm" Icon={MapPinned} /> : null}
            {district ? <StatusPill label={district.label} color={district.color} size="sm" Icon={MapPinOff} /> : null}
            <span className="text-ink hidden truncate text-dense sm:inline" data-no-translit>
              {order.client.fullName || order.client.phone}
            </span>
          </span>
          <span className="text-ink tabular shrink-0 text-body font-semibold sm:hidden">{formatSom(order.payableAmount)}</span>
        </span>
        <span className="text-ink mt-1 block truncate text-dense sm:hidden" data-no-translit>
          {order.client.fullName || order.client.phone}
        </span>
        {products ? (
          <span className="mt-1.5 flex min-w-0 items-center gap-2">
            <ProductThumbs items={order.items} />
            <span className="text-ink-muted truncate text-meta" data-no-translit>{products}</span>
          </span>
        ) : null}
        <span className="text-ink-faint mt-1 flex min-w-0 items-center gap-1 text-meta">
          <MapPin className="size-3 shrink-0" aria-hidden />
          <span className="truncate" data-no-translit>{address ?? "Manzil yo'q"}</span>
        </span>
        {landmark ? (
          <span className="text-ink-faint mt-0.5 block truncate text-meta">
            {"Mo'ljal: "}
            <span data-no-translit>{landmark}</span>
          </span>
        ) : null}
        <span className="text-ink-muted mt-1.5 flex min-w-0 items-center gap-3 text-meta sm:hidden">{courierLine}</span>
      </button>
      <span className="hidden shrink-0 flex-col items-end gap-0.5 text-meta sm:flex">
        <span className="text-ink tabular text-dense font-semibold">{formatSom(order.payableAmount)}</span>
        <span className="text-ink-muted flex flex-col items-end gap-0.5">{courierLine}</span>
      </span>
      {canDispatch && isOpenOrder(order) ? (
        <span className="grid w-full shrink-0 auto-cols-fr grid-flow-col gap-2 sm:flex sm:w-auto sm:justify-end sm:gap-1.5">
          {order.courier ? (
            <Button
              variant="outline"
              disabled={busy}
              onClick={onUnassign}
              title="Kuryerdan olib, «Kelganlar» ga qaytarish"
              className="sm:h-8 sm:px-3 sm:text-meta"
            >
              {busy ? <LoaderCircle className="animate-spin" /> : <Undo2 />}
              Olish
            </Button>
          ) : null}
          <Button
            variant={order.courier ? "outline" : "default"}
            onClick={onAssign}
            className="sm:h-8 sm:px-3 sm:text-meta"
          >
            <Truck />
            {order.courier ? "Almashtirish" : "Kuryerga berish"}
          </Button>
        </span>
      ) : null}
    </li>
  );
}

function amountFieldError(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.status !== 400) return null;
  const fields = fieldErrors(error.data, ["amount_min", "amount_max"] as const);
  return fields.amount_min ?? fields.amount_max ?? null;
}
