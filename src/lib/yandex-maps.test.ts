import { describe, expect, it } from "vitest";

import { yandexMapsLang, yandexMapsScriptUrl } from "./yandex-maps";

describe("Yandex Maps yuklovchisi", () => {
  it("skript manzili: 2.1, kalit va til", () => {
    const url = new URL(yandexMapsScriptUrl("abc-123", "ru_RU"));
    expect(url.origin + url.pathname).toBe("https://api-maps.yandex.ru/2.1/");
    expect(url.searchParams.get("apikey")).toBe("abc-123");
    expect(url.searchParams.get("lang")).toBe("ru_RU");
  });

  it("til: uz (lotin/kirill) → uz_UZ, qolgani ru_RU", () => {
    expect(yandexMapsLang("uz")).toBe("uz_UZ");
    expect(yandexMapsLang("uz-Cyrl")).toBe("uz_UZ");
    expect(yandexMapsLang("ru")).toBe("ru_RU");
    expect(yandexMapsLang(null)).toBe("ru_RU");
  });
});
