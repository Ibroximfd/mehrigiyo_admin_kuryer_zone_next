import { cn } from "@/lib/utils";

/** Dashboard kartasi (`.card`): katta harfli sarlavha + o'ngda havola. */
export function DashboardCard({
  title,
  aside,
  children,
  className,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "glass-card flex min-w-0 flex-col gap-3 rounded-2xl border px-4 py-4 sm:px-4.5",
        className,
      )}
    >
      <h3 className="text-ink-muted text-micro flex items-center justify-between gap-2 font-bold tracking-widest uppercase">
        {title}
        {aside ? <span className="text-meta font-medium tracking-normal normal-case">{aside}</span> : null}
      </h3>
      {children}
    </section>
  );
}
