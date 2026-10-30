import { describe, expect, it } from "vitest";

import { buildOrdersQuery, canonicalStatuses } from "./api";

import {
  ORDER_STATUSES,
  deliveryDateTone,
  describeChange,
  mapLogistOrder,
  normalizeStatus,
  paymentView,
} from "./types";

/** `02_DOMAIN_MODEL` §5 — to'liq buyurtma (yangi kontrakt). */
const FULL_ORDER = {
  id: "uuid-1",
  order_number: "DA-184032",
  status: "confirmed",
  pending_reason: null,
  confirmation: {
    required: true,
    confirmed_at: "2026-09-28T10:12:00Z",
    confirmed_by: "client",
    channel: "app_slide",
  },
  payment: {
    method: "cash",
    status: "cod_pending",
    provider: null,
    transaction_id: null,
    paid_at: null,
    paid_amount: 0,
  },
  cancel: null,
  client: {
    user_id: 5501,
    full_name: "Shuxrat aka",
    phones: ["+998940603906", "+998901112233"],
    ordered_for_phone: "+998940603906",
    has_app: true,
  },
  created_by: {
    kind: "operator",
    id: 7,
    name: "Muhammadjon Xaydarov",
    phone: "+998900000007",
  },
  on_behalf_of: null,
  responsible_operator: { id: 7, name: "Muhammadjon Xaydarov", phone: "+998900000007" },
  doctor: null,
  source: "operator",
  items: [
    {
      id: 1,
      product_id: 55,
      name: "Rayhon krem",
      quantity: 2,
      unit_price: 300000,
      price: 600000,
      is_gift: false,
    },
  ],
  extra_product_note: "",
  gift_comment: "krem 1ta",
  box_count: 1,
  total_amount: 600000,
  payable_amount: 550000,
  points_used: 500,
  points_discount: 50000,
  delivery: {
    region: "samarqand",
    region_display: "Samarqand viloyati",
    address_text: "Ishtixon tumani, Mitan",
    lat: null,
    lng: null,
    delivery_date: "2026-09-29",
    delivery_window: "morning",
    contact_name: "Shuxrat",
    contact_phone: "+998940603906",
    note: "Domofon 12",
    courier: { id: 4, full_name: "Aziz", phone: "+998911111111" },
    scheduled_at: "2026-09-29",
    delivered_at: null,
    attempts: [],
  },
  customer_notes: "Ertalab",
  logist_note: "",
  tags: ["urgent"],
  transfer: null,
  filial: { id: 1, name: "Toshkent" },
  created_at: "2026-09-28T09:00:00Z",
  confirmed_at: "2026-09-28T10:12:00Z",
  shipped_at: null,
};

describe("normalizeStatus", () => {
  it("kanonik 5 qiymatni o'zgartirmaydi", () => {
    for (const status of ORDER_STATUSES) {
      expect(normalizeStatus(status.value)).toBe(status.value);
    }
  });

  it("eski qiymatlarni 02 §2.1 migratsiyasi bo'yicha xaritalaydi", () => {
    expect(normalizeStatus("confirming")).toBe("pending");
    expect(normalizeStatus("paid")).toBe("confirmed");
    expect(normalizeStatus("preparing")).toBe("confirmed");
  });

  it("noma'lum qiymat `pending` EMAS — `unknown`", () => {
    expect(normalizeStatus("shipped")).toBe("unknown");
    expect(normalizeStatus("")).toBe("unknown");
  });

  it("katta-kichik harf va bo'shliqqa chidamli", () => {
    expect(normalizeStatus(" Confirmed ")).toBe("confirmed");
  });
});

describe("mapLogistOrder — yangi kontrakt (02 §5)", () => {
  const order = mapLogistOrder(FULL_ORDER);

  it("statusni normalizatsiya qiladi va yorliqni mahalliy manbadan oladi", () => {
    expect(order.status).toBe("confirmed");
    expect(order.statusDisplay).toBe("Tasdiqlangan");
  });

  it("mijoz: barcha telefonlar, asosiy raqam birinchi, ilova belgisi", () => {
    expect(order.client.phone).toBe("+998940603906");
    expect(order.client.phones).toEqual(["+998940603906", "+998901112233"]);
    expect(order.client.hasApp).toBe(true);
    expect(order.client.orderedForPhone).toBe("+998940603906");
    expect(order.client.userId).toBe(5501);
  });

  it("yaratuvchi, mas'ul operator, tasdiq va to'lov", () => {
    expect(order.createdBy).toEqual({
      kind: "operator",
      id: 7,
      name: "Muhammadjon Xaydarov",
      phone: "+998900000007",
    });
    expect(order.responsibleOperator?.name).toBe("Muhammadjon Xaydarov");
    expect(order.confirmation?.channel).toBe("app_slide");
    expect(order.confirmation?.confirmedBy).toBe("client");
    expect(order.confirmation?.confirmedAt).toBeInstanceOf(Date);
    expect(order.paymentMethod).toBe("cash");
    expect(order.paymentStatus).toBe("cod_pending");
  });

  it("yetkazish bloki `delivery {...}` ichidan o'qiladi", () => {
    expect(order.deliveryInfo?.address).toBe("Ishtixon tumani, Mitan");
    expect(order.deliveryInfo?.regionDisplay).toBe("Samarqand viloyati");
    expect(order.deliveryInfo?.contactPhone).toBe("+998940603906");
    expect(order.deliveryDate).toBe("2026-09-29");
    expect(order.deliveryWindow).toBe("morning");
    expect(order.courier?.id).toBe(4);
    expect(order.deliveryScheduledAt).toBe("2026-09-29");
  });

  it("Bitrix maydonlari va filial", () => {
    expect(order.boxCount).toBe(1);
    expect(order.giftComment).toBe("krem 1ta");
    expect(order.extraProductNote).toBeNull();
    expect(order.filial).toEqual({ id: 1, name: "Toshkent" });
    expect(order.payableAmount).toBe(550000);
    expect(order.confirmedAt).toBeInstanceOf(Date);
    expect(order.shippedAt).toBeNull();
  });

  it("bekor ma'lumoti va pending sababi", () => {
    const cancelled = mapLogistOrder({
      ...FULL_ORDER,
      status: "cancelled",
      cancel: {
        reason: "client_refused",
        note: "Boshqa joydan oldi",
        by: { id: 9, name: "Logist" },
        at: "2026-09-28T12:00:00Z",
      },
    });
    expect(cancelled.cancel?.reason).toBe("client_refused");
    expect(cancelled.cancel?.by).toBe("Logist");

    const pending = mapLogistOrder({
      ...FULL_ORDER,
      status: "pending",
      pending_reason: "awaiting_online_payment",
    });
    expect(pending.pendingReason).toBe("awaiting_online_payment");
    expect(
      mapLogistOrder({ ...FULL_ORDER, pending_reason: "whatever" }).pendingReason,
    ).toBeNull();
  });
});

describe("mapLogistOrder — eski javob (backend hali chiqmagan)", () => {
  const legacy = mapLogistOrder({
    id: "uuid-2",
    order_number: "DA-1",
    status: "preparing",
    status_display: "Tayyorlanmoqda",
    total_amount: 100000,
    client: { phone: "+998901234567", full_name: "Test" },
    delivery_info: { address: "Toshkent", region: "toshkent_shahar" },
    items: [],
  });

  it("eski status kanonikka o'tadi, eski yorliq tashlanadi", () => {
    expect(legacy.status).toBe("confirmed");
    expect(legacy.statusDisplay).toBe("Tasdiqlangan");
  });

  it("yangi maydonlar `null`/bo'sh — taxmin yo'q", () => {
    expect(legacy.client.phones).toEqual(["+998901234567"]);
    expect(legacy.client.hasApp).toBeNull();
    expect(legacy.createdBy).toBeNull();
    expect(legacy.confirmation).toBeNull();
    expect(legacy.cancel).toBeNull();
    expect(legacy.pendingReason).toBeNull();
    expect(legacy.boxCount).toBeNull();
    expect(legacy.deliveryDate).toBeNull();
    expect(legacy.filial).toBeNull();
    expect(legacy.deliveryInfo?.address).toBe("Toshkent");
    expect(legacy.payableAmount).toBe(100000);
  });

  it("noma'lum status `unknown` bo'lib, yorliq 'Noma'lum' chiqadi", () => {
    const unknown = mapLogistOrder({ id: "x", status: "weird" });
    expect(unknown.status).toBe("unknown");
    expect(unknown.statusDisplay).toBe("Noma'lum");
  });
});

describe("paymentView — yangi `payment.status` enum (02 §2.2)", () => {
  const base = {
    isPaid: null,
    paidAt: null,
    paidAmount: null,
    paymentMethod: "cash",
    payableAmount: 100000,
  };

  it("cod_pending → naqd, olganda", () => {
    const view = paymentView({ ...base, paymentStatus: "cod_pending" });
    expect(view.state).toBe("cod");
    expect(view.label).toBe("Naqd · olganda");
    expect(view.needsAttention).toBe(false);
  });

  it("online_pending → e'tibor talab qiladi", () => {
    const view = paymentView({
      ...base,
      paymentMethod: "click",
      paymentStatus: "online_pending",
    });
    expect(view.label).toBe("Onlayn kutilmoqda");
    expect(view.needsAttention).toBe(true);
  });

  it("paid / refunded eski mantiq bilan bir xil", () => {
    expect(paymentView({ ...base, paymentStatus: "paid" }).state).toBe("paid");
    expect(paymentView({ ...base, paymentStatus: "refunded" }).state).toBe(
      "refunded",
    );
    expect(
      paymentView({ ...base, paymentStatus: "partially_refunded" }).label,
    ).toBe("Qisman qaytarilgan");
  });
});

describe("deliveryDateTone", () => {
  const now = new Date(2026, 8, 29, 12, 0, 0);

  it("bugun — today, o'tgan va yetkazilmagan — overdue", () => {
    expect(
      deliveryDateTone({ status: "confirmed", deliveryDate: "2026-09-29" }, now),
    ).toBe("today");
    expect(
      deliveryDateTone({ status: "shipping", deliveryDate: "2026-09-28" }, now),
    ).toBe("overdue");
    expect(
      deliveryDateTone({ status: "confirmed", deliveryDate: "2026-10-01" }, now),
    ).toBe("upcoming");
  });

  it("yakunlangan buyurtmada o'tgan sana qizil emas; sana yo'q — null", () => {
    expect(
      deliveryDateTone({ status: "delivered", deliveryDate: "2026-09-20" }, now),
    ).toBe("upcoming");
    expect(deliveryDateTone({ status: "confirmed", deliveryDate: null }, now)).toBeNull();
  });
});

describe("describeChange — yangi maydonlar", () => {
  it("cancel_reason va revert_reason yorliq bilan", () => {
    expect(describeChange("cancel_reason", { from: null, to: "no_answer" })).toEqual({
      label: "Bekor sababi",
      from: "—",
      to: "Javob bermadi",
    });
    expect(describeChange("revert_reason", { from: null, to: "mistake" }).to).toBe(
      "Xato bosildi",
    );
  });

  it("status eski qiymat bilan kelsa ham kanonik yorliq", () => {
    expect(describeChange("status", { from: "preparing", to: "shipping" })).toEqual({
      label: "Status",
      from: "Tasdiqlangan",
      to: "Yo'lga chiqarilgan",
    });
  });

  it("payment_status yangi enum yorlig'i", () => {
    expect(
      describeChange("payment_status", { from: "not_selected", to: "cod_pending" }),
    ).toEqual({
      label: "To'lov holati",
      from: "To'lov usuli tanlanmagan",
      to: "Naqd · olganda",
    });
  });
});

describe("2026-10-01 — statuslar 5 ta, pul qoidalari", () => {
  it("yopiq to'plam statusida mahalliy yorliq ustun (`uz-Cyrl` kaliti ham keladi)", () => {
    const order = mapLogistOrder({
      id: "o1",
      order_number: "ORD-1",
      status: "shipping",
      status_display: { uz: "Yetkazilmoqda", ru: "В пути", "uz-Cyrl": "Етказилмоқда", uz_kr: "Етказилмоқда" },
    });
    expect(order.statusDisplay).toBe("Yo'lga chiqarilgan");
  });

  it("filtrdagi eski statuslar o'rinbosariga o'giriladi (`400 status_deprecated` bo'lmasin)", () => {
    expect(canonicalStatuses(["preparing", "paid", "delivered", "confirming", "x"])).toEqual([
      "confirmed",
      "delivered",
    ]);
    expect(buildOrdersQuery({ statuses: ["preparing"] }).status).toBe("confirmed");
  });

  it("`is_paid` faqat `payment.status == paid` dan (§9.1)", () => {
    const order = mapLogistOrder({
      id: "o1",
      status: "confirmed",
      is_paid: true,
      payment: { method: "cash", status: "cod_pending" },
    });
    expect(order.isPaid).toBe(false);
    expect(paymentView(order).state).toBe("cod");
  });

  it("bekor qilingan + `paid` yoki `partially_refunded` — qaytarilishi kerak (§9.4)", () => {
    for (const status of ["paid", "partially_refunded"]) {
      const order = mapLogistOrder({ id: "o1", status: "cancelled", payment: { method: "card", status } });
      expect(paymentView(order).state).toBe("refund_due");
    }
  });

  it("`confirmed_at` yo'q bo'lsa `confirmation.confirmed_at` dan", () => {
    const order = mapLogistOrder({
      id: "o1",
      status: "confirmed",
      confirmation: { confirmed_at: "2026-10-01T09:22:00+00:00" },
    });
    expect(order.confirmedAt?.toISOString()).toBe("2026-10-01T09:22:00.000Z");
  });
});
