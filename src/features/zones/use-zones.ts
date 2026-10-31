"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";

import { fetchRegionsDictionary } from "./api";

const HOUR = 60 * 60 * 1000;

/** Viloyat + tumanlar lug'ati — kamdan-kam o'zgaradi (server keshi 1 soat). */
export function useRegionsDictionary() {
  return useQuery({
    queryKey: queryKeys.metaRegions,
    queryFn: ({ signal }) => fetchRegionsDictionary(signal),
    staleTime: HOUR,
    gcTime: HOUR,
    retry: 1,
  });
}
