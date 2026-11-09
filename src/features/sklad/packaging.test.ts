import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api-client";

import { describePieces, packedQuantity, rowErrorsOf, splitPieces, toPieces } from "./packaging";

describe("karobka ↔ dona (hujjat 44, Alatoo — package_size 9)", () => {
  it("server formulasi: boxes × size + units", () => {
    expect(toPieces(3, 1, 9)).toBe(28);
    expect(toPieces(2, 0, 9)).toBe(18);
    expect(splitPieces(19, 9)).toEqual({ boxes: 2, pieces: 1 });
  });

  it("yozuv: karobkali va karobkasiz", () => {
    expect(describePieces(19, 9)).toBe("2 kar. 1 dona");
    expect(describePieces(18, 9)).toBe("2 kar.");
    expect(describePieces(7, 1)).toBe("7 dona");
  });

  it("serverga quantity hech qachon ketmaydi", () => {
    expect(packedQuantity(2, 1, 9)).toEqual({ boxes: 2, units: 1 });
    expect(packedQuantity(5, 7, 1)).toEqual({ units: 7 });
  });

  it("fields.lines — indeks bo'yicha qator xatosi", () => {
    const error = new ApiError("x", 400, { code: "validation_error", fields: { lines: [{ boxes: ["Manfiy bo'lmasin"] }, {}] } }, "validation_error");
    expect(rowErrorsOf(error, "lines")).toEqual(["Manfiy bo'lmasin", null]);
  });
});
