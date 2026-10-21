import type { NextConfig } from "next";

// Oddiy `.mjs` — shu faylni Node skriptlari ham o'qiydi.
import { resolveServer } from "./config/servers.mjs";

const isDev = process.env.NODE_ENV === "development";
const server = resolveServer();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SERVER: server.name,
    NEXT_PUBLIC_BACKEND_HOST: server.host,
  },

  /**
   * Butun admin panel login orqasida, SEO kerak emas — sof statik SPA:
   * `next build` → `out/`. `/api` ni production'da nginx uzatadi.
   */
  output: "export",
  images: { unoptimized: true },
  trailingSlash: false,

  /** Django manzillari oxiridagi `/` majburiy — 308 redirect so'rovni buzadi. */
  skipTrailingSlashRedirect: true,

  /** Faqat `npm run dev`: `/api` → lokal dev-proxy (`scripts/dev.mjs`). */
  ...(isDev
    ? {
        async rewrites() {
          const proxy = `http://127.0.0.1:${process.env.DEV_PROXY_PORT ?? 3041}`;
          return [{ source: "/api/:path*", destination: `${proxy}/api/:path*` }];
        },
      }
    : {}),
};

export default nextConfig;
