import { describe, expect, it } from "vitest";

import { isAutoAssignMode, regionSettingsSchema } from "./region-settings";

describe("regionSettingsSchema", () => {
  it("parses every contract mode", () => {
    for (const mode of ["off", "suggest", "full"]) {
      expect(regionSettingsSchema.parse({ region: "fargona", auto_assign: mode })).toEqual({
        region: "fargona",
        autoAssign: mode,
      });
    }
  });

  it("rejects unknown or missing modes", () => {
    expect(() => regionSettingsSchema.parse({ region: "fargona", auto_assign: "auto" })).toThrow();
    expect(() => regionSettingsSchema.parse({ region: "fargona", auto_assign: null })).toThrow();
  });

  it("guards mode strings", () => {
    expect(isAutoAssignMode("full")).toBe(true);
    expect(isAutoAssignMode("FULL")).toBe(false);
  });
});
