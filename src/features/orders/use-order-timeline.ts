"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { useDistrictLookup } from "@/features/zones/use-zones";
import { queryKeys } from "@/lib/query-keys";

import { fetchOrderTimeline } from "./api";
import { fetchOrderComments } from "./comments";
import { buildFallbackTimeline, resolveTimelineDistricts } from "./timeline";
import type { TimelineItem } from "./timeline";
import type { LogistOrderDetail } from "./types";

/**
 * Tarix lentasi: server endpointi bo'lsa — undan; bo'lmasa (`null`) audit +
 * izohlar + urinishlar + "yaratildi/tasdiqlandi" maydonlaridan yig'iladi.
 */
export function useOrderTimeline(orderId: string, detail: LogistOrderDetail | undefined) {
  const server = useQuery({
    queryKey: queryKeys.orderTimeline(orderId),
    queryFn: ({ signal }) => fetchOrderTimeline(orderId, signal),
  });

  const needsFallback = server.data === null;
  const comments = useQuery({
    queryKey: queryKeys.orderComments(orderId),
    queryFn: ({ signal }) => fetchOrderComments(orderId, signal),
    enabled: needsFallback,
  });

  const districtName = useDistrictLookup();
  const items: TimelineItem[] = useMemo(() => {
    // `district_display` siz eski yozuvlar — tuman kodi katalogdan nomlanadi.
    if (server.data) return resolveTimelineDistricts(server.data, districtName);
    if (!needsFallback || !detail) return [];
    return buildFallbackTimeline({
      order: detail.order,
      audit: detail.audit,
      comments: comments.data ?? [],
    });
  }, [server.data, needsFallback, detail, comments.data, districtName]);

  return {
    items,
    isPending: server.isPending || (needsFallback && comments.isPending && !detail),
    error: server.error ?? comments.error ?? null,
    refetch: () => {
      void server.refetch();
      if (needsFallback) void comments.refetch();
    },
  };
}
