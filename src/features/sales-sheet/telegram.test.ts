import { describe, expect, it } from "vitest";

import { demoSalesSheet } from "@/lib/demo/mock/sales-sheet.fixture";
import { translateText } from "@/lib/i18n/translate";

import type { CourierCash } from "./cash";
import { groupSheetByRegion } from "./regions";
import { regionTelegram, salesSheetTelegram, TELEGRAM_LINE } from "./telegram";
import type { SheetTelegramInput } from "./telegram";
import { mapSalesSheet } from "./types";

const TODAY = "2026-11-20";
const LIST = new Map<number, string | null>([
  [31, "toshkent"],
  [32, "samarqand"],
  [33, "toshkent"],
]);
const LABELS: Record<string, string> = { toshkent: "Toshkent viloyati", samarqand: "Samarqand viloyati" };

function input(dateFrom: string, dateTo = dateFrom, grouped = true): SheetTelegramInput {
  const range = { dateFrom, dateTo };
  const sheet = mapSalesSheet(demoSalesSheet({ ...range, courierId: null, withDays: dateFrom !== dateTo }, TODAY));
  return {
    title: "Samarqand filiali",
    range,
    products: sheet.products,
    couriers: sheet.couriers,
    totals: sheet.totals,
    regions: grouped ? groupSheetByRegion(sheet, LIST, (code) => LABELS[code] ?? code) : null,
  };
}

describe("Telegram matni — bitta kun", () => {
  const text = salesSheetTelegram(input("2026-11-16"));
  const lines = text.split("\n");

  it("sarlavha, viloyatlar, kuryerlar, viloyat jami va umumiy jami — chiziq bilan ajratilgan", () => {
    expect(lines.slice(0, 4)).toEqual(["📍 Sotuv hisoboti — Samarqand filiali", "📅 Sana: 16.11.2026", TELEGRAM_LINE, "🗺 Samarqand viloyati · 1 ta kuryer"]);
    expect(lines.filter((line) => line === TELEGRAM_LINE)).toHaveLength(3);
    expect(lines.filter((line) => line.startsWith("👤 "))).toEqual(["👤 Xayrullo aka", "👤 Bahtiyor aka", "👤 Muhammadqul aka"]);
    expect(lines.filter((line) => line.startsWith("📊 "))).toEqual(["📊 Samarqand viloyati jami", "📊 Toshkent viloyati jami"]);
    expect(lines).toContain("🧾 Jami · 3 ta kuryer");
  });

  it("mahsulot — server tartibida, birlik bilan, nol qator kirmaydi; pul va manzil", () => {
    const toshkent = lines.slice(lines.indexOf("📊 Toshkent viloyati jami"));
    expect(toshkent.slice(0, 8)).toEqual([
      "📊 Toshkent viloyati jami",
      "📦 Sotildi",
      "• Tea (ipak choy) — 4 dona",
      "• Rayhon — 90 dona",
      "• Elixir — 3 dona",
      "• Oregado Box — 1 dona",
      "• Qora ko'z — 8 dona",
      // Donada yuritiladigan karobkali mahsulot — donada (hujjat 84): 20 + 5.
      "• Doctor Ali Kremi — 25 dona",
    ]);
    expect(toshkent).toContain("💵 Naqd: 17 910 000 · Onlayn: 7 960 000 · Skidka: 0");
    expect(toshkent).toContain("🚚 Manzil soni: 34 · Borganda atkaz: 1");
    expect(text).not.toContain("Yostiq");
    // «Pul olish» bloki kelmagan — topshirish qatori yo'q (o'ylab topilgan 0 emas).
    expect(text).not.toContain("Topshirdi");
  });

  it("kuryer qisqacha: manzilsiz; sovg'asi yo'q — «yo'q»", () => {
    const base = input("2026-11-16");
    const [first] = base.couriers;
    const text = salesSheetTelegram({ ...base, regions: null, couriers: [{ ...first!, gift: {} }] });
    const courier = text.split("\n").slice(3);
    expect(courier[0]).toBe("👤 Bahtiyor aka");
    expect(courier.slice(courier.indexOf("🎁 Sovg'a"), courier.indexOf("🎁 Sovg'a") + 2)).toEqual(["🎁 Sovg'a", "• yo'q"]);
    expect(courier.slice(0, courier.indexOf(TELEGRAM_LINE)).some((line) => line.startsWith("🚚"))).toBe(false);
  });

  it("viloyat aniqlanmagan — viloyatsiz: kuryerlar va jami", () => {
    const text = salesSheetTelegram(input("2026-11-16", "2026-11-16", false));
    expect(text).not.toContain("🗺");
    expect(text.split("\n").filter((line) => line.startsWith("👤 "))).toHaveLength(3);
    expect(text).toContain("🧾 Jami · 3 ta kuryer");
  });
});

describe("Telegram matni — oraliq va bitta viloyat", () => {
  it("hafta / oy / oraliq: davr, kuryersiz — har viloyat bitta blok", () => {
    const text = salesSheetTelegram(input("2026-11-16", "2026-11-19"));
    expect(text).toContain("📅 Davr: 16.11 – 19.11.2026");
    expect(text).not.toContain("👤");
    expect(text).not.toContain("📊");
    expect(text).toContain("🗺 Toshkent viloyati · 2 ta kuryer\n📦 Sotildi");
  });

  it("bitta viloyat matni — sarlavha va shu viloyat, umumiy jamisiz", () => {
    const base = input("2026-11-16");
    const text = regionTelegram(base, base.regions![1]!);
    expect(text.startsWith("📍 Sotuv hisoboti — Samarqand filiali\n📅 Sana: 16.11.2026\n━━━━━━━━━━━━━━━\n🗺 Toshkent viloyati · 2 ta kuryer")).toBe(true);
    expect(text).not.toContain("Samarqand viloyati");
    expect(text).not.toContain("🧾");
  });

  it("«Pul olish» bloki bor — topshirishi kerak (olinishi kerak) va topshirdi; noma'lum — «—»", () => {
    const base = input("2026-11-16");
    const cash: CourierCash = {
      salesAmount: 1,
      onlineAmount: 0,
      onlineSystem: null,
      onlineManual: null,
      discountAmount: 0,
      discountSystem: null,
      discountManual: 0,
      giftAmount: 0,
      feeAmount: 0,
      openingDebt: 0,
      dueTotal: 10_565_000,
      received: null,
      closingDebt: null,
      receipts: [],
      since: null,
    };
    const text = salesSheetTelegram({ ...base, regions: null, totals: { ...base.totals, cash } });
    expect(text).toContain("💰 Topshirishi kerak: 10 565 000 · Topshirdi: —");
  });
});

describe("Telegram matni — tarjima", () => {
  it("yorliqlar va viloyat nomi tanlangan tilda; kuryer, mahsulot va filial nomi — xom", () => {
    const text = salesSheetTelegram({ ...input("2026-11-16"), t: (label) => translateText(label, "ru") });
    for (const label of ["📍 Отчёт о продажах — Samarqand filiali", "📅 Дата: 16.11.2026", "🗺 Ташкентская область · курьеров: 2", "📊 Ташкентская область — итого", "📦 Продано", "• Rayhon — 90 шт.", "👤 Bahtiyor aka", "🧾 Итого · курьеров: 3"]) {
      expect(text).toContain(label);
    }
  });
});
