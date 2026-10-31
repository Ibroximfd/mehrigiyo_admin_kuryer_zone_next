import { describe, expect, it } from "vitest";

import { courierHandoverView, handoverTiming, mapChiefCash, mapCourierCod, mapCourierHandover } from "@/features/cash/types";
import { courierOptions, planFromPreview, readyRows } from "@/features/chief/auto-plan";
import { isOpenOrder, orderProductsLine } from "@/features/chief/order-view";
import { formatDeliveryAddress } from "@/features/orders/address";
import { mapLogistOrder } from "@/features/orders/types";
import { mapLoginResponse } from "@/features/auth/types";
import { mapAutoAssignPreview, mapChiefCouriers, mapChiefFilials, mapChiefMe, mapChiefOrderDetail, mapChiefZones } from "@/features/chief/types";
import { mapRegionsDictionary } from "@/features/zones/types";
import { isEmptyReport, mapChiefFinance, productTotals } from "@/features/report/types";
import { mapCourierStock, mapOwnSklad, mapSkladMe, mapStockCell, skladStockRows } from "@/features/sklad/types";
import { asPage } from "@/lib/paginate";

/**
 * Test serverdagi haqiqiy javoblar (2026-10-31, bosh kuryer test akkaunti, V-javoblaridan keyin) —
 * faqat ma'lumot qismi, login va token yo'q. Mapper backend shakli o'zgarsa
 * shu yerda yiqiladi. Akkauntda zakaz yo'q — bo'sh holatlar ham tekshiriladi.
 */
const LIVE = {
  me: {
    seat: { id: 43, full_name: "Test Bosh Kuryer", username: "chief-test" },
    filial: { id: 2, name: "Mehrigiyo Qo'qon" },
    regions: ["toshkent_shahar"],
    permissions: {
      "orders.dispatch": true,
      "couriers.manage": true,
      "zones.manage": true,
      "cash.accept": true,
      "warehouse.view_courier_stores": true,
    },
    summary: { incoming: 0, active: 0, couriers: 1, couriers_on_shift: 0, finalized_today: 0 },
  },
  login: {
    success: true,
    account_kind: "chief",
    is_admin: false,
    is_staff: false,
    role: "chief_courier",
    operator: { id: 43, full_name: "Test Bosh Kuryer", username: "chief-test", filial: 2, filial_name: "Mehrigiyo Qo'qon", is_logist: false },
    filial: { id: 2, name: "Mehrigiyo Qo'qon", region: "Farg'ona viloyati , Qo'qon", region_code: "fargona", lat: null, lng: null },
  },
  finance: {
    date_from: "2026-10-01",
    date_to: "2026-10-31",
    by_filial: [],
    totals: { cash_accepted: 0, handed_over: 0, to_hand_over: 0, delivered: 0, addresses: 0, fee: 0 },
    by_courier: [
      { courier: { id: 27, full_name: "Test Kuryer" }, delivered: 0, addresses: 0, cash_with_courier: 0, cash_handed: 0, by_product: [] },
    ],
  },
  filials: [
    { id: 2, name: "Mehrigiyo Qo'qon", is_main: true },
    { id: 1, name: "Mehrigiyo Toshkent", is_main: false },
    { id: 3, name: "Samarqand filiali", is_main: false },
  ],
  preview: { rows: [] },
  skladMe: {
    role: "chief_courier",
    filial_id: 2,
    region: "toshkent_shahar",
    regions: ["toshkent_shahar"],
    sklad_id: 2,
    can_write: false,
    granted_item_ids: [],
  },
  sklads: [
    {
      id: 2,
      name: "Test Bosh Kuryer skladi",
      regions: ["toshkent_shahar"],
      is_active: true,
      chief: { id: 43, full_name: "Test Bosh Kuryer" },
      locations: 1,
    },
  ],
  regions: [
    {
      region: "toshkent_shahar",
      name: "Toshkent shahri",
      districts: [
        { code: "toshkent_shahar/bektemir", region: "toshkent_shahar", name_uz: "Bektemir", name_ru: "Бектемир", kind: "district", is_active: true },
      ],
    },
  ],
  cash: {
    date_from: "2026-10-01",
    date_to: "2026-10-31",
    collected_from_couriers: 0,
    outstanding: 0,
    outstanding_days: [],
    days: [],
    expected_to_logist: 0,
    by_filial: [],
    by_filial_totals: { cash_accepted: 0, handed_over: 0, to_hand_over: 0, delivered: 0, addresses: 0, fee: 0 },
    handovers: [],
  },
  orders: { count: 0, next: null, previous: null, results: [] },
  couriers: {
    results: [
      {
        id: 27,
        full_name: "Test Kuryer",
        phone: "998907701007",
        is_active: true,
        region: "toshkent_shahar",
        avatar: null,
        zone_ids: [],
        zones: [],
        filial: { id: 2, name: "Mehrigiyo Qo'qon" },
        today: { assigned: 0, delivered: 0, cod_total: 0, stops: 0, pay: 0, pay_rate: 70000 },
        load: 0,
        route_plan: null,
        has_account: true,
        on_shift: false,
        online: false,
      },
    ],
    count: 1,
  },
  zones: {
    zones: [
      {
        id: 1,
        region: "toshkent_shahar",
        name: "Mehrigiyo Toshkent",
        is_active: true,
        district_codes: ["toshkent_shahar/bektemir", "toshkent_shahar/chilonzor"],
        cash_point: { kind: "person", filial_id: null, user_id: 136, name: "Test Bosh Kuryer" },
        neighbor_zone_ids: [],
        couriers_count: 2,
      },
    ],
  },
  codHandovers: [],
  skladCouriers: [
    {
      id: 27,
      full_name: "Test Kuryer",
      phone: "998907701007",
      region: "toshkent_shahar",
      filial: { id: 2, name: "Mehrigiyo Qo'qon" },
      on_shift: false,
      has_app: true,
      location_id: 32,
      on_hand: 0,
      delivered_today: 0,
      delivered_7d: 0,
      last_load: null,
      last_sale_at: null,
      idle_days: null,
      items: [],
    },
  ],
  skladStock: {
    count: 2,
    next: null,
    previous: null,
    results: [
      {
        location: { id: 1, name: "Toshkent shahri ombori", kind: "region", region: "toshkent_shahar" },
        item: { id: 14, name: "Alatoo bals, 1 shisha", sku: "M-14", package_size: 9 },
        on_hand: 783,
        min_quantity: 50,
        is_low: false,
      },
      {
        location: { id: 1, name: "Toshkent shahri ombori", kind: "region", region: "toshkent_shahar" },
        item: { id: 4, name: "Amoksitsillin 500 mg", sku: "M-4", package_size: 1 },
        on_hand: 1195,
        min_quantity: 200,
        is_low: false,
      },
    ],
  },
};

describe("haqiqiy javoblar (test server, 2026-10-31)", () => {
  it("login — `role: chief_courier`, `account_kind: chief` (V2)", () => {
    const login = mapLoginResponse(LIVE.login);
    expect(login.user.role).toBe("chief_courier");
    expect(login.user.filialName).toBe("Mehrigiyo Qo'qon");
  });

  it("chief/me — K1 shakli: o'rin, viloyatlar, dopusklar, qisqacha", () => {
    const me = mapChiefMe(LIVE.me);
    expect(me.seat).toEqual({ id: 43, fullName: "Test Bosh Kuryer", username: "chief-test" });
    expect(me.regions).toEqual(["toshkent_shahar"]);
    expect(me.permissions["warehouse.view_courier_stores"]).toBe(true);
    expect(me.summary).toEqual({ incoming: 0, active: 0, couriers: 1, couriersOnShift: 0, finalizedToday: 0 });
  });

  it("chief/finance — `by_courier` nol sonlar bilan, hisobot bo'sh holatda (V13)", () => {
    const finance = mapChiefFinance(LIVE.finance);
    expect(finance.byFilial).toEqual([]);
    expect(finance.byCourier).toEqual([
      { courier: { id: 27, fullName: "Test Kuryer" }, delivered: 0, addresses: 0, cashWithCourier: 0, cashHanded: 0, products: [] },
    ]);
    expect(isEmptyReport(finance)).toBe(true);
  });

  it("chief/cash — topshiriladigan pul yo'q, muddat «topshirilgan»", () => {
    const cash = mapChiefCash(LIVE.cash);
    expect(cash).toMatchObject({ outstanding: 0, outstandingDays: [], byFilial: [], handovers: [] });
    expect(handoverTiming(cash.outstandingDays, new Date()).timing).toBe("settled");
  });

  it("chief/filials (V14) va auto-assign/preview — bo'sh reja (V5)", () => {
    expect(mapChiefFilials(LIVE.filials)).toEqual([
      { id: 2, name: "Mehrigiyo Qo'qon", isMain: true },
      { id: 1, name: "Mehrigiyo Toshkent", isMain: false },
      { id: 3, name: "Samarqand filiali", isMain: false },
    ]);
    expect(mapAutoAssignPreview(LIVE.preview)).toEqual([]);
  });

  it("chief/orders va cod/handovers — `page` bilan bo'sh sahifa", () => {
    expect(asPage(LIVE.orders)).toEqual({ items: [], hasMore: false, total: 0 });
    expect(asPage(LIVE.orders).items.map(mapCourierHandover)).toEqual([]);
  });

  it("chief/couriers — `cod_total` endi son (V19)", () => {
    const [courier] = mapChiefCouriers(LIVE.couriers);
    expect(courier).toMatchObject({ id: 27, fullName: "Test Kuryer", isActive: true, zoneIds: [], hasAccount: true });
    expect(courier!.today.codTotal).toBe(0);
  });

  it("chief/zones — kassa nuqtasi bosh kuryerning o'zi (V18); lug'at kodi zona kodiga mos", () => {
    const { zones } = mapChiefZones(LIVE.zones);
    expect(zones[0]!.cashPoint?.kind).toBe("person");
    const [region] = mapRegionsDictionary(LIVE.regions);
    expect(region!.districts[0]!.code).toBe(zones[0]!.districtCodes[0]);
  });

  it("sklad: me → `sklad_id` va viloyatlar, sklads — faqat o'zi, stock — sklad omborlari (V7/V8/V16)", () => {
    const me = mapSkladMe(LIVE.skladMe);
    expect(me).toEqual({ skladId: 2, regions: ["toshkent_shahar"], canWrite: false });
    expect(mapOwnSklad(LIVE.sklads, me.skladId)).toEqual({ id: 2, name: "Test Bosh Kuryer skladi", regions: ["toshkent_shahar"] });
    const couriers = asPage(LIVE.skladCouriers).items.map(mapCourierStock);
    expect(couriers[0]).toEqual({ courier: { id: 27, fullName: "Test Kuryer", onShift: false }, onHand: 0, items: [] });
    const rows = skladStockRows(asPage(LIVE.skladStock).items.map(mapStockCell), couriers);
    expect(rows.map((row) => [row.item.name, row.inSklad, row.withCouriers])).toEqual([
      ["Alatoo bals, 1 shisha", 783, 0],
      ["Amoksitsillin 500 mg", 1195, 0],
    ]);
  });
});

/** Ma'lumoti bor v2 bosh kuryer (Vodiy) — zakazlar, preview, moliya, kassa, sklad (tokensiz, qisqartirilgan). */
const VODIY = {
  me: {
    seat: { id: 61, full_name: "V2 Bosh kuryer (Vodiy)", username: "chief-vodiy" },
    filial: { id: 2, name: "Mehrigiyo Qo'qon" },
    regions: ["andijon", "fargona", "namangan"],
    permissions: { "orders.dispatch": true, "couriers.manage": true, "zones.manage": true, "cash.accept": true },
    summary: { incoming: 3, active: 5, couriers: 6, couriers_on_shift: 4, finalized_today: 1 },
  },
  incomingOrder: {
    id: "83fe45df-7939-4c7a-b1a8-5ecae6089bea",
    order_number: "ORD-20261030222510-8A90A517",
    status: "shipping",
    total_amount: "125000.00",
    payable_amount: "125000.00",
    item_count: 1,
    customer_notes: "",
    client: { full_name: "998907702037", phones: ["998907702037"], phone: "998907702037" },
    items: [
      {
        id: 1,
        is_gift: false,
        medicine: { id: 6, title: "Hapwell-3 (Majun Al-shifo)", image: "" },
        medicine_name: "Hapwell-3 (Majun Al-shifo)",
        quantity: 1,
        price: "250000.00",
        total: "125000.00",
        unit_price: "125000.00",
        original_price: "250000.00",
        discount_percent: 50,
      },
    ],
    payment_method: "cash",
    created_at: "2026-10-31T03:25:10.818776+05:00",
    courier: null,
    chief_courier: { id: 61, full_name: "V2 Bosh kuryer (Vodiy)" },
    courier_outcome: "none",
    delivery_stage: "unassigned",
    delivery: {
      region: "andijon",
      region_display: "Andijon",
      district: null,
      district_display: null,
      zone_id: null,
      zone_name: null,
      address_text: "V2 test manzil 15",
    },
  },
  history: [
    { at: "2026-10-10T18:25:01.357007+00:00", action: "delivered", actor: null, courier: "V2 kuryer 1" },
    { at: "2026-10-10T11:25:01.357007+00:00", action: "created", actor: null, courier: null },
  ],
  preview: {
    rows: [
      { order_id: "83fe45df-7939-4c7a-b1a8-5ecae6089bea", zone: null, courier: { id: 31, full_name: "V2 kuryer 4" }, reason: "ok" },
      { order_id: "e41b51f3", zone: { id: 2, name: "Mehrigiyo Qo'qon" }, courier: null, reason: "no_courier" },
    ],
  },
  couriers: {
    results: [
      {
        id: 31,
        full_name: "V2 kuryer 4",
        is_active: true,
        region: "andijon",
        zone_ids: [6],
        zones: [{ id: 6, name: "V2 Andijon markaz" }],
        today: { assigned: 0, delivered: 0, cod_total: 0 },
        load: 0,
        on_shift: true,
      },
      {
        id: 28,
        full_name: "V2 kuryer 1",
        is_active: true,
        region: "fargona",
        zone_ids: [3],
        zones: [{ id: 3, name: "V2 Qo'qon zonasi" }],
        today: { assigned: 1, delivered: 1, cod_total: 22222 },
        load: 1,
        on_shift: true,
      },
    ],
    count: 2,
  },
  finance: {
    date_from: "2026-10-01",
    date_to: "2026-10-31",
    by_filial: [
      { filial: { id: 2, name: "Mehrigiyo Qo'qon" }, cash_accepted: 1000, handed_over: 55000, to_hand_over: 0, delivered: 7, addresses: 8, fee: 80000 },
      { filial: { id: 1, name: "Mehrigiyo Toshkent" }, cash_accepted: 0, handed_over: 45000, to_hand_over: 0, delivered: 5, addresses: 6, fee: 60000 },
    ],
    totals: { cash_accepted: 1000, handed_over: 100000, to_hand_over: 0, delivered: 12, addresses: 14, fee: 140000 },
    by_courier: [
      {
        courier: { id: 28, full_name: "V2 kuryer 1" },
        delivered: 4,
        addresses: 5,
        cash_with_courier: 427222,
        cash_handed: 1000,
        by_product: [
          { item: { id: 15, name: "Propolis tomchi, 30 ml" }, qty: 3 },
          { item: { id: 11, name: "Qora sedana yog'i, 100 ml" }, qty: 3 },
        ],
      },
      {
        courier: { id: 30, full_name: "V2 kuryer 3" },
        delivered: 3,
        addresses: 3,
        cash_with_courier: 204444,
        cash_handed: 0,
        by_product: [{ item: { id: 11, name: "Qora sedana yog'i, 100 ml" }, qty: 1 }],
      },
    ],
  },
  cash: {
    date_from: "2026-10-01",
    date_to: "2026-10-31",
    collected_from_couriers: 1000,
    outstanding: 1000,
    outstanding_days: ["2026-10-30"],
    days: [{ date: "2026-10-30", collected: 1000, status: "none" }],
    expected_to_logist: 0,
    by_filial: [
      { filial: { id: 2, name: "Mehrigiyo Qo'qon" }, cash_accepted: 1000, handed_over: 55000, to_hand_over: 0, delivered: 7, addresses: 8, fee: 80000, oldest_day: null },
    ],
    handovers: [
      {
        id: 4,
        filial: { id: 2, name: "Mehrigiyo Qo'qon" },
        date: "2026-10-31",
        period_from: "2026-10-31",
        period_to: "2026-10-31",
        amount: 25000,
        expected_amount: 0,
        confirmed_amount: null,
        shortage: null,
        status: "pending",
        note: "",
        logist: null,
        created_at: "2026-10-30T22:15:54.705785+00:00",
      },
      {
        id: 2,
        filial: { id: 1, name: "Mehrigiyo Toshkent" },
        date: "2026-10-31",
        amount: 30000,
        expected_amount: 0,
        confirmed_amount: 15000,
        shortage: 15000,
        status: "disputed",
        logist_note: "kamomad (seed)",
        logist: { id: 48, full_name: "V2 Oddiy logist (kassa dopuski)" },
        created_at: "2026-10-30T22:15:54.679844+00:00",
      },
    ],
  },
  codHandovers: {
    count: 2,
    next: null,
    previous: null,
    results: [
      {
        courier: { id: 28, full_name: "V2 kuryer 1" },
        date: "2026-10-30",
        status: "confirmed",
        amount: 1000,
        confirmed_amount: 1000,
        note: null,
        by_filial: [{ amount: 1000, orders: 1, filial_id: 2, filial_name: "Mehrigiyo Qo'qon" }],
      },
      {
        courier: { id: 29, full_name: "V2 kuryer 2" },
        date: "2026-10-26",
        status: "pending",
        amount: 150000,
        confirmed_amount: null,
        note: "eski e'lon",
        by_filial: [],
      },
    ],
  },
  courierCodToday: {
    orders: [{ id: "d32207ba", order_number: "ORD-20261030222513-A688B3ED", total_amount: "22222.00" }],
    total: "22222.00",
    settled: false,
  },
  skladMe: { role: "chief_courier", filial_id: 2, region: "fargona", regions: ["fargona", "namangan", "andijon"], sklad_id: 1, can_write: false },
  sklads: [
    { id: 1, name: "V2 Bosh kuryer (Vodiy) skladi", regions: ["fargona", "namangan", "andijon"], is_active: true, chief: { id: 61 } },
  ],
  stock: {
    count: 55,
    next: "https://example/api/sklad/stock/?page=2",
    previous: null,
    results: [
      {
        location: { id: 3, name: "Andijon ombori", kind: "region", region: "andijon" },
        item: { id: 4, name: "Amoksitsillin 500 mg", sku: "M-4" },
        on_hand: 0,
        min_quantity: 50,
        is_low: true,
      },
      {
        location: { id: 33, name: "Kuryer · V2 kuryer 1", kind: "courier", region: "fargona" },
        item: { id: 4, name: "Amoksitsillin 500 mg", sku: "M-4" },
        on_hand: 8,
        min_quantity: 0,
        is_low: true,
      },
    ],
  },
  skladCouriers: [
    {
      id: 28,
      full_name: "V2 kuryer 1",
      on_shift: true,
      on_hand: 22,
      items: [
        { item: { id: 4, name: "Amoksitsillin 500 mg", sku: "M-4", package_size: 1 }, quantity: 8 },
        { item: { id: 3, name: "Ibuprofen 400 mg", sku: "M-3", package_size: 1 }, quantity: 6 },
      ],
    },
  ],
};

describe("ma'lumoti bor bosh kuryer (Vodiy, test server)", () => {
  it("me — uch viloyat va qisqacha", () => {
    const me = mapChiefMe(VODIY.me);
    expect(me.regions).toEqual(["andijon", "fargona", "namangan"]);
    expect(me.summary).toMatchObject({ incoming: 3, active: 5, couriersOnShift: 4 });
  });

  it("zakaz — chegirmali qator, kartadagi mahsulot, ochiq holat; `filial` va zona javobda yo'q", () => {
    const order = mapLogistOrder(VODIY.incomingOrder);
    expect(order.items[0]).toMatchObject({ name: "Hapwell-3 (Majun Al-shifo)", quantity: 1, price: 125000, serverUnitPrice: 125000 });
    expect(order.payableAmount).toBe(125000);
    expect(orderProductsLine(order)).toBe("Hapwell-3 (Majun Al-shifo) × 1");
    expect(isOpenOrder(order)).toBe(true);
    expect(order.paymentMethod).toBe("cash");
    expect(order.filial).toBeNull();
    expect(order.zoning.zoneId).toBeNull();
    expect(formatDeliveryAddress(order)).toContain("V2 test manzil 15");
  });

  it("detal tarixi — yangisi birinchi", () => {
    const detail = mapChiefOrderDetail({ ...VODIY.incomingOrder, history: VODIY.history });
    expect(detail.history.map((entry) => entry.action)).toEqual(["delivered", "created"]);
    expect(detail.history[0]!.courier).toBe("V2 kuryer 1");
  });

  it("preview — `ok` + `zone: null` + kuryer: «zonasi topilmadi» emas, kuryer tanlovda bor", () => {
    const couriers = mapChiefCouriers(VODIY.couriers);
    const plan = planFromPreview(mapAutoAssignPreview(VODIY.preview), [
      mapLogistOrder(VODIY.incomingOrder),
      mapLogistOrder({ id: "e41b51f3", status: "shipping" }),
    ]);
    const [withCourier, noCourier] = plan;
    expect(withCourier).toMatchObject({ zoneId: null, courierId: 31, reason: "ok" });
    expect(readyRows(plan).map((row) => row.order.id)).toEqual([VODIY.incomingOrder.id]);
    expect(courierOptions(couriers, withCourier!).map((courier) => courier.id)).toContain(31);
    expect(noCourier).toMatchObject({ zoneId: 2, courierId: null, reason: "no_courier" });
  });

  it("moliya — filial, kuryer va mahsulot kesimi", () => {
    const finance = mapChiefFinance(VODIY.finance);
    expect(finance.byFilial.map((row) => row.fee)).toEqual([80000, 60000]);
    expect(finance.byCourier[0]).toMatchObject({ cashWithCourier: 427222, cashHanded: 1000 });
    expect(productTotals(finance.byCourier)[0]).toEqual({ item: { id: 11, name: "Qora sedana yog'i, 100 ml", image: null }, quantity: 4 });
    expect(isEmptyReport(finance)).toBe(false);
  });

  it("kassa — topshiriqlar holati va kamomad, `oldest_day: null`", () => {
    const cash = mapChiefCash(VODIY.cash);
    expect(cash.handovers.map((row) => [row.status, row.shortage])).toEqual([
      ["pending", null],
      ["disputed", 15000],
    ]);
    expect(cash.handovers[1]!.logistName).toBe("V2 Oddiy logist (kassa dopuski)");
    expect(cash.byFilial[0]!.oldestDay).toBeNull();
    expect(handoverTiming(cash.outstandingDays, new Date(2026, 9, 31)).timing).toBe("on_time");
  });

  it("1-pog'ona — e'lonlar `by_filial` bilan; eski `pending` — muddati o'tgan", () => {
    const rows = asPage(VODIY.codHandovers).items.map(mapCourierHandover);
    expect(rows[0]).toMatchObject({ status: "confirmed", confirmedAmount: 1000, byFilial: [{ filialId: 2, filialName: "Mehrigiyo Qo'qon", amount: 1000 }] });
    expect(courierHandoverView(rows[1]!, new Date(2026, 9, 31))).toBe("overdue");
  });

  it("kuryer naqdi — sanasiz bir kunlik shakl ham o'qiladi (`total_amount` satr)", () => {
    const cod = mapCourierCod(VODIY.courierCodToday, "2026-10-31");
    expect(cod.days).toEqual([
      {
        date: "2026-10-31",
        orders: [{ id: "d32207ba", orderNumber: "ORD-20261030222513-A688B3ED", amount: 22222 }],
        amount: 22222,
        settled: false,
        declared: false,
      },
    ]);
    expect(cod.outstandingTotal).toBe(22222);
  });

  it("sklad — o'z skladi, sahifali qoldiq (`next` bor), kuryer ombori", () => {
    const me = mapSkladMe(VODIY.skladMe);
    expect(me).toEqual({ skladId: 1, regions: ["fargona", "namangan", "andijon"], canWrite: false });
    expect(mapOwnSklad(VODIY.sklads, me.skladId)?.name).toBe("V2 Bosh kuryer (Vodiy) skladi");
    expect(asPage(VODIY.stock).hasMore).toBe(true);
    const couriers = asPage(VODIY.skladCouriers).items.map(mapCourierStock);
    const rows = skladStockRows(asPage(VODIY.stock).items.map(mapStockCell), couriers);
    expect(rows).toEqual([{ item: { id: 4, name: "Amoksitsillin 500 mg", image: null }, inSklad: 0, withCouriers: 8, isLow: true }]);
  });
});
