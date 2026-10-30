import type { QueryClient, QueryKey } from "@tanstack/react-query";

import { asOptionalString, isRecord } from "@/lib/parse";
import { queryKeys } from "@/lib/query-keys";
import type { SocketEvent } from "@/lib/reconnecting-socket";

import { mapCourierUpdatedEvent } from "./avatar";
import {
  applyLocationToLiveList,
  isLiveNarrowed,
  mapCourierLocationEvent,
} from "./live-tracking";
import type { LiveCourier, LiveParams } from "./live-tracking";
import type { Courier } from "./types";

/**
 * WS `courier_location {courier_id, lat, lng, at, accuracy, speed, heading,
 * is_mock, on_shift, battery}` (§7.2, ≤ 1 hodisa / 10 s har kuryerga).
 *
 * Kesh **joyida** yamaladi — qayta so'rov yo'q: marker siljiydi, ro'yxat
 * qayta chizilmaydi. Ikki kesh yangilanadi:
 *   • `couriers/live` — xarita markerlari;
 *   • `couriers/list/*` — kartadagi mini-holat (`live.lastLocation`).
 *
 * Ro'yxatda yo'q kuryer smena ochgan bo'lsa (hodisa `on_shift: true`) —
 * ismi hodisada yo'q, shuning uchun jonli ro'yxat qayta so'raladi.
 *
 * @returns hodisa tanildimi (test va jurnal uchun).
 */
export function applyCourierLocationEvent(
  queryClient: QueryClient,
  event: SocketEvent,
): boolean {
  const parsed = mapCourierLocationEvent(event);
  if (!parsed) return false;

  let needsRefetch = false;
  for (const [key, current] of queryClient.getQueriesData<LiveCourier[]>({
    queryKey: queryKeys.couriersLive,
  })) {
    if (!Array.isArray(current)) continue;
    const params = liveParamsOf(key);
    const result = applyLocationToLiveList(current, parsed, {
      keepOffShift: params.all === "1",
    });
    if (result.applied) {
      queryClient.setQueryData(key, result.list);
    } else if (parsed.onShift !== false && !isLiveNarrowed(params)) {
      // Hudud filtrida yo'q kuryer shu hududdan tashqarida bo'lishi mumkin —
      // har hodisada so'ramaymiz; 30 s lik so'rov uni baribir olib keladi.
      needsRefetch = true;
    }
  }

  queryClient.setQueriesData<Courier[]>(
    { queryKey: [...queryKeys.couriers, "list"] },
    (current) => {
      if (!current) return current;
      const index = current.findIndex((courier) => courier.id === parsed.courierId);
      const courier = current[index];
      if (!courier) return current;
      const copy = [...current];
      copy[index] = {
        ...courier,
        live: {
          ...courier.live,
          onShift: parsed.onShift ?? courier.live.onShift,
          lastLocation: parsed.point,
          lastHeartbeatAt: parsed.point.at ?? courier.live.lastHeartbeatAt,
          battery: parsed.battery ?? courier.live.battery,
        },
      };
      return copy;
    },
  );

  if (needsRefetch) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.couriersLive });
  }
  return true;
}

/**
 * WS `courier_updated {courier_id, avatar}` (§8.2): rasm almashganda
 * xarita markeri, yon panel va kuryer kartalari joyida yangilanadi.
 * `avatar` kaliti bo'lmasa (boshqa maydon o'zgargan) — kuryer keshlari
 * qayta so'raladi.
 *
 * @returns hodisa tanildimi.
 */
export function applyCourierUpdatedEvent(
  queryClient: QueryClient,
  event: SocketEvent,
): boolean {
  const parsed = mapCourierUpdatedEvent(event);
  if (!parsed) return false;
  if (!parsed.hasAvatar) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.couriers });
    return true;
  }

  const patch = <T extends { id: number; avatar: unknown }>(list: T[] | undefined): T[] | undefined => {
    if (!Array.isArray(list)) return list;
    const index = list.findIndex((courier) => courier.id === parsed.courierId);
    const courier = list[index];
    if (!courier) return list;
    const copy = [...list];
    copy[index] = { ...courier, avatar: parsed.avatar };
    return copy;
  };

  queryClient.setQueriesData<LiveCourier[]>({ queryKey: queryKeys.couriersLive }, patch);
  queryClient.setQueriesData<Courier[]>({ queryKey: [...queryKeys.couriers, "list"] }, patch);
  return true;
}

/** `["couriers", "live", params]` dan filtr qiymatlari (eski kalitda — bo'sh). */
function liveParamsOf(key: QueryKey): Partial<LiveParams> {
  const params = key[2];
  if (!isRecord(params)) return {};
  return {
    zone: asOptionalString(params.zone),
    region: asOptionalString(params.region),
    district: asOptionalString(params.district),
    all: params.all === "1" ? "1" : null,
  };
}
