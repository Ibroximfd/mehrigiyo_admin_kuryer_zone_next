import { describe, expect, it } from "vitest";

import { sortZones, zoneSchema, zonesResponseSchema } from "./zone";

const contractZone = {
  id: 7,
  region: "fargona",
  name: "Qo'qon markaz",
  is_active: true,
  district_codes: ["fargona/qoqon_sh", "fargona/beshariq"],
  cash_point: { kind: "filial", filial_id: 2, user_id: null, name: "Mehrigiyo Qo'qon" },
  neighbor_zone_ids: [8],
};

describe("zoneSchema", () => {
  it("parses the contract example", () => {
    expect(zoneSchema.parse(contractZone)).toEqual({
      id: 7,
      region: "fargona",
      name: "Qo'qon markaz",
      isActive: true,
      districtCodes: ["fargona/qoqon_sh", "fargona/beshariq"],
      cashPoint: { kind: "filial", filialId: 2, name: "Mehrigiyo Qo'qon" },
      neighborZoneIds: [8],
    });
  });

  it("parses a person cash point", () => {
    const zone = zoneSchema.parse({
      ...contractZone,
      cash_point: { kind: "person", filial_id: null, user_id: 15, name: "Kassir" },
    });
    expect(zone.cashPoint).toEqual({ kind: "person", userId: 15, name: "Kassir" });
  });

  it("tolerates null / missing optional fields", () => {
    const zone = zoneSchema.parse({ id: 9, region: "fargona" });
    expect(zone).toEqual({
      id: 9,
      region: "fargona",
      name: "#9",
      isActive: true,
      districtCodes: [],
      cashPoint: null,
      neighborZoneIds: [],
    });
    expect(zoneSchema.parse({ ...contractZone, cash_point: null }).cashPoint).toBeNull();
  });

  it("rejects a zone without id", () => {
    expect(() => zoneSchema.parse({ region: "x" })).toThrow();
  });
});

describe("zonesResponseSchema", () => {
  it("parses zones with unzoned districts", () => {
    const result = zonesResponseSchema.parse({
      zones: [contractZone],
      unzoned_districts: [{ code: "fargona/yozyovon", name: "Yozyovon" }, { code: "fargona/x" }],
    });
    expect(result.zones).toHaveLength(1);
    expect(result.unzonedDistricts).toEqual([
      { code: "fargona/yozyovon", name: "Yozyovon" },
      { code: "fargona/x", name: "fargona/x" },
    ]);
  });

  it("treats a missing unzoned list (no region filter) as empty", () => {
    expect(zonesResponseSchema.parse({ zones: [] }).unzonedDistricts).toEqual([]);
    expect(zonesResponseSchema.parse({ zones: [], unzoned_districts: null }).unzonedDistricts).toEqual([]);
  });

  it("accepts a bare array", () => {
    expect(zonesResponseSchema.parse([contractZone]).zones).toHaveLength(1);
  });

  it("sorts active zones first, then by name", () => {
    const { zones } = zonesResponseSchema.parse([
      { id: 1, region: "r", name: "B", is_active: false },
      { id: 2, region: "r", name: "C" },
      { id: 3, region: "r", name: "A" },
    ]);
    expect(sortZones(zones).map((zone) => zone.id)).toEqual([3, 2, 1]);
  });
});
