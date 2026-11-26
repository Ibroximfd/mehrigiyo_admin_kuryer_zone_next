import { describe, expect, it } from "vitest";

import { cellOf, EMPTY_CELL, hasCells, hasCourierlessActivity, isZeroCell, mapCells, mapIssuePlan, mapSalesSheet } from "./types";

/** Hujjat 83 §2 dagi namuna javob (qisqartirilgan). */
const SHEET = {
  date_from: "2026-11-16",
  date_to: "2026-11-16",
  since: "2026-11-01",
  products: [
    { id: 6, name: "Doctor Ali Tea", name_uz: "Doctor Ali Tea (Ipak choy)", order: 1, unit_label: "dona" },
    { id: 7, name: "Rayhon", order: 2, unit_label: "karobka" },
  ],
  couriers: [
    {
      courier: { id: 31, full_name: "Bahtiyor" },
      opening: { "6": { qty: 3, pieces: 0 } },
      issued: { "6": { qty: 1, pieces: 0 } },
      given: { "6": { qty: 4, pieces: 0 }, "7": { qty: 2, pieces: 5 } },
      sold: { "6": { qty: 1, pieces: 0 } },
      gift: {},
      other: {},
      closing: { "6": { qty: 3, pieces: 0 }, "7": { qty: 2, pieces: 5 } },
      sales_amount: 17_070_000,
      cash_amount: 12_060_000,
      online_amount: 5_010_000,
      discount_amount: 0,
      addresses: 22,
      refused_addresses: 1,
      open_orders: 9,
      fee: { amount: 1_495_000, note: "23 manzil × 65 000", set_by: { id: 7, full_name: "Zoirjon" }, set_at: "2026-11-16T19:40:00+05:00" },
      handover_due: 10_565_000,
      days: [],
    },
  ],
  totals: { cash_amount: 12_060_000, fee: { amount: 1_495_000 }, handover_due: 10_565_000 },
  checks: [],
};

describe("sotuv jadvali — `mapSalesSheet` (hujjat 83 §2)", () => {
  it("kontrakt namunasi: mahsulot, kataklar, pul, kuryer xizmati", () => {
    const sheet = mapSalesSheet(SHEET);
    expect(sheet).toMatchObject({ dateFrom: "2026-11-16", dateTo: "2026-11-16" });
    // Nom — `name_uz`, bo'lmasa `name`; birlik — `unit_label`.
    expect(sheet.products).toEqual([
      { id: 6, name: "Doctor Ali Tea (Ipak choy)", unitLabel: "dona", countsInDona: false, piecesPerBox: null },
      { id: 7, name: "Rayhon", unitLabel: "karobka", countsInDona: false, piecesPerBox: null },
    ]);
    const [bahtiyor] = sheet.couriers;
    expect(bahtiyor!.courier).toEqual({ id: 31, fullName: "Bahtiyor" });
    expect(cellOf(bahtiyor!.given, 6)).toEqual({ qty: 4, pieces: 0 });
    expect(cellOf(bahtiyor!.closing, 7)).toEqual({ qty: 2, pieces: 5 });
    expect(bahtiyor).toMatchObject({
      salesAmount: 17_070_000,
      cashAmount: 12_060_000,
      onlineAmount: 5_010_000,
      addresses: 22,
      refusedAddresses: 1,
      openOrders: 9,
      fee: { amount: 1_495_000, note: "23 manzil × 65 000" },
      handoverDue: 10_565_000,
      days: [],
    });
    expect(sheet.totals).toMatchObject({ cashAmount: 12_060_000, fee: { amount: 1_495_000, note: "" }, handoverDue: 10_565_000 });
  });

  it("viloyat (hujjat 96 §6): kalit yo'q — `null` (noma'lum); `region: null` — viloyatsiz; `regions[]` ixtiyoriy", () => {
    const sheet = mapSalesSheet(SHEET);
    expect(sheet.couriers[0]!.region).toBeNull();
    expect(sheet.regions).toBeNull();
    const withRegions = mapSalesSheet({
      couriers: [
        { courier: { id: 31, full_name: "Bahtiyor", region: "toshkent", region_name: "Toshkent viloyati" } },
        { courier: { id: 32, full_name: "Xayrullo", region: null, region_name: "Viloyatsiz" } },
      ],
      regions: [{ region: "toshkent", region_name: "Toshkent viloyati", courier_ids: [31, "32"], cash_amount: 500, handover_due: 400 }, {}],
    });
    expect(withRegions.couriers.map((row) => row.region)).toEqual([
      { code: "toshkent", name: "Toshkent viloyati" },
      { code: null, name: "Viloyatsiz" },
    ]);
    expect(withRegions.regions).toMatchObject([
      { code: "toshkent", name: "Toshkent viloyati", courierIds: [31, 32], cashAmount: 500, handoverDue: 400, cash: null },
      { code: null, name: "", courierIds: [], cashAmount: 0, handoverDue: null },
    ]);
  });

  it("yo'q kalit = nol katak; nol kelgan katak ham saqlanmaydi (§2.1)", () => {
    const [bahtiyor] = mapSalesSheet(SHEET).couriers;
    expect(cellOf(bahtiyor!.gift, 6)).toBe(EMPTY_CELL);
    expect(cellOf(bahtiyor!.sold, 7)).toBe(EMPTY_CELL);
    expect(hasCells(bahtiyor!.other)).toBe(false);
    expect(mapCells({ "6": { qty: 0, pieces: 0 }, "7": { qty: 0, pieces: 2 }, "8": null })).toEqual({ "7": { qty: 0, pieces: 2 } });
    expect(isZeroCell({ qty: 0, pieces: 0 })).toBe(true);
    expect(isZeroCell({ qty: -3, pieces: 0 })).toBe(false);
  });

  it("kalitlar umuman bo'lmasa — nol va `null`, yiqilmaydi", () => {
    const sheet = mapSalesSheet({ couriers: [{}] });
    expect(sheet).toMatchObject({ dateFrom: "", dateTo: "", products: [], checks: [] });
    const [row] = sheet.couriers;
    expect(row).toMatchObject({
      courier: { id: 0, fullName: "" },
      given: {},
      closing: {},
      salesAmount: 0,
      cashAmount: 0,
      onlineAmount: 0,
      discountAmount: 0,
      addresses: 0,
      refusedAddresses: 0,
      openOrders: 0,
      // Yozilmagan xizmat va kelmagan `handover_due` — `null`: «0 so'm» emas, hisoblanmaydi ham.
      fee: null,
      handoverDue: null,
      days: [],
    });
    expect(sheet.totals).toMatchObject({ cashAmount: 0, fee: null, handoverDue: null });
    expect(mapSalesSheet(null).couriers).toEqual([]);
    expect(mapSalesSheet("xato").totals.handoverDue).toBeNull();
  });

  it("tasdiqlanmagan sotuv (97 §3): `totals.pending_*`; yo'q yoki 0 — `null`", () => {
    const withPending = mapSalesSheet({ totals: { pending_sales_amount: 1_250_000, pending_cash_amount: 400_000 } });
    expect(withPending.pending).toEqual({ salesAmount: 1_250_000, cashAmount: 400_000, moneyIncluded: false, addresses: 0, addressesIncluded: false, refusedAddresses: 0 });
    // Hujjat 101 §6: pul darhol hisoblangan, manzillar tasdiqni kutmoqda.
    const included = mapSalesSheet({
      totals: { pending_sales_amount: 900_000, pending_cash_amount: 900_000, pending_in_cash: true, pending_addresses: 2, pending_refused_addresses: 1 },
    });
    expect(included.pending).toEqual({ salesAmount: 900_000, cashAmount: 900_000, moneyIncluded: true, addresses: 2, addressesIncluded: false, refusedAddresses: 1 });
    // Faqat atkaz kutilayotgan bo'lsa ham izoh chiqadi.
    expect(mapSalesSheet({ totals: { pending_refused_addresses: 1 } }).pending).toMatchObject({ salesAmount: 0, refusedAddresses: 1 });
    expect(mapSalesSheet({ totals: { pending_sales_amount: 0, pending_cash_amount: 0 } }).pending).toBeNull();
    expect(mapSalesSheet({ totals: {} }).pending).toBeNull();
    expect(mapSalesSheet(null).pending).toBeNull();
  });

  it("manzil soni darhol (hujjat 108): `pending_in_addresses` har blokda — «shundan N» faqat shu belgi bilan", () => {
    const figures = { addresses: 3, pending_addresses: 1, refused_addresses: 0, pending_refused_addresses: 1, pending_in_addresses: true };
    const sheet = mapSalesSheet({
      couriers: [{ courier: { id: 31, full_name: "Bahtiyor", region: "fergana" }, ...figures, days: [{ date: "2026-11-21", ...figures }] }],
      regions: [{ region: "fergana", region_name: "Farg'ona", courier_ids: [31], ...figures }],
      totals: { ...figures, pending_cash_amount: 0, pending_in_cash: true },
    });
    expect(sheet.addressesOnPress).toBe(true);
    expect(sheet.totals).toMatchObject({ addresses: 3, pendingAddresses: 1 });
    expect(sheet.couriers[0]).toMatchObject({ addresses: 3, pendingAddresses: 1 });
    expect(sheet.couriers[0]?.days[0]).toMatchObject({ addresses: 3, pendingAddresses: 1 });
    expect(sheet.regions?.[0]).toMatchObject({ addresses: 3, pendingAddresses: 1 });
    expect(sheet.pending).toMatchObject({ addresses: 1, addressesIncluded: true, refusedAddresses: 1 });

    // Eski server: `pending_addresses` manzil soniga KIRMAGAN — «shundan» deyilmaydi.
    const old = mapSalesSheet({ totals: { addresses: 3, pending_addresses: 2 } });
    expect(old.addressesOnPress).toBe(false);
    expect(old.totals.pendingAddresses).toBe(0);
    expect(old.pending).toMatchObject({ addresses: 2, addressesIncluded: false });
  });

  it("`fee: null` va summasiz `fee` — yozilmagan", () => {
    const fees = mapSalesSheet({ couriers: [{ fee: null }, { fee: { note: "izoh" } }, { fee: { amount: "780000" } }] }).couriers.map((row) => row.fee);
    expect(fees).toEqual([null, null, { amount: 780_000, note: "" }]);
  });

  it("kunma-kun qatorlar (`days[]`, §2.9) — o'sha kalitlar + sana", () => {
    const sheet = mapSalesSheet({
      couriers: [{ courier: { id: 31 }, days: [{ date: "2026-11-16", sold: { "6": { qty: 1 } }, cash_amount: 500, fee: { amount: 100 }, handover_due: 400 }, {}] }],
    });
    expect(sheet.couriers[0]!.days).toMatchObject([
      { date: "2026-11-16", sold: { "6": { qty: 1, pieces: 0 } }, cashAmount: 500, fee: { amount: 100 }, handoverDue: 400 },
      { date: "", cashAmount: 0, fee: null, handoverDue: null },
    ]);
  });

  it("`checks[]` — mahsulot id yoki obyekt, miqdor juft yoki son", () => {
    const { checks } = mapSalesSheet({
      checks: [
        { date: "2026-11-16", courier_id: 31, flow: "sold", product: 6, ledger: { qty: 5, pieces: 1 }, orders: { qty: 4 } },
        { date: "2026-11-16", flow: "gift", product: { id: 7, name: "Rayhon" }, ledger: 3, orders: 2 },
        {},
      ],
    });
    expect(checks).toEqual([
      { date: "2026-11-16", courierId: 31, flow: "sold", productId: 6, ledger: { qty: 5, pieces: 1 }, orders: { qty: 4, pieces: 0 } },
      { date: "2026-11-16", courierId: null, flow: "gift", productId: 7, ledger: { qty: 3, pieces: 0 }, orders: { qty: 2, pieces: 0 } },
      { date: "", courierId: null, flow: "sold", productId: null, ledger: EMPTY_CELL, orders: EMPTY_CELL },
    ]);
  });
});

describe("faqat dona — yangi maydonlar (hujjat 84 §2)", () => {
  it("`count_unit`, `pieces_per_box` mahsulotda; `pieces_total` katakda — bo'lsa o'qiladi", () => {
    const sheet = mapSalesSheet({
      products: [
        { id: 34, name_uz: "Doctor Ali Kremi", unit_label: "karobka", count_unit: "piece", pieces_per_box: 3 },
        { id: 7, name: "Rayhon", unit_label: "karobka", count_unit: "box", pieces_per_box: 6 },
      ],
      couriers: [{ sold: { "34": { qty: 21, pieces: 2, pieces_total: 65 }, "7": { qty: 4, pieces: 0 } }, other: { "34": { qty: 0, pieces: 0, pieces_total: -2 } } }],
    });
    expect(sheet.products).toEqual([
      { id: 34, name: "Doctor Ali Kremi", unitLabel: "karobka", countsInDona: true, piecesPerBox: 3 },
      { id: 7, name: "Rayhon", unitLabel: "karobka", countsInDona: false, piecesPerBox: 6 },
    ]);
    const [courier] = sheet.couriers;
    expect(cellOf(courier!.sold, 34)).toEqual({ qty: 21, pieces: 2, piecesTotal: 65 });
    // `pieces_total` kelmagan katak — kalitsiz (eski shakl).
    expect(cellOf(courier!.sold, 7)).toEqual({ qty: 4, pieces: 0 });
    // Faqat `pieces_total` noldan farqli katak ham nol emas.
    expect(isZeroCell(cellOf(courier!.other, 34))).toBe(false);
  });
});

describe("berish rejasi — `mapIssuePlan` (hujjat 83 §4)", () => {
  it("kontrakt namunasi", () => {
    const plan = mapIssuePlan({
      date: "2026-11-17",
      products: [{ id: 6, name: "Doctor Ali Tea" }],
      couriers: [
        {
          courier: { id: 31, full_name: "Bahtiyor" },
          carried_orders: 9,
          new_orders: 21,
          on_hand: { "6": { qty: 3, pieces: 0 } },
          required: { "6": { qty: 5, pieces: 0 } },
          to_issue: { "6": { qty: 2, pieces: 0 } },
          surplus: {},
          pending: { "6": { qty: 1, pieces: 0 } },
          issue_lines: [{ item_id: 6, quantity: 2 }, { item_id: 0, quantity: 5 }, { item_id: 7, quantity: 0 }],
        },
      ],
      store: { location_id: 61, on_hand: { "6": { qty: 20, pieces: 0 } }, to_issue: { "6": { qty: 7, pieces: 0 } }, shortage: {} },
    });
    // `unit_label` kelmasa — «dona».
    expect(plan.products).toEqual([{ id: 6, name: "Doctor Ali Tea", unitLabel: "dona", countsInDona: false, piecesPerBox: null }]);
    expect(plan.couriers[0]).toEqual({
      courier: { id: 31, fullName: "Bahtiyor" },
      carriedOrders: 9,
      newOrders: 21,
      onHand: { "6": { qty: 3, pieces: 0 } },
      required: { "6": { qty: 5, pieces: 0 } },
      toIssue: { "6": { qty: 2, pieces: 0 } },
      surplus: {},
      pending: { "6": { qty: 1, pieces: 0 } },
      // Hujjat qatorlari — sklad birligida; id yoki son yo'q qator tashlanadi.
      issueLines: [{ itemId: 6, quantity: 2 }],
    });
    expect(plan.store).toEqual({ locationId: 61, onHand: { "6": { qty: 20, pieces: 0 } }, toIssue: { "6": { qty: 7, pieces: 0 } }, shortage: {} });
  });

  it("bo'sh javob — bo'sh reja, yiqilmaydi", () => {
    expect(mapIssuePlan({})).toEqual({ date: "", products: [], couriers: [], store: { locationId: null, onHand: {}, toIssue: {}, shortage: {} } });
    expect(mapIssuePlan({ couriers: [{}] }).couriers[0]).toMatchObject({ carriedOrders: 0, newOrders: 0, toIssue: {} });
  });
});

describe("«Kuryersiz (bosh kuryer)» bloki — `courierless` (hujjat 125 C §4)", () => {
  /** Prod javobi shaklida (2026-11-24): kuryer qatori kalitlari + zakazlar ro'yxati. */
  const COURIERLESS = {
    opening: {},
    issued: {},
    given: {},
    other: {},
    closing: {},
    sold: { "6": { qty: 3, pieces: 0 } },
    gift: { "6": { qty: 0, pieces: 1 } },
    sales_amount: 630_000,
    cash_amount: 630_000,
    online_amount: 0,
    discount_amount: 0,
    addresses: 0,
    open_orders: 0,
    fee: null,
    handover_due: 0,
    orders_count: 4,
    orders: [
      { id: "a1", order_number: "ORD-20261123101010-AAAA1111", client_phone: "998901234567", report_date: "2026-11-23", courier_id: null },
      { id: "b2", order_number: "ORD-20261123111111-BBBB2222", client_phone: "998907654321", report_date: "2026-11-23", courier_id: 31 },
    ],
    orders_truncated: true,
    days: [],
  };

  it("kuryer qatori kalitlari va zakazlar ro'yxati o'qiladi", () => {
    const block = mapSalesSheet({ ...SHEET, courierless: COURIERLESS }).courierless;
    expect(block).not.toBeNull();
    expect(cellOf(block!.sold, 6)).toEqual({ qty: 3, pieces: 0 });
    expect(cellOf(block!.gift, 6)).toEqual({ qty: 0, pieces: 1 });
    expect(block).toMatchObject({ salesAmount: 630_000, cashAmount: 630_000, handoverDue: 0, fee: null, cash: null });
    expect(block).toMatchObject({ ordersCount: 4, ordersTruncated: true });
    expect(block!.orders).toEqual([
      { id: "a1", orderNumber: "ORD-20261123101010-AAAA1111", clientPhone: "998901234567", reportDate: "2026-11-23", courierId: null },
      { id: "b2", orderNumber: "ORD-20261123111111-BBBB2222", clientPhone: "998907654321", reportDate: "2026-11-23", courierId: 31 },
    ]);
  });

  it("ombor kataklari doim bo'sh — bu kuryer ombori emas", () => {
    const block = mapSalesSheet({ ...SHEET, courierless: COURIERLESS }).courierless!;
    for (const flow of ["opening", "issued", "given", "other", "closing"] as const) expect(hasCells(block[flow])).toBe(false);
  });

  it("server bermasa yoki `courier_id` filtri bilan (`null`) — blok yo'q", () => {
    expect(mapSalesSheet(SHEET).courierless).toBeNull();
    expect(mapSalesSheet({ ...SHEET, courierless: null }).courierless).toBeNull();
  });

  it("`orders_count` kelmasa — ro'yxat uzunligi; kunma-kun qatorlar o'qiladi", () => {
    const block = mapSalesSheet({
      ...SHEET,
      courierless: { orders: COURIERLESS.orders, days: [{ date: "2026-11-23", sold: { "6": { qty: 1, pieces: 0 } }, sales_amount: 210_000 }] },
    }).courierless!;
    expect(block.ordersCount).toBe(2);
    expect(block.ordersTruncated).toBe(false);
    expect(block.days).toHaveLength(1);
    expect(block.days[0]).toMatchObject({ date: "2026-11-23", salesAmount: 210_000 });
  });

  it("hammasi nol — qator chizilmaydi; zakaz, sotuv yoki pul bo'lsa — chiziladi", () => {
    const empty = mapSalesSheet({ ...SHEET, courierless: { orders_count: 0, orders: [] } }).courierless!;
    expect(hasCourierlessActivity(empty)).toBe(false);
    expect(hasCourierlessActivity(mapSalesSheet({ ...SHEET, courierless: COURIERLESS }).courierless!)).toBe(true);
    expect(hasCourierlessActivity({ ...empty, ordersCount: 1 })).toBe(true);
    expect(hasCourierlessActivity({ ...empty, salesAmount: 50_000 })).toBe(true);
    expect(hasCourierlessActivity({ ...empty, gift: { "6": { qty: 0, pieces: 1 } } })).toBe(true);
  });

  it("`totals` — serverniki: blok qo'shilgani uchun sayt uni qayta hisoblamaydi", () => {
    const sheet = mapSalesSheet({ ...SHEET, courierless: COURIERLESS });
    expect(sheet.totals.cashAmount).toBe(12_060_000);
    expect(sheet.totals.handoverDue).toBe(10_565_000);
  });
});

describe("qo'shimcha manzil (2026-11-26)", () => {
  it("kalit bor — son; yo'q — `null` (ustun chizilmaydi)", () => {
    const sheet = mapSalesSheet({
      products: [],
      couriers: [{ courier: { id: 1, full_name: "A" }, extra_addresses: 2 }, { courier: { id: 2, full_name: "B" } }],
      totals: { extra_addresses: 2 },
    });
    expect(sheet.totals.extraAddresses).toBe(2);
    expect(sheet.couriers[0]!.extraAddresses).toBe(2);
    expect(sheet.couriers[1]!.extraAddresses).toBeNull();
    expect(mapSalesSheet({ products: [], couriers: [], totals: {} }).totals.extraAddresses).toBeNull();
  });
});
