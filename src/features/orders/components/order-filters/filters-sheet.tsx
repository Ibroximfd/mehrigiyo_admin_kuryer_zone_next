"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { OrderFilterGroups } from "@/features/orders/components/order-filter-bar";
import { ListViewPills } from "@/features/orders/components/order-filters/list-view-pills";
import { QuickChips } from "@/features/orders/components/order-filters/quick-chips";
import type { QuickCounts } from "@/features/orders/client-filters";
import type { OrderFilters } from "@/features/orders/use-order-filters";
import { useIsMobile } from "@/hooks/use-media-query";

/**
 * «Filtrlar» — barcha filtrlar bitta panelda, guruhlangan (Bitrix filtri
 * kabi): desktopda o'ngdan, telefonda pastdan. Tanlov darhol qo'llanadi
 * (URLda), panel yopilishi shart emas. Tezkor presetlar (Yangi, Kechikkan…)
 * va ro'yxat ko'rinishi ham shu yerda — sarlavha tartibli qoladi, tanlangani
 * sarlavhada chip bo'lib ko'rinadi.
 */
export function FiltersSheet({
  filters,
  isBoard,
  quickCounts,
}: {
  filters: OrderFilters;
  isBoard: boolean;
  quickCounts: QuickCounts;
}) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const count = filters.activeCount;

  return (
    <>
      <Button
        variant={count > 0 ? "default" : "outline"}
        onClick={() => setOpen(true)}
        aria-label={count > 0 ? `Filtrlar — ${count} ta tanlangan` : "Filtrlar"}
      >
        <SlidersHorizontal className="size-4" />
        Filtrlar
        {count > 0 ? (
          <span className="bg-surface text-brand tabular rounded-full px-1.5 text-fine font-bold">{count}</span>
        ) : null}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={
            isMobile
              ? "flex max-h-[88dvh] flex-col gap-0 rounded-t-2xl p-0"
              : "flex w-[420px] max-w-[calc(100vw-1.5rem)] flex-col gap-0 p-0"
          }
        >
          <div className="border-line border-b px-5 py-4 pr-12">
            <SheetTitle className="text-ink text-base font-semibold">Filtrlar</SheetTitle>
            <SheetDescription className="text-ink-muted mt-1 text-meta">
              Tanlov darhol qo&apos;llanadi va havolada saqlanadi.
            </SheetDescription>
          </div>
          <div className="scrollbar-thin min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {isBoard ? (
              <section>
                <p className="eyebrow pb-2">Tezkor</p>
                <QuickChips
                  value={filters.quick}
                  counts={quickCounts}
                  onChange={(next) => void filters.setQuick(next)}
                  className="flex-wrap"
                />
              </section>
            ) : (
              <section>
                <p className="eyebrow pb-2">Ro&apos;yxat ko&apos;rinishi</p>
                <div className="flex flex-wrap items-center gap-2">
                  <ListViewPills filters={filters} />
                </div>
              </section>
            )}
            <OrderFilterGroups filters={filters} isBoard={isBoard} />
          </div>
          <div className="border-line flex items-center justify-between gap-2 border-t px-5 py-3">
            <Button variant="ghost" disabled={count === 0} onClick={filters.clearAll}>
              Hammasini tozalash
            </Button>
            <Button onClick={() => setOpen(false)}>Tayyor</Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
