import { cellOf, hasCells } from "./types";
import type { CellMap, CourierRef, CourierSheet, IssuePlan, PlanCourier, QtyCell, SalesSheet, SheetFigures, SheetProduct } from "./types";

/**
 * Bugungi berish (hujjat 83 §4; egasi, 2026-11-20: «Berish rejasi» tabi Sotuv
 * jadvaliga qo'shildi) — har kuryer blokida «Berish kerak» qatori. Hisob serverda (`to_issue`, `issue_lines`), bu
 * yerda faqat qaysi kuryerga qaysi qator tegishli ekani hal qilinadi.
 */

export function issueOf(plan: IssuePlan | null, courierId: number): PlanCourier | null {
  return plan?.couriers.find((row) => row.courier.id === courierId) ?? null;
}

/**
 * Bugun harakati yo'q (jadval ularni bermaydi, §2.12), lekin zakazi yoki
 * berilishi kerak moli bor kuryerlar. Ular ham jadvalda chiqadi — aks holda
 * bo'sh qo'l kuryerga mol berib bo'lmasdi.
 */
export function planOnlyCouriers(plan: IssuePlan | null, sheet: SalesSheet): PlanCourier[] {
  if (!plan) return [];
  const shown = new Set(sheet.couriers.map((row) => row.courier.id));
  return plan.couriers.filter((row) => !shown.has(row.courier.id) && (hasCells(row.toIssue) || row.carriedOrders + row.newOrders > 0));
}

/**
 * Bugun jadvalda harakati yo'q hamma o'z kuryeri (hujjat 104, toza boshlash
 * 21.11): ertalab hamma qoldiq 0 — bosh kuryer har kuryer qo'lidagi molni
 * sanab «Tuzatish» bilan kiritadi, shuning uchun harakatsiz kuryer ham
 * jadvalda bo'lishi shart. Avval rejadagilar (zakazi bor), keyin skladdagi
 * qolgan kuryerlar — nom bo'yicha. Bir kuryer ikki marta chiqmaydi.
 */
export function idleCouriers(plan: IssuePlan | null, sheet: SalesSheet, own: readonly CourierRef[]): CourierRef[] {
  const shown = new Set(sheet.couriers.map((row) => row.courier.id));
  const fromPlan = planOnlyCouriers(plan, sheet).map((row) => row.courier);
  const listed = new Set(fromPlan.map((courier) => courier.id));
  const rest = own
    .filter((courier) => !shown.has(courier.id) && !listed.has(courier.id))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "uz"));
  return [...fromPlan, ...rest];
}

/** Jadvalda yo'q kuryerning bo'sh bloki: mahsulot qatorlari nol, pul noma'lum («—», o'ylab topilgan 0 emas). */
export function idleCourierSheet(courier: CourierRef): CourierSheet {
  const empty: SheetFigures = {
    opening: {},
    issued: {},
    given: {},
    sold: {},
    gift: {},
    other: {},
    closing: {},
    salesAmount: 0,
    cashAmount: 0,
    onlineAmount: 0,
    discountAmount: 0,
    addresses: 0,
    refusedAddresses: 0,
    openOrders: 0,
    fee: null,
    handoverDue: null,
    cash: null,
  };
  return { ...empty, courier, region: null, days: [] };
}

function sameCell(a: QtyCell, b: QtyCell): boolean {
  if (a.piecesTotal !== undefined && b.piecesTotal !== undefined) return a.piecesTotal === b.piecesTotal;
  return a.qty === b.qty && a.pieces === b.pieces;
}

export type StockMismatch = { product: SheetProduct; closing: QtyCell; onHand: QtyCell };

/**
 * Bugungi «Qolgan» kuryerning skladdagi hozirgi qoldig'i (reja `on_hand`) bilan
 * bir xil bo'lishi shart — ikkalasi ham serverdan. Farq — ma'lumot xatosi:
 * yashirilmaydi, blokda ochiq ko'rsatiladi (egasi: «xatosiz, to'g'ri ma'lumot»).
 */
export function closingMismatch(closing: CellMap, onHand: CellMap, products: readonly SheetProduct[]): StockMismatch[] {
  return products
    .map((product) => ({ product, closing: cellOf(closing, product.id), onHand: cellOf(onHand, product.id) }))
    .filter((row) => !sameCell(row.closing, row.onHand));
}
