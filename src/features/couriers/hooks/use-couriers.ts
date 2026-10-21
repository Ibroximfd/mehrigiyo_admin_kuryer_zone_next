"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createCourier,
  deactivateCourier,
  fetchCouriers,
  logoutCourierDevice,
  reactivateCourier,
  setCourierPassword,
  updateCourier,
} from "../api/couriers-api";
import type { CourierServerFilter } from "../model/courier";
import type { CourierCreatePayload, CourierPatchPayload, SetPasswordPayload } from "../model/courier-form";

export const courierKeys = {
  all: ["couriers"] as const,
  list: (filter: CourierServerFilter) =>
    [
      ...courierKeys.all,
      "list",
      filter.region ?? "*",
      filter.zone ?? "*",
      filter.shift,
      filter.status,
      filter.search.trim(),
    ] as const,
};

export function useCouriers(filter: CourierServerFilter, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: courierKeys.list(filter),
    queryFn: ({ signal }) => fetchCouriers(filter, signal),
    // Smena/onlayn holati tez o'zgaradi — 30 soniya yetarli yangi.
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}

function useInvalidateCouriers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: courierKeys.all });
}

export function useCreateCourier() {
  const invalidate = useInvalidateCouriers();
  return useMutation({
    mutationFn: (payload: CourierCreatePayload) => createCourier(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateCourier() {
  const invalidate = useInvalidateCouriers();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: CourierPatchPayload }) => updateCourier(id, patch),
    onSuccess: invalidate,
  });
}

export function useSetCourierPassword() {
  const invalidate = useInvalidateCouriers();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: SetPasswordPayload }) => setCourierPassword(id, payload),
    onSuccess: invalidate,
  });
}

export function useReactivateCourier() {
  const invalidate = useInvalidateCouriers();
  return useMutation({ mutationFn: (id: number) => reactivateCourier(id), onSuccess: invalidate });
}

export function useDeactivateCourier() {
  const invalidate = useInvalidateCouriers();
  return useMutation({ mutationFn: (id: number) => deactivateCourier(id), onSuccess: invalidate });
}

export function useLogoutCourierDevice() {
  const invalidate = useInvalidateCouriers();
  return useMutation({ mutationFn: (id: number) => logoutCourierDevice(id), onSuccess: invalidate });
}
