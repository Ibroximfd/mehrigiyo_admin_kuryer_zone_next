import { describe, expect, it } from "vitest";

import { buildEditPatch, editReasonRequired, orderToEditValues } from "./edit-order";
import { statusTransition, transitionNeedsDialog, transitionNeedsReason } from "./permissions";
import { mapLogistOrder } from "./types";

describe("A4: «Yetkazildi» — ikkinchi qadam tasdig'i", () => {
  it("`shipping → delivered` darhol yuborilmaydi, oyna ochiladi", () => {
    const kind = statusTransition("shipping", "delivered");
    expect(kind).toBe("deliver");
    expect(transitionNeedsDialog(kind)).toBe(true);
    // Sabab so'ralmaydi — faqat tasdiq.
    expect(transitionNeedsReason(kind)).toBe(false);
  });

  it("sabab oynalari ham dialog orqali, `ship` esa alohida oynada", () => {
    expect(transitionNeedsDialog(statusTransition("shipping", "cancelled"))).toBe(true);
    expect(transitionNeedsDialog(statusTransition("delivered", "shipping"))).toBe(true);
    expect(transitionNeedsDialog(statusTransition("confirmed", "shipping"))).toBe(false);
  });
});

describe("C5: yetkazilgan buyurtma tahriri — sabab `note` da", () => {
  const order = mapLogistOrder({
    id: "a",
    status: "delivered",
    items: [{ id: "l1", product: { id: 1, title: "A" }, quantity: 1, price: "1000" }],
  });

  it("faqat `delivered` da majburiy", () => {
    expect(editReasonRequired("delivered")).toBe(true);
    expect(editReasonRequired("shipping")).toBe(false);
  });

  it("sabab `change_reason` bilan birga `note` bo'lib ham ketadi", () => {
    const initial = orderToEditValues(order);
    const current = { ...initial, logistNote: "yangi izoh", changeReason: "mijoz qaytardi" };
    const patch = buildEditPatch(initial, current, { reasonAsNote: true });
    expect(patch).toMatchObject({ changeReason: "mijoz qaytardi", note: "mijoz qaytardi" });
    expect(buildEditPatch(initial, current)?.note).toBeUndefined();
  });
});
