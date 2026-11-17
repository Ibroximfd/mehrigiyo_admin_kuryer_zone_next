import { describe, expect, it } from "vitest";

import { translateText } from "@/lib/i18n/translate";

import { asItemUnit, formatItemQuantity } from "./item-unit";
import { mapLogistOrder } from "./types";

const line = (patch: Partial<Parameters<typeof formatItemQuantity>[0]>) =>
  formatItemQuantity({ quantity: 1, unit: null, unitLabel: null, pieces: null, ...patch });

describe("zakaz qatori birligi (hujjat 77 §2)", () => {
  it("`unit` — faqat box/piece, qolgani `null`", () => {
    expect(asItemUnit("box")).toBe("box");
    expect(asItemUnit(" PIECE ")).toBe("piece");
    expect(asItemUnit("pack")).toBeNull();
    expect(asItemUnit(undefined)).toBeNull();
  });

  it("karobka: dona soni farq qilsa qavsda", () => {
    expect(line({ unit: "box", unitLabel: "karobka", pieces: 3 })).toBe("1 karobka (3 dona)");
    expect(line({ quantity: 2, unit: "box", unitLabel: "karobka", pieces: 2 })).toBe("2 karobka");
    expect(line({ quantity: 2, unit: "box", unitLabel: "karobka" })).toBe("2 karobka");
  });

  it("dona qatori va sovg'a — qavssiz, shablon nomi bilan", () => {
    expect(line({ unit: "piece", unitLabel: "dona", pieces: 1 })).toBe("1 dona");
    expect(line({ quantity: 2, unit: "piece", unitLabel: "flakon", pieces: 2 })).toBe("2 flakon");
  });

  it("eski javob (`unit_label` yo'q) — faqat son, avvalgidek", () => {
    expect(line({ quantity: 2 })).toBe("2");
    expect(line({ quantity: 2, unit: "box", pieces: 6 })).toBe("2");
  });

  it("rus tilida birlik tarjima qilinadi", () => {
    expect(translateText("1 karobka (3 dona)", "ru")).toBe("1 кор. (3 шт.)");
    expect(translateText("1 dona", "ru")).toBe("1 шт.");
    expect(translateText("2 flakon", "ru")).toBe("2 флакона");
  });
});

describe("Bitrix zakazi: qo'shimcha, kombo va sovg'a qatorlari", () => {
  const order = mapLogistOrder({
    id: "b1",
    total_amount: 750000,
    items: [
      { id: 1, product_name: "D.A. Choy", quantity: 1, unit: "box", unit_label: "karobka", pieces: 3, total: 400000 },
      { id: 2, product_name: "Rayhon kremi", quantity: 1, unit: "box", unit_label: "karobka", pieces: 1, total: 350000 },
      { id: 3, product_name: "Doctor Ali Kremi", quantity: 1, unit: "piece", unit_label: "dona", pieces: 1, is_gift: true, total: 0 },
    ],
  });

  it("har qator o'z birligi bilan, sovg'a 0 so'm, summa serverdan", () => {
    expect(order.items.map(formatItemQuantity)).toEqual(["1 karobka (3 dona)", "1 karobka", "1 dona"]);
    expect(order.items[2]).toMatchObject({ isGift: true, price: 0, unit: "piece", pieces: 1 });
    expect(order.totalAmount).toBe(750000);
  });

  it("yangi kalitsiz qator yiqilmaydi — `null`", () => {
    const old = mapLogistOrder({ id: "o", items: [{ product_name: "A", quantity: 2 }] });
    expect(old.items[0]).toMatchObject({ unit: null, unitLabel: null, pieces: null });
  });
});
