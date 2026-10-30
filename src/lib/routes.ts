/**
 * Marshrutlar — logist saytining barcha manzillari bitta joyda.
 *
 * Tafsilot ko'rinishlari (buyurtma, transfer) alohida sahifa emas, so'rov
 * parametri bilan ochiladi: `?order=<uuid>`, `?transfer=<id>`. Sabablari:
 *   • statik eksportda ixtiyoriy `[id]` segmentini oldindan yaratib bo'lmaydi;
 *   • yonma-yon ko'rinish (ro'yxat + tafsilot) qulayroq — kontekst yo'qolmaydi.
 */
export const ROUTES = {
  login: "/login",

  home: "/",
  orders: "/orders",
  couriers: "/couriers",
  /** Jonli xarita — kuryerlar rasmi va ismi bilan, butun ekranda. */
  map: "/map",
  /** Kuryerning kun izi xaritada. */
  mapTrack: (courierId: number) => `/map?track=${courierId}`,
  transfers: "/transfers",
  statistics: "/statistics",
  /** Dostavka va Baza — Bitrix oqimidagi lid kartalari (`?tab=base`). */
  delivery: "/delivery",
  /** Yetkazish to'xtashlari va kuryer haqi. */
  stops: "/stops",
  /** Xodimlar chati — doimiy guruh va barcha buyurtma muhokamalari. */
  staffChat: "/staff-chat",

  /** Bitta buyurtmani doska/ro'yxatda tafsilot paneli bilan ochadi. */
  orderDetail: (orderId: string) =>
    `/orders?order=${encodeURIComponent(orderId)}`,
  /**
   * Buyurtmani **raqami** bo'yicha ochish — chatdagi `#DA-184011` havolasi.
   * Raqamdan `id` ni mijoz tomonda bilib bo'lmaydi; ro'yxat qidiruvi
   * (`?q=`) bitta natija beradi.
   */
  orderSearch: (orderNumber: string) =>
    `/orders?q=${encodeURIComponent(orderNumber)}`,
  /** Bitta transferni ro'yxatda tafsilot paneli bilan ochadi. */
  transferDetail: (transferId: number, tab: "incoming" | "outgoing") =>
    `/transfers?tab=${tab}&transfer=${transferId}`,
  /** Bosh kuryer bo'limi (rol `chief_courier`, backend K1 §C 2). */
  /** Logistlar — bosh logist ochadi, dopusk beradi (`logist.create`/`logist.grant`). */
  logists: "/logists",
  /** Bosh kuryer sayti — bo'limlar ildizda (alohida sayt, 2026-10-30). */
  chief: "/",
  chiefCouriers: "/couriers",
  chiefZones: "/zones",
  chiefCash: "/cash",
  chiefStats: "/stats",
  /** Sklad — doska (xarita), mahsulotlar, harakatlar, kuryerlar. */
  sklad: "/sklad",
  skladItems: "/sklad/items",
  skladLedger: "/sklad/ledger",
  skladCouriers: "/sklad/couriers",
  /** Bitta kuryerning sklad sahifasi — ro'yxatda yon panel bilan. */
  /** Kuryer sahifasi (dizayn 3a) — to'liq ekran; statik eksport uchun id query'da. */
  skladCourier: (courierId: number) => `/sklad/courier?id=${courierId}`,
  /** Doskada bitta viloyat tanlangan holda. */
  skladRegion: (code: string) => `/sklad?region=${encodeURIComponent(code)}`,
  /** Moliya — umumiy, operatorlar (`?operator=` yon panel), sozlamalar. */
  moliya: "/moliya",
  moliyaOperators: "/moliya/operators",
  /** Operator sahifasi (dizayn 5a) — to'liq ekran; davr filtri `search` bilan birga. */
  moliyaOperator: (operatorId: number, search = "") => `/moliya/operator${search || "?"}${search ? "&" : ""}id=${operatorId}`,
  moliyaSettings: "/moliya/settings",
  /** Analitika — voronka, kunlar, sabablar, manbalar, operatorlar. */
  analitika: "/analitika",
  /** AI tahlil — topilma kartalari (faqat asosiy logist). */
  ai: "/ai",
} as const;
