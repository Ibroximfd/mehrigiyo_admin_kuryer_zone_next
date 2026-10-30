import { describe, expect, it } from "vitest";

import { NOTE_MAX, validateReasonForm } from "./reason-form";

describe("validateReasonForm — sabab oynasi (02 §2.5)", () => {
  it("sabab tanlanmasa xato", () => {
    const result = validateReasonForm({ reason: "", note: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.reason).toBe("Sabab tanlang");
  });

  it("oddiy sabab izohsiz ham o'tadi", () => {
    const result = validateReasonForm({ reason: "no_answer", note: "  " });
    expect(result).toEqual({ ok: true, value: { reason: "no_answer", note: "" } });
  });

  it("`other` — izoh majburiy", () => {
    const empty = validateReasonForm({ reason: "other", note: " " });
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.errors.note).toMatch(/izoh/i);

    const filled = validateReasonForm({ reason: "other", note: "Mijoz ko'chib ketgan" });
    expect(filled.ok).toBe(true);
  });

  it("izoh chegarasi", () => {
    const result = validateReasonForm({
      reason: "mistake",
      note: "x".repeat(NOTE_MAX + 1),
    });
    expect(result.ok).toBe(false);
  });
});

describe("validateReasonForm — requireNote", () => {
  it("qaytarishda izohsiz rad etiladi, izoh bilan o'tadi", () => {
    expect(validateReasonForm({ reason: "mistake", note: "" }, { requireNote: true })).toEqual({
      ok: false,
      errors: { note: "Izoh yozing — tarixda sabab bilan qoladi" },
    });
    expect(validateReasonForm({ reason: "mistake", note: "xato bosildi" }, { requireNote: true }).ok).toBe(true);
  });
});
