"use client";

import { useQuery } from "@tanstack/react-query";
import { History, MapPinned, Phone, Truck, Undo2 } from "lucide-react";
import { useState } from "react";

import { ProductThumb } from "@/components/kit/product-thumb";
import { ErrorView } from "@/components/kit/state-views";
import { StatusPill } from "@/components/kit/status-pill";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchChiefOrderDetail } from "@/features/chief/api";
import { HISTORY_LABELS } from "@/features/chief/types";
import type { OrderHistoryEntry } from "@/features/chief/types";
import { formatDeliveryAddress } from "@/features/orders/address";
import { orderStatusInfo } from "@/features/orders/types";
import type { LogistOrder } from "@/features/orders/types";
import { errorMessage } from "@/lib/api-client";
import { formatDateTime, formatPhone, formatSom } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";

import { addressChangedBy, isOpenOrder, paymentLabel } from "../order-view";
import { AddressFixDialog, ReturnDialog } from "./order-actions";

/**
 * Zakaz detali (`?order=<id>`): mijoz, manzil, mahsulotlar va summalar,
 * to'lov, holat, filial, zona, kuryer, izoh va tarix. Telefonda to'liq
 * ekran, desktopda o'ngdan keng panel.
 */
export function OrderDetailSheet({
  orderId,
  fallback,
  canDispatch,
  regions,
  onClose,
  onAssign,
}: {
  orderId: string | null;
  /** Ro'yxatdagi nusxa — detal kelguncha darhol ko'rinadi. */
  fallback: LogistOrder | null;
  canDispatch: boolean;
  /** Bosh kuryer viloyatlari — manzil tuzatishda tuman tanlovi shundan. */
  regions: string[];
  onClose: () => void;
  onAssign: (order: LogistOrder) => void;
}) {
  return (
    <Sheet open={orderId !== null} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        className="data-[side=right]:w-full data-[side=right]:sm:max-w-xl gap-0 overflow-y-auto p-0"
      >
        {orderId ? (
          <DetailBody
            orderId={orderId}
            fallback={fallback}
            canDispatch={canDispatch}
            regions={regions}
            onAssign={onAssign}
            onClose={onClose}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function DetailBody({
  orderId,
  fallback,
  canDispatch,
  regions,
  onAssign,
  onClose,
}: {
  orderId: string;
  fallback: LogistOrder | null;
  canDispatch: boolean;
  regions: string[];
  onAssign: (order: LogistOrder) => void;
  onClose: () => void;
}) {
  const [action, setAction] = useState<"address" | "return" | null>(null);
  const detail = useQuery({
    queryKey: queryKeys.chiefOrderDetail(orderId),
    queryFn: ({ signal }) => fetchChiefOrderDetail(orderId, signal),
  });
  const order = detail.data?.order ?? fallback;

  if (!order) {
    return (
      <div className="p-5">
        <SheetTitle className="sr-only">Zakaz</SheetTitle>
        {detail.isPending ? (
          <div className="space-y-3" aria-label="Yuklanmoqda">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : (
          <ErrorView
            message={
              detail.isError
                ? errorMessage(detail.error, "Zakazni yuklashda xatolik")
                : "Zakaz topilmadi"
            }
            onRetry={() => void detail.refetch()}
          />
        )}
      </div>
    );
  }

  const status = orderStatusInfo(order.status);
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-line bg-surface sticky top-0 z-10 border-b px-5 pt-5 pb-4">
        <SheetTitle className="text-ink text-title tabular" data-no-translit>
          {order.orderNumber}
        </SheetTitle>
        <SheetDescription className="mt-1.5 flex flex-wrap items-center gap-2 text-meta">
          <StatusPill label={status.label} color={status.color} size="sm" />
          {order.createdAt ? (
            <span className="text-ink-faint">
              {formatDateTime(order.createdAt)}
            </span>
          ) : null}
        </SheetDescription>
      </header>

      <div className="flex flex-1 flex-col gap-5 px-5 py-4">
        <Block title="Mijoz">
          <p className="text-ink text-body font-semibold" data-no-translit>
            {order.client.fullName || "—"}
          </p>
          {order.client.phone ? (
            <a
              href={`tel:+${order.client.phone.replace(/\D/g, "")}`}
              className="text-link inline-flex items-center gap-1.5 text-dense"
            >
              <Phone className="size-3.5" aria-hidden />
              <span className="tabular">{formatPhone(order.client.phone)}</span>
            </a>
          ) : null}
          <p className="text-ink-muted text-dense" data-no-translit>
            {formatDeliveryAddress(order) ?? "Manzil yo'q"}
          </p>
          {addressChangedBy(order) ? (
            <StatusPill
              label={`Manzil o'zgardi · ${addressChangedBy(order)}`}
              color="var(--warn)"
              size="sm"
              className="self-start"
            />
          ) : null}
          {order.customerNotes ? (
            <p
              className="bg-subtle text-ink mt-1 rounded-lg px-3 py-2 text-dense"
              data-no-translit
            >
              {order.customerNotes}
            </p>
          ) : null}
        </Block>

        <Block title="Mahsulotlar">
          <ul className="divide-line border-line divide-y rounded-xl border">
            {order.items.map((item, index) => (
              <li
                key={item.id ?? `${item.productId}-${index}`}
                className="flex items-center gap-3 px-3 py-2"
              >
                <ProductThumb src={item.imageUrl} name={item.name} />
                <span
                  className="text-ink min-w-0 flex-1 truncate text-dense"
                  data-no-translit
                >
                  {item.name || "—"}
                </span>
                <span className="text-ink-muted tabular text-meta">
                  {item.serverUnitPrice !== null ? (
                    <>
                      {`${item.quantity} × `}
                      <span>{formatSom(item.serverUnitPrice)}</span>
                    </>
                  ) : (
                    `× ${item.quantity}`
                  )}
                </span>
                <span className="text-ink tabular w-28 text-right text-dense font-semibold">
                  {formatSom(item.price)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-1 grid grid-cols-2 gap-y-1 text-dense">
            <dt className="text-ink-muted">Jami</dt>
            <dd className="text-ink tabular text-right">
              {formatSom(order.totalAmount)}
            </dd>
            <dt className="text-ink font-semibold">To&apos;lanadi</dt>
            <dd className="text-ink tabular text-right font-semibold">
              {formatSom(order.payableAmount)}
            </dd>
          </dl>
        </Block>

        <Block title="Yetkazish">
          <dl className="flex flex-col gap-1.5 text-dense">
            <Row label="To'lov" value={paymentLabel(order.paymentMethod)} />
            <Row label="Filial" value={order.filial?.name ?? "—"} data />
            <Row
              label="Zona"
              value={order.zoning.zoneName ?? "Zona aniqlanmagan"}
              data={Boolean(order.zoning.zoneName)}
            />
            <Row
              label="Kuryer"
              value={order.courier?.fullName ?? "Kuryersiz"}
              data={Boolean(order.courier)}
            />
            {order.deliveredAt ? (
              <Row
                label="Yetkazildi"
                value={formatDateTime(order.deliveredAt)}
              />
            ) : null}
          </dl>
        </Block>

        <Block title="Tarix">
          {detail.isPending ? (
            <Skeleton className="h-24 rounded-xl" />
          ) : detail.data ? (
            <Timeline entries={detail.data.history} />
          ) : (
            <p className="text-ink-faint flex items-center gap-2 text-meta">
              <History className="size-3.5" aria-hidden />
              {errorMessage(detail.error, "Tarixni yuklashda xatolik")}
              <Button
                size="xs"
                variant="ghost"
                onClick={() => void detail.refetch()}
              >
                Qayta urinish
              </Button>
            </p>
          )}
        </Block>
      </div>

      {canDispatch && isOpenOrder(order) ? (
        <footer className="border-line bg-surface sticky bottom-0 flex flex-col gap-2 border-t p-4">
          <Button className="w-full" onClick={() => onAssign(order)}>
            <Truck />
            {order.courier ? "Kuryerni almashtirish" : "Kuryerga berish"}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setAction("address")}>
              <MapPinned />
              Manzilni tuzatish
            </Button>
            <Button variant="ghost" onClick={() => setAction("return")}>
              <Undo2 />
              Logistga qaytarish
            </Button>
          </div>
          {action === "address" ? <AddressFixDialog order={order} regions={regions} onClose={() => setAction(null)} /> : null}
          {action === "return" ? (
            <ReturnDialog
              order={order}
              onClose={() => setAction(null)}
              onReturned={() => {
                setAction(null);
                onClose();
              }}
            />
          ) : null}
        </footer>
      ) : null}
    </div>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-ink-faint text-micro uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Row({
  label,
  value,
  data = false,
}: {
  label: string;
  value: string;
  data?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink-muted shrink-0">{label}</dt>
      <dd
        className="text-ink min-w-0 truncate text-right"
        data-no-translit={data ? true : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

function Timeline({ entries }: { entries: OrderHistoryEntry[] }) {
  if (entries.length === 0)
    return <p className="text-ink-faint text-meta">Tarix bo&apos;sh</p>;
  return (
    <ol className="border-line ml-1.5 flex flex-col gap-3 border-l pl-4">
      {entries.map((entry, index) => (
        <li key={`${entry.action}-${index}`} className="relative">
          <span
            aria-hidden
            className="bg-brand ring-surface absolute top-1.5 -left-5 size-2 rounded-full ring-2"
          />
          <p className="text-ink text-dense font-medium">
            {HISTORY_LABELS[entry.action] ?? entry.action}
            {entry.courier ? (
              <span
                className="text-ink-muted font-normal"
                data-no-translit
              >{` · ${entry.courier}`}</span>
            ) : null}
          </p>
          <p className="text-ink-faint text-meta">
            {entry.at ? formatDateTime(entry.at) : "—"}
            {entry.actor ? (
              <span data-no-translit>{` · ${entry.actor}`}</span>
            ) : null}
          </p>
        </li>
      ))}
    </ol>
  );
}
