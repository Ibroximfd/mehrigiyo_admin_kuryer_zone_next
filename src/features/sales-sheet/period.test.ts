import { describe, expect, it } from "vitest";

import { dayTitle, isSingleDay, rangeDays, rangeTitle, resolveSheetRange, SHEET_MAX_DAYS, shiftDay } from "./period";

/** Chorshanba, 18.11.2026 (mahalliy vaqt). */
const NOW = new Date(2026, 10, 18, 9, 30);
const NONE = { from: null, to: null };

describe("sotuv jadvali davri", () => {
  it("kun: sukut — bugun; tanlangan o'tgan kun; kelajak va buzuq sana — bugun", () => {
    expect(resolveSheetRange("day", NONE, NOW)).toEqual({ dateFrom: "2026-11-18", dateTo: "2026-11-18" });
    expect(resolveSheetRange("day", { from: "2026-11-16", to: null }, NOW)).toEqual({ dateFrom: "2026-11-16", dateTo: "2026-11-16" });
    expect(resolveSheetRange("day", { from: "2026-12-01", to: null }, NOW).dateFrom).toBe("2026-11-18");
    expect(resolveSheetRange("day", { from: "16.11.2026", to: null }, NOW).dateFrom).toBe("2026-11-18");
    expect(resolveSheetRange("day", { from: "2026-13-45", to: null }, NOW).dateFrom).toBe("2026-11-18");
  });

  it("hafta — dushanbadan bugungacha; oy — 1-kundan bugungacha", () => {
    expect(resolveSheetRange("week", NONE, NOW)).toEqual({ dateFrom: "2026-11-16", dateTo: "2026-11-18" });
    expect(resolveSheetRange("month", NONE, NOW)).toEqual({ dateFrom: "2026-11-01", dateTo: "2026-11-18" });
    // Yakshanba — hafta oxiri: o'sha haftaning dushanbasi.
    expect(resolveSheetRange("week", NONE, new Date(2026, 10, 22, 23, 0)).dateFrom).toBe("2026-11-16");
    // Dushanba — hafta bir kunlik.
    expect(isSingleDay(resolveSheetRange("week", NONE, new Date(2026, 10, 16, 8, 0)))).toBe(true);
  });

  it("oraliq: sanalar tartiblanadi, bittasi bo'lsa — bir kun, yo'q bo'lsa — bugun", () => {
    expect(resolveSheetRange("range", { from: "2026-11-10", to: "2026-11-16" }, NOW)).toEqual({ dateFrom: "2026-11-10", dateTo: "2026-11-16" });
    expect(resolveSheetRange("range", { from: "2026-11-16", to: "2026-11-10" }, NOW)).toEqual({ dateFrom: "2026-11-10", dateTo: "2026-11-16" });
    expect(resolveSheetRange("range", { from: "2026-11-10", to: null }, NOW)).toEqual({ dateFrom: "2026-11-10", dateTo: "2026-11-10" });
    expect(resolveSheetRange("range", NONE, NOW)).toEqual({ dateFrom: "2026-11-18", dateTo: "2026-11-18" });
  });

  it("oraliq 93 kundan uzun bo'lsa — oxiridan qisqartiriladi (server chegarasi, §2)", () => {
    const range = resolveSheetRange("range", { from: "2026-01-01", to: "2026-11-16" }, NOW);
    expect(range.dateTo).toBe("2026-11-16");
    expect(rangeDays(range)).toBe(SHEET_MAX_DAYS);
    expect(rangeDays({ dateFrom: "2026-11-16", dateTo: "2026-11-16" })).toBe(1);
  });

  it("kunni surish oy va yil chegarasidan o'tadi", () => {
    expect(shiftDay("2026-11-16", -1)).toBe("2026-11-15");
    expect(shiftDay("2026-11-30", 1)).toBe("2026-12-01");
    expect(shiftDay("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("sarlavha: kun — hafta kuni bilan, oraliq — qisqa", () => {
    expect(dayTitle("2026-11-16")).toBe("16.11.2026 · dushanba");
    expect(rangeTitle({ dateFrom: "2026-11-16", dateTo: "2026-11-16" })).toBe("16.11.2026 · dushanba");
    expect(rangeTitle({ dateFrom: "2026-11-10", dateTo: "2026-11-16" })).toBe("10.11 – 16.11.2026");
    expect(rangeTitle({ dateFrom: "2026-12-29", dateTo: "2027-01-02" })).toBe("29.12.2026 – 02.01.2027");
  });
});
