import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { queryKeys } from "@/lib/query-keys";

import {
  appendColumnPage,
  applyOrderStatus,
  columnHasMore,
  placeLead,
  removeLead,
} from "./board-ops";
import { applyLeadStageEvent, applyPipelineOrderEvent, isUnfilteredKey } from "./realtime";
import {
  deliveryColumnOf,
  mapBaseBoard,
  mapDeliveryBoard,
  mapColumnPage,
  mapLeadDetail,
} from "./types";
import type { PipelineBoard } from "./types";

/** `LOGIST_01` §3 — hujjatdagi Dostavka javobi. */
const DELIVERY_DOC = {
  success: true,
  operator: null,
  total_leads: 3,
  limit: 50,
  offset: 0,
  columns: [
    {
      status: "pending",
      label: "Kutilmoqda",
      lead_count: 1,
      leads: [
        {
          id: 12,
          full_name: "Aziza",
          phone: "+998901112233",
          stage: "delivery",
          assigned_to: { id: 3, full_name: "Operator Ali" },
          delivery: {
            column: "pending",
            open_orders_count: 2,
            orders: [
              {
                id: "o-new",
                order_number: "ORD-2",
                status: "pending",
                payable_amount: "100000.00",
                total_amount: "100000.00",
                items_count: 3,
                created_at: "2026-10-27T10:00:00Z",
                courier: null,
              },
              {
                id: "o-old",
                order_number: "ORD-1",
                status: "shipping",
                payable_amount: "50000.00",
                total_amount: "50000.00",
                created_at: "2026-10-26T10:00:00Z",
                courier: { id: 4, full_name: "Kuryer Ali" },
              },
            ],
          },
        },
      ],
    },
    { status: "confirmed", label: "Tasdiqlangan", lead_count: 120, leads: [{ id: 13, full_name: "B", delivery: { orders: [{ id: "o-13", status: "confirmed", created_at: "2026-10-27T09:00:00Z" }] } }] },
    { status: "shipping", label: "Yetkazilmoqda", lead_count: 0, leads: [] },
  ],
};

function board(): PipelineBoard {
  return mapDeliveryBoard(DELIVERY_DOC);
}

describe("Dostavka javobini o'qish", () => {
  it("ustunlar, sonlar va kartadagi har buyurtma", () => {
    const parsed = board();
    expect(parsed.stage).toBe("delivery");
    // «Yetkazildi» — server bermasa ham oxirida (B4: 24 soat, keyin Baza).
    expect(parsed.columns.map((column) => column.key)).toEqual(["pending", "confirmed", "shipping", "delivered"]);
    expect(parsed.columns[1]!.total).toBe(120);
    const lead = parsed.columns[0]!.leads[0]!;
    expect(lead.orders.map((order) => order.status)).toEqual(["pending", "shipping"]);
    expect(lead.orders[1]!.courier).toMatchObject({ id: 4, fullName: "Kuryer Ali", phone: null, stage: null });
    expect(lead.openOrdersCount).toBe(2);
    expect(lead.assignedTo?.fullName).toBe("Operator Ali");
  });

  it("buzuq javob yiqitmaydi", () => {
    expect(mapDeliveryBoard(null).columns.map((column) => column.key)).toEqual(["delivered"]);
    expect(mapDeliveryBoard({ columns: [{ leads: [{ nope: 1 }, "x"] }] }).columns[0]!.leads).toEqual([]);
  });

  it("Baza — `statuses[]`, faqat o'qish sukuti", () => {
    const base = mapBaseBoard({
      statuses: [{ id: 7, name: "Doimiy mijoz", color: "#22c55e", lead_count: 2, leads: [{ id: 1 }] }],
    });
    expect(base.readOnly).toBe(true);
    expect(base.columns[0]).toMatchObject({ key: "7", label: "Doimiy mijoz", total: 2 });
  });

  it("lid detali — `orders` ichida, status obyekt bo'lib ham keladi", () => {
    const detail = mapLeadDetail({
      id: 5,
      full_name: "C",
      stage: "base",
      status: { id: 9, name: "Baza" },
      orders: [{ id: "x", status: "delivered" }],
    });
    expect(detail?.lead.statusId).toBe(9);
    expect(detail?.lead.orders[0]!.status).toBe("delivered");
    expect(mapLeadDetail({})).toBeNull();
  });
});

describe("ustun = eng yangi ochiq buyurtma", () => {
  it("ochiq yo'q: yetkazilgani bor — «Yetkazildi», hammasi bekor — null", () => {
    const lead = board().columns[0]!.leads[0]!;
    expect(deliveryColumnOf(lead.orders)).toBe("pending");
    expect(deliveryColumnOf(lead.orders.map((order) => ({ ...order, status: "delivered" })))).toBe("delivered");
    expect(
      deliveryColumnOf(lead.orders.map((order, index) => ({ ...order, status: index ? "delivered" : "cancelled" }))),
    ).toBe("delivered");
    expect(deliveryColumnOf(lead.orders.map((order) => ({ ...order, status: "cancelled" })))).toBeNull();
  });
});

describe("sahifalash", () => {
  it("faqat o'sha ustun qo'shiladi, takror karta tashlanadi", () => {
    const start = board();
    const page = mapDeliveryBoard({
      columns: [
        { status: "pending", lead_count: 1, leads: [{ id: 99 }] },
        { status: "confirmed", lead_count: 120, leads: [{ id: 13 }, { id: 14 }] },
      ],
    });
    const next = appendColumnPage(start, "confirmed", page);
    expect(next.columns[1]!.leads.map((lead) => lead.id)).toEqual([13, 14]);
    expect(next.columns[0]).toBe(start.columns[0]);
    expect(columnHasMore(next.columns[1]!)).toBe(true);
  });

  it("o'zgarish yo'q — o'sha obyekt", () => {
    const start = board();
    expect(appendColumnPage(start, "nope", start)).toBe(start);
  });
});

describe("real vaqt yamog'i", () => {
  it("karta olinadi va jami son kamayadi", () => {
    const next = removeLead(board(), 12);
    expect(next.columns[0]!.leads).toEqual([]);
    expect(next.columns[0]!.total).toBe(0);
    expect(next.totalLeads).toBe(2);
    const same = board();
    expect(removeLead(same, 404)).toBe(same);
  });

  it("ko'chishda jami son o'zgarmaydi, karta tepaga tushadi", () => {
    const start = board();
    const lead = start.columns[0]!.leads[0]!;
    const next = placeLead(start, lead, "confirmed")!;
    expect(next.totalLeads).toBe(start.totalLeads);
    expect(next.columns[1]!.leads[0]!.id).toBe(12);
    expect(next.columns[1]!.total).toBe(121);
    expect(placeLead(start, lead, "nope")).toBeNull();
  });

  it("buyurtma statusi — karta yangi ustunga, yetkazilsa «Yetkazildi», bekor bo'lsa chiqadi", () => {
    const moved = applyOrderStatus(board(), "o-new", "confirmed");
    // Eng yangi ochiq endi `confirmed`.
    expect(moved.columns[1]!.leads[0]!.id).toBe(12);
    expect(moved.columns[0]!.leads).toEqual([]);

    // Eng yangisi bekor — keyingi ochiq (`shipping`) ustunni belgilaydi.
    const fallback = applyOrderStatus(board(), "o-new", "cancelled");
    expect(fallback.columns[2]!.leads[0]!.id).toBe(12);

    const delivered = applyOrderStatus(
      applyOrderStatus(board(), "o-old", "delivered"),
      "o-new",
      "delivered",
    );
    const last = delivered.columns.find((column) => column.key === "delivered");
    expect(last?.leads.map((lead) => lead.id)).toEqual([12]);

    const cancelled = applyOrderStatus(
      applyOrderStatus(board(), "o-old", "cancelled"),
      "o-new",
      "cancelled",
    );
    expect(cancelled.columns.flatMap((column) => column.leads).some((lead) => lead.id === 12)).toBe(false);
  });

  it("noma'lum buyurtma — doska tegilmaydi", () => {
    const start = board();
    expect(applyOrderStatus(start, "nope", "delivered")).toBe(start);
  });
});

describe("WS hodisalari", () => {
  it("`lead_stage_changed` — chiqqan bo'limdan karta olinadi", () => {
    const client = new QueryClient();
    const key = queryKeys.deliveryBoard({ search: null });
    client.setQueryData(key, board());
    applyLeadStageEvent(client, { type: "lead_stage_changed", lead_id: 12, from_stage: "delivery", to_stage: "base" });
    const next = client.getQueryData<PipelineBoard>(key)!;
    expect(next.columns[0]!.leads).toEqual([]);
  });

  it("`order_status_changed` — butun doska emas, bitta karta", () => {
    const client = new QueryClient();
    const key = queryKeys.deliveryBoard({ search: null });
    const start = board();
    client.setQueryData(key, start);
    applyPipelineOrderEvent(client, "order_status_changed", { order_id: "o-13", to_status: "shipping" });
    const next = client.getQueryData<PipelineBoard>(key)!;
    expect(next.columns[2]!.leads.map((lead) => lead.id)).toEqual([13]);
    expect(next.columns[0]).toBe(start.columns[0]);
  });

  it("filtrlangan doska kalitini taniydi", () => {
    expect(isUnfilteredKey(queryKeys.deliveryBoard({ search: null }))).toBe(true);
    expect(isUnfilteredKey(queryKeys.deliveryBoard({ search: "ali" }))).toBe(false);
  });
});

describe("Baza ustun davomi (v2)", () => {
  it("`{lead_count, has_more, leads}` bitta ustunli sahifaga aylanadi va qo'shiladi", () => {
    const base = mapBaseBoard({
      statuses: [{ id: 7, name: "Baza", lead_count: 120, leads: [{ id: 1 }, { id: 2 }] }],
    });
    const page = mapColumnPage("base", "7", { lead_count: 120, has_more: true, leads: [{ id: 2 }, { id: 3 }] });
    expect(page.columns[0]).toMatchObject({ key: "7", total: 120 });
    const next = appendColumnPage(base, "7", page);
    expect(next.columns[0]!.leads.map((lead) => lead.id)).toEqual([1, 2, 3]);
  });

  it("DRF `{count, results}` ham o'qiladi", () => {
    expect(mapColumnPage("base", "7", { count: 5, results: [{ id: 9 }] }).columns[0]!.total).toBe(5);
  });
});
