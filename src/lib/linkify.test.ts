import { describe, expect, it } from "vitest";

import { linkify, safeHref, urlsIn } from "./linkify";

const types = (text: string) => linkify(text).map((segment) => segment.type);

describe("linkify — havolalar", () => {
  it("oddiy matn bitta bo'lak", () => {
    expect(linkify("Salom, qalaysiz?")).toEqual([{ type: "text", value: "Salom, qalaysiz?" }]);
    expect(linkify("")).toEqual([]);
  });

  it("https, www va yalang'och domen", () => {
    expect(linkify("https://mehrigiyo.uz/otziv")).toEqual([
      { type: "url", value: "https://mehrigiyo.uz/otziv", href: "https://mehrigiyo.uz/otziv" },
    ]);
    expect(linkify("www.site.com")[0]).toMatchObject({ type: "url", href: "https://www.site.com" });
    expect(linkify("qarang imorganic.uz/otziv")[1]).toMatchObject({
      type: "url",
      value: "imorganic.uz/otziv",
      href: "https://imorganic.uz/otziv",
    });
  });

  it("oxiridagi tinish belgilari havolaga kirmaydi", () => {
    const segments = linkify("Qarang: https://site.uz/a.");
    expect(segments).toEqual([
      { type: "text", value: "Qarang: " },
      { type: "url", value: "https://site.uz/a", href: "https://site.uz/a" },
      { type: "text", value: "." },
    ]);
    expect(linkify("https://site.uz/a, keyin")[0]).toMatchObject({ value: "https://site.uz/a" });
    expect(linkify("https://site.uz/a?")[0]).toMatchObject({ value: "https://site.uz/a" });
  });

  it("qavs: matnniki tashlanadi, havolaniki qoladi", () => {
    expect(linkify("(qarang: https://site.uz/a)")).toEqual([
      { type: "text", value: "(qarang: " },
      { type: "url", value: "https://site.uz/a", href: "https://site.uz/a" },
      { type: "text", value: ")" },
    ]);
    expect(linkify("https://ru.wikipedia.org/wiki/Toshkent_(shahar)")[0]).toMatchObject({
      value: "https://ru.wikipedia.org/wiki/Toshkent_(shahar)",
    });
  });

  it("kirill matn ichida havola", () => {
    const segments = linkify("Манзил: https://yandex.uz/maps/?pt=70.94,40.53 — кўринг");
    expect(segments).toEqual([
      { type: "text", value: "Манзил: " },
      {
        type: "url",
        value: "https://yandex.uz/maps/?pt=70.94,40.53",
        href: "https://yandex.uz/maps/?pt=70.94,40.53",
      },
      { type: "text", value: " — кўринг" },
    ]);
  });

  it("bir nechta havola", () => {
    expect(urlsIn("a https://a.uz b www.b.com c site.ru")).toEqual([
      "https://a.uz",
      "https://www.b.com",
      "https://site.ru",
    ]);
  });

  it("e-pochta va 'v2.0' havola emas", () => {
    expect(types("ali@mail.uz ga yozing")).toEqual(["text"]);
    expect(types("versiya v2.0 chiqdi")).toEqual(["text"]);
  });

  it("javascript: sxemasi hech qachon href bo'lmaydi", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("data:text/html,xx")).toBeNull();
    expect(safeHref("site.uz")).toBe("https://site.uz");
    const segments = linkify("javascript:alert(1)//site.uz");
    for (const segment of segments) {
      if (segment.type === "url") expect(segment.href).toMatch(/^https:\/\//);
    }
  });
});

describe("linkify — telefon", () => {
  it("bo'shliqli va yopishiq O'zbekiston raqami", () => {
    expect(linkify("tel +998 90 123 45 67 bo'ldi")).toEqual([
      { type: "text", value: "tel " },
      { type: "phone", value: "+998 90 123 45 67", digits: "998901234567" },
      { type: "text", value: " bo'ldi" },
    ]);
    expect(linkify("998901234567")[0]).toMatchObject({ type: "phone", digits: "998901234567" });
    expect(linkify("+998(90)123-45-67")[0]).toMatchObject({ type: "phone", digits: "998901234567" });
  });

  it("xalqaro raqam plus bilan", () => {
    expect(linkify("+7 912 345 67 89")[0]).toMatchObject({ type: "phone", digits: "79123456789" });
  });

  it("uzun raqam ketma-ketligi telefon emas", () => {
    expect(types("kod 99890123456789012")).toEqual(["text"]);
  });

  it("oxiridagi nuqta raqamga kirmaydi", () => {
    expect(linkify("Qo'ng'iroq qiling: +998901234567.")).toEqual([
      { type: "text", value: "Qo'ng'iroq qiling: " },
      { type: "phone", value: "+998901234567", digits: "998901234567" },
      { type: "text", value: "." },
    ]);
  });
});

describe("linkify — buyurtma raqami", () => {
  it("#DA-184011, ORD-123 va #12345", () => {
    expect(linkify("#DA-184011 tayyor")).toEqual([
      { type: "order", value: "#DA-184011", orderNumber: "DA-184011" },
      { type: "text", value: " tayyor" },
    ]);
    expect(linkify("ORD-123")[0]).toMatchObject({ type: "order", orderNumber: "ORD-123" });
    expect(linkify("#ORD-123")[0]).toMatchObject({ type: "order", orderNumber: "ORD-123" });
    expect(linkify("buyurtma #12345,")[1]).toMatchObject({ type: "order", orderNumber: "12345" });
  });

  it("so'z ichidagi harf-chiziqcha-raqam buyurtma emas", () => {
    expect(types("COVID-19 davri")).toEqual(["text"]);
    expect(types("#123 qisqa")).toEqual(["text"]);
  });

  it("havola, telefon va buyurtma bitta xabarda", () => {
    expect(types("#DA-1 uchun +998 90 123 45 67 ga qo'ng'iroq, karta: https://maps.uz/x")).toEqual([
      "order",
      "text",
      "phone",
      "text",
      "url",
    ]);
  });
});
