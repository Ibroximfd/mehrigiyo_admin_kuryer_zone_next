import { cn } from "@/shared/lib/utils";

/** Holat nuqtasi — rang yolg'iz signal emas: yonida doim matn turadi. */
export function StatusDot({ tone, pulse = false, className }: { tone: "ok" | "warn" | "muted" | "danger"; pulse?: boolean; className?: string }) {
  return (
    <span aria-hidden className={cn("relative inline-flex size-2.5 shrink-0", className)}>
      {pulse ? <span className="absolute inset-0 animate-ping rounded-full bg-ok opacity-60" /> : null}
      <span
        className={cn(
          "relative inline-flex size-2.5 rounded-full",
          tone === "ok" && "bg-ok",
          tone === "warn" && "bg-warn",
          tone === "danger" && "bg-danger",
          tone === "muted" && "bg-line-strong",
        )}
      />
    </span>
  );
}
