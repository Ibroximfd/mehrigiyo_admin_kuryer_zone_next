import { describe, expect, it } from "vitest";

import { mapItemRef } from "@/lib/item-ref";

import { cellCount, draftCount, issueDefaults, planIssueLines, toStockQuantity } from "./issue-draft";
import { mapIssuePlan } from "./types";

/**
 * Test server javobi (2026-11-20): Shifo choy va Alatoo bals — donada (sklad
 * ham donada); Paratsetamol — karobkada sotiladi, skladda donada (1 karobka = 2 dona).
 */
const PLAN = mapIssuePlan({
  products: [
    { id: 12, name_uz: "Shifo choy", unit_label: "dona", count_unit: "piece", pieces_per_box: 1 },
    { id: 14, name_uz: "Alatoo bals", unit_label: "dona", count_unit: "piece", pieces_per_box: 1 },
    { id: 2, name_uz: "Paratsetamol", unit_label: "karobka", count_unit: "box", pieces_per_box: 2 },
  ],
  couriers: [
    {
      courier: { id: 27, full_name: "Test Kuryer" },
      on_hand: { "12": { qty: 9, pieces: 0, pieces_total: 9 } },
      required: { "12": { qty: 17, pieces: 0, pieces_total: 17 }, "2": { qty: 4, pieces: 0 } },
      to_issue: { "12": { qty: 8, pieces: 0, pieces_total: 8 }, "14": { qty: 1, pieces: 0, pieces_total: 1 }, "2": { qty: 1, pieces: 0 } },
      issue_lines: [
        { item_id: 12, quantity: 8 },
        { item_id: 14, quantity: 1 },
        { item_id: 2, quantity: 2 },
      ],
    },
  ],
});
const products = PLAN.products;
const issue = PLAN.couriers[0]!;
const ITEMS = new Map([
  [12, mapItemRef({ id: 12, name: "Shifo choy", unit_label: "dona", stock_unit: "piece", count_unit: "piece", pieces_per_box: 1 })],
  [14, mapItemRef({ id: 14, name: "Alatoo bals", unit_label: "dona", stock_unit: "piece", count_unit: "piece", pieces_per_box: 9 })],
  [2, mapItemRef({ id: 2, name: "Paratsetamol", unit_label: "dona", stock_unit: "piece", count_unit: "box", pieces_per_box: 2 })],
]);
const itemOf = (id: number) => ITEMS.get(id);
const product = (id: number) => products.find((row) => row.id === id)!;

describe("«Berish kerak» qatori — jadvalda tahrirlanadigan sonlar (egasi, 2026-11-20)", () => {
  it("maydonlar sukuti — serverning `to_issue` i, jadval birligida; kerak bo'lmagani yo'q", () => {
    expect(issueDefaults(issue, products)).toEqual({ 12: 8, 14: 1, 2: 1 });
    expect(issueDefaults(null, products)).toEqual({});
  });

  it("hech narsa o'zgartirilmasa — serverning `issue_lines` i aynan yuboriladi (birlik aylantirishsiz)", () => {
    const defaults = issueDefaults(issue, products);
    expect(planIssueLines(products, defaults, defaults, issue.issueLines, itemOf)).toEqual({
      lines: [
        { itemId: 12, quantity: 8 },
        { itemId: 14, quantity: 1 },
        { itemId: 2, quantity: 2 },
      ],
      invalid: [],
    });
  });

  it("birining soni o'zgartirilsa yoki yangisi yozilsa — o'shancha; o'chirilgani yuborilmaydi", () => {
    const defaults = issueDefaults(issue, products);
    // Choy 10 ga o'zgardi, bals o'chirildi, Paratsetamol 3 karobka (= 6 dona sklad birligida).
    expect(planIssueLines(products, { 12: 10, 14: 0, 2: 3 }, defaults, issue.issueLines, itemOf).lines).toEqual([
      { itemId: 12, quantity: 10 },
      { itemId: 2, quantity: 6 },
    ]);
  });

  it("jadval birligi → sklad birligi: karobka → dona `× pieces_per_box`; dona → karobka faqat butun", () => {
    expect(toStockQuantity(product(2), itemOf(2), 3)).toBe(6);
    expect(toStockQuantity(product(12), itemOf(12), 7)).toBe(7);
    const boxedStock = mapItemRef({ id: 12, stock_unit: "box", count_unit: "piece", pieces_per_box: 20 });
    expect(toStockQuantity(product(12), boxedStock, 40)).toBe(2);
    expect(toStockQuantity(product(12), boxedStock, 30)).toBeNull();
    // Sklad birligi noma'lum (eski javob) — jadval birligi bilan bir xil.
    expect(toStockQuantity(product(2), mapItemRef({ id: 2 }), 3)).toBe(3);
    // Mahsulot skladda yo'q — yuborib bo'lmaydi.
    expect(toStockQuantity(product(2), undefined, 3)).toBeNull();
    expect(planIssueLines(products, { 12: 30 }, {}, [], () => boxedStock).invalid).toEqual([12]);
  });

  it("katakdagi bitta son va maydon matni", () => {
    expect(cellCount({ qty: 8, pieces: 0, piecesTotal: 8 }, product(12))).toBe(8);
    expect(cellCount({ qty: 2, pieces: 0 }, product(2))).toBe(2);
    expect(cellCount({ qty: 2, pieces: 1 }, product(2))).toBeNull();
    expect(draftCount("12")).toBe(12);
    expect(draftCount("")).toBe(0);
    expect(draftCount("abc")).toBe(0);
  });
});
