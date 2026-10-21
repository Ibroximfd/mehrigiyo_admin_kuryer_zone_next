import { describe, expect, it } from "vitest";

import { districtPath } from "./districts-api";

describe("districtPath", () => {
  it("keeps the slash between region and slug", () => {
    expect(districtPath("fargona/qoqon_sh")).toBe("admin/districts/fargona/qoqon_sh/");
  });

  it("encodes unsafe characters inside segments", () => {
    expect(districtPath("toshkent/yangi hayot")).toBe("admin/districts/toshkent/yangi%20hayot/");
  });
});
