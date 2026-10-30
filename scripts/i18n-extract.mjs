/**
 * UI matnlarini yig'ib, lug'atda yo'qlarini ko'rsatadi.
 *
 *   node scripts/i18n-extract.mjs            → qamrov hisoboti
 *   node scripts/i18n-extract.mjs --all      → hamma topilgan matn (JSON)
 *
 * Tekshiruvning o'zi `src/lib/i18n/coverage.test.ts` da — bu skript faqat
 * lug'at to'ldirishni yengillashtiradi.
 */

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { extractAll } from "./i18n-extract-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const items = extractAll(root);
const mode = process.argv[2];

if (mode === "--all") {
  console.log(JSON.stringify(items, null, 2));
} else {
  console.log(`Topilgan UI matnlari: ${items.length}`);
  console.log("Tarjima holati uchun: npx vitest run src/lib/i18n/coverage.test.ts");
}
