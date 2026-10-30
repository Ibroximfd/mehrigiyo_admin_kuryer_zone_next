/**
 * Development uchun ishga tushirish skripti.
 *
 * Ikkita narsani ko'taradi:
 *   1. Next dev serveri — HTTPS'da (`certs/` dagi mkcert sertifikati bilan);
 *   2. Kichik proxy — `/api` va `/media` ni backendga HTTPS orqali uzatadi.
 *
 * Nima uchun proxy kerak: backend CORS'da faqat o'z originiga ruxsat beradi,
 * ya'ni brauzer localhost'dan to'g'ridan-to'g'ri API'ga chiqa olmaydi.
 * Next'ning o'z `rewrites` mexanizmi esa backendga 80-port orqali ulanadi va
 * nginx HTTPS'ga 301 qaytaradi — shuning uchun o'z proxymizni yozamiz.
 *
 * Production'da bularning hech biri ishlatilmaydi: u yerda `/api`, `/media`
 * va `/ws` ni nginx uzatadi (`nginx.conf`).
 */

import { spawn } from "node:child_process";
import http from "node:http";
import https from "node:https";
import tls from "node:tls";

import { resolveServer } from "../config/servers.mjs";

const PROXY_PORT = Number(process.env.DEV_PROXY_PORT ?? 3031);
const APP_PORT = Number(process.env.PORT ?? 3030);

// Backend `config/servers.mjs` da tanlanadi — bu yerda host yozilmaydi.
const SERVER = resolveServer();
const UPSTREAM_HOST = process.env.DEV_UPSTREAM_HOST ?? SERVER.host;

/**
 * Django manzillari oxiridagi `/` ni tiklaydi.
 *
 * Next rewrite paytida yo'lni "normallashtirib", oxirgi slashni olib tashlaydi
 * (`/api/operator/my-leads/` → `/api/operator/my-leads`). Django esa APPEND_SLASH
 * bilan uni qaytadan qo'shishga urinib 301 qaytaradi va POST tanasi yo'qoladi.
 * Fayl kengaytmasi bor manzillarga (masalan `/media/x.jpg`) tegilmaydi.
 */
function restoreTrailingSlash(url) {
  const [path, query] = url.split("?");
  const needsSlash = !path.endsWith("/") && !/\.[a-z0-9]+$/i.test(path);
  const fixed = needsSlash ? `${path}/` : path;
  return query ? `${fixed}?${query}` : fixed;
}

const proxy = http.createServer((request, response) => {
  const path = restoreTrailingSlash(request.url ?? "/");

  if (process.env.DEV_PROXY_VERBOSE) {
    console.log(`[dev-proxy] ${request.method} ${path}`);
  }

  // Host sarlavhasi backendning o'ziniki bo'lishi shart, aks holda nginx
  // so'rovni boshqa saytga tegishli deb hisoblaydi.
  const headers = { ...request.headers, host: UPSTREAM_HOST };
  delete headers["accept-encoding"];

  const upstream = https.request(
    {
      host: UPSTREAM_HOST,
      port: 443,
      path,
      method: request.method,
      headers,
    },
    (upstreamResponse) => {
      response.writeHead(
        upstreamResponse.statusCode ?? 502,
        upstreamResponse.headers,
      );
      upstreamResponse.pipe(response);
    },
  );

  upstream.on("error", (error) => {
    console.error("[dev-proxy] xatolik:", error.message);
    response.writeHead(502, { "content-type": "application/json" });
    response.end(JSON.stringify({ detail: "Backendga ulanib bo'lmadi" }));
  });

  request.pipe(upstream);
});

/**
 * WebSocket upgrade so'rovlari ham backendga uzatiladi. Next dev serveri
 * WS proxy qila olmaydi (rewrites faqat HTTP), shuning uchun brauzer dev
 * rejimda to'g'ridan-to'g'ri shu proxyga ulanadi:
 * `ws://127.0.0.1:3011/ws/...` (`src/lib/api-constants.ts` → `wsUrl`).
 */
proxy.on("upgrade", (request, clientSocket, head) => {
  if (process.env.DEV_PROXY_VERBOSE) {
    console.log(`[dev-proxy] UPGRADE ${request.url}`);
  }

  // Origin ham backendnikiga almashtiriladi — Django Channels'ning
  // AllowedHostsOriginValidator'i localhost'ni rad etmasligi uchun.
  const headers = {
    ...request.headers,
    host: UPSTREAM_HOST,
    origin: `https://${UPSTREAM_HOST}`,
  };

  const lines = [`${request.method} ${request.url} HTTP/1.1`];
  for (const [name, value] of Object.entries(headers)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      lines.push(`${name}: ${item}`);
    }
  }

  const upstream = tls.connect(
    { host: UPSTREAM_HOST, port: 443, servername: UPSTREAM_HOST },
    () => {
      upstream.write(`${lines.join("\r\n")}\r\n\r\n`);
      if (head.length > 0) upstream.write(head);
      upstream.pipe(clientSocket);
      clientSocket.pipe(upstream);
    },
  );

  const drop = () => {
    clientSocket.destroy();
    upstream.destroy();
  };
  upstream.on("error", drop);
  clientSocket.on("error", drop);
});

proxy.listen(PROXY_PORT, "127.0.0.1", () => {
  console.log(
    `[dev-proxy] ${SERVER.label} · 127.0.0.1:${PROXY_PORT} -> https://${UPSTREAM_HOST}`,
  );
});

// ─────────────────────────────────────────────────────────────────────────────

const next = spawn(
  "npx",
  [
    "next",
    "dev",
    "--port",
    String(APP_PORT),
    "--experimental-https",
    "--experimental-https-key",
    "./certs/localhost+2-key.pem",
    "--experimental-https-cert",
    "./certs/localhost+2.pem",
    ...process.argv.slice(2),
  ],
  { stdio: "inherit", env: process.env },
);

const shutdown = (code = 0) => {
  proxy.close();
  if (!next.killed) next.kill("SIGTERM");
  process.exit(code);
};

next.on("exit", (code) => shutdown(code ?? 0));
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
