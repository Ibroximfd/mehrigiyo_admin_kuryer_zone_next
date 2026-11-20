"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createCourierDocument } from "@/features/sklad/api";
import { queryKeys } from "@/lib/query-keys";

import type { IssueLine } from "./types";

export type GiveInput = { locationId: number; courierId: number; lines: IssueLine[] };

/**
 * Kuryerga mol berish (`courier_load`, sklad hujjati §6) — Sotuv jadvalidagi
 * «Berish kerak» qatoridan, oynasiz. Saqlangach sklad, berish rejasi va
 * jadval qayta so'raladi; mutatsiya yangi raqamlar kelguncha «berilmoqda» turadi.
 */
export function useGiveToCourier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GiveInput) => createCourierDocument({ type: "courier_load", ...input }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.chiefSklad }),
        queryClient.invalidateQueries({ queryKey: queryKeys.chiefSalesSheets }),
      ]),
  });
}
