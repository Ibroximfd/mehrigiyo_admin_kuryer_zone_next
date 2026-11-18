import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { mapSalesSheet } from "../types";
import { CashCollectionBody } from "./cash-collection-view";

/**
 * «Pul olish» ekrani (hujjat 85 §2) maketdagi raqamlar bilan yiqilmasdan
 * chiziladi va faqat serverdagi raqamlarni ko'rsatadi (DOM'siz — server render).
 * Ma'lumot — shu fayldagi namuna javob (demo bazada bu bo'lim uchun ma'lumot yo'q).
 */
const DAY = { dateFrom: "2026-11-18", dateTo: "2026-11-18" };

const cash = (money: Record<string, unknown>) => ({ discount_system: 0, receipts: [], ...money });

const courier = (id: number, fullName: string, addresses: number, refused: number, money: Record<string, unknown>) => ({
  courier: { id, full_name: fullName },
  addresses,
  refused_addresses: refused,
  cash: cash(money),
});

/** Maket (18.11.2026): Bahtiyor to'liq olingan, Xayrullo va Muhammadqul — hali. */
const SHEET = {
  date_from: "2026-11-18",
  date_to: "2026-11-18",
  products: [],
  couriers: [
    courier(31, "Bahtiyor aka", 22, 1, {
      sales_amount: 22_000_000,
      online_amount: 5_010_000,
      discount_manual: 300_000,
      discount_amount: 300_000,
      gift_amount: 4_000_000,
      fee_amount: 1_495_000,
      opening_debt: 200_000,
      due_total: 11_395_000,
      received: 11_395_000,
      closing_debt: 0,
      receipts: [{ id: 9, amount: 11_395_000, at: "2026-11-18T20:10:00+05:00", by: { id: 7, full_name: "Zoirjon" } }],
    }),
    courier(32, "Xayrullo aka", 23, 0, {
      sales_amount: 21_200_000,
      online_amount: 3_720_000,
      discount_manual: 0,
      discount_amount: 0,
      gift_amount: 3_000_000,
      fee_amount: 1_495_000,
      opening_debt: 0,
      due_total: 12_985_000,
      received: 0,
      closing_debt: 12_985_000,
    }),
    courier(33, "Muhammadqul aka", 12, 0, {
      sales_amount: 11_200_000,
      online_amount: 2_950_000,
      discount_manual: 150_000,
      discount_amount: 150_000,
      gift_amount: 2_400_000,
      fee_amount: 780_000,
      opening_debt: 0,
      due_total: 4_920_000,
      received: 0,
      closing_debt: 4_920_000,
    }),
  ],
  totals: {
    addresses: 57,
    cash: cash({
      sales_amount: 54_400_000,
      online_amount: 11_680_000,
      discount_amount: 450_000,
      gift_amount: 9_400_000,
      fee_amount: 3_770_000,
      opening_debt: 200_000,
      due_total: 29_300_000,
      received: 11_395_000,
      closing_debt: 17_905_000,
    }),
  },
  checks: [],
};

/** Skidka maydoni `useMutation` ishlatadi — `QueryClient` kerak. */
function render(raw: unknown, range = DAY, canAccept = true): string {
  const sheet = mapSalesSheet(raw);
  return renderToStaticMarkup(
    createElement(QueryClientProvider, { client: new QueryClient() }, createElement(CashCollectionBody, { sheet, range, canAccept })),
  );
}

/** Matnni teglarsiz o'qish. */
const text = (markup: string) => markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("pul olish — server render", () => {
  it("bitta kun: tenglama, kuryerlar, «Olinishi kerak» va jami — serverdagi raqamlar", () => {
    const out = render(SHEET);
    for (const figure of ["54 400 000", "11 680 000", "29 300 000", "17 905 000", "11 395 000", "12 985 000", "4 920 000"]) expect(out).toContain(figure);
    for (const name of ["Bahtiyor aka", "Xayrullo aka", "Muhammadqul aka", "Jami", "3 ta kuryer"]) expect(out).toContain(name);
    expect(out).toContain("22 manzil · 1 atkaz");
    expect(out).toContain("23 manzil");
    // Tenglama yetti bo'lak (sovg'a kirmaydi), natija — «Olinishi kerak».
    expect(out.match(/<li /g)?.length).toBeGreaterThanOrEqual(7);
  });

  it("amal: qarz bor — «Oldim», yopilgan — «✓ olindi»; skidka — maydonda, serverdagi summa bilan", () => {
    const out = render(SHEET);
    expect(out.match(/>Oldim</g)).toHaveLength(2);
    expect(out.match(/✓ olindi/g)).toHaveLength(1);
    expect(out).toContain('aria-label="Bahtiyor aka: olingan pullar"');
    // Skidka maydonlari: Bahtiyor 300 000, Xayrullo bo'sh, Muhammadqul 150 000.
    expect(out.match(/<input/g)).toHaveLength(3);
    expect(out).toContain('value="300 000"');
    expect(out).toContain('value="150 000"');
    expect(out).toContain('value=""');
    expect(out).toContain("Amal");
    // Hali olinmagan — «—», qarz qizil, yopilgani yashil.
    expect(out).toMatch(/text-danger[^>]*>12 985 000</);
    expect(out).toMatch(/text-ok[^>]*>0</);
  });

  it("dopusksiz: «Oldim» yo'q, izoh bor; «✓ olindi» ko'rinadi (yozuvlarni ko'rish uchun)", () => {
    const out = render(SHEET, DAY, false);
    expect(out).not.toContain(">Oldim<");
    expect(out).toContain("Pul qabul qilish dopuski yo&#x27;q");
    expect(out.match(/✓ olindi/g)).toHaveLength(1);
  });

  it("oraliq: faqat yig'indi — maydon va «Oldim» yo'q, izoh va davr qarzi sarlavhalari", () => {
    const out = render({ ...SHEET, date_to: "2026-11-19" }, { dateFrom: "2026-11-18", dateTo: "2026-11-19" });
    expect(out).not.toContain("<input");
    expect(out).not.toContain(">Oldim<");
    expect(out).not.toContain("✓ olindi");
    expect(out).not.toContain(">Amal<");
    expect(out).toContain("Oraliqda — faqat yig&#x27;indi");
    expect(out).toContain("Davr boshidagi qarz");
    expect(out).toContain("Davr oxiridagi qarz");
  });

  it("server `cash` blokini bermagan — «server hali chiqarmagan», raqam o'ylab topilmaydi", () => {
    const couriers = SHEET.couriers.map((row) => ({ courier: row.courier, addresses: row.addresses, refused_addresses: row.refused_addresses }));
    const out = render({ ...SHEET, couriers, totals: {} });
    expect(out).toContain("Pul olish — server hali chiqarmagan");
    expect(out).not.toContain("Olinishi kerak");
    expect(out).not.toContain("<table");
  });

  it("kelmagan pul maydoni — «—», `0` emas; bitta kuryerda blok yo'q — qator izohi", () => {
    const partial = {
      ...SHEET,
      couriers: [courier(32, "Xayrullo aka", 23, 0, { sales_amount: 21_200_000 }), { courier: { id: 33, full_name: "Muhammadqul aka" } }],
    };
    const out = render(partial);
    const xayrullo = text(out).split("Xayrullo aka")[1]!.split("Muhammadqul aka")[0]!;
    expect(xayrullo).toContain("21 200 000");
    expect(xayrullo).not.toMatch(/(^|\s)0(\s|$)/);
    expect(xayrullo).toContain("—");
    // Qarz kelmagan — na «Oldim», na «✓ olindi».
    expect(xayrullo).not.toContain("Oldim");
    expect(out).toContain("Bu kuryer bo&#x27;yicha pul hisobi kelmadi");
  });
});
