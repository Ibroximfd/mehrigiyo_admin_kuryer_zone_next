import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { demoIssuePlan, demoSalesSheet } from "@/lib/demo/mock/sales-sheet.fixture";

import { mapIssuePlan, mapSalesSheet } from "../types";
import { IssuePlanBody } from "./issue-plan-view";
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
    for (const figure of ["31 080 000", "11 680 000", "3 770 000", "27 310 000", "10 565 000"]) expect(out).toContain(figure);
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

  it("17.11: qaytarish bo'lgan kuryerda «Tuzatish / qaytarish» qatori va ogohlantirish", () => {
    const out = sheetHtml("2026-11-17");
    expect(out).toContain("Bu davrda tuzatish yoki qaytarish bor");
    expect(out).toContain("Tuzatish / qaytarish");
    expect(text(out)).toContain("−3");
    expect(text(out)).toContain("−2");
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
    // Ikki kun naqdi: 31 080 000 + 31 610 000.
    expect(out).toContain("62 690 000");
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
    // `handover_due` kelmadi — hisoblanmaydi, «—».
    expect(text(out)).toContain("— kassaga");
    expect(text(out)).not.toContain("500 000 kassaga");
  });

  it("bo'sh server javobi — yiqilmaydi", () => {
    const range = { dateFrom: "2026-11-16", dateTo: "2026-11-16" };
    expect(() => html(createElement(SalesSheetBody, { sheet: mapSalesSheet({}), range, onOpenDay: () => undefined }))).not.toThrow();
    expect(() => html(createElement(SalesSheetBody, { sheet: mapSalesSheet({ couriers: [{}] }), range, onOpenDay: () => undefined }))).not.toThrow();
  });
});

describe("berish rejasi — server render", () => {
  const plan = mapIssuePlan(demoIssuePlan("2026-11-17"));

  it("reja kuni, zakaz sonlari, yetmaydigan mahsulot va jami", () => {
    const out = html(createElement(IssuePlanBody, { plan, canOpenSklad: true }));
    expect(out).toContain("Berish rejasi — 17.11.2026 · seshanba");
    // Kechadan o'tgan 9 + 6 + 11, yangi 21 + 24 + 9.
    expect(text(out)).toContain("Kechadan o&#x27;tgan zakazlar 26");
    expect(text(out)).toContain("Yangi biriktirilgan 54");
    expect(out).toContain("Omborda yetmaydi");
    expect(text(out)).toContain("Rayhon — 122 berish kerak, omboringizda 90, 32 yetmaydi");
    // Donada yuritiladigan karobkali mahsulot — donada (hujjat 84).
    expect(text(out)).toContain("Doctor Ali Kremi — 12 berish kerak, omboringizda 10, 2 yetmaydi");
    for (const label of ["Qo&#x27;lida (qoldiq)", "Zakazlarga kerak", "Yana berish kerak", "Ortiqcha", "Omboringizda bor", "Yetmaydi", "JAMI"]) expect(out).toContain(label);
    expect(out).toContain("Kechadan o&#x27;tgan: 9 ta zakaz");
    expect(out).toContain("Yangi biriktirilgan: 21 ta zakaz");
    // Muhammadqul: Elixir 5 ta qo'lida, 2 ta kerak — 3 ta ortiqcha (sariq qator).
    expect(out).toMatch(/bg-gold-soft[^>]*>3<\/td>/);
  });

  it("«Skladda berish» — faqat sklad dopuski bo'lsa; zakazlar havolasi doim", () => {
    const allowed = html(createElement(IssuePlanBody, { plan, canOpenSklad: true }));
    expect(allowed.match(/href="\/sklad"/g)).toHaveLength(3);
    const viewOnly = html(createElement(IssuePlanBody, { plan, canOpenSklad: false }));
    expect(viewOnly).not.toContain('href="/sklad"');
    expect(viewOnly).toContain('href="/?scope=active&amp;courier=31&amp;once=1"');
  });

  it("berish kerak bo'lmagan kuryer va bo'sh javob", () => {
    const calm = mapIssuePlan({
      date: "2026-11-17",
      products: [{ id: 6, name: "Tea" }],
      couriers: [{ courier: { id: 31, full_name: "Bahtiyor" }, on_hand: { "6": { qty: 3, pieces: 0 } }, required: { "6": { qty: 3, pieces: 0 } } }],
      store: { on_hand: { "6": { qty: 20, pieces: 0 } } },
    });
    const out = html(createElement(IssuePlanBody, { plan: calm, canOpenSklad: true }));
    expect(out).toContain("Berish shart emas");
    expect(out).not.toContain('href="/sklad"');
    expect(out).not.toContain('role="status"');
    expect(() => html(createElement(IssuePlanBody, { plan: mapIssuePlan({}), canOpenSklad: true }))).not.toThrow();
  });
});
