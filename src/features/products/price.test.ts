import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProductPriceText } from "./components/product-price-text";
import {
  isSellable,
  legacyFinalPrice,
  productAmount,
  productPriceText,
  readProductPrice,
} from "./price";
import { mapProduct } from "./types";

/**
 * Narx shartnomasi: aksiya mahsulotida `cost` asl narx bo'lib qoladi
 * (600 000) va faqat `price.amount` aksiya narxini (499 000) biladi.
 * Logistga boshqa raqam ko'rinishi — "jiddiy xatolik" (audit L-2);
 * shu yerdagi testlar aynan shuni qadaydi.
 */
const promo = {
  id: 1,
  title: "Rayhon krem",
  cost: 600000,
  discount: 0,
  price: {
    amount: 499000,
    currency: "UZS",
    display: "499 000 so'm",
    market: "UZ",
    original_display: "600 000 so'm",
    discount_percent: 17,
  },
};

/** O'lchangan `/shop/medicines/` javoblari (2026-10-09) — kalitlar so'zma-so'z. */
const MEASURED = {
  discounted: JSON.parse(
    '{"id":6,"cost":250000,"discount":50,"price":{"amount":125000,"currency":"UZS","display":"125 000 so\'m","market":"UZ","discount_percent":50,"original_display":"250 000 so\'m"}}',
  ),
  bonusPromo: JSON.parse(
    '{"id":2,"cost":1000,"discount":0,"price":{"amount":1000,"currency":"UZS","display":"1 000 so\'m","market":"UZ","discount_percent":0,"original_display":null},"offer":{"kind":"bonus","label":"Aksiya","percent":null,"ends_at":null}}',
  ),
};

describe("readProductPrice — uch holat", () => {
  it("obyekt kelsa O'SHA ustun, `cost` hisoblanmaydi", () => {
    expect(readProductPrice(promo)).toEqual({
      amount: 499000,
      currency: "UZS",
      display: "499 000 so'm",
      market: "UZ",
      originalDisplay: "600 000 so'm",
      discountPercent: 17,
      isLegacyFallback: false,
    });
  });

  it("kalit umuman yo'q — eski backend, `cost`/`discount` dan zaxira", () => {
    const price = readProductPrice({ cost: 600000, discount: 10 });
    expect(price).toMatchObject({
      amount: 540000,
      isLegacyFallback: true,
      display: "",
    });
  });

  it("kalit bor, qiymati `null` — bu bozorda narxi yo'q (zaxira EMAS)", () => {
    expect(
      readProductPrice({ cost: 600000, discount: 0, price: null }),
    ).toBeNull();
  });

  it("pul string bo'lib kelsa ham o'qiladi — qattiq cast yo'q", () => {
    expect(
      readProductPrice({
        price: { amount: "499000.00", display: "499 000 so'm" },
      }),
    ).toMatchObject({ amount: 499000, display: "499 000 so'm" });
  });

  it("`display` ning eski nomi (`formatted`) ham qabul qilinadi", () => {
    expect(
      readProductPrice({ price: { amount: 80000, formatted: "80 000 so'm" } }),
    ).toMatchObject({ display: "80 000 so'm" });
  });

  it("yalang'och son — summa, formatlash bizda qoladi", () => {
    expect(readProductPrice({ price: 499000 })).toMatchObject({
      amount: 499000,
      isLegacyFallback: true,
    });
  });

  it("bo'sh obyekt — narx yo'q, `0 so'm` EMAS", () => {
    expect(readProductPrice({ price: {} })).toBeNull();
    expect(readProductPrice({ price: "" })).toBeNull();
  });

  it("chegirma yo'q bo'lsa `original_display` — `null`, foiz — `0`", () => {
    expect(
      readProductPrice({
        price: { amount: 1370000, display: "1 370 000 so'm" },
      }),
    ).toMatchObject({ originalDisplay: null, discountPercent: 0 });
  });
});

describe("legacyFinalPrice — faqat `price` kaliti yo'q bo'lganda", () => {
  it("o'lchangan chegirmali mahsulotda zaxira hisob serverniki bilan mos, lekin ishlatilmaydi", () => {
    const product = mapProduct(MEASURED.discounted);
    expect(product.price?.isLegacyFallback).toBe(false);
    expect(productAmount(product)).toBe(125000);
    expect(legacyFinalPrice(product)).toBe(125000);
  });

  it("aksiya mahsulotida zaxira hisob YOLG'ON — shuning uchun `price` ustun", () => {
    const product = mapProduct(promo);
    expect(legacyFinalPrice(product)).toBe(600000);
    expect(productAmount(product)).toBe(499000);
  });

  it("`price` kaliti yo'q — zaxira ishlaydi va belgilanadi", () => {
    const product = mapProduct({ id: 9, cost: 250000, discount: 50 });
    expect(product.price).toMatchObject({ amount: 125000, isLegacyFallback: true });
    expect(productAmount(product)).toBe(125000);
  });
});

describe("mapProduct", () => {
  it("o'lchangan chegirmali mahsulot: narx satri va asl narx serverdan", () => {
    const product = mapProduct(MEASURED.discounted);
    expect(productPriceText(product)).toBe("125 000 so'm");
    expect(product.price?.originalDisplay).toBe("250 000 so'm");
    expect(product.price?.discountPercent).toBe(50);
  });

  it("o'lchangan bonus aksiya: narx o'zgarmagan, asl narx yo'q", () => {
    const product = mapProduct(MEASURED.bonusPromo);
    expect(productAmount(product)).toBe(1000);
    expect(productPriceText(product)).toBe("1 000 so'm");
    expect(product.price?.originalDisplay).toBeNull();
  });

  it("eski backend: satr o'zimizda formatlanadi (yagona joy)", () => {
    const product = mapProduct({ id: 2, cost: 600000, discount: 10 });
    expect(productPriceText(product)).toBe("540 000 so'm");
  });

  it("narxi yo'q mahsulot sotilmaydi va satr ham bermaydi", () => {
    const product = mapProduct({ id: 3, cost: 600000, price: null });
    expect(productAmount(product)).toBeNull();
    expect(productPriceText(product)).toBeNull();
    expect(isSellable(product)).toBe(false);
  });

  it("nofaol mahsulot ham sotilmaydi, lekin narxi ko'rinadi", () => {
    const product = mapProduct({ ...promo, is_active: false });
    expect(isSellable(product)).toBe(false);
    expect(productPriceText(product)).toBe("499 000 so'm");
  });

  it("faol va narxli mahsulot — sotiladi", () => {
    expect(isSellable(mapProduct(promo))).toBe(true);
  });
});

describe("ProductPriceText", () => {
  it("serverning `display` i va ustidan chizilgan `original_display`", () => {
    const html = renderToStaticMarkup(
      createElement(ProductPriceText, { product: mapProduct(MEASURED.discounted) }),
    );
    expect(html).toContain("125 000 so");
    expect(html).toContain("<s ");
    expect(html).toContain("250 000 so");
  });

  it("chegirmasiz mahsulotda chizilgan narx yo'q", () => {
    const html = renderToStaticMarkup(
      createElement(ProductPriceText, { product: mapProduct(MEASURED.bonusPromo) }),
    );
    expect(html).toContain("1 000 so");
    expect(html).not.toContain("<s ");
  });

  it("`price: null` — «Narxi yo'q», raqam EMAS", () => {
    const html = renderToStaticMarkup(
      createElement(ProductPriceText, {
        product: mapProduct({ id: 3, cost: 600000, price: null }),
        className: "text-meta",
      }),
    );
    expect(html).toContain("Narxi yo");
    expect(html).not.toContain("600");
    expect(html).toContain("text-meta");
  });
});
