"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createZone, fetchCashUsers, fetchFilials, fetchZones, updateZone } from "../api/zones-api";
import type { ZoneCreatePayload, ZonePatchPayload } from "../model/zone-form";

export const zoneKeys = {
  all: ["zones"] as const,
  list: (region: string | null) => [...zoneKeys.all, "list", region ?? "*"] as const,
  filials: ["admin-filials"] as const,
  cashUsers: (search: string) => ["cash-users", search.trim()] as const,
};

/** `region === null` — hamma viloyat (kuryer formasi va umumiy sahifa uchun). */
export function useZones(region: string | null, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: zoneKeys.list(region),
    queryFn: ({ signal }) => fetchZones(region, signal),
    staleTime: 60_000,
    enabled: options.enabled ?? true,
  });
}

export function useFilials(enabled = true) {
  return useQuery({
    queryKey: zoneKeys.filials,
    queryFn: ({ signal }) => fetchFilials(signal),
    staleTime: 10 * 60_000,
    enabled,
  });
}

/** Kassa-shaxs qidiruvi — `search` chaqiruvchida debounce qilingan bo'ladi. */
export function useCashUsers(search: string, enabled = true) {
  return useQuery({
    queryKey: zoneKeys.cashUsers(search),
    queryFn: ({ signal }) => fetchCashUsers(search, signal),
    staleTime: 60_000,
    // Yozish davomida eski natija turadi — ro'yxat sakramaydi.
    placeholderData: keepPreviousData,
    enabled,
  });
}

/**
 * Har zona o'zgarishi tumanlar (`zone_id`) va kuryer ro'yxatiga ham ta'sir
 * qiladi — `onChanged` orqali chaqiruvchi o'sha kesh(lar)ni eskirtiradi.
 */
function useInvalidateZones(onChanged?: () => void) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: zoneKeys.all });
    onChanged?.();
  };
}

export function useCreateZone(onChanged?: () => void) {
  const invalidate = useInvalidateZones(onChanged);
  return useMutation({
    mutationFn: (payload: ZoneCreatePayload) => createZone(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateZone(onChanged?: () => void) {
  const invalidate = useInvalidateZones(onChanged);
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: ZonePatchPayload }) => updateZone(id, patch),
    onSuccess: invalidate,
  });
}
