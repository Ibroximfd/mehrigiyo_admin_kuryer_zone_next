/**
 * Yandex Maps JS API 2.1 yuklovchisi. Skript bir marta qo'shiladi, keyingi
 * chaqiruvlar o'sha va'dani oladi. Kalit noto'g'ri, kunlik limit tugagan
 * yoki tarmoq yo'q bo'lsa `ymaps.ready` kelmaydi — [timeoutMs] da rad
 * etiladi va chaqiruvchi zaxira fonga o'tadi.
 *
 * Faqat logist panelida ishlatiladigan qism tiplangan (rasmiy `@types` yo'q).
 */

/** `[lat, lng]` — Yandex koordinata tartibi. */
export type YandexCoords = [number, number];

export interface YandexMap {
  setCenter(center: YandexCoords, zoom?: number, options?: { duration?: number }): unknown;
  destroy(): void;
  container: { fitToViewport(): void };
  behaviors: { disable(behaviors: string[]): void };
}

export interface YandexMapsApi {
  ready(onReady: () => void, onError?: (error: unknown) => void): void;
  Map: new (
    element: HTMLElement,
    state: { center: YandexCoords; zoom: number; controls: string[] },
    options?: Record<string, unknown>,
  ) => YandexMap;
}

/** Interfeys tili: ilova tiliga yaqini (`uz` → `uz_UZ`, qolgani `ru_RU`). */
export function yandexMapsLang(appLang: string | null | undefined): string {
  return appLang?.toLowerCase().startsWith("uz") ? "uz_UZ" : "ru_RU";
}

export function yandexMapsScriptUrl(apiKey: string, lang: string): string {
  const params = new URLSearchParams({ apikey: apiKey, lang });
  return `https://api-maps.yandex.ru/2.1/?${params.toString()}`;
}

let loading: Promise<YandexMapsApi> | null = null;

export function loadYandexMaps(apiKey: string, lang: string, timeoutMs: number): Promise<YandexMapsApi> {
  if (loading) return loading;
  const attempt = new Promise<YandexMapsApi>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("yandex_maps_timeout")), timeoutMs);
    const done = (api: YandexMapsApi) => {
      window.clearTimeout(timer);
      resolve(api);
    };
    const fail = (error: unknown) => {
      window.clearTimeout(timer);
      reject(error instanceof Error ? error : new Error("yandex_maps_failed"));
    };
    const script = document.createElement("script");
    script.src = yandexMapsScriptUrl(apiKey, lang);
    script.async = true;
    script.onerror = () => fail(new Error("yandex_maps_script"));
    script.onload = () => {
      // Skript `window.ymaps` ni o'zi e'lon qiladi — tipini kompilyator bilmaydi.
      const api = (window as unknown as { ymaps?: YandexMapsApi }).ymaps;
      if (!api) return fail(new Error("yandex_maps_missing"));
      api.ready(() => done(api), fail);
    };
    document.head.appendChild(script);
  });
  // Muvaffaqiyatsiz urinish keshlanmaydi — sahifa qayta ochilganda yana uriniladi.
  loading = attempt.catch((error: unknown) => {
    loading = null;
    throw error;
  });
  return loading;
}
