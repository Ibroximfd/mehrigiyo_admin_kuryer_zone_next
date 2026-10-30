"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

const TABS = [
  { href: ROUTES.chief, label: "Zakazlar" },
  { href: ROUTES.chiefCouriers, label: "Kuryerlar" },
  { href: ROUTES.chiefZones, label: "Zonalar" },
  { href: ROUTES.chiefCash, label: "Kassa" },
  { href: ROUTES.chiefStats, label: "Analitika" },
] as const;

/** Bo'lim ichidagi tablar — Moliya bilan bir xil ko'rinish. */
export function ChiefNav({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Bosh kuryer bo'limlari" className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-8 items-center rounded-lg border px-3 text-dense font-medium transition-colors",
              active
                ? "border-ink bg-ink text-surface"
                : "border-line text-ink-muted hover:border-line-strong hover:text-ink bg-surface",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
