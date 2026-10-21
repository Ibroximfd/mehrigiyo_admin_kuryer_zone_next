import { describe, expect, it } from "vitest";

import { formatAmount, formatRelative } from "./format";
import { formatLocalPhone, formatPhone, isCompleteLocalPhone, toApiPhone, toLocalDigits } from "./phone";

describe("phone", () => {
  it("extracts local digits from typed or pasted input", () => {
    expect(toLocalDigits("90 123-45-67")).toBe("901234567");
    expect(toLocalDigits("+998 90 123 45 67")).toBe("901234567");
    expect(toLocalDigits("9012345678999")).toBe("901234567");
  });

  it("formats partially and fully", () => {
    expect(formatLocalPhone("9012")).toBe("90 12");
    expect(formatLocalPhone("901234567")).toBe("90 123 45 67");
    expect(formatPhone("998901234567")).toBe("+998 90 123 45 67");
    expect(formatPhone("12345")).toBe("12345");
  });

  it("converts to the API format", () => {
    expect(isCompleteLocalPhone("90 123 45 6")).toBe(false);
    expect(isCompleteLocalPhone("90 123 45 67")).toBe(true);
    expect(toApiPhone("90 123 45 67")).toBe("998901234567");
  });
});

describe("format", () => {
  it("groups amounts", () => {
    expect(formatAmount("310000")).toBe("310 000");
    expect(formatAmount(1234567.6)).toBe("1 234 568");
    expect(formatAmount(-5000)).toBe("-5 000");
    expect(formatAmount("abc")).toBe("abc");
  });

  it("formats relative times", () => {
    const now = new Date("2026-10-15T10:00:00Z");
    expect(formatRelative("2026-10-15T09:55:00Z", "en", now)).toBe("5 minutes ago");
    expect(formatRelative(null, "en", now)).toBe("—");
  });
});
