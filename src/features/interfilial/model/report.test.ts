import { describe, expect, it } from "vitest";

import {
  MAX_RANGE_DAYS,
  defaultRange,
  presetRange,
  rangeLengthDays,
  validateRange,
} from "./date-range";
import { interfilialReportSchema, sortRowsByAmount } from "./report";

describe("interfilialReportSchema", () => {
  const body = {
    date_from: "2026-10-01",
    date_to: "2026-10-15",
    rows: [
      {
        from_filial: { id: 2, name: "Qo'qon" },
        to_filial: { id: 1, name: "Farg'ona" },
        amount: "450000",
        handover_ids: [10, 11],
      },
      {
        from_filial: { id: 1, name: "Farg'ona" },
        to_filial: { id: 2, name: null },
        amount: 1200000,
        handover_ids: [12],
      },
    ],
    total: "1650000",
  };

  it("parses rows, amounts and totals", () => {
    const report = interfilialReportSchema.parse(body);
    expect(report.total).toBe(1_650_000);
    expect(report.handoverCount).toBe(3);
    expect(report.rows[0]).toEqual({
      from: { id: 2, name: "Qo'qon" },
      to: { id: 1, name: "Farg'ona" },
      amount: 450_000,
      handoverCount: 2,
    });
    expect(report.rows[1]?.to.name).toBe("#2");
  });

  it("derives the total and tolerates missing rows", () => {
    expect(interfilialReportSchema.parse({ ...body, total: undefined }).total).toBe(1_650_000);
    expect(interfilialReportSchema.parse({ ...body, total: null }).total).toBe(1_650_000);
    expect(interfilialReportSchema.parse({ date_from: "a", date_to: "b", rows: null })).toMatchObject({
      rows: [],
      total: 0,
      handoverCount: 0,
    });
  });

  it("sorts by amount descending", () => {
    const report = interfilialReportSchema.parse(body);
    expect(sortRowsByAmount(report.rows).map((row) => row.amount)).toEqual([1_200_000, 450_000]);
  });
});

describe("date range", () => {
  const today = new Date(2026, 9, 15);

  it("defaults to the current month up to today", () => {
    expect(defaultRange(today)).toEqual({ from: "2026-10-01", to: "2026-10-15" });
  });

  it("counts days inclusively", () => {
    expect(rangeLengthDays({ from: "2026-10-01", to: "2026-10-01" })).toBe(1);
    expect(rangeLengthDays({ from: "2026-10-01", to: "2026-10-31" })).toBe(31);
    expect(rangeLengthDays({ from: "bad", to: "2026-10-31" })).toBeNull();
  });

  it("validates missing, invalid, reversed and too-long ranges", () => {
    expect(validateRange({ from: "", to: "2026-10-01" })).toBe("missing");
    expect(validateRange({ from: "2026-13-01", to: "2026-10-01" })).toBe("invalid");
    expect(validateRange({ from: "2026-10-02", to: "2026-10-01" })).toBe("reversed");
    expect(validateRange({ from: "2026-07-01", to: "2026-09-30" })).toBe("ok");
    expect(rangeLengthDays({ from: "2026-07-01", to: "2026-09-30" })).toBe(MAX_RANGE_DAYS);
    expect(validateRange({ from: "2026-07-01", to: "2026-10-01" })).toBe("tooLong");
  });

  it("builds presets that always pass validation", () => {
    expect(presetRange("lastMonth", today)).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(presetRange("last7", today)).toEqual({ from: "2026-10-09", to: "2026-10-15" });
    for (const preset of ["thisMonth", "lastMonth", "last7", "last30", "last90"] as const) {
      expect(validateRange(presetRange(preset, today))).toBe("ok");
    }
  });
});
