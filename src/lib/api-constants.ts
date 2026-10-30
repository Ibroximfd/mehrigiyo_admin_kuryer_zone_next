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
 * WebSocket manzili. REST va WS bitta backendda bo'lishi shart — aks holda
 * biri bergan tokenni ikkinchisi rad etadi va real vaqt o'lib qoladi.
 *
 * Production'da WS ham sahifa hostidan boradi (nginx `/ws` ni uzatadi).
 * Development'da Next dev serveri WS proxy qila olmaydi, shuning uchun
 * to'g'ridan-to'g'ri dev-proxy'ga ulanamiz.
 */
export function wsUrl(path: string): string {
  if (process.env.NEXT_PUBLIC_WS_HOST) {
    return `wss://${process.env.NEXT_PUBLIC_WS_HOST}${path}`;
  }
  if (process.env.NODE_ENV === "development") {
    return `ws://127.0.0.1:${process.env.NEXT_PUBLIC_DEV_PROXY_PORT ?? 3031}${path}`;
  }
  const host =
    typeof window !== "undefined" ? window.location.host : BACKEND_HOST;
  return `wss://${host}${path}`;
}

export const ENDPOINTS = {
  // ── Auth (CRM bilan bir xil) ─────────────────────────────────────────────
  operatorLogin: "/operator/login/",
  /** Zaxira: eski support tizimi akkauntlari (telefon bilan kiradi). */
  supportLogin: "/support/operator/login/",
  refresh: "/user/refresh/",

  // ── Logist buyurtmalari (`BACKEND-LOGIST.md` §3) ─────────────────────────
  logistOrders: "/operator/logist/orders/",
  /** Butun doska bitta so'rovda: har status ustuni, soni va summasi. */
  logistOrdersBoard: "/operator/logist/orders/board/",
  logistOrderDetail: (id: string) => `/operator/logist/orders/${id}/`,
  /** Buyurtma izohlari — logistlar yozishmasi (§4.10). */
  /** Buyurtma tarixi lentasi (`03` §5.2). */
  logistOrderTimeline: (id: string) =>
    `/operator/logist/orders/${id}/timeline/`,
  /** Tarkib narxi — server hisoblaydi (`05` §6 tahrir oynasi). */
  orderPreview: "/operator/orders/preview/",
  /** "Oldim" — buyurtmani ishga olish belgisi, filial bo'yicha umumiy (taklif). */
  logistOrderAck: (id: string) => `/operator/logist/orders/${id}/ack/`,
  /** Yakunlangan zakazda kuryer manzil sonini o'zgartirish (2026-10-30 §2.3b). */
  logistOrderAddresses: (id: string) => `/operator/logist/orders/${id}/addresses/`,
  /** Filial operatorlari (komissiya egasini tanlash) — taklif. */
  logistOperators: "/operator/logist/operators/",
  logistOrderComments: (id: string) =>
    `/operator/logist/orders/${id}/comments/`,
  /** Ommaviy amallar: kuryer biriktirish yoki statusni ko'chirish (§5.1). */
  logistOrdersBulk: "/operator/logist/orders/bulk/",
  /** "Yetkazib bo'lmadi" urinishi (§5.3). */
  logistDeliveryAttempts: (id: string) =>
    `/operator/logist/orders/${id}/delivery-attempts/`,

  // ── Buyurtmani boshqa filialga o'tkazish (A-oqim, §8) ────────────────────
  logistOrderTransfer: (id: string) => `/operator/logist/orders/${id}/transfer/`,
  logistOrderTransferAccept: (id: string) =>
    `/operator/logist/orders/${id}/transfer/accept/`,
  logistOrderTransferReject: (id: string) =>
    `/operator/logist/orders/${id}/transfer/reject/`,

  // ── Kuryerlar (§4) ───────────────────────────────────────────────────────
  /**
   * Kuryerlar ro'yxati — kanonik yo'l (backend javobi #11): filial bilan
   * cheklanmagan, sahifalashsiz massiv, `?zone=&region=&on_shift=`.
   */
  couriers: "/operator/couriers/",
  /** Smenadagi kuryerlar jonli holati (§7.2); yo'q bo'lsa `couriers/?on_shift=true`. */
  couriersLive: "/operator/couriers/live/",
  /** Kuryerning kun izi (`?from=&to=`, ≤ 48 soat). */
  courierTrack: (id: number) => `/operator/couriers/${id}/track/`,
  /** Kuryer qo'shish (akkaunt amali, faqat `is_staff`) — eski manzilda. */
  logistCouriers: "/operator/logist/couriers/",
  logistCourierDetail: (id: number) => `/operator/logist/couriers/${id}/`,
  logistCourierCod: (id: number) => `/operator/logist/couriers/${id}/cod/`,
  logistCourierSettle: (id: number) =>
    `/operator/logist/couriers/${id}/settle/`,
  /** Ilova akkaunti: ochish yoki parolni yangilash (barcha qurilma uziladi). */
  logistCourierSetPassword: (id: number) =>
    `/operator/logist/couriers/${id}/set-password/`,
  /** Ilovadan butunlay o'chirish — token darhol o'ladi. */
  logistCourierDeactivate: (id: number) =>
    `/operator/logist/couriers/${id}/deactivate/`,
  /** Faqat qurilmani uzish — kuryer o'z paroli bilan qayta kiradi. */
  logistCourierLogoutDevice: (id: number) =>
    `/operator/logist/couriers/${id}/logout-device/`,
  /** Kuryerlarning naqd topshirish e'lonlari (filial bo'yicha). */
  logistCodHandovers: "/operator/logist/cod/handovers/",
  /** Shubhali yetkazishlar (rad etilmagan): GPS, vaqt, summa. */
  logistAnomalies: "/operator/logist/anomalies/",

  // ── Kuryer ilovasi bilan aloqa (`KURYER_SAYTLAR_LOGIST_OPERATOR.md` §2) ──
  /** Buyurtma bo'yicha kuryer bilan chat (tizim yozuvlari ham shu lentada). */
  logistOrderMessages: (id: string) =>
    `/operator/logist/orders/${id}/messages/`,
  logistOrderMessagesRead: (id: string) =>
    `/operator/logist/orders/${id}/messages/read/`,
  /** Logistning fayl yuklashi (ovoz, rasm, hujjat) — kuryer chati uchun. */
  logistUploads: "/operator/logist/uploads/",
  /** Kuryerga yuqori ustuvorlikdagi signal. */
  logistOrderUrgentPing: (id: string) =>
    `/operator/logist/orders/${id}/urgent-ping/`,

  // ── Zonalar va avto-taqsimlash (2026-10-15 kontrakti) ───────────────────
  /** Viloyat + tumanlar lug'ati (ETag, 1 soat kesh). `/api/meta/` — operator emas. */
  metaRegions: "/meta/regions/",
  /** Zonalar — faqat o'qish (yaratish admin web'da). `?region=`. */
  zones: "/operator/zones/",
  /** Viloyat sozlamasi: `auto_assign` = `off` · `suggest` · `full` (o'qish). */
  regionSettings: (region: string) =>
    `/operator/regions/${encodeURIComponent(region)}/settings/`,
  /** Buyurtma uchun kuryer nomzodlari — server tartibida, guruhlab ko'rsatiladi. */
  logistOrderCourierCandidates: (id: string) =>
    `/operator/logist/orders/${id}/courier-candidates/`,
  /** Avto-taqsimlash rejasi (ko'rib chiqish) va uni qo'llash. */
  logistAutoAssignPreview: "/operator/logist/orders/auto-assign/preview/",
  logistAutoAssign: "/operator/logist/orders/auto-assign/",
  /** Kuryersiz `confirmed` buyurtmalar soni hudud bo'yicha (backend A1). */
  logistUnassignedCounts: "/operator/logist/orders/unassigned-counts/",
  /** Filiallararo naqd hisobot (`date_from`/`date_to` majburiy, ≤ 92 kun). */
  codInterfilial: "/operator/cod/interfilial/",

  // ── Filiallararo ta'minot zakazi (B-oqim, §7) ────────────────────────────
  logistFilials: "/operator/logist/filials/",
  logistTransfers: "/operator/logist/transfers/",
  logistTransfersCreate: "/operator/logist/transfers/create/",
  logistTransferDetail: (id: number) => `/operator/logist/transfers/${id}/`,

  // ── Filial harakatlar jurnali (§4.11) ────────────────────────────────────
  logistActivity: "/operator/logist/activity/",

  // ── Eshikdagi o'zgarish so'rovlari (2026-10-27, `LOGIST_02` §2) ──────────
  /** Buyurtmaning so'rovlari — ochig'i birinchi. */
  logistOrderChangeRequests: (id: string) =>
    `/operator/logist/orders/${id}/change-requests/`,
  logistOrderChangeRequestAccept: (id: string, requestId: number) =>
    `/operator/logist/orders/${id}/change-requests/${requestId}/accept/`,
  logistOrderChangeRequestReject: (id: string, requestId: number) =>
    `/operator/logist/orders/${id}/change-requests/${requestId}/reject/`,

  // ── Yetkazish to'xtashlari va kuryer haqi (`LOGIST_03` §2) ───────────────
  /** `GET ?date=&status=` ro'yxat, `POST {order_ids}` yaratish. */
  logistStops: "/operator/logist/stops/",
  /** Birlashtirsa bo'ladigan guruhlar (`?date=`). */
  logistStopSuggestions: "/operator/logist/stops/suggestions/",
  /** Hamma taklifni to'xtashga aylantiradi. */
  logistStopsAuto: "/operator/logist/stops/auto/",
  /** Buyurtmani manzildan chiqarish (bitta qolsa manzil tarqaladi). */
  logistStopOrder: (stopId: number, orderId: string) =>
    `/operator/logist/stops/${stopId}/orders/${orderId}/`,
  /** Stavka: `GET` hamma, `POST` faqat bosh filial logisti. */
  logistPayRate: "/operator/logist/pay-rate/",

  // ── Bosh kuryer (backend K1, 2026-10-30 §C) ─────────────────────────────
  /** Bosh kuryerlar tanlovi (`?region=`) — logist zakazni beradi. */
  logistChiefs: "/operator/logist/chiefs/",
  /** Bosh kuryerdan pul (2-pog'ona) — bosh logist qabul qiladi. */
  logistChiefHandovers: "/operator/logist/chief-handovers/",
  logistChiefHandoverConfirm: (id: number) => `/operator/logist/chief-handovers/${id}/confirm/`,
  /** Bosh kuryer bo'limi — rol `chief_courier`, aks holda `403`. */
  chiefMe: "/operator/chief/me/",
  chiefOrders: "/operator/chief/orders/",
  chiefOrderCandidates: (id: string) => `/operator/chief/orders/${id}/candidates/`,
  chiefOrderAssign: (id: string) => `/operator/chief/orders/${id}/assign/`,
  chiefAutoAssign: "/operator/chief/orders/auto-assign/",
  chiefCouriers: "/operator/chief/couriers/",
  chiefCourier: (id: number) => `/operator/chief/couriers/${id}/`,
  chiefCourierAttach: (id: number) => `/operator/chief/couriers/${id}/attach/`,
  chiefCourierDetach: (id: number) => `/operator/chief/couriers/${id}/detach/`,
  chiefZones: "/operator/chief/zones/",
  chiefZone: (id: number) => `/operator/chief/zones/${id}/`,
  chiefCash: "/operator/chief/cash/",
  chiefCashHandover: "/operator/chief/cash/handover/",
  chiefStats: "/operator/chief/stats/",

  // ── Bitrix oqimi: Dostavka va Baza doskalari (`LOGIST_01` §3–4, §7) ──────
  /** Lid kartalari, ustun = eng yangi ochiq buyurtma holati. */
  logistDeliveryBoard: "/operator/logist/delivery/board/",
  /** Baza (`post_sale` statuslar) — faqat o'qish, `read_only: true`. */
  logistBaseKanban: "/operator/logist/base/kanban/",
  /**
   * Baza ustuni davomi (v2, `LOGIST_01` §4): `?stage=base&offset=&limit=`
   * → `{lead_count, offset, limit, has_more, leads[]}`. Logist uchun alohida
   * yo'l yo'q — admin ustun endpointi (faqat o'qish).
   */
  baseKanbanColumn: (statusId: string) => `/operator/admin/kanban/columns/${statusId}/`,
  /** Dostavka/Bazadagi lid kartasi (ichida `orders`). */
  leadDetail: (id: number) => `/operator/leads/${id}/`,

  // ── Logist statistikasi (§4.12) ──────────────────────────────────────────
  logistStatistics: "/operator/logist/statistics/",
  /** Kuryer manzil sonini qo'lda tuzatish: `{date, delta: ±1, note}` (`docs/MANZIL_SONI_BACKEND_TALABLAR.md`). */
  logistCourierAddressAdjust: (courierId: number) => `/operator/logist/couriers/${courierId}/address-adjustments/`,

  // ── Zaxira: admin endpointlari (backend §3 chiqquncha, faqat admin rol) ──
  adminOrders: "/operator/admin/orders/",
  adminOrdersBoard: "/operator/admin/orders/board/",
  adminOrderDetail: (id: string) => `/operator/admin/orders/${id}/`,

  // ── Zaxira: sotuvchi endpointlari (admin bo'lmagan akkaunt uchun) ────────
  myOrders: "/operator/my-orders/",
  operatorOrderDetail: (id: string) => `/operator/orders/${id}/`,

  // ── Do'kon katalogi — transfer zakazida mahsulot qidiruvi ────────────────
  shopMedicines: "/shop/medicines/",

  // ── Xodimlar chati (`LOGIST_CHAT_FLUTTER.md`) ────────────────────────────
  /*
   * Logist uchun ALOHIDA yo'l yo'q: operator sayti bilan bir xil
   * `/api/staff-chat/` va o'sha `/ws/operator/` soketi. Farq faqat
   * huquqda — logist filialidagi har qanday buyurtma muhokamasiga kiradi
   * va serverning o'zi shuni hal qiladi.
   */
  staffChannels: "/staff-chat/channels/",
  /** Xodimlar guruhi — hamma ko'radi. */
  staffGroupChannel: "/staff-chat/channels/group/",
  /** Buyurtma muhokamasi — birinchi so'rovda o'zi yaratiladi. */
  staffOrderChannel: (orderId: string) =>
    `/staff-chat/channels/order/${orderId}/`,
  staffChannelMessages: (channelId: number) =>
    `/staff-chat/channels/${channelId}/messages/`,
  staffChannelRead: (channelId: number) =>
    `/staff-chat/channels/${channelId}/read/`,
  /** Tahrir (PATCH) va o'chirish (DELETE) — bitta manzil. */
  staffMessage: (messageId: number) => `/staff-chat/messages/${messageId}/`,
  // Zakaz chati a'zoligi (backend C1, 2026-10-30 §D).
  // Tuzilma — bosh logist logist ochadi va dopusk beradi (backend B2, 2026-10-30 §E)
  myPermissions: "/operator/me/permissions/",
  structure: "/operator/admin/structure/",
  structureSeats: "/operator/admin/structure/seats/",
  structureSeatVacate: (id: number) => `/operator/admin/structure/seats/${id}/vacate/`,
  structureRoles: "/operator/admin/structure/roles/",
  structureRole: (id: number) => `/operator/admin/structure/roles/${id}/`,
  structurePermissions: "/operator/admin/structure/permissions/",
  staffChannelMembers: (channelId: number) => `/staff-chat/channels/${channelId}/members/`,
  /** Shu odam qo'sha oladigan xodimlar, ishtirokchilarsiz (`?q=`, 2026-10-30). */
  staffChannelCandidates: (channelId: number) => `/staff-chat/channels/${channelId}/candidates/`,
  staffChannelMember: (channelId: number, seatId: number) => `/staff-chat/channels/${channelId}/members/${seatId}/`,
  staffChannelJoin: (channelId: number) => `/staff-chat/channels/${channelId}/join/`,
  /** Chati hali ochilmagan zakazga qo'shilish — kanal yaratiladi (backend so'rovi 2026-10-30). */
  staffOrderJoin: (orderId: string) => `/staff-chat/orders/${orderId}/join/`,
  staffChannelLeave: (channelId: number) => `/staff-chat/channels/${channelId}/leave/`,
  staffOrderSearch: "/staff-chat/orders/search/",
  staffUnreadCount: "/staff-chat/unread-count/",
  /**
   * O'qilmagani bor HAMMA buyurtma kanali — chegarasiz, parametrsiz
   * (2026-10-01 C §13.1). Karta/ustun/menyu belgisi faqat shundan.
   */
  staffUnreadByOrder: "/staff-chat/unread-by-order/",
  /*
   * Jamoa chati — logistlar + kuryerlar (`HUDUD_BACKEND_TALABLAR_4.md` §1).
   * Backend hali chiqarmagan bo'lishi mumkin: 404 → "Tez orada".
   */
  /** Umumiy guruh (yo'q bo'lsa server yaratadi). */
  staffTeamChannel: "/staff-chat/channels/team/",
  /** A'zolar: logistlar + faol kuryerlar; `?search=`. */
  staffTeamMembers: "/staff-chat/channels/team/members/",
  /** `POST {peer_kind, peer_id}` — lichka ochadi yoki mavjudini qaytaradi. */
  staffDirectChannel: "/staff-chat/channels/direct/",
  // ── Sklad (`18_SKLAD_MOLIYA_ANALITIKA_BACKEND_TZ.md`) ─────────────────────
  skladMe: "/sklad/me/",
  skladRegions: "/sklad/regions/",
  skladLocations: "/sklad/locations/",
  skladFilials: "/sklad/filials/",
  skladItems: "/sklad/items/",
  skladItemTrackingOn: (id: number) => `/sklad/items/${id}/tracking/on/`,
  skladItemTrackingOff: (id: number) => `/sklad/items/${id}/tracking/off/`,
  skladItemPin: (id: number) => `/sklad/items/${id}/pin/`,
  skladStock: "/sklad/stock/",
  /** Minimal qoldiq (§3.4). */
  skladStockCell: (locationId: number, itemId: number) =>
    `/sklad/stock/${locationId}/${itemId}/`,
  skladLedger: "/sklad/ledger/",
  skladLedgerSummary: "/sklad/ledger/summary/",
  skladDocuments: "/sklad/documents/",
  skladOverview: "/sklad/overview/",
  skladRegionPanel: (code: string) => `/sklad/regions/${encodeURIComponent(code)}/`,
  skladCouriers: "/sklad/couriers/",
  skladCourierDetail: (id: number) => `/sklad/couriers/${id}/`,
  skladGrants: "/sklad/grants/",
  skladGrantsMine: "/sklad/grants/mine/",
  skladGrant: (id: number) => `/sklad/grants/${id}/`,

  // ── Moliya (`18_SKLAD…` §7) — hammasi `?filial=&date_from=&date_to=` ────
  financeSettings: "/sklad/finance/settings/",
  financeSummary: "/sklad/finance/summary/",
  financeProducts: "/sklad/finance/products/",
  financeOperators: "/sklad/finance/operators/",
  financeOperator: (id: number) => `/sklad/finance/operators/${id}/`,
  financeGifts: "/sklad/finance/gifts/",
  financePoints: "/sklad/finance/points/",

  // ── Analitika (`18_SKLAD…` §8) — bitta so'rov ───────────────────────────
  analyticsFunnel: "/sklad/analytics/funnel/",

  // ── AI tahlil (`18_SKLAD…` §9) ───────────────────────────────────────────
  aiFindings: "/sklad/ai/findings/",
  aiRun: "/sklad/ai/run/",
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
    path.includes(ENDPOINTS.operatorLogin) ||
    path.includes(ENDPOINTS.supportLogin)
  );
}
