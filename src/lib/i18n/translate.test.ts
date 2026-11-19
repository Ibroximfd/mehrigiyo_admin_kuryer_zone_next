import { describe, expect, it } from "vitest";

import { translateText } from "./translate";

describe("shadcn ichidagi yashirin «Close»", () => {
  it("kirillda «Ёпиш» (harfma-harf «Слосе» emas), rus tilida «Закрыть»", () => {
    expect(translateText("Close", "uz-cyrl")).toBe("Ёпиш");
    expect(translateText("Close", "ru")).toBe("Закрыть");
    expect(translateText("Close", "uz-latn")).toBe("Close");
  });

  it("boshqa matnlarga ta'sir qilmaydi", () => {
    expect(translateText("Yopish", "uz-cyrl")).toBe("Ёпиш");
    expect(translateText("Closed", "uz-cyrl")).not.toBe("Ёпиш");
  });
});
