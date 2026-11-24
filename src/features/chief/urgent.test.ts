import { describe, expect, it } from "vitest";

import { mapLogistOrder } from "@/features/orders/types";
import { ApiError } from "@/lib/api-client";

import {
  URGENT_ALARM_MS,
  alarmDue,
  awaitsAck,
  freshUnacked,
  isAckGone,
  isActiveUrgent,
  isUrgentUnsupported,
  mapUrgentBoard,
  urgentAgo,
  urgentCounts,
  urgentStage,
  withAck,
  withOrder,
  withoutAck,
  withoutOrder,
} from "./urgent";

/** `chief/orders/` dagi zakaz shakli — faqat shoshilinchlikka tegishli kalitlar. */
function raw(id: string, urgent: Record<string, unknown> | null | undefined, extra: Record<string, unknown> = {}) {
  return {
    id,
    order_number: `ORD-20261124151002-${id.toUpperCase()}`,
    status: "shipping",
    ...(urgent === undefined ? {} : { urgent }),
    ...extra,
  };
}

const active = (setAt: string, extra: Record<string, unknown> = {}) => ({
  is_active: true,
  set_at: setAt,
  set_by: { id: 31, full_name: "Logist" },
  reason: "Mijoz bugun kechqurun ketadi",
  acked_at: null,
  acked_by: null,
  reminders: 0,
  ...extra,
});

const board = (orders: unknown[], extra: Record<string, unknown> = {}) =>
  mapUrgentBoard({ count: orders.length, unacked: 0, reminder_after_minutes: 10, orders, ...extra });

describe("shoshilinch zakaz — zakazdagi kalit (hujjat 123 §2)", () => {
  it("to'liq obyekt o'qiladi; `is_active` faqat serverdan", () => {
    const order = mapLogistOrder(raw("a1", active("2026-11-24T15:10:02+05:00", { reminders: 2 })));
    expect(order.urgentFromServer).toBe(true);
    expect(order.urgent).toMatchObject({
      isActive: true,
      reason: "Mijoz bugun kechqurun ketadi",
      setBy: { id: 31, fullName: "Logist" },
      ackedAt: null,
      ackedBy: null,
      reminders: 2,
    });
    expect(order.urgent?.setAt?.toISOString()).toBe("2026-11-24T10:10:02.000Z");
  });

  it("`null` — shoshilinch emas, lekin server funksiyani biladi; kalit yo'q — eski server", () => {
    const plain = mapLogistOrder(raw("a1", null));
    expect(plain).toMatchObject({ urgent: null, urgentFromServer: true });
    const legacy = mapLogistOrder(raw("a1", undefined));
    expect(legacy).toMatchObject({ urgent: null, urgentFromServer: false });
  });

  it("yopilgan zakazda belgi tarix uchun qoladi, lekin faol emas", () => {
    const closed = mapLogistOrder(raw("a1", active("2026-11-24T15:10:02+05:00", { is_active: false }), { status: "delivered" }));
    expect(closed.urgent?.isActive).toBe(false);
    expect(isActiveUrgent(closed)).toBe(false);
  });
});

describe("faol shoshilinchlar ro'yxati (§4.1)", () => {
  it("avval tasdiqlanmaganlar, keyin eski birinchi; faol bo'lmagani tashlanadi", () => {
    const { orders, reminderAfterMinutes } = board([
      raw("acked", active("2026-11-24T10:00:00+05:00", { acked_at: "2026-11-24T10:02:00+05:00", acked_by: { id: 15, full_name: "Bosh" } })),
      raw("new", active("2026-11-24T12:00:00+05:00")),
      raw("old", active("2026-11-24T11:00:00+05:00")),
      raw("closed", active("2026-11-24T09:00:00+05:00", { is_active: false })),
      raw("plain", null),
    ]);
    expect(orders.map((order) => order.id)).toEqual(["old", "new", "acked"]);
    expect(reminderAfterMinutes).toBe(10);
    expect(urgentCounts(orders)).toEqual({ total: 3, unacked: 2 });
  });

  it("bo'sh yoki g'alati javob yiqitmaydi; takror oralig'i sukuti 10 daqiqa", () => {
    expect(mapUrgentBoard({})).toEqual({ orders: [], reminderAfterMinutes: 10 });
    expect(mapUrgentBoard({ orders: "x", reminder_after_minutes: 0 })).toEqual({ orders: [], reminderAfterMinutes: 10 });
    expect(mapUrgentBoard({ orders: [], reminder_after_minutes: 5 }).reminderAfterMinutes).toBe(5);
  });

  it("bosqich: qabul qilinmagan → kuryerga bering → kuryerda", () => {
    const acked = { acked_at: "2026-11-24T10:02:00+05:00" };
    const [waiting] = board([raw("a", active("2026-11-24T10:00:00+05:00"))]).orders;
    const [ready] = board([raw("b", active("2026-11-24T10:00:00+05:00", acked))]).orders;
    const [onRoad] = board([
      raw("c", active("2026-11-24T10:00:00+05:00", acked), { courier: { id: 7, full_name: "Kuryer" } }),
    ]).orders;
    expect([waiting, ready, onRoad].map(urgentStage)).toEqual(["unacked", "acked", "with_courier"]);
  });

  it("kuryerga berilgan, lekin tasdiq yo'q — baribir tasdiq kutadi", () => {
    const [order] = board([raw("a", active("2026-11-24T10:00:00+05:00"), { courier: { id: 7, full_name: "Kuryer" } })]).orders;
    expect(awaitsAck(order)).toBe(true);
    expect(urgentStage(order)).toBe("unacked");
  });
});

describe("«necha vaqt oldin» yozuvi", () => {
  const now = new Date("2026-11-24T12:00:00+05:00");
  it("hozirgina / daqiqa / soat", () => {
    expect(urgentAgo(new Date("2026-11-24T11:59:40+05:00"), now)).toBe("hozirgina");
    expect(urgentAgo(new Date("2026-11-24T11:57:00+05:00"), now)).toBe("3 daqiqa oldin");
    expect(urgentAgo(new Date("2026-11-24T09:30:00+05:00"), now)).toBe("2 soat oldin");
    expect(urgentAgo(null, now)).toBe("");
  });

  it("qurilma soati orqada bo'lsa ham manfiy chiqmaydi", () => {
    expect(urgentAgo(new Date("2026-11-24T12:03:00+05:00"), now)).toBe("hozirgina");
  });
});

describe("«Qabul qildim» — kesh (§4.2)", () => {
  const start = () =>
    board([raw("a", active("2026-11-24T10:00:00+05:00")), raw("b", active("2026-11-24T11:00:00+05:00"))]);
  const me = { id: 15, fullName: "Bosh kuryer" };
  const at = new Date("2026-11-24T12:00:00+05:00");

  it("optimistik: zakaz darhol tasdiqlangan, tasdiq kutayotganlar tepada qoladi", () => {
    const next = withAck(start(), "a", me, at);
    expect(next.orders.map((order) => order.id)).toEqual(["b", "a"]);
    expect(next.orders[1].urgent).toMatchObject({ ackedAt: at, ackedBy: me });
    expect(urgentCounts(next.orders)).toEqual({ total: 2, unacked: 1 });
  });

  it("ikki marta bosish birinchi vaqtni o'zgartirmaydi", () => {
    const once = withAck(start(), "a", me, at);
    const twice = withAck(once, "a", me, new Date("2026-11-24T12:05:00+05:00"));
    expect(twice.orders.find((order) => order.id === "a")?.urgent.ackedAt).toEqual(at);
  });

  it("server rad etdi — faqat shu zakazning belgisi qaytadi", () => {
    const both = withAck(withAck(start(), "a", me, at), "b", me, at);
    const rolled = withoutAck(both, "a");
    expect(rolled.orders.map((order) => [order.id, awaitsAck(order)])).toEqual([
      ["a", true],
      ["b", false],
    ]);
  });

  it("server javobi: faol zakaz almashadi, faol bo'lmagani ro'yxatdan chiqadi", () => {
    const acked = mapLogistOrder(raw("a", active("2026-11-24T10:00:00+05:00", { acked_at: "2026-11-24T12:00:01+05:00" })));
    expect(withOrder(start(), acked).orders.map((order) => [order.id, awaitsAck(order)])).toEqual([
      ["b", true],
      ["a", false],
    ]);
    const cleared = mapLogistOrder(raw("a", null));
    expect(withOrder(start(), cleared).orders.map((order) => order.id)).toEqual(["b"]);
    expect(withoutOrder(start(), "b").orders.map((order) => order.id)).toEqual(["a"]);
  });

  it("ro'yxatda bo'lmagan zakaz qo'shilmaydi — keyingi so'rov o'zi olib keladi", () => {
    const other = mapLogistOrder(raw("z", active("2026-11-24T09:00:00+05:00")));
    expect(withOrder(start(), other).orders.map((order) => order.id)).toEqual(["a", "b"]);
  });

  it("belgi olib tashlangan yoki zakaz ketgan — xato emas", () => {
    expect(isAckGone(new ApiError("x", 409, {}, "not_urgent"))).toBe(true);
    expect(isAckGone(new ApiError("x", 404, {}, "order_not_found"))).toBe(true);
    expect(isAckGone(new ApiError("x", 409, {}, "order_closed"))).toBe(false);
    expect(isAckGone(new ApiError("x", 500))).toBe(false);
    expect(isAckGone(new Error("tarmoq"))).toBe(false);
  });
});

describe("signal", () => {
  const orders = board([
    raw("a", active("2026-11-24T10:00:00+05:00")),
    raw("b", active("2026-11-24T11:00:00+05:00", { acked_at: "2026-11-24T11:01:00+05:00" })),
  ]).orders;

  it("yangi tasdiqlanmagan zakaz — bir marta; tasdiqlangani hech qachon", () => {
    expect(freshUnacked(new Set(), orders).map((order) => order.id)).toEqual(["a"]);
    expect(freshUnacked(new Set(["a"]), orders)).toEqual([]);
  });

  it("tasdiqlanmagan bor ekan har 20 soniyada; yo'q bo'lsa jim", () => {
    expect(alarmDue(1, null, 1_000)).toBe(true);
    expect(alarmDue(1, 1_000, 1_000 + URGENT_ALARM_MS - 1)).toBe(false);
    expect(alarmDue(1, 1_000, 1_000 + URGENT_ALARM_MS)).toBe(true);
    expect(alarmDue(0, null, 1_000)).toBe(false);
  });
});

describe("server funksiyani biladimi (§11)", () => {
  it("eski server: manzil yo'q — 404 (yoki 405) → yo'q, so'rov to'xtaydi", () => {
    for (const status of [404, 405]) {
      expect(isUrgentUnsupported(new ApiError("x", status))).toBe(true);
      expect(isUrgentUnsupported(new ApiError("x", status, {}, "order_not_found"))).toBe(true);
    }
  });

  it("`5xx` hech qachon «yo'q» emas — deploy paytidagi 502 signalni o'chirib qo'ymaydi", () => {
    expect(isUrgentUnsupported(new ApiError("x", 500))).toBe(false);
    expect(isUrgentUnsupported(new ApiError("x", 502))).toBe(false);
  });

  it("tarmoq, ruxsat va so'rov xatosi — qayta uriniladi", () => {
    expect(isUrgentUnsupported(new ApiError("Internet yo'q"))).toBe(false);
    expect(isUrgentUnsupported(new Error("tarmoq"))).toBe(false);
    expect(isUrgentUnsupported(new ApiError("x", 403, {}, "role_forbidden"))).toBe(false);
    expect(isUrgentUnsupported(new ApiError("x", 400, {}, "validation_error"))).toBe(false);
  });
});
