/**
 * Matndagi havola, telefon va buyurtma raqamlarini ajratish — sof funksiya.
 *
 * Kuryer bilan chatda "manzil https://maps… , tel +998 90 123 45 67,
 * #DA-184011" kabi xabarlar oddiy matn bo'lib keladi
 * (`HUDUD_BACKEND_TALABLAR_3` §3 — backend `entities` bermaydi, ilova o'zi
 * topadi). Bu modul matnni bo'laklarga ajratadi, chizish esa
 * `components/kit/linkified-text.tsx` da.
 *
 *   url   — `https://…`, `www.…`, `site.uz/…` (faqat tanish zonalar);
 *   phone — `+998 90 123 45 67`, `998901234567`, `+7 …` (9–15 raqam);
 *   order — `#DA-184011`, `ORD-123`, `#12345`.
 *
 * Xavfsizlik: `href` faqat `http(s)` bo'ladi — `javascript:` yoki boshqa
 * sxema hech qachon havolaga aylanmaydi (`safeHref`).
 */

export type LinkSegment =
  | { type: "text"; value: string }
  | { type: "url"; value: string; href: string }
  /** `digits` — faqat raqamlar (`tel:` va nusxalash uchun). */
  | { type: "phone"; value: string; digits: string }
  /** `orderNumber` — `#` siz raqam (`DA-184011`). */
  | { type: "order"; value: string; orderNumber: string };

const TLDS =
  "uz|com|ru|org|net|me|io|kz|kg|tj|info|biz|tv|dev|app|site|online|store|shop|edu|gov|pro|club|live|cc|co|ai";

/** Manzil ichida bo'lmaydigan belgilar: bo'shliq, qavs-teglar, qo'shtirnoq. */
const STOP = String.raw`[^\s<>"'«»]`;

const URL_SOURCE = [
  String.raw`(?:https?:\/\/|www\.)${STOP}+`,
  String.raw`\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.(?:${TLDS})\b(?:\/${STOP}*)?`,
].join("|");

/** Raqamlar orasidagi ajratgichlar: bo'shliq, chiziqcha, qavs, nuqta. */
const SEP = String.raw`[\s().-]*`;

const PHONE_SOURCE = [
  // O'zbekiston: +998 90 123 45 67 (plus ixtiyoriy).
  String.raw`\+?998${SEP}\d{2}${SEP}\d{3}${SEP}\d{2}${SEP}\d{2}`,
  // Boshqa xalqaro: + bilan boshlanadi, 9–15 raqam.
  String.raw`\+\d(?:${SEP}\d){8,14}`,
].join("|");

/** `#DA-184011`, `ORD-123`, `#12345` (kamida 4 raqam). */
const ORDER_SOURCE = String.raw`#?(?:ORD|[A-Z]{2})-\d+|#\d{4,}`;

const TOKEN_RE = new RegExp(
  `(?<url>${URL_SOURCE})|(?<phone>${PHONE_SOURCE})|(?<order>${ORDER_SOURCE})`,
  "gi",
);

/** Havola oxiriga yopishib qolgan tinish belgilari. */
const TRAILING = ".,;:!?]}»\"'";

/** Faqat `http(s)` — `javascript:`, `data:` va boshqalar havola emas. */
export function safeHref(candidate: string): string | null {
  const href = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
  try {
    const url = new URL(href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return href;
  } catch {
    return null;
  }
}

/** "(qarang: site.uz)." — yopuvchi qavs va nuqta matnniki, havolaniki emas. */
function trimTrailing(value: string): string {
  let text = value;
  while (text.length > 0) {
    const tail = text[text.length - 1]!;
    if (tail === ")") {
      const opened = (text.match(/\(/g) ?? []).length;
      const closed = (text.match(/\)/g) ?? []).length;
      if (closed > opened) {
        text = text.slice(0, -1);
        continue;
      }
      break;
    }
    if (TRAILING.includes(tail)) {
      text = text.slice(0, -1);
      continue;
    }
    break;
  }
  return text;
}

function urlSegment(value: string, before: string): LinkSegment | null {
  // E-pochta domeni (`ali@mail.uz`) yoki so'z davomi — havola emas.
  if (before && /[@\w/]/.test(before)) return null;
  const href = safeHref(value);
  return href ? { type: "url", value, href } : null;
}

function phoneSegment(value: string, before: string, after: string): LinkSegment | null {
  // Uzunroq raqamning bo'lagi emas (`1234567890123456`).
  if (/[\d+]/.test(before) || /\d/.test(after)) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return null;
  return { type: "phone", value, digits };
}

function orderSegment(value: string, before: string, after: string): LinkSegment | null {
  // "COVID-19" ichidagi "ID-19" yoki raqam davomi — buyurtma emas.
  if (/[\w#]/.test(before) || /[\w-]/.test(after)) return null;
  return { type: "order", value, orderNumber: value.replace(/^#/, "") };
}

/** Matnni oddiy bo'laklar, havolalar, telefonlar va buyurtma raqamlariga ajratadi. */
export function linkify(text: string): LinkSegment[] {
  const segments: LinkSegment[] = [];
  let last = 0;

  const pushText = (from: number, to: number) => {
    if (to > from) segments.push({ type: "text", value: text.slice(from, to) });
  };

  for (const match of text.matchAll(TOKEN_RE)) {
    const start = match.index ?? 0;
    if (start < last) continue;
    const groups = match.groups ?? {};
    const before = start > 0 ? text[start - 1]! : "";

    let segment: LinkSegment | null = null;
    let value = match[0];
    if (groups.url) {
      value = trimTrailing(value);
      if (!value) continue;
      segment = urlSegment(value, before);
    } else {
      value = trimTrailing(value);
      if (!value) continue;
      const after = text[start + value.length] ?? "";
      segment = groups.phone
        ? phoneSegment(value, before, after)
        : orderSegment(value, before, after);
    }
    if (!segment) continue;

    pushText(last, start);
    segments.push(segment);
    last = start + value.length;
  }

  pushText(last, text.length);
  return segments;
}

/** Matnda kamida bitta havola (`url`) bormi. */
export function hasLink(text: string): boolean {
  return linkify(text).some((segment) => segment.type === "url");
}

/** Matndagi barcha `http(s)` havolalar — tartib bilan. */
export function urlsIn(text: string): string[] {
  return linkify(text).flatMap((segment) => (segment.type === "url" ? [segment.href] : []));
}
