/**
 * O'zbek lotin → kirill transliteratsiyasi.
 *
 * Nima uchun lug'at emas, transliteratsiya: lotin va kirill — bitta tilning
 * ikki yozuvi. Yuzlab satrni ikki nusxada saqlash (va ular bir-biridan
 * qolib ketishi) o'rniga manba matn doim lotinchada qoladi, kirill esa
 * shu yerda hisoblab chiqariladi. Yangi qo'shilgan har qanday matn
 * avtomatik qamrab olinadi — hech kim tarjimani unutmaydi.
 *
 * Funksiya idempotent: kirill matn qayta berilsa o'zgarmaydi (qoidalar
 * faqat lotin harflariga tegadi).
 */

/** Lotin yozuvidagi apostrof variantlari: oʻ, gʻ va tutuq belgisi. */
const APOSTROPHES = /['‘’ʻʼ`´]/g;

/**
 * So'z — lotin harflari, ular orasida (va `o'`/`g'` uchun oxirida ham)
 * apostrof bo'lishi mumkin.
 */
const WORD = /[A-Za-z]+(?:['‘’ʻʼ`´][A-Za-z]+)*['‘’ʻʼ`´]?/g;

/** So'z oxiridagi apostrof harf emas, tinish belgisi bo'lgan holat. */
const PUNCTUATION_TAIL = /(?:^|[^og])['‘’ʻʼ`´]$/i;

/**
 * Almashtirish qoidalari. Tartib muhim — uzunroq mos kelish avval tekshiriladi,
 * aks holda `yo'q` → `ёъқ` bo'lib ketadi (to'g'risi `йўқ`).
 */
const RULES: Array<[string, string]> = [
  ["yo'", "йў"],
  ["o'", "ў"],
  ["g'", "ғ"],
  ["sh", "ш"],
  ["ch", "ч"],
  ["yo", "ё"],
  ["yu", "ю"],
  ["ya", "я"],
  ["ye", "е"],
  ["'", "ъ"],
  ["a", "а"],
  ["b", "б"],
  ["c", "с"],
  ["d", "д"],
  ["e", "е"],
  ["f", "ф"],
  ["g", "г"],
  ["h", "ҳ"],
  ["i", "и"],
  ["j", "ж"],
  ["k", "к"],
  ["l", "л"],
  ["m", "м"],
  ["n", "н"],
  ["o", "о"],
  ["p", "п"],
  ["q", "қ"],
  ["r", "р"],
  ["s", "с"],
  ["t", "т"],
  ["u", "у"],
  ["v", "в"],
  ["w", "в"],
  ["x", "х"],
  ["y", "й"],
  ["z", "з"],
];

/**
 * Mexanik o'girish noto'g'ri chiqadigan o'zaklar. Qo'shimchalari bilan
 * ishlaydi: `leadlaringizni` → `лидларингизни`.
 */
const STEMS: Array<[string, string]> = [["lead", "лид"]];

/** Nomlar — lotinchaligicha qoladi. */
const KEEP = new Set([
  "microsip",
  "payme",
  "click",
  "uzum",
  "paynet",
  "telegram",
  "instagram",
  "youtube",
  "post",
  "reel",
  "story",
]);

/**
 * Lotinchaligicha qoladigan qisqartmalar. Qolgan katta harfli so'zlar
 * (`YANGI`, `PUL OLINADI`) o'giriladi.
 */
const ACRONYMS = new Set([
  "CRM",
  "API",
  "SMS",
  "COD",
  "CSV",
  "ID",
  "SIP",
  "QR",
  "PDF",
  "URL",
  "AI",
  "UZS",
  "KB",
  "MB",
  "GB",
  "OK",
  "FIO",
]);

/** Lotin bo'lagining katta-kichikligini kirill bo'lagiga ko'chiradi. */
function applyCase(latin: string, cyrillic: string): string {
  if (!/[a-z]/i.test(latin)) return cyrillic;
  if (latin === latin.toUpperCase()) return cyrillic.toUpperCase();
  if (latin[0] === latin[0].toUpperCase()) {
    return cyrillic[0].toUpperCase() + cyrillic.slice(1);
  }
  return cyrillic;
}

function transliterateWord(word: string): string {
  // CRM, API, ⌘B dagi yolg'iz harf va unli harfsiz bosh harflar (DL, LG)
  // tegilmaydi; `YANGI` kabi katta harfli so'zlar esa o'giriladi.
  if (word === word.toUpperCase() && word !== word.toLowerCase()) {
    if (ACRONYMS.has(word) || word.length === 1) return word;
    if (word.length <= 3 && !/[AEIOU]/.test(word)) return word;
  }
  if (KEEP.has(word.toLowerCase())) return word;

  // `Yorug'` dagi apostrof — harf, `xabar'` dagisi — tinish belgisi.
  if (PUNCTUATION_TAIL.test(word)) {
    return transliterateWord(word.slice(0, -1)) + word.slice(-1);
  }

  const normalized = word.replace(APOSTROPHES, "'");
  const lower = normalized.toLowerCase();

  let out = "";
  let index = 0;

  const stem = STEMS.find(([latin]) => lower.startsWith(latin));
  if (stem) {
    out += applyCase(normalized.slice(0, stem[0].length), stem[1]);
    index = stem[0].length;
  }

  while (index < lower.length) {
    const rule = RULES.find(([latin]) => lower.startsWith(latin, index));
    if (!rule) {
      out += normalized[index];
      index += 1;
      continue;
    }

    const [latin, cyrillic] = rule;
    // So'z boshidagi "e" — "э": `eslatma` → `эслатма`, `kelmoq` → `келмоқ`.
    const mapped = index === 0 && latin === "e" ? "э" : cyrillic;

    out += applyCase(normalized.slice(index, index + latin.length), mapped);
    index += latin.length;
  }

  return out;
}

/** Matnni kirillga o'giradi. Raqam, tinish belgisi va kirill matn tegilmaydi. */
export function toCyrillic(text: string): string {
  if (!text) return text;
  return text.replace(WORD, transliterateWord);
}
