"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, LoaderCircle, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { assignChiefOrder, fetchChiefCouriers } from "@/features/chief/api";
import { AttachCourierDialog } from "@/features/chief/components/attach-courier-dialog";
import { reassignErrorText } from "@/features/chief/delivered-reassign";
import { orderDetailHref, shortOrderNumber } from "@/features/chief/order-view";
import { formatPhone, groupThousands } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";

import { shortDate } from "../display";
import type { CourierlessOrder, CourierlessSheet } from "../types";

/**
 * «Kuryersiz (bosh kuryer)» blokidagi zakazlar (hujjat 125 C §4) — qator
 * ochilganda. Backend javobi (2026-11-24): bu zakazlar bosh kuryerning yashirin
 * o'rnida yopilgan — haqiqiy kuryer yozilmagan. Holatlar:
 *   • kuryer yozilmagan yoki `courier_id` — yashirin o'rin (o'z kuryerlari
 *     ro'yxatida yo'q): «Kuryerni biriktirish» — haqiqiy kuryer tanlanadi, server
 *     sotuv va pulni uning qatoriga o'tkazadi. Zakazni bosh kuryerning o'zi
 *     yetkazgan bo'lsa — tuzatish kerak emas;
 *   • `courier_id` — o'z kuryeri, lekin sotuv hali omborda (tuzatishdan oldin
 *     biriktirilgan): «Kuryer qatoriga o'tkazish» — o'sha kuryer bilan `assign/`
 *     qayta yuboriladi (§2.4, qayta bosish xavfsiz).
 * Hisob yo'q: sonlar serverda, amaldan keyin jadval qayta so'raladi.
 */
export function CourierlessOrders({ block, columns }: { block: CourierlessSheet; columns: number }) {
  const queryClient = useQueryClient();
  const [attaching, setAttaching] = useState<CourierlessOrder | null>(null);
  // O'z kuryerlari — yashirin o'rinni haqiqiy kuryerdan ajratish va ism uchun (kesh umumiy).
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
            Bu zakazlar sizning o&apos;rningizda yopilgan — sotuvi omboringizdan ayirilgan. Kuryer yetkazgan bo&apos;lsa, o&apos;sha kuryerni
            biriktiring: sotuv va pul uning qatoriga o&apos;tadi, sana o&apos;zgarmaydi. O&apos;zingiz yetkazgan bo&apos;lsangiz, o&apos;zgartirish
            kerak emas.
          </p>
          <ul className="divide-line border-line bg-surface mt-2 divide-y rounded-xl border">
            {block.orders.map((order) => {
              const courierId = order.courierId;
              const ownCourier = courierId === null ? null : nameOf(courierId);
              const busy = move.isPending && move.variables?.id === order.id;
              return (
                <li key={order.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2">
                  <span className="min-w-0 flex-1 basis-40">
                    <Link
                      href={orderDetailHref(order.id)}
                      title={order.orderNumber}
                      className="text-ink tabular block text-dense font-semibold hover:underline focus-visible:underline focus-visible:outline-none"
                      data-no-translit
                    >
                      {`#${shortOrderNumber(order.orderNumber)}`}
                    </Link>
                    <span className="text-ink-muted flex flex-wrap gap-x-1.5 text-meta">
                      {order.clientPhone ? <span className="tabular">{formatPhone(order.clientPhone)}</span> : null}
                      {order.reportDate ? <span className="tabular">{shortDate(order.reportDate)}</span> : null}
                    </span>
                    <span className="text-ink-faint block truncate text-meta">
                      {ownCourier ? (
                        <>
                          {"Kuryer: "}
                          <span className="text-ink" data-no-translit>
                            {ownCourier}
                          </span>
                        </>
                      ) : couriers.isPending ? null : (
                        "Sizning o'rningizda yopilgan"
                      )}
                    </span>
                  </span>
                  {courierId !== null && ownCourier ? (
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
                    // Ro'yxat kelguncha kuryer kimligi noma'lum — noto'g'ri amal taklif qilinmaydi.
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={couriers.isPending}
                      aria-label={`${order.orderNumber}: kuryerni biriktirish`}
                      onClick={() => setAttaching(order)}
                    >
                      <UserPlus />
                      Kuryerni biriktirish
                    </Button>
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
        <AttachCourierDialog order={attaching} onClose={() => setAttaching(null)} />
      </td>
    </tr>
  );
}
