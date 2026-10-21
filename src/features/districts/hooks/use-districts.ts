"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchDistricts, updateDistrict } from "../api/districts-api";
import { applyDistrictPatch, replaceDistrict, type AdminDistrict, type DistrictPatch } from "../model/district";

export const districtKeys = {
  all: ["districts"] as const,
  list: (region: string) => [...districtKeys.all, "list", region] as const,
};

export function useDistricts(region: string | null) {
  return useQuery({
    queryKey: districtKeys.list(region ?? ""),
    queryFn: ({ signal }) => fetchDistricts(region ?? "", signal),
    enabled: Boolean(region),
    staleTime: 60_000,
  });
}

type UpdateVariables = { code: string; patch: DistrictPatch };

/**
 * Nom/faollik tahriri — optimistik: jadval darhol yangilanadi, xato bo'lsa
 * oldingi holat qaytariladi. Faollik zonalarga ta'sir qiladi, shuning uchun
 * `onChanged` orqali chaqiruvchi zonalar keshini ham eskirtiradi.
 */
export function useUpdateDistrict(region: string, onChanged?: () => void) {
  const queryClient = useQueryClient();
  const key = districtKeys.list(region);

  return useMutation({
    mutationFn: ({ code, patch }: UpdateVariables) => updateDistrict(code, patch),
    onMutate: async ({ code, patch }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<AdminDistrict[]>(key);
      if (previous) queryClient.setQueryData(key, applyDistrictPatch(previous, code, patch));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<AdminDistrict[]>(key, (current) =>
        current ? replaceDistrict(current, updated) : current,
      );
    },
    onSettled: (_data, _error, { patch }) => {
      if (patch.isActive !== undefined) {
        void queryClient.invalidateQueries({ queryKey: key });
        onChanged?.();
      }
    },
  });
}
