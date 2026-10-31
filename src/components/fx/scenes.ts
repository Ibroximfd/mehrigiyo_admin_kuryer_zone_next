/**
 * Fon sahnasi — faqat kirish sahifasida ("Tungi yo'l" dizayni, 2026-10-17).
 * Foto Unsplash'dan (litsenziya: bepul, atribut shart emas), 1600×1000 WebP,
 * `public/scenes/`: photo-1519501025264 — kechki shahar ko'chasi, nam yo'l.
 *
 * `focus` — `object-position`: foto qirqilganda qaysi nuqta kadrda qolsin.
 */
export type Scene = {
  id: string;
  src: string;
  focus: string;
};

export const LOGIN_SCENE: Scene = { id: "login", src: "/scenes/login.webp", focus: "50% 60%" };
