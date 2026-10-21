import { describe, expect, it } from "vitest";

import {
  countCouriersByZone,
  courierSchema,
  couriersResponseSchema,
  courierWithPasswordSchema,
  deactivateResponseSchema,
  logoutDeviceResponseSchema,
  orderedCourierZones,
  setPasswordResponseSchema,
  sortCouriers,
  toCourierSearchParams,
} from "./courier";

const contractCourier = {
  id: 12,
  full_name: "Ali Karimov",
  phone: "998901110001",
  is_active: true,
  region: "fargona",
  zone_ids: [7, 9],
  zones: [{ id: 7, name: "Qo'qon markaz" }],
  filial: { id: 2, name: "Mehrigiyo Qo'qon" },
  today: { assigned: 3, delivered: 2, cod_total: "310000" },
  load: 1,
  has_account: true,
  device: {
    device_name: "Redmi",
    platform: "android",
    app_version: "1.2.0",
    since: "2026-10-15T08:00:00Z",
    last_seen_at: "2026-10-15T09:00:00Z",
  },
  on_shift: true,
  online: true,
  last_heartbeat_at: "2026-10-15T09:00:00Z",
  last_location: { lat: 40.5, lng: 70.9, at: "2026-10-15T09:00:00Z" },
};

describe("courierSchema", () => {
  it("parses the contract example", () => {
    const courier = courierSchema.parse(contractCourier);
    expect(courier).toMatchObject({
      id: 12,
      fullName: "Ali Karimov",
      phone: "998901110001",
      zoneIds: [7, 9],
      filial: { id: 2, name: "Mehrigiyo Qo'qon" },
      today: { assigned: 3, delivered: 2, codTotal: 310000 },
      load: 1,
      hasAccount: true,
      device: { name: "Redmi", platform: "android", appVersion: "1.2.0" },
      onShift: true,
      online: true,
      lastLocation: { lat: 40.5, lng: 70.9 },
    });
  });

  it("tolerates nulls and missing optional fields", () => {
    const courier = courierSchema.parse({
      id: 3,
      full_name: null,
      phone: null,
      zone_ids: null,
      zones: null,
      filial: null,
      today: null,
      device: null,
      last_location: null,
    });
    expect(courier).toEqual({
      id: 3,
      fullName: "#3",
      phone: "",
      isActive: true,
      region: null,
      zoneIds: [],
      zones: [],
      filial: null,
      today: { assigned: 0, delivered: 0, codTotal: 0 },
      load: 0,
      hasAccount: false,
      device: null,
      onShift: false,
      online: false,
      lastHeartbeatAt: null,
      lastLocation: null,
    });
  });

  it("rejects an unparseable amount", () => {
    expect(() => courierSchema.parse({ ...contractCourier, today: { cod_total: "abc" } })).toThrow();
  });

  it("accepts a list or a paginated envelope", () => {
    expect(couriersResponseSchema.parse([contractCourier])).toHaveLength(1);
    expect(couriersResponseSchema.parse({ results: [contractCourier] })).toHaveLength(1);
  });
});

describe("action responses", () => {
  it("extracts the one-time password from create/patch", () => {
    const result = courierWithPasswordSchema.parse({ ...contractCourier, password: "x7k2m9pq" });
    expect(result.password).toBe("x7k2m9pq");
    expect(result.courier.id).toBe(12);
    expect(courierWithPasswordSchema.parse(contractCourier).password).toBeNull();
  });

  it("parses set-password, deactivate and logout-device", () => {
    expect(
      setPasswordResponseSchema.parse({ id: 12, phone: "998901110001", password: "abc123", has_account: true, device: null }),
    ).toEqual({ id: 12, password: "abc123", hasAccount: true, device: null });
    expect(deactivateResponseSchema.parse({ id: 12, is_active: false })).toEqual({ id: 12, isActive: false });
    expect(logoutDeviceResponseSchema.parse({ id: 12, logged_out: true, has_account: true, device: null })).toEqual({
      id: 12,
      loggedOut: true,
      hasAccount: true,
      device: null,
    });
  });
});

describe("courier list rules", () => {
  const couriers = couriersResponseSchema.parse([
    contractCourier,
    { ...contractCourier, id: 13, full_name: "Bobur O'ktamov", phone: "998935550022", on_shift: false, zone_ids: [9] },
    { ...contractCourier, id: 14, full_name: "Aziz", is_active: false, zone_ids: [7] },
  ]);

  it("maps every filter to the server query (search, is_active, on_shift)", () => {
    expect(
      toCourierSearchParams({ region: "fargona", zone: 7, shift: "on", status: "active", search: "  Ali " }),
    ).toEqual({ search: "Ali", is_active: true, region: "fargona", zone: 7, on_shift: true });
    expect(toCourierSearchParams({ region: null, zone: null, shift: "off", status: "inactive", search: "" })).toEqual({
      search: null,
      is_active: false,
      region: null,
      zone: null,
      on_shift: false,
    });
    const all = toCourierSearchParams({ region: null, zone: null, shift: "all", status: "all", search: "   " });
    expect(all.is_active).toBeNull();
    expect(all.on_shift).toBeNull();
    expect(all.search).toBeNull();
  });

  it("sorts active and on-shift couriers first", () => {
    expect(sortCouriers(couriers).map((c) => c.id)).toEqual([12, 13, 14]);
  });

  it("counts active couriers per zone", () => {
    const counts = countCouriersByZone(couriers);
    expect(counts.get(7)).toBe(1);
    expect(counts.get(9)).toBe(2);
  });

  it("orders zones by zone_ids with the primary first", () => {
    const [first] = couriers;
    if (!first) throw new Error("fixture");
    expect(orderedCourierZones(first, new Map([[9, "Rishton"]]))).toEqual([
      { id: 7, name: "Qo'qon markaz", isPrimary: true },
      { id: 9, name: "Rishton", isPrimary: false },
    ]);
  });
});
