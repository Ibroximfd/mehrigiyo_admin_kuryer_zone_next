import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Skript ham, test ham bitta yadrodan foydalanadi — qamrov ikki xil
// hisoblanmasin.
import { extractAll } from "../../../scripts/i18n-extract-core.mjs";

import { translateText } from "./translate";

/**
 * Rus lug'ati qamrovi: manba koddagi har bir UI matni tarjima qilinishi
 * shart. Yangi matn qo'shilsa va `ru/` ga yozilmasa — test yiqiladi va
 * qaysi fayl/qatorda ekanini aytadi.
 *
 * Tekshiruv: shablon o'rinlari (`{x}`) `7` bilan to'ldiriladi, natijada
 * lotin so'z qolmasligi kerak (brend va qisqartmalardan tashqari).
 */

/** Tarjima qilinmaydigan matnlar: brend, texnik qiymat, shadcn ichki matni. */
const IGNORE = new Set([
  // Xarita foni brendi va Yandex API til kodlari (`lib/yandex-maps.ts`).
  "Yandex",
  "uz_UZ",
  "ru_RU",
  "Mehrigiyo",
  "Mehrigiyo Bosh kuryer",
  "Accept",
  "Authorization",
  "Bearer {x}",
  "NFD",
  "Instagram",
  "Telegram",
  "Post",
  "Reel",
  "@{x} · Story",
  "Click",
  "Payme",
  "Uzum",
  "Paynet",
  "Doctor Ali",
  "Sino AI",
  "CSV",
  "COD",
  "DL",
  // Bo'lim qisqa nomi (rail) — ruschada ham "AI".
  "AI",
  "LG",
  // ISO valyuta va bozor kodlari — `features/products/price.ts` zaxira narxi.
  "UZS",
  "UZ",
  // Google Geocoding `location_type` qiymatlari — `features/orders/geocode.ts`.
  "ROOFTOP",
  "RANGE_INTERPOLATED",
  "GEOMETRIC_CENTER",
  "APPROXIMATE",
  // shadcn/cmdk ichki (sr-only) matnlari — ekranda ko'rinmaydi.
  "Command Palette",
  "Search for a command to run...",
  "Close",
]);

/** Rus matnida lotincha qolishi to'g'ri bo'lgan so'zlar. */
const ALLOWED_LATIN = new Set([
  "XLSX",
  "repeat",
  "minmax",
  "fr",
  // Joylashuv texnologiyasi nomi — ruschada ham lotincha yoziladi.
  "GPS",
  "Mehrigiyo",
  "Logist",
  "MicroSIP",
  "CRM",
  "COD",
  "CSV",
  "SMS",
  "ID",
  "QR",
  "API",
  "Telegram",
  "Instagram",
  "Payme",
  "Click",
  "Uzum",
  "Paynet",
  "push",
  "Push",
  "undo",
  "R",
  "BACKEND-LOGIST",
  "md",
  // Sklad: mahsulot kodi va hujjat prefiksi — ruschada ham lotincha.
  "SKU",
  "BOSH",
  "AI",
  "field_not_allowed",
  "access",
  "A4",
  // Fayl turlari — ruschada ham lotincha yoziladi (kuryer chati biriktirmasi).
  "PDF",
  "Word",
  "Excel",
  "JPEG",
  "PNG",
  "A5",
  "B",
  "K",
  // Klaviatura tugmalari — ruschada ham lotincha yoziladi.
  "Enter",
  "Esc",
]);

const root = fileURLToPath(new URL("../../..", import.meta.url));

function residualLatin(text: string): string[] {
  const words = text.match(/[A-Za-z][A-Za-z0-9_'-]*/g) ?? [];
  return words.filter((word) => !ALLOWED_LATIN.has(word) && !/^[A-Z]\d$/.test(word));
}

describe("rus lug'ati qamrovi", () => {
  const items = extractAll(root);

  it("manba koddan UI matnlari topiladi", () => {
    expect(items.length).toBeGreaterThan(500);
  });

  it("har bir UI matni rus tiliga tarjima qilingan", () => {
    const missing = items
      .filter((item) => !IGNORE.has(item.text))
      .map((item) => {
        const sample = item.text.replace(/\{x\}/g, "7");
        const translated = translateText(sample, "ru");
        return { item, translated, residue: residualLatin(translated) };
      })
      .filter(({ residue }) => residue.length > 0)
      .map(
        ({ item, translated }) =>
          `${item.file}:${item.line}  ${JSON.stringify(item.text)} → ${JSON.stringify(translated)}`,
      );

    expect(missing, `Tarjimasiz matnlar (${missing.length}):\n${missing.join("\n")}`).toEqual([]);
  });
});
