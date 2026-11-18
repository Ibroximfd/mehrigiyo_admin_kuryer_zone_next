import { describe, expect, it } from "vitest";

import { mapCashSheet } from "./cash-sheet";
import { canHandOver, CASH_PERIOD_VALUES, filialStatus, regionsText } from "./cash-sheet-view";

/** Hujjat 85 §3 namunasi (Kassa maketi, 17.11.2026) — server javobi, test ichida. */
const SHEET = {
  date_from: "2026-11-17",
  date_to: "2026-11-17",
  products: [
    { id: 6, name: "Doctor Ali Tea", name_uz: "Tea (ipak choy)", order: 1, count_unit: "piece", pieces_per_box: 1, unit_label: "dona" },
    { id: 34, name: "Doctor Ali Kremi", order: 2, count_unit: "piece", pieces_per_box: 3, unit_label: "karobka" },
  ],
  sold: {
    items: { "6": { qty: 54, pieces: 0, amount: 29_700_000 }, "34": { qty: 4, pieces: 1, pieces_total: 13, amount: 2_600_000 }, "99": { qty: 0, pieces: 0 } },
    amount: 303_195_000,
  },
  gift: { items: {}, amount: 18_000_000 },
  filials: [
    {
      filial: { id: 2, name: "Qo'qon filiali" },
      regions: ["fargona", "andijon", "namangan"],
      sales_amount: 303_195_000,
      cash_amount: 210_000_000,
      online_amount: 70_000_000,
      gift_amount: 18_000_000,
      discount_amount: 5_195_000,
      opening_debt: 0,
      due_total: 210_000_000,
      handed_over: 205_000_000,
      confirmed: 205_000_000,
      closing_debt: 5_000_000,
      handovers: [{ id: 14, amount: 205_000_000, status: "confirmed", at: "2026-11-17T19:00:00+05:00", confirmed_at: "2026-11-17T20:00:00+05:00" }, { amount: 1 }],
    },
  ],
  totals: { sales_amount: 303_195_000, due_total: 210_000_000, handed_over: 205_000_000, closing_debt: 5_000_000 },
};

describe("kassa jadvali — `mapCashSheet` (hujjat 85 §3)", () => {
  it("namuna javob: mahsulotlar, sotildi/sovg'a va filial puli serverdagidek", () => {
    const sheet = mapCashSheet(SHEET);
    expect(sheet.products.map((product) => product.name)).toEqual(["Tea (ipak choy)", "Doctor Ali Kremi"]);
    expect(sheet.products[1]!.unit).toEqual({ countsInDona: true, piecesPerBox: 3, unitLabel: "karobka" });
    // Nol katak saqlanmaydi; summa katakda va qatorda.
    expect(Object.keys(sheet.sold.items)).toEqual(["6", "34"]);
    expect(sheet.sold.items["34"]).toEqual({ qty: 4, pieces: 1, piecesTotal: 13, amount: 2_600_000 });
    expect([sheet.sold.amount, sheet.gift.amount]).toEqual([303_195_000, 18_000_000]);
    const [row] = sheet.filials;
    expect(row).toMatchObject({
      filial: { id: 2, name: "Qo'qon filiali" },
      regions: ["fargona", "andijon", "namangan"],
      salesAmount: 303_195_000,
      cashAmount: 210_000_000,
      onlineAmount: 70_000_000,
      giftAmount: 18_000_000,
      discountAmount: 5_195_000,
      openingDebt: 0,
      dueTotal: 210_000_000,
      handedOver: 205_000_000,
      confirmed: 205_000_000,
      closingDebt: 5_000_000,
    });
    // `id` siz topshiriq tashlanadi.
    expect(row!.handovers).toEqual([{ id: 14, amount: 205_000_000, status: "confirmed", at: new Date("2026-11-17T19:00:00+05:00") }]);
  });

  it("kelmagan pul — `null` («—»), `0` emas; bo'sh javob yiqilmaydi", () => {
    const sheet = mapCashSheet(SHEET);
    expect(sheet.totals).toMatchObject({ salesAmount: 303_195_000, cashAmount: null, onlineAmount: null, confirmed: null });
    const empty = mapCashSheet({});
    expect(empty).toMatchObject({ products: [], filials: [], sold: { items: {}, amount: null }, gift: { items: {}, amount: null } });
    expect(Object.values(empty.totals).every((value) => value === null)).toBe(true);
    expect(mapCashSheet({ filials: [{}] }).filials[0]).toMatchObject({ filial: null, regions: [], dueTotal: null, closingDebt: null, handovers: [] });
  });
});

describe("kassa jadvali — ko'rinish qoidalari", () => {
  const row = (closingDebt: number | null, statuses: Array<"pending" | "confirmed" | "disputed"> = []) => ({
    closingDebt,
    handovers: statuses.map((status, index) => ({ id: index + 1, amount: 1_000, status, at: null })),
  });

  it("holat: kutilayotgan topshiriq birinchi, keyin kamomad, qarz qolmasa — topshirildi", () => {
    expect(filialStatus(row(5_000_000, ["confirmed"]))).toBeNull();
    expect(filialStatus(row(0, ["confirmed"]))).toBe("done");
    expect(filialStatus(row(0, ["pending"]))).toBe("pending");
    expect(filialStatus(row(5_000_000, ["confirmed", "pending"]))).toBe("pending");
    expect(filialStatus(row(50_000, ["disputed"]))).toBe("disputed");
    expect(filialStatus(row(null))).toBeNull();
  });

  it("«Topshirdim» — faqat server aytgan qarz bo'lsa", () => {
    expect(canHandOver({ closingDebt: 5_000_000 })).toBe(true);
    expect(canHandOver({ closingDebt: 0 })).toBe(false);
    expect(canHandOver({ closingDebt: -10_000 })).toBe(false);
    expect(canHandOver({ closingDebt: null })).toBe(false);
  });

  it("viloyatlar nomi va davr turlari («Kun» · «Sanadan sanagacha»)", () => {
    expect(regionsText(["fargona", "andijon"])).toBe("Farg'ona viloyati · Andijon viloyati");
    expect(regionsText(["yangi_kod"])).toBe("yangi_kod");
    expect(CASH_PERIOD_VALUES).toEqual(["day", "range"]);
  });
});
