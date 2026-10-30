/**
 * Ommaviy amallar — ketma-ket bajarish va qisman xatolarni yig'ish.
 *
 * Backendda "bulk ship" yo'q (`bulk/` faqat `assign_courier`/`set_status`
 * biladi, kuryer + cheklist esa buyurtma bo'yicha tekshiriladi), shuning
 * uchun `Yo'lga chiqarish` har buyurtmaga alohida `PATCH` bilan ketadi —
 * **ketma-ket**: parallel 30 ta PATCH bitta kuryerni bir vaqtda qulflab,
 * backendni bekorga qiynaydi, progress ham sakrab ko'rinadi.
 *
 * Model hammasi-yoki-hech-narsa EMAS: muvaffaqiyatlilari qoladi, xatolar
 * sabab bo'yicha guruhlanib bitta xulosada aytiladi.
 */

export type BulkStepResult<T> =
  | { id: string; ok: true; value: T }
  | { id: string; ok: false; code: string };

export type BulkProgress = { done: number; total: number };

export async function runSequential<T>(
  ids: string[],
  task: (id: string) => Promise<T>,
  {
    toCode,
    onProgress,
    signal,
  }: {
    /** Xatodan barqaror kod (`errorCode`) — guruhlash shu bo'yicha. */
    toCode: (error: unknown) => string;
    onProgress?: (progress: BulkProgress) => void;
    /** Bekor qilinsa qolganlari yuborilmaydi. */
    signal?: AbortSignal;
  },
): Promise<BulkStepResult<T>[]> {
  const results: BulkStepResult<T>[] = [];
  onProgress?.({ done: 0, total: ids.length });

  for (const id of ids) {
    if (signal?.aborted) break;
    try {
      const value = await task(id);
      results.push({ id, ok: true, value });
    } catch (error) {
      results.push({ id, ok: false, code: toCode(error) || "unknown" });
    }
    onProgress?.({ done: results.length, total: ids.length });
  }

  return results;
}

export type BulkFailureGroup = { code: string; count: number; ids: string[] };

export type BulkSummary = {
  succeeded: string[];
  failed: BulkFailureGroup[];
  /** Bekor qilingani sababli yuborilmay qolganlar. */
  skipped: number;
};

/** Natijalarni xulosaga: bir xil sabab bitta qatorda, ko'pi birinchi. */
export function summarizeBulk<T>(
  results: BulkStepResult<T>[],
  requested: number = results.length,
): BulkSummary {
  const succeeded: string[] = [];
  const groups = new Map<string, string[]>();

  for (const result of results) {
    if (result.ok) {
      succeeded.push(result.id);
      continue;
    }
    const ids = groups.get(result.code) ?? [];
    ids.push(result.id);
    groups.set(result.code, ids);
  }

  const failed = [...groups.entries()]
    .map(([code, ids]) => ({ code, count: ids.length, ids }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));

  return {
    succeeded,
    failed,
    skipped: Math.max(0, requested - results.length),
  };
}
