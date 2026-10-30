/**
 * Lug'at bo'yicha matn tarjimasi — DOM qatlami, toast, bildirishnoma va
 * chop etiladigan hujjatlar uchun yagona funksiya.
 *
 * Kalit — o'zbek lotin manba matni. Qidiruv tartibi:
 *   1. aniq moslik (bo'sh joy saqlanadi, apostrof variantlari bir xil);
 *   2. katta-kichik harfga befarq moslik (natija manbaning shakliga keltiriladi);
 *   3. shablon: `{n}` — son, boshqa `{nom}` — ixtiyoriy bo'lak (u ham tarjima
 *      qilinadi). Rus ko'plik shakli: `{n|заказ|заказа|заказов}`;
 *   4. sana so'zlari (oy, hafta kuni) — `dateWords`;
 *   5. chetdagi tinish belgilari (`· `, `…`, `:`) olib tashlanib qayta urinish;
 *   6. ` · `, ` — `, `: ` va hokazo bo'yicha bo'laklab tarjima. Vergul bilan
 *      ulangan tanilmagan bo'lak (manzil) butun satrni o'zgarishsiz qoldiradi.
 * Topilmasa — matn o'zgarishsiz qaytadi.
 */

export type Dictionary = Readonly<Record<string, string>>;

type Slot = { name: string; numeric: boolean };

type Template = {
  regex: RegExp;
  slots: Slot[];
  target: string;
  /** Eng uzun so'zli bo'lak — regexdan oldin arzon `includes` tekshiruvi. */
  anchor: string;
  /** Aniqroq shablon birinchi: o'zgarmas bo'laklar uzunligi. */
  weight: number;
};

export type Translator = {
  translate: (text: string) => string;
  /** Matn lug'atda bor-yo'qligi (shablon va bo'laklar hisobga olinadi). */
  has: (text: string) => boolean;
};

export type TranslatorOptions = {
  /** Oy/hafta kuni kabi so'zlarni almashtiradi; o'zgarmasa `null`. */
  dateWords?: (text: string) => string | null;
  /** Topilmagan matn haqida xabar (dev rejimida). */
  onMiss?: (text: string) => void;
};

const APOSTROPHES = /[‘’ʻʼ`´]/g;
const PLACEHOLDER = /\{([a-zA-Z][\w]*)(?:\|([^}]*))?\}/g;
const NUMBER = String.raw`[-+−]?\d(?:[\d   .,]*\d)?`;
const LATIN = /[A-Za-z]/;

/** Kalit uchun normallashtirish: apostrof, NBSP va ichki bo'sh joylar. */
export function normalizeKey(text: string): string {
  return text
    .replace(APOSTROPHES, "'")
    .replace(/[  ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Rus tili ko'plik shakli: 1 заказ, 2 заказа, 5 заказов. */
export function russianPlural(count: number, forms: readonly string[]): string {
  const [one, few = one, many = few] = forms;
  const n = Math.abs(Math.trunc(count)) % 100;
  const last = n % 10;
  if (n > 10 && n < 20) return many ?? "";
  if (last === 1) return one ?? "";
  if (last >= 2 && last <= 4) return few ?? "";
  return many ?? "";
}

function parseNumber(raw: string): number {
  return Number(raw.replace(/[\s  ]/g, "").replace(/,/g, ".").replace("−", "-"));
}

function compileTemplate(key: string, target: string): Template {
  const slots: Slot[] = [];
  let pattern = "";
  let last = 0;
  let literal = "";

  for (const match of key.matchAll(PLACEHOLDER)) {
    const chunk = key.slice(last, match.index);
    pattern += escapeRegex(chunk);
    literal += ` ${chunk}`;
    const name = match[1]!;
    const numeric = name === "n" || /^n\d+$/.test(name);
    slots.push({ name, numeric });
    pattern += numeric ? `(${NUMBER})` : "(.+?)";
    last = (match.index ?? 0) + match[0].length;
  }
  const tail = key.slice(last);
  pattern += escapeRegex(tail);
  literal += ` ${tail}`;

  const words = literal.split(/[^A-Za-z']+/).filter(Boolean);
  const anchor = words.reduce((best, word) => (word.length > best.length ? word : best), "");

  return {
    regex: new RegExp(`^${pattern}$`, "i"),
    slots,
    target,
    anchor: anchor.toLowerCase(),
    // Harf ham, belgi ham (`→`, `·`) hisobga olinadi: `{n} ta buyurtma → {x}`
    // umumiyroq `{n} ta buyurtma {x}` dan oldin tekshirilsin. Son o'rni
    // ixtiyoriy matn o'rnidan aniqroq.
    weight:
      literal.replace(/\s+/g, "").length * 4 +
      slots.filter((slot) => slot.numeric).length,
  };
}

/** Manbaning katta-kichikligini natijaga ko'chiradi. */
function applyCase(source: string, target: string): string {
  const letters = source.replace(/[^A-Za-z]/g, "");
  if (letters.length >= 2 && letters === letters.toUpperCase()) return target.toUpperCase();
  const first = source.match(/[A-Za-z]/)?.[0];
  if (!first || !target) return target;
  if (first === first.toUpperCase()) return target.charAt(0).toUpperCase() + target.slice(1);
  // Kichik harfli manba: faqat birinchi so'z qisqartma bo'lmasa kichraytiramiz.
  if (/^\p{Lu}\p{Ll}/u.test(target)) return target.charAt(0).toLowerCase() + target.slice(1);
  return target;
}

/** Chetdagi bezak/tinish belgilari — tarjimaga tegmaydi. */
const LEADING = /^[\s·•—–\-+⚠📞✓✗⤺→←▾…:;,.(«"„#№]+/u;
const TRAILING = /[\s·•—–\-→▾…:;,.!?)»"]+$/u;

/** Bo'laklarga ajratgichlar (ajratgichning o'zi saqlanadi). */
const SEGMENT_SPLIT = /(\s+[·•—–→←/|]\s+|:\s+|;\s+|,\s+|\s+\(|\)\s*|\s*\/\s*)/;

/** Login, buyurtma raqami kabi identifikator — UI matni emas. */
const IDENTIFIER = /[0-9_@#]/;

const MAX_CACHE = 5000;

export function createTranslator(
  dictionary: Dictionary,
  options: TranslatorOptions = {},
): Translator {
  const exact = new Map<string, string>();
  const lower = new Map<string, string>();
  const templates: Template[] = [];

  for (const [rawKey, value] of Object.entries(dictionary)) {
    const key = normalizeKey(rawKey);
    if (/\{[a-zA-Z]/.test(key)) {
      templates.push(compileTemplate(key, value));
      continue;
    }
    exact.set(key, value);
    if (!lower.has(key.toLowerCase())) lower.set(key.toLowerCase(), value);
  }
  templates.sort((a, b) => b.weight - a.weight);

  const cache = new Map<string, string | null>();

  function fillTarget(template: Template, values: string[]): string {
    const byName = new Map<string, string>();
    template.slots.forEach((slot, index) => byName.set(slot.name, values[index] ?? ""));

    return template.target.replace(PLACEHOLDER, (_whole, name: string, forms?: string) => {
      const value = byName.get(name) ?? "";
      if (forms !== undefined) return russianPlural(parseNumber(value), forms.split("|"));
      return value;
    });
  }

  function matchTemplate(key: string): string | null {
    const lowerKey = key.toLowerCase();
    for (const template of templates) {
      if (template.anchor && !lowerKey.includes(template.anchor)) continue;
      const match = template.regex.exec(key);
      if (!match) continue;
      const values = template.slots.map((slot, index) => {
        const raw = match[index + 1] ?? "";
        return slot.numeric ? raw : (lookup(raw, 1) ?? raw);
      });
      return fillTarget(template, values);
    }
    return null;
  }

  /** Normallashtirilgan, chetlari tozalangan matn uchun tarjima; topilmasa `null`. */
  function lookup(key: string, depth: number): string | null {
    if (!key || !LATIN.test(key)) return null;
    const cached = cache.get(key);
    if (cached !== undefined) return cached;

    const result = resolve(key, depth);
    if (cache.size > MAX_CACHE) cache.clear();
    cache.set(key, result);
    return result;
  }

  function resolve(key: string, depth: number): string | null {
    const direct = exact.get(key);
    if (direct !== undefined) return direct;

    const folded = lower.get(key.toLowerCase());
    if (folded !== undefined) return applyCase(key, folded);

    const templated = matchTemplate(key);
    if (templated !== null) return templated;

    const dated = options.dateWords?.(key);
    if (dated && !LATIN.test(dated.replace(/\b[A-Z]{2,}\b/g, ""))) return dated;

    // Chetdagi belgilar: "· naqd", "Saqlash…", "Sabab:".
    const lead = key.match(LEADING)?.[0] ?? "";
    const trail = key.slice(lead.length).match(TRAILING)?.[0] ?? "";
    if (lead || trail) {
      const core = key.slice(lead.length, key.length - trail.length);
      if (core && core !== key) {
        const inner = lookup(core, depth);
        if (inner !== null) return `${lead}${inner}${trail}`;
      }
    }

    if (depth < 3) {
      const parts = key.split(SEGMENT_SPLIT);
      if (parts.length > 1) {
        let changed = false;
        let unknown = false;
        const out = parts.map((part, index) => {
          if (index % 2 === 1 || !part) return part;
          const translated = lookup(part, depth + 1) ?? dateOnly(part);
          if (translated !== null) {
            changed = true;
            return translated;
          }
          // ` · ` / ` — ` / `: ` bilan ulangan noma'lum bo'lak (ism, raqam)
          // joyida qoladi. Vergul esa manzil belgisi: u yerda tanilmagan bo'lak
          // butun satrni to'xtatadi — "Toshkent shahri, Yunusobod" yarim
          // o'girilib "г. Ташкент, Yunusobod" bo'lmasin.
          const commaJoined = [parts[index - 1], parts[index + 1]].some(
            (separator) => separator !== undefined && separator.trim() === ",",
          );
          if (commaJoined && LATIN.test(part) && !IDENTIFIER.test(part)) unknown = true;
          return part;
        });
        if (changed && !unknown) return out.join("");
      }
    }

    if (dated) return dated;
    return null;
  }

  function dateOnly(part: string): string | null {
    return options.dateWords?.(part) ?? null;
  }

  function translate(text: string): string {
    if (!text || !LATIN.test(text)) return text;
    const key = normalizeKey(text);
    if (!key) return text;

    const result = lookup(key, 0);
    if (result === null) {
      options.onMiss?.(key);
      return text;
    }
    // Atrofdagi bo'sh joy saqlanadi — JSX matn tugunlari unga tayanadi.
    const leading = text.match(/^\s*/)?.[0] ?? "";
    const trailing = text.match(/\s*$/)?.[0] ?? "";
    return `${leading}${result}${trailing}`;
  }

  return {
    translate,
    has: (text) => {
      const key = normalizeKey(text);
      return !LATIN.test(key) || lookup(key, 0) !== null;
    },
  };
}
