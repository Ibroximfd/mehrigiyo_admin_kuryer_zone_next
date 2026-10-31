import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";

import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from "@/lib/i18n/locale";

import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mehrigiyo Bosh kuryer",
  description: "Bosh kuryer: zakazlarni zona bo'yicha taqsimlash, kuryerlar, zonalar, sklad, kassa va moliya",
  icons: { icon: "/favicon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0a1024" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1024" },
  ],
};

/**
 * Birinchi chizishdan oldin ishlaydigan skript.
 *
 * `<html>` ga atributlar qo'yadi:
 *
 *   data-perf     — qanchalik bezak ko'tara oladi (low / medium / high)
 *   data-density  — qator balandligi (comfortable / compact)
 *   lang / data-i18n-pending — tanlangan til (`lib/i18n/locale.ts`)
 *
 * Nega inline va blokirovkalovchi: agar React yuklanguncha kutsak, sahifa
 * avval bir ko'rinishda chizilib, keyin sakrardi. Skript juda kichik.
 *
 * `low` — kamsitish emas, asosiy dizayn. Shuning uchun aniqlay olmasak
 * ham xavfsiz tomon shu: sozlamada qo'lda ko'tarish mumkin.
 */
const BOOT_SCRIPT = `
(function () {
  var d = document.documentElement;
  try {
    var s = JSON.parse(localStorage.getItem("mehrigiyo-logist-ui") || "{}").state || {};

    var perf = s.perfOverride;
    if (perf !== "low" && perf !== "medium" && perf !== "high") {
      var cores = navigator.hardwareConcurrency || 2;
      var mem = navigator.deviceMemory || 2;
      var slow = matchMedia("(prefers-reduced-motion: reduce)").matches;
      perf = slow || cores <= 4 || mem <= 4 ? "low" : cores >= 8 && mem >= 8 ? "high" : "medium";
    }
    d.setAttribute("data-perf", perf);

    d.setAttribute("data-density", s.density === "compact" ? "compact" : "comfortable");
  } catch (e) {
    d.setAttribute("data-perf", "low");
    d.setAttribute("data-density", "comfortable");
  }

  // Til: sukut — rus. Lotin bo'lmasa, tarjima qo'llanguncha sahifa yashirinadi
  // (LocaleProvider olib tashlaydi; JS yiqilsa ham 1.5 soniyadan keyin ochiladi).
  var l = "${DEFAULT_LOCALE}";
  try {
    var stored = (JSON.parse(localStorage.getItem("${LOCALE_STORAGE_KEY}") || "{}").state || {}).locale;
    if (stored === "ru" || stored === "uz-cyrl" || stored === "uz-latn") l = stored;
  } catch (e) {}
  d.lang = l === "ru" ? "ru" : l === "uz-cyrl" ? "uz-Cyrl" : "uz-Latn";
  if (l !== "uz-latn") {
    d.setAttribute("data-i18n-pending", "");
    setTimeout(function () { d.removeAttribute("data-i18n-pending"); }, 1500);
  }
})();
`;

/*
 * Faqat lotin subseti oldindan yuklanadi (73 KB). Kirill va latin-ext
 * `unicode-range` orqali faqat kerak bo'lganda tushadi — ularni preload
 * qilish zarar bo'lardi.
 */
function preloadFonts() {
  preload("/fonts/inter-latin.woff2", {
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  });
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  preloadFonts();

  return (
    // `suppressHydrationWarning` — next-themes mavzu klassini, yuqoridagi
    // skript esa data-perf/data-density ni brauzerda qo'shadi, ya'ni server
    // va klient HTML'i ataylab farq qiladi.
    <html lang="ru" suppressHydrationWarning className="antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      </head>
      <body className="bg-canvas text-ink">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
