import { describe, expect, it } from "vitest";

import { createWsDeduper } from "./ws-dedupe";

describe("WS dublikati (filial + bo'lim guruhi)", () => {
  it("aynan bir xil lid hodisasi 5 s ichida — ikkinchisi tashlanadi", () => {
    let now = 1_000;
    const isDuplicate = createWsDeduper(() => now);
    const payload = { lead: { id: 7, stage: "base" }, lead_id: 7 };
    expect(isDuplicate("lead_created", payload)).toBe(false);
    // Kalitlar tartibi boshqa — baribir o'sha hodisa.
    expect(isDuplicate("lead_created", { lead_id: 7, lead: { stage: "base", id: 7 } })).toBe(true);
    now += 6_000;
    expect(isDuplicate("lead_created", payload)).toBe(false);
  });

  it("bir lidning haqiqiy ketma-ket o'zgarishlari o'tadi", () => {
    const isDuplicate = createWsDeduper(() => 0);
    expect(isDuplicate("lead_stage_changed", { lead_id: 7, stage: "delivery" })).toBe(false);
    expect(isDuplicate("lead_stage_changed", { lead_id: 7, stage: "base" })).toBe(false);
  });

  it("boshqa turlar tekshirilmaydi", () => {
    const isDuplicate = createWsDeduper(() => 0);
    expect(isDuplicate("order_updated", { order_id: "a" })).toBe(false);
    expect(isDuplicate("order_updated", { order_id: "a" })).toBe(false);
  });
});
