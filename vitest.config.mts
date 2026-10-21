import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Sof modullar testi: zod parserlar, xato xaritasi, domen qoidalari.
 * DOM kerak emas — `node` muhiti; `@/` alias tsconfig bilan bir xil.
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
