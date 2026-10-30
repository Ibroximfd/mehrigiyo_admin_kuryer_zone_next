import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-3.5" aria-hidden>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-3.5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-3.5">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-60 rounded-xl" />
        </div>
        <div className="flex flex-col gap-3.5">
          <Skeleton className="h-52 rounded-xl" />
          <Skeleton className="h-52 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
