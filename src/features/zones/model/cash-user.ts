import { z } from "zod";

import { optionalTextSchema, refSchema } from "@/shared/lib/schema";

/**
 * Kassa-shaxs nomzodlari — `GET /api/admin/cash-users/?search=` (backend #22):
 * faol xodimlar (operator/logist/admin), 100 tagacha; qidiruv ism/login/telefon.
 * `user_id` → zona `cash_point.user_id`.
 */
const cashUserSchema = z
  .object({
    user_id: z.number().int(),
    full_name: optionalTextSchema,
    username: optionalTextSchema,
    phone: optionalTextSchema,
    filial: refSchema.nullish().transform((filial) => filial ?? null),
    is_logist: z.boolean().nullish(),
    is_admin: z.boolean().nullish(),
  })
  .transform((raw) => ({
    userId: raw.user_id,
    name: raw.full_name ?? raw.username ?? raw.phone ?? `#${raw.user_id}`,
    username: raw.username,
    phone: raw.phone,
    filial: raw.filial,
    isLogist: raw.is_logist ?? false,
    isAdmin: raw.is_admin ?? false,
  }));

export type CashUser = z.output<typeof cashUserSchema>;

export const cashUsersResponseSchema = z.array(cashUserSchema);

/** Server bir so'rovda ko'pi bilan shuncha qaytaradi — ko'p bo'lsa "aniqroq qidiring". */
export const CASH_USERS_LIMIT = 100;

/** Formada saqlanadigan tanlov: ID + ko'rsatish nomi (tahrirda `cash_point.name` dan). */
export type CashPersonValue = { userId: number; name: string };

export function toCashPersonValue(user: CashUser): CashPersonValue {
  return { userId: user.userId, name: user.name };
}
