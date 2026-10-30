import { describe, expect, it } from "vitest";

import { mapLiveCourier } from "./live-tracking";
import {
  BOUNCE_OUT_ZOOM,
  FLY_DURATION_S,
  FOCUS_ZOOM,
  REDUCED_DURATION_S,
  decideFocus,
  flightTimeoutMs,
  nextFocusRequest,
  planFlight,
} from "./map-focus";

describe("fokus so'rovi", () => {
  it("har tanlov yangi nonce oladi — o'sha kuryer qayta tanlansa ham", () => {
    const first = nextFocusRequest(null, 7);
    const again = nextFocusRequest(first, 7);
    const other = nextFocusRequest(again, 9);
    expect(first).toEqual({ id: 7, nonce: 1 });
    expect(again).toEqual({ id: 7, nonce: 2 });
    expect(again.nonce).not.toBe(first.nonce);
    expect(other).toEqual({ id: 9, nonce: 3 });
  });

  it("joylashuvi yo'q kuryerga uchilmaydi", () => {
    const located = mapLiveCourier({ id: 1, full_name: "Ibroxim", last_location: { lat: 41, lng: 69, at: null } });
    const blank = mapLiveCourier({ id: 2, full_name: "Bobur" });
    expect(decideFocus(located)).toEqual({ kind: "fly", id: 1 });
    expect(decideFocus(blank)).toEqual({ kind: "no-location", id: 2 });
  });
});

describe("kamera qadamlari", () => {
  it("uzoqdan — bitta silliq uchish 17-zoomga, ~1,2 s", () => {
    const steps = planFlight({ currentZoom: 12, distancePx: 400, reducedMotion: false });
    expect(steps).toEqual([{ zoom: FOCUS_ZOOM, duration: FLY_DURATION_S, easeLinearity: 0.25 }]);
  });

  it("allaqachon yaqin va markazda — chiqib-tushish, harakat ko'rinadi", () => {
    const steps = planFlight({ currentZoom: 17, distancePx: 10, reducedMotion: false });
    expect(steps.map((step) => step.zoom)).toEqual([FOCUS_ZOOM - BOUNCE_OUT_ZOOM, FOCUS_ZOOM]);
    expect(steps.reduce((sum, step) => sum + step.duration, 0)).toBeCloseTo(FLY_DURATION_S);
  });

  it("yaqin zoom, lekin nishon chetda — oddiy uchish", () => {
    expect(planFlight({ currentZoom: 18, distancePx: 300, reducedMotion: false })).toHaveLength(1);
  });

  it("harakat kamaytirilgan — sakrash emas, qisqa animatsiya", () => {
    const steps = planFlight({ currentZoom: 17, distancePx: 0, reducedMotion: true });
    expect(steps).toEqual([{ zoom: FOCUS_ZOOM, duration: REDUCED_DURATION_S, easeLinearity: 0.25 }]);
  });

  it("zaxira taymer barcha qadamlardan uzunroq", () => {
    const steps = planFlight({ currentZoom: 17, distancePx: 0, reducedMotion: false });
    expect(flightTimeoutMs(steps)).toBeGreaterThan(FLY_DURATION_S * 1000);
  });
});
