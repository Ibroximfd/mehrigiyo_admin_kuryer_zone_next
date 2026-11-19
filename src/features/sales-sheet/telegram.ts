import { groupThousands } from "@/lib/format";

import { cellUnitText, filledCells, fullDate, moneyText } from "./display";
import { isSingleDay, rangeTitle } from "./period";
import type { SheetRange } from "./period";
import type { RegionGroup } from "./regions";
import type { CellMap, CourierSheet, SheetFigures, SheetProduct } from "./types";

/**
 * «Sotuv jadvali» — Telegram guruhiga yoziladigan matn (logist saytidagi
 * «Kunlik hisobot» uslubida). Raqamlar o'sha jadvaldan, nol mahsulot qatorlari
 * kirmaydi. Tarjima: matn DOM'ga tushmaydi — yorliqlar `t` orqali (tanlangan
 * til), kuryer va mahsulot nomlari xom holida (jadvaldagidek, `data-no-translit`).
 * Viloyat nomi — yorliq kabi tarjima qilinadi: jadvalda ham lug'atdan o'giriladi.
 */

export const TELEGRAM_LINE = "━━━━━━━━━━━━━━━";

type Translate = (text: string) => string;

export type SheetTelegramInput = {
  /** Sarlavhadagi nom — filial (yoki bosh kuryer); bo'sh bo'lsa yozilmaydi. */
  title: string;
  range: SheetRange;
  products: readonly SheetProduct[];
  couriers: readonly CourierSheet[];
  totals: SheetFigures;
  /** Viloyatlar; `null` — hali aniqlanmagan: matn viloyat bo'limlarisiz (kuryerlar + jami). */
  regions: readonly RegionGroup[] | null;
  t?: Translate;
};

const same: Translate = (text) => text;

/** Noldan farqli kataklar, ustun tartibida; bo'lmasa — «• yo'q». */
function itemLines(cells: CellMap, products: readonly SheetProduct[], t: Translate): string[] {
  const lines = filledCells(cells, products).map(({ product, cell }) => `• ${product.name} — ${t(cellUnitText(cell, product))}`);
  return lines.length > 0 ? lines : [`• ${t("yo'q")}`];
}

/**
 * Pul: naqd, onlayn, skidka; «Topshirishi kerak» — «Pul olish»dagi «Olinishi kerak»
 * (`cash.due_total`, o'tgan qarz bilan), «Topshirdi» — olingani (`cash.received`).
 * «Pul olish» bloki serverdan kelmagan bo'lsa ikkinchi qator yozilmaydi.
 */
function moneyLines(figures: SheetFigures, t: Translate): string[] {
  const lines = [
    `💵 ${t("Naqd")}: ${moneyText(figures.cashAmount)} · ${t("Onlayn")}: ${moneyText(figures.onlineAmount)} · ${t("Skidka")}: ${moneyText(figures.discountAmount)}`,
  ];
  if (figures.cash) {
    lines.push(`💰 ${t("Topshirishi kerak")}: ${moneyText(figures.cash.dueTotal)} · ${t("Topshirdi")}: ${moneyText(figures.cash.received)}`);
  }
  return lines;
}

/** Blok: sotilgan, sovg'a, pul; yig'indi blokida (viloyat, jami) — manzillar ham. */
function figureLines(figures: SheetFigures, products: readonly SheetProduct[], t: Translate, withAddresses: boolean): string[] {
  return [
    `📦 ${t("Sotildi")}`,
    ...itemLines(figures.sold, products, t),
    `🎁 ${t("Sovg'a")}`,
    ...itemLines(figures.gift, products, t),
    ...moneyLines(figures, t),
    ...(withAddresses
      ? [`🚚 ${t("Manzil soni")}: ${groupThousands(figures.addresses)} · ${t("Borganda atkaz")}: ${groupThousands(figures.refusedAddresses)}`]
      : []),
  ];
}

/** Kuryerlar qisqacha — orasida bo'sh qator. */
function courierLines(couriers: readonly CourierSheet[], products: readonly SheetProduct[], t: Translate): string[] {
  return couriers.flatMap((courier, index) => [...(index > 0 ? [""] : []), `👤 ${courier.courier.fullName}`, ...figureLines(courier, products, t, false)]);
}

function headerLines(input: SheetTelegramInput, t: Translate): string[] {
  const { range, title } = input;
  return [
    title ? `📍 ${t("Sotuv hisoboti")} — ${title}` : `📍 ${t("Sotuv hisoboti")}`,
    isSingleDay(range) ? `📅 ${t("Sana")}: ${fullDate(range.dateFrom)}` : `📅 ${t("Davr")}: ${rangeTitle(range)}`,
  ];
}

/**
 * Viloyat bo'limi. Bitta kun — kuryerlar, keyin «{viloyat} jami»; hafta / oy /
 * oraliq — faqat viloyat jami (jadvaldagidek, kuryer bloklarisiz).
 */
function regionLines(region: RegionGroup, input: SheetTelegramInput, t: Translate): string[] {
  const head = `🗺 ${t(region.name)} · ${t(`${region.couriers.length} ta kuryer`)}`;
  if (!isSingleDay(input.range)) return [head, ...figureLines(region.totals, input.products, t, true)];
  return [
    head,
    "",
    ...courierLines(region.couriers, input.products, t),
    "",
    `📊 ${t(`${region.name} jami`)}`,
    ...figureLines(region.totals, input.products, t, true),
  ];
}

/** Butun matn: sarlavha, har viloyat (yoki viloyat noma'lum bo'lsa — kuryerlar), oxirida «Jami». */
export function salesSheetTelegram(input: SheetTelegramInput): string {
  const t = input.t ?? same;
  const sections = input.regions
    ? input.regions.map((region) => regionLines(region, input, t))
    : input.couriers.length > 0
      ? [courierLines(input.couriers, input.products, t)]
      : [];
  return [
    ...headerLines(input, t),
    TELEGRAM_LINE,
    ...sections.flatMap((section) => [...section, TELEGRAM_LINE]),
    `🧾 ${t("Jami")} · ${t(`${input.couriers.length} ta kuryer`)}`,
    ...figureLines(input.totals, input.products, t, true),
  ].join("\n");
}

/** Bitta viloyat — o'sha viloyat guruhiga yuborish uchun: sarlavha va shu viloyat bo'limi. */
export function regionTelegram(input: SheetTelegramInput, region: RegionGroup): string {
  const t = input.t ?? same;
  return [...headerLines(input, t), TELEGRAM_LINE, ...regionLines(region, input, t)].join("\n");
}
