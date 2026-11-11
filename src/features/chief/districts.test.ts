import { describe, expect, it } from "vitest";

import type { District, RegionDistricts, Zone } from "@/features/zones/types";

import { districtNameError, districtRows } from "./districts";

const district = (code: string, nameUz: string, isActive = true): District => ({
  code,
  region: "fargona",
  nameUz,
  nameRu: null,
  nameUzCyrl: null,
  kind: "district",
  isActive,
  defaultNameUz: null,
});

const region: RegionDistricts = {
  region: "fargona",
  name: "Farg'ona",
  districts: [district("fargona/a", "Oltiariq", false), district("fargona/b", "Qo'qon"), district("fargona/c", "Rishton")],
};

const zone = { id: 7, districtCodes: ["fargona/b"] } as Zone;

describe("districtRows", () => {
  it("ko'rinadiganlar avval, zona biriktiriladi", () => {
    const rows = districtRows(region, [zone]);
    expect(rows.map((row) => row.district.code)).toEqual(["fargona/b", "fargona/c", "fargona/a"]);
    expect(rows[0]?.zone?.id).toBe(7);
    expect(rows[1]?.zone).toBeNull();
  });

  it("viloyat yo'q — bo'sh", () => {
    expect(districtRows(undefined, [])).toEqual([]);
  });
});

describe("districtNameError", () => {
  it("qisqa va takror nomni rad etadi", () => {
    expect(districtNameError(" a ", region, null)).not.toBeNull();
    expect(districtNameError("rishton", region, null)).toBe("Bu viloyatda shu nomli tuman bor");
  });

  it("o'z nomi takror hisoblanmaydi", () => {
    expect(districtNameError("Rishton", region, "fargona/c")).toBeNull();
    expect(districtNameError("Rishton tumani", region, "fargona/c")).toBeNull();
  });
});
