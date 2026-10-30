import { describe, expect, it } from "vitest";

import { waybillHtml } from "./components/waybill";
import { asGiftSource, giftSourceLabel } from "./gift-source";
import { mapLogistOrder } from "./types";

/**
 * Aksiya sovg'asi: `gift_source` parse va yorliq, hamda **yo'l varaqasida
 * sovg'a qatori qolishi** — kuryer uni ham olib ketishi kerak.
 */

/** Bitta to'lanadigan qator + bitta aksiya sovg'asi (summasi `0`). */
const ORDER_WITH_GIFT = {
  id: "uuid-gift",
  order_number: "DA-900001",
  status: "confirmed",
  client: { full_name: "Shuxrat aka", phones: ["+998940603906"] },
  payment: { method: "cash", status: "cod_pending" },
  items: [
    {
      id: 1,
      product_id: 55,
      medicine_name: "Rayhon krem",
      quantity: 2,
      price: 300000,
      total: 600000,
      is_gift: false,
      gift_source: null,
    },
    {
      id: 2,
      product_id: 77,
      medicine_name: "Alatoo",
      quantity: 1,
      price: 0,
      total: "0.00",
      is_gift: true,
      gift_source: "promotion",
      discount_percent: "0.00",
    },
  ],
  total_amount: 600000,
  payable_amount: 600000,
  created_at: "2026-10-08T09:00:00Z",
};

describe("asGiftSource", () => {
  it("sanalgan qiymatlarni o'qiydi", () => {
    expect(asGiftSource("promotion")).toBe("promotion");
    expect(asGiftSource("loyalty")).toBe("loyalty");
    expect(asGiftSource("operator")).toBe("operator");
  });

  it("shartnomadagi `manual` — operator qiymati", () => {
    expect(asGiftSource("manual")).toBe("operator");
  });

  it("katta-kichik harf va chetdagi bo'shliq ahamiyatsiz", () => {
    expect(asGiftSource(" Promotion ")).toBe("promotion");
  });

  it("noma'lum qiymat `null` — sayt buzilmaydi", () => {
    for (const raw of ["whatever", "", "  ", null, undefined, 7, {}, []]) {
      expect(asGiftSource(raw)).toBeNull();
    }
  });
});

describe("giftSourceLabel", () => {
  it("har manba o'z yorlig'ini oladi", () => {
    expect(giftSourceLabel("promotion")).toBe("Aksiya sovg'asi");
    expect(giftSourceLabel("loyalty")).toBe("Mijoz sovg'asi");
    expect(giftSourceLabel("operator")).toBe("Operator qo'shgan");
  });

  it("manba yo'q yoki noma'lum — oddiy \"Sovg'a\"", () => {
    expect(giftSourceLabel(null)).toBe("Sovg'a");
    expect(giftSourceLabel(asGiftSource("future_source"))).toBe("Sovg'a");
  });
});

describe("mapLogistOrder — qator sovg'a manbasi", () => {
  const order = mapLogistOrder(ORDER_WITH_GIFT);

  it("aksiya sovg'asi qatori o'qiladi", () => {
    expect(order.items).toHaveLength(2);
    expect(order.items[1]).toMatchObject({
      name: "Alatoo",
      isGift: true,
      giftSource: "promotion",
      price: 0,
    });
  });

  it("to'lanadigan qatorda manba `null`", () => {
    expect(order.items[0]?.isGift).toBe(false);
    expect(order.items[0]?.giftSource).toBeNull();
  });

  it("`gift_source` kelmasa ham parser yiqilmaydi", () => {
    const legacy = mapLogistOrder({
      ...ORDER_WITH_GIFT,
      items: [{ id: 3, product_id: 77, medicine_name: "Alatoo", quantity: 1, is_gift: true }],
    });
    expect(legacy.items[0]?.giftSource).toBeNull();
    expect(legacy.items[0]?.isGift).toBe(true);
  });
});

describe("yo'l varaqasi — sovg'a qatori tushib qolmaydi", () => {
  const html = waybillHtml(mapLogistOrder(ORDER_WITH_GIFT));

  it("nol summali sovg'a qatori ham chiqadi", () => {
    expect(html).toContain("Alatoo");
    expect(html).toContain("Rayhon krem");
    // Tarkib filtrlanmaydi: ikkala qator ham tanada (sarlavha qatori emas).
    const body = html.slice(html.indexOf("<tbody>"), html.indexOf("</tbody>"));
    expect(body.match(/<tr>/g)).toHaveLength(2);
  });

  it("sovg'a qatori manbasi bilan belgilanadi", () => {
    expect(html).toContain("(Aksiya sovg'asi)");
  });

  it("to'lanadigan qatorga sovg'a yorlig'i qo'yilmaydi", () => {
    expect(html).not.toContain("Rayhon krem</span> (");
  });
});
