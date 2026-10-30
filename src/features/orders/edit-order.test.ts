import { describe, expect, it } from "vitest";

import {
  buildEditPatch,
  changedEditFields,
  editOrderSchema,
  orderToEditValues,
} from "./edit-order";
import { serializeOrderPatch } from "./order-patch";
import { mapLogistOrder } from "./types";

const order = mapLogistOrder({
  id: "o1",
  order_number: "DA-184011",
  status: "confirmed",
  total_amount: 980000,
  client: {
    full_name: "Bekzod Rahimov",
    phones: ["+998914004040", "+998935005050"],
    ordered_for_phone: "+998914004040",
  },
  delivery: {
    region: "buxoro",
    address_text: "Buxoro sh., Ko'chabog' 12",
    delivery_date: "2026-09-28",
    delivery_window: "morning",
    courier: null,
  },
  items: [{ id: "10", product_id: 55, medicine_name: "Rayhon krem", quantity: 2, price: 490000 }],
  box_count: 1,
  gift_comment: "Sedana yog'i sovg'a",
  payment: { method: "cash", status: "cod_pending" },
  tags: ["big"],
  logist_note: "",
});

describe("buildEditPatch", () => {
  it("hech narsa o'zgarmasa null — Saqlash o'chiq", () => {
    const initial = orderToEditValues(order);
    expect(buildEditPatch(initial, { ...initial })).toBeNull();
    // Sabab yozilgani o'zgarish emas.
    expect(buildEditPatch(initial, { ...initial, changeReason: "shunchaki" })).toBeNull();
  });

  it("faqat o'zgargan kalitlar yuboriladi", () => {
    const initial = orderToEditValues(order);
    const current = {
      ...initial,
      deliveryDate: "2026-09-29",
      addressText: "Buxoro sh., Ko'chabog' 12, 2-qavat",
      courierId: 4,
      changeReason: "Mijoz so'radi",
    };
    const patch = buildEditPatch(initial, current);
    expect(patch).toEqual({
      deliveryDate: "2026-09-29",
      addressText: "Buxoro sh., Ko'chabog' 12, 2-qavat",
      courierId: 4,
      changeReason: "Mijoz so'radi",
    });
    expect(changedEditFields(initial, current)).toEqual([
      "deliveryDate",
      "addressText",
      "courierId",
    ]);
    expect(serializeOrderPatch(patch!)).toEqual({
      courier_id: 4,
      delivery_date: "2026-09-29",
      delivery_address_text: "Buxoro sh., Ko'chabog' 12, 2-qavat",
      change_reason: "Mijoz so'radi",
    });
  });

  it("mahalla: faqat o'zgarsa `locality` ketadi, tozalash — null (HUDUD_3 §1)", () => {
    const initial = orderToEditValues(order);
    expect(initial.locality).toBe("");
    const patch = buildEditPatch(initial, { ...initial, locality: " Navbahor MFY " });
    expect(patch).toEqual({ locality: "Navbahor MFY" });
    expect(serializeOrderPatch(patch!)).toEqual({ locality: "Navbahor MFY" });

    const withLocality = orderToEditValues(
      mapLogistOrder({ id: "o2", status: "confirmed", delivery: { locality: "Beshariq" }, items: [] }),
    );
    expect(withLocality.locality).toBe("Beshariq");
    expect(buildEditPatch(withLocality, { ...withLocality, locality: "" })).toEqual({ locality: null });
  });

  it("tuman: kod o'zgarsa `district` ketadi, tozalansa null; o'zgarmasa kalit yo'q (backend #3)", () => {
    const zoned = orderToEditValues(
      mapLogistOrder({
        id: "o3",
        status: "confirmed",
        delivery: { region: "fargona", district: "fargona/qoqon_sh", district_display: "Qo'qon sh.", address_text: "Turkiston 7" },
        items: [],
      }),
    );
    expect(zoned.district).toBe("fargona/qoqon_sh");
    expect(buildEditPatch(zoned, { ...zoned })).toBeNull();

    const repicked = buildEditPatch(zoned, { ...zoned, district: "fargona/rishton" });
    expect(repicked).toEqual({ district: "fargona/rishton" });
    expect(serializeOrderPatch(repicked!)).toEqual({ district: "fargona/rishton" });
    expect(buildEditPatch(zoned, { ...zoned, district: "" })).toEqual({ district: null });
    expect(changedEditFields(zoned, { ...zoned, district: "" })).toEqual(["district"]);
  });

  it("qo'lda tuman: `district` null, nom manzil matni boshiga qo'shiladi (CRM bilan bir xil)", () => {
    const initial = orderToEditValues(order);
    const manual = {
      ...initial,
      district: "",
      districtManual: true,
      districtManualName: " Yangihayot ",
    };
    expect(changedEditFields(initial, manual)).toEqual(["district", "addressText"]);
    expect(buildEditPatch(initial, manual)).toEqual({
      district: null,
      addressText: "Yangihayot, Buxoro sh., Ko'chabog' 12",
    });
    // Rejim yoqilib, nom yozilmagan bo'lsa — hali o'zgarish yo'q.
    expect(buildEditPatch(initial, { ...initial, districtManual: true })).toBeNull();
    // Matn allaqachon tuman bilan boshlansa — takrorlanmaydi.
    expect(
      buildEditPatch(initial, {
        ...manual,
        addressText: "yangihayot, Buxoro sh., Ko'chabog' 12",
      }),
    ).toEqual({ district: null, addressText: "yangihayot, Buxoro sh., Ko'chabog' 12" });
  });

  it("bo'sh joy farqi o'zgarish emas, tozalash esa null", () => {
    const initial = orderToEditValues(order);
    expect(buildEditPatch(initial, { ...initial, giftComment: " Sedana yog'i sovg'a " })).toBeNull();
    expect(buildEditPatch(initial, { ...initial, giftComment: "" })).toEqual({ giftComment: null });
    expect(buildEditPatch(initial, { ...initial, boxCount: "" })).toEqual({ boxCount: null });
    expect(buildEditPatch(initial, { ...initial, boxCount: "3" })).toEqual({ boxCount: 3 });
  });

  it("tarkib va teglar: tartibsiz teg bir xil, soni o'zgarsa to'liq ro'yxat", () => {
    const initial = orderToEditValues(order);
    expect(buildEditPatch(initial, { ...initial, tags: ["big"] })).toBeNull();

    const firstItem = initial.items[0]!;
    const patch = buildEditPatch(initial, {
      ...initial,
      items: [{ ...firstItem, quantity: 3 }],
    });
    expect(serializeOrderPatch(patch!)).toEqual({
      items: [{ id: "10", product_id: 55, quantity: 3, is_gift: false }],
    });
  });
});

describe("editOrderSchema", () => {
  it("boshlang'ich qiymatlar yaroqli, noto'g'ri telefon/quti rad etiladi", () => {
    const initial = orderToEditValues(order);
    expect(editOrderSchema.safeParse(initial).success).toBe(true);
    expect(editOrderSchema.safeParse({ ...initial, orderedForPhone: "12" }).success).toBe(false);
    expect(editOrderSchema.safeParse({ ...initial, boxCount: "1.5" }).success).toBe(false);
    expect(editOrderSchema.safeParse({ ...initial, items: [] }).success).toBe(false);
  });

  it("qo'lda tuman — nomi majburiy; yig'ilgan manzil 500 dan oshmasin", () => {
    const initial = orderToEditValues(order);
    const manual = editOrderSchema.safeParse({ ...initial, districtManual: true, districtManualName: " " });
    expect(manual.success).toBe(false);
    expect(manual.error?.issues.map((issue) => issue.path.join("."))).toContain("districtManualName");
    expect(
      editOrderSchema.safeParse({ ...initial, districtManual: true, districtManualName: "Yangihayot" }).success,
    ).toBe(true);
    const long = editOrderSchema.safeParse({
      ...initial,
      districtManual: true,
      districtManualName: "Yangihayot",
      addressText: "x".repeat(495),
    });
    expect(long.success).toBe(false);
    expect(long.error?.issues.map((issue) => issue.path.join("."))).toContain("addressText");
  });
});
