import { describe, expect, it } from "vitest";

import { hasAddressIssue } from "./insights";
import { mapLogistOrder, toDateKey } from "./types";

describe("toDateKey", () => {
  it("keeps a plain date", () => {
    expect(toDateKey("2026-10-03")).toBe("2026-10-03");
  });
  it("reduces a datetime to a date", () => {
    expect(toDateKey("2026-10-03T00:00:00")).toBe("2026-10-03");
  });
  it("returns null for empty values", () => {
    expect(toDateKey(null)).toBeNull();
    expect(toDateKey("")).toBeNull();
  });
});

describe("hasAddressIssue", () => {
  const info = (region: string | null, address: string | null) => ({
    deliveryInfo: {
      region,
      regionDisplay: null,
      address,
      locality: null,
      addressChangedBy: null,
      note: null,
      contactName: null,
      contactPhone: null,
      lat: null,
      lng: null,
    },
  });
  it("region alone is enough", () => {
    expect(hasAddressIssue(info("samarqand", null))).toBe(false);
  });
  it("address alone is enough", () => {
    expect(hasAddressIssue(info(null, "Chilonzor 5-kvartal"))).toBe(false);
  });
  it("both missing is an issue", () => {
    expect(hasAddressIssue(info(null, null))).toBe(true);
  });
});

describe("mapLogistOrder delivery merge", () => {
  it("reads region from the delivery block even when delivery_info has none", () => {
    const order = mapLogistOrder({
      id: 1,
      status: "confirmed",
      delivery_info: { address: null },
      delivery: { region: "samarqand", delivery_date: "2026-10-03T00:00:00" },
    });
    expect(order.deliveryInfo?.region).toBe("samarqand");
    expect(order.deliveryInfo?.regionDisplay).toBe("Samarqand viloyati");
    expect(order.deliveryDate).toBe("2026-10-03");
  });
});
