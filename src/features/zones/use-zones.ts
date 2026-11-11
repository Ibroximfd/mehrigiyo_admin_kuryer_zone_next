"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";

import { fetchRegionsDictionary } from "./api";

const HOUR = 60 * 60 * 1000;
/** Bosh kuryer tumanni tahrirlay oladi — boshqa qurilmadagi o'zgarish 5 daqiqada yetib keladi (`304` arzon). */
const STALE = 5 * 60 * 1000;

/** Viloyat + tumanlar lug'ati — o'z tahririda `queryKeys.metaRegions` darhol yangilanadi. */
export function useRegionsDictionary() {
  return useQuery({
    queryKey: queryKeys.metaRegions,
    queryFn: ({ signal }) => fetchRegionsDictionary(signal),
    staleTime: STALE,
    gcTime: HOUR,
    retry: 1,
  });
}
