import { describe, expect, it } from "vitest";

import { mapZone } from "@/features/zones/types";
import { ApiError } from "@/lib/api-client";

import { mapZoneStats, shareOf, takenDistrictsOf, zoneBusyOf } from "./zone-stats";

describe("mapZoneStats", () => {
  it("zona, tuman va zonasizlarni o'qiydi", () => {
    const stats = mapZoneStats({
      total: { orders: 10, incoming: 3, with_courier: 5, delivered: 2 },
      zones: [{ id: 3, orders: 7, incoming: 2, with_courier: 4, delivered: 1, districts: [{ code: "fargona/qoqon_sh", orders: 7 }] }],
      unzoned: { orders: 2, districts: [{ code: "fargona/furqat", orders: 2 }] },
      no_district: { orders: 1 },
    });
    expect(stats.total).toEqual({ orders: 10, incoming: 3, withCourier: 5, delivered: 2 });
    expect(stats.zones.get(3)?.districts.get("fargona/qoqon_sh")?.orders).toBe(7);
    expect(stats.unzoned.districts.get("fargona/furqat")?.orders).toBe(2);
    expect(stats.noDistrict).toBe(1);
  });

  it("bo'sh javob yiqitmaydi", () => {
    expect(mapZoneStats(null).zones.size).toBe(0);
  });
});

describe("zona viloyatlari", () => {
  it("server bermasa — tuman kodlaridan", () => {
    const zone = mapZone({ id: 1, region: "toshkent_sh", district_codes: ["toshkent_sh/yunusobod", "toshkent_v/zangiota"] });
    expect(zone?.regions).toEqual(["toshkent_sh", "toshkent_v"]);
  });

  it("server `regions` ustun; tumansiz zona — eski `region`", () => {
    expect(mapZone({ id: 1, regions: ["xorazm", "qoraqalpogiston"], district_codes: [] })?.regions).toEqual([
      "xorazm",
      "qoraqalpogiston",
    ]);
    expect(mapZone({ id: 2, region: "fargona", district_codes: [] })?.regions).toEqual(["fargona"]);
  });
});

describe("xatolar", () => {
  it("zone_has_orders — son va raqamlar", () => {
    const error = new ApiError("x", 409, { code: "zone_has_orders", orders_count: 7, order_numbers: ["A1", "A2"] }, "zone_has_orders");
    expect(zoneBusyOf(error)).toEqual({ count: 7, numbers: ["A1", "A2"] });
    expect(zoneBusyOf(new ApiError("x", 409, {}, "other"))).toBeNull();
  });

  it("district_taken — kimniki", () => {
    const error = new ApiError(
      "x",
      409,
      { taken: [{ district: "toshkent_v/zangiota", zone_name: "G'arb", chief_name: "Aziz" }] },
      "district_taken",
    );
    expect(takenDistrictsOf(error)).toEqual([{ district: "toshkent_v/zangiota", zoneName: "G'arb", chiefName: "Aziz" }]);
  });

  it("shareOf chegaralanadi", () => {
    expect(shareOf(5, 0)).toBe(0);
    expect(shareOf(5, 10)).toBe(0.5);
    expect(shareOf(15, 10)).toBe(1);
  });
});
