/**
 * TanStack Query kalitlari bitta joyda.
 *
 * Kalit — bu kesh manzili. Filtrlar kalit ichida bo'lgani uchun har bir
 * kombinatsiya alohida keshlanadi va "eskirgan javob" muammosi o'z-o'zidan
 * yo'qoladi.
 *
 * Har bir bo'lim o'z ildiz kalitiga ega — `invalidateQueries({queryKey: ...})`
 * bilan butun bo'limni bir zarbada yangilash mumkin.
 */
export const queryKeys = {
  /** Logistlar (tuzilma daraxtidan) va dopusklarim — `structure` ildizi. */
  logistStructure: ["structure", "tree"] as const,
  myPermissions: ["structure", "me", "permissions"] as const,
  permissionCatalog: ["structure", "permission-catalog"] as const,
  orders: (filters: Record<string, unknown>) => ["orders", filters] as const,
  /**
   * Buyurtmalar doskasi — butun doska bitta kalitda.
   *
   * Ikkinchi bo'g'in `"board"`: real vaqt hodisalari doskani joyida
   * to'g'rilaydi, ro'yxatlarni esa eskirgan deb belgilaydi — shu bo'g'in
   * bo'yicha ajratiladi.
   */
  ordersBoard: (filters: Record<string, unknown>) =>
    ["orders", "board", "logist", filters] as const,
  orderDetail: (id: string) => ["orders", "detail", id] as const,
  orderComments: (id: string) => ["orders", "comments", id] as const,
  orderTimeline: (id: string) => ["orders", "timeline", id] as const,
  /** Buyurtma bo'yicha kuryer bilan chat. */
  orderCourierMessages: (id: string) =>
    ["orders", "courier-messages", id] as const,
  orderPreview: (items: string) => ["orders", "preview", items] as const,

  couriers: ["couriers"] as const,
  /** Filtrli kuryerlar ro'yxati (zona, viloyat, smena). */
  couriersList: (filters: Record<string, unknown>) =>
    ["couriers", "list", filters] as const,
  /** Jonli xarita ildizi — WS `courier_location` hamma filtrdagi nusxani yamaydi. */
  couriersLive: ["couriers", "live"] as const,
  /** Jonli xarita: hudud filtri + `all` (`LiveParams`). */
  couriersLiveQuery: (params: Record<string, string | null>) =>
    ["couriers", "live", params] as const,
  /** Kuryerning kun izi (ISO oraliq). */
  courierTrack: (id: number, from: string, to: string) =>
    ["couriers", "track", id, from, to] as const,
  /**
   * Buyurtma uchun kuryer nomzodlari. Ildiz `orders`: biriktirish va status
   * hodisalarida ro'yxatlar bilan birga eskiradi (yuklama o'zgaradi).
   */
  courierCandidates: (orderId: string) =>
    ["orders", "candidates", orderId] as const,
  /** Filiallararo naqd hisobot. */
  interfilialReport: (from: string, to: string) =>
    ["couriers", "interfilial", from, to] as const,

  /** Viloyat + tumanlar lug'ati — 1 soat yangi. */
  metaRegions: ["meta", "regions"] as const,
  /** Zonalar (`zone_updated` hodisasida butun ildiz yangilanadi). */
  zones: (region: string | null) => ["zones", region ?? "all"] as const,
  regionSettings: (region: string) => ["zones", "settings", region] as const,
  /** Filial operatorlari — komissiya egasini tanlash. */
  branchOperators: ["operators", "branch"] as const,
  /** Haftalik naqd yig'im oralig'i. */
  courierCodRange: (id: number, from: string, to: string) =>
    ["couriers", "cod", id, from, to] as const,
  /** Kuryerlarning naqd topshirish e'lonlari (filial bo'yicha). */
  codHandovers: ["couriers", "handovers"] as const,
  /** Shubhali yetkazishlar (kun bo'yicha). */
  anomalies: (date: string) => ["couriers", "anomalies", date] as const,

  transfers: (filters: Record<string, unknown>) =>
    ["transfers", filters] as const,
  transferDetail: (id: number) => ["transfers", "detail", id] as const,
  filials: ["filials"] as const,

  /** Do'kon katalogi — transfer zakazidagi mahsulot qidiruvi. */
  products: (query: string) => ["products", query] as const,

  /**
   * Eshikdagi o'zgarish so'rovlari. Ildiz `orders`: status/tahrir
   * hodisalarida buyurtma bilan birga eskiradi.
   */
  orderChangeRequests: (id: string) =>
    ["orders", "change-requests", id] as const,

  /** To'xtashlar (`date`, `status`) va takliflar — bitta ildiz. */
  stops: (params: { date: string; status: string }) =>
    ["stops", "list", params] as const,
  stopSuggestions: (date: string) => ["stops", "suggestions", date] as const,
  payRate: ["stops", "pay-rate"] as const,

  /**
   * Bitrix oqimi doskalari. Ildiz `pipeline` — buyurtma doskasidan alohida:
   * real vaqt kartani joyida yamaydi, butun doska qayta so'ralmaydi.
   */
  deliveryBoard: (filters: Record<string, unknown>) =>
    ["pipeline", "delivery", filters] as const,
  baseBoard: (filters: Record<string, unknown>) =>
    ["pipeline", "base", filters] as const,
  leadDetail: (id: number) => ["pipeline", "lead", id] as const,

  statistics: (params: Record<string, unknown>) =>
    ["statistics", params] as const,

  /** Filial harakatlar jurnali (§4.11) — panel ochilganda so'raladi. */
  activity: ["activity"] as const,

  /**
   * Kiruvchi buyurtma o'tkazmalari (A-oqim, §4.8).
   *
   * Ildiz ataylab `orders` EMAS: bu ro'yxat hali bizniki bo'lmagan
   * buyurtmalar haqida va faqat transfer hodisalarida o'zgaradi — har bir
   * status o'zgarishida qayta so'ralishi ortiqcha bo'lardi.
   */
  incomingOrderTransfers: ["order-transfers", "incoming"] as const,

  /*
   * Xodimlar chati (`LOGIST_CHAT_FLUTTER.md`). Kanallar ro'yxati, bitta
   * kanal, uning xabarlari va umumiy badge — bitta ildiz ostida, ya'ni
   * qayta ulanishda bir zarbada yangilanadi.
   *
   * Doskadagi belgilar `unread-by-order/` dan (2026-10-01 C §13.1) —
   * kanallar ro'yxati `limit` bilan cheklangan va belgi uchun yaramaydi.
   */
  staffChannels: (filters: { kind?: string | null; unread?: boolean; q?: string }) =>
    ["staff-chat", "channels", filters] as const,
  /** Zakaz chati ishtirokchilari va zakaz bo'yicha qidiruv (§D). */
  staffChatMembers: (channelId: number) => ["staff-chat", "members", channelId] as const,
  staffOrderSearch: (q: string) => ["staff-chat", "order-search", q] as const,
  staffChatCandidates: (channelId: number, q: string) => ["staff-chat", "candidates", channelId, q] as const,
  staffUnreadByOrder: ["staff-chat", "unread-by-order"] as const,
  staffGroupChannel: ["staff-chat", "channel", "group"] as const,
  /** `["staff-chat", "channel", …]` ostida — real vaqt uni ham yangilaydi. */
  staffTeamChannel: ["staff-chat", "channel", "team"] as const,
  staffTeamMembers: ["staff-chat", "team-members"] as const,
  staffOrderChannel: (orderId: string) =>
    ["staff-chat", "channel", "order", orderId] as const,
  staffMessages: (channelId: number) =>
    ["staff-chat", "messages", channelId] as const,
  staffUnread: ["staff-chat", "unread"] as const,
  // ── Sklad ────────────────────────────────────────────────────────────────
  /** Ildiz — `stock_changed` burst'ida butun bo'lim bir zarbada yangilanadi. */
  sklad: ["sklad"] as const,
  skladMe: ["sklad", "me"] as const,
  skladOverview: ["sklad", "overview"] as const,
  skladRegion: (code: string) => ["sklad", "region", code] as const,
  skladItems: (filters: Record<string, unknown>) => ["sklad", "items", filters] as const,
  skladLocations: ["sklad", "locations"] as const,
  skladFilials: ["sklad", "filials"] as const,
  skladStock: (filters: Record<string, unknown>) => ["sklad", "stock", filters] as const,
  skladLedger: (filters: Record<string, unknown>) => ["sklad", "ledger", filters] as const,
  skladLedgerSummary: (filters: Record<string, unknown>) =>
    ["sklad", "ledger-summary", filters] as const,
  skladCouriers: (region: string | null) => ["sklad", "couriers", region ?? "all"] as const,
  skladCourier: (id: number) => ["sklad", "courier", id] as const,
  skladGrants: (itemId: number | null) => ["sklad", "grants", itemId ?? "all"] as const,

  // ── Moliya ───────────────────────────────────────────────────────────────
  moliya: ["moliya"] as const,
  moliyaSettings: ["moliya", "settings"] as const,
  moliyaSummary: (filters: Record<string, unknown>) => ["moliya", "summary", filters] as const,
  moliyaProducts: (filters: Record<string, unknown>) => ["moliya", "products", filters] as const,
  moliyaGifts: (filters: Record<string, unknown>) => ["moliya", "gifts", filters] as const,
  moliyaPoints: (filters: Record<string, unknown>) => ["moliya", "points", filters] as const,
  moliyaOperators: (filters: Record<string, unknown>) => ["moliya", "operators", filters] as const,
  moliyaOperator: (id: number, filters: Record<string, unknown>) => ["moliya", "operator", id, filters] as const,

  /** Analitika voronkasi — filial + sana. */
  analitika: (filters: Record<string, unknown>) => ["analitika", "funnel", filters] as const,

  /** AI topilmalari — qayta tahlildan keyin butun ildiz eskiradi. */
  ai: ["ai"] as const,
  aiFindings: (filters: Record<string, unknown>) => ["ai", "findings", filters] as const,

  // ── Bosh kuryer ──────────────────────────────────────────────────────────
  chief: ["chief"] as const,
  chiefMe: ["chief", "me"] as const,
  chiefOrders: (filters: Record<string, unknown>) => ["chief", "orders", filters] as const,
  chiefCandidates: (orderId: string) => ["chief", "candidates", orderId] as const,
  chiefCouriers: ["chief", "couriers"] as const,
  chiefZones: ["chief", "zones"] as const,
  chiefCash: (filters: Record<string, unknown>) => ["chief", "cash", filters] as const,
  chiefStats: (filters: Record<string, unknown>) => ["chief", "stats", filters] as const,
  /** Logist tomoni: tanlov va bosh kuryerdan topshiriqlar. */
  chiefOptions: (region: string | null) => ["chiefs", "options", region ?? "all"] as const,
  chiefHandovers: (filters: Record<string, unknown>) => ["chiefs", "handovers", filters] as const,
};
