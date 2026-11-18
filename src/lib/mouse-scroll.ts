/**
 * Sichqoncha uchun gorizontal surish (2026-10-30; keng jadvallar — egasi
 * so'rovi 2026-11-18): operator, logist va bosh kuryerlar oddiy sichqoncha
 * ishlatadi — g'ildirak faqat tepa-pastga suradi, ekranga sig'magan
 * gorizontal qatorlar (chiplar, tablar, keng jadvallar) esa yon tomonga
 * suriladi.
 *
 * Qoida: faqat `data-wheel-x` belgili konteyner ichida. G'ildirak avval
 * yaqinroq **vertikal** skrollga beriladi (kanban ustuni ichida — ustun
 * suriladi); belgisiz vertikal skrollga duch kelinsa (oxiriga yetgan bo'lsa
 * ham) gorizontalga o'tilmaydi — ustun oxirida doska kutilmaganda yon
 * tomonga sakrab ketmasin. Belgili konteynerning o'zi ham vertikal siljisa
 * (balandligi chegarali jadval — sarlavha yopishishi uchun), g'ildirak shu
 * yo'nalishda tepa-pastga sura olguncha vertikal qoladi, tepa/past chetida —
 * yon tomonga. Yon chetga yetganda hodisa o'tkaziladi — sahifa suriladi,
 * foydalanuvchi hech qachon jadval ichida qamalib qolmaydi.
 */
export type ScrollBox = {
  parent: ScrollBox | null;
  wheelX: boolean;
  /** Vertikal skroll konteyneri (overflow-y: auto|scroll va kontent sig'maydi). */
  scrollsY: boolean;
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};

/** Shu yo'nalishda yana siljiy oladimi; brauzer kasr piksel beradi — 1 px chegara. */
function canMove(position: number, max: number, delta: number): boolean {
  if (max <= 1) return false;
  return delta > 0 ? position < max - 1 : position > 1;
}

/** Maydonlar o'z matnini suradi — ular hech qachon avtomatik yon konteyner emas. */
const FORM_TAGS = new Set(["input", "textarea", "select"]);

/**
 * Belgisiz konteyner yon tomonga g'ildirak bilan suriladimi (2026-11-18,
 * egasi: «gorizontal skroll bo'ladigan hamma joyda»). `data-wheel-x`
 * qo'yilmagan chiplar qatori, tablar, keng jadvallar ham ishlasin:
 * - `overflow-x` — `auto`/`scroll` va kontent haqiqatan kengroq;
 * - o'zi tepa-pastga **surilmaydi** — vertikal ro'yxat (kanban ustuni,
 *   dialog tanasi) qoida 1 dagidek tegilmaydi; ikki o'qli jadval kartasi
 *   uchun esa aniq `data-wheel-x` kerak (qoida 2);
 * - `data-wheel-x="off"` — majburan o'chirish.
 */
export function autoWheelX(box: {
  tagName: string;
  marker: string | null;
  overflowX: string;
  scrollsY: boolean;
  scrollWidth: number;
  clientWidth: number;
}): boolean {
  if (box.marker !== null) return box.marker !== "off";
  if (FORM_TAGS.has(box.tagName.toLowerCase())) return false;
  if (box.overflowX !== "auto" && box.overflowX !== "scroll") return false;
  return !box.scrollsY && box.scrollWidth > box.clientWidth + 1;
}

export function wheelTarget(start: ScrollBox | null, deltaY: number): ScrollBox | null {
  for (let box = start; box; box = box.parent) {
    if (box.scrollsY && !box.wheelX) return null;
    if (!box.wheelX) continue;
    if (box.scrollsY && canMove(box.scrollTop, box.scrollHeight - box.clientHeight, deltaY)) return null;
    const maxX = box.scrollWidth - box.clientWidth;
    // Sig'adigan belgili qator — tashqi belgili qatorga; vertikal chetidagi jadval — sahifaga.
    if (maxX <= 1) {
      if (box.scrollsY) return null;
      continue;
    }
    return canMove(box.scrollLeft, maxX, deltaY) ? box : null;
  }
  return null;
}

/** Satr rejimidagi bitta qadam (Firefox `deltaMode: 1`) — pikselda. */
const LINE_PX = 32;

/** G'ildirak siljishi pikselda: `deltaMode` 0 — piksel, 1 — satr, 2 — sahifa (konteyner eni). */
export function wheelPixels(delta: number, deltaMode: number, pageWidth: number): number {
  if (deltaMode === 1) return delta * LINE_PX;
  if (deltaMode === 2) return delta * pageWidth;
  return delta;
}
