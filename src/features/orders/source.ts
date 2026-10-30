/**
 * Buyurtma qaysi kanaldan kelgani — nomlar bir joyda.
 *
 * Faqat matn: nishonchalarning o'zi `components/order-source.tsx` da.
 * Bu qiymatlar backend bilan kelishilgan kalitlar va ular komponentdan
 * mustaqil tekshiriladi.
 */

const APP_SOURCES = new Set(["mehrigiyo", "doctor_ali", "sino_ai"]);

/** Mijoz ilova orqali o'zi berganmi (S5 savoli: uchala ilova ham). */
export function isAppOrder(source: string | null | undefined): boolean {
  return APP_SOURCES.has((source ?? "").trim().toLowerCase());
}

/** Ikkiga bo'ladi: mijoz o'zi berdimi yoki operator rasmiylashtirdimi. */
export function orderSourceLabel(source: string | null | undefined): string {
  return isAppOrder(source)
    ? "Mijoz ilovadan bergan"
    : "Operator rasmiylashtirgan";
}

/**
 * Kanalning **o'z** nomi. Noma'lum qiymat yashirilmaydi: backend yangi kanal
 * qo'shsa, u xom holida ko'rinib tursin — jimgina yo'qolgandan ko'ra yaxshi.
 */
const CHANNEL_LABELS: Record<string, string> = {
  mehrigiyo: "Ilova",
  doctor_ali: "Doctor Ali",
  sino_ai: "Sino AI",
  reception: "Shovrum",
  doctor: "Shifokor",
  operator: "Operator",
};

export function orderChannelLabel(source: string | null | undefined): string {
  const key = (source ?? "").trim().toLowerCase();
  if (!key) return "—";
  return CHANNEL_LABELS[key] ?? key;
}

/** Filtr chiplari uchun kanallar ro'yxati. */
export const ORDER_SOURCES: Array<{ value: string; label: string }> = [
  { value: "mehrigiyo", label: "Ilova" },
  { value: "doctor_ali", label: "Doctor Ali" },
  { value: "sino_ai", label: "Sino AI" },
  { value: "operator", label: "Operator" },
];
