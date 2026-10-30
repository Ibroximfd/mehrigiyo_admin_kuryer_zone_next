"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { errorCode } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import { updateOrderWithWarning } from "./api";
import { WARNING_OFF_SHIFT, WARNING_ZONE_MISMATCH } from "./assign-warnings";
import { orderErrorMessage } from "./error-hints";
import { patchOrderInCaches } from "./realtime";
import type { LogistOrder } from "./types";
import { markOrderSeen } from "./use-order-acks";

/**
 * PATCH javobini hamma keshga yozadi (doska, ro'yxat, detal) va bog'liq
 * keshlarni eskirtiradi: tarix, nomzodlar, kuryerlar yuklamasi.
 */
function applyPatched(queryClient: QueryClient, updated: LogistOrder): void {
  markOrderSeen(updated.id);
  patchOrderInCaches(queryClient, updated.id, (previous) => ({
    ...updated,
    acknowledgedBy: updated.acknowledgedBy ?? previous.acknowledgedBy,
  }));
  void queryClient.invalidateQueries({ queryKey: queryKeys.orderTimeline(updated.id) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.orderDetail(updated.id) });
  void queryClient.invalidateQueries({
    queryKey: ["orders"],
    predicate: (query) =>
      query.queryKey[1] !== "detail" && query.queryKey[1] !== "timeline",
  });
  void queryClient.invalidateQueries({ queryKey: queryKeys.couriers });
}

/** Server ogohlantirishlari — bloklamaydi, faqat aytadi (A2: smena · zona). */
export function assignWarningToasts(warnings: readonly string[]): void {
  if (warnings.includes(WARNING_OFF_SHIFT)) {
    toast.warning("Kuryer smenada emas", {
      description: "Biriktirish bajarildi — kuryer smenaga chiqmaguncha ko'rmasligi mumkin",
    });
  }
  if (warnings.includes(WARNING_ZONE_MISMATCH)) {
    toast.warning("Kuryer buyurtma zonasidan emas", {
      description: "Biriktirish bajarildi — zonani tekshiring",
    });
  }
}

/**
 * Kuryer biriktirish / olib tashlash (`courier_id`, `null` — olib tashlash).
 * Taklif chipi, nomzodlar oynasi va detal shu bitta yo'ldan foydalanadi.
 */
export function useAssignCourier(options: { onDone?: (order: LogistOrder) => void } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, courierId }: { orderId: string; courierId: number | null }) =>
      updateOrderWithWarning(orderId, { courierId }),
    onSuccess: ({ order, warnings }) => {
      toast.success(
        order.courier ? `Kuryer biriktirildi: ${order.courier.fullName}` : "Kuryer olib tashlandi",
      );
      assignWarningToasts(warnings);
      applyPatched(queryClient, order);
      options.onDone?.(order);
    },
    onError: (error) => toast.error(orderErrorMessage(error, "Biriktirishda xatolik")),
  });
}

/** Tuman tanlash yoki GPS taxminini tasdiqlash — zona serverda qayta hisoblanadi. */
export function useSetOrderDistrict(options: { onDone?: (order: LogistOrder) => void } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, district }: { orderId: string; district: string | null }) =>
      updateOrderWithWarning(orderId, { district }),
    onSuccess: ({ order }) => {
      toast.success(
        order.zoning.zoneName
          ? `Tuman saqlandi · zona: ${order.zoning.zoneName}`
          : "Tuman saqlandi",
      );
      applyPatched(queryClient, order);
      options.onDone?.(order);
    },
    onError: (error) =>
      toast.error(
        errorCode(error) === "validation_error"
          ? "Bunday tuman topilmadi — ro'yxatdan tanlang"
          : orderErrorMessage(error, "Tumanni saqlashda xatolik"),
      ),
  });
}
