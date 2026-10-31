/**
 * Backend manzillari — logist sayti uchun yagona manba.
 *
 * Har ikkala rejimda ham nisbiy `/api` ishlatiladi:
 *   production  → nginx backendga proxy qiladi (`nginx.conf`);
 *   development → dev-proxy uzatadi (`scripts/dev.mjs`).
 * Natijada CORS muammosi umuman chiqmaydi.
 *
 * Qaysi backend (test yoki prod) — `config/servers.mjs` da tanlanadi va
 * `next.config.ts` orqali bu yerga `NEXT_PUBLIC_*` sifatida yetib keladi.
 * Shu sababli host bu faylda qo'lda yozilmaydi.
 *
 * Logist endpointlari `BACKEND-LOGIST.md` kontraktidan. Backend hali
 * chiqarmagan bo'lsa 404 keladi — chaqiruvchi buni "hali tayyor emas" deb
 * yumshoq qabul qiladi (`lib/api-availability.ts`).
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

/** Faol server nomi: `"prod"` yoki `"test"`. */
export const SERVER_NAME = process.env.NEXT_PUBLIC_SERVER ?? "prod";

/** Faol backend hosti — nisbiy yo'l ishlamaydigan joylar uchun. */
export const BACKEND_HOST =
  process.env.NEXT_PUBLIC_BACKEND_HOST ?? "my.imorganic.uz";

export const ENDPOINTS = {
  // ── Auth (CRM bilan bir xil) ─────────────────────────────────────────────
  operatorLogin: "/operator/login/",
  refresh: "/user/refresh/",

  // ── Lug'at ───────────────────────────────────────────────────────────────
  /** Viloyat + tumanlar lug'ati (ETag, 1 soat kesh). `/api/meta/` — operator emas. */
  metaRegions: "/meta/regions/",

  // ── Bosh kuryer (backend K1, 2026-10-30 §C) ─────────────────────────────
  /** Bosh kuryer bo'limi — rol `chief_courier`, aks holda `403`. */
  chiefMe: "/operator/chief/me/",
  chiefOrders: "/operator/chief/orders/",
  chiefOrderCandidates: (id: string) => `/operator/chief/orders/${id}/candidates/`,
  chiefOrderAssign: (id: string) => `/operator/chief/orders/${id}/assign/`,
  /** Zakaz detali va tarixi (`history[]`, V4). */
  chiefOrder: (id: string) => `/operator/chief/orders/${id}/`,
  /** Manzilni tuzatish (o'z viloyatlari ichida) va logistga qaytarish — `25_MANZIL_OZGARISHI` §5. */
  chiefOrderAddress: (id: string) => `/operator/chief/orders/${id}/address/`,
  chiefOrderReturn: (id: string) => `/operator/chief/orders/${id}/return/`,
  /** Avto-taqsimlash: reja va tasdiqlangan rejani yuborish (V5). */
  chiefAutoAssignPreview: "/operator/chief/orders/auto-assign/preview/",
  chiefAutoAssignApply: "/operator/chief/orders/auto-assign/apply/",
  /** Filiallar ro'yxati (V14). */
  chiefFilials: "/operator/chief/filials/",
  /** Kuryerning naqd hisobi — e'lon qilinmagan kunlar ham (V11). */
  chiefCourierCod: (id: number) => `/operator/chief/couriers/${id}/cod/`,
  chiefCouriers: "/operator/chief/couriers/",
  chiefCourier: (id: number) => `/operator/chief/couriers/${id}/`,
  chiefZones: "/operator/chief/zones/",
  chiefZone: (id: number) => `/operator/chief/zones/${id}/`,
  /** Filial kesimidagi moliya (`TUZILMA_V2` §5.1). */
  chiefFinance: "/operator/chief/finance/",
  /** Kassa 2-pog'ona: holat va filialga topshirish (§5.2–5.3). */
  chiefCash: "/operator/chief/cash/",
  chiefCashHandover: "/operator/chief/cash/handover/",
  /** Kassa 1-pog'ona: kuryer e'lonlari va qabul (K1 javoblari, `chief=men`). */
  chiefCodHandovers: "/operator/chief/cod/handovers/",
  chiefCourierSettle: (id: number) => `/operator/chief/couriers/${id}/settle/`,
  /**
   * Sklad (bosh kuryerga faqat o'qish, V7/V8): `sklads/` — faqat o'z skladi,
   * `stock/` — o'z skladi omborlari va kuryerlari ombori, `couriers/` — o'z kuryerlari.
   */
  skladSklads: "/sklad/sklads/",
  skladStock: "/sklad/stock/",
  skladCouriers: "/sklad/couriers/",
  /** Bosh kuryerga sklad holati: `regions`, `sklad_id` (V16/V17). */
  skladMe: "/sklad/me/",
  /** Qo'lda kiritilgan tuman/shahar/qishloq (V6). */
  chiefPlaces: "/operator/chief/places/",
} as const;

/**
 * Backenddan kelgan media manzilini brauzer ochadigan holga keltiradi.
 *
 * Uch xil shakl keladi:
 *   • `https://…` — tayyor, o'z holicha qaytadi (2026-09-08 dan chat
 *     fayllari `file.url` shunday keladi — unga hech narsa QO'SHILMAYDI,
 *     aks holda host ikki marta yopishib rasm yana ochilmaydi);
 *   • `http://…` — reverse proxy sxemani uzatmaganda; HTTPS sahifada
 *     mixed content sifatida bloklanadi, shuning uchun `https` ga o'giriladi;
 *   • nisbiy `/media/…` — serializer `request` kontekstisiz chaqirilganda
 *     (avatar, mahsulot rasmi kabi joylarda hali uchraydi).
 *
 * ⚠️ Nisbiy yo'l **sahifa hostiga emas, backend hostiga** bog'lanadi.
 * Ilgari u `window.location.origin` ga nisbatan ochilardi va nginx
 * `/media/` ni uzatmagan deployda Next'ning 404 sahifasi chiqardi
 * (chatdagi rasm shundan buzuq ko'ringan). `<img>`, `<video>`, `<audio>`
 * uchun boshqa hostdan yuklash CORS talab qilmaydi, ya'ni bu har qanday
 * nginx sozlamasida ishlaydi.
 */
export function resolveMediaUrl(url: string): string {
  const value = (url ?? "").trim();
  if (!value) return value;
  if (value.startsWith("https://")) return value;
  if (value.startsWith("http://")) return `https://${value.slice(7)}`;
  if (value.startsWith("//")) return `https:${value}`;
  // Mahalliy oldindan ko'rish (yuborilayotgan fayl) — tegilmaydi.
  if (value.startsWith("blob:") || value.startsWith("data:")) return value;
  return new URL(value, `https://${BACKEND_HOST}`).toString();
}

/** Bu manzillar hech qachon token yangilashni chaqirmasligi kerak. */
export function isAuthEndpoint(path: string): boolean {
  return (
    path.includes(ENDPOINTS.refresh) ||
    path.includes(ENDPOINTS.operatorLogin)
  );
}
