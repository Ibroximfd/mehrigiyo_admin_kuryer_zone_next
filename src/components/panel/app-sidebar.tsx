"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { DemoBadge } from "@/components/demo-badge";
import { isNavActive } from "@/components/panel/nav";
import { useNavItems } from "@/components/panel/use-nav-items";
import { UserMenu } from "@/components/panel/user-menu";
import { SERVER_NAME } from "@/lib/api-constants";
import { DEMO_MODE } from "@/lib/demo/mode";
import { cn } from "@/lib/utils";

/** Yon panel — desktopda doim ochiq, mobilda surilma menyu ichida. */
export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const navItems = useNavItems();

  return (
    <div className="bg-rail rail-grad flex h-full w-64 flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2.5 px-4">
        <BrandLogo size={40} priority className="size-9 shrink-0 rounded-lg ring-1 ring-white/10" />
        <div className="min-w-0 flex-1">
          <p className="text-rail-ink truncate text-body font-semibold">Mehrigiyo</p>
          <p className="text-rail-ink-muted text-micro flex items-center gap-1 truncate tracking-normal">
            Bosh kuryer
            {/* Test serverida ishlayotganini adashtirmaslik uchun belgi. */}
            {DEMO_MODE ? (
              <DemoBadge className="ml-0.5" />
            ) : SERVER_NAME !== "prod" ? (
              <span className="bg-warn-soft text-warn ml-0.5 shrink-0 rounded px-1.5 py-px text-fine font-bold tracking-wide uppercase">
                {SERVER_NAME}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <nav aria-label="Asosiy menyu" className="scrollbar-none mt-3 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3">
        {navItems.map((item) => {
          const active = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-dense font-medium",
                "transition-colors duration-(--dur-micro) ease-out",
                active
                  ? "bg-rail-elevated text-rail-accent"
                  : "text-rail-ink-muted hover:bg-rail-hover hover:text-rail-ink",
              )}
            >
              <item.Icon className="size-4.5 shrink-0" aria-hidden />
              <span className="flex-1 truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-rail-line shrink-0 border-t p-2">
        <UserMenu />
      </div>
    </div>
  );
}
