import { beforeEach, describe, expect, it } from "vitest";

import { readScroll, resetScrollMemory, restoreStep, writeScroll } from "./scroll-memory";

describe("scroll xotirasi", () => {
  beforeEach(() => resetScrollMemory());

  it("kalit bo'yicha saqlanadi; 0 va manfiy — o'chiriladi", () => {
    writeScroll("orders-board:confirmed", 812.6);
    expect(readScroll("orders-board:confirmed")).toBe(813);
    expect(readScroll("orders-board:shipping")).toBe(0);
    writeScroll("orders-board:confirmed", -5);
    expect(readScroll("orders-board:confirmed")).toBe(0);
  });

  it("200 dan ortiq kalitda eng eskisi tushadi", () => {
    for (let index = 0; index < 205; index += 1) writeScroll(`k${index}`, index + 1);
    expect(readScroll("k0")).toBe(0);
    expect(readScroll("k4")).toBe(0);
    expect(readScroll("k5")).toBe(6);
    expect(readScroll("k204")).toBe(205);
  });
});

describe("tiklash qadami", () => {
  it("maqsad yo'q yoki yetildi — tugadi", () => {
    expect(restoreStep({ target: 0, current: 0, max: 900, visible: true })).toBe("done");
    expect(restoreStep({ target: 400, current: 400.5, max: 900, visible: true })).toBe("done");
  });

  it("yashirin element (detal ochiq) — kutiladi", () => {
    expect(restoreStep({ target: 400, current: 0, max: 0, visible: false })).toBe("wait");
  });

  it("kontent yetarli — qo'yiladi; hali qisqa (kartalar chizilmoqda) — kutiladi", () => {
    expect(restoreStep({ target: 400, current: 0, max: 900, visible: true })).toBe("apply");
    expect(restoreStep({ target: 1600, current: 0, max: 700, visible: true })).toBe("wait");
  });
});
