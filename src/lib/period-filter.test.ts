import { describe, expect, it } from "vitest";

import { exportFileName, periodParams, presetOf, presetRange } from "./period-filter";
import { financeShares } from "@/features/moliya/types";

const now = new Date(2026, 9, 29, 12);

describe("filial + sana filtri", () => {
  it("presetlar sanaga aylanadi", () => {
    expect(presetRange("today", now)).toEqual({ from: "2026-10-29", to: "2026-10-29" });
    expect(presetRange("yesterday", now)).toEqual({ from: "2026-10-28", to: "2026-10-28" });
    expect(presetRange("week", now)).toEqual({ from: "2026-10-23", to: "2026-10-29" });
    expect(presetRange("month", now)).toEqual({ from: "2026-09-30", to: "2026-10-29" });
  });

  it("oraliqdan preset taniladi", () => {
    expect(presetOf({ from: "2026-10-23", to: "2026-10-29" }, now)).toBe("week");
    expect(presetOf({ from: "2026-10-01", to: "2026-10-29" }, now)).toBeNull();
  });

  it("so'rov parametrlari va fayl nomi", () => {
    const filter = { filialId: null, from: "2026-10-01", to: "2026-10-29" };
    expect(periodParams(filter)).toEqual({ filial: "all", date_from: "2026-10-01", date_to: "2026-10-29" });
    expect(exportFileName("moliya", filter)).toBe("sklad_moliya_all_2026-10-01_2026-10-29.xlsx");
    expect(exportFileName("operatorlar", { ...filter, filialId: 2 }, "csv")).toBe("sklad_operatorlar_2_2026-10-01_2026-10-29.csv");
  });
});

describe("moliya formulasi", () => {
  it("ulushlar tushumga nisbatan", () => {
    const shares = financeShares({ revenue: 1000, operatorFee: 60, logistics: 140, remaining: 800 });
    expect(shares.operator).toBeCloseTo(6);
    expect(shares.logistics).toBeCloseTo(14);
    expect(shares.remaining).toBeCloseTo(80);
  });

  it("tushum nol — hammasi nol", () => {
    expect(financeShares({ revenue: 0, operatorFee: 0, logistics: 0, remaining: 0 })).toEqual({ operator: 0, logistics: 0, remaining: 0 });
  });
});
