import { sumCells } from "./regions";
import { hasCells } from "./types";
import type { CellMap, SheetFigures, SheetProduct } from "./types";

/**
 * Jadvaldagi «Berilgan» — sof (egasi, 2026-11-20: alohida «Tuzatish /
 * qaytarish» qatori bo'lmasin): davr boshidagi qoldiq + berilgan − kuryerdan
 * qaytarilgan ± tuzatish, ya'ni `given + other`. Shunda jadvalda «Berilgan −
 * Sotilgan − Sovg'a = Qolgan» ko'zga yopiladi. Qo'shish birlik bo'yicha aniq
 * (`sumCells`); «Qolgan» (`closing`) doim serverdan. Tafsilot — katak izohida.
 */
export function netGiven(figures: SheetFigures, products: readonly SheetProduct[]): CellMap {
  return hasCells(figures.other) ? sumCells([figures.given, figures.other], products) : figures.given;
}
