import { describe, expect, it } from "vitest";

import { appErrorFromResponse } from "@/shared/lib/app-error";

import { zoneSchema } from "./zone";
import {
  diffZonePatch,
  emptyZoneForm,
  isEmptyPatch,
  mapZoneServerErrors,
  toZoneCreatePayload,
  zoneFormSchema,
  zoneToForm,
} from "./zone-form";

const zone = zoneSchema.parse({
  id: 7,
  region: "fargona",
  name: "Qo'qon markaz",
  district_codes: ["fargona/qoqon_sh", "fargona/beshariq"],
  cash_point: { kind: "filial", filial_id: 2, name: "Mehrigiyo Qo'qon" },
  neighbor_zone_ids: [8],
});

describe("zoneFormSchema", () => {
  it("requires a name and a filial for a filial cash point", () => {
    const result = zoneFormSchema.safeParse(emptyZoneForm());
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((issue) => issue.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["name", "filialId"]));
  });

  it("requires a picked user for a person cash point", () => {
    const base = { ...emptyZoneForm(), name: "Z", cashPointKind: "person" as const };
    const missing = zoneFormSchema.safeParse(base);
    expect(missing.error?.issues[0]).toMatchObject({ path: ["person"], message: "cashPersonRequired" });
    expect(zoneFormSchema.safeParse({ ...base, person: { userId: 15, name: "Dilnoza" } }).success).toBe(true);
  });
});

describe("zone payloads", () => {
  it("builds a create payload", () => {
    const values = { ...emptyZoneForm(), name: " Yangi ", districtCodes: ["fargona/a"], filialId: 3 };
    expect(toZoneCreatePayload("fargona", values)).toEqual({
      region: "fargona",
      name: "Yangi",
      district_codes: ["fargona/a"],
      cash_point: { kind: "filial", filial_id: 3 },
      neighbor_zone_ids: [],
    });
  });

  it("round-trips a zone into the form without changes", () => {
    expect(isEmptyPatch(diffZonePatch(zone, zoneToForm(zone)))).toBe(true);
  });

  it("ignores district order but sends the full list on change", () => {
    const reordered = { ...zoneToForm(zone), districtCodes: ["fargona/beshariq", "fargona/qoqon_sh"] };
    expect(diffZonePatch(zone, reordered)).toEqual({});
    const added = { ...zoneToForm(zone), districtCodes: [...zone.districtCodes, "fargona/rishton"] };
    expect(diffZonePatch(zone, added)).toEqual({
      district_codes: ["fargona/qoqon_sh", "fargona/beshariq", "fargona/rishton"],
    });
  });

  it("detects cash point kind switch and deactivation", () => {
    const values = {
      ...zoneToForm(zone),
      cashPointKind: "person" as const,
      person: { userId: 15, name: "Dilnoza" },
      isActive: false,
    };
    expect(diffZonePatch(zone, values)).toEqual({
      cash_point: { kind: "person", user_id: 15 },
      is_active: false,
    });
  });
});

describe("person cash point in edit mode", () => {
  const personZone = zoneSchema.parse({
    id: 8,
    region: "fargona",
    name: "Rishton",
    cash_point: { kind: "person", user_id: 15, name: "Dilnoza Kassir" },
  });

  it("shows the current name from cash_point before any search", () => {
    expect(zoneToForm(personZone).person).toEqual({ userId: 15, name: "Dilnoza Kassir" });
    expect(isEmptyPatch(diffZonePatch(personZone, zoneToForm(personZone)))).toBe(true);
  });

  it("sends only the new user id when the person changes", () => {
    const values = { ...zoneToForm(personZone), person: { userId: 21, name: "Aziz" } };
    expect(diffZonePatch(personZone, values)).toEqual({ cash_point: { kind: "person", user_id: 21 } });
  });
});

describe("mapZoneServerErrors", () => {
  it("reads 409 district_in_zone (district + zone_id lists)", () => {
    const error = appErrorFromResponse(409, {
      code: "district_in_zone",
      detail: "Tuman \"Qo'qon markaz\" zonasida",
      fields: { district: ["fargona/qoqon_sh"], zone_id: [7] },
    });
    expect(mapZoneServerErrors(error)).toEqual({
      fields: [],
      districtConflict: { districtCode: "fargona/qoqon_sh", zoneId: 7, detail: "Tuman \"Qo'qon markaz\" zonasida" },
      cashPointMissing: false,
      rest: [],
    });
  });

  it("reads 409 with the documented `district_codes` key too", () => {
    const error = appErrorFromResponse(409, {
      code: "district_in_zone",
      detail: "Qo'qon markaz",
      fields: { district_codes: ["fargona/qoqon_sh"], zone_id: [7] },
    });
    const mapping = mapZoneServerErrors(error);
    expect(mapping.districtConflict?.districtCode).toBe("fargona/qoqon_sh");
    expect(mapping.districtConflict?.zoneId).toBe(7);
    expect(mapping.fields).toEqual([]);
    expect(mapping.rest).toEqual([]);
  });

  it("flags a missing cash point (400 {cash_point: [\"filial_id\"]})", () => {
    const error = appErrorFromResponse(400, { code: "validation_error", fields: { cash_point: ["filial_id"] } });
    expect(mapZoneServerErrors(error)).toMatchObject({ fields: [], cashPointMissing: true, rest: [] });
  });

  it("maps regular fields and aliases, keeps unknown ones", () => {
    const error = appErrorFromResponse(400, {
      fields: { name: ["Majburiy"], "cash_point.user_id": ["Topilmadi"], district: ["x"], foo: ["Noma'lum"] },
    });
    const mapping = mapZoneServerErrors(error);
    expect(mapping.fields).toEqual([
      { name: "name", message: "Majburiy" },
      { name: "person", message: "Topilmadi" },
    ]);
    // `district` faqat 409 da to'qnashuv — oddiy 400 da noma'lum maydon.
    expect(mapping.rest).toEqual(["x", "Noma'lum"]);
    expect(mapping.districtConflict).toBeNull();
  });

  it("returns nothing for non-AppError values", () => {
    expect(mapZoneServerErrors(new Error("x"))).toEqual({
      fields: [],
      districtConflict: null,
      cashPointMissing: false,
      rest: [],
    });
  });
});
