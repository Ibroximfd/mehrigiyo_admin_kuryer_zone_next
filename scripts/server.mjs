/**
 * Backend serverni bir buyruq bilan almashtirish — test ↔ prod.
 *
 *   npm run server        → hozir qaysi server tanlanganini ko'rsatadi
 *   npm run server:test   → testga o'tkazadi   (imorganic.uz)
 *   npm run server:prod   → prodga o'tkazadi   (my.imorganic.uz)
 *
 * Skript `config/servers.mjs` dagi DEFAULT_SERVER qatorini qayta yozadi —
 * shundan keyin `npm run dev`, `npm run build` va `./deploy.sh` hammasi
 * tanlangan serverga qaraydi (ular resolveServer() dan o'qiydi).
 *
 * Faylga tegmasdan bir martalik almashtirish ham bor: `APP_SERVER=test npm run dev`.
 */
import { readFileSync, writeFileSync } from "node:fs";

import { SERVERS, resolveServer } from "../config/servers.mjs";

const CONFIG_PATH = new URL("../config/servers.mjs", import.meta.url);

const known = Object.keys(SERVERS).join(", ");
const target = process.argv[2];

// Argumentsiz — joriy holatni ko'rsatish.
if (!target) {
  const current = resolveServer();
  console.log(`Joriy backend: ${current.label} (${current.host})`);
  console.log(`Almashtirish:  npm run server:test  yoki  npm run server:prod`);
  process.exit(0);
}

if (!SERVERS[target]) {
  console.error(`Noma'lum server: "${target}". Mavjudlari: ${known}.`);
  process.exit(1);
}

const source = readFileSync(CONFIG_PATH, "utf8");
const pattern = /export const DEFAULT_SERVER = "[a-z]+";/;

if (!pattern.test(source)) {
  console.error(
    "config/servers.mjs da DEFAULT_SERVER qatori topilmadi — fayl o'zgargan.",
  );
  process.exit(1);
}

writeFileSync(
  CONFIG_PATH,
  source.replace(pattern, `export const DEFAULT_SERVER = "${target}";`),
);

const server = SERVERS[target];
console.log(`✔ Backend ${server.label} (${server.host}) ga o'tkazildi.`);
console.log(
  "  Ishlab turgan `npm run dev` ni qayta ishga tushiring; deploy oldidan `npm run build` yangisini yig'adi.",
);
