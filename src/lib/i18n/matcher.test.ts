import { describe, expect, it } from "vitest";

import { createTranslator, normalizeKey, russianPlural } from "./matcher";
import { russianDateWords } from "./ru/dates";
import { translateText } from "./translate";

const dictionary = {
  Saqlash: "Сохранить",
  Buyurtmalar: "Заказы",
  Kuryer: "Курьер",
  "Naqd · olganda": "Наличные · при получении",
  YANGI: "НОВЫЙ",
  Bugun: "Сегодня",
  naqd: "наличные",
  "{n} ta tanlandi": "Выбрано: {n}",
  "{n} ta buyurtma": "{n} {n|заказ|заказа|заказов}",
  "{n} ta buyurtma → {x}": "{n} → {x}",
  "{n} so'm": "{n} сум",
  "Zakaz: {x} → {y}": "Заявка: {x} → {y}",
  "{x} qo'shildi": "{x} добавлен",
};

const { translate, has } = createTranslator(dictionary, { dateWords: russianDateWords });

describe("aniq moslik", () => {
  it("tarjima qiladi va atrofdagi bo'sh joyni saqlaydi", () => {
    expect(translate("Saqlash")).toBe("Сохранить");
    expect(translate("  Saqlash ")).toBe("  Сохранить ");
    expect(translate("\n  Buyurtmalar\n")).toBe("\n  Заказы\n");
  });

  it("apostrof variantlari va ichki bo'sh joy bir xil kalit", () => {
    expect(normalizeKey("O‘zbek   tili")).toBe("O'zbek tili");
    expect(translate("Naqd  ·  olganda")).toBe("Наличные · при получении");
  });

  it("katta-kichik harfga befarq, natija manba shaklida", () => {
    expect(translate("SAQLASH")).toBe("СОХРАНИТЬ");
    expect(translate("saqlash")).toBe("сохранить");
    expect(translate("Naqd")).toBe("Наличные");
  });

  it("topilmagan matn o'zgarmaydi", () => {
    expect(translate("Alisher Valiyev")).toBe("Alisher Valiyev");
    expect(has("Alisher Valiyev")).toBe(false);
  });

  it("lotin harfi yo'q matnga tegmaydi", () => {
    expect(translate("12 345")).toBe("12 345");
    expect(translate("Заказы")).toBe("Заказы");
    expect(translate("")).toBe("");
  });
});

describe("shablonlar", () => {
  it("sonli o'rin", () => {
    expect(translate("5 ta tanlandi")).toBe("Выбрано: 5");
    expect(translate("16 900 so'm")).toBe("16 900 сум");
  });

  it("rus ko'plik shakli", () => {
    expect(translate("1 ta buyurtma")).toBe("1 заказ");
    expect(translate("3 ta buyurtma")).toBe("3 заказа");
    expect(translate("11 ta buyurtma")).toBe("11 заказов");
    expect(translate("21 ta buyurtma")).toBe("21 заказ");
  });

  it("aniqroq shablon umumiysidan oldin", () => {
    expect(translate("4 ta buyurtma → Ali")).toBe("4 → Ali");
  });

  it("matnli o'rin ham tarjima qilinadi", () => {
    expect(translate("Zakaz: Bugun → Kuryer")).toBe("Заявка: Сегодня → Курьер");
    expect(translate("Ali qo'shildi")).toBe("Ali добавлен");
  });
});

describe("bo'laklar va chetdagi belgilar", () => {
  it("` · ` bo'yicha bo'laklab tarjima", () => {
    expect(translate("Bugun · Kuryer")).toBe("Сегодня · Курьер");
    expect(translate("Saqlash — 3 ta tanlandi")).toBe("Сохранить — Выбрано: 3");
  });

  it("chetdagi tinish belgilari saqlanadi", () => {
    expect(translate("· naqd")).toBe("· наличные");
    expect(translate("Saqlash…")).toBe("Сохранить…");
    expect(translate("Kuryer:")).toBe("Курьер:");
  });

  it("noma'lum bo'lak joyida qoladi", () => {
    expect(translate("Bugun · Ali Valiyev")).toBe("Сегодня · Ali Valiyev");
  });

  it("vergulli satrda tanilmagan bo'lak bo'lsa — butun satr o'zgarmaydi (manzil)", () => {
    expect(translateText("Toshkent shahri, Yunusobod", "ru")).toBe("Toshkent shahri, Yunusobod");
    expect(translate("Bugun, Kuryer")).toBe("Сегодня, Курьер");
    // Identifikator (raqam) vergul yonida ham to'xtatmaydi.
    expect(translate("Kuryer, #A12")).toBe("Курьер, #A12");
  });
});

describe("sana so'zlari", () => {
  it("oy va hafta kuni", () => {
    expect(translate("24-avgust, dushanba")).toBe("24 августа, понедельник");
    expect(translate("3 Yanvar 2026")).toBe("3 января 2026");
    expect(translate("24-avg")).toBe("24 авг");
    expect(translate("Bugun · 24-avgust")).toBe("Сегодня · 24 августа");
  });
});

describe("russianPlural", () => {
  it("1 / 2–4 / 5+ va 11–14", () => {
    const forms = ["заказ", "заказа", "заказов"];
    expect(russianPlural(1, forms)).toBe("заказ");
    expect(russianPlural(2, forms)).toBe("заказа");
    expect(russianPlural(5, forms)).toBe("заказов");
    expect(russianPlural(12, forms)).toBe("заказов");
    expect(russianPlural(22, forms)).toBe("заказа");
  });
});

describe("translateText", () => {
  it("uz-latn — manba o'zgarmaydi", () => {
    expect(translateText("Buyurtmalar", "uz-latn")).toBe("Buyurtmalar");
  });

  it("uz-cyrl — transliteratsiya, qisqartmalar tegilmaydi", () => {
    expect(translateText("Buyurtmalar", "uz-cyrl")).toBe("Буюртмалар");
    expect(translateText("YANGI", "uz-cyrl")).toBe("ЯНГИ");
    expect(translateText("CRM · COD", "uz-cyrl")).toBe("CRM · COD");
    expect(translateText("Yo'lga chiqarish", "uz-cyrl")).toBe("Йўлга чиқариш");
  });

  it("ru — loyiha lug'ati", () => {
    expect(translateText("Boshqaruv", "ru")).toBe("Управление");
    expect(translateText("Filiallar almashinuvi", "ru")).toBe("Обмен между филиалами");
    expect(translateText("Yo'lga chiqarilgan", "ru")).toBe("В пути");
    expect(translateText("Bekor qilish", "ru")).toBe("Отмена");
    expect(translateText("Oldim", "ru")).toBe("Взял");
    expect(translateText("YANGI", "ru")).toBe("НОВЫЙ");
    expect(translateText("Naqd · olganda", "ru")).toBe("Наличные · при получении");
    expect(translateText("Kuryer taqsimlash", "ru")).toBe("Распределение курьеров");
    expect(translateText("3 daqiqa oldin", "ru")).toBe("3 минуты назад");
  });
});
