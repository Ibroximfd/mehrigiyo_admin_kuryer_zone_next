import type { FilialCode } from "@/lib/demo/mock/dataset";

/**
 * Demo bosh kuryer — Vodiy skladi (Farg'ona, Namangan, Andijon). Ism Owner
 * sayti namunasi bilan bir xil. Papka `mock/` — i18n qamrov testi bu yerdagi
 * ism va manzillarni UI matni deb hisoblamaydi (`scripts/i18n-extract-core.mjs`).
 */
export const DEMO_CHIEF = {
  id: 301,
  fullName: "Akmal Tursunov",
  regions: ["fargona", "namangan", "andijon"],
} as const;

export type DemoDistrict = { code: string; region: string; name: string; kind: "city" | "district" | "custom" };

export const DEMO_REGIONS: ReadonlyArray<{ region: string; name: string; districts: DemoDistrict[] }> = [
  {
    region: "fargona",
    name: "Farg'ona viloyati",
    districts: [
      { code: "fargona_sh", region: "fargona", name: "Farg'ona shahri", kind: "city" },
      { code: "qoqon_sh", region: "fargona", name: "Qo'qon shahri", kind: "city" },
      { code: "margilon_sh", region: "fargona", name: "Marg'ilon shahri", kind: "city" },
      { code: "quvasoy_sh", region: "fargona", name: "Quvasoy shahri", kind: "city" },
      { code: "fargona_t", region: "fargona", name: "Farg'ona tumani", kind: "district" },
      { code: "toshloq", region: "fargona", name: "Toshloq tumani", kind: "district" },
      { code: "oltiariq", region: "fargona", name: "Oltiariq tumani", kind: "district" },
      { code: "rishton", region: "fargona", name: "Rishton tumani", kind: "district" },
      { code: "beshariq", region: "fargona", name: "Beshariq tumani", kind: "district" },
      { code: "quva", region: "fargona", name: "Quva tumani", kind: "district" },
    ],
  },
  {
    region: "namangan",
    name: "Namangan viloyati",
    districts: [
      { code: "namangan_sh", region: "namangan", name: "Namangan shahri", kind: "city" },
      { code: "chortoq", region: "namangan", name: "Chortoq tumani", kind: "district" },
      { code: "chust", region: "namangan", name: "Chust tumani", kind: "district" },
      { code: "kosonsoy", region: "namangan", name: "Kosonsoy tumani", kind: "district" },
      { code: "pop", region: "namangan", name: "Pop tumani", kind: "district" },
      { code: "uchqorgon", region: "namangan", name: "Uchqo'rg'on tumani", kind: "district" },
      { code: "toraqorgon", region: "namangan", name: "To'raqo'rg'on tumani", kind: "district" },
    ],
  },
  {
    region: "andijon",
    name: "Andijon viloyati",
    districts: [
      { code: "andijon_sh", region: "andijon", name: "Andijon shahri", kind: "city" },
      { code: "xonobod_sh", region: "andijon", name: "Xonobod shahri", kind: "city" },
      { code: "asaka", region: "andijon", name: "Asaka tumani", kind: "district" },
      { code: "shahrixon", region: "andijon", name: "Shahrixon tumani", kind: "district" },
      { code: "marhamat", region: "andijon", name: "Marhamat tumani", kind: "district" },
      { code: "baliqchi", region: "andijon", name: "Baliqchi tumani", kind: "district" },
      { code: "paxtaobod", region: "andijon", name: "Paxtaobod tumani", kind: "district" },
    ],
  },
];

export const DEMO_ZONES = [
  { id: 1, region: "fargona", name: "Farg'ona markaz", isActive: true, districtCodes: ["fargona_sh", "fargona_t", "margilon_sh", "toshloq"] },
  { id: 2, region: "fargona", name: "Qo'qon", isActive: true, districtCodes: ["qoqon_sh", "beshariq", "rishton"] },
  { id: 3, region: "namangan", name: "Namangan shahar", isActive: true, districtCodes: ["namangan_sh", "chortoq", "uchqorgon", "toraqorgon"] },
  { id: 4, region: "namangan", name: "Chust–Pop", isActive: true, districtCodes: ["chust", "pop"] },
  { id: 5, region: "andijon", name: "Andijon markaz", isActive: true, districtCodes: ["andijon_sh", "asaka", "xonobod_sh", "shahrixon"] },
];

export const DEMO_COURIERS = [
  { id: 501, fullName: "Jasur Qodirov", phone: "998901234501", isActive: true, zoneId: 1, onShift: true },
  { id: 502, fullName: "Sherzod Mamatov", phone: "998901234502", isActive: true, zoneId: 1, onShift: true },
  { id: 503, fullName: "Bekzod Usmonov", phone: "998911234503", isActive: true, zoneId: 2, onShift: true },
  { id: 504, fullName: "Ulug'bek Ergashev", phone: "998931234504", isActive: true, zoneId: 3, onShift: true },
  { id: 505, fullName: "Dilshod Rahimov", phone: "998941234505", isActive: true, zoneId: 5, onShift: false },
  { id: 506, fullName: "Anvar Tojiboyev", phone: "998971234506", isActive: true, zoneId: 4, onShift: true },
  { id: 507, fullName: "Sanjar Nazarov", phone: "998991234507", isActive: true, zoneId: null, onShift: false },
  { id: 508, fullName: "Ravshan Aliqulov", phone: "998901234508", isActive: false, zoneId: null, onShift: false },
] as const;

export const DEMO_CLIENTS = [
  "Gulnoza Yusupova",
  "Mavluda Karimova",
  "Shoxista Ahmedova",
  "Rustam Ismoilov",
  "Nodira Saidova",
  "Oybek Holmatov",
  "Zulfiya Rasulova",
  "Muhabbat Toirova",
  "Abdulla Qosimov",
  "Feruza Jo'rayeva",
  "Hamida Nurmatova",
  "Bahodir Sobirov",
] as const;

export const DEMO_STREETS = [
  "Mustaqillik ko'chasi",
  "Navoiy ko'chasi",
  "Amir Temur ko'chasi",
  "Bog'ishamol ko'chasi",
  "Yangi hayot mahallasi",
  "Istiqlol ko'chasi",
  "Ma'rifat ko'chasi",
] as const;

export const DEMO_NOTES = [
  "Ishdan keyin, 18:00 dan so'ng qo'ng'iroq qiling",
  "Darvoza yonida kutadi",
  "Uyda faqat buvisi bor — qattiq qo'ng'iroq qiling",
] as const;

/**
 * Zakaz rejasi: holat, tuman, filial, kuryer va necha kun oldin.
 * `incoming` — kuryersiz; `active` — kuryerda; `delivered` — yetkazilgan
 * (`settled` — bosh kuryer pulni qabul qilgan, filialga hali topshirilmagan).
 */
export type OrderPlan = {
  kind: "incoming" | "active" | "delivered";
  district: string;
  filial: FilialCode;
  courierId?: number;
  daysAgo?: number;
  settled?: boolean;
};

export const DEMO_ORDER_PLAN: readonly OrderPlan[] = [
  { kind: "incoming", district: "fargona_sh", filial: "Q" },
  { kind: "incoming", district: "margilon_sh", filial: "T1" },
  { kind: "incoming", district: "qoqon_sh", filial: "Q" },
  { kind: "incoming", district: "namangan_sh", filial: "T2" },
  { kind: "incoming", district: "chust", filial: "Q" },
  { kind: "incoming", district: "andijon_sh", filial: "T1" },
  { kind: "incoming", district: "oltiariq", filial: "Q" },
  { kind: "incoming", district: "baliqchi", filial: "T2" },
  { kind: "active", district: "fargona_t", filial: "Q", courierId: 501 },
  { kind: "active", district: "toshloq", filial: "T2", courierId: 501 },
  { kind: "active", district: "fargona_sh", filial: "Q", courierId: 502 },
  { kind: "active", district: "rishton", filial: "T1", courierId: 503 },
  { kind: "active", district: "beshariq", filial: "Q", courierId: 503 },
  { kind: "active", district: "chortoq", filial: "Q", courierId: 504 },
  { kind: "active", district: "asaka", filial: "T2", courierId: 505 },
  { kind: "active", district: "pop", filial: "T1", courierId: 506 },
  { kind: "delivered", district: "fargona_sh", filial: "Q", courierId: 501, daysAgo: 0 },
  { kind: "delivered", district: "margilon_sh", filial: "T1", courierId: 502, daysAgo: 0 },
  { kind: "delivered", district: "qoqon_sh", filial: "Q", courierId: 503, daysAgo: 0 },
  { kind: "delivered", district: "namangan_sh", filial: "T2", courierId: 504, daysAgo: 0 },
  { kind: "delivered", district: "fargona_t", filial: "Q", courierId: 501, daysAgo: 1 },
  { kind: "delivered", district: "rishton", filial: "T1", courierId: 503, daysAgo: 1 },
  { kind: "delivered", district: "andijon_sh", filial: "Q", courierId: 505, daysAgo: 1 },
  { kind: "delivered", district: "uchqorgon", filial: "T2", courierId: 504, daysAgo: 1 },
  { kind: "delivered", district: "fargona_sh", filial: "Q", courierId: 502, daysAgo: 2, settled: true },
  { kind: "delivered", district: "chust", filial: "T1", courierId: 506, daysAgo: 2, settled: true },
  { kind: "delivered", district: "qoqon_sh", filial: "Q", courierId: 503, daysAgo: 3, settled: true },
  { kind: "delivered", district: "asaka", filial: "T1", courierId: 505, daysAgo: 3, settled: true },
];

/** Kecha yetkazgan pulini ilovadan «topshiraman» deb e'lon qilgan kuryerlar. */
export const DEMO_DECLARED_YESTERDAY = [501, 503] as const;
