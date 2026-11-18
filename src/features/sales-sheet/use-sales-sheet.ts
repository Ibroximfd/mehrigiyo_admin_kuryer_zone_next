"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";

import { addCashReceipt, cancelCashReceipt, fetchIssuePlan, fetchSalesSheet, salesSheetParams, saveCourierDiscount, saveCourierFee } from "./api";
import type { SheetRange } from "./period";

/**
 * Sotuv jadvali. Oldingi davr javobi yangi sana ostida ushlab turilmaydi
 * (`keepPreviousData` yo'q): pul jadvalida eski raqam yangi kun nomi bilan
 * ko'rinmasin — davr almashganda skelet chiqadi.
 */
export function useSalesSheet(range: SheetRange) {
  return useQuery({
    queryKey: queryKeys.chiefSalesSheet(salesSheetParams(range)),
    queryFn: ({ signal }) => fetchSalesSheet(range, signal),
  });
}

export function useIssuePlan(date: string) {
  return useQuery({
    queryKey: queryKeys.chiefIssuePlan(date),
    queryFn: ({ signal }) => fetchIssuePlan(date, signal),
  });
}

/**
 * Kuryer xizmatini saqlash. «Topshiradi» va jami serverda hisoblanadi —
 * jadval qayta so'raladi; mutatsiya yangi raqamlar kelguncha «saqlanmoqda»
 * holatida turadi (`onSuccess` va'dasi kutiladi).
 */
export function useSaveCourierFee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveCourierFee,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.chiefSalesSheets }),
  });
}

/**
 * Kuryerdan pul olish (hujjat 85 §2): skidka, «Oldim» va uni bekor qilish.
 * «Olinishi kerak», qarz va ertangi o'tgan qarz serverda qayta hisoblanadi —
 * jadval qayta so'raladi va mutatsiya yangi raqamlar kelguncha «saqlanmoqda»
 * turadi. Kassa jadvali ham yangilanadi: filial naqdi — kuryerlardan olingan pul (§3).
 */
function useCashMutation<TInput>(mutationFn: (input: TInput) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.chiefSalesSheets }),
        queryClient.invalidateQueries({ queryKey: queryKeys.chiefCashSheets }),
      ]),
  });
}

export function useSaveCourierDiscount() {
  return useCashMutation(saveCourierDiscount);
}

export function useAddCashReceipt() {
  return useCashMutation(addCashReceipt);
}

export function useCancelCashReceipt() {
  return useCashMutation(cancelCashReceipt);
}
