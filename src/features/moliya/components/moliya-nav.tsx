"use client";

import { useMutation } from "@tanstack/react-query";
import { ChevronDown, Download, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

import { PeriodFilterBar } from "@/components/kit/period-filter-bar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { skladErrorMessage } from "@/features/sklad/error-hints";
import { isMainLogist } from "@/features/sklad/permissions";
import type { SkladMe } from "@/features/sklad/types";
import type { PeriodFilterControls } from "@/hooks/use-period-filter";
import { formatDayMonth, parseDate } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { exportFinance } from "../api";

type ExportSection = Parameters<typeof exportFinance>[0];

const REPORTS: Array<{ section: ExportSection; label: string }> = [
  { section: "moliya", label: "Umumiy hisobot" },
  { section: "mahsulotlar", label: "Mahsulotlar bo'yicha" },
  { section: "operatorlar", label: "Operatorlar bo'yicha" },
];

/**
 * Moliya filtr qatori (dizayn 4, «1»): filial + sana chapda, o'ngda
 * moliya ichidagi bo'limlar. Filtr URLda — bo'limlar orasida `search`
 * bilan birga yuradi. Sozlamalar faqat asosiy logistda.
 */
export function MoliyaNav({ controls, me }: { controls: PeriodFilterControls; me: SkladMe | null }) {
  const pathname = usePathname();
  const tabs = [
    { href: ROUTES.moliya, label: "Umumiy" },
    { href: ROUTES.moliyaOperators, label: "Operatorlar" },
    ...(isMainLogist(me) ? [{ href: ROUTES.moliyaSettings, label: "Sozlamalar" }] : []),
  ];

  return (
    <PeriodFilterBar controls={controls}>
      <nav aria-label="Moliya bo'limlari" className="flex items-center gap-1.5">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={`${tab.href}${controls.search}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-8 items-center rounded-lg border px-3 text-dense font-medium transition-colors",
                active ? "border-ink bg-ink text-surface" : "border-line text-ink-muted hover:border-line-strong hover:text-ink bg-surface",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </PeriodFilterBar>
  );
}

/**
 * Eksport (dizayn «2») — joriy filtr bilan: filial tanlansa faqat o'sha
 * filial fayli. Uch xil hisobot (§12).
 */
export function ExportMenu({ controls, filialName }: { controls: PeriodFilterControls; filialName?: string | null }) {
  const download = useMutation({
    mutationFn: (section: ExportSection) => exportFinance(section, controls.filter),
    onError: (error) => toast.error(skladErrorMessage(error, "Eksportda xatolik")),
  });
  const from = parseDate(controls.filter.from);
  const to = parseDate(controls.filter.to);
  const range = from && to ? `${formatDayMonth(from)}–${formatDayMonth(to)}` : "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="lg" disabled={download.isPending} title="Joriy filtr bilan yuklab olish">
          {download.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}
          <span className="hidden sm:inline">Eksport</span>
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-ink-faint text-fine font-medium">
          Joriy filtr: {filialName ?? "barcha filiallar"}
          {range ? ` · ${range}` : ""}
        </DropdownMenuLabel>
        {REPORTS.map((report) => (
          <DropdownMenuItem key={report.section} onSelect={() => download.mutate(report.section)} className="justify-between">
            {report.label}
            <span className="text-ink-faint text-fine">XLSX</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-ink-faint text-fine font-normal">Filialni tanlasangiz — faqat o&apos;sha filial fayli</DropdownMenuLabel>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
