import { describe, expect, it } from "vitest";

import { isNavActive, NAV_ITEMS } from "./nav";
import { ROUTES } from "./routes";

describe("isNavActive", () => {
  it("matches home only exactly", () => {
    expect(isNavActive("/", ROUTES.home)).toBe(true);
    expect(isNavActive("/zones", ROUTES.home)).toBe(false);
  });

  it("matches sections and their children", () => {
    expect(isNavActive("/couriers", ROUTES.couriers)).toBe(true);
    expect(isNavActive("/couriers/12", ROUTES.couriers)).toBe(true);
    expect(isNavActive("/couriersx", ROUTES.couriers)).toBe(false);
  });

  it("keeps the phone bottom bar at four sections plus menu", () => {
    expect(NAV_ITEMS.filter((item) => item.inBottomBar)).toHaveLength(4);
  });
});
