import { cn } from "@/lib/utils";

/** Kartochka bo'limi — dizayndagi `.sec`: oq sirt, katta harfli sarlavha. */
export function DetailSection({
  title,
  aside,
  children,
  className,
}: {
  title: React.ReactNode;
  /** Sarlavha o'ng tomonidagi havola/izoh. */
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "border-line bg-surface flex flex-col gap-3.5 rounded-xl border px-4 py-4 sm:px-5",
        className,
      )}
    >
      <h3 className="text-ink-muted text-micro flex items-center justify-between gap-3 font-bold tracking-widest uppercase">
        <span className="flex items-center gap-2">{title}</span>
        {aside ? (
          <span className="text-meta min-w-0 truncate font-medium tracking-normal normal-case">
            {aside}
          </span>
        ) : null}
      </h3>
      {children}
    </section>
  );
}

/** Yorliq + qiymat (`.f .l` / `.f .v`). */
export function DetailField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span className="text-ink-faint text-micro uppercase">{label}</span>
      <div className="text-ink text-body leading-snug">{children}</div>
    </div>
  );
}

/** Holat jadvali qatori — uzuq chiziq bilan ajratilgan "kalit … qiymat". */
export function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-line flex items-center justify-between gap-3 border-b border-dashed py-2 text-dense last:border-b-0">
      <span className="text-ink-muted shrink-0">{label}</span>
      <span className="min-w-0 text-right">{children}</span>
    </div>
  );
}

export const EMPTY_VALUE = <span className="text-ink-faint">—</span>;
