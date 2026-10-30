import { describe, expect, it } from "vitest";

import { runSequential, summarizeBulk } from "./bulk";

class CodedError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

const toCode = (error: unknown) =>
  error instanceof CodedError ? error.code : "unknown";

describe("runSequential + summarizeBulk", () => {
  it("ketma-ket bajaradi, progress beradi va qisman xatolarni guruhlaydi", async () => {
    const order: string[] = [];
    const progress: number[] = [];
    const failing: Record<string, string> = {
      b: "courier_required",
      d: "courier_required",
      e: "status_transition_forbidden",
    };

    const results = await runSequential(
      ["a", "b", "c", "d", "e"],
      async (id) => {
        order.push(id);
        if (failing[id]) throw new CodedError(failing[id]);
        return id.toUpperCase();
      },
      { toCode, onProgress: ({ done }) => progress.push(done) },
    );

    expect(order).toEqual(["a", "b", "c", "d", "e"]);
    expect(progress).toEqual([0, 1, 2, 3, 4, 5]);

    const summary = summarizeBulk(results);
    expect(summary.succeeded).toEqual(["a", "c"]);
    expect(summary.failed).toEqual([
      { code: "courier_required", count: 2, ids: ["b", "d"] },
      { code: "status_transition_forbidden", count: 1, ids: ["e"] },
    ]);
    expect(summary.skipped).toBe(0);
  });

  it("bekor qilinsa qolganlari yuborilmaydi va skipped sanaladi", async () => {
    const controller = new AbortController();
    const results = await runSequential(
      ["a", "b", "c"],
      async (id) => {
        if (id === "a") controller.abort();
        return id;
      },
      { toCode, signal: controller.signal },
    );
    expect(results.map((item) => item.id)).toEqual(["a"]);
    expect(summarizeBulk(results, 3).skipped).toBe(2);
  });

  it("kodsiz xato 'unknown' guruhiga tushadi", async () => {
    const results = await runSequential(
      ["x"],
      async () => {
        throw new Error("boom");
      },
      { toCode: () => "" },
    );
    expect(summarizeBulk(results).failed).toEqual([{ code: "unknown", count: 1, ids: ["x"] }]);
  });
});
