import { describe, expect, it } from "vitest";

import {
  carryOverrides,
  effectiveCourier,
  enterAppliesFrom,
  pruneSelection,
  summarizeByCourier,
  withOverride,
} from "./auto-assign";
import type { AutoAssignPlanRow } from "./auto-assign";

function row(orderId: string, courierId: number | null, courierName = `K${courierId}`): AutoAssignPlanRow {
  return { orderId, orderNumber: orderId.toUpperCase(), courierId, courierName, tier: null, loadAfter: null };
}

const PLAN = [row("a", 1, "Ibroxim"), row("b", 1, "Ibroxim"), row("c", 2, "Sardor"), row("d", null, "")];

describe("qator kuryeri va almashtirish", () => {
  it("amaldagi kuryer: logist tanlovi, bo'lmasa server taklifi; kuryersiz — null", () => {
    expect(effectiveCourier(PLAN[0]!, null)).toEqual({ id: 1, name: "Ibroxim" });
    expect(effectiveCourier(PLAN[0]!, { id: 3, name: "Aziz" })).toEqual({ id: 3, name: "Aziz" });
    expect(effectiveCourier(PLAN[3]!, undefined)).toBeNull();
  });

  it("rejadagi kuryer qayta tanlansa — tanlov olib tashlanadi", () => {
    const once = withOverride({}, PLAN[0]!, { id: 3, name: "Aziz" });
    expect(once).toEqual({ a: { id: 3, name: "Aziz" } });
    expect(withOverride(once, PLAN[0]!, { id: 1, name: "Ibroxim" })).toEqual({});
  });

  it("qayta tuzilgan rejaga tanlovlar ko'chadi; eskirgan va yo'q qatorlar tushadi", () => {
    expect(
      carryOverrides({ a: 3, b: 3, zzz: 3 }, PLAN, ["b"]),
    ).toEqual({ a: 3 });
  });
});

describe("kuryer bo'yicha xulosa", () => {
  it("ko'p buyurtmali birinchi, logist tanlovi hisobga olinadi", () => {
    expect(summarizeByCourier(PLAN, {})).toEqual([
      { id: 1, name: "Ibroxim", count: 2 },
      { id: 2, name: "Sardor", count: 1 },
    ]);
    expect(summarizeByCourier(PLAN, { a: { id: 2, name: "Sardor" } })).toEqual([
      { id: 2, name: "Sardor", count: 2 },
      { id: 1, name: "Ibroxim", count: 1 },
    ]);
  });

  it("faqat tanlanganlar bo'yicha", () => {
    expect(summarizeByCourier(PLAN, {}, new Set(["c", "d"]))).toEqual([
      { id: 2, name: "Sardor", count: 1 },
    ]);
  });
});

describe("tanlanganlarni qo'llash", () => {
  it("tanlov yangi rejada yo'q qatorlardan tozalanadi", () => {
    expect([...pruneSelection(new Set(["a", "x"]), PLAN)]).toEqual(["a"]);
  });
});

describe("klaviatura: Enter qo'llaydi", () => {
  it("matn maydoni, tugma, ro'yxat bandida — yo'q; oyna tanasida — ha", () => {
    expect(enterAppliesFrom("DIV", null)).toBe(true);
    expect(enterAppliesFrom("input", null)).toBe(false);
    expect(enterAppliesFrom("BUTTON", null)).toBe(false);
    expect(enterAppliesFrom("DIV", "option")).toBe(false);
    expect(enterAppliesFrom("DIV", "combobox")).toBe(false);
  });
});
