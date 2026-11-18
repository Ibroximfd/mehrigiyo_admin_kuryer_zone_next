import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { cellText } from "@/features/sales-sheet/display";
import { cellOf, mapIssuePlan, mapSalesSheet } from "@/features/sales-sheet/types";
import type { CellMap, CourierSheet, SalesSheet, SheetFigures } from "@/features/sales-sheet/types";

import { demoRequest } from "./router";
import type { DemoFile } from "./router";

const SHEET = "/operator/chief/report/sales-sheet/";
const get = (path: string, searchParams?: Record<string, string>) => demoRequest({ method: "get", path, searchParams });
const putFee = (json: unknown) => demoRequest({ method: "put", path: `${SHEET}fee/`, json });
const sheet = async (from: string, to = from, extra: Record<string, string> = {}) =>
  mapSalesSheet((await get(SHEET, { date_from: from, date_to: to, ...extra })).data);

/** Katak soni mahsulot birligida: donada yuritiladiganda — `pieces_total` (Kremi: karobka + dona emas). */
const amount = (cells: CellMap, productId: number) => {
  const cell = cellOf(cells, productId);
  return cell.piecesTotal ?? cell.qty;
};

const qty = (figures: SheetFigures, flow: "opening" | "issued" | "given" | "sold" | "gift" | "other" | "closing", productId: number) =>
  amount(figures[flow], productId);

/** Tenglama (§2.2) har mahsulotda yopiladi: `given = opening + issued`, `closing = given − sold − gift + other`. */
function expectBalanced(report: SalesSheet, figures: SheetFigures) {
  for (const product of report.products) {
    const of = (flow: Parameters<typeof qty>[1]) => qty(figures, flow, product.id);
    expect(of("given"), `${product.name}: given`).toBe(of("opening") + of("issued"));
    expect(of("closing"), `${product.name}: closing`).toBe(of("given") - of("sold") - of("gift") + of("other"));
  }
}

const byName = (report: SalesSheet, name: string): CourierSheet => report.couriers.find((row) => row.courier.fullName.startsWith(name))!;

describe("demo: sotuv jadvali (hujjat 83 §2, §7)", () => {
  // «Bugun» qotiriladi — to'ldirilgan kunlar (18–20.11) ham barqaror. Taymerlar haqiqiy: demo kechikishi ishlaydi.
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 20, 10, 0, 0));
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  it("16.11.2026 — egasi jadvali: Bahtiyorning mahsulotlari, puli va topshiradigani", async () => {
    const report = await sheet("2026-11-16");
    const bahtiyor = byName(report, "Bahtiyor");
    // Tea · Rayhon · Elixir · Oregado Box · Yostiq · Qora ko'z (§7 jadvali).
    const ids = [6, 7, 8, 9, 10, 23];
    expect(ids.map((id) => qty(bahtiyor, "given", id))).toEqual([4, 100, 7, 1, 1, 10]);
    expect(ids.map((id) => qty(bahtiyor, "sold", id))).toEqual([1, 57, 3, 1, 0, 6]);
    expect(ids.map((id) => qty(bahtiyor, "gift", id))).toEqual([0, 20, 2, 0, 0, 0]);
    expect(ids.map((id) => qty(bahtiyor, "closing", id))).toEqual([3, 23, 2, 0, 1, 4]);
    expect(bahtiyor).toMatchObject({ cashAmount: 12_060_000, onlineAmount: 5_010_000, addresses: 22, refusedAddresses: 1, handoverDue: 10_565_000 });
    expect(bahtiyor.fee?.amount).toBe(1_495_000);
    expect(bahtiyor.salesAmount).toBe(bahtiyor.cashAmount + bahtiyor.onlineAmount);
    // Bitta kun — kunma-kun qatorlar yo'q (§2.9).
    expect(bahtiyor.days).toEqual([]);
  });

  it("uch kuryer jami — §7 dagi raqamlar", async () => {
    const report = await sheet("2026-11-16");
    expect(report.couriers).toHaveLength(3);
    expect(report.totals).toMatchObject({ cashAmount: 31_080_000, onlineAmount: 11_680_000, addresses: 57, refusedAddresses: 1, handoverDue: 27_310_000 });
    expect(report.totals.fee?.amount).toBe(3_770_000);
    expect(report.checks).toEqual([]);
  });

  it("nol katak va hamma joyda nol mahsulot yuborilmaydi (§2.1)", async () => {
    const raw = (await get(SHEET, { date_from: "2026-11-16", date_to: "2026-11-16" })).data as {
      products: Array<{ name_uz: string }>;
      couriers: Array<{ gift: Record<string, unknown> }>;
    };
    expect(raw.products.map((product) => product.name_uz)).toEqual(["Tea (ipak choy)", "Rayhon", "Elixir", "Oregado Box", "Yostiq", "One shot", "Qora ko'z", "Doctor Ali Kremi"]);
    // Bahtiyor: sovg'a faqat Rayhon va Elixir.
    expect(Object.keys(raw.couriers[0]!.gift)).toEqual(["7", "8"]);
  });

  it("faqat dona (hujjat 84): Kremi 31 dona berildi — katak «31», «10 kar. 1 dona» emas", async () => {
    const report = await sheet("2026-11-16");
    const kremi = report.products.find((product) => product.id === 34)!;
    expect(kremi).toMatchObject({ unitLabel: "karobka", countsInDona: true, piecesPerBox: 3 });
    const bahtiyor = byName(report, "Bahtiyor");
    expect(cellOf(bahtiyor.issued, 34)).toEqual({ qty: 10, pieces: 1, piecesTotal: 31 });
    expect(cellText(cellOf(bahtiyor.issued, 34), kremi)).toBe("31");
    expect(cellText(cellOf(bahtiyor.given, 34), kremi)).toBe("38");
    expect(cellText(cellOf(report.totals.issued, 34), kremi)).toBe("46");
  });

  it("tenglama har kuryer, har mahsulot va jamida yopiladi — belgilangan va to'ldirilgan kunlarda", async () => {
    for (const day of ["2026-11-16", "2026-11-17", "2026-11-19"]) {
      const report = await sheet(day);
      expect(report.couriers.length, day).toBe(3);
      for (const courier of report.couriers) expectBalanced(report, courier);
      expectBalanced(report, report.totals);
    }
  });

  it("zanjir: 17.11 `opening` = 16.11 `closing`; qaytarish kuni `other` noldan farqli", async () => {
    const monday = await sheet("2026-11-16");
    const tuesday = await sheet("2026-11-17");
    for (const courier of monday.couriers) {
      const next = tuesday.couriers.find((row) => row.courier.id === courier.courier.id)!;
      expect(next.opening).toEqual(courier.closing);
    }
    const muhammadqul = byName(tuesday, "Muhammadqul");
    expect(qty(muhammadqul, "other", 8)).toBe(-3);
    expect(qty(muhammadqul, "other", 23)).toBe(-2);
    expect(byName(tuesday, "Bahtiyor").other).toEqual({});
  });

  it("oraliq (16–17.11) = kunlar yig'indisi: opening — 16.11 boshi, closing — 17.11 oxiri", async () => {
    const [monday, tuesday, range] = [await sheet("2026-11-16"), await sheet("2026-11-17"), await sheet("2026-11-16", "2026-11-17", { days: "1" })];
    for (const courier of range.couriers) {
      const [first, second] = [monday, tuesday].map((day) => day.couriers.find((row) => row.courier.id === courier.courier.id)!);
      expect(courier.opening).toEqual(first!.opening);
      expect(courier.closing).toEqual(second!.closing);
      for (const product of range.products) {
        for (const flow of ["issued", "sold", "gift", "other"] as const) {
          expect(qty(courier, flow, product.id)).toBe(qty(first!, flow, product.id) + qty(second!, flow, product.id));
        }
      }
      expect(courier.cashAmount).toBe(first!.cashAmount + second!.cashAmount);
      expect(courier.onlineAmount).toBe(first!.onlineAmount + second!.onlineAmount);
      expect(courier.addresses).toBe(first!.addresses + second!.addresses);
      expect(courier.fee?.amount ?? 0).toBe((first!.fee?.amount ?? 0) + (second!.fee?.amount ?? 0));
      expectBalanced(range, courier);
      // `days=1` — har kun alohida, o'sha kunning javobi bilan bir xil.
      expect(courier.days.map((day) => day.date)).toEqual(["2026-11-16", "2026-11-17"]);
      expect(courier.days[1]).toMatchObject({ cashAmount: second!.cashAmount, closing: second!.closing });
    }
    expect(range.totals.cashAmount).toBe(monday.totals.cashAmount + tuesday.totals.cashAmount);
    expectBalanced(range, range.totals);
  });

  it("tarix boshlanishidan oldin va kelajakda — kuryer yo'q (bo'sh holat)", async () => {
    expect((await sheet("2026-11-10", "2026-11-15")).couriers).toEqual([]);
    expect((await sheet("2026-11-21")).couriers).toEqual([]);
    // Oraliq kelajakka o'tsa — bugungacha.
    expect((await sheet("2026-11-19", "2026-11-25", { days: "1" })).couriers[0]!.days.map((day) => day.date)).toEqual(["2026-11-19", "2026-11-20"]);
  });

  it("`courier_id` — faqat o'sha kuryer", async () => {
    const report = await sheet("2026-11-16", "2026-11-16", { courier_id: "32" });
    expect(report.couriers.map((row) => row.courier.id)).toEqual([32]);
    expect(report.totals.cashAmount).toBe(13_170_000);
  });
});

describe("demo: kuryer xizmati — `PUT …/fee/` (§3)", () => {
  it("upsert `handover_due` ni o'zgartiradi, jadval ham yangi summani beradi; `0`/`null` — o'chiradi", async () => {
    const before = byName(await sheet("2026-11-17"), "Xayrullo");
    expect(before.fee).toBeNull();
    expect(before.handoverDue).toBe(before.cashAmount);

    const saved = await putFee({ courier_id: 32, date: "2026-11-17", amount: 1_430_000, note: "22 manzil × 65 000" });
    expect(saved).toMatchObject({ status: 200, data: { fee: { amount: 1_430_000, note: "22 manzil × 65 000" }, handover_due: before.cashAmount - 1_430_000 } });

    const after = await sheet("2026-11-17");
    expect(byName(after, "Xayrullo")).toMatchObject({ fee: { amount: 1_430_000 }, handoverDue: before.cashAmount - 1_430_000 });
    expect(after.totals.fee?.amount).toBe(1_430_000);
    expect(after.totals.handoverDue).toBe(after.totals.cashAmount - 1_430_000);

    // Qayta yozish — o'sha yozuv yangilanadi (ikkinchi yozuv qo'shilmaydi).
    await putFee({ courier_id: 32, date: "2026-11-17", amount: 1_000_000 });
    expect((await sheet("2026-11-17")).totals.fee?.amount).toBe(1_000_000);

    const cleared = await putFee({ courier_id: 32, date: "2026-11-17", amount: null });
    expect(cleared.data).toMatchObject({ fee: null, handover_due: before.cashAmount });
    expect(byName(await sheet("2026-11-17"), "Xayrullo").fee).toBeNull();
  });

  it("xatolar: begona kuryer — `404 courier_not_found`, noto'g'ri summa — `400 fields.amount`", async () => {
    expect(await putFee({ courier_id: 999, date: "2026-11-16", amount: 1000 })).toMatchObject({ status: 404, data: { code: "courier_not_found" } });
    const invalid = await putFee({ courier_id: 31, date: "2026-11-16", amount: -5 });
    expect(invalid).toMatchObject({ status: 400, data: { code: "validation_error" } });
    expect((invalid.data as { fields: Record<string, string[]> }).fields.amount).toHaveLength(1);
    expect(await putFee({ courier_id: 31, date: "16.11.2026", amount: 1000 })).toMatchObject({ status: 400, data: { fields: { date: expect.any(Array) } } });
    // Xato yozuvni buzmaydi.
    expect(byName(await sheet("2026-11-16"), "Bahtiyor").fee?.amount).toBe(1_495_000);
  });
});

describe("demo: berish rejasi (§4) va eksport (§5)", () => {
  it("reja: `to_issue = max(required − on_hand, 0)`, ortiqcha, ombor va yetmaydigani", async () => {
    const plan = mapIssuePlan((await get("/operator/chief/report/issue-plan/", { date: "2026-11-17" })).data);
    expect(plan.date).toBe("2026-11-17");
    expect(plan.couriers.map((row) => [row.carriedOrders, row.newOrders])).toEqual([[9, 21], [6, 24], [11, 9]]);
    for (const row of plan.couriers) {
      for (const product of plan.products) {
        const [onHand, required] = [amount(row.onHand, product.id), amount(row.required, product.id)];
        expect(amount(row.toIssue, product.id)).toBe(Math.max(required - onHand, 0));
        expect(amount(row.surplus, product.id)).toBe(Math.max(onHand - required, 0));
      }
    }
    // Rayhon: 122 ta berish kerak, omborda 90 ta — 32 ta yetmaydi (maketdagi ogohlantirish).
    expect(cellOf(plan.store.toIssue, 7).qty).toBe(122);
    expect(cellOf(plan.store.onHand, 7).qty).toBe(90);
    // Kremi (donada, 1 kar. = 3 dona): 12 dona berish kerak, omborda 10 — 2 dona yetmaydi.
    expect(plan.store.shortage).toEqual({ "7": { qty: 32, pieces: 0, piecesTotal: 32 }, "34": { qty: 0, pieces: 2, piecesTotal: 2 } });
    // Hamma joyda nol mahsulot (Vanna uchun, Chufa yog'i) ustun bo'lmaydi.
    expect(plan.products).toHaveLength(8);
  });

  it("eksport — fayl javobi: nom davr bo'yicha, ichida kuryer qatorlari va JAMI", async () => {
    const file = (await get(`${SHEET}export/`, { date_from: "2026-11-16", date_to: "2026-11-16" })).data as DemoFile;
    expect(file.fileName).toBe("sotuv_2026-11-16.csv");
    const lines = file.content.split("\n");
    // Sarlavha + (3 kuryer + JAMI) × 4 qator.
    expect(lines).toHaveLength(1 + 4 * 4);
    // Kremi ustuni — bitta son donada, sarlavhada «(dona)» (hujjat 84 §2.5).
    expect(lines[0]).toContain(";Doctor Ali Kremi (dona);");
    expect(lines[1]).toBe("Bahtiyor aka;Berilgan;4;100;7;1;1;0;0;10;0;38;12060000;5010000;22;1;1495000;10565000");
    expect(lines.at(-4)).toContain("JAMI;Berilgan;15;250;15;1;1;1;0;38;0;59;31080000;11680000;57;1;3770000;27310000");
    const range = (await get(`${SHEET}export/`, { date_from: "2026-11-16", date_to: "2026-11-17" })).data as DemoFile;
    expect(range.fileName).toBe("sotuv_2026-11-16_2026-11-17.csv");
  });
});
