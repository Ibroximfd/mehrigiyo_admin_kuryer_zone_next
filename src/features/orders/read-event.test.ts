import { describe, expect, it } from "vitest";

import { readEventEffect } from "./courier-messages";

describe("readEventEffect (JAVOBLAR_5)", () => {
  it("kuryer o'qidi — logist xabarlari ✓✓, belgi tegilmaydi", () => {
    expect(readEventEffect({ by: "courier", unread: 0 })).toEqual({
      markLogistMessagesRead: true,
      clearInbox: false,
    });
  });

  it("logist o'zi o'qidi va 0 qoldi — ✓✓ yo'q, belgi tushadi", () => {
    expect(readEventEffect({ by: "logist", unread: 0 })).toEqual({
      markLogistMessagesRead: false,
      clearInbox: true,
    });
  });

  it("logist o'qidi, lekin hali o'qilmagan bor — belgi qoladi", () => {
    expect(readEventEffect({ by: "logist", unread: 2 }).clearInbox).toBe(false);
  });

  it("by yo'q eski shakl — kuryer o'qidi deb olinadi", () => {
    expect(readEventEffect({ up_to_id: 5 }).markLogistMessagesRead).toBe(true);
  });
});
