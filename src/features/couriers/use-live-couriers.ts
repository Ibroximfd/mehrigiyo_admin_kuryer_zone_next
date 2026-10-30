"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDocumentVisible } from "@/hooks/use-document-visible";
import { queryKeys } from "@/lib/query-keys";

import { fetchLiveCouriers } from "./api";
import { liveCouriersParams, liveRefetchInterval } from "./live-tracking";
import type { LiveFilter } from "./live-tracking";

/**
 * Jonli xarita kuryerlari (§7.3). WS `courier_location` keshni joyida
 * yamaydi (`realtime.ts`); bundan tashqari xarita ochiq va tab ko'rinib
 * turganda 30 s da qayta so'raladi — har so'rov kuryerlarni 60 s ga jadal
 * rejimga (10 s) o'tkazadi. Xarita yopilsa yoki tab yashirinsa so'rov to'xtaydi.
 */
export function useLiveCouriers(enabled: boolean, filter: LiveFilter) {
  const documentVisible = useDocumentVisible();
  const params = liveCouriersParams(filter);
  return useQuery({
    queryKey: queryKeys.couriersLiveQuery(params),
    queryFn: ({ signal }) => fetchLiveCouriers(params, signal),
    enabled,
    staleTime: 10_000,
    placeholderData: keepPreviousData,
    refetchInterval: liveRefetchInterval({ mapOpen: enabled, documentVisible }),
    refetchIntervalInBackground: false,
  });
}

/** Umumiy soat — `@/hooks/use-now-tick` ga ko'chirildi (doska ham ishlatadi). */
export { useNowTick } from "@/hooks/use-now-tick";
