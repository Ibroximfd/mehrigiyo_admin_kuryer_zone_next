import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * MapLibre ishchisi `public/` da o'rnatilgan versiya bilan bir xil bo'lishi
 * shart — aks holda vektor xarita jimgina raster zaxiraga tushadi.
 * Yiqilsa: `npm run vendor:maplibre`.
 */
const root = fileURLToPath(new URL("../../..", import.meta.url));

describe("maplibre ishchisi", () => {
  it("o'rnatilgan versiya uchun public/vendor da bor", () => {
    const { version } = JSON.parse(
      readFileSync(`${root}node_modules/maplibre-gl/package.json`, "utf8"),
    ) as { version: string };
    const dir = `${root}public/vendor/maplibre-gl/${version}`;
    expect(existsSync(`${dir}/maplibre-gl-worker.js`)).toBe(true);
    expect(existsSync(`${dir}/maplibre-gl-shared.js`)).toBe(true);
    expect(readFileSync(`${dir}/maplibre-gl-worker.js`, "utf8")).toContain("./maplibre-gl-shared.js");
  });
});
