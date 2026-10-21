import { z } from "zod";

import { isCompleteLocalPhone, toApiPhone, toLocalDigits } from "@/shared/lib/phone";

import type { Courier } from "./courier";

/** Parol qoidasi (backend #24): berilsa kamida 6 belgi. */
export const MIN_PASSWORD_LENGTH = 6;

/**
 * Parol qanday beriladi (backend #24):
 *  - `auto`   — parol yuborilmaydi, server 8+ belgili parol yasaydi va BIR MARTA qaytaradi;
 *  - `manual` — admin o'zi kiritadi (≥ 6 belgi).
 */
export const PASSWORD_MODES = ["auto", "manual"] as const;
export type PasswordMode = (typeof PASSWORD_MODES)[number];

/** `manual` rejimda parol tekshiruvi; `auto` da maydon e'tiborga olinmaydi. */
function checkManualPassword(mode: PasswordMode, password: string, ctx: z.RefinementCtx): void {
  if (mode !== "manual") return;
  if (password.length < MIN_PASSWORD_LENGTH) {
    ctx.addIssue({ code: "custom", path: ["password"], message: password ? "passwordShort" : "required" });
  }
}

/** Xato matnlari — i18n kalitlari (`validation.*`). */
export const courierFormSchema = z
  .object({
    fullName: z.string().trim().min(2, "nameShort").max(150, "tooLong"),
    phone: z.string().refine(isCompleteLocalPhone, { message: "phoneIncomplete" }),
    zoneIds: z.array(z.number().int()).min(1, "zonesRequired"),
    createAccount: z.boolean(),
    passwordMode: z.enum(PASSWORD_MODES),
    password: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.createAccount) checkManualPassword(values.passwordMode, values.password, ctx);
  });

export type CourierFormValues = z.infer<typeof courierFormSchema>;

export const COURIER_FORM_FIELDS = [
  "fullName",
  "phone",
  "zoneIds",
  "createAccount",
  "password",
] as const satisfies ReadonlyArray<keyof CourierFormValues>;

export const COURIER_FIELD_ALIASES = {
  full_name: "fullName",
  phone: "phone",
  zone_ids: "zoneIds",
  password: "password",
  create_account: "createAccount",
} as const satisfies Record<string, (typeof COURIER_FORM_FIELDS)[number]>;

export function emptyCourierForm(zoneIds: readonly number[] = []): CourierFormValues {
  return { fullName: "", phone: "", zoneIds: [...zoneIds], createAccount: true, passwordMode: "auto", password: "" };
}

export function courierToForm(courier: Courier): CourierFormValues {
  return {
    fullName: courier.fullName,
    phone: toLocalDigits(courier.phone),
    zoneIds: [...courier.zoneIds],
    createAccount: courier.hasAccount,
    passwordMode: "auto",
    password: "",
  };
}

export type CourierCreatePayload = {
  full_name: string;
  phone: string;
  zone_ids: number[];
  create_account: boolean;
  password?: string;
};

export function toCourierCreatePayload(values: CourierFormValues): CourierCreatePayload {
  const payload: CourierCreatePayload = {
    full_name: values.fullName.trim(),
    phone: toApiPhone(values.phone),
    zone_ids: values.zoneIds,
    create_account: values.createAccount,
  };
  // `auto` — parol yuborilmaydi: server o'zi yasaydi va javobda bir marta qaytaradi.
  if (values.createAccount && values.passwordMode === "manual") payload.password = values.password;
  return payload;
}

export type CourierPatchPayload = Partial<{
  full_name: string;
  phone: string;
  zone_ids: number[];
}>;

function sameOrder(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/** Tahrirda faqat o'zgargan maydonlar; zona TARTIBI ham o'zgarish (asosiy zona). */
export function diffCourierPatch(courier: Courier, values: CourierFormValues): CourierPatchPayload {
  const patch: CourierPatchPayload = {};
  const fullName = values.fullName.trim();
  if (fullName !== courier.fullName) patch.full_name = fullName;
  const phone = toApiPhone(values.phone);
  if (phone !== courier.phone.replace(/\D/g, "")) patch.phone = phone;
  if (!sameOrder(courier.zoneIds, values.zoneIds)) patch.zone_ids = values.zoneIds;
  return patch;
}

/** "Parol berish" oynasi. */
export const setPasswordFormSchema = z
  .object({ mode: z.enum(PASSWORD_MODES), password: z.string() })
  .superRefine((values, ctx) => checkManualPassword(values.mode, values.password, ctx));

export type SetPasswordFormValues = z.infer<typeof setPasswordFormSchema>;

export type SetPasswordPayload = { password?: string };

export function toSetPasswordPayload(values: SetPasswordFormValues): SetPasswordPayload {
  return values.mode === "manual" ? { password: values.password } : {};
}

/**
 * Ko'rsatiladigan bir martalik parol: server qaytargani; `manual` da server
 * qaytarmasa — admin kiritgani. `auto` da server qaytarmasa `null` (UI ogohlantiradi).
 */
export function resolveOneTimePassword(mode: PasswordMode, entered: string, returned: string | null): string | null {
  if (returned) return returned;
  return mode === "manual" && entered ? entered : null;
}
