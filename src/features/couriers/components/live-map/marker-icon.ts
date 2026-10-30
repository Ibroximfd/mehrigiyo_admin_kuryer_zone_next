import type { MarkerTone } from "@/features/couriers/live-tracking";
import type { PillPlacement } from "@/features/couriers/live-map-view";

/**
 * Kuryer markeri — bitta DOM tuguni, holati `data-*` atributlar va CSS
 * o'zgaruvchisi bilan boshqariladi (`globals.css` → `.courier-marker`).
 *
 * Icon qayta yaratilmaydi: `setIcon` elementni almashtiradi va silliq
 * siljish (CSS `transform` o'tishi) yo'qoladi. Shuning uchun rasm, rang,
 * strelka, ism va yo'nalish mavjud elementga yoziladi.
 *
 * Rasm: `<img loading="eager">` (marker darhol ko'rinadi), xato bo'lsa —
 * `data-img="failed"` va ostidagi bosh harflar qoladi (buzuq rasm yo'q).
 */
export const MARKER_SIZE = 40;

export type MarkerState = {
  tone: MarkerTone;
  moving: boolean;
  /** Gradus; `null` — strelka yo'q. */
  heading: number | null;
  focused: boolean;
  dimmed: boolean;
  /** Yon paneldagi qator ustida sichqoncha — marker ajralib turadi. */
  highlighted: boolean;
  initials: string;
  /** Palitra indeksi — rasm yo'q bo'lsa fon rangi. */
  hue: number;
  /** `thumb_url`; `null` — faqat bosh harflar. */
  imageUrl: string | null;
  /** `Aziz K.` */
  name: string;
};

/** Ichki tuzilma; rasm va matn `applyMarkerState` da yoziladi. */
export function markerHtml(): string {
  return (
    '<span class="courier-marker__ring" aria-hidden="true"></span>' +
    '<span class="courier-marker__body">' +
    '<span class="courier-marker__pin avatar-fallback">' +
    '<span class="courier-marker__initials" aria-hidden="true"></span>' +
    '<img class="courier-marker__img" alt="" loading="eager" decoding="async" referrerpolicy="no-referrer" draggable="false">' +
    "</span>" +
    '<span class="courier-marker__heading" aria-hidden="true">' +
    '<span class="courier-marker__badge">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 20 21 12 16 4 21Z"/></svg>' +
    "</span></span>" +
    "</span>" +
    '<span class="courier-marker__name" data-no-translit></span>'
  );
}

/**
 * Rasm hodisalari bir marta ulanadi: yuklansa — ko'rinadi, xato bo'lsa —
 * bosh harflar qoladi. Eski `src` ning kech kelgan hodisasi e'tiborsiz.
 */
export function bindMarkerImage(element: HTMLElement): void {
  const img = element.querySelector<HTMLImageElement>(".courier-marker__img");
  if (!img) return;
  img.addEventListener("load", () => {
    if (img.getAttribute("src")) element.dataset.img = "loaded";
  });
  img.addEventListener("error", () => {
    if (img.getAttribute("src")) element.dataset.img = "failed";
  });
}

export function applyMarkerState(element: HTMLElement, state: MarkerState): void {
  element.dataset.tone = state.tone;
  element.dataset.moving = String(state.moving && state.heading !== null);
  element.dataset.focused = String(state.focused);
  element.dataset.dimmed = String(state.dimmed);
  element.dataset.highlight = String(state.highlighted);
  element.dataset.avatarHue = String(state.hue);
  element.style.setProperty("--heading", `${state.heading ?? 0}deg`);

  const initials = element.querySelector<HTMLElement>(".courier-marker__initials");
  if (initials && initials.textContent !== state.initials) initials.textContent = state.initials;

  const name = element.querySelector<HTMLElement>(".courier-marker__name");
  if (name && name.textContent !== state.name) name.textContent = state.name;

  const img = element.querySelector<HTMLImageElement>(".courier-marker__img");
  if (img && (img.getAttribute("src") ?? null) !== state.imageUrl) {
    if (state.imageUrl) {
      element.dataset.img = "loading";
      img.setAttribute("src", state.imageUrl);
      // Keshdan darhol kelgan rasm `load` ni kutmaydi.
      if (img.complete && img.naturalWidth > 0) element.dataset.img = "loaded";
    } else {
      img.removeAttribute("src");
      element.dataset.img = "none";
    }
  }
}

export function applyPillPlacement(element: HTMLElement, placement: PillPlacement): void {
  if (element.dataset.pill !== placement) element.dataset.pill = placement;
}
