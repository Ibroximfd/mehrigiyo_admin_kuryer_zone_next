import { describe, expect, it } from "vitest";

import { mapLoginResponse, preferredRegionOf } from "./types";

/** Backend javobi #10: `is_staff` ≠ `is_admin`. */
describe("mapLoginResponse: is_staff", () => {
  it("yuqori darajadagi is_staff o'qiladi", () => {
    const { user } = mapLoginResponse({
      access: "a",
      is_admin: false,
      is_staff: true,
      role: "logist",
      operator: { id: 1, full_name: "Ali" },
    });
    expect(user).toMatchObject({ isStaff: true, isAdmin: false, role: "logist" });
  });

  it("operator.is_staff ham o'qiladi", () => {
    const { user } = mapLoginResponse({ access: "a", operator: { id: 1, is_staff: true } });
    expect(user.isStaff).toBe(true);
  });

  it("is_admin kuryer akkaunt huquqini bermaydi", () => {
    const { user } = mapLoginResponse({ access: "a", is_admin: true, operator: { id: 1 } });
    expect(user).toMatchObject({ isAdmin: true, isStaff: false });
  });
});

/** Backend A3: `filial.region_code` + depo `lat/lng`; `region` — eski erkin matn. */
describe("mapLoginResponse: filial hududi", () => {
  it("region_code, region va depo o'qiladi", () => {
    const { user } = mapLoginResponse({
      access: "a",
      operator: { id: 1 },
      filial: { id: 3, name: "Farg'ona", region: "Farg'ona", region_code: "fargona", lat: "40.38", lng: 71.78 },
    });
    expect(user).toMatchObject({
      filialId: 3,
      filialRegion: "Farg'ona",
      filialRegionCode: "fargona",
      filialLocation: { lat: 40.38, lng: 71.78 },
    });
    expect(preferredRegionOf(user)).toBe("fargona");
  });

  it("eski javob: kod va depo yo'q — matn zaxira, depo null", () => {
    const { user } = mapLoginResponse({
      access: "a",
      operator: { id: 1 },
      filial: { id: 3, name: "Toshkent", region: "toshkent_shahar", lat: 41.3 },
    });
    expect(user.filialRegionCode).toBeNull();
    expect(user.filialLocation).toBeNull();
    expect(preferredRegionOf(user)).toBe("toshkent_shahar");
    expect(preferredRegionOf(null)).toBeNull();
  });
});
