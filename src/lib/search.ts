import { toCyrillic } from "@/lib/translit";

/**
 * Mahalliy (klient tomonidagi) qidiruv uchun matn indeksi.
 *
 * Uchta muammoni yechadi:
 *  • yozuv — ro'yxatdagi ism DOM'da kirillga o'giriladi (`translit-dom.ts`),
 *    ma'lumot esa lotinchada qoladi. Ekranda "Шоҳруҳ" ko'rgan operator shuni
 *    yozganda ham topilishi kerak, "Shohruh" yozganda ham;
 *  • shakl — `O'ktam` va `Oktam`, `Ўктам` va `Oʻktam` bir xil hisoblanadi;
 *  • telefon — `+998 90 123 45 67`, `998901234567` va `901234567` bir xil.
 *
 * Buning uchun har bir matndan ikkita indeks quriladi: sodda lotin va kirill.
 * Ikkala tomon (matn ham, so'rov ham) bitta quvurdan o'tgani uchun so'rov
 * qaysi yozuvda yozilishidan qat'i nazar mos tushadi.
 *
 * Bu yerda faqat matn tayyorlash va ball berish bor — nimani qidirish har bir
 * bo'limning o'z ishi (masalan `features/chat/search.ts`).
 */

/** Lotin yozuvidagi apostrof variantlari — `translit.ts` dagi bilan bir xil. */
const APOSTROPHES = /['‘’ʻʼ`´]/g;

/**
 * Qo'shimcha (combining) belgilar. NFD dan keyin `ў` → `у`, `й` → `и` bo'ladi:
 * shu tufayli `Oybek` (→ `ойбек`) va kirillcha yozilgan `Ойбек` bitta shaklga
 * tushadi va bir-birini topadi.
 */
const COMBINING = /[\u0300-\u036f\u0483-\u0489]/g;

/**
 * Qidiruvda teng deb qaraladigan kirill harflari.
 *
 * O'zbekchada `h`/`x`, `q`/`k`, `g'`/`g` juftliklari ismlarda izchil
 * yozilmaydi: bitta odam bir joyda "Shohruh", boshqasida "Шохрух" bo'lib
 * qoladi. Har ikkala tomon bitta shaklga keltirilgani uchun operator qaysi
 * variantni yozishidan qat'i nazar topadi. "ъ" va "ь" esa tovush emas:
 * "sa'odat" va "Саодат" ajralib qolmasin.
 */
const EQUIVALENT = /[ҳқғэъь]/g;
const EQUIVALENTS: Record<string, string> = {
  "ҳ": "х",
  "қ": "к",
  "ғ": "г",
  "э": "е",
  "ъ": "",
  "ь": "",
};

const SPACES = /\s+/g;
const NON_DIGIT = /\D+/g;

/** Mamlakat kodisiz raqam shu uzunlikdan boshlab ajratiladi. */
const LOCAL_NUMBER_LENGTH = 9;

export type SearchText = {
  /** Sodda shakl: kichik harf, apostrofsiz, bitta probel bilan. */
  plain: string;
  /** Kirill shakli — yozuvdan qat'i nazar solishtirish uchun. */
  cyrillic: string;
};

export type SearchQuery = SearchText & {
  /** So'rovdagi raqamlar. Bo'sh bo'lsa telefon bo'yicha umuman qidirilmaydi. */
  digits: string;
  /** Mamlakat kodisiz shakl: `998901234567` → `901234567`. */
  localDigits: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Ball darajalari
// ─────────────────────────────────────────────────────────────────────────────

export const MATCH_NONE = 0;
/** So'z o'rtasida uchradi. */
export const MATCH_INSIDE = 1;
/** So'zning boshidan mos keldi. */
export const MATCH_WORD = 2;
/** Butun matnning boshidan mos keldi — eng kuchli moslik. */
export const MATCH_START = 3;

// ─────────────────────────────────────────────────────────────────────────────
// Matn tayyorlash
// ─────────────────────────────────────────────────────────────────────────────

/** Transliteratsiyaga tayyor shakl: apostroflar bir xil, harflar kichik. */
function normalize(text: string): string {
  return (text ?? "").replace(APOSTROPHES, "'").toLowerCase();
}

/** Qo'shimcha belgilarni yechadi va probellarni bittaga keltiradi. */
function tidy(text: string): string {
  return text
    .normalize("NFD")
    .replace(COMBINING, "")
    .replace(EQUIVALENT, (letter) => EQUIVALENTS[letter])
    .replace(SPACES, " ")
    .trim();
}

/**
 * Matndan qidiruv indeksini quradi.
 *
 * `toCyrillic` idempotent — kirill matn qayta berilsa o'zgarmaydi, shuning
 * uchun manba lotinchami yoki kirillchami, `cyrillic` maydoni bitta umumiy
 * fazoga tushadi.
 */
export function makeSearchText(text: string): SearchText {
  const normalized = normalize(text);
  return {
    // Apostrof kirill shakliga kerak (`o'` → `ў`), sodda shaklda esa faqat
    // xalaqit beradi: `Oʻktam` ni `Oktam` deb qidirganlar ko'p.
    plain: tidy(normalized.replace(/'/g, "")),
    cyrillic: tidy(toCyrillic(normalized)),
  };
}

/** Matndagi faqat raqamlar. */
export function digitsOf(text: string): string {
  return (text ?? "").replace(NON_DIGIT, "");
}

/** Mamlakat kodini olib tashlaydi — `998901234567` → `901234567`. */
export function localDigits(digits: string): string {
  return digits.length > LOCAL_NUMBER_LENGTH && digits.startsWith("998")
    ? digits.slice(3)
    : digits;
}

/**
 * So'rovni bir marta tayyorlaydi. Bo'sh (yoki faqat probel) so'rovda `null` —
 * chaqiruvchi shu belgiga qarab ro'yxatni umuman filtrlamaydi.
 */
export function parseSearchQuery(input: string): SearchQuery | null {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return null;

  const text = makeSearchText(trimmed);
  const digits = digitsOf(trimmed);

  // Faqat tinish belgisidan iborat so'rov — qidiruv emas.
  if (!text.plain && !text.cyrillic && !digits) return null;

  return { ...text, digits, localDigits: localDigits(digits) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Ball berish
// ─────────────────────────────────────────────────────────────────────────────

function scoreIn(haystack: string, needle: string): number {
  if (!haystack || !needle) return MATCH_NONE;

  const at = haystack.indexOf(needle);
  if (at < 0) return MATCH_NONE;
  if (at === 0) return MATCH_START;

  // Probellar `tidy` da bittaga keltirilgan — so'z boshi shu bilan aniqlanadi.
  return haystack.charCodeAt(at - 1) === 32 ? MATCH_WORD : MATCH_INSIDE;
}

/**
 * Matn so'rovga qanchalik mos: `MATCH_NONE` dan `MATCH_START` gacha.
 * Ikki yozuvdan kuchlirog'i olinadi.
 */
export function scoreText(text: SearchText, query: SearchQuery): number {
  const plain = scoreIn(text.plain, query.plain);
  if (plain === MATCH_START) return MATCH_START;
  return Math.max(plain, scoreIn(text.cyrillic, query.cyrillic));
}

/**
 * Telefon so'rovga qanchalik mos. `digits` bo'sh bo'lsa (ya'ni so'rovda raqam
 * yo'q) hech qachon mos kelmaydi — aks holda `"".includes("")` tufayli barcha
 * xonalar "topilgan" bo'lib qolardi.
 */
export function scoreDigits(rawPhone: string, query: SearchQuery): number {
  // Backend raqamni `+` siz beradi (§9.1), eski yozuvda `+`/probel bo'lishi
  // mumkin — solishtirish faqat raqamlar bo'yicha.
  const phone = digitsOf(rawPhone ?? "");
  if (!phone || !query.digits) return MATCH_NONE;

  const local = localDigits(phone);

  // Raqamni operator odatda boshidan yoki kodsiz teradi.
  if (
    phone.startsWith(query.digits) ||
    local.startsWith(query.digits) ||
    local.startsWith(query.localDigits)
  ) {
    return MATCH_START;
  }

  if (
    phone.includes(query.digits) ||
    (query.localDigits !== query.digits && phone.includes(query.localDigits))
  ) {
    return MATCH_WORD;
  }

  return MATCH_NONE;
}
