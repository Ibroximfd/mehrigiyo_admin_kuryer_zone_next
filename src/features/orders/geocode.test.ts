import { describe, expect, it } from "vitest";

import {
  addressIssueBadge,
  hasGeocodeIssue,
  mapNeedsReview,
  mapOrderGeocode,
} from "./geocode";
import { mapLogistOrder } from "./types";

/** Backend javobi 2026-10-16 (B4): `delivery.geocode{…}` to'liq blok. */
const DELIVERY_FULL = {
  address_text: "Qo'qon, Istiqlol 12",
  lat: 40.5283,
  lng: 70.9429,
  geocode: {
    status: "ok",
    precision: "GEOMETRIC_CENTER",
    address_issue: "imprecise",
    place_id: "ChIJabc",
    geocoded_at: "2026-10-16T05:00:00Z",
  },
};

describe("mapOrderGeocode", () => {
  it("to'liq blok o'qiladi", () => {
    expect(mapOrderGeocode(DELIVERY_FULL)).toEqual({
      status: "ok",
      precision: "GEOMETRIC_CENTER",
      addressIssue: "imprecise",
      placeId: "ChIJabc",
      geocodedAt: new Date("2026-10-16T05:00:00Z"),
    });
  });

  it("yassi maydonlar (eski serializer) ham o'qiladi", () => {
    expect(
      mapOrderGeocode({
        geocode_status: "failed",
        geocode_precision: "approximate",
        address_issue: "outside_district",
      }),
    ).toMatchObject({
      status: "failed",
      precision: "APPROXIMATE",
      addressIssue: "outside_district",
      placeId: null,
      geocodedAt: null,
    });
  });

  it("blok ustun, yassi — zaxira", () => {
    const geocode = mapOrderGeocode({
      geocode_status: "failed",
      geocode: { status: "pending" },
    });
    expect(geocode?.status).toBe("pending");
  });

  it("eski buyurtma — `null`, notanish qiymat — `null` maydon", () => {
    expect(mapOrderGeocode({ address_text: "Toshkent" })).toBeNull();
    expect(mapOrderGeocode(null)).toBeNull();
    expect(mapOrderGeocode("Toshkent")).toBeNull();
    expect(mapOrderGeocode({ geocode: { status: "weird", precision: "X" } })).toBeNull();
  });

  it("buyurtma mapperi geocode va needs_review ni oladi", () => {
    const order = mapLogistOrder({
      id: "o1",
      order_number: "MH-1",
      status: "confirmed",
      delivery: DELIVERY_FULL,
      needs_review: true,
    });
    expect(order.geocode?.addressIssue).toBe("imprecise");
    expect(order.needsReview).toBe(true);
    expect(order.deliveryInfo).toMatchObject({ lat: 40.5283, lng: 70.9429 });

    const legacy = mapLogistOrder({ id: "o2", order_number: "MH-2", status: "confirmed" });
    expect(legacy.geocode).toBeNull();
    expect(legacy.needsReview).toBeNull();
  });

  it("needs_review: bool/satr/yo'q", () => {
    expect(mapNeedsReview({ needs_review: true })).toBe(true);
    expect(mapNeedsReview({ needs_review: "false" })).toBe(false);
    expect(mapNeedsReview({})).toBeNull();
  });
});

describe("addressIssueBadge", () => {
  const facts = (geocode: Parameters<typeof mapOrderGeocode>[0], needsReview: boolean | null = null) => ({
    geocode: mapOrderGeocode(geocode),
    needsReview,
  });

  it("imprecise → Manzil taxminiy", () => {
    expect(addressIssueBadge(facts(DELIVERY_FULL))?.label).toBe("Manzil taxminiy");
  });

  it("outside_district ustun — status failed bo'lsa ham", () => {
    const badge = addressIssueBadge(
      facts({ geocode: { status: "failed", address_issue: "outside_district" } }),
    );
    expect(badge?.kind).toBe("outside_district");
    expect(badge?.label).toBe("Tumandan tashqarida");
  });

  it("needs_review sababsiz kelsa — taxminiy", () => {
    expect(addressIssueBadge(facts({ geocode: { status: "ok" } }, true))?.kind).toBe("imprecise");
  });

  it("pending → kutilmoqda; ok/failed/expired/null → belgisiz", () => {
    expect(addressIssueBadge(facts({ geocode: { status: "pending" } }))?.kind).toBe("pending");
    expect(addressIssueBadge(facts({ geocode: { status: "ok", precision: "ROOFTOP" } }))).toBeNull();
    expect(addressIssueBadge(facts({ geocode: { status: "failed" } }))).toBeNull();
    expect(addressIssueBadge(facts({ geocode: { status: "expired" } }))).toBeNull();
    expect(addressIssueBadge({ geocode: null, needsReview: null })).toBeNull();
    expect(addressIssueBadge({ geocode: null, needsReview: false })).toBeNull();
  });

  it("filtr: taxminiy va tashqarida — ha, kutilmoqda — yo'q", () => {
    expect(hasGeocodeIssue(facts(DELIVERY_FULL))).toBe(true);
    expect(hasGeocodeIssue(facts({ geocode: { address_issue: "outside_district" } }))).toBe(true);
    expect(hasGeocodeIssue(facts({ geocode: { status: "pending" } }))).toBe(false);
    expect(hasGeocodeIssue({ geocode: null, needsReview: null })).toBe(false);
  });
});
