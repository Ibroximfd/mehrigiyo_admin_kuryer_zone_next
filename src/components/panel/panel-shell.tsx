"use client";

import { Menu, WifiOff } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { DemoBadge } from "@/components/demo-badge";
import { AppSidebar } from "@/components/panel/app-sidebar";
import { PANEL_MAIN_ID } from "@/components/panel/main-scroll-memory";
import { isNavActive } from "@/components/panel/nav";
import { useNavItems } from "@/components/panel/use-nav-items";
import { UserMenu } from "@/components/panel/user-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

/**
 * Panel karkasi: desktopda yon panel, telefonda tepada sarlavha va pastda
 * olti bo'lim. Internet uzilsa — neytral ogohlantirish, kesh ko'rinib turadi.
 */
export function PanelShell({ children }: { children: React.ReactNode }) {
  const online = useOnlineStatus();
  const pathname = usePathname();

  return (
    <div className="flex h-dvh overflow-hidden">
      <div className="hidden shrink-0 md:flex">
        <AppSidebar />
      </div>

      <div className="bg-canvas relative flex min-w-0 flex-1 flex-col">
        {!online ? <OfflineBanner /> : null}
        <MobileTopBar />
        <main id={PANEL_MAIN_ID} className="relative min-w-0 flex-1 overflow-y-auto overscroll-contain pb-16 md:pb-0">
          {/* `key` — marshrut o'zgarganda kirish animatsiyasi qaytadan o'ynaydi. */}
          <div key={pathname} className="section-enter min-h-full">
            {children}
          </div>
        </main>
        <MobileBottomNav pathname={pathname} />
      </div>
    </div>
  );
}

function OfflineBanner() {
  return (
    <div role="status" className="bg-warn-soft text-warn flex shrink-0 items-center justify-center gap-2 px-4 py-2 text-dense font-medium">
      <WifiOff className="size-4 shrink-0" aria-hidden />
      Internet aloqasi yo&apos;q — ko&apos;rganingiz oxirgi saqlangan holat
    </div>
  );
}

function MobileTopBar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="bg-rail flex h-14 shrink-0 items-center gap-1 px-2 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger aria-label="Menyu" className="text-rail-ink hover:bg-rail-hover rounded-lg p-2 transition-colors">
          <Menu className="size-5" />
        </SheetTrigger>
        <SheetContent side="left" showCloseButton={false} aria-describedby={undefined} className="bg-rail w-64 border-none p-0">
          <SheetTitle className="sr-only">Asosiy menyu</SheetTitle>
          <AppSidebar onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <Link href={ROUTES.home} className="flex min-w-0 flex-1 items-center gap-2 px-1">
        <BrandLogo size={32} className="size-7 rounded-lg" />
        <span className="text-rail-ink truncate text-lg2 font-semibold">Mehrigiyo Bosh kuryer</span>
        <DemoBadge />
      </Link>
      <UserMenu variant="compact" />
    </header>
  );
}

function MobileBottomNav({ pathname }: { pathname: string }) {
  const navItems = useNavItems();
  return (
    <nav
      aria-label="Bo'limlar"
      className="border-line glass-chrome fixed inset-x-0 bottom-0 z-30 flex h-16 border-t pb-safe md:hidden"
    >
      {navItems.map((item) => {
        const active = isNavActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1"
          >
            <span
              aria-hidden
              className={cn("bg-brand absolute top-0 h-0.5 w-8 rounded-b-full transition-opacity", active ? "opacity-100" : "opacity-0")}
            />
            <item.Icon aria-hidden className={cn("size-5 transition-colors", active ? "text-brand" : "text-ink-faint")} />
            <span className={cn("truncate text-fine transition-colors", active ? "text-brand font-semibold" : "text-ink-faint")}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
