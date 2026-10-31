import { cn } from "@/lib/utils";

/**
 * Forma maydoni — yorliq, boshqaruv va xatolik matni.
 *
 * Barcha oynalarda (lead, operator, buyurtma) bir xil ritm bo'lishi uchun
 * yorliq va xatolik matni shu yerda bir marta ta'riflangan.
 */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  /** Boshqaruv `id` si — yorliq bosilganda maydon fokuslanadi, ekran o'quvchi bog'laydi. */
  htmlFor?: string;
  error?: string;
  /** Xatolik yo'q paytda ko'rinadigan izoh. */
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="text-ink text-dense block font-medium">
        {label}
      </label>
      {/* `relative` — ba'zi maydonlarda ichkarida ikonka yoki tugma bo'ladi. */}
      <div className="relative mt-1.5">{children}</div>
      {error ? (
        <p role="alert" className="text-danger text-meta mt-1.5 font-medium">
          {error}
        </p>
      ) : hint ? (
        <p className="text-ink-faint text-meta mt-1.5">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Matn maydoni ko'rinishi — `<input>` va `<textarea>` uchun.
 *
 * Ilgari bu klass ikki joyda, ikki xil ta'riflangan edi (kirish sahifasida
 * h-12/rounded-xl/ring-4, qolgan hamma joyda h-10/rounded-lg/ringsiz), ya'ni
 * fokus halqasi va xatolik holati faqat login ekranida bor edi. Endi bitta
 * ta'rif — 21 ta `<input>` ham shundan oziqlanadi.
 *
 * Chegara `--border-control` dan: u sirtga nisbatan 3:1 kontrast beradi,
 * ya'ni maydonning chegarasi qayerda tugashi ko'rinib turadi.
 */
export const inputClass = cn(
  "bg-surface border-border-control/60 text-ink placeholder:text-ink-faint",
  "h-(--control-h) w-full rounded-lg border px-3 text-body",
  "transition-[border-color,box-shadow,background-color] duration-(--dur-micro) ease-out",
  "hover:border-border-control",
  "focus:border-brand focus:ring-brand/20 focus:ring-[3px] focus:outline-none",
  "disabled:bg-subtle disabled:text-ink-faint disabled:cursor-not-allowed",
  "aria-invalid:border-danger aria-invalid:ring-danger/20 aria-invalid:ring-[3px]",
);
