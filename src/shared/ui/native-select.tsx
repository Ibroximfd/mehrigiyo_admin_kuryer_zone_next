import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/utils";

import { inputClassName } from "./input";

/**
 * Brauzerning o'z `<select>` i: telefonda tizim tanlovchisi ochiladi,
 * klaviatura va ekran o'quvchi bilan bepul ishlaydi.
 */
export function NativeSelect({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className={cn("relative", className)}>
      <select className={cn(inputClassName, "cursor-pointer appearance-none pr-9")} {...props}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-faint"
        aria-hidden
      />
    </div>
  );
}
