import { describe, expect, it } from "vitest";

import { formatDistance } from "./format";
import { distanceMeters, toLatLng, yandexMapsPointUrl } from "./maps";

describe("Yandex Maps havolasi", () => {
  it("nuqta: https://yandex.uz/maps/?pt=lng,lat&z=16", () => {
    expect(yandexMapsPointUrl({ lat: 40.5283, lng: 70.9429 })).toBe(
      "https://yandex.uz/maps/?pt=70.9429,40.5283&z=16",
    );
  });

  it("toLatLng: null/NaN/chegaradan tashqari — null", () => {
    expect(toLatLng(40.5, 70.9)).toEqual({ lat: 40.5, lng: 70.9 });
    expect(toLatLng(null, 70.9)).toBeNull();
    expect(toLatLng(40.5, undefined)).toBeNull();
    expect(toLatLng(Number.NaN, 70.9)).toBeNull();
    expect(toLatLng(95, 70.9)).toBeNull();
    expect(toLatLng(40.5, 190)).toBeNull();
  });
});

describe("formatDistance", () => {
  it("metr, kasrli km, butun km", () => {
    expect(formatDistance(350)).toBe("350 m");
    expect(formatDistance(3240)).toBe("3,2 km");
    expect(formatDistance(3000)).toBe("3 km");
    expect(formatDistance(12480)).toBe("12 km");
    expect(formatDistance(-1)).toBe("—");
    expect(formatDistance(Number.NaN)).toBe("—");
  });
});

describe("distanceMeters", () => {
  it("haversine: bir xil nuqta 0, ~1,1 km 0,01° kenglikda", () => {
    expect(distanceMeters({ lat: 41.31, lng: 69.24 }, { lat: 41.31, lng: 69.24 })).toBe(0);
    const d = distanceMeters({ lat: 41.31, lng: 69.24 }, { lat: 41.32, lng: 69.24 });
    expect(d).toBeGreaterThan(1100);
    expect(d).toBeLessThan(1120);
  });
});
