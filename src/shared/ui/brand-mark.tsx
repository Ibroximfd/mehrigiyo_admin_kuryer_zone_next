import { Leaf } from "lucide-react";

import { cn } from "@/shared/lib/utils";

/** Mehrigiyo belgisi: "organik" barg brend rangida. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-brand-ink shadow-card", className)}>
      <Leaf className="size-5" aria-hidden />
    </span>
  );
}
