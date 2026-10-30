import { describe, expect, it } from "vitest";

import { paymentView } from "@/features/orders/types";

import { patchOrderInBoard, refetchLimit } from "./board-ops";
import {
  cardSignals,
  columnSince,
  formatDwell,
  isDeliveryOverdue,
  isStaleDwell,
  needsCourier,
  openTotals,
  paymentFactsOf,
} from "./card-model";
import { mapDeliveryBoard, mapPipelineLead, mapPipelineOrder } from "./types";
import type { PipelineLead } from "./types";

/** `CRM_01` §3 + `CRM_02` §1 — kartadagi buyurtma (kuryer bosqichi bilan). */
const ORDER = {
  id: "o1",
  order_number: "ORD-1",
  status: "confirmed",
  payment_status: "cod_pending",
  payment_method: "cash",
  total_amount: "120000.00",
  payable_amount: "100000.00",
  items_count: 3,
  created_at: "2026-10-27T08:00:00Z",
  status_changed_at: "2026-10-28T08:00:00Z",
  delivery_date: "2026-10-27",
  delivery_window: "evening",
  district_display: "Chilonzor",
  locality: "12-kvartal",
  courier: {
    id: 4,
    full_name: "Kuryer Ali",
    phone: "+998901234567",
    delivery_stage: "on_the_way",
    delivery_stage_display: "Yo'lda",
  },
};

function lead(orders: unknown[], extra: object = {}): PipelineLead {
  return mapPipelineLead({ id: 1, full_name: "Aziza", delivery: { orders }, ...extra })!;
}

describe("karta maydonlari (yumshoq o'qish)", () => {
  it("summa, to'lov, kuryer bosqichi, yetkazish oynasi va qisqa manzil", () => {
    const order = mapPipelineOrder(ORDER)!;
    expect(order.payableAmount).toBe(100000);
    expect(order.itemsCount).toBe(3);
    expect(order.courier).toMatchObject({ fullName: "Kuryer Ali", stage: "on_the_way", stageLabel: "Yo'lda" });
    expect(order.deliveryWindow).toBe("evening");
    expect(order.addressShort).toBe("Chilonzor · 12-kvartal");
    expect(paymentView(paymentFactsOf(order)).state).not.toBe("unknown");
  });

  it("server yorlig'i yo'q — mahalliy bosqich nomi; bo'sh maydonlar null", () => {
    const order = mapPipelineOrder({ id: "x", courier: { id: 1, full_name: "A", delivery_stage: "arrived" } })!;
    expect(order.courier?.stageLabel).toBe("Yetib keldi");
    expect(order.addressShort).toBeNull();
    expect(order.deliveryWindow).toBeNull();
    expect(order.statusChangedAt).toBeNull();
  });
});

describe("kartadagi hisoblar", () => {
  const now = new Date("2026-10-28T10:30:00Z");

  it("ustunda turgan vaqt — buyurtma `status_changed_at` dan", () => {
    const since = columnSince(lead([ORDER]))!;
    expect(formatDwell(since, now)).toBe("2 soat");
    expect(formatDwell(new Date(now.getTime() - 5 * 60_000), now)).toBe("5 daq");
    expect(formatDwell(new Date(now.getTime() - 3 * 86_400_000), now)).toBe("3 kun");
    expect(isStaleDwell(since, now)).toBe(false);
    expect(columnSince(lead([]))).toBeNull();
  });

  it("kechikkan yetkazish va kuryersiz `confirmed`", () => {
    const order = mapPipelineOrder(ORDER)!;
    expect(isDeliveryOverdue(order, "2026-10-28")).toBe(true);
    expect(isDeliveryOverdue({ ...order, status: "delivered" }, "2026-10-28")).toBe(false);
    expect(needsCourier({ ...order, courier: null })).toBe(true);
    expect(needsCourier({ ...order, status: "pending", courier: null })).toBe(false);
  });

  it("signallar: o'zgarish so'rovi, bitta to'xtash, qo'shimcha zakazlar", () => {
    const card = lead([
      { ...ORDER, id: "a", stop_id: 5, change_request: { id: 1, status: "pending" } },
      { ...ORDER, id: "b", stop_id: 5 },
      { ...ORDER, id: "c", status: "delivered" },
    ]);
    expect(cardSignals(card)).toEqual({ changeRequest: true, stopGroupSize: 2, extraOpen: 1 });
    expect(openTotals(card)).toEqual({ count: 2, payable: 200000 });
    expect(cardSignals(lead([ORDER]))).toEqual({ changeRequest: false, stopGroupSize: null, extraOpen: 0 });
  });
});

describe("doska: chuqurlik va kuryer yamog'i", () => {
  const board = () =>
    mapDeliveryBoard({
      columns: [
        { status: "confirmed", lead_count: 200, leads: Array.from({ length: 120 }, (_, i) => ({ id: i + 1 })) },
        { status: "shipping", lead_count: 1, leads: [{ id: 999, delivery: { orders: [ORDER] } }] },
      ],
    });

  it("qayta yuklash ochilgan ustunni qisqartirmaydi (50 ga yaxlitlab, max 500)", () => {
    expect(refetchLimit(board())).toBe(150);
    expect(refetchLimit(null)).toBe(50);
    expect(
      refetchLimit({ columns: [{ key: "x", label: "", color: null, total: 9999, leads: Array.from({ length: 900 }, () => board().columns[1]!.leads[0]!) }] }),
    ).toBe(500);
  });

  it("kuryer yamog'i — faqat o'sha karta, ustun o'zgarmaydi", () => {
    const start = board();
    const next = patchOrderInBoard(start, "o1", (order) => ({ ...order, courier: null }));
    expect(next.columns[1]!.leads[0]!.orders[0]!.courier).toBeNull();
    expect(next.columns[0]).toBe(start.columns[0]);
    expect(patchOrderInBoard(start, "nope", (order) => order)).toBe(start);
  });
});

describe("Bazagacha qolgan vaqt (`handover_at`)", () => {
  it("soat va daqiqa; o'tgan — «Bazaga o'tmoqda»; yo'q — null", async () => {
    const { handoverLeft } = await import("./card-model");
    const now = new Date("2026-10-30T12:00:00Z");
    expect(handoverLeft(new Date("2026-10-31T05:20:00Z"), now)).toBe("Bazaga 17 soat 20 daq");
    expect(handoverLeft(new Date("2026-10-30T12:45:00Z"), now)).toBe("Bazaga 45 daq");
    expect(handoverLeft(new Date("2026-10-30T11:00:00Z"), now)).toBe("Bazaga o'tmoqda");
    expect(handoverLeft(null, now)).toBeNull();
  });
});
