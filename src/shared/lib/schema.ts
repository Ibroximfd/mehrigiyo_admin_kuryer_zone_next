import { z } from "zod";

/**
 * Javob chegarasidagi umumiy sxema bo'laklari. Shartnomadagi majburiy
 * maydonlar qat'iy, ixtiyoriylari esa `null`/yo'q bo'lsa ham yiqilmaydi.
 */

/** Ro'yxat: toza massiv yoki sahifalangan `{results: []}` (kelajak uchun). */
export function listOf<T extends z.ZodType>(item: T) {
  return z.union([
    z.array(item),
    z.object({ results: z.array(item) }).transform((page) => page.results),
  ]);
}

/** Pul: server `"310000"` (satr) yoki son beradi — har doim son qaytadi. */
export const amountSchema = z
  .union([z.number(), z.string().trim().min(1)])
  .transform((value) => Number(value))
  .pipe(z.number());

/** Yo'q/`null` bo'lsa 0. */
export const optionalAmountSchema = amountSchema.nullish().transform((value) => value ?? 0);

export const optionalCountSchema = z
  .number()
  .int()
  .nullish()
  .transform((value) => value ?? 0);

export const optionalTextSchema = z
  .string()
  .nullish()
  .transform((value) => {
    const text = value?.trim();
    return text ? text : null;
  });

export const idListSchema = z
  .array(z.number().int())
  .nullish()
  .transform((value) => value ?? []);

/** `{id, name}` havola (filial, zona). */
export const refSchema = z
  .object({ id: z.number().int(), name: z.string().nullish() })
  .transform(({ id, name }) => ({ id, name: name?.trim() || `#${id}` }));

export type Ref = z.output<typeof refSchema>;

/**
 * Tuman turi — `meta` va `admin` javoblarida bir xil. Noma'lum qiymat
 * oddiy tuman deb olinadi (shahar belgisi faqat aniq `city` da).
 */
export type DistrictKind = "city" | "district";

export const districtKindSchema = z
  .string()
  .nullish()
  .transform((kind): DistrictKind => (kind === "city" ? "city" : "district"));
