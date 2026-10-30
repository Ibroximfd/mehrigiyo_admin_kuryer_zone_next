import { format, formatDistanceToNowStrict, isToday, isYesterday } from "date-fns";
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

/** Katta summalarni qisqartiradi: `2 340 000` → `2.3 mln` */
export function formatCompactMoney(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} mln`;
  if (Math.abs(amount) >= 1_000) return `${Math.round(amount / 1_000)} ming`;
  return groupThousands(Math.round(amount));
}

/** Foiz: `12.345` → `12.3%` */
export function formatPercent(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sana / vaqt
// ─────────────────────────────────────────────────────────────────────────────

export function formatDate(date: Date): string {
  return format(date, "dd.MM.yyyy");
}

/** Kartochka sarlavhasi uchun qisqa sana: "27.09". */
export function formatDayMonth(date: Date): string {
  return format(date, "dd.MM");
}

/** "27.09 16:40" — yil ko'rinmaydi (joriy mavsum). */
export function formatShortDateTime(date: Date): string {
  return format(date, "dd.MM HH:mm");
}

/** "Muhammadjon Xaydarov" → "M. Xaydarov" — tor chiplarda to'liq ism sig'maydi. */
export function abbreviateName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] ?? "";
  const [first, ...rest] = parts;
  return `${first.charAt(0)}. ${rest.join(" ")}`;
}

export function formatTime(date: Date): string {
  return format(date, "HH:mm");
}

export function formatDateTime(date: Date): string {
  return format(date, "dd.MM.yyyy HH:mm");
}

/**
 * Chat va ro'yxatlar uchun "aqlli" vaqt:
 * bugun → `14:32`, kecha → `Kecha`, aks holda → `12.08.2026`.
 */
export function formatSmartTime(date: Date): string {
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Kecha";
  return format(date, "dd.MM.yyyy");
}

/** `3 daqiqa oldin` */
export function formatRelative(date: Date): string {
  return `${formatDistanceToNowStrict(date, { locale: uz })} oldin`;
}

/** Chat xabarlarini kunlar bo'yicha guruhlash sarlavhasi. */
export function formatDayHeader(date: Date): string {
  if (isToday(date)) return "Bugun";
  if (isYesterday(date)) return "Kecha";
  return format(date, "d MMMM yyyy", { locale: uz });
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

/** To'liq sana — chop etiladigan hujjatlar uchun: `24-avgust 2026`. */
export function formatUzFullDate(date: Date): string {
  return format(date, "d-MMMM yyyy", { locale: uz }).toLowerCase();
}

/** Faqat hafta kuni: `dushanba`. */
export function formatUzWeekday(date: Date): string {
  return format(date, "EEEE", { locale: uz }).toLowerCase();
}

/** Qisqa ko'rinishi: `24-avgust`. */
export function formatUzDay(date: Date): string {
  return format(date, "d-MMMM", { locale: uz }).toLowerCase();
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

/** Sana majburiy bo'lgan joylar uchun — buzuq qiymatda joriy vaqt. */
export function parseDateOrNow(value: unknown): Date {
  return parseDate(value) ?? new Date();
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

/** Fayl hajmi: `1536` → `1.5 KB` */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Daqiqani odam o'qiydigan davomiylikka aylantiradi: `96` → `1 soat 36 daq`.
 *
 * Yetkazish vaqti uchun: `96 daq` texnik ko'rinadi va o'qish uchun ichda
 * bo'lish amali talab qiladi. Bir soatdan kam bo'lsa soat qismi yozilmaydi.
 */
export function formatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "—";
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest} daq`;
  if (rest === 0) return `${hours} soat`;
  return `${hours} soat ${rest} daq`;
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

/** Audio davomiyligi: `95` → `1:35` */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}
