import { ChartColumnBig, Layers, Receipt, Truck, Wallet, type LucideIcon } from "lucide-react";

import { ROUTES } from "@/lib/routes";

/**
 * Yon panel bo'limlari — bosh kuryer sayti (2026-10-30): faqat bosh kuryer
 * ishlari. Logist bo'limlari bu saytda yo'q.
 * `badge` — qaysi hisoblagich shu bo'limga tegishli; `goKey` — `g` dan
 * keyin bosiladigan harf (Gmail/Linear uslubi).
 */
export type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  Icon: LucideIcon;
  badge?: "orders" | "transfers" | "staff";
  goKey?: string;
  /** Tepa paneldagi bo'limlar qatorida ko'rinadimi (dizayn: chat faqat railda). */
  inTopBar: boolean;
  /** Yangi bo'lim belgisi — birinchi chiqarilish davrida. */
  isNew?: boolean;
  /** Faqat shu rolda ko'rinadi (`use-visible-nav.ts`); yo'q — hammaga. */
  requires?: "chief";
};

/** Tartib — tasdiqlangan dizayndagi rail tartibi (2026-09-29). */
export const NAV: NavItem[] = [
  {
    href: ROUTES.chief,
    label: "Zakazlar",
    shortLabel: "Zakazlar",
    Icon: Receipt,
    goKey: "z",
    inTopBar: true,
  },
  {
    href: ROUTES.chiefCouriers,
    label: "Kuryerlar",
    shortLabel: "Kuryerlar",
    Icon: Truck,
    goKey: "k",
    inTopBar: true,
  },
  {
    href: ROUTES.chiefZones,
    label: "Zonalar",
    shortLabel: "Zonalar",
    Icon: Layers,
    goKey: "o",
    inTopBar: true,
  },
  {
    href: ROUTES.chiefCash,
    label: "Kassa",
    shortLabel: "Kassa",
    Icon: Wallet,
    goKey: "p",
    inTopBar: true,
  },
  {
    href: ROUTES.chiefStats,
    label: "Statistika",
    shortLabel: "Statistika",
    Icon: ChartColumnBig,
    goKey: "s",
    inTopBar: true,
  },
];

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
