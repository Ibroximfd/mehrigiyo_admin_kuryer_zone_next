"use client";

import { History, RefreshCw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TimelineComposer } from "@/features/orders/components/order-detail/timeline/timeline-composer";
import { TimelineEventCard } from "@/features/orders/components/order-detail/timeline/timeline-event-card";
import { TIMELINE_FILTERS, filterTimeline } from "@/features/orders/timeline";
import type { TimelineFilter } from "@/features/orders/timeline";
import type { LogistOrderDetail } from "@/features/orders/types";
import { useOrderTimeline } from "@/features/orders/use-order-timeline";
import { errorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/**
 * O'ng ustun — **Tarix**: filtr chiplari, izoh yozish va yagona lenta
 * (status/maydon o'zgarishlari diff bilan, tasdiq, kuryer, urinish, to'lov,
 * izohlar, qo'ng'iroqlar). Har PATCH'dan keyin lenta darhol yangilanadi.
 */
export function OrderTimeline({
  orderId,
  detail,
}: {
  orderId: string;
  detail: LogistOrderDetail | undefined;
}) {
  const [filter, setFilter] = useState<TimelineFilter>("all");
  const timeline = useOrderTimeline(orderId, detail);
  const visible = filterTimeline(timeline.items, filter);

  return (
    <aside aria-label="Buyurtma tarixi" className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-ink-muted text-micro font-bold tracking-widest uppercase">Tarix</h3>
        <span className="flex-1" />
        {TIMELINE_FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={filter === item.value}
            onClick={() => setFilter(item.value)}
            className={cn(
              "h-6 rounded-md border px-2 text-fine font-semibold transition-colors duration-(--dur-micro)",
              filter === item.value
                ? "bg-brand-soft text-brand border-transparent"
                : "border-line bg-surface text-ink-muted hover:text-ink",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <TimelineComposer orderId={orderId} />

      {timeline.isPending ? (
        <div className="space-y-2.5" aria-hidden>
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="flex gap-3">
              <Skeleton className="size-7.5 shrink-0 rounded-full" />
              <Skeleton className="h-16 flex-1 rounded-lg" />
            </div>
          ))}
        </div>
      ) : timeline.error && timeline.items.length === 0 ? (
        <div role="alert" className="bg-danger-soft text-danger flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-meta">
          {errorMessage(timeline.error, "Tarixni yuklashda xatolik")}
          <Button size="sm" variant="outline" onClick={timeline.refetch}>
            <RefreshCw />
            Qayta urinish
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <p className="border-line text-ink-faint flex flex-col items-center gap-1.5 rounded-lg border border-dashed px-4 py-8 text-center text-meta">
          <History className="size-5" aria-hidden />
          {filter === "all"
            ? "Hali yozuv yo'q — o'zgarishlar va izohlar shu yerda ko'rinadi."
            : "Bu turdagi yozuv yo'q."}
        </p>
      ) : (
        <ol className="flex flex-col gap-2.5">
          {visible.map((item) => (
            <TimelineEventCard key={item.id} item={item} />
          ))}
        </ol>
      )}
    </aside>
  );
}
