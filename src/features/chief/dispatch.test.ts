import { describe, expect, it } from "vitest";

import { dispatchPlan, groupByRegion } from "./dispatch";
import type { ChiefOption } from "./types";

const chiefs: ChiefOption[] = [
  { id: 17, fullName: "Farg'ona", regions: ["fargona"], isDefault: null, filial: null, couriers: 5 },
  { id: 20, fullName: "Andijon", regions: ["andijon"], isDefault: null, filial: null, couriers: 3 },
];

const order = (id: string, region: string | null, status = "confirmed", payableAmount = 100) => ({
  id,
  region,
  status,
  payableAmount,
});

describe("viloyatlar bo'yicha bosh kuryerlarga berish", () => {
  it("guruhlar: ko'pi tepada, viloyatsiz oxirida; faqat tasdiqlangan", () => {
    const groups = groupByRegion(
      [
        order("a", "andijon"),
        order("b", "fargona"),
        order("c", "fargona"),
        order("d", null),
        order("e", "fargona", "shipping"),
      ],
      () => chiefs,
    );
    expect(groups.map((group) => [group.region, group.orders.length, group.suggestedChiefId])).toEqual([
      ["fargona", 2, 17],
      ["andijon", 1, 20],
      ["", 1, null],
    ]);
    expect(groups[0]!.amount).toBe(200);
  });

  it("reja: sukut, logist almashtirishi va «berilmasin»; bosh kuryersiz guruh tushadi", () => {
    const groups = groupByRegion([order("a", "andijon"), order("b", "fargona"), order("d", "samarqand")], () => chiefs);
    expect([...dispatchPlan(groups, {}).entries()]).toEqual([
      ["a", 20],
      ["b", 17],
    ]);
    const plan = dispatchPlan(groups, { fargona: null, samarqand: 20 });
    expect(plan.get("b")).toBeUndefined();
    expect(plan.get("d")).toBe(20);
  });
});

describe("viloyatning sukut bosh kuryeri", () => {
  it("`is_default` viloyati mos birinchisidan ustun", () => {
    const two: ChiefOption[] = [
      { id: 17, fullName: "Eski", regions: ["fargona"], isDefault: false, filial: null, couriers: 5 },
      { id: 18, fullName: "Sukut", regions: ["fargona"], isDefault: true, filial: null, couriers: 2 },
    ];
    const [group] = groupByRegion([order("a", "fargona")], () => two);
    expect(group!.suggestedChiefId).toBe(18);
  });
});

