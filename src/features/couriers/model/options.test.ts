import { describe, expect, it } from "vitest";

import { inferCourierRegion, zonesForRegion } from "./options";

const zones = [
  { id: 1, name: "Qo'qon", region: "fargona", isActive: true },
  { id: 2, name: "Beshariq", region: "fargona", isActive: true },
  { id: 3, name: "Eski", region: "fargona", isActive: false },
  { id: 4, name: "Chilonzor", region: "toshkent", isActive: true },
];

describe("courier option helpers", () => {
  it("lists active zones of a region sorted by name", () => {
    expect(zonesForRegion(zones, "fargona").map((zone) => zone.id)).toEqual([2, 1]);
    expect(zonesForRegion(zones, null)).toHaveLength(3);
  });

  it("infers the region from the primary zone when missing", () => {
    expect(inferCourierRegion({ region: "andijon", zoneIds: [4] }, zones)).toBe("andijon");
    expect(inferCourierRegion({ region: null, zoneIds: [4, 1] }, zones)).toBe("toshkent");
    expect(inferCourierRegion({ region: null, zoneIds: [] }, zones)).toBeNull();
  });
});
