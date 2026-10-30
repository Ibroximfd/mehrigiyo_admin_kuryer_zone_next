"use client";

import { Eye } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { canWriteAny } from "../permissions";
import type { SkladMe } from "../types";

/**
 * Sklad ichki bo'limlari — Doska · Mahsulotlar · Harakatlar · Kuryerlar.
 * O'ngda rol belgisi: faqat ko'rish rejimida «KO'RISH» chiqadi, filial
 * logistida dopusk berilgan mahsulotlar soni.
 */
const TABS = [
  { href: ROUTES.sklad, label: "Doska" },
  { href: ROUTES.skladItems, label: "Mahsulotlar" },
  { href: ROUTES.skladLedger, label: "Harakatlar" },
  { href: ROUTES.skladCouriers, label: "Kuryerlar" },
];

export function SkladNav({ me }: { me: SkladMe | null }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <nav aria-label="Sklad bo'limlari" className="flex items-center gap-1.5">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-8 items-center rounded-full border px-3 text-dense font-medium transition-colors",
                active
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-line text-ink-muted hover:border-line-strong hover:text-ink bg-surface",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <RoleBadge me={me} />
    </div>
  );
}

function RoleBadge({ me }: { me: SkladMe | null }) {
  if (!me) return null;
  if (me.role === "logist.main") return null;
  if (canWriteAny(me)) {
    return (
      <span className="bg-amber-soft text-gold rounded-full px-2.5 py-1 text-fine font-bold tracking-wide uppercase">
        {`Dopusk · ${me.grantedItemIds.length} mahsulot`}
      </span>
    );
  }
  return (
    <span className="bg-subtle text-ink-muted flex items-center gap-1 rounded-full px-2.5 py-1 text-fine font-bold tracking-wide uppercase">
      <Eye className="size-3" />
      Ko&apos;rish
    </span>
  );
}
