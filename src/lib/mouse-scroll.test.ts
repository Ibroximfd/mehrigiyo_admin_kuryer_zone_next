import { describe, expect, it } from "vitest";

import { wheelTarget } from "./mouse-scroll";
import type { ScrollBox } from "./mouse-scroll";

function box(patch: Partial<ScrollBox> = {}): ScrollBox {
  return { parent: null, wheelX: false, scrollsY: false, scrollLeft: 0, scrollWidth: 100, clientWidth: 100, ...patch };
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
