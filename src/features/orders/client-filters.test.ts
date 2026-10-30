import { describe, expect, it } from "vitest";

import { buildOrderFilters } from "./api";
import {
  applyClientQuick,
  hasClientQuick,
  isServerQuickFilter,
  quickFilterCounts,
} from "./client-filters";
import { serverFilterParams } from "./server-filters";
import type { ServerFilterState } from "./server-filters";

const EMPTY: ServerFilterState = {
  creator: null,
  app: null,
  deliveryDate: null,
  quick: null,
  paidFilter: null,
  methodFilter: null,
  courierId: null,
};

const toQuery = (state: Partial<ServerFilterState>) =>
  buildOrderFilters({ ...serverFilterParams({ ...EMPTY, ...state }) });

/**
 * Filtrlar serverda (2026-10-01 C §11.2) — hujjatdagi misollar bilan.
 * Mijozdagi filtr "N more" ichidagini ko'rmasdi (§11.3).
 */
describe("serverFilterParams → so'rov (§11.2)", () => {
  it("sukut — yangi filtr parametrlari yuborilmaydi", () => {
    const params = toQuery({});
    for (const key of [
      "created_by_kind",
      "has_app",
      "delivery_date",
      "region",
      "tags",
      "overdue",
      "payment_state",
      "payment_method",
      "courier",
    ]) {
      expect(params[key]).toBeUndefined();
    }
  });

  it("`?created_by_kind=admin,operator` — panelning \"Operator\" i ikkala kalit", () => {
    expect(toQuery({ creator: "operator" }).created_by_kind).toBe("operator,admin");
    expect(toQuery({ creator: "client" }).created_by_kind).toBe("client");
    expect(toQuery({ creator: "reception" }).created_by_kind).toBe("reception");
  });

  it("`?has_app=false`, `?region=samarqand` (ENUM kodi), `?delivery_date=today`", () => {
    expect(toQuery({ app: "no" }).has_app).toBe("false");
    expect(toQuery({ app: "yes" }).has_app).toBe("true");
    expect(toQuery({ regions: ["samarqand"] }).region).toBe("samarqand");
    // Bir nechta viloyat — vergul bilan (2026-10-29).
    expect(toQuery({ regions: ["samarqand", "fargona"] }).region).toBe("samarqand,fargona");
    // Manzil matni ENUM emas — yuborilmaydi.
    expect(toQuery({ regions: ["Samarqand viloyati"] }).region).toBeUndefined();
    expect(toQuery({ deliveryDate: "today" }).delivery_date).toBe("today");
    expect(toQuery({ deliveryDate: "kecha" }).delivery_date).toBeUndefined();
  });

  it("`?payment_state=unpaid&payment_method=cash` (naqd chipi = cash,manual)", () => {
    const params = toQuery({ paidFilter: "unpaid", methodFilter: "cash" });
    expect(params.payment_state).toBe("unpaid");
    expect(params.payment_method).toBe("cash,manual");
    expect(toQuery({ paidFilter: "refunded" }).payment_state).toBe("refunded");
    expect(params.is_paid).toBeUndefined();
  });

  it("tezkor chiplar — server parametrlari: `chief=none`, `delivery_date=today`, `overdue=true`", () => {
    expect(toQuery({ quick: "no_courier" }).chief).toBe("none");
    expect(toQuery({ courierId: 7 }).courier).toBe(7);
    expect(toQuery({ quick: "due_today", deliveryDate: "tomorrow" }).delivery_date).toBe("today");
    expect(toQuery({ quick: "late" }).overdue).toBe("true");
    const online = toQuery({ quick: "online_paid" });
    expect(online.payment_state).toBe("paid");
    expect(online.payment_method).toBe("card,cashback");
  });

  it("mijoz chiplari serverga ketmaydi", () => {
    expect(toQuery({ quick: "fresh" })).toEqual(toQuery({}));
    expect(toQuery({ quick: "unread_chat" })).toEqual(toQuery({}));
  });
});

describe("mijoz chiplari — faqat \"Yangi\" va \"Yangi xabar\"", () => {
  const orders = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("server chipi mijozda suzilmaydi", () => {
    expect(isServerQuickFilter("late")).toBe(true);
    expect(isServerQuickFilter("fresh")).toBe(false);
    expect(hasClientQuick({ quick: "late" })).toBe(false);
    expect(applyClientQuick(orders, { quick: "late" })).toBe(orders);
  });

  it("\"Yangi xabar\" — chat belgisi bo'yicha", () => {
    const unread = new Set(["b"]);
    const filtered = applyClientQuick(orders, {
      quick: "unread_chat",
      hasUnreadChat: (id) => unread.has(id),
    });
    expect(filtered.map((order) => order.id)).toEqual(["b"]);
  });

  it("sonlar: \"Yangi\" yuklanganlardan, \"Yangi xabar\" server sonidan, server chipi faqat yoqilganda", () => {
    const counts = quickFilterCounts({
      orders,
      active: "late",
      serverTotal: 12,
      isFresh: (id) => id !== "c",
      unreadChatOrders: 54,
    });
    expect(counts).toEqual({
      fresh: 2,
      unread_chat: 54,
      no_courier: null,
      due_today: null,
      late: 12,
      online_paid: null,
    });
  });
});
