import { describe, expect, it } from "vitest";

import { isEmptyReport, mapChiefFinance, productTotals } from "./types";

describe("moliya: chief/finance (TUZILMA_V2 §5.1)", () => {
  const finance = mapChiefFinance({
    date_from: "2026-10-31",
    date_to: "2026-10-31",
    by_filial: [
      { filial: null, delivered: 0, addresses: 0, fee: 0, cash_accepted: 120000, handed_over: 0, to_hand_over: 120000 },
      { filial: { id: 1, name: "Qo'qon" }, delivered: 12, addresses: 15, fee: 225000, cash_accepted: 3400000, handed_over: 2000000, to_hand_over: 1400000 },
    ],
    totals: { cash_accepted: 3520000, handed_over: 2000000, to_hand_over: -5, delivered: 12, addresses: 15, fee: 225000 },
  });

  it("taqsimlanmagan qator oxirida, manfiy qoldiq 0", () => {
    expect(finance.byFilial.map((row) => row.filial?.id ?? null)).toEqual([1, null]);
    expect(finance.byFilial[0]).toMatchObject({ fee: 225000, cashAccepted: 3400000, toHandOver: 1400000 });
    expect(finance.totals.toHandOver).toBe(0);
  });

  it("kuryer kesimi va mahsulotlar jami (V13)", () => {
    const report = mapChiefFinance({
      by_courier: [
        { courier: { id: 1, full_name: "A" }, delivered: 2, addresses: 2, cash_with_courier: 100, cash_handed: 50, by_product: [{ item: { id: 11, name: "G" }, qty: 2 }] },
        { courier: { id: 2, full_name: "B" }, delivered: 1, addresses: 1, cash_with_courier: 0, cash_handed: 0, by_product: [{ item: { id: 11, name: "G" }, qty: 1 }, { item: { id: 12, name: "K" }, qty: 5 }] },
      ],
    });
    expect(report.byCourier[0]).toMatchObject({ cashWithCourier: 100, cashHanded: 50 });
    expect(productTotals(report.byCourier)).toEqual([
      { item: { id: 12, name: "K", image: null }, quantity: 5 },
      { item: { id: 11, name: "G", image: null }, quantity: 3 },
    ]);
  });

  it("mahsulot rasmi: to'liq URL o'z holicha, bo'sh — null, boshqa kuryerdagisi olinadi", () => {
    const report = mapChiefFinance({
      by_courier: [
        { courier: { id: 1, full_name: "A" }, by_product: [{ item: { id: 11, name: "G", image: null }, qty: 1 }] },
        { courier: { id: 2, full_name: "B" }, by_product: [{ item: { id: 11, name: "G", image: "https://my.imorganic.uz/media/g.png" }, qty: 1 }, { item: { id: 12, name: "K", image: "" }, qty: 1 }] },
      ],
    });
    expect(report.byCourier[0]?.products[0]?.item.image).toBeNull();
    expect(productTotals(report.byCourier)).toEqual([
      { item: { id: 11, name: "G", image: "https://my.imorganic.uz/media/g.png" }, quantity: 2 },
      { item: { id: 12, name: "K", image: null }, quantity: 1 },
    ]);
  });

  it("bo'sh hisobot: kuryer yo'q, yetkazilmagan va qoldiq yo'q", () => {
    expect(isEmptyReport(finance)).toBe(false);
    expect(isEmptyReport(mapChiefFinance({ by_courier: [{ courier: { id: 1, full_name: "A" }, delivered: 0, addresses: 0 }] }))).toBe(true);
  });
});

describe("moliya: viloyat narxi (MOLIYA_R_F §0.1, §R, §3)", () => {
  const finance = mapChiefFinance({
    by_filial: [
      {
        filial: { id: 2, name: "Toshkent" },
        delivered: 42,
        addresses: 45,
        fee: "440000",
        addresses_by_region: [
          { region: "toshkent_shahar", region_name: "Toshkent shahri", addresses: 40, per_address: 11000, fee: "440000", missing_rate: false },
          { region: "qashqadaryo", region_name: "Qashqadaryo", addresses: 5, per_address: null, fee: null, missing_rate: true },
        ],
        missing_rates: ["qashqadaryo"],
        missing_rate: true,
        cash_accepted: "3200000",
      },
      { filial: { id: 3, name: "Qo'qon" }, addresses: 3, fee: null, missing_rates: ["andijon"], missing_rate: true },
    ],
    totals: { addresses: 48, fee: "440000" },
  });

  it("pul satrdan o'qiladi, narxsiz `null` — `0` EMAS", () => {
    expect(finance.byFilial[0]).toMatchObject({ fee: 440000, cashAccepted: 3200000, missingRate: true, missingRates: ["qashqadaryo"] });
    expect(finance.byFilial[1]?.fee).toBeNull();
  });

  it("viloyat kesimi: narx va haq `null` bo'lishi mumkin", () => {
    expect(finance.byFilial[0]?.byRegion).toEqual([
      { region: "toshkent_shahar", regionName: "Toshkent shahri", addresses: 40, perAddress: 11000, fee: 440000, missingRate: false },
      { region: "qashqadaryo", regionName: "Qashqadaryo", addresses: 5, perAddress: null, fee: null, missingRate: true },
    ]);
  });

  it("jami: server soni o'zgarmaydi (F-5), «to'liq emas» belgisi filiallardan yig'iladi", () => {
    expect(finance.totals.fee).toBe(440000);
    expect(finance.totals).toMatchObject({ missingRate: true, missingRates: ["qashqadaryo", "andijon"] });
  });

  it("eski javob (`missing_*` yo'q) — belgi yo'q, viloyat kesimi bo'sh", () => {
    const old = mapChiefFinance({ by_filial: [{ filial: { id: 1, name: "Q" }, fee: 225000 }], totals: { fee: 225000 } });
    expect(old.byFilial[0]).toMatchObject({ fee: 225000, missingRate: false, missingRates: [], byRegion: [] });
    expect(old.totals.missingRate).toBe(false);
  });
});
