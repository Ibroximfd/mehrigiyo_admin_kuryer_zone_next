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
  /** Viloyat + tumanlar lug'ati — 1 soat yangi. */
  metaRegions: ["meta", "regions"] as const,

  // ── Bosh kuryer ──────────────────────────────────────────────────────────
  chief: ["chief"] as const,
  chiefMe: ["chief", "me"] as const,
  /** Hamma zakaz ro'yxatlari (har filtr) — `chiefOrders` ning ildizi. */
  chiefOrderLists: ["chief", "orders"] as const,
  chiefOrders: (filters: Record<string, unknown>) => ["chief", "orders", filters] as const,
  /** Mahsulot/summa/tartib filtri — ro'yxat to'liq (shu ham `chiefOrderLists` ostida). */
  /** Mahsulotlar katalogi (filtr) — kam o'zgaradi. */
  productOptions: ["catalog", "products"] as const,
  chiefOrderDetail: (orderId: string) => ["chief", "order", orderId] as const,
  /** Avto-taqsimlash rejasi — har ochilishda yangidan. */
  chiefAutoAssignPreview: (filters: Record<string, unknown>) => ["chief", "auto-assign-preview", filters] as const,
  chiefFilials: ["chief", "filials"] as const,
  /** Kuryerning qabul qilinmagan HAMMA kunlari (`cod/?open=1`). */
  chiefCourierOpenCod: (courierId: number) => ["chief", "courier-cod", courierId, "open"] as const,
  /** Kuryerning naqd hisobi (oraliq). */
  chiefCourierCod: (courierId: number, range: { from: string; to: string }) => ["chief", "courier-cod", courierId, range] as const,
  /** Kassa 1-pog'ona: kuryerlar e'lonlari (server filtri — holat, kuryer). */
  chiefCourierHandovers: (filters: Record<string, unknown>) => ["chief", "cod-handovers", filters] as const,
  chiefCandidates: (orderId: string) => ["chief", "candidates", orderId] as const,
  chiefCouriers: ["chief", "couriers"] as const,
  /** Kuryer login/paroli — keshda saqlanmaydi (`gcTime: 0`). */
  chiefCourierCredentials: (courierId: number) => ["chief", "courier-credentials", courierId] as const,
  /** O'z login/paroli. */
  myCredentials: ["me", "credentials"] as const,
  chiefZones: ["chief", "zones"] as const,
  /** Zona/tuman zakaz sonlari — sana oralig'i bo'yicha. */
  chiefZoneStats: (from: string, to: string) => ["chief", "zone-stats", from, to] as const,
  /** Sklad: o'z skladi va kuryerlari ombori (`sklad_changed` da butunlay tashlanadi). */
  chiefSklad: ["chief", "sklad"] as const,
  chiefLoadRequests: (status: string) => ["chief", "sklad", "load-requests", status] as const,
  /** Kuryer baholari — filtr va sahifa bo'yicha (kuryerlar sahifasi filtrsiz 1-sahifani bo'lishadi). */
  chiefRatings: (filters: Record<string, unknown>) => ["chief", "ratings", filters] as const,
  /** Kassa 2-pog'ona — `chief/cash/` (filial kesimi va topshiriqlar). Sukut davr — topshirish shu bilan. */
  chiefCash: ["chief", "cash"] as const,
  /** Kassa tarixi tanlangan davrda (faqat ko'rish). */
  chiefCashPeriod: (range: { from: string; to: string }) => ["chief", "cash", "period", range] as const,
  /** Hamma kuryerdagi qabul qilinmagan pul (filtrsiz). */
  chiefCourierDebts: (courierIds: readonly number[]) => ["chief", "courier-debts", courierIds] as const,
  /** Moliya va hisobot (davr bo'yicha). */
  chiefReport: (range: { from: string; to: string }) => ["chief", "report", range] as const,
};
