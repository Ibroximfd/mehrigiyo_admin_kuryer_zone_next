/**
 * Xarita foni. Kalit (`NEXT_PUBLIC_YANDEX_MAPS_KEY`) bo'lsa sukut — **Yandex**
 * (egasi qarori, 2026-10-30): Yandex JS API 2.1 xaritasi Leaflet ostida fon
 * bo'lib chiziladi (`yandex-base-layer.tsx`), markerlar va iz o'zgarmaydi.
 * Yandex yuklanmasa (kalit, limit, tarmoq) — Standart raster OSM'ga qaytiladi.
 *
 * Kalit bo'lmasa sukut — **Standart** (raster OpenStreetMap, avvalgi ko'rinish —
 * egasi shuni ma'qul ko'rdi, 2026-10-19). Qo'shimcha: OpenFreeMap vektor plitkalari (kalitsiz, tijoriy
 * foydalanish ruxsat, https://openfreemap.org), MapLibre GL orqali Leaflet
 * ichida chiziladi. WebGL yo'q yoki uslub 8 s da yuklanmasa — eski raster
 * OSM plitkalariga qaytiladi.
 *
 * Yorliqlar `name` maydonidan (positron/liberty) — O'zbekistonda bu
 * mahalliy yozuv (ko'pincha lotin, ba'zan kirill).
 */

export const MAP_STYLES = ["yandex", "standard", "plain", "detailed", "dark"] as const;
export type MapStyle = (typeof MAP_STYLES)[number];
export type VectorMapStyle = Exclude<MapStyle, "standard" | "yandex">;

/**
 * Yandex JS API kaliti — statik eksportda build paytida kodga tushadi
 * (brauzer kaliti baribir ochiq; kabinetda HTTP Referer bilan cheklangan).
 */
export const YANDEX_MAPS_KEY: string | null = process.env.NEXT_PUBLIC_YANDEX_MAPS_KEY?.trim() || null;

export const MAP_STYLE_URL: Record<VectorMapStyle, string> = {
  plain: "https://tiles.openfreemap.org/styles/positron",
  detailed: "https://tiles.openfreemap.org/styles/liberty",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

export const MAP_STYLE_LABEL: Record<MapStyle, string> = {
  yandex: "Yandex",
  standard: "Standart",
  plain: "Oddiy",
  detailed: "Batafsil",
  dark: "Qorong'i",
};

export const OPENFREEMAP_ATTRIBUTION =
  '&copy; <a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> ' +
  '&copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> ' +
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/** Uslub shuncha vaqtda yuklanmasa — raster zaxira. */
export const VECTOR_LOAD_TIMEOUT_MS = 8_000;

/** Yandex API shuncha vaqtda tayyor bo'lmasa (kalit/limit/tarmoq) — raster zaxira. */
export const YANDEX_LOAD_TIMEOUT_MS = 10_000;

/** `v3` — Yandex sukutga aylandi: eski saqlangan tanlov bekor, hamma sukutga qaytadi. */
export const MAP_STYLE_STORAGE_KEY = "logist.map-style.v3";

/** Tanlovda ko'rinadigan uslublar — kalitsiz Yandex chiqmaydi. */
export function availableMapStyles(yandexKey: string | null = YANDEX_MAPS_KEY): readonly MapStyle[] {
  return yandexKey ? MAP_STYLES : MAP_STYLES.filter((style) => style !== "yandex");
}

export function parseMapStyle(raw: string | null | undefined): MapStyle | null {
  return (MAP_STYLES as readonly string[]).includes(raw ?? "") ? (raw as MapStyle) : null;
}

/**
 * Tanlanmagan bo'lsa — kalit bor: **Yandex**, yo'q: **Standart** (qorong'i
 * mavzuda fonga yumshoq qorong'i filtr qo'yiladi). Tanlangani — o'sha;
 * kalitsiz qolgan "Yandex" tanlovi Standart'ga tushadi.
 */
export function resolveMapStyle(saved: MapStyle | null, yandexKey: string | null = YANDEX_MAPS_KEY): MapStyle {
  if (saved === "yandex" && !yandexKey) return "standard";
  return saved ?? (yandexKey ? "yandex" : "standard");
}

export function isVectorStyle(style: MapStyle): style is VectorMapStyle {
  return style !== "standard" && style !== "yandex";
}

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem" | "removeItem">;

function defaultStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Shaxsiy oyna yoki bloklangan saqlash — `null` (sukut), xato otilmaydi. */
export function readSavedMapStyle(storage: ReadableStorage | null = defaultStorage()): MapStyle | null {
  try {
    return parseMapStyle(storage?.getItem(MAP_STYLE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveMapStyle(style: MapStyle, storage: WritableStorage | null = defaultStorage()): void {
  try {
    storage?.setItem(MAP_STYLE_STORAGE_KEY, style);
  } catch {
    // Saqlab bo'lmadi — tanlov faqat shu sahifa ochiq turganda amal qiladi.
  }
}

/** Brauzer WebGL chiza oladimi — yo'q bo'lsa vektor xarita urinilmaydi. */
export function supportsWebGL(doc: Document | null = typeof document === "undefined" ? null : document): boolean {
  if (!doc) return false;
  try {
    const canvas = doc.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
