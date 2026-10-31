import { Hexagon, Receipt, Truck, Wallet, Warehouse, ChartColumnBig, type LucideIcon } from "lucide-react";

import type { ChiefPermission } from "@/features/chief/types";
import { ROUTES } from "@/lib/routes";

/**
 * Bosh kuryer sayti bo'limlari (`21_TUZILMA_V2` §4.5) — oltitadan oshmaydi,
 * tartib ish oqimi bo'yicha: zakaz → kuryer → zona → sklad → pul → hisobot.
 */
export type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  /** Bo'lim dopuski — yo'q bo'lsa menyuda ko'rinmaydi (`use-nav-items.ts`). */
  permission?: ChiefPermission;
};

export const NAV: NavItem[] = [
  { href: ROUTES.orders, label: "Zakazlar", Icon: Receipt },
  { href: ROUTES.couriers, label: "Kuryerlar", Icon: Truck },
  { href: ROUTES.zones, label: "Zonalar", Icon: Hexagon },
  { href: ROUTES.sklad, label: "Sklad", Icon: Warehouse, permission: "warehouse.view_courier_stores" },
  { href: ROUTES.cash, label: "Kassa", Icon: Wallet },
  { href: ROUTES.report, label: "Moliya", Icon: ChartColumnBig, permission: "view.analytics" },
];

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
