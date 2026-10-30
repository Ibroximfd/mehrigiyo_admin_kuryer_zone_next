"use client";

import { Columns3, Ellipsis, FileSpreadsheet, List, LoaderCircle, Printer } from "lucide-react";

import { SearchInput } from "@/components/kit/search-input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PrimaryFilterPills } from "@/features/orders/components/order-filter-bar";
import { ActiveFilterChips } from "@/features/orders/components/order-filters/active-filter-chips";
import { ColumnsMenu } from "@/features/orders/components/order-filters/columns-menu";
import { FiltersSheet } from "@/features/orders/components/order-filters/filters-sheet";
import { SortPill } from "@/features/orders/components/order-filters/sort-pill";
import type { OrderSort } from "@/features/orders/order-sort";
import type { QuickCounts } from "@/features/orders/client-filters";
import type { OrderFilters } from "@/features/orders/use-order-filters";
import type { OrdersView } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

/**
 * Buyurtmalar sahifasi sarlavhasi — Bitrix filtri kabi tartib (2026-10-30):
 *   1) «Buyurtmalar» · (keng ekranda Davr, Viloyat) · Filtrlar · Ustunlar ·
 *      Varaqalar/CSV (telefonda «⋯» ichida);
 *   2) Kanban | Ro'yxat · tanlangan filtrlar (o'chiriladigan, suriladi) · saralash;
 *   3) o'ngda izoh/xulosa.
 * Tezkor presetlar va ro'yxat guruhlashi — «Filtrlar» panelida (2026-10-30).
 * Hech bir qator ekrandan chiqib ketmaydi: yarim ekranda ham, telefonda ham.
 */
export function OrdersToolbar({
  filters,
  view,
  onViewChange,
  couriers,
  quickCounts,
  sort,
  onSortChange,
  isSearching,
  summary,
  exporting,
  onExport,
  onPrintSheets,
}: {
  filters: OrderFilters;
  view: OrdersView;
  onViewChange: (view: OrdersView) => void;
  couriers: Array<{ id: number; fullName: string }> | null;
  quickCounts: QuickCounts;
  sort: OrderSort;
  onSortChange: (sort: OrderSort) => void;
  isSearching: boolean;
  /** O'ng chetdagi matn: doskada izoh, ro'yxatda xulosa. */
  summary: React.ReactNode;
  exporting: boolean;
  onExport: () => void;
  onPrintSheets: () => void;
}) {
  const isBoard = view === "board";

  return (
    <div className="flex flex-col gap-2.5 px-4 pt-4 sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="text-ink text-display min-w-0 truncate">Buyurtmalar</h1>
        <div className="ml-3 hidden min-w-0 xl:block">
          <PrimaryFilterPills filters={filters} />
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <FiltersSheet filters={filters} isBoard={isBoard} quickCounts={quickCounts} />
          {isBoard ? <ColumnsMenu /> : null}
          <div className="hidden items-center gap-2 md:flex">
            <Button variant="outline" onClick={onPrintSheets} title="Faol buyurtmalar yo'l varaqalari">
              <Printer className="size-4" />
              <span className="hidden lg:inline">Varaqalar</span>
            </Button>
            <Button variant="outline" disabled={exporting} onClick={onExport} title="Joriy filtr bo'yicha CSVga yuklab olish">
              {exporting ? <LoaderCircle className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
              <span className="hidden lg:inline">CSV</span>
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="Boshqa amallar">
                <Ellipsis className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onPrintSheets}>
                <Printer />
                Varaqalar
              </DropdownMenuItem>
              <DropdownMenuItem disabled={exporting} onSelect={onExport}>
                <FileSpreadsheet />
                CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <SearchInput
        value={filters.search}
        onChange={(value) => void filters.setSearch(value)}
        placeholder="# raqam, telefon, ism"
        isSearching={isSearching}
        className="w-full md:hidden"
      />

      <div className="flex min-w-0 items-center gap-2">
        <ViewSwitch view={view} onChange={onViewChange} />
        <div data-wheel-x className="scrollbar-none fade-edges min-w-0 flex-1 overflow-x-auto py-0.5">
          <ActiveFilterChips filters={filters} couriers={couriers} />
        </div>
        <div className="shrink-0">
          <SortPill value={sort} onChange={onSortChange} />
        </div>
      </div>

      {summary ? <div className="text-ink-muted -mt-1 text-right text-meta">{summary}</div> : null}
    </div>
  );
}

function ViewSwitch({
  view,
  onChange,
}: {
  view: OrdersView;
  onChange: (view: OrdersView) => void;
}) {
  const items = [
    ["board", "Kanban", Columns3],
    ["list", "Ro'yxat", List],
  ] as const;

  return (
    <div role="tablist" aria-label="Ko'rinish" className="bg-surface-3 inline-flex shrink-0 gap-0.5 rounded-lg p-0.5">
      {items.map(([value, label, Icon]) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={view === value}
          aria-label={label}
          onClick={() => onChange(value)}
          className={cn(
            "inline-flex h-7.5 items-center gap-1.5 rounded-md px-3 text-dense font-semibold transition-[background-color,color,box-shadow] duration-(--dur-micro)",
            view === value ? "bg-surface text-ink elev-1" : "text-ink-muted hover:text-ink",
          )}
        >
          <Icon className="size-4 lg:hidden" aria-hidden />
          <span className="hidden lg:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
