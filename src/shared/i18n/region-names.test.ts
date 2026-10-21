import { describe, expect, it } from "vitest";

import { regionDisplayName } from "./region-names";

describe("regionDisplayName", () => {
  it("keeps the server (Uzbek) name in uz", () => {
    expect(regionDisplayName("fargona", "Farg'ona", "uz")).toBe("Farg'ona");
  });

  it("localizes all 14 known codes in ru and falls back to the server name", () => {
    const codes = [
      "toshkent_shahar", "toshkent", "andijon", "buxoro", "fargona", "jizzax", "xorazm",
      "namangan", "navoiy", "qashqadaryo", "samarqand", "sirdaryo", "surxondaryo", "qoraqalpogiston",
    ];
    for (const code of codes) expect(regionDisplayName(code, code, "ru")).not.toBe(code);
    expect(regionDisplayName("fargona", "Farg'ona", "ru")).toBe("Ферганская область");
    expect(regionDisplayName("yangi_viloyat", "Yangi", "ru")).toBe("Yangi");
  });
});
