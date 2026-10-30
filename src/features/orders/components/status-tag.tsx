import { orderStatusInfo } from "@/features/orders/types";
import { cn } from "@/lib/utils";

/**
 * Status tegi — dizayndagi to'rtburchak teg (yumshoq fon, to'q yozuv).
 * Rang `--order-X` matn qatlamidan; fon undan aralashtiriladi.
 */
export function StatusTag({
  status,
  label,
  size = "sm",
  className,
}: {
  status: string;
  /** Backend `status_display`; bo'lmasa mahalliy nom. */
  label?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const info = orderStatusInfo(status);
  return (
    <span
      style={{ "--accent": info.color } as React.CSSProperties}
      className={cn(
        "inline-flex shrink-0 items-center rounded-md font-semibold whitespace-nowrap",
        "bg-[color-mix(in_oklab,var(--accent)_12%,var(--surface-1))] text-[var(--accent)]",
        size === "sm" ? "h-5.5 px-2 text-fine" : "h-6.5 px-2.5 text-meta",
        className,
      )}
    >
      {label || info.label}
    </span>
  );
}
