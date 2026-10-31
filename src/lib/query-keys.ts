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
  chiefOrderDetail: (orderId: string) => ["chief", "order", orderId] as const,
  /** Avto-taqsimlash rejasi — har ochilishda yangidan. */
  chiefAutoAssignPreview: ["chief", "auto-assign-preview"] as const,
  chiefFilials: ["chief", "filials"] as const,
  /** Kuryerning naqd hisobi (oraliq). */
  chiefCourierCod: (courierId: number, range: { from: string; to: string }) => ["chief", "courier-cod", courierId, range] as const,
  /** Kassa 1-pog'ona: kuryerlar e'lonlari (server filtri — holat, kuryer). */
  chiefCourierHandovers: (filters: Record<string, unknown>) => ["chief", "cod-handovers", filters] as const,
  chiefCandidates: (orderId: string) => ["chief", "candidates", orderId] as const,
  chiefCouriers: ["chief", "couriers"] as const,
  chiefZones: ["chief", "zones"] as const,
  /** Sklad: o'z skladi va kuryerlari ombori. */
  chiefSklad: (regions: readonly string[]) => ["chief", "sklad", [...regions].sort().join(",")] as const,
  /** Kassa 2-pog'ona — `chief/cash/` (filial kesimi va topshiriqlar). */
  chiefCash: ["chief", "cash"] as const,
  /** Moliya va hisobot (davr bo'yicha). */
  chiefReport: (range: { from: string; to: string }) => ["chief", "report", range] as const,
};
