import { describe, expect, it } from "vitest";

import { findingHref, mapAiReport } from "./types";

describe("AI topilmalari", () => {
  it("shartnoma javobi o'qiladi, notanish severity → attention", () => {
    const report = mapAiReport({
      generated_at: "2026-10-29T06:00:00+05:00",
      checked: ["stock"],
      findings: [
        { id: 1, severity: "urgent", area: "stock", title: "T", detail: "D", fix: "F", link: { screen: "sklad_region", region: "toshkent_shahar" } },
        { id: "x", severity: "weird", area: "finance", title: "T2", detail: "", link: null },
      ],
    });
    expect(report.findings).toHaveLength(2);
    expect(report.findings[0]!.severity).toBe("urgent");
    expect(report.findings[1]!.severity).toBe("attention");
    expect(report.findings[1]!.fix).toBeNull();
  });

  it("havola ekranga aylanadi, notanishi chizilmaydi", () => {
    expect(findingHref({ screen: "sklad_region", region: "andijon", courierId: null, operatorId: null, itemId: null })?.href).toBe("/sklad?region=andijon");
    expect(findingHref({ screen: "sklad_courier", region: null, courierId: 42, operatorId: null, itemId: null })?.href).toBe("/sklad/courier?id=42");
    expect(findingHref({ screen: "moliya_operator", region: null, courierId: null, operatorId: 300, itemId: null }, "?from=a&to=b")?.href).toBe("/moliya/operator?from=a&to=b&id=300");
    expect(findingHref({ screen: "moliya_operator", region: null, courierId: null, operatorId: 300, itemId: null })?.href).toBe("/moliya/operator?id=300");
    expect(findingHref({ screen: "unknown", region: null, courierId: null, operatorId: null, itemId: null })).toBeNull();
    expect(findingHref(null)).toBeNull();
  });
});
