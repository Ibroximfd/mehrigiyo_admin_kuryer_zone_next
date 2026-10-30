/**
 * Rang yordamchilari.
 *
 * Sdelka ustunlarining rangini admin o'zi tanlaydi va u backenddan ixtiyoriy
 * hex bo'lib keladi — och sariqdan to'q ko'kkacha. Shuning uchun ustun
 * sarlavhasining matn rangini qo'lda tanlab bo'lmaydi: u fondan hisoblanadi.
 */

/** Oq matn hamma joyda yarashavermaydi — to'q variant mavzu siyohiga yaqin. */
const LIGHT_TEXT = "#ffffff";
const DARK_TEXT = "#10231e";

/** WCAG AA — oddiy o'lchamdagi matn uchun eng kam kontrast. */
const MIN_CONTRAST = 4.5;

/** `#abc`, `#aabbcc`, `#aabbccdd` → `[r, g, b]`; tanib bo'lmasa `null`. */
function parseHex(color: string): [number, number, number] | null {
  const hex = color.trim().replace(/^#/, "");
  const full =
    hex.length === 3 || hex.length === 4
      ? hex
          .slice(0, 3)
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : hex.length === 6 || hex.length === 8
        ? hex.slice(0, 6)
        : null;

  if (full === null || !/^[0-9a-f]{6}$/i.test(full)) return null;

  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function toHex(rgb: [number, number, number]): string {
  return `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

function channelLuminance(value: number): number {
  const channel = value / 255;
  return channel <= 0.03928
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

function rgbLuminance([r, g, b]: [number, number, number]): number {
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

/** WCAG nisbiy yorqinligi (0 — qora, 1 — oq). Rang tanilmasa `null`. */
export function luminance(color: string): number | null {
  const rgb = parseHex(color);
  return rgb ? rgbLuminance(rgb) : null;
}

function contrast(a: number, b: number): number {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

const WHITE_LUM = rgbLuminance([255, 255, 255]);
const DARK_LUM = rgbLuminance(parseHex(DARK_TEXT)!);

/**
 * Rangli sarlavha uchun fon va matn juftligi.
 *
 * Ko'p ranglarda oq yoki to'q matnning biri yetarli bo'ladi. Ammo o'rta
 * ohangdagi ranglarda (masalan `#8b5cf6`) ikkalasi ham AA dan past chiqadi —
 * bunday holda fon ohangini saqlagan holda to'qlashtiriladi va oq matn
 * qo'yiladi. Rang umuman tanilmasa fon o'zgarishsiz, matn oq qoladi.
 */
export function headerColors(color: string): {
  background: string;
  text: string;
} {
  const rgb = parseHex(color);
  if (!rgb) return { background: color, text: LIGHT_TEXT };

  const lum = rgbLuminance(rgb);
  const onLight = contrast(lum, DARK_LUM);
  const onDark = contrast(lum, WHITE_LUM);

  if (Math.max(onLight, onDark) >= MIN_CONTRAST) {
    return {
      background: color,
      text: onLight >= onDark ? DARK_TEXT : LIGHT_TEXT,
    };
  }

  // Qora bilan aralashtiramiz — ohang saqlanadi, faqat to'qlashadi.
  for (let mix = 0.08; mix <= 0.6; mix += 0.04) {
    const darker: [number, number, number] = [
      rgb[0] * (1 - mix),
      rgb[1] * (1 - mix),
      rgb[2] * (1 - mix),
    ];
    if (contrast(rgbLuminance(darker), WHITE_LUM) >= MIN_CONTRAST) {
      return { background: toHex(darker), text: LIGHT_TEXT };
    }
  }

  return { background: toHex([0, 0, 0]), text: LIGHT_TEXT };
}
