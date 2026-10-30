import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, api } from "@/lib/api-client";
import { ENDPOINTS } from "@/lib/api-constants";

import { fetchOrdersBoard } from "./api";

/**
 * 2026-10-01 C §15.2 — mijozsiz buyurtma doska javobini `500` bilan
 * yiqitadi. Ekran bo'sh qolmasin: ustunma-ustun, yiqilgani belgilanadi.
 */
afterEach(() => vi.restoreAllMocks());

describe("fetchOrdersBoard — §15.2 zaxirasi", () => {
  it("board `500` → ustunlar alohida; yiqilgan ustun `failedStatuses` da", async () => {
    vi.spyOn(api, "get").mockImplementation(async (path, options) => {
      if (path === ENDPOINTS.logistOrdersBoard) {
        throw new ApiError("Server xatosi", 500);
      }
      const status = String((options?.searchParams as Record<string, unknown>)?.status ?? "");
      if (status === "shipping") throw new ApiError("Server xatosi", 500);
      return {
        count: 1,
        results: [{ id: `o-${status}`, status, total_amount: "100.00" }],
      };
    });

    const board = await fetchOrdersBoard({ ordering: "-status_changed_at" });
    expect(board.failedStatuses).toEqual(["shipping"]);
    const confirmed = board.columns.find((column) => column.status === "confirmed")!;
    expect(confirmed.orders.map((order) => order.id)).toEqual(["o-confirmed"]);
    const shipping = board.columns.find((column) => column.status === "shipping")!;
    expect(shipping.orders).toEqual([]);
  });

  it("hamma ustun yiqilsa — xato (bo'sh doska \"buyurtma yo'q\" deb ko'rinmasin)", async () => {
    vi.spyOn(api, "get").mockRejectedValue(new ApiError("Server xatosi", 500));
    await expect(fetchOrdersBoard({})).rejects.toBeInstanceOf(ApiError);
  });
});
