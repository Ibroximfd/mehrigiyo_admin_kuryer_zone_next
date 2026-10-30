import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "@/lib/query-keys";

import { applyLeadStageEvent, applyPipelineOrderEvent, BURST_LIMIT, FLUSH_MS } from "./realtime";
import { mapDeliveryBoard } from "./types";
import type { PipelineBoard } from "./types";

const fetchLeadDetail = vi.fn();
vi.mock("./api", () => ({ fetchLeadDetail: (...args: unknown[]) => fetchLeadDetail(...args) }));

function detail(id: number) {
  return {
    lead: {
      id,
      fullName: `L${id}`,
      phone: "",
      stage: "delivery",
      statusId: null,
      statusName: null,
      assignedTo: null,
      region: null,
      ordersAmount: null,
      deliveryColumn: "confirmed",
      openOrdersCount: 1,
      orders: [],
      updatedAt: null,
      statusChangedAt: null,
    },
    note: null,
    source: null,
    createdAt: null,
  };
}

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const key = queryKeys.deliveryBoard({ search: null });
  client.setQueryData(
    key,
    mapDeliveryBoard({ columns: [{ status: "confirmed", lead_count: 0, leads: [] }] }),
  );
  return { client, key };
}

describe("real vaqt: yig'ib yuborish", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchLeadDetail.mockReset();
    fetchLeadDetail.mockImplementation((id: number) => Promise.resolve(detail(id)));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("to'lqindagi takror hodisalar — har lid bir marta so'raladi", async () => {
    const { client, key } = setup();
    for (let i = 0; i < 3; i += 1) {
      applyLeadStageEvent(client, { lead_id: 7, from_stage: "leads", to_stage: "delivery" });
    }
    applyLeadStageEvent(client, { lead_id: 8, from_stage: "leads", to_stage: "delivery" });
    expect(fetchLeadDetail).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(FLUSH_MS + 10);
    expect(fetchLeadDetail).toHaveBeenCalledTimes(2);
    const board = client.getQueryData<PipelineBoard>(key)!;
    expect(board.columns[0]!.leads.map((lead) => lead.id).sort()).toEqual([7, 8]);
  });

  it("to'lqin katta — lidlar emas, doska bir marta", async () => {
    const { client, key } = setup();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    for (let id = 1; id <= BURST_LIMIT + 1; id += 1) {
      applyLeadStageEvent(client, { lead_id: id, from_stage: "leads", to_stage: "delivery" });
    }
    await vi.advanceTimersByTimeAsync(FLUSH_MS + 10);
    expect(fetchLeadDetail).not.toHaveBeenCalled();
    const boardCalls = invalidate.mock.calls.filter(([filters]) => filters?.queryKey === key);
    expect(boardCalls).toHaveLength(1);
    // Ketayotgan so'rov kesilmaydi.
    expect(boardCalls[0]![1]).toEqual({ cancelRefetch: false });
  });

  it("yashirin oynada tarmoqqa chiqilmaydi", async () => {
    vi.stubGlobal("document", { hidden: true });
    const { client } = setup();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    applyLeadStageEvent(client, { lead_id: 7, from_stage: "leads", to_stage: "delivery" });
    applyPipelineOrderEvent(client, "order_updated", { order_id: "x" });
    await vi.advanceTimersByTimeAsync(FLUSH_MS + 10);
    expect(fetchLeadDetail).not.toHaveBeenCalled();
    for (const [filters] of invalidate.mock.calls) {
      expect(filters?.refetchType).toBe("none");
    }
  });
});
