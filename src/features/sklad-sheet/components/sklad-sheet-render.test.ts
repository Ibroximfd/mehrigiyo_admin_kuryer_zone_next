import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { buildCurrentStock, linesFromCurrent } from "../current-stock";
import { mapSkladSheet } from "../types";
import type { SkladSheet } from "../types";
import { CurrentStockPanel, selectCurrentStock } from "./current-stock-panel";
import { DaySheetBody } from "./sklad-day-view";

/**
 * Ekranlar egasi sheet'lari (17.11 va 09–14.11.2026) bilan yiqilmasdan
 * chiziladi va serverdagi raqamlarni o'zgartirmasdan ko'rsatadi (DOM'siz —
 * server render). Raqamlar shu faylning o'zida — demo ma'lumot emas.
 */

const html = (element: ReturnType<typeof createElement>) =>
  renderToStaticMarkup(createElement(QueryClientProvider, { client: new QueryClient() }, element));

/** Matnni teglarsiz o'qish — katak ichidagi sonni izlash uchun. */
const text = (markup: string) => markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const NAMES = ["Tea (ipak choy)", "Sustav", "Oregado Box", "Rayhon", "Qora ko'z", "Chufa yog'i", "Elixir", "One shot", "Vanna uchun", "Yangi yostiq"];
const IDS = [6, 25, 9, 7, 23, 24, 8, 21, 22, 10];
const PRODUCTS = IDS.map((id, index) => ({ id, name_uz: NAMES[index], order: index + 1, count_unit: "piece", pieces_per_box: 1 }));

/** Egasi sheet'idagi qator (mahsulot tartibida) → javobdagi `{items, amount}`; nol katak yuborilmaydi. */
function flow(values: readonly number[], amount: number) {
  const items = Object.fromEntries(values.flatMap((qty, index) => (qty ? [[String(IDS[index]), { qty, pieces: 0, pieces_total: qty }]] : [])));
  return { items, amount };
}

const ZERO = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

/** 17.11.2026 — egasi sheet'i (SkladKun). */
const DAY = {
  date_from: "2026-11-17",
  date_to: "2026-11-17",
  products: PRODUCTS,
  opening: flow([76, 0, 19, 1036, 217, 83, 69, 24, 3, 38], 442_590_000),
  from_company: flow(ZERO, 0),
  rows: [
    { region: "fargona", region_name: "Farg'ona", courier: { id: 31, full_name: "Bahtiyor aka" }, sold: flow([20, 0, 1, 206, 72, 15, 20, 0, 0, 6], 93_595_000), gift: flow(ZERO, 0) },
    { region: "andijon", region_name: "Andijon", courier: { id: 32, full_name: "Xayrullo aka" }, sold: flow([17, 0, 7, 374, 54, 34, 16, 6, 3, 6], 138_680_000), gift: flow(ZERO, 0) },
    { region: "namangan", region_name: "Namangan", courier: { id: 33, full_name: "Muhammadqul aka" }, sold: flow([17, 0, 1, 203, 42, 0, 11, 0, 0, 1], 70_920_000), gift: flow(ZERO, 0) },
  ],
  sold: flow([54, 0, 9, 783, 168, 49, 47, 6, 3, 13], 303_195_000),
  gift: flow(ZERO, 0),
  to_company: flow(ZERO, 0),
  other: flow(ZERO, 0),
  closing: flow([22, 0, 10, 253, 49, 34, 22, 18, 0, 25], 139_395_000),
  days: [],
  address_rows: [],
};

describe("kunlik jadval — server render", () => {
  const out = html(createElement(DaySheetBody, { sheet: mapSkladSheet(DAY), day: "2026-11-17" }));

  it("17.11: kun boshi, uch hudud × kuryer, jami va 18.11 kun boshi — serverdagi summalar bilan", () => {
    for (const label of ["Kun boshiga qoldiq", "+ Korxonadan keldi", "JAMI · sotuv", "JAMI · sovg&#x27;a", "− Korxonaga qaytdi", "18.11 kun boshiga qoldiq"]) {
      expect(out).toContain(label);
    }
    for (const name of ["Bahtiyor aka", "Xayrullo aka", "Muhammadqul aka", "Farg&#x27;ona", "Andijon", "Namangan"]) expect(out).toContain(name);
    for (const sum of ["442 590 000", "93 595 000", "138 680 000", "70 920 000", "303 195 000", "139 395 000"]) expect(out).toContain(sum);
    // Rayhon: 1036 − (206 + 374 + 203 = 783) = 253 — uchala son serverdan.
    for (const value of [">1 036<", ">783<", ">253<"]) expect(out).toContain(value);
    expect(out).not.toContain("Tuzatish");
  });

  it("qoldiq qatorida nol — «0», sotuv qatorida nol katak — bo'sh", () => {
    // Sustav (2-ustun) qoldiqda 0.
    expect(out).toMatch(/bg-amber-line[^>]*>0<\/td>/);
    expect(out).toMatch(/bg-ok-soft[^>]*><\/td>/);
    expect(out).not.toMatch(/bg-ok-soft[^>]*>0<\/td>/);
  });

  it("tuzatish bo'lsa — ogohlantirish va ishorali qator", () => {
    const withOther = html(createElement(DaySheetBody, { sheet: mapSkladSheet({ ...DAY, other: flow([0, 0, 0, -2, 0, 0, 0, 0, 0, 0], -400_000) }), day: "2026-11-17" }));
    expect(withOther).toContain("Bu kunda tuzatish bor");
    expect(text(withOther)).toContain("−2");
    expect(text(withOther)).toContain("−400 000");
  });

  it("hujjat 92: chiqim — alohida qator, «tuzatish bor» ogohlantirishi chiqmaydi", () => {
    const withWriteOff = html(createElement(DaySheetBody, { sheet: mapSkladSheet({ ...DAY, write_off: flow([0, 0, 0, 3, 0, 0, 0, 0, 0, 0], 600_000) }), day: "2026-11-17" }));
    expect(withWriteOff).toContain("− Chiqim (spisaniye)");
    expect(withWriteOff).not.toContain("Bu kunda tuzatish bor");
    expect(text(withWriteOff)).toContain("600 000");
  });

  it("javobda yo'q blok — «—», son o'ylab topilmaydi; mahsulot yo'q — bo'sh holat", () => {
    const partial = html(createElement(DaySheetBody, { sheet: mapSkladSheet({ ...DAY, closing: undefined }), day: "2026-11-17" }));
    expect(partial).toMatch(/bg-amber-line[^>]*>—<\/td>/);
    expect(html(createElement(DaySheetBody, { sheet: mapSkladSheet({}), day: "2026-11-17" }))).toContain("Bu kunda skladda mol bo&#x27;lmagan");
  });

  it("hudud × kuryer qatori yo'q kun — izoh qatori", () => {
    const quiet = html(createElement(DaySheetBody, { sheet: mapSkladSheet({ ...DAY, rows: [] }), day: "2026-11-17" }));
    expect(quiet).toContain("Bu kunda yetkazilgan zakaz yo&#x27;q");
  });
});

describe("hozirgi qoldiq — server render", () => {
  it("jadval: Jami · Kuryerlarda · Omborda, rang — sariq/qizil; asosiy raqamlar", () => {
    const sheet = mapSkladSheet({
      products: PRODUCTS.slice(0, 4),
      current: {
        store: { "6": { qty: 52 }, "9": { qty: 6 }, "7": { qty: 180 } },
        couriers: { "6": { qty: 24 }, "9": { qty: 4 }, "7": { qty: 73 } },
        total: { "6": { qty: 76 }, "9": { qty: 10 }, "7": { qty: 253 } },
        min: { "6": 30, "25": 10, "9": 10, "7": 100 },
      },
    });
    const out = html(createElement(CurrentStockPanel, { model: buildCurrentStock(linesFromCurrent(sheet.products, sheet.current!)) }));
    for (const label of ["Hozirgi qoldiq", "Omborda", "Kuryerlarda", "Jami", "Mahsulot turi", "Kam qolgan"]) expect(out).toContain(label);
    expect(out).toMatch(/bg-warn-soft text-warn[^>]*>6<\/td>/);
    expect(out).toMatch(/bg-danger-soft text-danger[^>]*>0<\/td>/);
    expect(out).toContain(">253<");
    expect(out).toContain(">238<");
  });

  it("manba: javobda `current` bo'lsa — serverniki, aks holda (yuklanmoqda, endpoint yo'q) — sahifa yuklagan sklad qoldig'i", () => {
    const fallback = [{ item: { id: 6, name: "Tea", image: null, unitLabel: "dona", countsInDona: false, stockFactor: 1 }, inSklad: 40, withCouriers: 2, minQuantity: 0 }];
    // `selectCurrentStock` faqat `data` ni o'qiydi — so'rov natijasining qolgan maydonlari kerak emas.
    const query = (data?: SkladSheet) => ({ data }) as unknown as UseQueryResult<SkladSheet>;
    expect(selectCurrentStock(query(), fallback).storeTotal).toBe(40);
    expect(selectCurrentStock(query(mapSkladSheet({ products: PRODUCTS })), fallback).storeTotal).toBe(40);
    const server = mapSkladSheet({ products: PRODUCTS.slice(0, 1), current: { store: { "6": { qty: 52 } }, couriers: {}, total: { "6": { qty: 52 } } } });
    expect(selectCurrentStock(query(server), fallback)).toMatchObject({ storeTotal: 52, couriersTotal: 0 });
  });

  it("mahsulot yo'q — bo'sh holat", () => {
    expect(html(createElement(CurrentStockPanel, { model: buildCurrentStock([]) }))).toContain("Skladda mahsulot yo&#x27;q");
  });
});
