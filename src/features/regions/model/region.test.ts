import { describe, expect, it } from "vitest";

import { activeDistrictCount, findRegion, regionsResponseSchema } from "./region";

describe("regionsResponseSchema", () => {
  it("parses the contract shape and maps to domain names", () => {
    const [region] = regionsResponseSchema.parse([
      {
        region: "fargona",
        name: "Farg'ona",
        districts: [
          {
            code: "fargona/qoqon_sh",
            region: "fargona",
            name_uz: "Qo'qon sh.",
            name_ru: "г. Коканд",
            name_uz_cyrl: "Қўқон ш.",
            kind: "city",
            is_active: true,
          },
        ],
      },
    ]);
    expect(region).toEqual({
      code: "fargona",
      name: "Farg'ona",
      districts: [
        {
          code: "fargona/qoqon_sh",
          region: "fargona",
          nameUz: "Qo'qon sh.",
          nameRu: "г. Коканд",
          nameUzCyrl: "Қўқон ш.",
          kind: "city",
          isActive: true,
        },
      ],
    });
  });

  it("tolerates missing optional fields", () => {
    const [region] = regionsResponseSchema.parse([
      { region: "toshkent", name: null, districts: [{ code: "toshkent/chilonzor" }] },
    ]);
    expect(region?.name).toBe("toshkent");
    expect(region?.districts[0]).toMatchObject({
      region: "toshkent",
      nameUz: "toshkent/chilonzor",
      nameRu: null,
      kind: "district",
      isActive: true,
    });
  });

  it("accepts a paginated envelope and missing districts", () => {
    const regions = regionsResponseSchema.parse({ results: [{ region: "xorazm" }] });
    expect(regions).toEqual([{ code: "xorazm", name: "xorazm", districts: [] }]);
  });

  it("rejects a region without a code", () => {
    expect(() => regionsResponseSchema.parse([{ name: "X" }])).toThrow();
  });

  it("finds a region and counts active districts", () => {
    const regions = regionsResponseSchema.parse([
      {
        region: "a",
        districts: [
          { code: "a/1", is_active: true },
          { code: "a/2", is_active: false },
        ],
      },
    ]);
    const found = findRegion(regions, "a");
    expect(found && activeDistrictCount(found)).toBe(1);
    expect(findRegion(regions, "b")).toBeNull();
    expect(findRegion(regions, null)).toBeNull();
  });
});
