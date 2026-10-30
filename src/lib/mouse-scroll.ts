/**
 * Sichqoncha uchun gorizontal surish (2026-10-30): operator va logistlar
 * oddiy sichqoncha ishlatadi — g'ildirak faqat tepa-pastga suradi,
 * gorizontal qatorlar (chiplar, tablar, kanban) esa yon tomonga suriladi.
 *
 * Qoida: faqat `data-wheel-x` belgili konteyner ichida. G'ildirak avval
 * yaqinroq **vertikal** skrollga beriladi (kanban ustuni ichida — ustun
 * suriladi); vertikal skrollga duch kelinsa (oxiriga yetgan bo'lsa ham)
 * gorizontalga o'tilmaydi — ustun oxirida doska kutilmaganda yon tomonga
 * sakrab ketmasin. Jadvallar belgisiz — sahifa avvalgidek suriladi.
 */
export type ScrollBox = {
  parent: ScrollBox | null;
  wheelX: boolean;
  /** Vertikal skroll konteyneri (overflow-y: auto|scroll va kontent sig'maydi). */
  scrollsY: boolean;
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
};

export function wheelTarget(start: ScrollBox | null, deltaY: number): ScrollBox | null {
  for (let box = start; box; box = box.parent) {
    if (box.scrollsY && !box.wheelX) return null;
    if (!box.wheelX) continue;
    const max = box.scrollWidth - box.clientWidth;
    if (max <= 1) continue;
    const canMove = deltaY > 0 ? box.scrollLeft < max - 1 : box.scrollLeft > 1;
    return canMove ? box : null;
  }
  return null;
}

/** Bosilgan joy surishni boshlay oladimi: karta, tugma, havola, maydon — yo'q. */
export const PAN_BLOCKERS =
  "a,button,input,textarea,select,label,summary,[role='button'],[role='tab'],[role='menuitem'],[aria-roledescription],[contenteditable='true'],[data-no-pan]";
