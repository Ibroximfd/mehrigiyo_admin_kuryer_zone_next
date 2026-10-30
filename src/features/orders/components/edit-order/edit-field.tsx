import { inputClass } from "@/components/kit/field";
import { cn } from "@/lib/utils";

/** O'zgargan maydon — amber ramka va fon (dizayn `.in.changed`). */
export function changedClass(changed: boolean): string {
  return changed ? "border-amber bg-amber-soft hover:border-amber" : "";
}

export const editInputClass = cn(inputClass, "h-9 text-dense");
export const editTextareaClass = cn(inputClass, "h-auto min-h-14 resize-y py-2 text-dense");

/** Forma maydoni: katta harfli yorliq, xato matni `aria-describedby` bilan. */
export function EditField({
  id,
  label,
  error,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  error?: string;
  /** Xato yo'q paytda ko'rinadigan izoh (masalan, "tumanni qayta tanlang"). */
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-ink-faint text-micro uppercase">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-danger text-meta font-medium">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-ink-faint text-meta">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Bo'lim sarlavhasi (`.h`). */
export function EditHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-ink-muted text-micro mt-1.5 font-bold tracking-widest uppercase">{children}</p>
  );
}
