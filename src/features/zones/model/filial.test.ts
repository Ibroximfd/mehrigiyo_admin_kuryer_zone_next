import { describe, expect, it } from "vitest";

import { filialsResponseSchema, groupFilialOptions } from "./filial";

const response = [
  { id: 1, name: "Mehrigiyo Toshkent", region: "toshkent_shahar", is_main: true, is_active: true },
  { id: 4, name: "Beshariq", region: "fargona", is_main: false, is_active: true },
  { id: 2, name: "Mehrigiyo Qo'qon", region: "fargona", is_main: true, is_active: true },
  { id: 3, name: "Andijon", region: "andijon", is_main: false, is_active: true },
  { id: 9, name: "Eski filial", region: "fargona", is_main: false, is_active: false },
];

describe("filialsResponseSchema (GET /api/admin/filials/)", () => {
  it("parses the array contract", () => {
    expect(filialsResponseSchema.parse(response)[0]).toEqual({
      id: 1,
      name: "Mehrigiyo Toshkent",
      region: "toshkent_shahar",
      isMain: true,
      isActive: true,
    });
  });

  it("tolerates missing optional fields and rejects other shapes", () => {
    expect(filialsResponseSchema.parse([{ id: 5 }])).toEqual([
      { id: 5, name: "#5", region: null, isMain: false, isActive: true },
    ]);
    expect(() => filialsResponseSchema.parse({ results: response })).toThrow();
  });
});

describe("groupFilialOptions", () => {
  const filials = filialsResponseSchema.parse(response);

  it("puts the zone region first (main first), others next, inactive last", () => {
    const groups = groupFilialOptions(filials, "fargona");
    expect(groups.regional.map((f) => f.id)).toEqual([2, 4]);
    expect(groups.other.map((f) => f.id)).toEqual([1, 3]);
    expect(groups.inactive.map((f) => f.id)).toEqual([9]);
  });

  it("keeps a current cash filial that is not in the list", () => {
    const groups = groupFilialOptions(filials, "fargona", { id: 77, name: "Yopilgan" });
    expect(groups.other).toContainEqual({ id: 77, name: "Yopilgan", region: null, isMain: false, isActive: true });
    expect(groupFilialOptions(filials, "fargona", { id: 2, name: "x" }).regional).toHaveLength(2);
  });
});
