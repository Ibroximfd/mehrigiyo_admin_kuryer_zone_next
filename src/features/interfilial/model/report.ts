import { z } from "zod";

import { amountSchema, idListSchema, refSchema } from "@/shared/lib/schema";

/**
 * Filiallararo naqd hisobot (`GET /api/admin/cod/interfilial/`).
 * `from` — pul qabul qilingan kassa, `to` — pul egasi (buyurtma filiali).
 */

const rowSchema = z
  .object({
    from_filial: refSchema,
    to_filial: refSchema,
    amount: amountSchema,
    handover_ids: idListSchema,
  })
  .transform((raw) => ({
    from: raw.from_filial,
    to: raw.to_filial,
    amount: raw.amount,
    handoverCount: raw.handover_ids.length,
  }));

export type InterfilialRow = z.output<typeof rowSchema>;

export const interfilialReportSchema = z
  .object({
    date_from: z.string(),
    date_to: z.string(),
    rows: z
      .array(rowSchema)
      .nullish()
      .transform((rows) => rows ?? []),
    total: amountSchema.nullish(),
  })
  .transform((raw) => ({
    dateFrom: raw.date_from,
    dateTo: raw.date_to,
    rows: raw.rows,
    // `total` kelmasa qatorlardan yig'iladi — jami hech qachon bo'sh qolmaydi.
    total: raw.total ?? raw.rows.reduce((sum, row) => sum + row.amount, 0),
    handoverCount: raw.rows.reduce((sum, row) => sum + row.handoverCount, 0),
  }));

export type InterfilialReport = z.output<typeof interfilialReportSchema>;

/** Katta summalar yuqorida — admin avval eng katta qarzni ko'radi. */
export function sortRowsByAmount(rows: readonly InterfilialRow[]): InterfilialRow[] {
  return [...rows].sort((a, b) => b.amount - a.amount);
}
