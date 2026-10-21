import { ArrowLeftRight, Hexagon, LayoutDashboard, MapPinned, Settings2, Truck, type LucideIcon } from "lucide-react";

import type { Dictionary } from "@/shared/i18n/uz";

import { ROUTES, type AppRoute } from "./routes";

export type NavItem = {
  href: AppRoute;
  icon: LucideIcon;
  label: (t: Dictionary) => string;
  /** Telefondagi pastki panelda ko'rinadimi (qolganlari "Menyu" ichida). */
  inBottomBar: boolean;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: ROUTES.home, icon: LayoutDashboard, label: (t) => t.nav.overview, inBottomBar: false },
  { href: ROUTES.zones, icon: Hexagon, label: (t) => t.nav.zones, inBottomBar: true },
  { href: ROUTES.districts, icon: MapPinned, label: (t) => t.nav.districts, inBottomBar: true },
  { href: ROUTES.couriers, icon: Truck, label: (t) => t.nav.couriers, inBottomBar: true },
  { href: ROUTES.interfilial, icon: ArrowLeftRight, label: (t) => t.nav.interfilial, inBottomBar: true },
  { href: ROUTES.settings, icon: Settings2, label: (t) => t.nav.settings, inBottomBar: false },
];

/** Joriy yo'l shu bo'limga tegishlimi (`/` faqat aniq mos kelganda). */
export function isNavActive(pathname: string, href: AppRoute): boolean {
  if (href === ROUTES.home) return pathname === ROUTES.home;
  return pathname === href || pathname.startsWith(`${href}/`);
}
