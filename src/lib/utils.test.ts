import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { cn } from "./utils";

/**
 * `cn()` maxsus shrift o'lchamini rang deb o'qimasin.
 *
 * Ro'yxat testda qattiq yozilmaydi — `globals.css` dagi `--text-<nom>:`
 * tokenlaridan o'qiladi: CSS'ga yangi o'lcham qo'shilib `utils.ts` ga
 * yozilmasa, test aynan o'sha nomda yiqiladi.
 */
const css = readFileSync(
  fileURLToPath(new URL("../app/globals.css", import.meta.url)),
  "utf8",
);
const customSizes = [...css.matchAll(/^\s*--text-([a-z0-9]+):/gm)].map(
  (match) => match[1],
);

describe("cn — maxsus shrift o'lchamlari", () => {
  it("CSS'da maxsus o'lchamlar bor", () => {
    expect(customSizes).toEqual(
      expect.arrayContaining(["micro", "fine", "meta", "dense", "body", "lg2"]),
    );
  });

  it.each(customSizes)("text-%s rang bilan to'qnashmaydi (o'lcham oldin)", (size) => {
    expect(cn(`text-${size} text-gold`)).toBe(`text-${size} text-gold`);
  });

  it.each(customSizes)("text-%s rang bilan to'qnashmaydi (rang oldin)", (size) => {
    expect(cn(`text-gold text-${size}`)).toBe(`text-gold text-${size}`);
  });

  it("ikki maxsus o'lcham o'zaro to'qnashadi — oxirgisi qoladi", () => {
    expect(cn("text-micro text-fine")).toBe("text-fine");
  });

  it("maxsus o'lcham standart o'lcham bilan ham bitta guruhda", () => {
    expect(cn("text-sm text-dense")).toBe("text-dense");
    expect(cn("text-dense text-sm")).toBe("text-sm");
  });

  it("nazorat: standart o'lchamlar avvalgidek birlashadi", () => {
    expect(cn("text-sm text-base")).toBe("text-base");
    expect(cn("text-ink text-gold")).toBe("text-gold");
  });
});
