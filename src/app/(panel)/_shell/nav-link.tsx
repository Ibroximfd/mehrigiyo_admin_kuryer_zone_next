"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isNavActive, type NavItem } from "@/shared/config/nav";
import { useT } from "@/shared/i18n/locale";
import { cn } from "@/shared/lib/utils";

/** Yon panel va menyu varag'idagi bo'lim havolasi. */
export function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const t = useT();
  const pathname = usePathname();
  const active = isNavActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium outline-none transition lg:min-h-10",
        "focus-visible:ring-3 focus-visible:ring-ring/40",
        active ? "bg-brand-soft text-brand-soft-ink" : "text-ink-muted hover:bg-surface-2 hover:text-ink",
      )}
    >
      <Icon className={cn("size-5 shrink-0 lg:size-4", active ? "text-brand" : "text-ink-faint")} aria-hidden />
      {item.label(t)}
    </Link>
  );
}

/** Telefon/planshet pastki paneli tugmasi. */
export function BottomNavLink({ item }: { item: NavItem }) {
  const t = useT();
  const pathname = usePathname();
  const active = isNavActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-full flex-1 flex-col items-center justify-center gap-1 text-xs font-medium outline-none transition",
        "focus-visible:bg-surface-2",
        active ? "text-brand" : "text-ink-faint hover:text-ink",
      )}
    >
      <span className={cn("grid h-7 w-12 place-items-center rounded-full transition", active && "bg-brand-soft")}>
        <Icon className="size-5" aria-hidden />
      </span>
      {item.label(t)}
    </Link>
  );
}
