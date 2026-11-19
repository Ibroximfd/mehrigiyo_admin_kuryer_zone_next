import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api-client";
import { translateText } from "@/lib/i18n/translate";

import { salesSheetFileName, salesSheetParams } from "./api";
import { cellDona, cellText, cellUnitText, columnUnit, filledCells, fullDate, moneyText, shortDate, signedCellText } from "./display";
import { feeAmountOf, feeErrorText } from "./fee";

describe("katak matni — sklad bilan bir xil shakl", () => {
  it("faqat sklad birligi — son; karobkadan tashqari dona — «kar. + dona»", () => {
    expect(cellText({ qty: 245, pieces: 0 })).toBe("245");
    expect(cellText({ qty: 1245, pieces: 0 })).toBe("1 245");
    expect(cellText({ qty: 2, pieces: 1 })).toBe("2 kar. 1 dona");
    expect(cellText({ qty: 0, pieces: 5 })).toBe("5 dona");
  });

  it("donada yuritiladigan mahsulot (hujjat 84 §2.2) — bitta son: `pieces_total`, bo'lmasa qty × karobkadagi dona + dona", () => {
    const kremi = { id: 34, name: "Kremi", unitLabel: "karobka", countsInDona: true, piecesPerBox: 3 };
    expect(cellText({ qty: 21, pieces: 2, piecesTotal: 65 }, kremi)).toBe("65");
    expect(cellText({ qty: 21, pieces: 2 }, kremi)).toBe("65");
    expect(cellText({ qty: 10, pieces: 1 }, kremi)).toBe("31");
    expect(cellText({ qty: 400, pieces: 0 }, kremi)).toBe("1 200");
    expect(signedCellText({ qty: -1, pieces: -1, piecesTotal: -4 }, kremi)).toBe("−4");
    expect(signedCellText({ qty: -1, pieces: -1 }, kremi)).toBe("−4");
    // Ustun donada — sarlavhada birlik yozilmaydi.
    expect(columnUnit(kremi)).toBe("dona");
  });

  it("karobkadagi dona noma'lum — taxmin yo'q: `pieces_total` bo'lsa birligi bilan, bo'lmasa avvalgidek", () => {
    const unknown = { id: 34, name: "Kremi", unitLabel: "karobka", countsInDona: true, piecesPerBox: null };
    expect(cellDona({ qty: 21, pieces: 2 }, unknown)).toBeNull();
    expect(cellText({ qty: 21, pieces: 2 }, unknown)).toBe("21 kar. 2 dona");
    expect(cellText({ qty: 21, pieces: 0 }, unknown)).toBe("21");
    expect(cellText({ qty: 21, pieces: 2, piecesTotal: 65 }, unknown)).toBe("65 dona");
    expect(columnUnit(unknown)).toBe("karobka");
  });

  it("faqat karobkada sotiladigan mahsulot va mahsulotsiz katak — o'zgarmaydi", () => {
    const boxOnly = { id: 7, name: "Rayhon", unitLabel: "karobka", countsInDona: false, piecesPerBox: 3 };
    expect(cellText({ qty: 2, pieces: 1, piecesTotal: 7 }, boxOnly)).toBe("2 kar. 1 dona");
    expect(cellDona({ qty: 2, pieces: 1 }, undefined)).toBeNull();
    expect(columnUnit(boxOnly)).toBe("karobka");
  });

  it("matnda (Telegram) — birlik bilan: jadval katagi + ustun sarlavhasidagi birlik", () => {
    const kremi = { id: 34, name: "Kremi", unitLabel: "karobka", countsInDona: true, piecesPerBox: 3 };
    const rayhon = { id: 7, name: "Rayhon", unitLabel: "karobka", countsInDona: false, piecesPerBox: 6 };
    const tea = { id: 6, name: "Tea", unitLabel: "dona", countsInDona: false, piecesPerBox: null };
    expect(cellUnitText({ qty: 10, pieces: 1 }, kremi)).toBe("31 dona");
    expect(cellUnitText({ qty: 3, pieces: 0 }, rayhon)).toBe("3 karobka");
    expect(cellUnitText({ qty: 2, pieces: 1 }, rayhon)).toBe("2 kar. 1 dona");
    expect(cellUnitText({ qty: 0, pieces: 5 }, rayhon)).toBe("5 dona");
    expect(cellUnitText({ qty: 1245, pieces: 0 }, tea)).toBe("1 245 dona");
    expect(translateText("3 karobka", "ru")).toBe("3 кор.");
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
      { id: 6, name: "Tea", unitLabel: "dona", countsInDona: false, piecesPerBox: null },
      { id: 7, name: "Rayhon", unitLabel: "dona", countsInDona: false, piecesPerBox: null },
      { id: 8, name: "Elixir", unitLabel: "dona", countsInDona: false, piecesPerBox: null },
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
