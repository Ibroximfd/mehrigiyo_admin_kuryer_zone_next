import { describe, expect, it } from "vitest";

import { funnelSteps, mapFunnel, stepRate } from "./types";

describe("analitika voronkasi", () => {
  it("qadam ulushi oldingi qadamga nisbatan", () => {
    expect(stepRate(612, 1240)).toBeCloseTo(49.35, 1);
    expect(stepRate(10, 0)).toBe(0);
    expect(stepRate(20, 10)).toBe(100);
  });

  it("shartnoma javobi o'qiladi, yetishmagan maydon yiqitmaydi", () => {
    const funnel = mapFunnel({
      leads: "1240",
      orders: 612,
      orders_sum: "150000.00",
      delivered: 498,
      cancel_reasons: [{ code: "not_taken", label: "Mijoz olmadi", count: 31 }],
      by_operator: [{ operator: { id: 1, full_name: "A", filial: { id: 2, name: "Toshkent" } }, delivered: 3, revenue: "10.00" }],
    });
    expect(funnel.leads).toBe(1240);
    expect(funnel.ordersSum).toBe(150_000);
    expect(funnel.shipped).toBe(0);
    expect(funnel.prevLeadToOrder).toBeNull();
    expect(funnel.byOperator[0]!.operator.filial).toBe("Toshkent");
    expect(funnelSteps(funnel).map((step) => step.value)).toEqual([1240, 612, 0, 498]);
  });
});
