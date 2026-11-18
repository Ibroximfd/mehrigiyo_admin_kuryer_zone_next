import { describe, expect, it } from "vitest";

import { wheelPixels, wheelTarget } from "./mouse-scroll";
import type { ScrollBox } from "./mouse-scroll";

function box(patch: Partial<ScrollBox> = {}): ScrollBox {
  return {
    parent: null,
    wheelX: false,
    scrollsY: false,
    scrollLeft: 0,
    scrollWidth: 100,
    clientWidth: 100,
    scrollTop: 0,
    scrollHeight: 100,
    clientHeight: 100,
    ...patch,
  };
}

describe("sichqoncha g'ildiragi — yon tomonga surish", () => {
  it("belgili qator sig'masa — u suriladi; chekkaga yetsa — hech narsa", () => {
    const row = box({ wheelX: true, scrollWidth: 600, clientWidth: 300 });
    const chip = box({ parent: row });
    expect(wheelTarget(chip, 40)).toBe(row);
    expect(wheelTarget(chip, -40)).toBeNull();
    expect(wheelTarget(box({ parent: { ...row, scrollLeft: 300 } }), 40)).toBeNull();
  });

  it("kanban ustuni (vertikal skroll) ichida — ustun o'zi suriladi, doska emas", () => {
    const board = box({ wheelX: true, scrollWidth: 1500, clientWidth: 700 });
    const column = box({ parent: board, scrollsY: true });
    const card = box({ parent: column });
    expect(wheelTarget(card, 40)).toBeNull();
    // Ustun sarlavhasi ustida (vertikal skroll yo'q) — doska yon tomonga.
    expect(wheelTarget(box({ parent: board }), 40)).toBe(board);
  });

  it("belgisiz jadval — sahifa avvalgidek", () => {
    const table = box({ scrollWidth: 900, clientWidth: 400 });
    expect(wheelTarget(box({ parent: table }), 40)).toBeNull();
  });

  it("sig'adigan belgili qator — yuqoridagi belgili qatorga o'tadi", () => {
    const outer = box({ wheelX: true, scrollWidth: 900, clientWidth: 400 });
    const inner = box({ parent: outer, wheelX: true });
    expect(wheelTarget(box({ parent: inner }), 40)).toBe(outer);
  });
});

describe("keng jadval (egasi so'rovi 2026-11-18)", () => {
  const wide = { wheelX: true, scrollWidth: 2400, clientWidth: 900 } as const;

  it("balandligi sig'adigan jadval — g'ildirak yon tomonga, chetida sahifaga", () => {
    const table = box(wide);
    const cell = box({ parent: table });
    expect(wheelTarget(cell, 40)).toBe(table);
    // Chap chetda yuqoriga — sahifa suriladi.
    expect(wheelTarget(cell, -40)).toBeNull();
    // O'ng chetda pastga — sahifa suriladi.
    expect(wheelTarget(box({ parent: { ...table, scrollLeft: 1500 } }), 40)).toBeNull();
    expect(wheelTarget(box({ parent: { ...table, scrollLeft: 1500 } }), -40)).not.toBeNull();
  });

  it("balandligi chegarali jadval — avval tepa-pastga, tepa/past chetida yon tomonga", () => {
    const table = box({ ...wide, scrollsY: true, scrollHeight: 1600, clientHeight: 640, scrollTop: 300 });
    const cell = (patch: Partial<ScrollBox> = {}) => box({ parent: { ...table, ...patch } });
    // O'rtada — vertikal (brauzerniki).
    expect(wheelTarget(cell(), 40)).toBeNull();
    expect(wheelTarget(cell(), -40)).toBeNull();
    // Pastki chetda pastga — yon tomonga; tepaga — yana vertikal.
    expect(wheelTarget(cell({ scrollTop: 960 }), 40)).not.toBeNull();
    expect(wheelTarget(cell({ scrollTop: 960 }), -40)).toBeNull();
    // Tepada yuqoriga, yon tomonda surilgan — chapga qaytadi.
    expect(wheelTarget(cell({ scrollTop: 0, scrollLeft: 500 }), -40)).not.toBeNull();
    // Pastki va o'ng chetda — hech kim ushlamaydi, sahifa suriladi.
    expect(wheelTarget(cell({ scrollTop: 960, scrollLeft: 1500 }), 40)).toBeNull();
  });

  it("vertikal siljiydigan, lekin eni sig'adigan jadval — tashqi qatorga o'tmaydi", () => {
    const outer = box(wide);
    const table = box({ parent: outer, wheelX: true, scrollsY: true, scrollHeight: 1600, clientHeight: 640, scrollTop: 960 });
    expect(wheelTarget(box({ parent: table }), 40)).toBeNull();
  });

  it("deltaMode: piksel, satr (×32), sahifa (konteyner eni)", () => {
    expect(wheelPixels(40, 0, 900)).toBe(40);
    expect(wheelPixels(-3, 1, 900)).toBe(-96);
    expect(wheelPixels(1, 2, 900)).toBe(900);
  });
});
