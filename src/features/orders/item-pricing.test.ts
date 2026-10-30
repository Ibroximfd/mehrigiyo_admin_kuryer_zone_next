import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ItemPriceBadge } from "./components/item-price-badge";
import { ItemsSection } from "./components/order-detail/items-section";
import { waybillHtml } from "./components/waybill";
import { buildEditPatch, editItemPriceView, orderToEditValues } from "./edit-order";
import { asItemOffer, asPercent, itemPriceBadge, struckOriginalPrice } from "./item-pricing";
import { serializeOrderPatch } from "./order-patch";
import { mapLogistOrder } from "./types";

/**
 * Qatordagi chegirma/aksiya: parse, belgi, chizilgan asl narx va **lokal
 * hisob yo'qligi** — foiz, asl narx va dona narxi faqat serverdan.
 */

/**
 * O'lchangan operator qatorlari (test host, 2026-10-09) — kalitlar va pul
 * qiymatlari so'zma-so'z: `price` — ASL dona narxi, `total` — qator jami.
 */
const MEASURED = {
  discounted: JSON.parse(
    '{"id":101,"is_gift":false,"gift_source":null,"medicine":42,"medicine_name":"Hapwell-3","medicine_image":"/media/hapwell.png","quantity":1, "price":"250000.00", "total":"125000.00"}',
  ),
  discountedQty3: JSON.parse(
    '{"id":102,"is_gift":false,"gift_source":null,"medicine":42,"medicine_name":"Hapwell-3","medicine_image":"/media/hapwell.png","quantity":3,"price":"250000.00","total":"375000.00"}',
  ),
  legacy: JSON.parse(
    '{"id":103,"is_gift":false,"gift_source":null,"medicine":42,"medicine_name":"Hapwell-3","medicine_image":"/media/hapwell.png","quantity":1,"price":"250000.00","total":"250000.00"}',
  ),
  promoGift: JSON.parse(
    '{"id":104,"is_gift":true,"gift_source":"promotion","medicine":42,"medicine_name":"Hapwell-3","medicine_image":"/media/hapwell.png","quantity":1,"price":"250000.00","total":"0.00"}',
  ),
} as const;

/** Backendga so'ralgan yangi maydonlar — chegirma (so'zma-so'z). */
const NEW_DISCOUNT_FIELDS = JSON.parse(
  '{"unit_price": "125000.00", "original_price": "250000.00", "discount_percent": 50, "offer": {"kind":"discount","label":"-50%","percent":50}}',
);

/** Aksiya narxi: `discount_percent` = 0, `offer.kind` = promo, yorliq — admin matni. */
const NEW_PROMO_FIELDS = {
  unit_price: "125000.00",
  original_price: "250000.00",
  discount_percent: 0,
  offer: { kind: "promo_price_bonus", label: "1+1", percent: 0 },
};

function orderWith(...items: unknown[]) {
  return mapLogistOrder({
    id: "uuid-offer",
    order_number: "DA-900777",
    status: "confirmed",
    client: { full_name: "Shuxrat aka", phones: ["+998940603906"] },
    payment: { method: "cash", status: "cod_pending" },
    items,
    total_amount: 125000,
    payable_amount: 125000,
    created_at: "2026-10-09T09:00:00Z",
  });
}

const firstItem = (...items: unknown[]) => orderWith(...items).items[0]!;

describe("mapLogistOrder — o'lchangan qator (yangi maydonsiz)", () => {
  it("chegirmali qator: jami `total`, dona narxi YO'Q, belgi yo'q", () => {
    const item = firstItem(MEASURED.discounted);
    expect(item).toMatchObject({
      name: "Hapwell-3",
      quantity: 1,
      price: 125000,
      serverUnitPrice: null,
      originalPrice: null,
      discountPercent: 0,
      offer: null,
    });
    expect(itemPriceBadge(item)).toBeNull();
  });

  it("`medicine` FK id (son) — mahsulot id si", () => {
    expect(firstItem(MEASURED.discounted).productId).toBe(42);
  });

  it("3 dona: jami 375 000, dona narxi `price` (asl narx) dan olinmaydi", () => {
    const item = firstItem(MEASURED.discountedQty3);
    expect(item.price).toBe(375000);
    expect(item.serverUnitPrice).toBeNull();
  });

  it("eski (narxi muhrlangan) buyurtma: jami 250 000, chegirma o'ylab topilmaydi", () => {
    const item = firstItem(MEASURED.legacy);
    expect(item.price).toBe(250000);
    expect(itemPriceBadge(item)).toBeNull();
  });

  it("aksiya sovg'asi: jami 0, manba `promotion`, belgi yo'q", () => {
    const item = firstItem(MEASURED.promoGift);
    expect(item).toMatchObject({ isGift: true, giftSource: "promotion", price: 0 });
    expect(itemPriceBadge(item)).toBeNull();
  });
});

describe("mapLogistOrder — yangi maydonlar bilan", () => {
  it("chegirma: dona narxi, asl narx, foiz va taklif serverdan", () => {
    const item = firstItem({ ...MEASURED.discounted, ...NEW_DISCOUNT_FIELDS });
    expect(item).toMatchObject({
      price: 125000,
      serverUnitPrice: 125000,
      originalPrice: 250000,
      discountPercent: 50,
      offer: { kind: "discount", label: "-50%", percent: 50 },
    });
    expect(itemPriceBadge(item)).toEqual({ tone: "discount", label: "-50%", fromServer: true });
    expect(
      struckOriginalPrice({ isGift: false, unitPrice: item.serverUnitPrice, originalPrice: item.originalPrice }),
    ).toBe(250000);
  });

  it("aksiya: admin yorlig'i aksiya tonida", () => {
    const item = firstItem({ ...MEASURED.discounted, ...NEW_PROMO_FIELDS });
    expect(item.offer).toEqual({ kind: "promo_price_bonus", label: "1+1", percent: 0 });
    expect(itemPriceBadge(item)).toEqual({ tone: "promo", label: "1+1", fromServer: true });
  });

  it("lokal hisob YO'Q: server `unit_price` boshqa raqam bersa o'sha chiqadi", () => {
    // total / quantity = 125 000, `price` = 250 000 — ikkalasi ham emas.
    const item = firstItem({ ...MEASURED.discountedQty3, unit_price: "99000.00" });
    expect(item.serverUnitPrice).toBe(99000);
    expect(item.price).toBe(375000);
  });

  it("foiz bor-u `offer` yo'q — server foizi qizil `−N%`", () => {
    const item = firstItem({ ...MEASURED.discounted, discount_percent: "50.00", offer: null });
    expect(item.discountPercent).toBe(50);
    expect(itemPriceBadge(item)).toEqual({ tone: "discount", label: "−50%", fromServer: false });
  });

  it("sovg'a qatori taklif bilan kelsa ham belgi va chizilgan narx olmaydi", () => {
    const item = firstItem({ ...MEASURED.promoGift, ...NEW_PROMO_FIELDS });
    expect(itemPriceBadge(item)).toBeNull();
    expect(
      struckOriginalPrice({ isGift: true, unitPrice: item.serverUnitPrice, originalPrice: item.originalPrice }),
    ).toBeNull();
  });

  it("`02` §5 shakli (`unit_price` + `price` = jami, `total` yo'q)", () => {
    const item = firstItem({ id: 1, name: "Rayhon krem", quantity: 2, unit_price: 300000, price: 600000 });
    expect(item.price).toBe(600000);
    expect(item.serverUnitPrice).toBe(300000);
  });
});

describe("asItemOffer / asPercent — chidamlilik", () => {
  it("noma'lum tur `other`, yorlig'i saqlanadi", () => {
    expect(asItemOffer({ kind: "flash_sale", label: "Tun aksiyasi" })).toEqual({
      kind: "other",
      label: "Tun aksiyasi",
      percent: 0,
    });
  });

  it("ko'rsatadigan narsasi yo'q taklif — `null`, sayt buzilmaydi", () => {
    for (const raw of [null, undefined, "discount", 5, [], {}, { kind: "whatever" }]) {
      expect(asItemOffer(raw)).toBeNull();
    }
  });

  it("foiz faqat (0, 100] oralig'ida", () => {
    expect(asPercent(50)).toBe(50);
    expect(asPercent("12.50")).toBe(12.5);
    for (const raw of [0, "0.00", -5, 150, "abc", null, undefined]) {
      expect(asPercent(raw)).toBe(0);
    }
  });
});

describe("itemPriceBadge — zaxira yorliqlar", () => {
  const base = { isGift: false, discountPercent: 0 };

  it("yorliqsiz chegirma — taklif foizi", () => {
    expect(itemPriceBadge({ ...base, offer: { kind: "discount", label: "", percent: 30 } })).toEqual({
      tone: "discount",
      label: "−30%",
      fromServer: false,
    });
  });

  it("yorliqsiz aksiya — \"Aksiya\"", () => {
    expect(itemPriceBadge({ ...base, offer: { kind: "promo_price", label: "", percent: 0 } })).toEqual({
      tone: "promo",
      label: "Aksiya",
      fromServer: false,
    });
  });

  it("noma'lum tur aksiya tonida", () => {
    expect(itemPriceBadge({ ...base, offer: { kind: "other", label: "Tun aksiyasi", percent: 0 } })?.tone).toBe(
      "promo",
    );
  });
});

describe("struckOriginalPrice — faqat server dona narxi yonida", () => {
  it("dona narxi yo'q — asl narx chizilmaydi (jami yonida yolg'on bo'lardi)", () => {
    expect(struckOriginalPrice({ isGift: false, unitPrice: null, originalPrice: 250000 })).toBeNull();
  });

  it("asl narx dona narxiga teng — chizilmaydi", () => {
    expect(struckOriginalPrice({ isGift: false, unitPrice: 250000, originalPrice: 250000 })).toBeNull();
  });
});

describe("tarkib bo'limi — chizilishi", () => {
  it("yangi maydonlar bilan: qizil belgi, chizilgan asl narx va dona narxi", () => {
    const html = renderToStaticMarkup(
      createElement(ItemsSection, { order: orderWith({ ...MEASURED.discountedQty3, ...NEW_DISCOUNT_FIELDS }) }),
    );
    expect(html).toContain("bg-danger-soft text-danger");
    expect(html).toContain(">-50%</span>");
    expect(html).toContain("<s");
    expect(html).toMatch(/<s[^>]*>250 000<\/s>125 000 so&#x27;m \/ dona/);
    expect(html).toContain("375 000 so&#x27;m");
  });

  it("yangi maydonsiz: faqat jami va soni, dona narxi ham belgi ham yo'q", () => {
    const html = renderToStaticMarkup(createElement(ItemsSection, { order: orderWith(MEASURED.discounted) }));
    expect(html).toContain("125 000 so&#x27;m");
    expect(html).toContain("×1");
    expect(html).not.toContain("250 000");
    expect(html).not.toContain("/ dona");
    expect(html).not.toContain("text-danger");
  });

  it("aksiya belgisi aksiya tonida va server matni o'girilmaydi", () => {
    const html = renderToStaticMarkup(
      createElement(ItemPriceBadge, {
        item: { isGift: false, discountPercent: 0, offer: { kind: "promo_price", label: "1+1", percent: 0 } },
      }),
    );
    expect(html).toContain("bg-gold-soft text-gold");
    expect(html).toContain("text-micro");
    expect(html).toContain('data-no-translit="true"');
    expect(html).toContain(">1+1<");
  });
});

describe("tahrir — qator narxi katagi", () => {
  it("server dona narxi bo'lsa — dona narxi, asl narx chizilgan", () => {
    const values = orderToEditValues(orderWith({ ...MEASURED.discounted, ...NEW_DISCOUNT_FIELDS }));
    const item = values.items[0]!;
    expect(editItemPriceView(item)).toEqual({ kind: "unit", amount: 125000, struck: 250000 });
    // Son o'zgarsa ham dona narxi to'g'ri qoladi.
    expect(editItemPriceView({ ...item, quantity: 4 })).toEqual({ kind: "unit", amount: 125000, struck: 250000 });
  });

  it("dona narxi yo'q — son o'zgarmaguncha qator jami, keyin \"—\"", () => {
    const values = orderToEditValues(orderWith(MEASURED.discounted));
    const item = values.items[0]!;
    // Avval bu yerda `price` (250 000 — asl narx) dona narxi bo'lib turardi.
    expect(editItemPriceView(item)).toEqual({ kind: "total", amount: 125000 });
    expect(editItemPriceView({ ...item, quantity: 2 })).toEqual({ kind: "pending" });
  });

  it("katalogdan qo'shilgan qator — qidiruvdagi narx", () => {
    expect(
      editItemPriceView({ isGift: false, quantity: 1, catalogPrice: 125000, linePrice: null }),
    ).toEqual({ kind: "unit", amount: 125000, struck: null });
  });

  it("narx tafsiloti PATCH ga ketmaydi va o'zgarish hisoblanmaydi", () => {
    const initial = orderToEditValues(orderWith({ ...MEASURED.discounted, ...NEW_DISCOUNT_FIELDS }));
    expect(buildEditPatch(initial, { ...initial })).toBeNull();

    const current = { ...initial, items: initial.items.map((item) => ({ ...item, quantity: 2 })) };
    const patch = buildEditPatch(initial, current);
    expect(serializeOrderPatch(patch!)).toEqual({
      items: [{ id: "101", product_id: 42, quantity: 2, is_gift: false }],
    });
  });
});

describe("yo'l varaqasi — chegirma/aksiya belgisi", () => {
  const html = waybillHtml(
    orderWith(
      { ...MEASURED.discounted, ...NEW_DISCOUNT_FIELDS },
      { ...MEASURED.discounted, id: 105, medicine_name: "Alatoo", ...NEW_PROMO_FIELDS },
      { ...MEASURED.discounted, id: 106, medicine_name: "Omega", discount_percent: 20 },
      MEASURED.promoGift,
    ),
  );
  const body = html.slice(html.indexOf("<tbody>"), html.indexOf("</tbody>"));

  it("ixcham matn: server yorlig'i o'girilmaydi, foiz yozuvi esa matn", () => {
    expect(body).toContain('Hapwell-3</span> (<span data-no-translit>-50%</span>)');
    expect(body).toContain('Alatoo</span> (<span data-no-translit>1+1</span>)');
    expect(body).toContain("Omega</span> (−20%)");
  });

  it("sovg'a qatori qoladi va chegirma belgisini olmaydi", () => {
    expect(body.match(/<tr>/g)).toHaveLength(4);
    expect(body).toContain("Hapwell-3</span> (Aksiya sovg'asi)");
  });

  it("Summa ustuni — qator jami (`total`)", () => {
    expect(body).toContain("125 000 so'm");
    expect(body).toContain("0 so'm");
  });
});
