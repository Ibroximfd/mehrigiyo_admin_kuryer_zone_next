import { describe, expect, it } from "vitest";

import { mapLogistOrder } from "@/features/orders/types";
import { ApiError } from "@/lib/api-client";

import { patchOrderInList } from "./order-cache";
import {
  ADDRESS_FIX_FIELDS,
  RETURN_FIELDS,
  addressFixErrors,
  chiefActionFailure,
  courierWasUnassigned,
  hasErrors,
  returnErrors,
} from "./order-action-rules";
import { HISTORY_LABELS, mapChiefOrderDetail } from "./types";
import { addressChangedBy } from "./order-view";

const apiError = (status: number, data: unknown, code?: string) => new ApiError("x", status, data, code);

describe("manzil tuzatish / qaytarish: server xato kodlari (TZ 25)", () => {
  it("403 zone_other_region → begona viloyat", () => {
    const failure = chiefActionFailure(apiError(403, { code: "zone_other_region" }, "zone_other_region"), ADDRESS_FIX_FIELDS, "f");
    expect(failure.kind).toBe("foreign_region");
    expect(failure.message).toBe("Tuman o'z viloyatlaringizdan bo'lishi kerak");
  });

  it("409 order_closed → yopilgan zakaz", () => {
    expect(chiefActionFailure(apiError(409, { code: "order_closed" }, "order_closed"), ADDRESS_FIX_FIELDS, "f").kind).toBe("closed");
  });

  it("400 validation_error → maydonlar (satr va DRF massivi), notanish maydon tashlanadi", () => {
    const failure = chiefActionFailure(
      apiError(400, { code: "validation_error", fields: { district: ["Noto'g'ri tuman"], note: "Izoh kerak", foo: "x" } }, "validation_error"),
      ADDRESS_FIX_FIELDS,
      "f",
    );
    expect(failure.kind).toBe("validation");
    expect(failure.fields).toEqual({ district: "Noto'g'ri tuman", note: "Izoh kerak" });
    expect(failure.message).toBe("Maydonlarni tekshiring");
  });

  it("qaytarish: `other` izohsiz → fields.note", () => {
    const failure = chiefActionFailure(apiError(400, { code: "validation_error", fields: { note: ["required"] } }, "validation_error"), RETURN_FIELDS, "f");
    expect(failure.fields).toEqual({ note: "required" });
  });

  it("404 — zakaz endi sizda emas; endpoint yo'q va boshqa xatolar", () => {
    expect(chiefActionFailure(apiError(404, {}), RETURN_FIELDS, "f").kind).toBe("gone");
    expect(chiefActionFailure(apiError(404, {}, "order_gone"), RETURN_FIELDS, "f").kind).toBe("gone");
    expect(chiefActionFailure(apiError(404, {}, "endpoint_missing"), RETURN_FIELDS, "f").kind).toBe("missing");
    expect(chiefActionFailure(new ApiError("Tarmoq xatosi"), RETURN_FIELDS, "f")).toEqual({ kind: "other", message: "Tarmoq xatosi", fields: {} });
  });
});

describe("forma tekshiruvi", () => {
  it("manzil: tuman tanlangan viloyat ro'yxatidan, sabab majburiy", () => {
    expect(addressFixErrors({ district: "", reason: "", note: "" }, ["a"])).toEqual({ district: "Tumanni tanlang", reason: "Sababni tanlang" });
    expect(addressFixErrors({ district: "b", reason: "moved", note: "" }, ["a"]).district).toBe("Tumanni tanlang");
    expect(hasErrors(addressFixErrors({ district: "a", reason: "clarified", note: "" }, ["a"]))).toBe(false);
  });

  it("qaytarish: `other` da izoh majburiy (bo'shliq hisoblanmaydi)", () => {
    expect(returnErrors({ reason: "", note: "" })).toEqual({ reason: "Sababni tanlang" });
    expect(returnErrors({ reason: "other", note: "  " }).note).toBeTruthy();
    expect(hasErrors(returnErrors({ reason: "other", note: "mijoz Toshkentda" }))).toBe(false);
    expect(hasErrors(returnErrors({ reason: "wrong_region", note: "" }))).toBe(false);
  });

  it("kuryer olindi — «Kelganlar» ga qaytgani aytiladi", () => {
    expect(courierWasUnassigned({ courier: { id: 1 } }, { courier: null })).toBe(true);
    expect(courierWasUnassigned({ courier: null }, { courier: null })).toBe(false);
    expect(courierWasUnassigned({ courier: { id: 1 } }, { courier: { id: 1 } })).toBe(false);
  });
});

describe("zakaz javobi: TZ 25 maydonlari", () => {
  it("filial, mo'ljal, address_changed_by; bo'sh qiymat — null", () => {
    const order = mapLogistOrder({
      id: 5,
      filial: { id: 2, name: "Mehrigiyo Qo'qon" },
      delivery: { landmark: "Bozor yonida", address_changed_by: "crm" },
    });
    expect(order.filial).toEqual({ id: 2, name: "Mehrigiyo Qo'qon" });
    expect(order.deliveryInfo?.landmark).toBe("Bozor yonida");
    expect(addressChangedBy(order)).toBe("CRM");
    const empty = mapLogistOrder({ id: 6, filial: null, delivery: { landmark: null, address_changed_by: null, address_text: "Ko'cha" } });
    expect(empty.filial).toBeNull();
    expect(empty.deliveryInfo?.landmark).toBeNull();
    expect(addressChangedBy(empty)).toBeNull();
  });

  it("tarix: yangi turlar yorlig'i bor, `actor` — satr, obyekt yoki null", () => {
    const detail = mapChiefOrderDetail({
      id: "x",
      history: [
        { at: "2026-10-31T09:00:00Z", action: "courier_assigned", actor: null, courier: "K1" },
        { at: "2026-10-31T10:00:00Z", action: "address_changed", actor: { id: 7, full_name: "V2 Bosh kuryer" } },
        { at: "2026-10-31T11:00:00Z", action: "returned_to_logist", actor: "V2 Bosh kuryer" },
      ],
    });
    expect(detail.history.map((row) => row.actor)).toEqual([null, "V2 Bosh kuryer", "V2 Bosh kuryer"]);
    for (const row of detail.history) expect(HISTORY_LABELS[row.action]).toBeTruthy();
  });
});

describe("kesh: ro'yxatdagi zakaz", () => {
  const a = mapLogistOrder({ id: "a" });
  const b = mapLogistOrder({ id: "b" });
  const infinite = { pages: [{ orders: [a, b], count: 2, hasMore: false }], pageParams: [1] };

  it("qaytarilgan zakaz sahifali ro'yxatdan chiqadi va son kamayadi", () => {
    expect(patchOrderInList(infinite, "a", null)).toEqual({ pages: [{ orders: [b], count: 1, hasMore: false }], pageParams: [1] });
  });

  it("tuzatilgan zakaz almashtiriladi; oddiy massiv ham; begona shakl tegilmaydi", () => {
    const next = mapLogistOrder({ id: "a", order_number: "N-2" });
    const patched = patchOrderInList(infinite, "a", next) as typeof infinite;
    expect(patched.pages[0]?.orders[0]?.orderNumber).toBe("N-2");
    expect(patched.pages[0]?.count).toBe(2);
    expect(patchOrderInList([a, b], "b", null)).toEqual([a]);
    expect(patchOrderInList(undefined, "a", null)).toBeUndefined();
    expect(patchOrderInList(infinite, "zzz", null)).toBe(infinite);
  });
});
