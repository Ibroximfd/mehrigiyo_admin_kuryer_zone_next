import { describe, expect, it } from "vitest";

import {
  adminDistrictsResponseSchema,
  applyDistrictPatch,
  districtDisplayName,
  filterDistricts,
  toDistrictPayload,
  validateNameEdit,
} from "./district";

const raw = {
  code: "fargona/qoqon_sh",
  region: "fargona",
  name_uz: "Qo'qon sh.",
  name_uz_cyrl: "Қўқон ш.",
  name_ru: "г. Коканд",
  kind: "city",
  is_active: true,
  has_boundary: false,
  zone_id: 7,
};

describe("adminDistrictsResponseSchema", () => {
  it("parses the full contract shape", () => {
    const [district] = adminDistrictsResponseSchema.parse([raw]);
    expect(district).toEqual({
      code: "fargona/qoqon_sh",
      region: "fargona",
      nameUz: "Qo'qon sh.",
      nameUzCyrl: "Қўқон ш.",
      nameRu: "г. Коканд",
      kind: "city",
      isActive: true,
      hasBoundary: false,
      zoneId: 7,
    });
  });

  it("fills defaults for null / missing optional fields", () => {
    const [district] = adminDistrictsResponseSchema.parse([
      { code: "fargona/beshariq", name_uz_cyrl: null, zone_id: null },
    ]);
    expect(district).toEqual({
      code: "fargona/beshariq",
      region: "fargona",
      nameUz: "",
      nameUzCyrl: "",
      nameRu: "",
      kind: "district",
      isActive: true,
      hasBoundary: true,
      zoneId: null,
    });
  });

  it("rejects a non-numeric zone id", () => {
    expect(() => adminDistrictsResponseSchema.parse([{ ...raw, zone_id: "7" }])).toThrow();
  });
});

describe("district rules", () => {
  const districts = adminDistrictsResponseSchema.parse([
    raw,
    { ...raw, code: "fargona/beshariq", name_uz: "Beshariq", name_ru: "Бешарык", zone_id: null },
  ]);

  it("builds a snake_case payload with trimmed names", () => {
    expect(toDistrictPayload({ nameUz: "  Yangi  ", isActive: false })).toEqual({
      name_uz: "Yangi",
      is_active: false,
    });
  });

  it("applies an optimistic patch and drops the zone on deactivation", () => {
    const next = applyDistrictPatch(districts, "fargona/qoqon_sh", { isActive: false });
    expect(next[0]).toMatchObject({ isActive: false, zoneId: null });
    expect(next[1]).toBe(districts[1]);
  });

  it("validates name edits", () => {
    expect(validateNameEdit("nameUz", " ", "Eski")).toBe("required");
    expect(validateNameEdit("nameRu", "", "Старое")).toBe("ok");
    expect(validateNameEdit("nameUz", " Eski ", "Eski")).toBe("unchanged");
    expect(validateNameEdit("nameUz", "Yangi", "Eski")).toBe("ok");
  });

  it("filters by any name or code, apostrophe-insensitive", () => {
    expect(filterDistricts(districts, "qo‘qon")).toHaveLength(1);
    expect(filterDistricts(districts, "бешар")).toHaveLength(1);
    expect(filterDistricts(districts, "fargona/")).toHaveLength(2);
    expect(filterDistricts(districts, "  ")).toBe(districts);
  });

  it("chooses the display name by locale with fallbacks", () => {
    const [first] = districts;
    if (!first) throw new Error("fixture");
    expect(districtDisplayName(first, "ru")).toBe("г. Коканд");
    expect(districtDisplayName({ ...first, nameRu: "" }, "ru")).toBe("Qo'qon sh.");
    expect(districtDisplayName({ ...first, nameUz: "" }, "uz")).toBe("fargona/qoqon_sh");
  });
});
