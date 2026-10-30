import { cn } from "@/lib/utils";

/**
 * Oqim bloklari ostidagi "puls": nuqtali yo'l va u bo'ylab chapdan o'ngga
 * yuguradigan amber chiziqcha — buyurtma tasdiqdan yetkazishgacha harakatda
 * ekanini eslatadi. SVG kenglik bo'yicha cho'ziladi (`preserveAspectRatio`
 * yo'q), shuning uchun nuqta emas, yotiq to'rtburchak chiziladi.
 *
 * Nuqta SMIL bilan yuradi; `data-perf="low"` va reduced-motion'da `.route-dot`
 * yashirinadi (globals.css).
 */
export function FlowPulse({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 8"
      preserveAspectRatio="none"
      aria-hidden
      className={cn("block h-2 w-full", className)}
    >
      <line
        x1="1"
        y1="4"
        x2="99"
        y2="4"
        vectorEffect="non-scaling-stroke"
        className="stroke-line-strong"
        strokeWidth="2"
        strokeDasharray="3 7"
      />
      <rect width="1.4" height="4" x="-0.7" y="-2" rx="1" className="route-dot fill-gold-mark">
        <animateMotion dur="5.5s" repeatCount="indefinite" path="M 1 4 L 99 4" />
      </rect>
    </svg>
  );
}
