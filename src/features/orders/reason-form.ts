import { z } from "zod";

import { REASON_REQUIRING_NOTE } from "./reasons";

/**
 * Sabab oynasi formasi (bekor / qaytarish / tiklash) — sof validatsiya,
 * komponentdan alohida: test qilinadi va backend qoidasi bilan bir xil
 * (`02` §2.5: `other` → izoh majburiy).
 */
export const NOTE_MAX = 500;

export const reasonFormSchema = z
  .object({
    reason: z.string().min(1, "Sabab tanlang"),
    note: z.string().trim().max(NOTE_MAX, `Izoh ${NOTE_MAX} belgidan oshmasin`),
  })
  .superRefine((value, ctx) => {
    // «Boshqa sabab» izohsiz — sabab yo'q degani.
    if (value.reason === REASON_REQUIRING_NOTE && value.note.length < 3) {
      ctx.addIssue({
        code: "custom",
        path: ["note"],
        message: "«Boshqa sabab» uchun izoh yozing",
      });
    }
  });

export type ReasonFormInput = z.infer<typeof reasonFormSchema>;
export type ReasonFormErrors = Partial<Record<keyof ReasonFormInput, string>>;

export type ReasonFormResult =
  | { ok: true; value: ReasonFormInput }
  | { ok: false; errors: ReasonFormErrors };

export function validateReasonForm(
  input: ReasonFormInput,
  /** Orqaga qaytarishda izoh har doim majburiy (dizayn: "Izoh (majburiy)"). */
  { requireNote = false }: { requireNote?: boolean } = {},
): ReasonFormResult {
  const result = reasonFormSchema.safeParse(input);
  if (result.success) {
    if (requireNote && result.data.note.length < 3) {
      return { ok: false, errors: { note: "Izoh yozing — tarixda sabab bilan qoladi" } };
    }
    return { ok: true, value: result.data };
  }

  const errors: ReasonFormErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if ((field === "reason" || field === "note") && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return { ok: false, errors };
}
