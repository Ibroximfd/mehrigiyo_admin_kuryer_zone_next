"use client";

import { useQuery } from "@tanstack/react-query";

import { errorCode } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import { fetchSkladMe } from "./api";
import type { SkladMe } from "./types";

/**
 * Sklad roli (§1) — sahifa ochilganda bir marta, 5 daqiqa yangi.
 * Backend hali chiqmagan bo'lsa `missing = true`: sahifa «kutilmoqda»
 * holatini ko'rsatadi, tugmalar yashirin.
 */
export function useSkladMe(): { me: SkladMe | null; missing: boolean; isPending: boolean } {
  const query = useQuery({
    queryKey: queryKeys.skladMe,
    queryFn: ({ signal }) => fetchSkladMe(signal),
    staleTime: 5 * 60_000,
    retry: false,
  });
  return {
    me: query.data ?? null,
    missing: errorCode(query.error) === "endpoint_missing",
    isPending: query.isPending,
  };
}
