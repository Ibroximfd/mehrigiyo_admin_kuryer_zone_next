import { describe, expect, it } from "vitest";

import { escapeTarget } from "./escape-back";

describe("Esc — ortga", () => {
  it("kuryer → kuryerlar → doska", () => {
    expect(escapeTarget("/sklad/courier", "?id=49")).toBe("/sklad/couriers");
    expect(escapeTarget("/sklad/couriers/", "?region=andijon")).toBe("/sklad");
  });
  it("operator → operatorlar, filtr saqlanadi", () => {
    expect(escapeTarget("/moliya/operator", "?from=2026-10-28&to=2026-10-28&filial=1&id=302")).toBe(
      "/moliya/operators?filial=1&from=2026-10-28&to=2026-10-28",
    );
  });
  it("yuqori darajali sahifa — hech narsa", () => {
    expect(escapeTarget("/orders", "?order=abc")).toBeNull();
    expect(escapeTarget("/sklad", "")).toBeNull();
    expect(escapeTarget("/", "")).toBeNull();
  });
});
