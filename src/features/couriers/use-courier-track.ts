"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";

import { fetchCourierTrack } from "./api";

/** `YYYY-MM-DD` → o'sha kunning mahalliy [00:00, 24:00) oralig'i ISO shaklida. */
export function dayRangeIso(day: string): { from: string; to: string } {
  const start = new Date(`${day}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

/** Kun izi — tanlangan kuryer va kun uchun. `courierId === null` — so'rov yo'q. */
export function useCourierTrack(courierId: number | null, day: string) {
  const range = dayRangeIso(day);
  return useQuery({
    queryKey: queryKeys.courierTrack(courierId ?? 0, range.from, range.to),
    queryFn: ({ signal }) =>
      fetchCourierTrack(courierId ?? 0, range.from, range.to, signal),
    enabled: courierId !== null,
    staleTime: 60_000,
    retry: false,
  });
}
