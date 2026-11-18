"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";

import { fetchIssuePlan, fetchSalesSheet, salesSheetParams, saveCourierFee } from "./api";
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
