import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mapRegionsDictionary } from "@/features/zones/types";
import { queryKeys } from "@/lib/query-keys";

import { mapOrdersBoard } from "./board";
import type { OrdersBoard } from "./board";
import { applyPaymentStatus, mergeOrderSnapshot, withDistrictDisplay } from "./order-snapshot";
import { REFRESH_COALESCE_MS, applyOrderEvent, boardAcceptsNewOrder, eventActor } from "./realtime";
import { mapLogistOrder } from "./types";
import type { LogistOrder } from "./types";

const FULL = {
  id: "o1",
  order_number: "MH-1",
  status: "confirmed",
  total_amount: 250000,
  payable_amount: 200000,
  client: { full_name: "Aziza", phone: "998901234567" },
  items: [{ id: "i1", medicine_name: "Omega", quantity: 2, price: 100000 }],
  payment_method: "click",
  payment: { method: "click", status: "online_pending", is_paid: false },
};

/** `order_status_changed.order` — qisqa karta (§5.4). */
const SHORT_CARD = {
  id: "o1",
  order_number: "MH-1",
  status: "shipping",
  payment: { method: "click", status: "paid", provider: "click", paid_at: null, is_paid: true },
  lock: { operator_editable: true, reason: null },
  responsible_operator: null,
  filial: { id: 1, name: "Chilonzor" },
};

const KEY = ["orders", "board", "logist", {}];

function setup(status = "confirmed") {
  const client = new QueryClient();
  const board = mapOrdersBoard(
    {
      columns: [
        { status: "confirmed", count: status === "confirmed" ? 1 : 0, orders: status === "confirmed" ? [FULL] : [] },
        { status: "shipping", count: status === "shipping" ? 1 : 0, orders: status === "shipping" ? [{ ...FULL, status: "shipping" }] : [] },
      ],
    },
    mapLogistOrder,
  );
  client.setQueryData(KEY, board);
  const invalidate = vi.spyOn(client, "invalidateQueries");
  return { client, invalidate };
}

function cardOf(client: QueryClient, status: string): LogistOrder | undefined {
  const board = client.getQueryData<OrdersBoard<LogistOrder>>(KEY);
  return board?.columns.find((column) => column.status === status)?.orders[0];
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("mergeOrderSnapshot", () => {
  const order = mapLogistOrder(FULL);

  it("qisqa karta mijoz, tarkib va summani o'chirmaydi", () => {
    const merged = mergeOrderSnapshot(order, SHORT_CARD);
    expect(merged.client.fullName).toBe("Aziza");
    expect(merged.items).toHaveLength(1);
    expect(merged.payableAmount).toBe(200000);
    expect(merged.paymentStatus).toBe("paid");
    expect(merged.isPaid).toBe(true);
  });

  it("responsible_operator: null — eskisi saqlanadi (hisoblanmagan)", () => {
    const withOperator = { ...order, responsibleOperator: { id: 7, name: "Aziz", phone: null } };
    expect(mergeOrderSnapshot(withOperator, SHORT_CARD).responsibleOperator?.name).toBe("Aziz");
  });

  it("to'liq buyurtma kelsa to'liq o'qiladi", () => {
    const merged = mergeOrderSnapshot(order, { ...FULL, client: { full_name: "Yangi" } });
    expect(merged.client.fullName).toBe("Yangi");
  });

  it("applyPaymentStatus: to'lov holati va is_paid birga", () => {
    const next = applyPaymentStatus(order, "paid");
    expect(next.paymentStatus).toBe("paid");
    expect(next.isPaid).toBe(true);
    expect(applyPaymentStatus(order, null)).toBe(order);
  });
});

describe("applyOrderEvent", () => {
  it("order_status_changed: kartochka ko'chadi, maydonlari saqlanadi", () => {
    const { client } = setup();
    applyOrderEvent(client, "order_status_changed", {
      type: "order_status_changed",
      order_id: "o1",
      from_status: "confirmed",
      to_status: "shipping",
      changed_by: "Aziz",
      order: SHORT_CARD,
    });
    const card = cardOf(client, "shipping");
    expect(card?.client.fullName).toBe("Aziza");
    expect(card?.paymentStatus).toBe("paid");
    expect(cardOf(client, "confirmed")).toBeUndefined();
  });

  it("o'z o'zgarishimizning aks-sadosi doskani qayta so'ratmaydi", () => {
    const { client, invalidate } = setup("shipping");
    applyOrderEvent(client, "order_status_changed", {
      order_id: "o1",
      to_status: "shipping",
      order: SHORT_CARD,
    });
    vi.advanceTimersByTime(REFRESH_COALESCE_MS + 1);
    const boardCalls = invalidate.mock.calls.filter(
      ([filters]) => JSON.stringify(filters?.queryKey) === JSON.stringify(KEY),
    );
    expect(boardCalls).toHaveLength(0);
  });

  it("bir to'lqindagi hodisalar bitta doska so'rovi bo'ladi", () => {
    const { client, invalidate } = setup();
    applyOrderEvent(client, "order_status_changed", { order_id: "o1", to_status: "shipping" });
    applyOrderEvent(client, "order_confirmed", { order_id: "o1", status: "shipping", by: "client" });
    applyOrderEvent(client, "order_payment_changed", {
      order_id: "o1",
      from_status: "online_pending",
      to_status: "paid",
    });
    expect(invalidate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(REFRESH_COALESCE_MS + 1);
    const boardCalls = invalidate.mock.calls.filter(
      ([filters]) => JSON.stringify(filters?.queryKey) === JSON.stringify(KEY),
    );
    expect(boardCalls).toHaveLength(1);
  });

  it("order_payment_changed: to_status — to'lov holati, status emas", () => {
    const { client } = setup();
    applyOrderEvent(client, "order_payment_changed", {
      order_id: "o1",
      from_status: "online_pending",
      to_status: "paid",
    });
    const card = cardOf(client, "confirmed");
    expect(card?.status).toBe("confirmed");
    expect(card?.paymentStatus).toBe("paid");
    expect(card?.isPaid).toBe(true);
  });

  it("`pending` buyurtma logist doskasiga tushmaydi", () => {
    const client = new QueryClient();
    client.setQueryData(
      KEY,
      mapOrdersBoard(
        { columns: [{ status: "pending", count: 1, orders: [{ ...FULL, status: "pending" }] }] },
        mapLogistOrder,
      ),
    );
    applyOrderEvent(client, "order_confirmed", {
      order_id: "o1",
      status: "pending",
      payment_status: "online_pending",
      payment_method: "payme",
    });
    expect(cardOf(client, "pending")).toBeUndefined();
  });

  it("noma'lum status doskani buzmaydi", () => {
    const { client } = setup();
    applyOrderEvent(client, "order_status_changed", { order_id: "o1", to_status: "teleported" });
    expect(cardOf(client, "confirmed")?.id).toBe("o1");
  });
});

describe("eventActor", () => {
  it("changed_by_info.name ustun, keyin changed_by satri", () => {
    expect(
      eventActor({ changed_by: "operator", changed_by_info: { type: "operator", id: 7, name: "Aziz" } }),
    ).toBe("Aziz");
    expect(eventActor({ changed_by: "Aziz" })).toBe("Aziz");
  });

  it("changed_by null (webhook) — null, [object Object] emas", () => {
    expect(eventActor({ changed_by: null })).toBeNull();
    expect(eventActor({ changed_by: { id: 1 } })).toBeNull();
  });

  it("order_confirmed.by — tur, o'qiladigan nom", () => {
    expect(eventActor({ by: "client" })).toBe("Mijoz ilovada");
  });
});

describe("order_created — yangi buyurtma doska tepasiga", () => {
  const NEW = { ...FULL, id: "o2", order_number: "MH-2", created_at: "2026-10-01T12:00:00Z" };

  it("to'liq karta kelsa ustunning eng tepasiga qo'yiladi va doska baribir tasdiqlanadi", () => {
    const { client, invalidate } = setup();
    applyOrderEvent(client, "order_created", { type: "order_created", order_id: "o2", order: NEW });
    expect(cardOf(client, "confirmed")?.id).toBe("o2");
    const board = client.getQueryData<OrdersBoard<LogistOrder>>(KEY);
    expect(board?.columns.find((column) => column.status === "confirmed")?.count).toBe(2);
    vi.advanceTimersByTime(REFRESH_COALESCE_MS);
    expect(invalidate).toHaveBeenCalled();
  });

  it("qisqa hodisa (faqat id) — joyida yasalmaydi, faqat qayta olinadi", () => {
    const { client, invalidate } = setup();
    applyOrderEvent(client, "order_created", { type: "order_created", order_id: "o2", status: "confirmed" });
    expect(cardOf(client, "confirmed")?.id).toBe("o1");
    vi.advanceTimersByTime(REFRESH_COALESCE_MS);
    expect(invalidate).toHaveBeenCalled();
  });

  it("toraytirilgan doskaga (qidiruv, kuryer…) qo'yilmaydi", () => {
    expect(boardAcceptsNewOrder({ period: "all", search: "", paymentMethods: [] })).toBe(true);
    expect(boardAcceptsNewOrder({ period: "today", search: "Aziz" })).toBe(false);
    expect(boardAcceptsNewOrder({ courierId: 3 })).toBe(false);
    expect(boardAcceptsNewOrder({ dateTo: "2026-09-01" })).toBe(false);
    expect(boardAcceptsNewOrder(undefined)).toBe(false);
  });
});

describe("2026-10-01 §6 — WS hodisalari (backend misollari)", () => {
  it("order_status_changed: `order.created_at` va `confirmation` yamaladi, WS da `name: null` ism o'chirmaydi", () => {
    const { client } = setup("confirmed");
    applyOrderEvent(client, "order_confirmed", {
      type: "order_confirmed",
      order_id: "o1",
      status: "confirmed",
      confirmed_at: "2026-10-01T09:22:00+00:00",
      order: {
        ...FULL,
        confirmation: {
          confirmed_by: "logist",
          channel: "crm_force",
          channel_code: "crm_force",
          confirmed_by_party: { type: "logist", id: 5, name: "Aziz Karimov" },
          confirmed_at: "2026-10-01T09:22:00+00:00",
        },
        acknowledged_by: [],
      },
    });
    expect(cardOf(client, "confirmed")?.confirmation?.confirmer?.name).toBe("Aziz Karimov");
    expect(cardOf(client, "confirmed")?.confirmedAt?.toISOString()).toBe("2026-10-01T09:22:00.000Z");

    applyOrderEvent(client, "order_status_changed", {
      type: "order_status_changed",
      order_id: "o1",
      order_number: "MH-1",
      from_status: "pending",
      to_status: "confirmed",
      changed_by: "logist",
      changed_by_info: { type: "logist", id: 5, name: "Aziz Karimov" },
      reason: "client_confirmed_by_phone",
      payment_method: "cash",
      is_paid: false,
      order: {
        id: "o1",
        order_number: "MH-1",
        status: "confirmed",
        created_at: "2026-10-01T09:12:00+00:00",
        payment: { method: "cash", status: "cod_pending", provider: "cash", paid_at: null, is_paid: false },
        confirmation: {
          confirmed_by: "logist",
          channel: "crm_force",
          channel_code: "crm_force",
          confirmed_by_party: { type: "logist", id: 5, name: null },
          confirmed_at: "2026-10-01T09:22:00+00:00",
        },
        responsible_operator: null,
        filial: { id: 1, name: "Toshkent" },
      },
    });
    const card = cardOf(client, "confirmed");
    expect(card?.createdAt?.toISOString()).toBe("2026-10-01T09:12:00.000Z");
    expect(card?.confirmation?.confirmer).toEqual({ type: "logist", id: 5, name: "Aziz Karimov" });
    expect(card?.paymentMethod).toBe("cash");
    expect(card?.paymentStatus).toBe("cod_pending");
    // Qisqa karta mijoz va tarkibni o'chirmaydi.
    expect(card?.items).toHaveLength(1);
  });

  it("order_acknowledged: karta refetchsiz yamaladi; olib tashlashda ro'yxat bo'shaydi", () => {
    const { client, invalidate } = setup();
    const ack = { id: 5, name: "Aziz Karimov", at: "2026-10-01T09:32:00+00:00", is_system: false };
    applyOrderEvent(client, "order_acknowledged", {
      type: "order_acknowledged",
      order_id: "o1",
      acknowledged_by: [ack],
      by: ack,
    });
    expect(cardOf(client, "confirmed")?.acknowledgedBy?.[0]).toMatchObject({ userId: "5", isSystem: false });
    applyOrderEvent(client, "order_acknowledged", {
      type: "order_acknowledged",
      order_id: "o1",
      acknowledged_by: [],
      by: { ...ack, at: null },
    });
    expect(cardOf(client, "confirmed")?.acknowledgedBy).toEqual([]);
    vi.advanceTimersByTime(REFRESH_COALESCE_MS);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("order_created to'liq karta bilan: qo'yilgan doska qayta so'ralmaydi", () => {
    const { client, invalidate } = setup();
    applyOrderEvent(client, "order_created", {
      type: "order_created",
      order_id: "o2",
      order_number: "ORD-20261001-953A504E",
      status: "confirmed",
      order: { ...FULL, id: "o2", created_at: "2026-10-01T12:00:00Z", acknowledged_by: [] },
    });
    expect(cardOf(client, "confirmed")?.id).toBe("o2");
    vi.advanceTimersByTime(REFRESH_COALESCE_MS);
    expect(invalidate).not.toHaveBeenCalledWith(expect.objectContaining({ queryKey: KEY, exact: true }));
  });
});

describe("2026-10-01 C §9.1 — `changed_at` va vaqt maydonlari", () => {
  /** Hujjatdagi misol (§9.1) — `payment`/`lock`/`confirmation` qisqartirilgan. */
  const DOC_EVENT = {
    type: "order_status_changed",
    order_id: "o1",
    order_number: "ORD-20261001143022-A7F3B9C1",
    from_status: "confirmed",
    to_status: "shipping",
    changed_by: "Aziz Qoraboyev",
    changed_by_info: { type: "operator", id: 14, name: "Aziz Qoraboyev" },
    reason: null,
    payment_method: "cash",
    is_paid: false,
    changed_at: "2026-10-01T09:22:48.100213+05:00",
    order: {
      id: "o1",
      order_number: "ORD-20261001143022-A7F3B9C1",
      status: "shipping",
      created_at: "2026-09-30T11:04:17.512340+05:00",
      status_changed_at: "2026-10-01T09:22:48.100213+05:00",
      updated_at: "2026-10-01T09:22:48.100213+05:00",
      shipped_at: "2026-10-01T09:22:48.100213+05:00",
      delivered_at: null,
      pinned_at: null,
      responsible_operator: null,
      filial: { id: 1, name: "Toshkent" },
    },
  };

  it("karta ko'chadi, vaqt SERVERDAN (`changed_at`), doska qayta so'ralmaydi", () => {
    const { client, invalidate } = setup();
    applyOrderEvent(client, "order_status_changed", DOC_EVENT);
    vi.advanceTimersByTime(REFRESH_COALESCE_MS + 1);

    const card = cardOf(client, "shipping");
    expect(card?.statusChangedAt?.toISOString()).toBe("2026-10-01T04:22:48.100Z");
    expect(card?.shippedAt?.toISOString()).toBe("2026-10-01T04:22:48.100Z");
    // Qisqa karta mijoz va summani o'chirmaydi.
    expect(card?.client.fullName).toBe("Aziza");
    expect(card?.payableAmount).toBe(200000);
    // WS `updated_at` bir qadam orqada (§9.1) — keshlanmaydi.
    expect(card?.updatedAt).toBeNull();

    const boardCalls = invalidate.mock.calls.filter(
      ([filters]) => JSON.stringify(filters?.queryKey) === JSON.stringify(KEY),
    );
    expect(boardCalls).toHaveLength(0);
  });

  it("bekor qilishda blokda `cancel` bo'lmasa — sabab uchun doska fonda olinadi", () => {
    const { client, invalidate } = setup();
    applyOrderEvent(client, "order_status_changed", {
      ...DOC_EVENT,
      to_status: "cancelled",
      order: { ...DOC_EVENT.order, status: "cancelled" },
    });
    vi.advanceTimersByTime(REFRESH_COALESCE_MS + 1);
    const boardCalls = invalidate.mock.calls.filter(
      ([filters]) => JSON.stringify(filters?.queryKey) === JSON.stringify(KEY),
    );
    expect(boardCalls).toHaveLength(1);
  });

  it("mapLogistOrder: §7.4 kartochka kesimi", () => {
    const order = mapLogistOrder({
      id: "3f6c1a7e-2b84-4c11-9d0a-7e51f0b9a2cd",
      order_number: "ORD-20261001143022-A7F3B9C1",
      status: "shipping",
      status_display: "Yetkazilmoqda",
      total_amount: "480000.00",
      created_at: "2026-09-30T11:04:17.512340+05:00",
      status_changed_at: "2026-10-01T09:22:48.100213+05:00",
      updated_at: "2026-10-01T09:41:02.774819+05:00",
      shipped_at: "2026-10-01T09:22:48.100213+05:00",
      delivered_at: null,
      pinned_at: null,
      board_position: 0,
      is_pinned: false,
      is_paid: false,
    });
    expect(order.statusChangedAt?.toISOString()).toBe("2026-10-01T04:22:48.100Z");
    expect(order.updatedAt?.toISOString()).toBe("2026-10-01T04:41:02.774Z");
    expect(order.boardPosition).toBe(0);
    expect(order.pinnedAt).toBeNull();
    expect(order.deliveredAt).toBeNull();
  });
});

describe("WS qisqa karta: tuman nomi katalogdan (HUDUD_3 javobi Q7)", () => {
  const CODE = "fargona/qoqon_sh";
  const shortWithDistrict = {
    ...SHORT_CARD,
    delivery: { district: CODE, address_text: "Turkiston 7", locality: "Navbahor MFY" },
  };
  const status = (order: unknown) => ({
    order_id: "o1",
    from_status: "confirmed",
    to_status: "shipping",
    order,
  });

  it("`district_display` yo'q — `/meta/regions/` keshidan nom qo'yiladi", () => {
    const { client } = setup();
    client.setQueryData(
      queryKeys.metaRegions,
      mapRegionsDictionary([
        { region: "fargona", name: "Farg'ona", districts: [{ code: CODE, name_uz: "Qo'qon sh." }] },
      ]),
    );
    applyOrderEvent(client, "order_status_changed", status(shortWithDistrict));
    const card = cardOf(client, "shipping");
    expect(card?.zoning?.district).toBe(CODE);
    expect(card?.zoning?.districtDisplay).toBe("Qo'qon sh.");
    expect(card?.deliveryInfo?.locality).toBe("Navbahor MFY");
  });

  it("katalog yo'q va kod o'zgardi — eski nom tashlanadi (UI kodga tushadi)", () => {
    const old = mapLogistOrder({
      ...FULL,
      delivery: { district: "fargona/beshariq", district_display: "Beshariq" },
    });
    const merged = mergeOrderSnapshot(
      old,
      withDistrictDisplay(shortWithDistrict, () => null),
    );
    expect(merged.zoning?.district).toBe(CODE);
    expect(merged.zoning?.districtDisplay).toBeNull();
  });

  it("kod o'sha — nom kelmasa ham eski nom saqlanadi", () => {
    const old = mapLogistOrder({
      ...FULL,
      delivery: { district: CODE, district_display: "Qo'qon sh." },
    });
    const merged = mergeOrderSnapshot(old, withDistrictDisplay(shortWithDistrict, () => null));
    expect(merged.zoning?.districtDisplay).toBe("Qo'qon sh.");
  });

  it("server nom bergan bo'lsa — katalog tegmaydi", () => {
    const raw = { delivery: { district: CODE, district_display: "Server nomi" } };
    expect(withDistrictDisplay(raw, () => "Katalog")).toBe(raw);
  });
});
