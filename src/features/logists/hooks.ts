"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";

import { fetchMyPermissions, fetchPermissionCatalog } from "./api";
import { KNOWN_PERMISSIONS } from "./types";

/** Dopusklarim — `404` (eski backend) yoki xato: bo'lim ko'rinmaydi. */
export function useMyPermissions() {
  return useQuery({
    queryKey: queryKeys.myPermissions,
    queryFn: ({ signal }) => fetchMyPermissions(signal),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/** Dopusk katalogi; server bermasa — ma'lum kalitlar. */
export function usePermissionCatalog() {
  const query = useQuery({
    queryKey: queryKeys.permissionCatalog,
    queryFn: ({ signal }) => fetchPermissionCatalog(signal),
    staleTime: 30 * 60_000,
    retry: false,
  });
  return {
    catalog: query.data && query.data.length > 0 ? query.data : KNOWN_PERMISSIONS,
    isPending: query.isPending,
  };
}
