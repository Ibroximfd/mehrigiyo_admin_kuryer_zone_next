import { cn } from "@/lib/utils";

export type KeyFigure = {
  label: string;
  value: string;
  /** Qiymat ostidagi izoh. */
  hint?: string;
  /** Diqqat talab qiladigan qiymat (kam qoldiq, kechikish). */
  tone?: "default" | "warn" | "ok";
};

const TONE: Record<NonNullable<KeyFigure["tone"]>, string> = {
  default: "text-ink",
  warn: "text-warn",
  ok: "text-ok",
};

/**
 * Bo'limning asosiy raqamlari — bitta chiziqda, ajratgich bilan.
 * Alohida kartochkalar emas: ko'z bir qarashda butun qatorni o'qiydi.
 */
export function KeyFigures({ items, className }: { items: KeyFigure[]; className?: string }) {
  return (
    <dl
      className={cn(
        // Ajratgichlar — kataklar orasidagi 1px tirqish (`bg-line` ko'rinadi).
        "border-line bg-line grid gap-px overflow-hidden rounded-2xl border",
        items.length % 2 === 0 ? "grid-cols-2" : "grid-cols-1",
        items.length >= 4 ? "sm:grid-cols-4" : items.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="bg-surface min-w-0 px-4 py-3.5">
          <dt className="text-ink-muted truncate text-meta">{item.label}</dt>
          <dd className={cn("tabular mt-1 truncate text-title", TONE[item.tone ?? "default"])}>{item.value}</dd>
          {item.hint ? <dd className="text-ink-faint mt-0.5 truncate text-meta">{item.hint}</dd> : null}
        </div>
      ))}
    </dl>
  );
}

/** Sahifa bo'limi: sarlavha, izoh va o'ngda amal — bir xil ritm. */
export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-ink text-lg2 font-semibold">{title}</h2>
          {description ? <p className="text-ink-muted mt-0.5 text-meta">{description}</p> : null}
        </div>
        {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
