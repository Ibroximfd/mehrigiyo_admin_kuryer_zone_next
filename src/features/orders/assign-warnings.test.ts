import { describe, expect, it } from "vitest";

import { mapBulkResult, zoneMismatchCount } from "./api";
import {
  assignWarningMessages,
  countWarning,
  groupFailures,
  patchWarningCodes,
} from "./assign-warnings";

/** Backend A2: smenasiz kuryerga biriktirish ruxsat; javobda `warnings`. */
describe("biriktirish ogohlantirishlari", () => {
  it("PATCH: `warnings: []` yangi shakl, `warning` eski; ikkalasi bo'lsa yangisi, takrorsiz", () => {
    expect(patchWarningCodes({ warnings: ["courier_off_shift", "zone_mismatch", "zone_mismatch"] })).toEqual([
      "courier_off_shift",
      "zone_mismatch",
    ]);
    expect(patchWarningCodes({ warning: "zone_mismatch" })).toEqual(["zone_mismatch"]);
    expect(patchWarningCodes({ warning: "zone_mismatch", warnings: ["courier_off_shift"] })).toEqual([
      "courier_off_shift",
    ]);
    expect(patchWarningCodes({ warning: null })).toEqual([]);
    expect(patchWarningCodes({})).toEqual([]);
  });

  it("bulk: `warnings: [{id, warning}]` — har ogohlantirish alohida qator", () => {
    const result = mapBulkResult({
      applied: ["a", "b"],
      failed: [],
      warnings: [
        { id: "a", warning: "courier_off_shift" },
        { id: "a", warning: "zone_mismatch" },
        { id: "b", warning: "courier_off_shift" },
      ],
    });
    expect(countWarning(result.warnings, "courier_off_shift")).toBe(2);
    expect(zoneMismatchCount(result)).toBe(1);
    expect(assignWarningMessages(result.warnings)).toEqual([
      "2 ta buyurtma smenasiz kuryerga biriktirildi",
      "1 ta buyurtmada kuryer zonasi mos emas",
    ]);
  });

  it("satr ro'yxati ham sanaladi; notanish kod jim; bo'sh — xabar yo'q", () => {
    expect(assignWarningMessages(["zone_mismatch", "yangi_kod"])).toEqual([
      "1 ta buyurtmada kuryer zonasi mos emas",
    ]);
    expect(assignWarningMessages([])).toEqual([]);
  });

  it("xatolar kod bo'yicha guruhlanadi — `courier_inactive` alohida ko'rinadi", () => {
    expect(
      groupFailures([
        { code: "courier_inactive" },
        { code: "order_not_confirmed" },
        { code: "courier_inactive" },
      ]),
    ).toEqual([
      ["courier_inactive", 2],
      ["order_not_confirmed", 1],
    ]);
  });
});
