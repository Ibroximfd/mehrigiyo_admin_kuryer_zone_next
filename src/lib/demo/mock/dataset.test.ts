import { describe, expect, it } from "vitest";

import { UZ_MAP_REGIONS, UZ_REGION_CODES } from "@/lib/uz-map";

import { DEMO_FILIALS, DEMO_PRODUCTS, DEMO_SKLADS, demoSeed, demoSkladFor } from "./dataset";

describe("v2 demo to'plami (`21_TUZILMA_V2` §0, §5)", () => {
  it("har viloyat aynan bitta skladda — skladlar soni bosh kuryerlar soniga teng", () => {
    const covered = DEMO_SKLADS.flatMap((sklad) => sklad.regions);
    expect([...covered].sort()).toEqual([...UZ_REGION_CODES].sort());
    expect(new Set(covered).size).toBe(covered.length);
  });

  it("xarita yo'llari hamma viloyat kodini qamraydi", () => {
    expect(UZ_MAP_REGIONS.map((region) => region.code).sort()).toEqual([...UZ_REGION_CODES].sort());
  });

  it("mahsulot dopuski kesishmaydi: har mahsulot bitta mavjud filialniki", () => {
    const codes = new Set(DEMO_FILIALS.map((filial) => filial.code));
    expect(DEMO_PRODUCTS.every((product) => codes.has(product.filial))).toBe(true);
    expect(new Set(DEMO_PRODUCTS.map((product) => product.id)).size).toBe(DEMO_PRODUCTS.length);
    expect(DEMO_FILIALS.filter((filial) => filial.isMain)).toHaveLength(1);
  });

  it("bosh kuryer skladi — viloyatlari eng ko'p kesishgani", () => {
    expect(demoSkladFor(["andijon", "namangan"]).id).toBe("vodiy");
    expect(demoSkladFor(["toshkent"]).id).toBe("toshkent");
    expect(demoSkladFor([]).id).toBe(DEMO_SKLADS[0]!.id);
  });

  it("barqaror son: bir xil kirish — bir xil natija, [0, 1] oralig'ida", () => {
    expect(demoSeed("vodiy", 101)).toBe(demoSeed("vodiy", 101));
    expect(demoSeed("vodiy", 101)).not.toBe(demoSeed("vodiy", 102));
    expect(demoSeed("x")).toBeGreaterThanOrEqual(0);
    expect(demoSeed("x")).toBeLessThanOrEqual(1);
  });
});
