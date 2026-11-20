import { describe, expect, it } from "vitest";

import { isEmptyFlow, mapSkladSheet } from "./types";

/** Shartnoma namunasi (hujjat 85 §1) — javob shaklida. */
const CONTRACT = {
  date_from: "2026-11-17",
  date_to: "2026-11-17",
  products: [{ id: 6, name_uz: "Doctor Ali Tea", order: 1, count_unit: "piece", pieces_per_box: 1 }],
  current: {
    store: { "6": { qty: 52, pieces: 0 } },
    couriers: { "6": { qty: 24, pieces: 0 } },
    total: { "6": { qty: 76, pieces: 0 } },
    min: { "6": 30 },
  },
  opening: { items: { "6": { qty: 76, pieces: 0, amount: 41_800_000 } }, amount: 442_590_000 },
  from_company: { items: {}, amount: 0 },
  rows: [
    {
      region: "fargona",
      region_name: "Farg'ona",
      courier: { id: 31, full_name: "Bahtiyor" },
      sold: { items: { "6": { qty: 20, pieces: 0, amount: 11_000_000 } }, amount: 93_595_000 },
      gift: { items: {}, amount: 0 },
    },
  ],
  sold: { items: { "6": { qty: 54, pieces: 0, amount: 29_700_000 } }, amount: 303_195_000 },
  gift: { items: {}, amount: 0 },
  to_company: { items: {}, amount: 0 },
  other: { items: {}, amount: 0 },
  closing: { items: { "6": { qty: 22, pieces: 0, amount: 12_100_000 } }, amount: 139_395_000 },
  days: [],
  address_rows: [],
};

describe("mapSkladSheet (hujjat 85 §1)", () => {
  it("shartnoma namunasi: mahsulot, hozirgi qoldiq, harakatlar va hudud × kuryer", () => {
    const sheet = mapSkladSheet(CONTRACT);
    expect(sheet.products).toEqual([{ id: 6, name: "Doctor Ali Tea", countsInDona: true, piecesPerBox: 1, unitLabel: "dona" }]);
    expect(sheet.current).toEqual({
      store: { "6": { qty: 52, pieces: 0 } },
      couriers: { "6": { qty: 24, pieces: 0 } },
      total: { "6": { qty: 76, pieces: 0 } },
      pending: {},
      min: { "6": 30 },
    });
    expect(sheet.opening).toEqual({ items: { "6": { qty: 76, pieces: 0 } }, amount: 442_590_000 });
    expect(sheet.closing?.amount).toBe(139_395_000);
    expect(sheet.rows).toEqual([
      {
        region: "fargona",
        regionName: "Farg'ona",
        courier: { id: 31, fullName: "Bahtiyor" },
        sold: { items: { "6": { qty: 20, pieces: 0 } }, amount: 93_595_000 },
        gift: { items: {}, amount: 0 },
      },
    ]);
    expect(isEmptyFlow(sheet.other)).toBe(true);
  });

  it("hujjat 92 §3: `write_off` — alohida blok, musbat son", () => {
    const sheet = mapSkladSheet({ ...CONTRACT, write_off: { items: { "6": { qty: 2, pieces: 0, amount: 1_100_000 } }, amount: 1_100_000 } });
    expect(sheet.writeOff).toEqual({ items: { "6": { qty: 2, pieces: 0 } }, amount: 1_100_000 });
    expect(mapSkladSheet(CONTRACT).writeOff).toBeNull();
  });

  it("bo'sh javob — yiqilmaydi: bloklar `null`, ro'yxatlar bo'sh, son o'ylab topilmaydi", () => {
    const sheet = mapSkladSheet({});
    expect(sheet).toEqual({
      dateFrom: "",
      dateTo: "",
      products: [],
      current: null,
      opening: null,
      fromCompany: null,
      rows: [],
      sold: null,
      gift: null,
      soldPending: null,
      giftPending: null,
      pendingIncluded: false,
      toCompany: null,
      writeOff: null,
      other: null,
      closing: null,
      days: [],
      addressRows: [],
    });
    expect(mapSkladSheet(null).current).toBeNull();
  });

  it("harakat ichida yo'q kalit — nol katak (saqlanmaydi); summa yo'q — `null`", () => {
    const sheet = mapSkladSheet({ sold: { items: { "6": { qty: 0, pieces: 0 }, "7": { qty: 3 } } } });
    expect(sheet.sold).toEqual({ items: { "7": { qty: 3, pieces: 0 } }, amount: null });
  });

  it("`current` — uchala blok bo'lmasa `null` (yarim blokdan son yasalmaydi); `min` yo'q — chegara yo'q", () => {
    expect(mapSkladSheet({ current: { store: {}, couriers: {} } }).current).toBeNull();
    expect(mapSkladSheet({ current: { store: {}, couriers: {}, total: {} } }).current).toEqual({ store: {}, couriers: {}, total: {}, pending: {}, min: {} });
  });

  it("donada yuritiladigan karobkali mahsulot va `pieces_total` (hujjat 84)", () => {
    const sheet = mapSkladSheet({
      products: [{ id: 34, name: "Kremi", count_unit: "piece", pieces_per_box: 3, unit_label: "karobka" }],
      opening: { items: { "34": { qty: 10, pieces: 1, pieces_total: 31 } }, amount: 6_200_000 },
    });
    expect(sheet.products[0]).toMatchObject({ countsInDona: true, piecesPerBox: 3, unitLabel: "karobka" });
    expect(sheet.opening?.items["34"]).toEqual({ qty: 10, pieces: 1, piecesTotal: 31 });
  });

  it("kuryersiz qator — `courier: null`; hudud nomi yo'q — kod", () => {
    const [row] = mapSkladSheet({ rows: [{ region: "andijon", courier: null }] }).rows;
    expect(row).toEqual({ region: "andijon", regionName: "andijon", courier: null, sold: null, gift: null });
  });

  it("`days[]` va `address_rows[]`: yo'q son — `null`, nol emas", () => {
    const sheet = mapSkladSheet({
      days: [{ date: "2026-11-09", sold: { items: { "7": { qty: 48 } }, amount: 25_075_000 } }],
      address_rows: [
        { date: "2026-11-09", addresses: 40, refused_addresses: 2, rate: 51_000, fee: 2_150_000 },
        { date: "2026-11-10", addresses: 42, rate: null, fee: null },
      ],
    });
    expect(sheet.days).toEqual([{ date: "2026-11-09", sold: { items: { "7": { qty: 48, pieces: 0 } }, amount: 25_075_000 }, gift: null }]);
    expect(sheet.addressRows).toEqual([
      { date: "2026-11-09", addresses: 40, refusedAddresses: 2, rate: 51_000, fee: 2_150_000 },
      { date: "2026-11-10", addresses: 42, refusedAddresses: null, rate: null, fee: null },
    ]);
  });

  it("tasdiqlanmagan sotuv (97 §3): `sold_pending`, `gift_pending`, `current.pending` — bo'lsa o'qiladi", () => {
    const sheet = mapSkladSheet({
      sold_pending: { items: { "6": { qty: 3, pieces: 0 } }, amount: 600_000 },
      gift_pending: { items: { "6": { qty: 1, pieces: 0 } }, amount: 0 },
      current: { store: {}, couriers: {}, total: { "6": { qty: 72, pieces: 0 } }, pending: { "6": { qty: 4, pieces: 0 } } },
    });
    expect(sheet.soldPending).toEqual({ items: { "6": { qty: 3, pieces: 0 } }, amount: 600_000 });
    expect(sheet.giftPending?.items).toEqual({ "6": { qty: 1, pieces: 0 } });
    expect(sheet.current?.pending).toEqual({ "6": { qty: 4, pieces: 0 } });
  });
});
