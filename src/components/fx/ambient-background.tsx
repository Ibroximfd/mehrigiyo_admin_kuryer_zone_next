import { cn } from "@/lib/utils";

/**
 * Orqa fondagi "aurora" qatlami: sokin suzuvchi nur dog'lari va yuqoridan
 * so'nib boruvchi chizma to'ri. Sof CSS — JavaScript ham, kutubxona ham yo'q,
 * animatsiya faqat `transform` ustida (kompozitor, 60fps).
 *
 * Ranglar mavzu tokenlaridan olinadi, shuning uchun yorug'/qorong'i rejimda
 * o'zi moslashadi.
 *
 * Ota element `relative` bo'lishi shart; qatlam bosishga sezgir emas va
 * skrinriderlar uchun ko'rinmaydi.
 */

type Blob = {
  /** Diametr, px. */
  size: number;
  /** Joylashuv — foizda, konteynerga nisbatan. */
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  /** Mavzu tokeni, masalan `var(--brand)`. */
  color: string;
  /** Rang kuchi, % — qolgani shaffof. */
  strength: number;
  /** Aylanish davri, s. Har xil qiymat qatlamlarni "jonli" qiladi. */
  duration: number;
  /** Boshlanish siljishi, s — dog'lar bir xilda tebranmasligi uchun. */
  delay?: number;
};

const VARIANTS: Record<"panel" | "rail", { blobs: Blob[]; gridLine: string }> = {
  /* Kontent orqasi — deyarli sezilmas, diqqatni tortmaydi. */
  panel: {
    blobs: [
      { size: 460, top: "-14%", left: "-6%", color: "var(--brand)", strength: 11, duration: 34 },
      { size: 380, top: "-8%", right: "-8%", color: "var(--gold)", strength: 8, duration: 44, delay: -16 },
    ],
    gridLine: "var(--line)",
  },
  /* To'q brend paneli (login) — boyroq, sahnaviy. */
  rail: {
    blobs: [
      { size: 520, top: "-12%", left: "8%", color: "var(--brand)", strength: 34, duration: 30 },
      { size: 420, bottom: "-16%", right: "-4%", color: "var(--gold)", strength: 20, duration: 40, delay: -12 },
      { size: 300, top: "36%", left: "-10%", color: "var(--info)", strength: 16, duration: 48, delay: -24 },
    ],
    gridLine: "var(--rail-line)",
  },
};

export function AmbientBackground({
  variant = "panel",
  className,
}: {
  variant?: keyof typeof VARIANTS;
  className?: string;
}) {
  const { blobs, gridLine } = VARIANTS[variant];

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      <div
        className="fx-grid opacity-40"
        style={{ "--fx-grid-line": gridLine } as React.CSSProperties}
      />

      {blobs.map((blob, index) => (
        <span
          key={index}
          className="fx-blob"
          style={{
            width: blob.size,
            height: blob.size,
            top: blob.top,
            left: blob.left,
            right: blob.right,
            bottom: blob.bottom,
            background: `color-mix(in oklab, ${blob.color} ${blob.strength}%, transparent)`,
            animationDuration: `${blob.duration}s`,
            animationDelay: blob.delay ? `${blob.delay}s` : undefined,
          }}
        />
      ))}
    </div>
  );
}
