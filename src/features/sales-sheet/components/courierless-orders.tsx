"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { assignChiefOrder, fetchChiefCouriers } from "@/features/chief/api";
import { reassignErrorText } from "@/features/chief/delivered-reassign";
import { orderDetailHref, shortOrderNumber } from "@/features/chief/order-view";
import { formatPhone, groupThousands } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";

import { shortDate } from "../display";
import type { CourierlessOrder, CourierlessSheet } from "../types";

/**
 * «Kuryersiz (bosh kuryer)» blokidagi zakazlar (hujjat 125 C §4) — qator
 * ochilganda. Ikki xil holat:
 *   • zakazda kuryer yozilgan, lekin sotuv hali omborda — «Kuryer qatoriga
 *     o'tkazish»: o'sha kuryer bilan `assign/` qayta yuboriladi, server sotuv va
 *     pulni uning qatoriga o'tkazadi (§2.4, qayta bosish xavfsiz);
 *   • kuryer yozilmagan — zakaz detali ochiladi, kuryer o'sha yerda biriktiriladi.
 * Hisob yo'q: sonlar serverda, amaldan keyin jadval qayta so'raladi.
 */
export function CourierlessOrders({ block, columns }: { block: CourierlessSheet; columns: number }) {
  const queryClient = useQueryClient();
  // Kuryer ismi — o'z kuryerlar ro'yxatidan (kesh boshqa bo'limlar bilan umumiy).
  const couriers = useQuery({ queryKey: queryKeys.chiefCouriers, queryFn: ({ signal }) => fetchChiefCouriers(signal) });
  const nameOf = (courierId: number) => couriers.data?.find((courier) => courier.id === courierId)?.fullName ?? null;

  const move = useMutation({
    mutationFn: (order: CourierlessOrder & { courierId: number }) => assignChiefOrder(order.id, order.courierId),
    onSuccess: ({ order }, sent) => {
      toast.success(`#${shortOrderNumber(order.orderNumber || sent.orderNumber)} — sotuv kuryer qatoriga o'tdi`, {
        description: order.courier?.fullName ?? nameOf(sent.courierId) ?? undefined,
      });
      // Jadval, sklad qoldig'i va zakaz — hammasi o'zgardi; yangi sonlar serverdan.
      return queryClient.invalidateQueries({ queryKey: queryKeys.chief });
    },
    onError: (error) => toast.error(reassignErrorText(error, "Sotuvni kuryer qatoriga o'tkazib bo'lmadi")),
  });

  const hidden = block.ordersCount - block.orders.length;
  return (
    <tr>
      <td colSpan={columns} className="border-line bg-subtle border-b px-3 py-3">
        {/* Chapga yopishgan: jadval yonga siljiganda ham ro'yxat ko'rinib turadi. */}
        <div className="sticky left-3 inline-block w-full max-w-xs text-left sm:max-w-xl">
          <p className="text-ink-muted text-meta">
            Bu zakazlar sotuvi omboringizdan ayirilgan. Kuryeri yozilgan zakazni o&apos;sha kuryer qatoriga o&apos;tkazing — sotuv va pul
            unga o&apos;tadi, sana o&apos;zgarmaydi.
          </p>
          <ul className="divide-line border-line bg-surface mt-2 divide-y rounded-xl border">
            {block.orders.map((order) => {
              const courierId = order.courierId;
              const courierName = courierId === null ? null : nameOf(courierId);
              const busy = move.isPending && move.variables?.id === order.id;
              return (
                <li key={order.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2">
                  <span className="min-w-0 flex-1 basis-40">
                    <span className="text-ink tabular block text-dense font-semibold" data-no-translit title={order.orderNumber}>
                      {`#${shortOrderNumber(order.orderNumber)}`}
                    </span>
                    <span className="text-ink-muted flex flex-wrap gap-x-1.5 text-meta">
                      {order.clientPhone ? <span className="tabular">{formatPhone(order.clientPhone)}</span> : null}
                      {order.reportDate ? <span className="tabular">{shortDate(order.reportDate)}</span> : null}
                    </span>
                    <span className="text-ink-faint block truncate text-meta">
                      {courierId === null ? (
                        "Kuryer yozilmagan"
                      ) : courierName ? (
                        <>
                          {"Kuryer: "}
                          <span className="text-ink" data-no-translit>
                            {courierName}
                          </span>
                        </>
                      ) : null}
                    </span>
                  </span>
                  {courierId !== null && courierName ? (
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={move.isPending}
                      aria-label={`${order.orderNumber}: kuryer qatoriga o'tkazish`}
                      onClick={() => move.mutate({ ...order, courierId })}
                    >
                      {busy ? <LoaderCircle className="animate-spin" /> : <ArrowRightLeft />}
                      Kuryer qatoriga o&apos;tkazish
                    </Button>
                  ) : (
                    <Link
                      href={orderDetailHref(order.id)}
                      className="text-brand text-meta font-semibold hover:underline focus-visible:underline focus-visible:outline-none"
                    >
                      Zakazni ochish
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
          {block.ordersTruncated || hidden > 0 ? (
            <p className="text-ink-faint mt-1.5 text-meta">
              {`Ro'yxatda ${groupThousands(block.orders.length)} ta, jami ${groupThousands(block.ordersCount)} ta zakaz`}
            </p>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
