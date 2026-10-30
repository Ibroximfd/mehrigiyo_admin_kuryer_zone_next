import { cn } from "@/lib/utils";

/**
 * Imzo harakat — marshrut chizig'i: Filial → Kuryer → Mijoz.
 *
 * Chiziq bo'ylab amber nuqta yuguradi, bekatlarda halqa tarqaladi. Hammasi
 * SVG ichida: nuqta SMIL `animateMotion` bilan yuradi (JS yo'q, o'ram
 * kengligi bilan birga masshtablanadi), chiziq va halqalar CSS keyframe.
 *
 * Zaif mashinada (`data-perf="low"`) va `prefers-reduced-motion` da nuqta
 * va halqalar yashirinadi, chiziq statik qoladi — ma'no yo'qolmaydi.
 */

const PATH = "M 12 86 C 110 20, 190 118, 290 62 S 460 18, 548 70";

const STOPS = [
  { x: 12, y: 86, label: "Filial", anchor: "start", labelY: 116, delay: "0s" },
  { x: 290, y: 62, label: "Kuryer", anchor: "middle", labelY: 92, delay: "-2.9s" },
  { x: 548, y: 70, label: "Mijoz", anchor: "end", labelY: 100, delay: "-5.9s" },
] as const;

export function RouteLine({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 560 130"
      aria-hidden
      className={cn("block h-auto w-full overflow-visible", className)}
    >
      <path
        d={PATH}
        className="route-path stroke-brand/60 fill-none"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {STOPS.map((stop) => (
        <g key={stop.label}>
          <circle
            cx={stop.x}
            cy={stop.y}
            r="7"
            className="route-ring stroke-gold-mark fill-none"
            strokeWidth="1.5"
            style={{ animationDelay: stop.delay }}
          />
          <circle cx={stop.x} cy={stop.y} r="5" className="fill-gold-mark" />
          <text
            x={stop.x}
            y={stop.labelY}
            textAnchor={stop.anchor}
            className="fill-ink-faint text-micro"
          >
            {stop.label}
          </text>
        </g>
      ))}

      <circle r="6" className="route-dot fill-gold-mark">
        <animateMotion dur="6.4s" repeatCount="indefinite" path={PATH} />
      </circle>
    </svg>
  );
}
