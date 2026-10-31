import type { UzRegionCode } from "@/lib/uz-map";

/**
 * Demo rejim (`APP_DEMO=1`) namuna to'plami — Tuzilma v2 (`21_TUZILMA_V2…`
 * §0, §5, §6). Owner sayti ham xuddi shu qiymatlarni ishlatadi — ikki sayt
 * bir xil rasmni ko'rsatsin. Haqiqiy rejim bu fayldan hech narsa o'qimaydi:
 * filial, sklad, narx backenddan keladi.
 */

export type FilialCode = "Q" | "T1" | "T2";

export type DemoFilial = {
  /** Backenddagi filial id si (Owner namunasi: Q = 1, T1 = 2, T2 = 3). */
  id: number;
  code: FilialCode;
  name: string;
  /** Asosiy filial — bosh kuryerlar va manzil narxini shu filial B.L i belgilaydi. */
  isMain: boolean;
};

export const DEMO_FILIALS: readonly DemoFilial[] = [
  { id: 1, code: "Q", name: "Qo'qon", isMain: true },
  { id: 2, code: "T1", name: "Toshkent 1", isMain: false },
  { id: 3, code: "T2", name: "Toshkent 2", isMain: false },
];

/** Bitta bosh kuryer = bitta sklad (§5). Tartib — xaritadagi rang tartibi. */
export type DemoSklad = {
  id: string;
  name: string;
  /** Bosh kuryer o'rni (Owner namunasi: 301 — Akmal Tursunov). */
  chiefId: number;
  regions: readonly UzRegionCode[];
};

export const DEMO_SKLADS: readonly DemoSklad[] = [
  {
    id: "vodiy",
    chiefId: 301,
    name: "Vodiy",
    regions: ["fargona", "namangan", "andijon"],
  },
  {
    id: "toshkent",
    chiefId: 302,
    name: "Toshkent",
    regions: ["toshkent_shahar", "toshkent"],
  },
  {
    id: "markaz",
    chiefId: 303,
    name: "Markaz",
    regions: ["samarqand", "jizzax", "sirdaryo"],
  },
  {
    id: "janub",
    chiefId: 304,
    name: "Janub",
    regions: ["qashqadaryo", "surxondaryo"],
  },
  {
    id: "garb",
    chiefId: 305,
    name: "G'arb",
    regions: ["buxoro", "navoiy", "xorazm", "qoraqalpogiston"],
  },
];

/** Bir manzil narxi — hamma filial uchun bitta (§6), asosiy filial B.L i belgilaydi. */
export const DEMO_ADDRESS_RATE = 25_000;

/**
 * Mahsulot dopuski filial bo'yicha, kesishmaydi (§5.1): har mahsulot bitta filialniki.
 * Id va nomlar Owner sayti namunasi bilan bir xil (11–17).
 */
export type DemoProduct = { id: number; name: string; price: number; filial: FilialCode };

export const DEMO_PRODUCTS: readonly DemoProduct[] = [
  { id: 11, name: "Gepatofit", price: 420_000, filial: "Q" },
  { id: 12, name: "Kardiomed", price: 460_000, filial: "Q" },
  { id: 13, name: "Artroflex", price: 390_000, filial: "Q" },
  { id: 14, name: "Gastrofit", price: 380_000, filial: "Q" },
  { id: 15, name: "Immunoxit", price: 450_000, filial: "T1" },
  { id: 16, name: "Diabefit", price: 520_000, filial: "T2" },
  { id: 17, name: "Neyrovit", price: 410_000, filial: "T2" },
];

/**
 * Bosh kuryerning skladi — uning viloyatlari bilan eng ko'p kesishgan sklad.
 * Test akkauntining viloyatlari demo bilan mos kelmasa — birinchi sklad
 * (demo sahifa bo'sh qolmasin).
 */
export function demoSkladFor(regions: readonly string[]): DemoSklad {
  let best = DEMO_SKLADS[0]!;
  let bestOverlap = 0;
  for (const sklad of DEMO_SKLADS) {
    const overlap = sklad.regions.filter((code) =>
      regions.includes(code),
    ).length;
    if (overlap > bestOverlap) {
      best = sklad;
      bestOverlap = overlap;
    }
  }
  return best;
}

/** Barqaror «tasodifiy» son — bir xil kirish, bir xil demo raqam. */
export function demoSeed(...parts: Array<string | number>): number {
  let hash = 2166136261;
  for (const char of parts.join("|")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

/** Tarmoq kechikishi — demo ham haqiqiy so'rovdek skelet ko'rsatsin; bekor qilinsa to'xtaydi. */
export function demoDelay(signal?: AbortSignal, ms = 280): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}
