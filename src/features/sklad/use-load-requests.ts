"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";

import { fetchLoadRequests } from "./api";
import type { LoadRequestStatus } from "./types";

/**
 * Kuryer kirim so'rovlari holat bo'yicha. Kutilayotganlar har daqiqada
 * yangilanadi — panel ham, «Kuryerlar ombori» tabidagi son ham shu keshdan.
 */
export function useLoadRequests(status: LoadRequestStatus) {
  return useQuery({
    queryKey: queryKeys.chiefLoadRequests(status),
    queryFn: ({ signal }) => fetchLoadRequests(status, signal),
    refetchInterval: status === "pending" ? 60_000 : false,
  });
}
