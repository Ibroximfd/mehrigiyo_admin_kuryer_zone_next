import { DEMO_MODE } from "@/lib/demo/mode";
import { cn } from "@/lib/utils";

/** Demo rejim belgisi — ekrandagi raqamlar namuna ekanini adashtirmaslik uchun. */
export function DemoBadge({ className }: { className?: string }) {
  if (!DEMO_MODE) return null;
  return (
    <span
      title="Namuna ma'lumot — backendga so'rov ketmaydi"
      className={cn("bg-warn-soft text-warn shrink-0 rounded px-1.5 py-px text-fine font-bold tracking-wide uppercase", className)}
    >
      Demo
    </span>
  );
}
