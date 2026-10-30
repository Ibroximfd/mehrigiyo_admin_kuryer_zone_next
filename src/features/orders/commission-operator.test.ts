import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api-client";

import {
  defaultCommissionOperatorId,
  isOperatorForbiddenError,
  isOperatorInvalidError,
  isOperatorRequiredError,
  isRecommendationOrder,
  needsCommissionOperator,
  operatorCandidates,
  parseOperatorId,
} from "./commission-operator";
import {
  buildEditPatch,
  editDrift,
  missingOperator,
  orderToEditValues,
} from "./edit-order";
import { serializeOrderPatch } from "./order-patch";
import { mapLogistOrder } from "./types";

const base = {
  id: "o1",
  order_number: "ORD-1",
  status: "confirmed",
  total_amount: 101000,
  source: "mehrigiyo",
  client: { full_name: "Ibroxim", phones: ["+998949355757"] },
  items: [
    {
      id: "10",
      product_id: 55,
      medicine_name: "Paratsetamol",
      quantity: 1,
      price: 101000,
    },
  ],
  payment: { method: "click", status: "online_pending" },
};

const recommended = mapLogistOrder({
  ...base,
  created_by: { kind: "client" },
  operator_recommendation: { id: 77, operator: { id: 9, full_name: "Aziz" } },
  responsible_operator: { id: 7, name: "ibroxim_test" },
  lead: { assigned_to: { id: 7, full_name: "ibroxim_test" } },
});

const plain = mapLogistOrder({
  ...base,
  created_by: { kind: "client" },
  responsible_operator: { id: 7, name: "ibroxim_test" },
});

describe("komissiya egasini aniqlash", () => {
  it("tavsiya operatori birinchi, takrorlar tashlanadi, shifokor kirmaydi", () => {
    const candidates = operatorCandidates(recommended);
    expect(candidates.map((item) => [item.id, item.source])).toEqual([
      [9, "recommendation"],
      [7, "responsible"],
    ]);
    expect(defaultCommissionOperatorId(recommended)).toBe(9);

    const doctorOrder = mapLogistOrder({
      ...base,
      created_by: { kind: "doctor", id: 3, name: "Dr" },
      doctor: { id: 3, name: "Dr" },
    });
    expect(operatorCandidates(doctorOrder)).toEqual([]);
    expect(defaultCommissionOperatorId(doctorOrder)).toBeNull();
  });

  it("tavsiyasiz buyurtmada mas'ul operator; yaratgan operator ham nomzod", () => {
    expect(defaultCommissionOperatorId(plain)).toBe(7);
    const byOperator = mapLogistOrder({
      ...base,
      created_by: { kind: "operator", id: 4, name: "Olim" },
    });
    expect(defaultCommissionOperatorId(byOperator)).toBe(4);
  });

  it("yolg'iz `operator_id` va `recommendation_id` ham o'qiladi", () => {
    const bare = mapLogistOrder({
      ...base,
      operator_id: 12,
      recommendation_id: 5,
    });
    expect(bare.recommendationId).toBe(5);
    expect(defaultCommissionOperatorId(bare)).toBe(12);
    expect(isRecommendationOrder(bare)).toBe(true);
  });

  it("tavsiya belgisi", () => {
    expect(isRecommendationOrder(recommended)).toBe(true);
    expect(isRecommendationOrder(plain)).toBe(false);
    expect(
      isRecommendationOrder(
        mapLogistOrder({ ...base, source: "operator_recommendation" }),
      ),
    ).toBe(true);
  });

  it("server xatosini faqat kod bo'yicha taniydi (backend tasdiqlagan shakl)", () => {
    const required = {
      code: "operator_required",
      detail: "Komissiya egasini ko'rsating",
      fields: { operator_id: ["Komissiya egasini ko'rsating"] },
    };
    expect(
      isOperatorRequiredError(
        new ApiError(required.detail, 400, required, "operator_required"),
      ),
    ).toBe(true);
    // Kodsiz javob endi taxmin qilinmaydi.
    expect(
      isOperatorRequiredError(new ApiError("operator_id ni yuboring", 400, {})),
    ).toBe(false);
    expect(isOperatorRequiredError(new Error("operator_id"))).toBe(false);
  });

  it("field_not_allowed: `fields` lug'atida operator_id bo'lsa — taqiq; noma'lum maydonda `fields` yo'q", () => {
    const forbidden = {
      code: "field_not_allowed",
      detail:
        "`operator_id` faqat operator tavsiyasi orqali kelgan buyurtmaning tarkibi o'zgarganda yuboriladi",
      fields: {
        operator_id: ["Bu buyurtmada komissiya egasini o'zgartirib bo'lmaydi"],
      },
    };
    expect(
      isOperatorForbiddenError(
        new ApiError(forbidden.detail, 400, forbidden, "field_not_allowed"),
      ),
    ).toBe(true);
    const unknown = {
      code: "field_not_allowed",
      detail: "Ruxsatsiz maydon: total_amount",
    };
    expect(
      isOperatorForbiddenError(
        new ApiError(unknown.detail, 400, unknown, "field_not_allowed"),
      ),
    ).toBe(false);
    const other = {
      code: "field_not_allowed",
      detail: "x",
      fields: { items: ["..."], discount_percent: ["..."] },
    };
    expect(
      isOperatorForbiddenError(
        new ApiError("x", 400, other, "field_not_allowed"),
      ),
    ).toBe(false);
  });

  it("qo'lda ID: faqat musbat butun son", () => {
    expect(parseOperatorId(" 7 ")).toBe(7);
    expect(parseOperatorId("0")).toBeNull();
    expect(parseOperatorId("7a")).toBeNull();
    expect(parseOperatorId("")).toBeNull();
  });
});

describe("tahrir PATCH va `operator_id`", () => {
  const initial = orderToEditValues(recommended);
  const moreItems = {
    ...initial,
    items: initial.items.map((item) => ({ ...item, quantity: 4 })),
  };

  it("forma ochilganda operator avtomatik tanlangan", () => {
    expect(initial.operatorId).toBe(9);
  });

  it("tarkib o'zgarsa va talab qilinsa — `operator_id` yuboriladi", () => {
    const patch = buildEditPatch(initial, moreItems, {
      operatorRequired: true,
    });
    expect(patch?.operatorId).toBe(9);
    expect(serializeOrderPatch(patch!)).toMatchObject({ operator_id: 9 });
  });

  it("talab qilinmasa yoki tarkib o'zgarmasa — yuborilmaydi (komissiya ko'chmasin)", () => {
    expect(buildEditPatch(initial, moreItems)?.operatorId).toBeUndefined();
    const onlyAddress = {
      ...initial,
      addressText: "Yangi manzil",
      operatorId: 7,
    };
    const patch = buildEditPatch(initial, onlyAddress, {
      operatorRequired: true,
    });
    expect(patch).toEqual({ addressText: "Yangi manzil" });
    // Faqat operator o'zgarsa — saqlanadigan narsa yo'q (logist mas'ulni almashtirmaydi).
    expect(
      buildEditPatch(
        initial,
        { ...initial, operatorId: 7 },
        { operatorRequired: true },
      ),
    ).toBeNull();
  });

  it("operator yo'q bo'lsa forma saqlashdan oldin to'xtaydi", () => {
    const noOperator = { ...moreItems, operatorId: null };
    expect(missingOperator(initial, noOperator, true)).toBe(true);
    expect(missingOperator(initial, noOperator, false)).toBe(false);
    expect(
      missingOperator(initial, { ...initial, operatorId: null }, true),
    ).toBe(false);
  });

  it("tahrir PATCH hech qachon statusni yoki to'lovni o'zi qo'shmaydi", () => {
    const json = serializeOrderPatch(
      buildEditPatch(initial, moreItems, { operatorRequired: true })!,
    );
    expect(json).not.toHaveProperty("status");
    expect(json).not.toHaveProperty("payment_method");
  });
});

describe("ochiq forma va boshqa joydagi o'zgarish", () => {
  const opened = orderToEditValues(plain);

  it("birovning o'zgarishi yuborilmaydi va ziddiyat aniqlanadi", () => {
    const latest = { ...opened, region: "fargona", courierId: 4 };
    const mine = {
      ...opened,
      addressText: "Toshkent, Yashnobod",
      courierId: 5,
    };

    expect(editDrift(opened, latest, mine)).toEqual({
      remote: ["region", "courierId"],
      conflicts: ["courierId"],
    });
    // Diff ochilgan nusxaga nisbatan — viloyat (birovniki) yuborilmaydi.
    expect(buildEditPatch(opened, mine)).toEqual({
      addressText: "Toshkent, Yashnobod",
      courierId: 5,
    });
  });
});

describe("2026-10-01 §5.5 — komissiya egasi kodlari", () => {
  it('`operator_invalid` va `field_not_allowed` — "so\'radi" EMAS', () => {
    const fields = { fields: { operator_id: 9 } };
    expect(
      isOperatorRequiredError(
        new ApiError("x", 400, fields, "operator_invalid"),
      ),
    ).toBe(false);
    expect(
      isOperatorRequiredError(
        new ApiError("x", 400, fields, "field_not_allowed"),
      ),
    ).toBe(false);
    expect(
      isOperatorInvalidError(
        new ApiError("x", 400, fields, "operator_invalid"),
      ),
    ).toBe(true);
    expect(
      isOperatorForbiddenError(
        new ApiError("x", 400, fields, "field_not_allowed"),
      ),
    ).toBe(true);
    expect(
      isOperatorForbiddenError(
        new ApiError(
          "x",
          400,
          { fields: { tags: ["x"] } },
          "field_not_allowed",
        ),
      ),
    ).toBe(false);
  });

  it("`recommendation {id, operator}` bloki (backend misoli) o'qiladi", () => {
    const order = mapLogistOrder({
      ...base,
      created_by: { kind: "client" },
      recommendation: {
        id: 77,
        operator: { id: 9, full_name: "Aziz Karimov", phone: "998901234567" },
      },
    });
    expect(order.recommendationId).toBe(77);
    expect(order.recommendationOperator).toEqual({
      id: 9,
      name: "Aziz Karimov",
      phone: "998901234567",
    });
    expect(needsCommissionOperator(order)).toBe(true);
  });

  it("egasi bor (operator yaratgan) buyurtmada `operator_id` so'ralmaydi (pul qulfi)", () => {
    const owned = mapLogistOrder({
      ...base,
      created_by: { kind: "operator", id: 7, name: "Dilnoza" },
      recommendation: { id: 77, operator: { id: 9, full_name: "Aziz" } },
    });
    expect(needsCommissionOperator(owned)).toBe(false);
  });
});
