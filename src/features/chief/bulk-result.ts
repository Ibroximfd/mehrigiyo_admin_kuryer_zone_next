import type { BulkAssignResult } from "./api";

/** Berilmagan zakaz sababi — odam tilida (hujjat 68 §2.1). */
const REASONS: Record<string, string> = {
  order_not_found: "Zakaz endi kuryersiz emas yoki sizda emas",
  courier_inactive: "Kuryer nofaol",
  courier_not_yours: "Kuryer jamoangizda emas",
};

export type BulkSummary = {
  /** Filtrga mos kelganlar; server bermasa — berilgan + berilmagan. */
  matched: number;
  given: number;
  notGiven: number;
  reasons: Array<{ code: string; label: string; count: number }>;
};

export function summarizeBulk(result: BulkAssignResult): BulkSummary {
  const counts = new Map<string, number>();
  for (const row of result.failed) counts.set(row.code, (counts.get(row.code) ?? 0) + 1);
  return {
    matched: result.matched ?? result.assigned.length + result.failed.length,
    given: result.assigned.length,
    notGiven: result.failed.length,
    reasons: [...counts.entries()]
      .map(([code, count]) => ({ code, label: REASONS[code] ?? "Boshqa sabab", count }))
      .sort((a, b) => b.count - a.count),
  };
}
