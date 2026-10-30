import { ROUTES } from "@/lib/routes";

/**
 * Bo'lim fon sahnalari ("Tungi yo'l" dizayni, 2026-10-17).
 *
 * Har bo'limning o'z fotosi bor — logist qaysi bo'limda turganini fon
 * ohangidan ham sezadi. Fotolar Unsplash'dan (litsenziya: bepul, atribut
 * shart emas), 1600×1000 WebP, `public/scenes/`:
 *
 *   login       photo-1519501025264 — kechki shahar ko'chasi, faralar, nam yo'l
 *   dashboard   photo-1465447142348 — yo'l tugunlari aerosurati ("dispetcher xaritasi")
 *   orders      photo-1514565131    — ko'k soat osmon chizig'i
 *   couriers    photo-1617347454431 — tunda skuterdagi kuryer
 *   transfers   photo-1553413077    — ombor yo'lagi
 *   statistics  photo-1477959858617 — shahar aerosurati, shom
 *
 * `focus` — `object-position`: foto qirqilganda qaysi nuqta kadrda qolsin.
 */
export type SceneId =
  | "login"
  | "dashboard"
  | "orders"
  | "couriers"
  | "transfers"
  | "statistics";

export type Scene = {
  id: SceneId;
  src: string;
  focus: string;
};

export const SCENES: Record<SceneId, Scene> = {
  login: { id: "login", src: "/scenes/login.webp", focus: "50% 60%" },
  dashboard: { id: "dashboard", src: "/scenes/dashboard.webp", focus: "50% 50%" },
  orders: { id: "orders", src: "/scenes/orders.webp", focus: "50% 40%" },
  couriers: { id: "couriers", src: "/scenes/couriers.webp", focus: "50% 50%" },
  transfers: { id: "transfers", src: "/scenes/transfers.webp", focus: "50% 50%" },
  statistics: { id: "statistics", src: "/scenes/statistics.webp", focus: "50% 45%" },
};

/**
 * Manzil prefiksi → sahna. Xodimlar chatiga alohida foto berilmagan: u
 * uzoq o'qiladigan ekran, eng tinch sahna — boshqaruvniki.
 */
const ROUTE_SCENES: ReadonlyArray<readonly [prefix: string, scene: SceneId]> = [
  [ROUTES.orders, "orders"],
  [ROUTES.couriers, "couriers"],
  [ROUTES.map, "couriers"],
  [ROUTES.transfers, "transfers"],
  [ROUTES.statistics, "statistics"],
  [ROUTES.staffChat, "dashboard"],
];

/** Manzilga mos sahna; noma'lum manzil — boshqaruv sahnasi. */
export function sceneForPath(pathname: string): Scene {
  const hit = ROUTE_SCENES.find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return SCENES[hit ? hit[1] : "dashboard"];
}
