"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";

import { useAckStore } from "@/stores/ack-store";
import { useAuthStore } from "@/stores/auth-store";

import {
  EMPTY_LOCAL_ACKS,
  hasUnseenChanges,
  isFreshOrder,
  orderAcks,
} from "./acknowledgement";
import type { LocalAckState } from "./acknowledgement";
import { acknowledgeOrder } from "./api";
import { orderErrorMessage } from "./error-hints";
import { patchOrderInCaches } from "./realtime";
import type { LogistOrder, OrderAck } from "./types";

export type OrderAcksApi = {
  isFresh: (order: LogistOrder) => boolean;
  acksOf: (order: LogistOrder) => OrderAck[];
  hasUnseen: (order: LogistOrder) => boolean;
  acknowledge: (order: LogistOrder) => void;
  /** Logist buyurtmani ochdi / o'zgartirdi — "ko'rilmagan o'zgarish" nuqtasi o'chadi. */
  markSeen: (orderId: string) => void;
  pendingId: string | null;
  local: LocalAckState;
  userId: string | null;
};

/**
 * "Yangi" va "Oldim" holati — doska, ro'yxat va detal uchun bitta hook.
 * Qoidalar `acknowledgement.ts` da (sof), bu yerda faqat ulash: joriy
 * logist, zaxira store, server so'rovi va keshni yamash.
 */
export function useOrderAcks(): OrderAcksApi {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const userName = useAuthStore((state) => state.user?.name ?? "");
  const entry = useAckStore((state) => (userId ? state.byUser[userId] : undefined));
  const ensureBaseline = useAckStore((state) => state.ensureBaseline);
  const storeAck = useAckStore((state) => state.acknowledge);
  const storeSeen = useAckStore((state) => state.markSeen);

  useEffect(() => {
    if (userId) ensureBaseline(userId, Date.now());
  }, [userId, ensureBaseline]);

  const local: LocalAckState = useMemo(
    () =>
      entry
        ? { baselineAt: entry.baselineAt, acks: entry.acks, seen: entry.seen }
        : EMPTY_LOCAL_ACKS,
    [entry],
  );

  const mutation = useMutation({
    mutationFn: (order: LogistOrder) => acknowledgeOrder(order.id),
    onMutate: (order) => {
      const now = Date.now();
      if (userId) storeAck(userId, order.id, now);
      // Server rejimida darhol o'zimizni qo'shamiz — javob kelguncha karta sakramasin.
      if (order.acknowledgedBy !== null) {
        const self: OrderAck = {
          userId,
          name: userName || "Siz",
          at: new Date(now),
          isSystem: false,
        };
        patchOrderInCaches(queryClient, order.id, (current) => ({
          ...current,
          // Server ham shunday: eskisi birinchi, takroriy bosish yangi yozuv tug'dirmaydi.
          acknowledgedBy: (current.acknowledgedBy ?? []).some(
            (ack) => !ack.isSystem && ack.userId === userId,
          )
            ? current.acknowledgedBy
            : [...(current.acknowledgedBy ?? []), self],
        }));
      }
      return { previous: order.acknowledgedBy };
    },
    onSuccess: (acks, order) => {
      if (acks === null) return; // backend yo'q — zaxira belgi yetarli
      patchOrderInCaches(queryClient, order.id, (current) => ({ ...current, acknowledgedBy: acks }));
    },
    onError: (error, order, context) => {
      if (context && context.previous !== null) {
        patchOrderInCaches(queryClient, order.id, (current) => ({
          ...current,
          acknowledgedBy: context.previous,
        }));
      }
      toast.error(orderErrorMessage(error, "«Oldim» belgisini saqlab bo'lmadi"));
    },
  });

  const acknowledgeMutate = mutation.mutate;
  const acknowledge = useCallback((order: LogistOrder) => acknowledgeMutate(order), [acknowledgeMutate]);
  const markSeen = useCallback(
    (orderId: string) => {
      if (userId) storeSeen(userId, orderId, Date.now());
    },
    [userId, storeSeen],
  );

  // Barqaror havolalar — sahifadagi `useMemo` lar har renderda qayta hisoblanmasin.
  const isFresh = useCallback(
    (order: LogistOrder) => isFreshOrder(order, userId, local),
    [userId, local],
  );
  const acksOf = useCallback((order: LogistOrder) => orderAcks(order, userId, local), [userId, local]);
  const hasUnseen = useCallback(
    (order: LogistOrder) => hasUnseenChanges(order, userId, local),
    [userId, local],
  );

  return {
    isFresh,
    acksOf,
    hasUnseen,
    acknowledge,
    markSeen,
    pendingId: mutation.isPending ? (mutation.variables?.id ?? null) : null,
    local,
    userId,
  };
}

/**
 * Logistning o'z amali (status, tahrir, kuryer) — "ko'rilmagan o'zgarish"
 * nuqtasi o'z o'zgarishimizdan yonmasin. Hook'siz: mutatsiya
 * callback'laridan chaqiriladi.
 */
export function markOrderSeen(orderId: string): void {
  const userId = useAuthStore.getState().user?.id;
  if (userId) useAckStore.getState().markSeen(userId, orderId, Date.now());
}
