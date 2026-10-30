"use client";

import { Warehouse } from "lucide-react";

import { EmptyView } from "@/components/kit/state-views";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Sklad sahifalarining umumiy holatlari — backend kutilmoqda va skeleton.
 * Xato/bo'sh/natija yo'q — `state-views` dan, har sahifa o'zi chaqiradi.
 */
export function SkladMissingView() {
  return (
    <EmptyView
      Icon={Warehouse}
      title="Sklad bo'limi backend'ni kutmoqda"
      description="Sklad API chiqishi bilan bu yerda viloyatlar xaritasi, qoldiqlar va harakatlar ko'rinadi."
      className="border-line bg-surface rounded-xl border"
    />
  );
}

export function SkladBoardSkeleton() {
  return (
    <div className="flex flex-col gap-3.5" aria-hidden>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-[108px] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-[420px] rounded-2xl" />
      <Skeleton className="h-[320px] rounded-2xl" />
    </div>
  );
}
