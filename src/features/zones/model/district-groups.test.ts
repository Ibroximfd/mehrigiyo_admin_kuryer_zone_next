import { describe, expect, it } from "vitest";

import { districtLabel, filterDistrictGroups, groupDistrictOptions, humanizeDistrictCodes } from "./district-groups";

const zoneNames = new Map([
  [7, "Qo'qon markaz"],
  [8, "Farg'ona"],
]);

const options = [
  { code: "f/yozyovon", name: "Yozyovon", zoneId: null, isActive: true },
  { code: "f/beshariq", name: "Beshariq", zoneId: null, isActive: true },
  { code: "f/qoqon", name: "Qo'qon", zoneId: 7, isActive: true },
  { code: "f/fargona", name: "Farg'ona sh.", zoneId: 8, isActive: true },
  { code: "f/old", name: "Eski", zoneId: null, isActive: false },
  { code: "f/ghost", name: "Arvoh", zoneId: 99, isActive: true },
];

describe("groupDistrictOptions", () => {
  it("splits unzoned, current and taken; hides inactive", () => {
    const groups = groupDistrictOptions(options, 7, zoneNames);
    expect(groups.unzoned.map((d) => d.code)).toEqual(["f/beshariq", "f/yozyovon"]);
    expect(groups.current.map((d) => d.code)).toEqual(["f/qoqon"]);
    expect(groups.taken.map((d) => [d.code, d.zoneName])).toEqual([
      ["f/ghost", "#99"],
      ["f/fargona", "Farg'ona"],
    ]);
  });

  it("treats every zoned district as taken when creating a new zone", () => {
    const groups = groupDistrictOptions(options, null, zoneNames);
    expect(groups.current).toEqual([]);
    expect(groups.taken).toHaveLength(3);
  });

  it("filters all groups by query", () => {
    const groups = filterDistrictGroups(groupDistrictOptions(options, 7, zoneNames), "qo'q");
    expect(groups.unzoned).toEqual([]);
    expect(groups.current).toHaveLength(1);
    expect(groups.taken).toEqual([]);
  });

  it("labels a code by name or by its slug", () => {
    const names = new Map([["f/qoqon", "Qo'qon"]]);
    expect(districtLabel(names, "f/qoqon")).toBe("Qo'qon");
    expect(districtLabel(names, "f/unknown")).toBe("unknown");
  });

  it("replaces district codes in server messages with names", () => {
    const names = new Map([["fargona/beshariq", "Beshariq"]]);
    expect(humanizeDistrictCodes("fargona/beshariq: Qo'qon markaz", names)).toBe("Beshariq: Qo'qon markaz");
    expect(humanizeDistrictCodes("fargona/rishton: X", names)).toBe("rishton: X");
  });
});
