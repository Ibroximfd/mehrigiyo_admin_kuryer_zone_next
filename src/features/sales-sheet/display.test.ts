import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api-client";
import { translateText } from "@/lib/i18n/translate";

import { salesSheetFileName, salesSheetParams } from "./api";
import { cellText, filledCells, fullDate, moneyText, shortDate, signedCellText } from "./display";
import { feeAmountOf, feeErrorText } from "./fee";

describe("katak matni — sklad bilan bir xil shakl", () => {
  it("faqat sklad birligi — son; karobkadan tashqari dona — «kar. + dona»", () => {
    expect(cellText({ qty: 245, pieces: 0 })).toBe("245");
    expect(cellText({ qty: 1245, pieces: 0 })).toBe("1 245");
    expect(cellText({ qty: 2, pieces: 1 })).toBe("2 kar. 1 dona");
    expect(cellText({ qty: 0, pieces: 5 })).toBe("5 dona");
  });

  it("ishorali harakat: qaytarish — «−», tuzatish — «+»", () => {
    expect(signedCellText({ qty: -3, pieces: 0 })).toBe("−3");
    expect(signedCellText({ qty: 2, pieces: 0 })).toBe("+2");
    expect(signedCellText({ qty: -2, pieces: -1 })).toBe("−2 kar. 1 dona");
  });

  it("rus tilida ham sonlar joyida qoladi (ikki o'rinli shablon)", () => {
    expect(translateText("2 kar. 1 dona", "ru")).toBe("2 кор. 1 шт.");
    expect(translateText("−2 kar. 1 dona", "ru")).toBe("−2 кор. 1 шт.");
    expect(translateText("Boshida 3 + berildi 1", "ru")).toBe("На начало 3 + выдано 1");
    expect(translateText(" — 122 berish kerak, omboringizda 90, 32 yetmaydi", "ru")).toBe(" — нужно выдать 122, на вашем складе 90, не хватает 32");
    expect(translateText(": daftarda 5, zakazlarda 4", "ru")).toBe(": в журнале 5, в заказах 4");
  });

  it("pul: son — guruhlab, `null` — «—» (hech qachon «0»)", () => {
    expect(moneyText(31_080_000)).toBe("31 080 000");
    expect(moneyText(0)).toBe("0");
    expect(moneyText(null)).toBe("—");
  });

  it("noldan farqli kataklar — ustun tartibida", () => {
    const products = [
      { id: 6, name: "Tea", unitLabel: "dona" },
      { id: 7, name: "Rayhon", unitLabel: "dona" },
      { id: 8, name: "Elixir", unitLabel: "dona" },
    ];
    expect(filledCells({ "8": { qty: 1, pieces: 0 }, "6": { qty: 2, pieces: 0 } }, products).map((entry) => entry.product.name)).toEqual(["Tea", "Elixir"]);
    expect(filledCells({}, products)).toEqual([]);
  });

  it("sana", () => {
    expect(fullDate("2026-11-16")).toBe("16.11.2026");
    expect(shortDate("2026-11-16")).toBe("16.11");
  });
});

describe("kuryer xizmati — maydon (hujjat 83 §3)", () => {
  it("bo'sh yoki 0 — `null` (yozuv o'chadi); bo'sh joyli son — butun so'm", () => {
    expect(feeAmountOf("")).toBeNull();
    expect(feeAmountOf("0")).toBeNull();
    expect(feeAmountOf("1 495 000")).toBe(1_495_000);
    expect(feeAmountOf("780000")).toBe(780_000);
  });

  it("server xatosi maydon matniga aylanadi", () => {
    const validation = new ApiError("Kuryer xizmatini saqlab bo'lmadi", 400, { code: "validation_error", fields: { amount: ["Summa manfiy bo'lmasin"] } }, "validation_error");
    expect(feeErrorText(validation)).toBe("Summa manfiy bo'lmasin");
    expect(feeErrorText(new ApiError("x", 400, { code: "validation_error", fields: { date: "Sana yopilgan" } }, "validation_error"))).toBe("Sana yopilgan");
    expect(feeErrorText(new ApiError("x", 403, { code: "forbidden" }, "forbidden"))).toBe("Bu kuryer sizga biriktirilmagan");
    expect(feeErrorText(new ApiError("x", 404, { code: "courier_not_found" }, "courier_not_found"))).toBe("Kuryer topilmadi — jadvalni yangilang");
    // Marshrutsiz 404 — endpoint hali chiqmagan.
    expect(feeErrorText(new ApiError("x", 404, {}))).toBe("Kuryer xizmatini yozish serverda hali yoqilmagan");
    expect(feeErrorText(new ApiError("Tarmoq xatosi. Internetingizni tekshiring."))).toBe("Tarmoq xatosi. Internetingizni tekshiring.");
    expect(feeErrorText("nimadir")).toBe("Kuryer xizmatini saqlab bo'lmadi");
  });
});

describe("so'rov parametrlari va fayl nomi (§2, §5)", () => {
  it("bitta kun — `days` yo'q; oraliq — `days=1` (kunma-kun)", () => {
    expect(salesSheetParams({ dateFrom: "2026-11-16", dateTo: "2026-11-16" })).toEqual({ date_from: "2026-11-16", date_to: "2026-11-16", days: null });
    expect(salesSheetParams({ dateFrom: "2026-11-10", dateTo: "2026-11-16" })).toEqual({ date_from: "2026-11-10", date_to: "2026-11-16", days: 1 });
  });

  it("server nom bermasa — kontraktdagi nom", () => {
    expect(salesSheetFileName({ dateFrom: "2026-11-16", dateTo: "2026-11-16" })).toBe("sotuv_2026-11-16.xlsx");
    expect(salesSheetFileName({ dateFrom: "2026-11-10", dateTo: "2026-11-16" })).toBe("sotuv_2026-11-10_2026-11-16.xlsx");
  });
});
