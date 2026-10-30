/**
 * `nginx.conf.template` dan `nginx.conf` yasaydi.
 *
 * Backend hosti `config/servers.mjs` dan olinadi, ya'ni nginx sozlamasida
 * host qo'lda yozilmaydi va dev-proxy bilan hech qachon farq qilib qolmaydi.
 *
 *   npm run config:nginx                 # config/servers.mjs dagi server
 *   APP_SERVER=test npm run config:nginx # vaqtincha boshqasi
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveServer } from "../config/servers.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const server = resolveServer();

const template = readFileSync(join(root, "nginx.conf.template"), "utf8");

// Shablon sarlavhasi natijaga tushmasin — u faqat shablonni tahrirlovchi uchun.
const body = template.replace(/^#[^\n]*\n(?:#[^\n]*\n)*\n/, "");

const config = `# Avtomatik generatsiya qilingan — QO'LDA TAHRIRLAMANG.
# Manba:  nginx.conf.template
# Server: ${server.label} (${server.host})
# Buyruq: npm run config:nginx

${body.replaceAll("__BACKEND_HOST__", server.host)}`;

writeFileSync(join(root, "nginx.conf"), config);
console.log(`[nginx] ${server.label} → ${server.host}`);
