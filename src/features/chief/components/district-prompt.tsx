"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, LoaderCircle, MapPinOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { fixChiefOrderAddress } from "@/features/chief/api";
import { districtChoices } from "@/features/chief/district-view";
import { ADDRESS_FIX_FIELDS, chiefActionFailure, courierWasUnassigned } from "@/features/chief/order-action-rules";
import { dropOrder, storeOrderDetail } from "@/features/chief/order-cache";
import type { LogistOrder } from "@/features/orders/types";
import type { DistrictOption } from "@/features/orders/zoning";
import { queryKeys } from "@/lib/query-keys";

/**
 * Server tumanni ishonch bilan yoza olmagan zakaz (60-javob):
 *   • `guess` — «Tuman mos kelmadi: X?» — bir bosishda tasdiqlash (ikki
 *     ma'noli bo'lsa variantlar ham), yoki «Boshqasi» → «Manzilni tuzatish»;
 *   • `missing` — «Tuman aniqlanmadi» → «Manzilni tuzatish» da tanlanadi.
 * Tasdiqlash ham o'sha `PATCH chief/orders/{id}/address/` — ko'cha va mo'ljal o'zgarmaydi.
 */
export function DistrictPrompt({ order, onPickOther }: { order: LogistOrder; onPickOther: () => void }) {
  const queryClient = useQueryClient();
  const choices = districtChoices(order.zoning);
  const guessed = order.zoning.districtState === "guess";

  const confirm = useMutation({
    mutationFn: (option: DistrictOption) =>
      fixChiefOrderAddress(order.id, {
        district: option.district,
        addressText: order.deliveryInfo?.address ?? "",
        landmark: order.deliveryInfo?.landmark ?? "",
        reason: "clarified",
        note: "",
      }),
    onSuccess: (detail) => {
      storeOrderDetail(queryClient, detail);
      void queryClient.invalidateQueries({ queryKey: queryKeys.chief });
      toast.success(`${order.orderNumber} — tuman qo'yildi`);
      if (courierWasUnassigned(order, detail.order)) {
        toast.info("Kuryer yangi zonada emas — zakazdan olindi va «Kelganlar» ga qaytdi");
      }
    },
    onError: (error) => {
      const failure = chiefActionFailure(error, ADDRESS_FIX_FIELDS, "Tumanni saqlashda xatolik");
      toast.error(failure.kind === "validation" ? (failure.fields.district ?? failure.message) : failure.message);
      if (failure.kind === "gone") dropOrder(queryClient, order.id);
      else if (failure.kind === "closed") void queryClient.invalidateQueries({ queryKey: queryKeys.chief });
    },
  });

  return (
    <div className="border-warn/40 bg-warn-soft flex flex-col gap-2 rounded-xl border px-3 py-2.5" role="status">
      <p className="text-ink flex items-center gap-1.5 text-dense font-semibold">
        <MapPinOff className="text-warn size-4 shrink-0" aria-hidden />
        {guessed ? "Tuman mos kelmadi — to'g'risini tanlang" : "Tuman aniqlanmadi — tanlang"}
      </p>
      <div className="flex flex-wrap gap-2">
        {choices.map((option) => {
          const busy = confirm.isPending && confirm.variables?.district === option.district;
          return (
            <Button
              key={option.district}
              size="sm"
              variant={option === choices[0] ? "default" : "outline"}
              disabled={confirm.isPending}
              onClick={() => confirm.mutate(option)}
            >
              {busy ? <LoaderCircle className="animate-spin" /> : <Check />}
              <span data-no-translit>{option.districtDisplay}</span>
            </Button>
          );
        })}
        <Button size="sm" variant={choices.length ? "ghost" : "default"} disabled={confirm.isPending} onClick={onPickOther}>
          {choices.length ? "Boshqasi" : "Tumanni tanlash"}
        </Button>
      </div>
    </div>
  );
}
