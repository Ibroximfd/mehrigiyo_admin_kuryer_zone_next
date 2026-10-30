import { describe, expect, it } from "vitest";

import { SCENES, sceneForPath } from "./scenes";

describe("sceneForPath", () => {
  it("bo'lim manzillari o'z sahnasini oladi", () => {
    expect(sceneForPath("/orders").id).toBe("orders");
    expect(sceneForPath("/couriers").id).toBe("couriers");
    expect(sceneForPath("/transfers").id).toBe("transfers");
    expect(sceneForPath("/statistics").id).toBe("statistics");
  });

  it("ichki manzillar ham bo'lim sahnasida qoladi", () => {
    expect(sceneForPath("/orders/abc").id).toBe("orders");
  });

  it("boshqaruv va noma'lum manzil — boshqaruv sahnasi", () => {
    expect(sceneForPath("/")).toBe(SCENES.dashboard);
    expect(sceneForPath("/unknown")).toBe(SCENES.dashboard);
  });

  it("xodimlar chati tinch sahna — boshqaruvniki", () => {
    expect(sceneForPath("/staff-chat").id).toBe("dashboard");
  });

  it("har sahna fayli `public/scenes/` ichida", () => {
    for (const scene of Object.values(SCENES)) {
      expect(scene.src).toMatch(/^\/scenes\/[a-z]+\.webp$/);
    }
  });
});
