"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Lock, Phone, Truck, UserRound } from "lucide-react";
import Link from "next/link";

import { CopyButton } from "@/components/kit/copy-button";
import { ErrorView } from "@/components/kit/state-views";
import { StatusPill } from "@/components/kit/status-pill";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangeRequestChip, StopChip } from "@/features/orders/components/door-signals";
import { orderStatusInfo } from "@/features/orders/types";
import { fetchLeadDetail } from "@/features/pipeline/api";
import type { LeadStage, PipelineOrder } from "@/features/pipeline/types";
import { ApiError, errorMessage } from "@/lib/api-client";
import { formatPhone, formatShortDateTime, formatSom } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { ROUTES } from "@/lib/routes";

const STAGE_LABELS: Record<LeadStage, string> = {
  leads: "Lidlar",
  delivery: "Dostavka",
  base: "Baza",
};

/** Lidlardagi karta logistga yopiq — server 403 yoki 404 qaytaradi. */
function isClosedCard(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 403 || error.status === 404);
}

/**
 * Lid kartasi detali (`GET leads/{id}/`) — logist uchun **isbot**: mijoz
 * kim, qaysi operator, qaysi buyurtmalar va har biri qaysi holatda.
 * Tahrir yo'q (logistga `PATCH leads/…` yopiq); buyurtmaning o'zi
 * `Buyurtmalar` detalida ochiladi.
 *
 * Lidlardagi karta logistga yopiq — 403/404 da halol izoh chiqadi.
 */
export function LeadDetailSheet({
  leadId,
  onClose,
}: {
  leadId: number | null;
  onClose: () => void;
}) {
  const detail = useQuery({
    queryKey: queryKeys.leadDetail(leadId ?? 0),
    queryFn: ({ signal }) => fetchLeadDetail(leadId ?? 0, signal),
    enabled: leadId !== null,
    retry: (count, error) => count < 1 && !isClosedCard(error),
  });
  const closed = isClosedCard(detail.error);
  const data = detail.data ?? null;

  return (
    <Sheet open={leadId !== null} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        className="flex w-[480px] max-w-[calc(100vw-1.5rem)] flex-col gap-0 p-0"
      >
        <div className="border-line border-b px-5 py-4 pr-12">
          <SheetTitle className="text-ink truncate text-lg2 font-bold">
            {data ? (
              <span data-no-translit>{data.lead.fullName || formatPhone(data.lead.phone)}</span>
            ) : (
              "Lid kartasi"
            )}
          </SheetTitle>
          <SheetDescription className="text-ink-muted mt-1 text-meta">
            Faqat ko&apos;rish — buyurtmani ochib ishlaysiz
          </SheetDescription>
          {data?.lead.stage ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusPill
                size="sm"
                label={STAGE_LABELS[data.lead.stage]}
                color="var(--brand)"
              />
              {data.lead.statusName ? (
                <StatusPill size="sm" label={data.lead.statusName} color="var(--info)" />
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {detail.isPending && leadId !== null ? (
            <div className="space-y-3" aria-hidden>
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl opacity-60" />
            </div>
          ) : closed ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Lock className="text-ink-faint size-7" aria-hidden />
              <p className="text-ink text-body font-semibold">Bu karta sizga yopiq</p>
              <p className="text-ink-muted max-w-xs text-meta">
                Karta Lidlar bo&apos;limiga qaytgan — logist faqat Dostavka va Bazani ko&apos;radi.
              </p>
            </div>
          ) : detail.error ? (
            <ErrorView
              message={errorMessage(detail.error, "Lid kartasini yuklashda xatolik")}
              onRetry={() => void detail.refetch()}
            />
          ) : data ? (
            <div className="flex flex-col gap-4">
              <dl className="border-line bg-surface grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border px-4 py-3.5">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <dt className="text-ink-faint text-micro uppercase">Telefon</dt>
                  <dd className="text-ink tabular flex items-center gap-1.5 text-dense">
                    <Phone className="size-3.5 shrink-0" aria-hidden />
                    {data.lead.phone ? formatPhone(data.lead.phone) : "—"}
                    {data.lead.phone ? (
                      <CopyButton value={data.lead.phone} label="Telefonni nusxalash" />
                    ) : null}
                  </dd>
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <dt className="text-ink-faint text-micro uppercase">Operator</dt>
                  <dd data-no-translit className="text-ink flex min-w-0 items-center gap-1.5 text-dense">
                    <UserRound className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{data.lead.assignedTo?.fullName || "—"}</span>
                  </dd>
                </div>
                {data.note ? (
                  <div className="col-span-2 flex flex-col gap-0.5">
                    <dt className="text-ink-faint text-micro uppercase">Izoh</dt>
                    <dd data-no-translit className="text-ink text-dense whitespace-pre-line">
                      {data.note}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <section className="flex flex-col gap-2" aria-label="Buyurtmalar">
                <h3 className="text-ink-muted text-micro font-bold tracking-widest uppercase">
                  Buyurtmalar · {data.lead.orders.length}
                </h3>
                {data.lead.orders.length === 0 ? (
                  <p className="text-ink-faint text-meta">Buyurtma yo&apos;q</p>
                ) : (
                  data.lead.orders.map((order) => <OrderRow key={order.id} order={order} />)
                )}
              </section>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function OrderRow({ order }: { order: PipelineOrder }) {
  const info = orderStatusInfo(order.status);
  return (
    <Link
      href={ROUTES.orderDetail(order.id)}
      className="border-line bg-surface hover:border-line-strong group flex flex-col gap-1.5 rounded-xl border px-3.5 py-3 transition-colors duration-(--dur-micro)"
    >
      <span className="flex items-center gap-2">
        <span data-no-translit className="text-ink tabular text-dense font-semibold">
          {order.orderNumber}
        </span>
        <StatusPill size="sm" label={info.label} color={info.color} />
        <span className="text-ink tabular ml-auto text-dense font-semibold">
          {formatSom(order.payableAmount)}
        </span>
        <ArrowUpRight
          className="text-ink-faint group-hover:text-brand size-4 shrink-0 transition-colors"
          aria-hidden
        />
      </span>
      <span className="text-ink-muted flex flex-wrap items-center gap-x-3 gap-y-1 text-meta">
        {order.createdAt ? <span className="tabular">{formatShortDateTime(order.createdAt)}</span> : null}
        {order.courier?.fullName ? (
          <span data-no-translit className="inline-flex items-center gap-1">
            <Truck className="size-3" aria-hidden />
            {order.courier.fullName}
            {order.courier.phone ? (
              <span className="tabular">· {formatPhone(order.courier.phone)}</span>
            ) : null}
          </span>
        ) : null}
        <ChangeRequestChip order={order} />
        <StopChip order={order} />
      </span>
    </Link>
  );
}
