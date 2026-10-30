"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";

import { fetchStaffUnread } from "./api";

/**
 * Xodimlar chatidagi jami o'qilmaganlar — menyu belgisi ishlatadigan
 * **o'sha** kesh (`queryKeys.staffUnread`), ya'ni qo'shimcha so'rov yo'q.
 * Real vaqt (`staff_message`, `staff_badge`) uni joyida oshiradi, kanal
 * ochilganda esa kamaytiradi.
 */
export function useStaffUnreadTotal(): number {
  const { data } = useQuery({
    queryKey: queryKeys.staffUnread,
    queryFn: ({ signal }) => fetchStaffUnread(signal),
    refetchInterval: 60_000,
  });
  return data?.unread ?? 0;
}
