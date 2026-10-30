import { describe, expect, it } from "vitest";

import { BOARD_COLUMN_OPTIONS, toggleHiddenColumn, visibleColumns } from "./board-columns";

describe("doska ustunlari tanlovi", () => {
  it("tartib: Tasdiqlangan, Yo'lda, Jarayonda, Yetkazilgan, Atkaz", () => {
    expect(BOARD_COLUMN_OPTIONS.map((option) => option.value)).toEqual(["confirmed", "shipping", "review", "delivered", "cancelled"]);
  });

  it("yashirish va qaytarish; oxirgisi yashirilmaydi", () => {
    expect(toggleHiddenColumn([], "delivered")).toEqual(["delivered"]);
    expect(toggleHiddenColumn(["delivered"], "delivered")).toEqual([]);
    const allButOne = ["confirmed", "shipping", "review", "delivered"];
    expect(toggleHiddenColumn(allButOne, "cancelled")).toEqual(allButOne);
  });

  it("ko'rinadigan ustunlar; hammasi yashirilgan bo'lib qolsa — hammasi", () => {
    const columns = [{ status: "confirmed" }, { status: "shipping" }, { status: "review" }];
    expect(visibleColumns(columns, ["shipping"]).map((column) => column.status)).toEqual(["confirmed", "review"]);
    expect(visibleColumns(columns, ["confirmed", "shipping", "review"])).toHaveLength(3);
  });
});
