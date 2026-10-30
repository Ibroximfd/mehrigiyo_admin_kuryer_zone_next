import { cn } from "@/lib/utils";

/**
 * Kirish animatsiyasi: element pastdan yumshoq ko'tarilib paydo bo'ladi.
 *
 * `index` — ketma-ketlikdagi tartib raqami: har bir keyingisi 60ms kechikadi
 * va ro'yxat "to'lqin" bo'lib ochiladi. Sof CSS (`.fx-rise`), JS ishtirok
 * etmaydi.
 *
 * Yuzlab qatorli jadvallarga QO'YILMASIN — u yerda `content-visibility`
 * ishlaydi, ommaviy animatsiya esa faqat sekinlashtiradi.
 */
export function Reveal({
  index = 0,
  className,
  children,
}: {
  index?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("fx-rise", className)}
      style={{ "--fx-i": index } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
