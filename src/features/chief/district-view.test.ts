import { describe, expect, it } from "vitest";

import { mapOrderZoning } from "@/features/orders/zoning";

import { districtBadge, districtChoices, needsDistrictAction } from "./district-view";

describe("district_state (60-javob)", () => {
  it("guess: taxmin va muqobillar o'qiladi, takror olib tashlanadi", () => {
    const zoning = mapOrderZoning({
      district_state: "guess",
      district_guess: {
        district: "bekobod_sh",
        district_display: "Bekobod shahri",
        confidence: 0.6,
        alternatives: [
          { district: "bekobod_t", district_display: "Bekobod tumani" },
          { district: "bekobod_sh", district_display: "Bekobod shahri" },
          "chinoz",
        ],
      },
    });
    expect(zoning.districtState).toBe("guess");
    expect(districtChoices(zoning).map((item) => item.district)).toEqual(["bekobod_sh", "bekobod_t", "chinoz"]);
    expect(districtBadge(zoning)?.label).toBe("Tuman mos kelmadi");
    expect(needsDistrictAction(zoning)).toBe(true);
  });

  it("missing: variant yo'q, belgi bor", () => {
    const zoning = mapOrderZoning({ district_state: "missing", district_guess: null });
    expect(districtChoices(zoning)).toEqual([]);
    expect(districtBadge(zoning)?.label).toBe("Tuman aniqlanmadi");
  });

  it("auto/set va eski javob — belgi yo'q", () => {
    expect(districtBadge(mapOrderZoning({ district_state: "auto" }))).toBeNull();
    expect(districtBadge(mapOrderZoning({ district_state: "set" }))).toBeNull();
    const legacy = mapOrderZoning({});
    expect(legacy.districtState).toBeNull();
    expect(needsDistrictAction(legacy)).toBe(false);
  });

  it("notanish qiymat — null", () => {
    expect(mapOrderZoning({ district_state: "weird" }).districtState).toBeNull();
  });
});
