"use client";

import { LoaderCircle, Printer, Tag, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RegionDispatchDialog } from "@/features/chief/components/region-dispatch-dialog";
import { useBulkPatch } from "@/features/orders/components/bulk/use-bulk-patch";
import { printWaybills } from "@/features/orders/components/waybill";
import { orderCodeMessage } from "@/features/orders/error-hints";
import { ORDER_TAGS, tagInfo } from "@/features/orders/tags";
import type { LogistOrder } from "@/features/orders/types";
import { MergeStopButton } from "@/features/stops/components/merge-stop-button";
import { cn } from "@/lib/utils";

const GHOST =
  "border-rail-ink/30 text-rail-ink hover:bg-rail-hover inline-flex h-7.5 items-center gap-1.5 rounded-lg border px-3 text-dense font-semibold transition-colors duration-(--dur-micro) disabled:opacity-50";

/**
 * Ommaviy amallar paneli — dizayndagi suzuvchi navy plashka (doska va
 * ro'yxat uchun bitta): **Bosh kuryerlarga berish** (viloyatlar bo'yicha),
 * manzilga birlashtirish, varaqa, teg. Qisman xatolar sabab bo'yicha bitta xabarda.
 */
export function BulkBar({
  orders,
  allCount,
  onSelectAll,
  onClear,
}: {
  orders: LogistOrder[];
  /** Ko'rinib turgan jami — "hammasini tanlash" uchun; kerak bo'lmasa `null`. */
  allCount: number | null;
  onSelectAll?: () => void;
  onClear: () => void;
}) {
  const [shipOpen, setShipOpen] = useState(false);
  if (orders.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Ommaviy amallar"
      className="bg-rail text-rail-ink elev-4 animate-in fade-in slide-in-from-bottom-3 fixed inset-x-3 bottom-20 z-40 mx-auto flex w-fit max-w-[calc(100vw-1.5rem)] flex-wrap items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-dense duration-(--dur-standard) md:bottom-5 md:left-(--rail-w)"
    >
      <b className="font-semibold">{orders.length} ta tanlandi</b>
      {allCount !== null && onSelectAll && orders.length < allCount ? (
        <button
          type="button"
          onClick={onSelectAll}
          className="text-rail-accent hover:text-rail-ink text-meta font-medium transition-colors"
        >
          hammasini ({allCount})
        </button>
      ) : null}
      <span aria-hidden className="bg-rail-ink/20 h-5 w-px" />

      {/* Logist kuryer tanlamaydi — viloyat bosh kuryeriga beradi (2026-10-30). */}
      <button
        type="button"
        onClick={() => setShipOpen(true)}
        className="bg-amber text-amber-ink hover:bg-amber-hover inline-flex h-7.5 items-center gap-1.5 rounded-lg px-3 font-semibold transition-colors duration-(--dur-micro)"
      >
        <Truck className="size-3.5" aria-hidden />
        Bosh kuryerlarga berish
      </button>

      <MergeStopButton orders={orders} className={GHOST} onDone={onClear} />

      <button type="button" className={GHOST} onClick={() => void printWaybills(orders)}>
        <Printer className="size-3.5" aria-hidden />
        Varaqa
      </button>

      <TagMenu orders={orders} />

      <button
        type="button"
        onClick={onClear}
        className="text-rail-ink-muted hover:text-rail-ink text-meta transition-colors"
      >
        Bekor
      </button>

      <RegionDispatchDialog
        orders={orders}
        open={shipOpen}
        onOpenChange={setShipOpen}
        onDone={onClear}
      />
    </div>
  );
}

/** Teg — har buyurtmaning o'z teglariga qo'shiladi (to'liq ro'yxat PATCH). */
function TagMenu({ orders }: { orders: LogistOrder[] }) {
  const bulk = useBulkPatch();

  const addTag = async (tag: string) => {
    const byId = new Map(orders.map((order) => [order.id, order]));
    const summary = await bulk.run(
      orders.map((order) => order.id),
      (id) => ({ tags: [...new Set([...(byId.get(id)?.tags ?? []), tag])] }),
    );
    const label = tagInfo(tag).label;
    if (summary.succeeded.length > 0) {
      toast.success(`«${label}» — ${summary.succeeded.length} ta buyurtmaga qo'shildi`);
    }
    for (const group of summary.failed) {
      toast.error(`${group.count} ta buyurtma: ${orderCodeMessage(group.code)}`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(GHOST)} disabled={bulk.running}>
        {bulk.running ? (
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Tag className="size-3.5" aria-hidden />
        )}
        Teg
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-52">
        {ORDER_TAGS.map((tag) => (
          <DropdownMenuItem key={tag.value} onSelect={() => void addTag(tag.value)}>
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ backgroundColor: tag.color }}
            />
            {tag.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
