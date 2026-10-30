"use client";

import { useQuery } from "@tanstack/react-query";

import { ApiError, errorCode } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import { fetchChiefMe } from "./api";
import type { ChiefMe } from "./types";

/**
 * Bosh kuryer roli (`GET chief/me/`). `200` — bo'lim ko'rinadi; `403` —
 * rol yo'q (oddiy logist), `404` — backend hali chiqmagan. Ikkalasida ham
 * navigatsiyada bo'lim chizilmaydi.
 */
export function useChiefMe(): {
  me: ChiefMe | null;
  isChief: boolean;
  missing: boolean;
  forbidden: boolean;
  isPending: boolean;
} {
  const query = useQuery({
    queryKey: queryKeys.chiefMe,
    queryFn: ({ signal }) => fetchChiefMe(signal),
    staleTime: 5 * 60_000,
    retry: false,
  });
  return {
    me: query.data ?? null,
    isChief: query.data !== undefined,
    missing: errorCode(query.error) === "endpoint_missing",
    forbidden: query.error instanceof ApiError && query.error.status === 403,
    isPending: query.isPending,
  };
}
