import { describe, expect, it } from "vitest";

import {
  changeRequestDelta,
  changeRequestKindLabel,
  isOpenChangeRequest,
  mapChangeRequest,
  mapChangeRequestList,
} from "./change-request";
import { mapLogistOrder } from "./types";

/** `LOGIST_02` §1 — hujjatdagi `<ChangeRequest>`. */
const DOC = {
  id: 7,
  kind: "add_item",
  status: "pending",
  items: [{ product_id: 12, title: "Zaytun yog'i", quantity: 2, unit_price: "90000.00" }],
  note: "",
  photo_url: null,
  created_at: "2026-10-27T10:00:00Z",
  resolved_at: null,
  resolved_by: null,
  decision_note: "",
  courier: { id: 3, full_name: "Kuryer Ali" },
};

describe("eshikdagi o'zgarish so'rovi", () => {
  it("hujjatdagi shakl o'qiladi", () => {
    const request = mapChangeRequest(DOC)!;
    expect(request.items[0]).toEqual({ productId: 12, title: "Zaytun yog'i", quantity: 2, unitPrice: 90000 });
    expect(request.courier).toEqual({ id: 3, fullName: "Kuryer Ali" });
    expect(request.note).toBeNull();
    expect(isOpenChangeRequest(request)).toBe(true);
  });

  it("yo'q yoki buzuq — null, karta yiqilmaydi", () => {
    expect(mapChangeRequest(null)).toBeNull();
    expect(mapChangeRequest({ kind: "gift" })).toBeNull();
    const order = mapLogistOrder({ id: "a", status: "shipping" });
    expect(order.changeRequest).toBeNull();
    expect(order.stopId).toBeNull();
  });

  it("buyurtma kartasida `change_request` va `stop_id`", () => {
    const order = mapLogistOrder({ id: "a", status: "shipping", change_request: DOC, stop_id: 5 });
    expect(order.changeRequest?.id).toBe(7);
    expect(order.stopId).toBe(5);
  });

  it("summa taxmini: qo'shish +, olish −, sovg'a 0, boshqa — null", () => {
    const request = mapChangeRequest(DOC)!;
    expect(changeRequestDelta(request)).toBe(180000);
    expect(changeRequestDelta({ ...request, kind: "remove_item" })).toBe(-180000);
    expect(changeRequestDelta({ ...request, kind: "gift" })).toBe(0);
    expect(changeRequestDelta({ ...request, kind: "other" })).toBeNull();
  });

  it("ro'yxat `{results}` va notanish tur yorlig'i", () => {
    const list = mapChangeRequestList({ results: [DOC, { id: 8, status: "rejected" }, "x"] });
    expect(list.map((request) => request.id)).toEqual([7, 8]);
    expect(changeRequestKindLabel("nimadir")).toBe("Boshqa o'zgarish");
  });
});
