"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, LoaderCircle, UsersRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyView, ErrorView } from "@/components/kit/state-views";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { assignChiefOrder, fetchChiefCouriers } from "@/features/chief/api";
import { reassignErrorText } from "@/features/chief/delivered-reassign";
import type { LogistOrder } from "@/features/orders/types";
import { errorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

/**
 * Yetkazilgan zakazga kuryerni keyin biriktirish (hujjat 125 C): zakaz kuryersiz
 * (yoki bosh kuryerning yashirin o'rnida) yopilgan — kim yetkazgani endi yoziladi.
 * Server sotuvni ombordan shu kuryerga, pulni uning qatoriga o'tkazadi; sana
 * o'zgarmaydi.
 *
 * Bu — hisob tuzatishi, yetkazishga nomzod tanlash emas: ro'yxat — bosh
 * kuryerning o'z faol kuryerlari (zona va yuklamasiz). Ikki qadam ataylab:
 * biriktirilgach kuryerni bosh kuryer o'zi qayta o'zgartira olmaydi (faqat
 * logist), shuning uchun tanlov alohida tasdiqlanadi.
 */
/** Oynaga faqat zakazning o'zi kerak — «Kuryersiz» blokidagi qisqa yozuv ham yetadi. */
type AttachTarget = Pick<LogistOrder, "id" | "orderNumber">;

export function AttachCourierDialog({ order, onClose }: { order: AttachTarget | null; onClose: () => void }) {
  return (
    <Dialog open={order !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[85vh] w-[30rem] max-w-[calc(100vw-2rem)] flex-col">
        {/* `key` — boshqa zakaz ochilsa tanlov qaytadan boshlanadi (effektsiz). */}
        {order ? <AttachBody key={order.id} order={order} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function AttachBody({ order, onClose }: { order: AttachTarget; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [pickedId, setPickedId] = useState<number | null>(null);
  const couriers = useQuery({ queryKey: queryKeys.chiefCouriers, queryFn: ({ signal }) => fetchChiefCouriers(signal) });
  const active = (couriers.data ?? []).filter((courier) => courier.isActive);
  const picked = active.find((courier) => courier.id === pickedId) ?? null;

  const attach = useMutation({
    mutationFn: (courierId: number) => assignChiefOrder(order.id, courierId),
    onSuccess: ({ order: updated }) => {
      toast.success(`${updated.orderNumber} · ${updated.courier?.fullName ?? picked?.fullName ?? ""}`, {
        description: "Sotuv va pul shu kuryer qatoriga o'tdi",
      });
      // Zakaz, sklad qoldig'i va Sotuv jadvali — hammasi o'zgardi.
      void queryClient.invalidateQueries({ queryKey: queryKeys.chief });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      onClose();
    },
    onError: (error) => toast.error(reassignErrorText(error, "Kuryerni biriktirishda xatolik")),
  });

  return (
    <>
      <DialogTitle>Kuryerni biriktirish</DialogTitle>
      <DialogDescription>
        {/* Raqam lotinda qoladi — kirill rejimida «ОРД-…» bo'lib ketmasin. */}
        <span data-no-translit>{order.orderNumber}</span> — yetkazilgan zakaz. Kim yetkazganini tanlang.
      </DialogDescription>
      <p className="bg-subtle text-ink-muted mt-2 rounded-lg px-3 py-2 text-meta">
        Sotuv ombordan shu kuryerga, pul uning qatoriga o&apos;tadi. Zakaz sanasi o&apos;zgarmaydi. Keyin kuryerni faqat logist
        o&apos;zgartira oladi.
      </p>

      <div className="scrollbar-thin -mx-1 mt-3 min-h-0 flex-1 overflow-y-auto px-1">
        {couriers.isPending ? (
          <div className="space-y-1.5" aria-busy>
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-11 rounded-lg" />
            ))}
          </div>
        ) : couriers.isError ? (
          <ErrorView message={errorMessage(couriers.error, "Kuryerlarni yuklashda xatolik")} onRetry={() => void couriers.refetch()} />
        ) : active.length === 0 ? (
          <EmptyView Icon={UsersRound} title="Faol kuryer yo'q" description="Avval «Kuryerlar» bo'limida kuryer qo'shing yoki blokdan chiqaring." />
        ) : (
          <ul role="radiogroup" aria-label="Kuryer" className="space-y-1">
            {active.map((courier) => {
              const on = courier.id === pickedId;
              return (
                <li key={courier.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={attach.isPending}
                    onClick={() => setPickedId(courier.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                      "focus-visible:ring-brand/40 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60",
                      on ? "border-brand bg-brand-soft" : "border-line hover:bg-subtle",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="text-ink block truncate text-dense font-semibold" data-no-translit>
                        {courier.fullName}
                      </span>
                      {courier.zones.length > 0 ? (
                        <span className="text-ink-faint block truncate text-meta" data-no-translit>
                          {courier.zones.map((zone) => zone.name).join(", ")}
                        </span>
                      ) : null}
                    </span>
                    {on ? <Check className="text-brand size-4 shrink-0" aria-hidden /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Bekor qilish
        </Button>
        <Button type="button" disabled={picked === null || attach.isPending} onClick={() => picked && attach.mutate(picked.id)}>
          {attach.isPending ? <LoaderCircle className="animate-spin" /> : null}
          Biriktirish
        </Button>
      </div>
    </>
  );
}
