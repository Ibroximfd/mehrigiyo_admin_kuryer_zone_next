/**
 * Development uchun ishga tushirish skripti.
 *
 * Ikkita narsani ko'taradi:
 *   1. Next dev serveri (http://localhost:3040);
 *   2. Kichik proxy — `/api` ni backendga HTTPS orqali uzatadi.
 *
 * Nima uchun proxy kerak: backend CORS'da faqat o'z originiga ruxsat beradi,
 * ya'ni brauzer localhost'dan to'g'ridan-to'g'ri API'ga chiqa olmaydi.
 * Next'ning `rewrites` mexanizmi `/api` ni shu proxyga yo'naltiradi
 * (`next.config.ts`). Production'da bu ishni nginx bajaradi.
 */

import { spawn } from "node:child_process";
import http from "node:http";
import https from "node:https";

import { resolveServer } from "../config/servers.mjs";

const PROXY_PORT = Number(process.env.DEV_PROXY_PORT ?? 3041);
const APP_PORT = Number(process.env.PORT ?? 3040);

const SERVER = resolveServer();
const UPSTREAM_HOST = process.env.DEV_UPSTREAM_HOST ?? SERVER.host;

/**
 * Django manzillari oxiridagi `/` ni tiklaydi: Next rewrite paytida uni olib
 * tashlaydi, Django esa APPEND_SLASH bilan 301 qaytarib POST tanasini yo'qotadi.
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

  // Host sarlavhasi backendning o'ziniki bo'lishi shart (nginx virtual host).
  const headers = { ...request.headers, host: UPSTREAM_HOST };
  delete headers["accept-encoding"];

  const upstream = https.request(
    { host: UPSTREAM_HOST, port: 443, path, method: request.method, headers },
    (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    },
  );

  upstream.on("error", (error) => {
    console.error("[dev-proxy] xatolik:", error.message);
    response.writeHead(502, { "content-type": "application/json" });
    response.end(JSON.stringify({ code: "bad_gateway", detail: "Backendga ulanib bo'lmadi" }));
  });

  request.pipe(upstream);
});

proxy.listen(PROXY_PORT, "127.0.0.1", () => {
  console.log(`[dev-proxy] ${SERVER.label} · 127.0.0.1:${PROXY_PORT} -> https://${UPSTREAM_HOST}`);
});

const next = spawn("npx", ["next", "dev", "--port", String(APP_PORT), ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, DEV_PROXY_PORT: String(PROXY_PORT) },
});

const shutdown = (code = 0) => {
  proxy.close();
  if (!next.killed) next.kill("SIGTERM");
  process.exit(code);
};

next.on("exit", (code) => shutdown(code ?? 0));
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
