import { describe, expect, it } from "vitest";

import { isLocaleSwitch } from "./use-locale-refetch";

describe("isLocaleSwitch", () => {
  it("birinchi qiymat (gidratsiya) — almashuv emas", () => {
    expect(isLocaleSwitch(null, "ru")).toBe(false);
  });

  it("o'sha til — almashuv emas", () => {
    expect(isLocaleSwitch("ru", "ru")).toBe(false);
  });

  it("boshqa til — qayta so'raladi", () => {
    expect(isLocaleSwitch("ru", "uz-latn")).toBe(true);
  });
});
