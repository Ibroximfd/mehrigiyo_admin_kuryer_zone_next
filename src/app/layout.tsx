import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { Providers } from "./providers";
import "./globals.css";

/*
 * Inter — lotin, kirill va o'zbek kirillining ғ/қ/ҳ harflari (cyrillic-ext)
 * bilan. `next/font` uni build paytida o'zimizga joylaydi: tashqi so'rov va
 * shrift almashganda sakrash yo'q.
 */
const inter = Inter({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Mehrigiyo Admin", template: "%s · Mehrigiyo Admin" },
  description: "Hududiy yetkazish boshqaruvi: zonalar, tumanlar, kuryerlar",
  icons: { icon: "/favicon.png" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Meta teg CSS o'zgaruvchisini o'qiy olmaydi — bu `--canvas` tokenining sRGB nusxasi.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f9f8" },
    { media: "(prefers-color-scheme: dark)", color: "#151917" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `suppressHydrationWarning` — next-themes `class` ni brauzerda qo'yadi.
    <html lang="uz-Latn" suppressHydrationWarning className={inter.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
