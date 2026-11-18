import { describe, expect, it } from "vitest";

import { contentDispositionFileName } from "./api-client";

describe("eksport fayli nomi — `Content-Disposition`", () => {
  it("oddiy `filename` va kodlangan `filename*`", () => {
    expect(contentDispositionFileName('attachment; filename="sotuv_2026-11-16.xlsx"')).toBe("sotuv_2026-11-16.xlsx");
    expect(contentDispositionFileName("attachment; filename=sotuv_2026-11-16.xlsx")).toBe("sotuv_2026-11-16.xlsx");
    expect(contentDispositionFileName("attachment; filename*=UTF-8''sotuv%20noyabr.xlsx")).toBe("sotuv noyabr.xlsx");
  });

  it("nom yo'q — `null` (chaqiruvchi o'z nomini qo'yadi)", () => {
    expect(contentDispositionFileName("attachment")).toBeNull();
    expect(contentDispositionFileName(null)).toBeNull();
  });
});
