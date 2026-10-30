/**
 * MapLibre GL v6 ishchisini (`worker`) `public/` ga ko'chiradi.
 *
 * Kutubxona ishchini o'z `import.meta.url` iga nisbatan qidiradi — Next
 * bundli ichida u manzil mavjud emas. Shuning uchun ishchi va u import
 * qiladigan umumiy bo'lak statik fayl sifatida beriladi va
 * `maplibre.setWorkerUrl()` bilan ko'rsatiladi (`base-map-layer.tsx`).
 *
 * `.mjs` emas `.js`: nginx `.mjs` ni bilmaydi (`application/octet-stream`)
 * va brauzer modul-ishchini rad etadi.
 *
 *   npm run vendor:maplibre   # `npm install` dan keyin, versiya o'zgarsa
 */

import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "maplibre-gl");
const { version } = JSON.parse(readFileSync(join(source, "package.json"), "utf8"));

const vendorRoot = join(root, "public", "vendor", "maplibre-gl");
const target = join(vendorRoot, version);

// Eski versiyalar qolib ketmasin.
mkdirSync(vendorRoot, { recursive: true });
for (const entry of readdirSync(vendorRoot)) {
  if (entry !== version) rmSync(join(vendorRoot, entry), { recursive: true, force: true });
}
mkdirSync(target, { recursive: true });

const worker = readFileSync(join(source, "dist", "maplibre-gl-worker.mjs"), "utf8");
if (!worker.includes("./maplibre-gl-shared.mjs")) {
  throw new Error("maplibre-gl ishchisi kutilgan importni o'z ichiga olmaydi — skriptni yangilang");
}
writeFileSync(
  join(target, "maplibre-gl-worker.js"),
  worker.replaceAll("./maplibre-gl-shared.mjs", "./maplibre-gl-shared.js"),
);
writeFileSync(
  join(target, "maplibre-gl-shared.js"),
  readFileSync(join(source, "dist", "maplibre-gl-shared.mjs"), "utf8"),
);

console.log(`[maplibre] ishchi → public/vendor/maplibre-gl/${version}/`);
