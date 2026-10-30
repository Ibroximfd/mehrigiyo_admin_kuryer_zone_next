import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Sof modullar testi (`features/orders/*.ts`): parserlar, ruxsat matritsasi,
 * doska hisob-kitobi. DOM kerak emas — `node` muhiti, `@/` alias tsconfig
 * bilan bir xil.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
