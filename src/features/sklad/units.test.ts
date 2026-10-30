import { describe, expect, it } from "vitest";

import { describePieces, splitPieces, toPieces } from "./units";

describe("karobka ↔ dona", () => {
  it("karobkani donaga ko'paytiradi", () => {
    expect(toPieces(5, 6, 12)).toBe(66);
    expect(toPieces(0, 0, 12)).toBe(0);
  });

  it("manfiy va kasr qiymatlarni to'g'rilaydi", () => {
    expect(toPieces(-1, 2.9, 10)).toBe(2);
    expect(toPieces(1, 0, 0)).toBe(1);
  });

  it("donani karobka + donaga ajratadi", () => {
    expect(splitPieces(66, 12)).toEqual({ boxes: 5, pieces: 6 });
    expect(splitPieces(11, 12)).toEqual({ boxes: 0, pieces: 11 });
  });

  it("qisqa yozuv", () => {
    expect(describePieces(66, 12)).toBe("5 kar. 6 dona");
    expect(describePieces(24, 12)).toBe("2 kar.");
    expect(describePieces(3, 12)).toBe("3 dona");
  });
});
