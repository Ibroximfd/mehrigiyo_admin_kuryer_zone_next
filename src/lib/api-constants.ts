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

/**
 * WebSocket manzili. Dev rejimda `next dev` WS'ni proksilay olmaydi, shuning
 * uchun brauzer to'g'ridan-to'g'ri dev-proxy'ga ulanadi (`scripts/dev.mjs`,
 * `upgrade`); production'da nginx `/ws` ni backendga uzatadi (`nginx.conf`).
 */
export function wsUrl(path: string): string {
  if (process.env.NODE_ENV === "development") {
    return `ws://127.0.0.1:${process.env.NEXT_PUBLIC_DEV_PROXY_PORT ?? 3031}${path}`;
  }
  const host = typeof window !== "undefined" ? window.location.host : BACKEND_HOST;
  return `wss://${host}${path}`;
}

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
  /**
   * Shoshilinch zakazlar (hujjat 123 §4): faol shoshilinchlar ro'yxati (har 15 s
   * so'raladi — bu saytda soket yo'q) va bosh kuryerning «Qabul qildim»i.
   */
  chiefOrdersUrgent: "/operator/chief/orders/urgent/",
  chiefOrderUrgentAck: (id: string) => `/operator/chief/orders/${id}/urgent/ack/`,
  /** Filtrdagi hamma kuryersiz zakazni bitta kuryerga (hujjat 68 §2.1). */
  chiefBulkAssign: "/operator/chief/orders/bulk-assign/",
  /** Filiallar ro'yxati (V14). */
  chiefFilials: "/operator/chief/filials/",
  /** Zakaz beradigan call-markazlar (136-javob §2): birinchisi — logistika filialining o'zi (`is_hub`). */
  chiefSalesCenters: "/operator/chief/sales-centers/",
  chiefCouriers: "/operator/chief/couriers/",
  chiefCourier: (id: number) => `/operator/chief/couriers/${id}/`,
  /** Kuryer login/paroli (hujjat 67): ko'rish, parol qo'yish (akkaunt ham ochadi), qurilmadan chiqarish. */
  chiefCourierCredentials: (id: number) => `/operator/chief/couriers/${id}/credentials/`,
  chiefCourierSetPassword: (id: number) => `/operator/chief/couriers/${id}/set-password/`,
  chiefCourierLogoutDevice: (id: number) => `/operator/chief/couriers/${id}/logout-device/`,
  chiefZones: "/operator/chief/zones/",
  chiefZone: (id: number) => `/operator/chief/zones/${id}/`,
  /** Zona va tuman bo'yicha zakaz soni, sana oralig'i bilan (hujjat 69 §3). */
  chiefZoneStats: "/operator/chief/zones/stats/",
  /** Filial kesimidagi moliya (`TUZILMA_V2` §5.1). */
  chiefFinance: "/operator/chief/finance/",
  /** Kunlik sotuv jadvali (hujjat 83 §2): kuryer × mahsulot, pul, manzil — kun yoki oraliq. */
  chiefSalesSheet: "/operator/chief/report/sales-sheet/",
  /** Kuryer xizmati — bosh kuryer qo'lda yozadi (§3): `PUT {courier_id, date, amount, note}`. */
  chiefSalesSheetFee: "/operator/chief/report/sales-sheet/fee/",
  /** Sotuv jadvali Excel'i (§5) — fayl serverda yasaladi. */
  chiefSalesSheetExport: "/operator/chief/report/sales-sheet/export/",
  /** Berish rejasi (§4): qo'lida, zakazlarga kerak, yana berish kerak — Sotuv jadvalidagi «Berish kerak». */
  chiefIssuePlan: "/operator/chief/report/issue-plan/",
  /** Kuryerdan pul olish (hujjat 85 §2): skidka — `PUT {courier_id, date, amount, note?}`, `0` — o'chirish. */
  chiefSalesSheetDiscount: "/operator/chief/report/sales-sheet/discount/",
  /** «Oldim» — `POST {courier_id, date, amount, note?}`; bir kunda bir nechta (yig'iladi). */
  chiefSalesSheetReceipts: "/operator/chief/report/sales-sheet/receipts/",
  /** Click/onlayn — bosh kuryer qo'lda yozadi (hujjat 101 §1): `PUT {courier_id, date, amount, note?}`, `0` — o'chirish. */
  chiefSalesSheetOnline: "/operator/chief/report/sales-sheet/online/",
  /** «Oldim» ni bekor qilish — faqat o'sha kuni, o'zi yozgan. */
  chiefSalesSheetReceipt: (id: number) => `/operator/chief/report/sales-sheet/receipts/${id}/`,
  /**
   * Sklad (bosh kuryerga faqat o'qish, V7/V8): `sklads/` — faqat o'z skladi,
   * `stock/` — o'z skladi omborlari va kuryerlari ombori, `couriers/` — o'z kuryerlari.
   */
  skladSklads: "/sklad/sklads/",
  skladStock: "/sklad/stock/",
  skladCouriers: "/sklad/couriers/",
  /** Bosh kuryerga sklad holati: `sklad {id, name, regions}` yoki `null` (TZ 32 S-7, §10). */
  skladMe: "/sklad/me/",
  /** Bosh kuryer hujjati — faqat `courier_load` · `courier_return` · `adjustment` (2026-11-03 §6). */
  skladDocuments: "/sklad/documents/",
  /** Kuryer kirim so'rovlari — bosh kuryer tasdig'i (2026-11-03 §4.2). */
  chiefLoadRequests: "/operator/chief/warehouse/load-requests/",
  chiefLoadRequestApprove: (id: number) => `/operator/chief/warehouse/load-requests/${id}/approve/`,
  chiefLoadRequestReject: (id: number) => `/operator/chief/warehouse/load-requests/${id}/reject/`,
  /** Sklad soketi — `sklad_changed` (bosh kuryer boshqa skladga o'tkazildi, §11). */
  skladSocket: "/ws/sklad/",
  /** Sklad jadvali (hujjat 85 §1): hozirgi qoldiq, kunlik va davr harakati — `date_from`, `date_to`, `region`. */
  chiefSkladSheet: "/operator/chief/report/sklad-sheet/",
  /** Sklad jadvali Excel'i (§1.6) — fayl serverda yasaladi. */
  chiefSkladSheetExport: "/operator/chief/report/sklad-sheet/export/",
  /** O'z kuryerlari baholari: qatorlar, `summary`, `by_courier` (`ILOVA_HOLAT…` §7.1). */
  chiefRatings: "/operator/chief/ratings/",
  /** Qo'lda kiritilgan tuman/shahar/qishloq (V6). */
  chiefPlaces: "/operator/chief/places/",
  /** Tumanni tahrirlash (hujjat 51). Kodda `/` bor (`fargona/qoqon_sh`) — server `<path:code>` bilan oladi. */
  chiefPlace: (code: string) => `/operator/chief/places/${code.split("/").map(encodeURIComponent).join("/")}/`,

  // ── Xodim sozlamalari ────────────────────────────────────────────────────
  /** Sahifa filtrlari va saqlangan to'plamlar (52-hujjat): sayt tokendan aniqlanadi (`chief`). */
  myUiPrefs: "/operator/me/ui-prefs/",
  /** O'z login/paroli (hujjat 67 §4): `GET` / `PATCH {password?, username?}`. */
  myCredentials: "/operator/me/credentials/",
  /** Mahsulotlar katalogi (filtr uchun) — do'kon ro'yxati, sahifalangan. */
  shopMedicines: "/shop/medicines/",
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
