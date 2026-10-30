import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api-client";

import { orderErrorMessage } from "./error-hints";
import { serializeOrderPatch } from "./order-patch";

describe("logist PATCH — manzil matni (HUDUD_JAVOBLAR_4 §5)", () => {
  it("addressText → `delivery_address_text`, `address_text` YUBORILMAYDI", () => {
    const json = serializeOrderPatch({ addressText: "Turkiston 7" });
    expect(json).toEqual({ delivery_address_text: "Turkiston 7" });
    expect(json).not.toHaveProperty("address_text");
  });

  it("null — tozalash ham yangi nom bilan", () => {
    expect(serializeOrderPatch({ addressText: null })).toEqual({ delivery_address_text: null });
  });
});

describe("field_not_allowed — o'qiladigan matn", () => {
  const fail = (data: Record<string, unknown>) =>
    new ApiError(String(data.detail ?? "x"), 400, data, "field_not_allowed");

  it("`fields` dagi maydon yorlig'i bilan", () => {
    const error = fail({
      code: "field_not_allowed",
      detail: "Ruxsatsiz maydon",
      fields: { address_text: ["Ruxsat yo'q"] },
    });
    expect(orderErrorMessage(error, "x")).toBe("Bu maydonni logist o'zgartira olmaydi: Manzil");
  });

  it("`fields` yo'q — server `detail` matni qo'shiladi", () => {
    const error = fail({ code: "field_not_allowed", detail: "Ruxsatsiz maydon: total_amount" });
    expect(orderErrorMessage(error, "x")).toBe(
      "Bu maydonni logist o'zgartira olmaydi — Ruxsatsiz maydon: total_amount",
    );
  });
});
