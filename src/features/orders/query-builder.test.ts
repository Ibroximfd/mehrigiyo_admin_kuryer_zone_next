import { describe, expect, it } from "vitest";

import { buildOrderFilters, buildOrdersQuery } from "./api";
import { paymentMethodKeys } from "./types";

/**
 * Logist ro'yxat/doska so'rov parametrlari — backend kontrakti:
 * `BACKEND-TODO.md` §3.1 (`is_paid`, `payment_method`), LOGIST-PLAN
 * (`status`, `search`, `courier`, `source`, `date|date_from|date_to|period`),
 * 2026-10-01 §2.3 (eski status yo'q), 2026-10-01 C §8 (`ordering` oq
 * ro'yxati) va §11 (logist filtrlari).
 */
describe("buildOrderFilters", () => {
  it("sukut: faqat `ordering=-created_at`; `period=all` yuborilmaydi", () => {
    expect(buildOrderFilters({ period: "all" })).toEqual({ ordering: "-created_at" });
  });

  it("davr presetlari va aniq sana oralig'i (oraliq presetni bosadi)", () => {
    expect(buildOrderFilters({ period: "today" }).period).toBe("today");
    const range = buildOrderFilters({ period: "month", dateFrom: "2026-09-01", dateTo: "2026-09-30" });
    expect(range.period).toBeUndefined();
    expect(range.date_from).toBe("2026-09-01");
    expect(range.date_to).toBe("2026-09-30");
  });

  it("kuryer, kanal, teg, qidiruv — backend nomlari bilan", () => {
    const params = buildOrderFilters({
      courierId: 4,
      source: " doctor_ali ",
      tag: "urgent",
      search: "  953a504e ",
    });
    expect(params).toMatchObject({
      courier: 4,
      source: "doctor_ali",
      tags: "urgent",
      search: "953a504e",
    });
  });

  it("to'lov: `is_paid` satr, `payment_method` vergul bilan (naqd = cash,manual)", () => {
    const unpaidCash = buildOrderFilters({
      isPaid: false,
      paymentMethods: paymentMethodKeys("cash"),
    });
    expect(unpaidCash.is_paid).toBe("false");
    expect(unpaidCash.payment_method).toBe("cash,manual");
    expect(buildOrderFilters({ isPaid: true }).is_paid).toBe("true");
    expect(buildOrderFilters({ isPaid: null }).is_paid).toBeUndefined();
  });

  it("§11.2 misollari: region, delivery_date, courier=none, overdue, created_by_kind, tags, payment_state", () => {
    expect(buildOrderFilters({ regions: ["samarqand", "jizzax"] }).region).toBe("samarqand,jizzax");
    expect(buildOrderFilters({ deliveryDate: "today" }).delivery_date).toBe("today");
    expect(buildOrderFilters({ courierId: "none" }).courier).toBe("none");
    expect(buildOrderFilters({ overdue: true }).overdue).toBe("true");
    expect(buildOrderFilters({ createdByKinds: ["admin", "operator"] }).created_by_kind).toBe(
      "admin,operator",
    );
    expect(buildOrderFilters({ tag: "urgent" }).tags).toBe("urgent");
    expect(buildOrderFilters({ paymentStates: ["unpaid"] }).payment_state).toBe("unpaid");
    expect(buildOrderFilters({ hasApp: false }).has_app).toBe("false");
  });

  it("`?tags=` bo'sh yuborilmaydi (bo'sh ro'yxat qaytarardi, §11.3); `pagination` hech qachon", () => {
    expect(buildOrderFilters({ tag: "  " }).tags).toBeUndefined();
    expect(buildOrderFilters({ regions: [] }).region).toBeUndefined();
    expect(buildOrderFilters({}).pagination).toBeUndefined();
  });

  it("ordering — oq ro'yxatdan; imlosi xato qiymat o'rniga sukut", () => {
    expect(buildOrderFilters({ ordering: "-total_amount" }).ordering).toBe("-total_amount");
    expect(buildOrderFilters({ ordering: "-status_changed_at" }).ordering).toBe("-status_changed_at");
    expect(buildOrderFilters({ ordering: "delivery_date" }).ordering).toBe("delivery_date");
    expect(buildOrderFilters({ ordering: "salom" }).ordering).toBe("-created_at");
  });
});

describe("buildOrdersQuery", () => {
  it("sahifa, hajm va kanonik statuslar; eski status almashtiriladi (§2.3)", () => {
    const params = buildOrdersQuery({
      statuses: ["paid", "preparing", "confirming", "delivered", "bogus"],
      page: 2,
      pageSize: 30,
    });
    expect(params.page).toBe(2);
    expect(params.page_size).toBe(30);
    expect(params.status).toBe("confirmed,delivered");
  });

  it("status bo'sh bo'lsa ham `pending` so'ralmaydi", () => {
    expect(buildOrdersQuery({}).status).toBe("confirmed,shipping,delivered,cancelled");
  });
});
