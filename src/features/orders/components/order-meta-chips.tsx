import { pendingReasonLabel } from "@/features/orders/types";
import { cn } from "@/lib/utils";

/**
 * Kartochka, qator va detal uchun mayda ma'lumot chiplari (`02` §2.2, §5).
 *
 * Hammasi undefined-safe: maydon bo'lmasa chip chizilmaydi — backend hali
 * bermagan ma'lumot "yo'q" deb ko'rsatilmaydi.
 */
const CHIP =
  "inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-px font-medium";

/** `pending` ustunidagi karta nimani kutayotgani. */
export function PendingReasonChip({
  reason,
  className,
}: {
  reason: string | null;
  className?: string;
}) {
  const label = pendingReasonLabel(reason);
  if (!label) return null;
  return (
    <span className={cn(CHIP, "bg-warn-soft text-warn text-micro", className)}>
      {label}
    </span>
  );
}
