/**
 * O'zbekiston raqamlari: server `998XXXXXXXXX` (12 raqam) kutadi, foydalanuvchi
 * esa `+998 90 123 45 67` ko'radi. Formada faqat mahalliy 9 raqam yoziladi,
 * `+998` prefiksi alohida ko'rsatiladi.
 */

export const COUNTRY_CODE = "998";
export const LOCAL_DIGITS = 9;

/** Kiritilgan matndan mahalliy 9 raqamni ajratadi (to'liq raqam yopishtirilsa ham). */
export function toLocalDigits(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.length > LOCAL_DIGITS && digits.startsWith(COUNTRY_CODE)) {
    digits = digits.slice(COUNTRY_CODE.length);
  }
  return digits.slice(0, LOCAL_DIGITS);
}

/** `901234567` → `90 123 45 67` (yozish davomida qisman ham). */
export function formatLocalPhone(local: string): string {
  const digits = toLocalDigits(local);
  const parts = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)];
  return parts.filter(Boolean).join(" ");
}

export function isCompleteLocalPhone(local: string): boolean {
  return toLocalDigits(local).length === LOCAL_DIGITS;
}

/** Mahalliy qism → server formati `998901234567`. */
export function toApiPhone(local: string): string {
  return `${COUNTRY_CODE}${toLocalDigits(local)}`;
}

/** Server raqami → `+998 90 123 45 67`. Kutilmagan shakl o'z holicha qaytadi. */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== COUNTRY_CODE.length + LOCAL_DIGITS || !digits.startsWith(COUNTRY_CODE)) {
    return phone;
  }
  return `+${COUNTRY_CODE} ${formatLocalPhone(digits.slice(COUNTRY_CODE.length))}`;
}
