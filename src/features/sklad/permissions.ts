import type { SkladMe } from "./types";

/**
 * Sklad ruxsatlari (§1, §15) — backend baribir tekshiradi, bu yerda faqat
 * tugmani ko'rsatish/yashirish.
 *
 *   `logist.main`   — hamma mahsulot, hamma ombor.
 *   `logist.branch` — faqat o'z filialiga dopusk berilgan mahsulotlar,
 *                     lekin **hamma** viloyat ombori va kuryerda.
 *   `crm`           — faqat ko'rish.
 */
export function isMainLogist(me: SkladMe | null | undefined): boolean {
  return me?.role === "logist.main";
}

/** Shu mahsulot bo'yicha hujjat yoza oladimi. */
export function canWriteItem(me: SkladMe | null | undefined, itemId: number): boolean {
  if (!me) return false;
  if (me.role === "logist.main") return true;
  if (me.role === "logist.branch") return me.grantedItemIds.includes(itemId);
  return false;
}

/** Umuman birorta yozuv tugmasi ko'rinadimi. */
export function canWriteAny(me: SkladMe | null | undefined): boolean {
  if (!me) return false;
  if (me.role === "logist.main") return true;
  return me.role === "logist.branch" && me.grantedItemIds.length > 0;
}

/** Nazorat yoqish/o'chirish va dopusk — faqat asosiy logist (§15, §16). */
export function canManageItems(me: SkladMe | null | undefined): boolean {
  return isMainLogist(me);
}

/**
 * Hujjat qatorlarini tekshiradi: `logist.branch` uchun bitta qatorda ham
 * dopusk bo'lmasa butun hujjat rad (`403 grant_required`, §15). Backend
 * xatosini kutmasdan oynada oldindan ko'rsatish uchun.
 */
export function firstUngrantedItem(
  me: SkladMe | null | undefined,
  itemIds: number[],
): number | null {
  return itemIds.find((id) => !canWriteItem(me, id)) ?? null;
}
