import type { NextConfig } from "next";

// Oddiy `.mjs` — shu faylni Node skriptlari ham o'qiydi.
import { resolveServer } from "./config/servers.mjs";

const isDev = process.env.NODE_ENV === "development";

/**
 * Backend serveri bitta joyda tanlanadi (`config/servers.mjs`) va shu yerdan
 * brauzer kodiga uzatiladi — `src/lib/api-constants.ts` shuni o'qiydi.
 */
const server = resolveServer();
console.log(`[next] Backend: ${server.label} (${server.host})`);

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SERVER: server.name,
    NEXT_PUBLIC_BACKEND_HOST: server.host,
  },

  /**
   * Butun CRM login orqasida turadi va SEO kerak emas, shuning uchun sof
   * statik SPA sifatida eksport qilamiz: `next build` → `out/`.
   * Bu `flutter build web` → `build/web` ning aynan o'rnini bosadi.
   */
  output: "export",

  images: { unoptimized: true },
  trailingSlash: false,

  /**
   * Django manzillari oxiridagi `/` majburiy. Next sukut bo'yicha bunday
   * manzilni slashsiz variantiga 308 bilan yo'naltiradi va so'rov buziladi.
   */
  skipTrailingSlashRedirect: true,

  /**
   * Faqat `npm run dev` uchun: `/api` va `/media` ni lokal dev-proxy'ga
   * uzatamiz (`scripts/dev.mjs`), u esa backendga HTTPS orqali chiqadi.
   * Backend CORS'da faqat o'z originiga ruxsat beradi, shuning uchun
   * brauzer to'g'ridan-to'g'ri API'ga chiqa olmaydi.
   *
   * Production'da bu ishni nginx bajaradi (`nginx.conf`).
   */
  ...(isDev
    ? {
        async rewrites() {
          const proxy = `http://127.0.0.1:${process.env.DEV_PROXY_PORT ?? 3031}`;
          return [
            { source: "/api/:path*", destination: `${proxy}/api/:path*` },
            { source: "/media/:path*", destination: `${proxy}/media/:path*` },
          ];
        },
      }
    : {}),
};

export default nextConfig;
