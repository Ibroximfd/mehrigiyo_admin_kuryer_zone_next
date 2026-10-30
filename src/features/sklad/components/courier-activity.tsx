import { StatusPill } from "@/components/kit/status-pill";

/**
 * Kuryer holati — «faol» (smenada) yoki «nofaol». Mol kuryerda har ikki
 * holatda ham turaveradi; belgi faqat hozir ishlayaptimi-yo'qligini aytadi.
 */
export function CourierActivity({ active, className }: { active: boolean; className?: string }) {
  return <StatusPill label={active ? "faol" : "nofaol"} color={active ? "var(--ok)" : "var(--ink-faint)"} size="sm" className={className} />;
}
