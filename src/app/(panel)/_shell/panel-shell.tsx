"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { NAV_ITEMS } from "@/shared/config/nav";
import { isTestServer } from "@/shared/config/env";
import { ROUTES } from "@/shared/config/routes";
import { useT } from "@/shared/i18n/locale";
import { Badge } from "@/shared/ui/badge";
import { BrandMark } from "@/shared/ui/brand-mark";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/ui/sheet";

import { AccountControls, AccountSummary } from "./account-controls";
import { AccountMenu } from "./account-menu";
import { BottomNavLink, NavLink } from "./nav-link";

function Brand() {
  const t = useT();
  return (
    <Link href={ROUTES.home} className="flex min-w-0 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
      <BrandMark />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-ink">{t.meta.appName}</span>
        <span className="block truncate text-xs text-ink-faint">{t.meta.appTagline}</span>
      </span>
    </Link>
  );
}

function TestServerBadge() {
  const t = useT();
  return isTestServer ? <Badge tone="warn">{t.shell.testServer}</Badge> : null;
}

/**
 * Karkas:
 *   • lg+   — chapda qotgan yon panel (bo'limlar + akkaunt menyusi);
 *   • < lg  — tepada ixcham sarlavha, pastda 4 bo'lim + "Menyu" paneli.
 */
export function PanelShell({ children }: { children: ReactNode }) {
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-canvas">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow-raised"
      >
        {t.nav.skipToContent}
      </a>

      {/* Desktop yon panel */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-(--sidebar-w) flex-col border-r border-line bg-surface lg:flex">
        <div className="flex items-center gap-2 px-4 pt-5 pb-4">
          <Brand />
        </div>
        <nav aria-label={t.nav.label} className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>
        <div className="flex flex-col gap-2 border-t border-line p-3">
          <TestServerBadge />
          <AccountMenu />
        </div>
      </aside>

      {/* Telefon/planshet sarlavhasi */}
      <header className="sticky top-0 z-30 flex h-(--topbar-h) items-center justify-between gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur-md lg:hidden">
        <Brand />
        <TestServerBadge />
      </header>

      <div className="lg:pl-(--sidebar-w)">
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto flex w-full max-w-(--content-max-w) flex-col gap-6 px-4 pt-5 pb-28 outline-none sm:px-6 sm:pt-8 lg:px-10 lg:pb-12"
        >
          {children}
        </main>
      </div>

      {/* Telefon/planshet pastki paneli */}
      <nav
        aria-label={t.nav.label}
        className="fixed inset-x-0 bottom-0 z-30 flex h-(--bottomnav-h) border-t border-line bg-surface/95 pb-(--safe-pad-sm) backdrop-blur-md box-content lg:hidden"
      >
        {NAV_ITEMS.filter((item) => item.inBottomBar).map((item) => (
          <BottomNavLink key={item.href} item={item} />
        ))}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label={t.nav.openMenu}
          aria-expanded={menuOpen}
          className="flex h-full flex-1 flex-col items-center justify-center gap-1 text-xs font-medium text-ink-faint outline-none transition hover:text-ink focus-visible:bg-surface-2"
        >
          <span className="grid h-7 w-12 place-items-center rounded-full">
            <Menu className="size-5" aria-hidden />
          </span>
          {t.nav.menu}
        </button>
      </nav>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent closeLabel={t.common.close} side="left">
          <SheetHeader>
            <SheetTitle>{t.nav.menu}</SheetTitle>
            <SheetDescription className="sr-only">{t.nav.label}</SheetDescription>
            <AccountSummary />
          </SheetHeader>
          <SheetBody className="flex flex-col gap-6">
            <nav aria-label={t.nav.label} className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.href} item={item} onNavigate={() => setMenuOpen(false)} />
              ))}
            </nav>
            <AccountControls />
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
