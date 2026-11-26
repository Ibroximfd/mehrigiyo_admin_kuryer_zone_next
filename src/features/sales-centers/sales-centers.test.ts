import { describe, expect, it } from "vitest";

import { demoSalesSheet } from "@/lib/demo/mock/sales-sheet.fixture";
import type { CourierCash } from "@/features/sales-sheet/cash";
import { dispatchFilters, orderFilterParams } from "@/features/chief/order-params";
import { ratingSearchParams } from "@/features/ratings/types";
import { salesSheetParams } from "@/features/sales-sheet/api";
import { salesSheetTelegram } from "@/features/sales-sheet/telegram";
import { mapSalesSheet } from "@/features/sales-sheet/types";

import { hasCenterChoice, mapNotSplit, mapSalesCenters, salesFilialParam } from "./types";

const CENTERS = mapSalesCenters([
  { id: 2, name: "Mehrigiyo Qo'qon 1", code: "Q", is_hub: true },
  { id: 3, name: "Mehrigiyo Qo'qon 2", code: "", is_hub: false },
  { id: 6, name: "Mehrigiyo Qo'qon 3", code: "", is_hub: false },
]);

describe("markazlar (136-javob)", () => {
  it("ro'yxat: hub birinchi; takror va noto'g'ri id tashlanadi", () => {
    expect(CENTERS.map((center) => [center.id, center.isHub])).toEqual([
      [2, true],
      [3, false],
      [6, false],
    ]);
    expect(mapSalesCenters([{ id: 3 }, { id: 3 }, { id: -1 }, "x"])).toEqual([{ id: 3, name: "#3", code: "", isHub: false }]);
    expect(hasCenterChoice(CENTERS)).toBe(true);
    expect(hasCenterChoice(CENTERS.slice(0, 1))).toBe(false);
  });

  it("`sales_filial`: ro'yxatdagi markaz (hub ham); eski server/bitta markaz — yuborilmaydi", () => {
    expect(salesFilialParam(3, CENTERS)).toBe("3");
    expect(salesFilialParam(2, CENTERS)).toBe("2");
    expect(salesFilialParam(99, CENTERS)).toBeNull();
    expect(salesFilialParam(3, [])).toBeNull();
    expect(salesFilialParam(3, CENTERS.slice(0, 1))).toBeNull();
    expect(salesFilialParam(null, CENTERS)).toBeNull();
    // Ro'yxat hali kelmagan — kalit keyin o'zgarmaydi.
    expect(salesFilialParam(3, null)).toBe("3");
  });

  it("`not_by_sales_filial`", () => {
    expect(mapNotSplit(true)).toEqual({ all: true, keys: [] });
    expect(mapNotSplit(["stock.opening", "fee"])).toEqual({ all: false, keys: ["stock.opening", "fee"] });
    expect(mapNotSplit(undefined)).toBeNull();
    expect(mapSalesSheet({ not_by_sales_filial: ["fee"] }).notSplit).toEqual({ all: false, keys: ["fee"] });
    expect(mapSalesSheet({}).notSplit).toBeNull();
  });
});

describe("markaz so'rovlarga ketadi", () => {
  it("zakazlar va filtr bo'yicha taqsimlash", () => {
    expect(orderFilterParams({ scope: "incoming", salesFilial: "3" }).sales_filial).toBe("3");
    expect(orderFilterParams({ scope: "incoming" }).sales_filial).toBeNull();
    expect(dispatchFilters({ salesFilial: "6" }).sales_filial).toBe("6");
    expect(dispatchFilters({})).not.toHaveProperty("sales_filial");
  });

  it("sotuv jadvali va reyting — filtrsiz kalit yo'q (eski kesh kaliti o'zgarmaydi)", () => {
    const range = { dateFrom: "2026-11-26", dateTo: "2026-11-26" };
    expect(salesSheetParams(range, "3").sales_filial).toBe("3");
    expect(salesSheetParams(range)).not.toHaveProperty("sales_filial");
    const filters = { dateFrom: null, dateTo: null, stars: [], courierId: null, region: null, hasComment: null, page: 1 };
    expect(ratingSearchParams({ ...filters, salesFilial: "3" }).sales_filial).toBe("3");
    expect(ratingSearchParams(filters)).not.toHaveProperty("sales_filial");
  });
});

describe("Telegram matni — markaz bilan", () => {
  const range = { dateFrom: "2026-11-16", dateTo: "2026-11-16" };
  const sheet = mapSalesSheet(demoSalesSheet({ ...range, courierId: null, withDays: false }, "2026-11-20"));
  const base = { title: "Qo'qon filiali", range, products: sheet.products, couriers: sheet.couriers, totals: sheet.totals, regions: null };

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

  it("sarlavhada markaz; pul topshirig'i (umumiy) yozilmaydi", () => {
    const totals = { ...base.totals, cash };
    expect(salesSheetTelegram({ ...base, totals })).toContain("💰 Topshirishi kerak");
    const lines = salesSheetTelegram({ ...base, totals, center: "Mehrigiyo Qo'qon 2" }).split("\n");
    expect(lines[1]).toBe("🏢 Markaz: Mehrigiyo Qo'qon 2");
    expect(lines.some((line) => line.startsWith("💰 "))).toBe(false);
    expect(lines.some((line) => line.startsWith("💵 "))).toBe(true);
  });

  it("markazsiz — avvalgidek", () => {
    const text = salesSheetTelegram(base);
    expect(text).not.toContain("Markaz");
  });
});
