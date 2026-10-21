"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchRegionSettings, updateRegionSettings } from "../api/settings-api";
import type { AutoAssignMode, RegionSettings } from "../model/region-settings";

export const settingsKeys = {
  all: ["region-settings"] as const,
  region: (region: string) => [...settingsKeys.all, region] as const,
};

export function useRegionSettings(region: string) {
  return useQuery({
    queryKey: settingsKeys.region(region),
    queryFn: ({ signal }) => fetchRegionSettings(region, signal),
    staleTime: 5 * 60_000,
  });
}

/** Optimistik: segment darhol almashadi, xato bo'lsa qaytadi. */
export function useUpdateRegionSettings(region: string) {
  const queryClient = useQueryClient();
  const key = settingsKeys.region(region);

  return useMutation({
    mutationFn: (mode: AutoAssignMode) => updateRegionSettings(region, mode),
    onMutate: async (mode) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<RegionSettings>(key);
      queryClient.setQueryData<RegionSettings>(key, { region, autoAssign: mode });
      return { previous };
    },
    onError: (_error, _mode, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: (settings) => queryClient.setQueryData(key, settings),
  });
}
