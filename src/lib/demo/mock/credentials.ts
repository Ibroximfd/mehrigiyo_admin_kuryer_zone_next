/**
 * Demo kirish — faqat namuna bazani ochadi, haqiqiy backend akkauntiga
 * aloqasi yo'q. Login sahifasi telefon kutadi: `90 000 00 00` yoki
 * `998900000000` — ikkalasi ham qabul qilinadi.
 */
export const DEMO_CREDENTIALS = {
  phone: "998900000000",
  phoneDisplay: "90 000 00 00",
  password: "Chief-2026",
} as const;

/** Formadan kelgan raqam demo raqammi (`+998`, probel va qavslarsiz). */
export function isDemoPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits === DEMO_CREDENTIALS.phone || digits === DEMO_CREDENTIALS.phone.slice(3);
}
