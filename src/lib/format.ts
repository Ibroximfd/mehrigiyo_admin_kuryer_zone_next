import { format } from "date-fns";
import { uz } from "date-fns/locale";

/**
 * Formatlash yordamchilari — `core/utils/money_format.dart` va `intl` ning
 * o'rni.
 */

/**
 * Butun qismni minglab guruhlaydi, yaxlitlamaydi: `16900` → `16 900`.
 *
 * Ajratgichni qo'lda qo'yamiz: `Intl.NumberFormat` brauzer va Node'da
 * turlicha natija beradi (birida probel, birida vergul), bu esa jadval
 * bilan oyna orasida farq chiqarardi.
 */
export function groupThousands(value: number): string {
  if (!Number.isFinite(value)) return "0";

  const isWhole = Number.isInteger(value);
  const raw = isWhole ? String(value) : String(value);
  const negative = raw.startsWith("-");
  const body = negative ? raw.slice(1) : raw;
  const [intPart, fracPart] = body.split(".");

  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const suffix = fracPart ? `.${fracPart}` : "";

  return `${negative ? "-" : ""}${grouped}${suffix}`;
}

/** `16900` → `16 900 so'm` */
export function formatSom(amount: number): string {
  return `${groupThousands(amount)} so'm`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sana / vaqt
// ─────────────────────────────────────────────────────────────────────────────

export function formatDateTime(date: Date): string {
  return format(date, "dd.MM.yyyy HH:mm");
}

/**
 * O'zbekcha to'liq sana: `24-avgust, dushanba`.
 *
 * Ataylab `Intl`/`toLocaleDateString("uz-UZ")` ishlatilmaydi: `uz` locale
 * ma'lumoti hamma brauzer qurilmasida bo'lavermaydi va bo'lmaganda Chrome
 * `M08 24, Mon` kabi xom ICU qiymatini chiqaradi — ya'ni ekranda ingliz
 * qisqartmasi paydo bo'ladi. `date-fns` locale'i esa bundlega kiradi,
 * shuning uchun natija hamma joyda bir xil.
 *
 * Oy va hafta kuni kichik harfda — o'zbek imlosida shunday.
 */
export function formatUzDate(date: Date): string {
  return format(date, "d-MMMM, EEEE", { locale: uz }).toLowerCase();
}

/**
 * Soatni ikki xonali qilib beradi: `09:05`.
 *
 * `toLocaleTimeString("uz-UZ")` ham yuqoridagi sababdan chetlab o'tiladi.
 */
export function formatClock(date: Date): string {
  return format(date, "HH:mm");
}

/**
 * Backend kutadigan kun ko'rinishi: `2026-08-24`.
 *
 * `toISOString()` ATAYLAB ishlatilmaydi — u UTCga o'giradi va Toshkentda
 * (UTC+5) tunning birinchi besh soatida **kechagi** kunni qaytaradi. Kunlik
 * COD hisobi uchun bu to'g'ridan-to'g'ri noto'g'ri hisob degani.
 */
export function toIsoDay(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Bugungi kun — mahalliy vaqt bo'yicha. */
export function todayIso(): string {
  return toIsoDay(new Date());
}

/**
 * Sanani xavfsiz o'qish: backend `null` yoki buzuq qiymat qaytarsa `null`.
 */
export function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// ─────────────────────────────────────────────────────────────────────────────
// Telefon
// ─────────────────────────────────────────────────────────────────────────────

/** `998901234567` → `+998 90 123 45 67` */
export function formatPhone(phone: string): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("998")) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
  }
  const trimmed = (phone ?? "").trim();
  if (!trimmed) return "";
  return trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
}

/** Serverga yuborish uchun — faqat raqamlar. */
export function normalizePhone(phone: string): string {
  return (phone ?? "").replace(/\D/g, "");
}

/** Ism bosh harflari — avatar uchun. */
export function initials(name: string): string {
  return (name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Masofa metrda: `350` → `350 m`, `3 240` → `3,2 km`, `12 480` → `12 km`.
 * Marshrut rejasi uchun — logist "qancha yuradi" ni ko'z bilan o'qiydi,
 * o'nlab metr aniqlik kerak emas.
 */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  const text =
    km < 10 ? km.toFixed(1).replace(".", ",").replace(/,0$/, "") : String(Math.round(km));
  return `${text} km`;
}

/** Summa maydoni: faqat raqamlar, mingliklar bo'sh joy bilan (`1 250 000`). */
export function formatMoneyInput(value: string | number): string {
  const digits = (typeof value === "number" ? String(Math.max(0, Math.round(value))) : value).replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Summa maydonidagi matn → son; bo'sh — `NaN`. */
export function parseMoneyInput(value: string): number {
  const digits = value.replace(/\D/g, "");
  return digits ? Number.parseInt(digits, 10) : Number.NaN;
}
