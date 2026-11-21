import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { demoIssuePlan, demoSalesSheet } from "@/lib/demo/mock/sales-sheet.fixture";

import type { ChiefSklad } from "@/features/sklad/types";
import { mapItemRef } from "@/lib/item-ref";

import { groupSheetByRegion } from "../regions";
import { mapIssuePlan, mapSalesSheet } from "../types";
import { SalesSheetBody } from "./sales-sheet-view";

/**
 * Ekranlar egasi jadvali (16.11.2026) bilan yiqilmasdan chiziladi va serverdagi
 * raqamlarni ko'rsatadi (DOM'siz — server render). Brauzer tekshiruvi o'rnini
 * bosmaydi, lekin bo'sh/aniqlanmagan maydonda yiqilishni va noto'g'ri katakni ushlaydi.
 */
const TODAY = "2026-11-20";

/** Kuryer xizmati maydoni `useMutation` ishlatadi — `QueryClient` kerak. */
const html = (element: ReturnType<typeof createElement>) =>
  renderToStaticMarkup(createElement(QueryClientProvider, { client: new QueryClient() }, element));

function sheetHtml(dateFrom: string, dateTo = dateFrom): string {
  const range = { dateFrom, dateTo };
  const sheet = mapSalesSheet(demoSalesSheet({ ...range, courierId: null, withDays: dateFrom !== dateTo }, TODAY));
  return html(createElement(SalesSheetBody, { sheet, range, onOpenDay: () => undefined }));
}

/** Matnni teglarsiz o'qish — katak ichidagi sonni izlash uchun. */
const text = (markup: string) => markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("sotuv jadvali — server render", () => {
  it("16.11.2026: jami raqamlar, kuryer bloki va tahrirlanadigan kuryer xizmati", () => {
    const out = sheetHtml("2026-11-16");
    // Umumiy summa (naqd + onlayn, sovg'asiz), onlayn, kuryer xizmati; Bahtiyor — 12 060 000 + 5 010 000.
    for (const figure of ["42 760 000", "11 680 000", "3 770 000", "17 070 000"]) expect(out).toContain(figure);
    for (const name of ["Bahtiyor aka", "Xayrullo aka", "Muhammadqul aka", "Tea (ipak choy)", "JAMI"]) expect(out).toContain(name);
    // Bitta kun — xizmat maydonda, serverdagi summa bilan.
    expect(out).toContain('value="1 495 000"');
    expect(out).toContain('value="780 000"');
    expect(out.match(/<input/g)).toHaveLength(3);
    // To'rt qator; tuzatish yo'q kunda beshinchisi chiqmaydi.
    for (const label of ["Berilgan", "Sotilgan", "Sovg&#x27;a", "Qolgan"]) expect(out).toContain(label);
    expect(out).not.toContain("Tuzatish / qaytarish");
    expect(out).not.toContain("Kunma-kun");
    // Zakazlar havolasi — shu kuryer, shu kun, bir martalik.
    expect(out).toContain('href="/?scope=delivered&amp;courier=31&amp;from=2026-11-16&amp;to=2026-11-16&amp;once=1"');
  });

  it("faqat dona (hujjat 84): Kremi ustuni donada — «38», karobka + dona yozuvi va «karobka» sarlavhasi yo'q", () => {
    const out = sheetHtml("2026-11-16");
    expect(out).toContain("Doctor Ali Kremi");
    // Bahtiyor: boshida 7 + berildi 31 = 38 dona.
    expect(out).toContain('title="Boshida 7 + berildi 31"');
    expect(out).toMatch(/>38<\/td>/);
    expect(out).not.toContain("kar.");
    expect(out).not.toContain("karobka");
  });

  it("«Qolgan» da nol yoziladi, boshqa qatorlarda nol katak bo'sh", () => {
    const out = sheetHtml("2026-11-16");
    // Bahtiyor: Oregado Box berilgan 1, sotilgan 1 → qolgan 0 (yozuv bilan).
    expect(out).toMatch(/bg-danger-soft[^>]*>0<\/td>/);
    expect(out).not.toMatch(/bg-ok-soft[^>]*>0<\/td>/);
    expect(out).toMatch(/bg-ok-soft[^>]*><\/td>/);
    // «Berilgan» katagi izohi: davr boshidagi qoldiq + berilgani.
    expect(out).toContain('title="Boshida 3 + berildi 1"');
  });

  it("qaytarish va tuzatish alohida qator emas (egasi, 2026-11-20): «Berilgan» — sof, tafsiloti izohda", () => {
    const sheet = mapSalesSheet({
      date_from: "2026-11-20",
      date_to: "2026-11-20",
      products: [{ id: 14, name_uz: "Alatoo bals", count_unit: "piece", pieces_per_box: 1 }],
      couriers: [
        {
          courier: { id: 27, full_name: "Test Kuryer" },
          opening: { "14": { qty: 2, pieces: 0 } },
          issued: { "14": { qty: 2, pieces: 0 } },
          given: { "14": { qty: 4, pieces: 0 } },
          other: { "14": { qty: -1, pieces: 0 } },
          closing: { "14": { qty: 3, pieces: 0 } },
        },
      ],
    });
    const out = html(createElement(SalesSheetBody, { sheet, range: { dateFrom: "2026-11-20", dateTo: "2026-11-20" }, onOpenDay: () => undefined }));
    expect(out).not.toContain("Tuzatish / qaytarish");
    expect(out).not.toContain("Bu davrda tuzatish yoki qaytarish bor");
    // Berilgan 4 − qaytarildi 1 = 3; Qolgan ham 3 — tenglama ko'zga yopiladi.
    expect(out).toContain('title="Boshida 2 + berildi 2, qaytarish va tuzatish −1"');
    expect(out).toMatch(/title="Boshida 2[^"]*"[^>]*>3<\/td>/);
  });

  it("17.11: kuryer xizmati hali yozilmagan — maydon bo'sh, jami «—»", () => {
    const out = sheetHtml("2026-11-17");
    expect(out).not.toContain("Tuzatish / qaytarish");
    // Xizmat hali yozilmagan — maydon bo'sh, jami «—».
    expect(out.match(/value=""/g)).toHaveLength(3);
    expect(text(out)).toContain("Kuryer xizmati —");
  });

  it("oraliq: kuryer xizmati — faqat yig'indi (maydon yo'q), kunma-kun ochiladi", () => {
    const out = sheetHtml("2026-11-16", "2026-11-17");
    expect(out).not.toContain("<input");
    expect(out).toContain("kunma-kun yoziladi");
    expect(out).toContain("Kunma-kun");
    expect(out).toContain('aria-expanded="false"');
    // Ikki kun onlayni: 11 680 000 + 10 750 000.
    expect(out).toContain("22 430 000");
  });

  it("farq (`checks[]`), karobka + dona katagi va kelmagan `handover_due`", () => {
    const sheet = mapSalesSheet({
      date_from: "2026-11-16",
      date_to: "2026-11-16",
      products: [{ id: 7, name: "Rayhon", unit_label: "karobka" }],
      couriers: [{ courier: { id: 31, full_name: "Bahtiyor" }, given: { "7": { qty: 2, pieces: 1 } }, closing: { "7": { qty: 0, pieces: 5 } }, cash_amount: 500_000 }],
      totals: { cash_amount: 500_000 },
      checks: [{ date: "2026-11-16", courier_id: 31, flow: "sold", product: 7, ledger: { qty: 5, pieces: 0 }, orders: { qty: 4, pieces: 0 } }],
    });
    const out = html(createElement(SalesSheetBody, { sheet, range: { dateFrom: "2026-11-16", dateTo: "2026-11-16" }, onOpenDay: () => undefined }));
    expect(out).toContain("Sklad daftari zakazlardagi sotuvdan farq qiladi — 1 ta qator");
    expect(text(out)).toContain("Bahtiyor · Sotilgan · Rayhon : daftarda 5, zakazlarda 4");
    expect(out).toContain("2 kar. 1 dona");
    expect(out).toContain("5 dona");
    // Sklad birligi «dona» emas — ustun sarlavhasida yoziladi.
    expect(out).toContain("karobka");
    // Pul bloki (`cash`) kelmadi — «Topshirishi kerak» hisoblanmaydi, «—».
    expect(text(out)).toContain("— kuryer topshiradi");
  });

  it("bo'sh server javobi — yiqilmaydi", () => {
    const range = { dateFrom: "2026-11-16", dateTo: "2026-11-16" };
    expect(() => html(createElement(SalesSheetBody, { sheet: mapSalesSheet({}), range, onOpenDay: () => undefined }))).not.toThrow();
    expect(() => html(createElement(SalesSheetBody, { sheet: mapSalesSheet({ couriers: [{}] }), range, onOpenDay: () => undefined }))).not.toThrow();
  });
});

describe("sotuv jadvali — viloyatlar kesimi (egasi, 2026-11-19)", () => {
  const LIST = new Map<number, string | null>([
    [31, "toshkent"],
    [32, "samarqand"],
    [33, "toshkent"],
  ]);
  const LABELS: Record<string, string> = { toshkent: "Toshkent viloyati", samarqand: "Samarqand viloyati" };

  function groupedHtml(dateFrom: string, dateTo = dateFrom): string {
    const range = { dateFrom, dateTo };
    const sheet = mapSalesSheet(demoSalesSheet({ ...range, courierId: null, withDays: dateFrom !== dateTo }, TODAY));
    const regions = groupSheetByRegion(sheet, LIST, (code) => LABELS[code] ?? code);
    return html(createElement(SalesSheetBody, { sheet, range, regions, onOpenDay: () => undefined }));
  }

  it("bitta kun: viloyat sarlavhasi → kuryerlari → «viloyat jami», oxirida JAMI", () => {
    const out = text(groupedHtml("2026-11-16"));
    const order = ["Samarqand viloyati 1 ta kuryer", "Xayrullo aka", "Samarqand viloyati jami", "Toshkent viloyati 2 ta kuryer", "Bahtiyor aka", "Muhammadqul aka", "Toshkent viloyati jami", "JAMI"];
    const positions = order.map((label) => out.indexOf(label));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    // Toshkent jami: umumiy summa 17 070 000 + 8 800 000, onlayn 5 010 000 + 2 950 000.
    expect(out).toContain("25 870 000");
    expect(out).toContain("7 960 000");
    // Kuryer xizmati maydonlari — faqat kuryer bloklarida.
    expect(groupedHtml("2026-11-16").match(/<input/g)).toHaveLength(3);
  });

  it("hafta / oy / oraliq: kuryer bloklarisiz — har viloyat bitta blok va JAMI", () => {
    const markup = groupedHtml("2026-11-16", "2026-11-19");
    const out = text(markup);
    expect(out).toContain("Viloyat");
    for (const name of ["Bahtiyor aka", "Xayrullo aka", "Zakazlarini ochish", "Kunma-kun", " jami"]) expect(out).not.toContain(name);
    expect(out.indexOf("Samarqand viloyati")).toBeLessThan(out.indexOf("Toshkent viloyati"));
    expect(out).toContain("JAMI");
    expect(markup).not.toContain("<input");
  });

  it("pul ustunlari: Topshirishi kerak va Topshirdi (pul bloki kelmasa — «—», o'ylab topilgan 0 emas)", () => {
    const out = text(groupedHtml("2026-11-16"));
    for (const label of ["Umumiy summa", "Click / onlayn (qo&#x27;lda)", "Skidka (qo&#x27;lda)", "Topshirishi kerak", "Topshirdi"]) expect(out).toContain(label);
    expect(out).toContain("Topshirishi kerak — kuryerlar topshiradigan pul");
    expect(out).not.toContain("Topshirishi kerak 0");
  });
});

describe("bugun: berish kerak va kuryerga berish — Sotuv jadvalida (egasi, 2026-11-20)", () => {
  const range = { dateFrom: "2026-11-17", dateTo: "2026-11-17" };
  const sheet = mapSalesSheet(demoSalesSheet({ ...range, courierId: null, withDays: false }, "2026-11-17"));
  const plan = mapIssuePlan(demoIssuePlan("2026-11-17"));
  const sklad: Extract<ChiefSklad, { kind: "ready" }> = {
    kind: "ready",
    sklad: { id: 1, name: "Vodiy skladi", regions: [], chiefs: [] },
    stock: [],
    couriers: [],
    canWrite: true,
    store: { id: 7, name: "Vodiy ombori" },
  };
  const body = (today: { plan: typeof plan | null; sklad: typeof sklad | null } | null) =>
    html(createElement(SalesSheetBody, { sheet, range, onOpenDay: () => undefined, canAccept: true, today }));

  it("har kuryerda «Berish kerak» qatori, JAMI da — omborimdan; yetmaydigan mahsulot ogohlantiriladi", () => {
    const out = body({ plan, sklad: null });
    expect(out.match(/>Berish kerak</g)?.length).toBeGreaterThanOrEqual(2);
    expect(out).toContain("Omboringizda yetmaydi");
    expect(text(out)).toContain("Rayhon — 122 berish kerak, omboringizda 90, 32 yetmaydi");
    expect(text(out)).toContain("Doctor Ali Kremi — 12 berish kerak, omboringizda 10, 2 yetmaydi");
    // Sklad yuklanmagan yoki dopusk yo'q — hujjat tugmalari yo'q.
    expect(out).not.toContain(": berish");
  });

  it("sklad yozish huquqi bor — har kuryerda «Berish», «Qabul», «Tuzatish»; kuryer so'rovlari bo'limi", () => {
    const out = body({ plan, sklad });
    expect(out).toContain('aria-label="Bahtiyor aka: berish"');
    expect(out).toContain('aria-label="Bahtiyor aka: qabul"');
    expect(out).toContain('aria-label="Bahtiyor aka: tuzatish"');
    expect(out).toContain("Kuryerlarning mol so&#x27;rovlari");
    // Huquq yo'q — faqat ko'rish.
    expect(body({ plan, sklad: { ...sklad, canWrite: false } })).not.toContain(": berish");
  });

  it("bugun harakati yo'q, lekin zakazi bor kuryer ham jadvalda — unga ham berib bo'ladi", () => {
    const withIdle = mapIssuePlan({
      ...demoIssuePlan("2026-11-17"),
      couriers: [{ courier: { id: 99, full_name: "Yangi kuryer" }, new_orders: 3, required: { "6": { qty: 2, pieces: 0 } }, to_issue: { "6": { qty: 2, pieces: 0 } } }],
    });
    const out = body({ plan: withIdle, sklad });
    expect(out).toContain("Bugun harakati yo&#x27;q kuryerlar");
    expect(out).toContain('aria-label="Yangi kuryer: berish"');
    expect(text(out)).toContain("3 ta zakaz · 3 ta yangi");
  });

  it("hujjat 104: harakati ham, zakazi ham yo'q kuryer ham jadvalda — ertalab sanab «Tuzatish» qilish uchun", () => {
    const counted = { ...sklad, couriers: [{ courier: { id: 77, fullName: "Sanoq kuryer", onShift: false }, onHand: 0, items: [] }] };
    const out = body({ plan, sklad: counted });
    expect(out).toContain("Bugun harakati yo&#x27;q kuryerlar");
    expect(out).toContain('aria-label="Sanoq kuryer: tuzatish"');
    expect(out).toContain('aria-label="Sanoq kuryer: berish"');
  });

  it("toza kun (21.11): jadvalda mahsulot yo'q — skladdagi hamma mahsulotga maydon bor, «Berish» har doim yoqiq", () => {
    const fresh = mapSalesSheet({ date_from: range.dateFrom, date_to: range.dateTo, products: [], couriers: [{ courier: { id: 5, full_name: "Toza kuryer" } }] });
    const row = (id: number, name: string) => ({
      item: mapItemRef({ id, name, unit_label: "dona", count_unit: "piece", stock_unit: "piece", pieces_per_box: 1 }),
      inSklad: 0,
      withCouriers: 0,
      minQuantity: 0,
      isLow: false,
    });
    const emptyPlan = mapIssuePlan({ date: range.dateFrom, products: [], couriers: [], store: { location_id: 7 } });
    const out = html(
      createElement(SalesSheetBody, {
        sheet: fresh,
        range,
        onOpenDay: () => undefined,
        today: { plan: emptyPlan, sklad: { ...sklad, stock: [row(1, "Shifo choy"), row(2, "Alatoo bals")] } },
      }),
    );
    expect(out).toContain('aria-label="Toza kuryer: Shifo choy, berish"');
    expect(out).toContain('aria-label="Toza kuryer: Alatoo bals, berish"');
    const button = out.match(/<button[^>]*aria-label="Toza kuryer: berish"[^>]*>/)?.[0] ?? "";
    expect(button).not.toBe("");
    expect(button).not.toMatch(/\sdisabled(=""|\s|>)/);
  });

  it("«Berish kerak» dan ko'p berish cheklanmaydi — maydon faqat omborda yetmasa qizil", () => {
    const fresh = mapSalesSheet({ date_from: range.dateFrom, date_to: range.dateTo, products: [], couriers: [{ courier: { id: 5, full_name: "Toza kuryer" } }] });
    const choy = mapItemRef({ id: 1, name: "Shifo choy", unit_label: "dona", count_unit: "piece", stock_unit: "piece", pieces_per_box: 1 });
    const needs = mapIssuePlan({
      date: range.dateFrom,
      products: [{ id: 1, name_uz: "Shifo choy", count_unit: "piece", unit_label: "dona", pieces_per_box: 1 }],
      couriers: [{ courier: { id: 5, full_name: "Toza kuryer" }, to_issue: { "1": { qty: 8, pieces: 0, pieces_total: 8 } } }],
      store: { location_id: 7 },
    });
    const field = (inSklad: number) => {
      const out = html(
        createElement(SalesSheetBody, {
          sheet: fresh,
          range,
          onOpenDay: () => undefined,
          today: { plan: needs, sklad: { ...sklad, stock: [{ item: choy, inSklad, withCouriers: 0, minQuantity: 0, isLow: false }] } },
        }),
      );
      return out.match(/<input[^>]*aria-label="Toza kuryer: Shifo choy, berish"[^>]*>/)?.[0] ?? "";
    };
    // Faqat o'zi qo'shadigan klass: `aria-invalid:border-danger` kabi umumiy variantlar hisobga olinmaydi.
    const red = (markup: string) => /class="[^"]*(?:^|\s)border-danger(?:\s|")/.test(markup);
    expect(field(20)).toContain('value="8"');
    expect(red(field(20))).toBe(false);
    expect(field(20)).not.toMatch(/(?:^|\s)border-warn(?:\s|")/);
    expect(red(field(3))).toBe(true);
  });

  it("o'tgan kun yoki reja yo'q — «Berish kerak» va sklad amallari chiqmaydi", () => {
    const out = body(null);
    expect(out).not.toContain(">Berish kerak<");
    expect(out).not.toContain(": berish");
    expect(out).not.toContain("Kuryerlarning mol so");
  });
});
