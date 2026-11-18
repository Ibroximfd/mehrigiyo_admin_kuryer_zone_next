import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SheetPeriodBar } from "@/features/sales-sheet/components/sheet-period-bar";
import type { SheetPeriodControls } from "@/features/sales-sheet/use-sheet-period";

import { mapCashSheet } from "../cash-sheet";
import { CASH_PERIODS } from "../cash-sheet-view";
import { CashSheetBody } from "./cash-sheet-section";

/**
 * Kassa (hujjat 85 §3) maketdagi raqamlar bilan yiqilmasdan chiziladi va faqat
 * serverdagi raqamlarni ko'rsatadi (DOM'siz — server render). Ma'lumot — shu
 * fayldagi namuna javob (demo bazada bu jadval uchun ma'lumot yo'q).
 */
const PRODUCTS = [
  { id: 6, name_uz: "Tea (ipak choy)", count_unit: "piece", pieces_per_box: 1, unit_label: "dona" },
  { id: 7, name_uz: "Rayhon", count_unit: "piece", pieces_per_box: 1, unit_label: "dona" },
  { id: 8, name_uz: "Elixir", count_unit: "piece", pieces_per_box: 1, unit_label: "dona" },
  { id: 34, name_uz: "Doctor Ali Kremi", count_unit: "piece", pieces_per_box: 3, unit_label: "karobka" },
];

/** Pul kalitlari — filial qatori va jami bir xil (bitta filial: jami = filial). */
const TOTALS = {
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
};

const FILIAL = {
  ...TOTALS,
  filial: { id: 2, name: "Qo'qon filiali" },
  regions: ["fargona", "andijon", "namangan"],
  handovers: [{ id: 14, amount: 205_000_000, status: "confirmed" }],
};

const SHEET = {
  date_from: "2026-11-17",
  date_to: "2026-11-17",
  products: PRODUCTS,
  sold: {
    items: {
      "6": { qty: 54, pieces: 0, amount: 29_700_000 },
      "7": { qty: 783, pieces: 0, amount: 195_750_000 },
      "8": { qty: 47, pieces: 0, amount: 9_400_000 },
      "34": { qty: 4, pieces: 1, pieces_total: 13, amount: 2_600_000 },
    },
    amount: 303_195_000,
  },
  gift: { items: { "7": { qty: 40, pieces: 0, amount: 16_000_000 }, "8": { qty: 2, pieces: 0, amount: 2_000_000 } }, amount: 18_000_000 },
  filials: [FILIAL],
  totals: TOTALS,
};

function render(raw: unknown, onHandover: ((target: unknown) => void) | null = () => undefined): string {
  return renderToStaticMarkup(createElement(CashSheetBody, { sheet: mapCashSheet(raw), handoverDate: "2026-11-17", onHandover }));
}

const text = (markup: string) => markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("kassa jadvali — server render", () => {
  it("«Nima sotildi»: mahsulot × sotildi/sovg'a, summa; donada yuritiladigan — bitta son", () => {
    const out = render(SHEET);
    for (const label of ["Nima sotildi", "Sotildi", "Sovg&#x27;a", "Summa", "Tea (ipak choy)", "Doctor Ali Kremi"]) expect(out).toContain(label);
    expect(out).toMatch(/>783<\/td>/);
    expect(out).toMatch(/>40<\/td>/);
    // Kremi: 4 kar. 1 dona → 13 dona (hujjat 84).
    expect(out).toMatch(/>13<\/td>/);
    expect(out).not.toContain("kar.");
    expect(out).toContain("303 195 000");
    expect(out).toContain("18 000 000");
    expect(out).toContain('title="29 700 000 so&#x27;m"');
  });

  it("«Filialga topshirish»: filial, viloyatlar, pul ustunlari, jami va «Topshirdim» (qarz bor)", () => {
    const out = render(SHEET);
    expect(out).toContain("Qo&#x27;qon filiali");
    expect(out).toContain("Farg&#x27;ona viloyati · Andijon viloyati · Namangan viloyati");
    for (const figure of ["210 000 000", "70 000 000", "5 195 000", "205 000 000", "5 000 000"]) expect(out).toContain(figure);
    expect(out.match(/>Topshirdim</g)).toHaveLength(1);
    expect(out).toContain("Jami");
    expect(out).toMatch(/text-danger[^>]*>5 000 000</);
    expect(out).not.toContain("✓ topshirildi");
  });

  it("holat: topshirildi va tasdiq kutilmoqda; dopusksiz — tugma yo'q", () => {
    const done = render({ ...SHEET, filials: [{ ...FILIAL, handed_over: 210_000_000, closing_debt: 0 }] });
    expect(done).toContain("✓ topshirildi");
    expect(done).not.toContain(">Topshirdim<");
    const pending = render({ ...SHEET, filials: [{ ...FILIAL, handovers: [{ id: 15, amount: 5_000_000, status: "pending" }], closing_debt: 0 }] });
    expect(pending).toContain("tasdiq kutilmoqda");
    const viewOnly = render(SHEET, null);
    expect(viewOnly).not.toContain(">Topshirdim<");
  });

  it("o'tgan qarz «topshirishi kerak» ichida ko'rinadi; kelmagan pul — «—», `0` emas", () => {
    const withDebt = render({ ...SHEET, filials: [{ ...FILIAL, opening_debt: 5_000_000, due_total: 215_000_000 }] });
    expect(text(withDebt)).toContain("215 000 000 o&#x27;tgan qarz 5 000 000");
    const partial = render({ ...SHEET, filials: [{ filial: { id: 2, name: "Qo'qon filiali" }, sales_amount: 303_195_000 }], totals: {} });
    expect(partial).toContain("303 195 000");
    expect(partial).not.toMatch(/>0</);
    expect(partial).not.toContain(">Topshirdim<");
    expect(text(partial).match(/—/g)!.length).toBeGreaterThanOrEqual(16);
  });

  it("bo'sh davr — bo'sh holat; bo'sh javob yiqilmaydi", () => {
    expect(render({})).toContain("Bu davrda sotuv ham, topshiriladigan pul ham yo&#x27;q");
    expect(() => render({ filials: [{}], products: [{}] })).not.toThrow();
  });
});

describe("kassa davri", () => {
  it("faqat «Kun» va «Sanadan sanagacha»", () => {
    const controls: SheetPeriodControls = {
      period: "day",
      range: { dateFrom: "2026-11-17", dateTo: "2026-11-17" },
      singleDay: true,
      isToday: false,
      setPeriod: () => undefined,
      setDay: () => undefined,
      shiftDay: () => undefined,
      setRange: () => undefined,
    };
    const out = renderToStaticMarkup(createElement(SheetPeriodBar, { controls, periods: CASH_PERIODS }));
    expect(out.match(/aria-pressed/g)).toHaveLength(2);
    expect(out).toContain("Sanadan sanagacha");
    expect(out).not.toContain("Hafta");
  });
});
