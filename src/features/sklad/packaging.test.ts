import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api-client";
import { mapItemRef } from "@/lib/item-ref";

import { describeLine, describePieces, enteredQuantity, entersBoxes, packedQuantity, rowErrorsOf, splitPieces, toPieces } from "./packaging";

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
    expect(describePieces(10, 1, "karobka")).toBe("10 karobka");
  });

  it("bo'linishi bor — boxes/units; bo'linishsiz (karobkada yuritiladigan ham) — quantity", () => {
    expect(packedQuantity(2, 1, 9)).toEqual({ boxes: 2, units: 1 });
    expect(packedQuantity(5, 7, 1)).toEqual({ quantity: 7 });
  });

  it("fields.lines — indeks bo'yicha qator xatosi", () => {
    const error = new ApiError("x", 400, { code: "validation_error", fields: { lines: [{ boxes: ["Manfiy bo'lmasin"] }, {}] } }, "validation_error");
    expect(rowErrorsOf(error, "lines")).toEqual(["Manfiy bo'lmasin", null]);
  });
});

describe("faqat dona (hujjat 84): kirim so'rovi qatori", () => {
  // Faqat karobkada sotiladi, skladda donada (Alatoo — 1 kar. = 9 dona).
  const alatoo = mapItemRef({ id: 14, name: "Alatoo", unit_label: "dona", stock_unit: "piece", piece_sale: false });
  // Donalab sotiladi, skladda donada (1 kar. = 3 dona).
  const gel = mapItemRef({ id: 30, name: "Gel", unit_label: "dona", stock_unit: "piece", pieces_per_box: 3, piece_sale: true });
  // Donalab sotiladi, skladda hali karobkada.
  const kremi = mapItemRef({ id: 34, name: "Kremi", unit_label: "karobka", stock_unit: "box", pieces_per_box: 3, units_allowed: ["box", "piece"] });

  it("karobka + dona maydonlari — faqat karobkada sotiladigan karobkali mahsulotda", () => {
    expect(entersBoxes(alatoo, 9)).toBe(true);
    expect(entersBoxes(gel, 3)).toBe(false);
    expect(entersBoxes(kremi, 1)).toBe(false);
  });

  it("yozuv: donada yuritiladigan — bitta son, «10 kar. 1 dona» emas", () => {
    expect(describeLine(alatoo, 9, 19)).toBe("2 kar. 1 dona");
    expect(describeLine(gel, 3, 31)).toBe("31 dona");
    // Server soni karobkada: 41 kar. = 123 dona.
    expect(describeLine(kremi, 1, 41)).toBe("123 dona");
  });

  it("yuborish: so'rov shakli o'zgarmaydi, karobkadagi mahsulot — butun karobkaga aniq", () => {
    expect(enteredQuantity(alatoo, 9, 2, 1)).toEqual({ boxes: 2, units: 1 });
    expect(enteredQuantity(gel, 3, 0, 31)).toEqual({ boxes: 0, units: 31 });
    expect(enteredQuantity(kremi, 1, 0, 30)).toEqual({ quantity: 10 });
    expect(enteredQuantity(kremi, 1, 0, 31)).toBeNull();
  });
});
