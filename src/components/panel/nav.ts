import { Hexagon, Receipt, Star, Truck, Wallet, Warehouse, ChartColumnBig, type LucideIcon } from "lucide-react";

import type { ChiefPermission } from "@/features/chief/types";
import { ROUTES } from "@/lib/routes";

/**
 * Bosh kuryer sayti bo'limlari (`21_TUZILMA_V2` §4.5), tartib ish oqimi bo'yicha:
 * zakaz → kuryer → zona → sklad → pul → hisobot → reyting. Telefonning pastki
 * panelida oltitadan oshmaydi — `secondary` bo'lim faqat menyuda (yon panel).
 */
export type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  /** Bo'lim dopuski — yo'q bo'lsa menyuda ko'rinmaydi (`use-nav-items.ts`). */
  permission?: ChiefPermission;
  /** Telefonning pastki panelida yo'q — faqat yon panel / menyuda. */
  secondary?: boolean;
};

export const NAV: NavItem[] = [
  { href: ROUTES.orders, label: "Zakazlar", Icon: Receipt },
  { href: ROUTES.couriers, label: "Kuryerlar", Icon: Truck },
  { href: ROUTES.zones, label: "Zonalar", Icon: Hexagon },
  { href: ROUTES.sklad, label: "Sklad", Icon: Warehouse, permission: "warehouse.view_courier_stores" },
  { href: ROUTES.cash, label: "Kassa", Icon: Wallet },
  { href: ROUTES.report, label: "Moliya", Icon: ChartColumnBig, permission: "view.analytics" },
  { href: ROUTES.ratings, label: "Reytinglar", Icon: Star, secondary: true },
];

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
