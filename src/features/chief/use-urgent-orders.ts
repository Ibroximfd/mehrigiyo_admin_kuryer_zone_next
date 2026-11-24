"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { errorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import { ackChiefUrgent, fetchChiefUrgent } from "./api";
import { patchOrderInList } from "./order-cache";
import type { ChiefOrderDetail } from "./types";
import {
  URGENT_POLL_MS,
  URGENT_RETRY_MS,
  isAckGone,
  urgentCounts,
  withAck,
  withOrder,
  withoutAck,
  withoutOrder,
} from "./urgent";
import type { UrgentBoard, UrgentCounts } from "./urgent";
import { useChiefMe } from "./use-chief-me";

type CachedBoard = UrgentBoard | null | undefined;

const NO_COUNTS: UrgentCounts = { total: 0, unacked: 0 };

/**
 * Faol shoshilinch zakazlar (hujjat 123 §4.1). Bu saytda soket yo'q — ro'yxat
 * har 15 soniyada so'raladi, tab fonda bo'lsa ham (signal o'shanda ham kerak).
 * Banner, menyu sanagichi va «Zakazlar»dagi bo'lim shu bitta so'rovni bo'lishadi.
 *
 * `board: null` — server funksiyani bilmaydi yoki javob hali kelmagan: hech narsa
 * chizilmaydi. Server bilmasa (`404`) so'rov butunlay o'chadi (fokus va kesh
 * yangilanishida ham qayta so'ralmaydi). Vaqtinchalik xatoda (oflayn, `5xx`)
 * oxirgi yuklangan ro'yxat ko'rinib turadi va so'rov davom etadi; hali birorta
 * javob olinmagan bo'lsa — sekinroq (`URGENT_RETRY_MS`).
 */
export function useUrgentOrders(): { board: UrgentBoard | null; counts: UrgentCounts } {
  const queryClient = useQueryClient();
  const { isChief } = useChiefMe();
  const unsupported = queryClient.getQueryData<CachedBoard>(queryKeys.chiefUrgent) === null;
  const query = useQuery({
    queryKey: queryKeys.chiefUrgent,
    queryFn: ({ signal }) => fetchChiefUrgent(signal),
    enabled: isChief && !unsupported,
    refetchInterval: (current) =>
      current.state.data === undefined && current.state.status === "error" ? URGENT_RETRY_MS : URGENT_POLL_MS,
    refetchIntervalInBackground: true,
    retry: false,
  });
  const board = query.data ?? null;
  return { board, counts: board ? urgentCounts(board.orders) : NO_COUNTS };
}

/**
 * «Qabul qildim» (§4.2). Optimistik: banner va signal darhol to'xtaydi; server
 * rad etsa belgi qaytadi. Belgi olib tashlangan yoki zakaz boshqasiga o'tgan
 * bo'lsa (`409 not_urgent` / `404`) zakaz ro'yxatdan chiqadi — bu xato emas.
 */
export function useAckUrgent() {
  const queryClient = useQueryClient();
  const { me } = useChiefMe();
  const patchBoard = (patch: (board: UrgentBoard) => UrgentBoard) =>
    queryClient.setQueryData<CachedBoard>(queryKeys.chiefUrgent, (board) => (board ? patch(board) : board));

  return useMutation({
    mutationFn: (orderId: string) => ackChiefUrgent(orderId),
    onMutate: async (orderId) => {
      // Yo'ldagi eski javob optimistik belgini bosib ketmasin.
      await queryClient.cancelQueries({ queryKey: queryKeys.chiefUrgent });
      const by = { id: me?.seat.id ?? null, fullName: me?.seat.fullName ?? "" };
      patchBoard((board) => withAck(board, orderId, by, new Date()));
    },
    onSuccess: (order) => {
      patchBoard((board) => withOrder(board, order));
      queryClient.setQueriesData({ queryKey: queryKeys.chiefOrderLists }, (data: unknown) =>
        patchOrderInList(data, order.id, order),
      );
      queryClient.setQueryData<ChiefOrderDetail>(queryKeys.chiefOrderDetail(order.id), (detail) =>
        detail ? { ...detail, order } : detail,
      );
    },
    onError: (error, orderId) => {
      if (isAckGone(error)) {
        patchBoard((board) => withoutOrder(board, orderId));
        toast.info("Zakaz endi shoshilinch emas yoki sizda emas");
        return;
      }
      patchBoard((board) => withoutAck(board, orderId));
      toast.error(errorMessage(error, "Qabul qilishda xatolik"));
    },
    onSettled: (_order, _error, orderId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.chiefUrgent });
      // Tarixga «qabul qilindi» yozuvi tushdi — ochiq detal qayta o'qiydi.
      void queryClient.invalidateQueries({ queryKey: queryKeys.chiefOrderDetail(orderId) });
    },
  });
}
