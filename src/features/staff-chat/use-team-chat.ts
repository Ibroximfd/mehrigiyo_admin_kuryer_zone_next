"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { isEndpointMissing } from "@/lib/api-availability";
import { queryKeys } from "@/lib/query-keys";

import {
  TEAM_CHANNEL_KINDS,
  fetchStaffChannels,
  fetchStaffTeamChannel,
  fetchTeamMembers,
  openDirectChannel,
} from "./api";
import { useStaffFallbackPoll } from "./poll";
import {
  peerFromMember,
  planDirectOpen,
  sortDirectChannels,
  upsertDirectChannel,
} from "./team";
import type { TeamMember } from "./team";
import type { StaffChannel } from "./types";

/**
 * Bo'lim holati. `soon` — backend endpointi hali yo'q (marshrutsiz 404):
 * ekran yiqilmaydi, "Tez orada" ko'rsatiladi va qayta so'ralmaydi.
 */
export type TeamSectionState = "loading" | "ready" | "soon" | "error";

function sectionState(query: {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  data: unknown;
}): TeamSectionState {
  if (query.data !== undefined) return "ready";
  if (query.isError) return isEndpointMissing(query.error) ? "soon" : "error";
  return "loading";
}

/** Endpoint yo'q bo'lsa qayta urinish ham, so'rov ham yo'q. */
function retryUnlessMissing(count: number, error: unknown): boolean {
  return !isEndpointMissing(error) && count < 2;
}

const conversationsKey = queryKeys.staffChannels({ kind: TEAM_CHANNEL_KINDS });

/** Umumiy guruh — "Jamoa" bo'limining tepasida. */
export function useTeamChannel() {
  const poll = useStaffFallbackPoll();
  const query = useQuery({
    queryKey: queryKeys.staffTeamChannel,
    queryFn: ({ signal }) => fetchStaffTeamChannel(signal),
    retry: retryUnlessMissing,
    refetchInterval: (state) =>
      isEndpointMissing(state.state.error) || poll === false ? false : poll(state),
  });
  return { channel: query.data ?? null, state: sectionState(query), refetch: query.refetch };
}

/**
 * Shaxsiy chatlar (`?kind=team,direct`). Kalit `["staff-chat", "channels", …]`
 * ostida — mavjud real vaqt (`staff_message`, `staff_badge`) ularni ham
 * yangilaydi va tepaga ko'taradi; tartib baribir shu yerda (oxirgi xabar).
 */
export function useDirectChannels() {
  const poll = useStaffFallbackPoll();
  const query = useQuery({
    queryKey: conversationsKey,
    queryFn: ({ signal }) => fetchStaffChannels({ kind: TEAM_CHANNEL_KINDS, limit: 100 }, signal),
    retry: retryUnlessMissing,
    refetchInterval: (state) =>
      isEndpointMissing(state.state.error) || poll === false ? false : poll(state),
  });
  return {
    channels: query.data ? sortDirectChannels(query.data) : [],
    state: sectionState(query),
    refetch: query.refetch,
  };
}

/** A'zolar — varaq ochiq bo'lganda; qidiruv mijozda (`searchTeamMembers`). */
export function useTeamMembers(enabled: boolean) {
  const query = useQuery({
    queryKey: queryKeys.staffTeamMembers,
    queryFn: ({ signal }) => fetchTeamMembers(null, signal),
    enabled,
    retry: retryUnlessMissing,
    staleTime: 60_000,
  });
  return {
    members: query.data ?? [],
    state: sectionState(query),
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}

/** Keshdagi barcha shaxsiy chatlar — "ochish yoki topish" shundan qaraydi. */
function cachedDirects(queryClient: QueryClient): StaffChannel[] {
  return queryClient
    .getQueriesData<StaffChannel[]>({ queryKey: ["staff-chat", "channels"] })
    .flatMap(([, channels]) => (Array.isArray(channels) ? channels : []));
}

export type OpenDirectResult =
  | { ok: true; channel: StaffChannel }
  | { ok: false; error: unknown };

/**
 * "Xabar yozish": mavjud chat bo'lsa — so'rovsiz o'sha; bo'lmasa POST va
 * natija keshga qo'shiladi (takroriy bosish ikkinchi qator yaratmaydi).
 */
export function useOpenDirect() {
  const queryClient = useQueryClient();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const open = useCallback(
    async (member: TeamMember): Promise<OpenDirectResult> => {
      const plan = planDirectOpen(cachedDirects(queryClient), member);
      if (plan.kind === "existing") return { ok: true, channel: plan.channel };

      const key = `${member.kind}:${member.id}`;
      setPendingKey(key);
      try {
        const created = await openDirectChannel(plan.peer);
        // Javobda `kind` bo'lmasa xaritalovchi uni `order` deb oladi — bu yerda aniq.
        const channel: StaffChannel = { ...created, kind: "direct" };
        const peer = peerFromMember(member);
        queryClient.setQueryData<StaffChannel[]>(conversationsKey, (current) =>
          upsertDirectChannel(current ?? [], channel, peer),
        );
        return { ok: true, channel: channel.peer ? channel : { ...channel, peer } };
      } catch (error) {
        return { ok: false, error };
      } finally {
        setPendingKey((current) => (current === key ? null : current));
      }
    },
    [queryClient],
  );

  return { open, pendingKey };
}
