import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("rounded-xl border border-line bg-surface shadow-card", className)} {...props} />
  );
}
