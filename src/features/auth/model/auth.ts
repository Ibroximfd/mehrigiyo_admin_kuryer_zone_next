import { z } from "zod";

import { isCompleteLocalPhone } from "@/shared/lib/phone";

/** `POST /api/admin/login/` javobi. */
export const loginResponseSchema = z
  .object({
    access: z.string().min(1),
    refresh: z.string().nullish(),
    user: z.object({
      id: z.number().int(),
      phone: z.string().nullish(),
      is_superuser: z.boolean().nullish(),
    }),
    server_time: z.string().nullish(),
  })
  .transform((raw) => ({
    access: raw.access,
    refresh: raw.refresh ?? null,
    user: {
      id: raw.user.id,
      phone: raw.user.phone ?? "",
      isSuperuser: raw.user.is_superuser ?? false,
    },
  }));

export type LoginResult = z.output<typeof loginResponseSchema>;

/** Xato matnlari — i18n kalitlari (`validation.*`). */
export const loginFormSchema = z.object({
  phone: z.string().refine(isCompleteLocalPhone, { message: "phoneIncomplete" }),
  password: z.string().min(1, "required"),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

/** Kontrakt §1: noto'g'ri parol va "staff emas" — bir xil javob. */
export const INVALID_CREDENTIALS = "invalid_credentials";
