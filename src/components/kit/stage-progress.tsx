import { cn } from "@/lib/utils";

/**
 * Bosqich chizig'i (Bitrix uslubi) — "strelka" segmentlar. CRM bilan bir xil
 * kit (`05` §6), ranglar esa chaqiruvchidan: har bosqich o'z `mark` rangi.
 *
 *   done    — o'tilgan (xira);
 *   current — joriy bosqich (to'liq rang, oq yozuv);
 *   next    — keyingi qadam taklifi (uzuq ramka, indigo);
 *   todo    — kelgusi (xira).
 *
 * `onSelect` berilgan segment bosiladigan tugma bo'ladi — ruxsatni chaqiruvchi
 * hal qiladi (permissions.ts).
 */
export type StageState = "done" | "current" | "next" | "todo";

export type Stage = {
  key: string;
  label: string;
  state: StageState;
  /** Joriy bosqich foni (`--order-X-mark`). */
  mark: string;
  onSelect?: () => void;
  title?: string;
};

const STATE_CLASS: Record<StageState, string> = {
  done: "bg-surface-3 text-ink-faint",
  current: "bg-[var(--mark)] text-white",
  next: "bg-brand-soft text-brand border border-dashed border-[var(--order-shipping-mark)]",
  todo: "bg-surface-3 text-ink-faint",
};

export function StageProgress({
  stages,
  className,
}: {
  stages: Stage[];
  className?: string;
}) {
  return (
    // Tor ekranda segmentlar siqilib yozuv yo'qolmasin: har biri kamida
    // `min-w-28`, sig'masa chiziq gorizontal suriladi.
    <ol
      aria-label="Buyurtma bosqichlari"
      data-wheel-x
      className={cn("scrollbar-none flex min-w-0 gap-1 overflow-x-auto", className)}
    >
      {stages.map((stage) => {
        const body = (
          <span className="truncate px-4" title={stage.label}>
            {stage.label}
          </span>
        );
        const classes = cn(
          "stage-chevron text-micro flex h-9 min-w-28 flex-1 items-center justify-center font-bold tracking-wide uppercase",
          "transition-[filter] duration-(--dur-micro)",
          STATE_CLASS[stage.state],
          stage.onSelect && "cursor-pointer hover:brightness-95",
        );
        return (
          <li
            key={stage.key}
            aria-current={stage.state === "current" ? "step" : undefined}
            style={{ "--mark": stage.mark } as React.CSSProperties}
            className={classes}
            title={stage.title}
          >
            {stage.onSelect ? (
              <button
                type="button"
                onClick={stage.onSelect}
                className="flex h-full w-full min-w-0 items-center justify-center"
              >
                {body}
              </button>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ol>
  );
}
