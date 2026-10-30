"use client";

import { Footprints, LoaderCircle, X } from "lucide-react";

import { inputClass } from "@/components/kit/field";
import { Button } from "@/components/ui/button";
import type { LiveCourier } from "@/features/couriers/live-tracking";
import { errorCode, errorMessage } from "@/lib/api-client";
import { formatDistance, todayIso } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Kun izi boshqaruvi: kuryer, kun, umumiy km, holatlar. */
export function TrackToolbar({
  courier,
  day,
  onDay,
  totalM,
  pointCount,
  isPending,
  error,
  onRetry,
  onClose,
}: {
  courier: LiveCourier | null;
  day: string;
  onDay: (day: string) => void;
  totalM: number | null;
  pointCount: number | null;
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
  onClose: () => void;
}) {
  const missing = errorCode(error) === "endpoint_missing";
  return (
    <div className="border-line bg-subtle/60 flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-2.5">
      <span className="text-ink flex items-center gap-1.5 text-dense font-semibold">
        <Footprints className="text-brand size-4" aria-hidden />
        Kun izi
        {courier ? (
          <span className="text-ink-muted font-normal" data-no-translit>
            {` — ${courier.fullName}`}
          </span>
        ) : null}
      </span>

      <label className="flex items-center gap-1.5 text-meta">
        <span className="text-ink-muted">Kun</span>
        <input
          type="date"
          value={day}
          max={todayIso()}
          onChange={(event) => {
            if (event.target.value) onDay(event.target.value);
          }}
          className={cn(inputClass, "h-8 w-auto px-2 text-meta")}
        />
      </label>

      {isPending ? (
        <span className="text-ink-muted flex items-center gap-1.5 text-meta">
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
          Iz yuklanmoqda…
        </span>
      ) : null}

      {error ? (
        <span className="text-danger flex items-center gap-2 text-meta">
          {missing
            ? "Kun izi uchun backend hali chiqmagan"
            : errorMessage(error, "Kun izini yuklashda xatolik")}
          {!missing ? (
            <Button variant="outline" size="xs" onClick={onRetry}>
              Qayta urinish
            </Button>
          ) : null}
        </span>
      ) : null}

      {pointCount !== null && !isPending ? (
        pointCount === 0 ? (
          <span className="text-ink-muted text-meta">Bu kunda joylashuv nuqtasi yo&apos;q</span>
        ) : (
          <span className="text-ink tabular text-meta">
            {`Jami ${formatDistance(totalM ?? 0)} · ${pointCount} ta nuqta`}
          </span>
        )
      ) : null}

      <Button variant="ghost" size="icon" onClick={onClose} aria-label="Kun izini yopish" className="ml-auto size-8">
        <X className="size-4" />
      </Button>
    </div>
  );
}
