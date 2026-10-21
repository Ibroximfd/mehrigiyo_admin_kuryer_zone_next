import { describe, expect, it } from "vitest";

import { buildOverviewStats, countUnzoned } from "./overview-stats";

const regions = [
  {
    districts: [
      { code: "f/a", isActive: true },
      { code: "f/b", isActive: true },
      { code: "f/c", isActive: false },
    ],
  },
  { districts: [{ code: "t/x", isActive: true }] },
];

describe("overview stats", () => {
  it("counts active districts outside active zones as unzoned", () => {
    const zones = [
      { isActive: true, districtCodes: ["f/a"] },
      { isActive: false, districtCodes: ["f/b"] },
    ];
    expect(countUnzoned(regions, zones)).toBe(2);
  });

  it("aggregates zones and couriers", () => {
    const stats = buildOverviewStats(
      regions,
      [
        { isActive: true, districtCodes: ["f/a", "f/b", "t/x"] },
        { isActive: false, districtCodes: [] },
      ],
      [
        { isActive: true, onShift: true },
        { isActive: true, onShift: false },
        { isActive: false, onShift: true },
      ],
    );
    expect(stats).toEqual({
      activeZones: 1,
      inactiveZones: 1,
      unzonedDistricts: 0,
      activeCouriers: 2,
      couriersOnShift: 1,
    });
  });
});
