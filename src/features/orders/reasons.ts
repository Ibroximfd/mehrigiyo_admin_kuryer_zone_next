/**
 * Status o'zgarishi sabablari lug'ati — `02_DOMAIN_MODEL` §2.5.
 *
 * Bekor qilish (`cancel_reason`, xodimlar to'plami) va orqaga qaytarish
 * (`revert_reason`) kalitlari backend bilan kelishilgan; matnlar faqat
 * shu yerda. Noma'lum kalit yashirilmaydi — xom holida ko'rinadi.
 */

export const CANCEL_REASONS = [
  { value: "client_refused", label: "Mijoz rad etdi" },
  { value: "no_answer", label: "Javob bermadi" },
  { value: "wrong_address", label: "Manzil xato" },
  { value: "duplicate", label: "Dublikat" },
  { value: "out_of_stock", label: "Mahsulot yo'q" },
  { value: "payment_failed", label: "To'lov o'tmadi" },
  { value: "client_request", label: "Mijoz so'radi" },
  { value: "other", label: "Boshqa sabab" },
] as const;

export type CancelReason = (typeof CANCEL_REASONS)[number]["value"];

/** Mijoz ilovadan bekor qilganda keladigan kalitlar — faqat ko'rsatish uchun. */
const CLIENT_CANCEL_LABELS: Record<string, string> = {
  staff_issue: "Xodimlar bilan muammo",
  product_issue: "Mahsulot bilan muammo",
};

export const REVERT_REASONS = [
  { value: "mistake", label: "Xato bosildi" },
  { value: "courier_unassigned", label: "Kuryer bekor qildi" },
  { value: "client_rescheduled", label: "Mijoz sanani ko'chirdi" },
  { value: "other", label: "Boshqa sabab" },
] as const;

export type RevertReason = (typeof REVERT_REASONS)[number]["value"];

/**
 * Logist mijoz tasdig'ini chetlab `pending → confirmed` qilganda (`02` §2.3,
 * "✅ (sabab)"). Backend `confirmation.confirmed_by = logist` yozadi.
 */
export const CONFIRM_REASONS = [
  { value: "client_confirmed_by_phone", label: "Mijoz telefonda tasdiqladi" },
  { value: "client_no_app", label: "Ilova yo'q yoki ishlamayapti" },
  { value: "urgent_delivery", label: "Shoshilinch yetkazish kerak" },
  { value: "other", label: "Boshqa sabab" },
] as const;

export type ConfirmReason = (typeof CONFIRM_REASONS)[number]["value"];

/** `other` — izoh majburiy, aks holda sabab "hech narsa" bo'lib qoladi. */
export const REASON_REQUIRING_NOTE = "other";

export function cancelReasonLabel(reason: string | null | undefined): string {
  const key = (reason ?? "").trim();
  if (!key) return "";
  return (
    CANCEL_REASONS.find((item) => item.value === key)?.label ??
    CLIENT_CANCEL_LABELS[key] ??
    key
  );
}

export function revertReasonLabel(reason: string | null | undefined): string {
  const key = (reason ?? "").trim();
  if (!key) return "";
  return REVERT_REASONS.find((item) => item.value === key)?.label ?? key;
}

/**
 * Xodim tasdig'i sabablari — logistning `CONFIRM_REASONS` i va operator/admin
 * kalitlari (shartnoma 2026-10-01 §3) bitta lug'atda: kim tasdiqlaganidan
 * qat'i nazar bir xil kalit bir xil o'qiladi.
 */
const STAFF_CONFIRM_REASON_LABELS: Record<string, string> = {
  app_unavailable: "Ilovani o'rnatish imkoni bo'lmadi",
  app_not_working: "Ilova ishlamayapti",
};

export function confirmReasonLabel(reason: string | null | undefined): string {
  const key = (reason ?? "").trim();
  if (!key) return "";
  return (
    CONFIRM_REASONS.find((item) => item.value === key)?.label ??
    STAFF_CONFIRM_REASON_LABELS[key] ??
    key
  );
}

/** `client.app_unavailable.reason` (shartnoma §2). */
const APP_UNAVAILABLE_REASON_LABELS: Record<string, string> = {
  push_button_phone: "Knopkali telefon",
  phone_unsupported: "Telefon ilovani ko'tarmaydi",
  no_smartphone_access: "Smartfon yo'q",
  other: "Boshqa",
};

export function appUnavailableReasonLabel(reason: string | null | undefined): string {
  const key = (reason ?? "").trim();
  if (!key) return "";
  return APP_UNAVAILABLE_REASON_LABELS[key] ?? key;
}
