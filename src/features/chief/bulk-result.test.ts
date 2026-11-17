import { describe, expect, it } from "vitest";

import { summarizeBulk } from "./bulk-result";
import { dispatchFilters } from "./order-params";

describe("summarizeBulk", () => {
  it("berilgan, berilmagan va sabablarni sanaydi", () => {
    const summary = summarizeBulk({
      matched: 5,
      assigned: ["a", "b", "c"],
      failed: [
        { id: "d", code: "order_not_found" },
        { id: "e", code: "order_not_found" },
      ],
    });
    expect(summary).toEqual({
      matched: 5,
      given: 3,
      notGiven: 2,
      reasons: [{ code: "order_not_found", label: "Zakaz endi kuryersiz emas yoki sizda emas", count: 2 }],
    });
  });

  it("matched kelmasa — jami sanaladi, `matched: 0` xato emas", () => {
    expect(summarizeBulk({ matched: null, assigned: ["a"], failed: [] }).matched).toBe(1);
    expect(summarizeBulk({ matched: 0, assigned: [], failed: [] })).toMatchObject({ matched: 0, given: 0 });
  });
});

describe("dispatchFilters", () => {
  it("ro'yxat filtrini yuboradi, ro'yxatga xos va bo'sh kalitlarni tashlaydi", () => {
    expect(
      dispatchFilters({
        q: "  ",
        from: "2026-11-16",
        to: "2026-11-16",
        productIds: [30, 34],
        productMatch: "all",
        zoneId: 5,
        courierId: 37,
        ordering: "-payable_amount",
        districtFilter: "no_zone",
      }),
    ).toEqual({
      date_from: "2026-11-16",
      date_to: "2026-11-16",
      date_field: "arrived",
      product_ids: "30,34",
      product_match: "all",
      zone_id: 5,
      has_zone: "false",
    });
  });

  it("filtr yo'q — bo'sh obyekt (bosh kuryerda bu «hamma kuryersiz zakaz»)", () => {
    expect(dispatchFilters({})).toEqual({});
  });
});
