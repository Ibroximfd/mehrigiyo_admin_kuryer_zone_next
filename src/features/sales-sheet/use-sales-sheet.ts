"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { todayIso } from "@/lib/format";
import { LIVE_REFETCH_MS } from "@/lib/live-refetch";
import { queryKeys } from "@/lib/query-keys";

import { addCashReceipt, cancelCashReceipt, fetchIssuePlan, fetchSalesSheet, salesSheetParams, saveCourierDiscount, saveCourierFee, saveCourierOnline } from "./api";
import type { SheetRange } from "./period";

/**
 * Sotuv jadvali. Oldingi davr javobi yangi sana ostida ushlab turilmaydi
 * (`keepPreviousData` yo'q): pul jadvalida eski raqam yangi kun nomi bilan
 * ko'rinmasin — davr almashganda skelet chiqadi. Bugun kirgan davr — jonli.
 */
export function useSalesSheet(range: SheetRange) {
  return useQuery({
    queryKey: queryKeys.chiefSalesSheet(salesSheetParams(range)),
    queryFn: ({ signal }) => fetchSalesSheet(range, signal),
    refetchInterval: range.dateTo >= todayIso() ? LIVE_REFETCH_MS : false,
  });
}

/** Berish rejasi — faqat bugun ochiq jadvalda kerak (`enabled`). */
export function useIssuePlan(date: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.chiefIssuePlan(date),
    queryFn: ({ signal }) => fetchIssuePlan(date, signal),
    enabled,
    refetchInterval: enabled ? LIVE_REFETCH_MS : false,
  });
}

/**
 * Jadvaldagi qo'lda yoziladigan pul (kuryer xizmati, skidka, Click) va «Oldim».
 * «Topshirishi kerak», qarz va ertangi o'tgan qarz serverda qayta hisoblanadi —
 * jadval qayta so'raladi, mutatsiya yangi raqamlar kelguncha «saqlanmoqda»
 * turadi (`onSuccess` va'dasi kutiladi).
 */
function useSheetMutation<TInput>(mutationFn: (input: TInput) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.chiefSalesSheets }),
  });
}

export function useSaveCourierFee() {
  return useSheetMutation(saveCourierFee);
}

export function useSaveCourierDiscount() {
  return useSheetMutation(saveCourierDiscount);
}

export function useSaveCourierOnline() {
  return useSheetMutation(saveCourierOnline);
}

export function useAddCashReceipt() {
  return useSheetMutation(addCashReceipt);
}

export function useCancelCashReceipt() {
  return useSheetMutation(cancelCashReceipt);
}
