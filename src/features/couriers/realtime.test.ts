import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { queryKeys } from "@/lib/query-keys";

import { mapLiveCourier } from "./live-tracking";
import type { LiveCourier } from "./live-tracking";
import { applyCourierLocationEvent, applyCourierUpdatedEvent } from "./realtime";
import { mapCourier } from "./types";
import type { Courier } from "./types";

const LIST_KEY = queryKeys.couriersList({ on_shift: null });

function setup() {
  const client = new QueryClient();
  client.setQueryData<LiveCourier[]>(queryKeys.couriersLive, [
    mapLiveCourier({ id: 7, full_name: "Aziz", phone: "998", last_location: { lat: 41, lng: 69, at: "2026-10-17T09:00:00Z" } }),
  ]);
  client.setQueryData<Courier[]>(LIST_KEY, [
    mapCourier({ id: 7, full_name: "Aziz", phone: "998", on_shift: true }),
    mapCourier({ id: 8, full_name: "Olim", phone: "999" }),
  ]);
  const invalidate = vi.spyOn(client, "invalidateQueries");
  return { client, invalidate };
}

describe("applyCourierLocationEvent", () => {
  it("jonli va ro'yxat keshlarini joyida yamaydi, qayta so'rov yo'q", () => {
    const { client, invalidate } = setup();
    const handled = applyCourierLocationEvent(client, {
      type: "courier_location",
      courier_id: 7,
      lat: 41.5,
      lng: 69.5,
      at: "2026-10-17T10:00:00Z",
      speed: 3,
      heading: 45,
      battery: 0.8,
      on_shift: true,
    });
    expect(handled).toBe(true);
    const live = client.getQueryData<LiveCourier[]>(queryKeys.couriersLive);
    expect(live?.[0]?.lastLocation).toMatchObject({ lat: 41.5, lng: 69.5, heading: 45 });
    expect(live?.[0]?.battery).toBe(80);

    const list = client.getQueryData<Courier[]>(LIST_KEY);
    expect(list?.[0]?.live.lastLocation).toMatchObject({ lat: 41.5, lng: 69.5 });
    expect(list?.[0]?.live.battery).toBe(80);
    expect(list?.[1]?.live.lastLocation).toBeNull();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("ro'yxatda yo'q kuryer smena ochdi — jonli ro'yxat qayta so'raladi", () => {
    const { client, invalidate } = setup();
    applyCourierLocationEvent(client, { courier_id: 99, lat: 1, lng: 1, on_shift: true });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.couriersLive });
  });

  it("yaroqsiz hodisa — false, kesh tegilmaydi", () => {
    const { client } = setup();
    const before = client.getQueryData(queryKeys.couriersLive);
    expect(applyCourierLocationEvent(client, { type: "courier_location" })).toBe(false);
    expect(client.getQueryData(queryKeys.couriersLive)).toBe(before);
  });
});

describe("applyCourierLocationEvent: filtrlangan jonli so'rovlar", () => {
  const point = { lat: 41, lng: 69, at: "2026-10-17T09:00:00Z" };
  const narrowedKey = queryKeys.couriersLiveQuery({ zone: null, region: "fargona", district: null, all: null });
  const allKey = queryKeys.couriersLiveQuery({ zone: null, region: null, district: null, all: "1" });

  function filtered() {
    const client = new QueryClient();
    client.setQueryData<LiveCourier[]>(narrowedKey, [
      mapLiveCourier({ id: 7, full_name: "Aziz", on_shift: true, last_location: point }),
    ]);
    client.setQueryData<LiveCourier[]>(allKey, [
      mapLiveCourier({ id: 7, full_name: "Aziz", on_shift: true, last_location: point }),
    ]);
    const invalidate = vi.spyOn(client, "invalidateQueries");
    return { client, invalidate };
  }

  it("hamma filtrdagi nusxa yamaladi; `all=1` da smenadan chiqqan qoladi", () => {
    const { client } = filtered();
    applyCourierLocationEvent(client, { courier_id: 7, lat: 41.2, lng: 69.2, on_shift: false });
    expect(client.getQueryData<LiveCourier[]>(narrowedKey)).toHaveLength(0);
    const all = client.getQueryData<LiveCourier[]>(allKey);
    expect(all?.[0]).toMatchObject({ onShift: false, lastLocation: { lat: 41.2 } });
  });

  it("hudud filtrida yo'q kuryer — har hodisada qayta so'ralmaydi", () => {
    const client = new QueryClient();
    client.setQueryData<LiveCourier[]>(narrowedKey, []);
    const invalidate = vi.spyOn(client, "invalidateQueries");
    applyCourierLocationEvent(client, { courier_id: 99, lat: 1, lng: 1, on_shift: true });
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("filtrsiz `all=1` ro'yxatida yo'q kuryer — qayta so'raladi", () => {
    const { client, invalidate } = filtered();
    applyCourierLocationEvent(client, { courier_id: 99, lat: 1, lng: 1, on_shift: true });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.couriersLive });
  });
});

describe("applyCourierUpdatedEvent (§8.2)", () => {
  it("rasmni jonli va ro'yxat keshlarida joyida almashtiradi", () => {
    const { client, invalidate } = setup();
    const handled = applyCourierUpdatedEvent(client, {
      type: "courier_updated",
      courier_id: 7,
      avatar: { url: "https://m.uz/a.jpg", thumb_url: "https://m.uz/t.jpg" },
    });
    expect(handled).toBe(true);
    expect(client.getQueryData<LiveCourier[]>(queryKeys.couriersLive)?.[0]?.avatar?.thumbUrl).toBe("https://m.uz/t.jpg");
    expect(client.getQueryData<Courier[]>(LIST_KEY)?.[0]?.avatar?.url).toBe("https://m.uz/a.jpg");
    expect(client.getQueryData<Courier[]>(LIST_KEY)?.[1]?.avatar).toBeNull();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("avatar: null — rasm o'chadi", () => {
    const { client } = setup();
    applyCourierUpdatedEvent(client, { courier_id: 7, avatar: { url: "https://m.uz/a.jpg" } });
    applyCourierUpdatedEvent(client, { courier_id: 7, avatar: null });
    expect(client.getQueryData<LiveCourier[]>(queryKeys.couriersLive)?.[0]?.avatar).toBeNull();
  });

  it("avatar kaliti yo'q — kuryer keshlari qayta so'raladi", () => {
    const { client, invalidate } = setup();
    expect(applyCourierUpdatedEvent(client, { courier_id: 7, full_name: "Aziz K" })).toBe(true);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.couriers });
  });
});
