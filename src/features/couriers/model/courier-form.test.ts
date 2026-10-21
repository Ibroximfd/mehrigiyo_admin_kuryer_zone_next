import { describe, expect, it } from "vitest";

import { courierSchema } from "./courier";
import {
  courierFormSchema,
  courierToForm,
  diffCourierPatch,
  emptyCourierForm,
  resolveOneTimePassword,
  setPasswordFormSchema,
  toCourierCreatePayload,
  toSetPasswordPayload,
} from "./courier-form";
import { addZone, keepKnownZones, makePrimary, moveZone, removeZone } from "./zone-order";

describe("zone ordering", () => {
  it("adds without duplicates and removes", () => {
    expect(addZone([7], 9)).toEqual([7, 9]);
    expect(addZone([7, 9], 7)).toEqual([7, 9]);
    expect(removeZone([7, 9], 7)).toEqual([9]);
  });

  it("makes a zone primary keeping the rest in order", () => {
    expect(makePrimary([7, 9, 11], 11)).toEqual([11, 7, 9]);
    expect(makePrimary([7, 9], 5)).toEqual([7, 9]);
  });

  it("moves within bounds only", () => {
    expect(moveZone([7, 9, 11], 9, "up")).toEqual([9, 7, 11]);
    expect(moveZone([7, 9, 11], 9, "down")).toEqual([7, 11, 9]);
    expect(moveZone([7, 9], 7, "up")).toEqual([7, 9]);
    expect(moveZone([7, 9], 9, "down")).toEqual([7, 9]);
    expect(moveZone([7, 9], 4, "up")).toEqual([7, 9]);
  });

  it("drops unknown zones", () => {
    expect(keepKnownZones([7, 8, 9], new Set([9, 7]))).toEqual([7, 9]);
  });
});

describe("courierFormSchema", () => {
  it("requires name, full phone and at least one zone", () => {
    const result = courierFormSchema.safeParse(emptyCourierForm());
    const messages = Object.fromEntries(
      (result.error?.issues ?? []).map((issue) => [issue.path.join("."), issue.message]),
    );
    expect(messages).toMatchObject({
      fullName: "nameShort",
      phone: "phoneIncomplete",
      zoneIds: "zonesRequired",
    });
  });

  it("needs no password in auto mode; manual needs ≥ 6 characters", () => {
    const base = { ...emptyCourierForm([7]), fullName: "Ali", phone: "901110001" };
    expect(base.passwordMode).toBe("auto");
    expect(courierFormSchema.safeParse({ ...base, password: "123" }).success).toBe(true);
    const manual = { ...base, passwordMode: "manual" as const };
    expect(courierFormSchema.safeParse(manual).error?.issues[0]).toMatchObject({ path: ["password"], message: "required" });
    expect(courierFormSchema.safeParse({ ...manual, password: "123" }).error?.issues[0]?.message).toBe("passwordShort");
    expect(courierFormSchema.safeParse({ ...manual, password: "123456" }).success).toBe(true);
    // Akkauntsiz — parol umuman tekshirilmaydi.
    expect(courierFormSchema.safeParse({ ...manual, createAccount: false }).success).toBe(true);
  });
});

describe("courier payloads", () => {
  const courier = courierSchema.parse({
    id: 12,
    full_name: "Ali Karimov",
    phone: "998901110001",
    zone_ids: [7, 9],
    has_account: true,
  });

  it("builds a create payload; server generates the password when empty", () => {
    const values = { ...emptyCourierForm([9, 7]), fullName: " Ali ", phone: "90 111 00 01" };
    expect(toCourierCreatePayload(values)).toEqual({
      full_name: "Ali",
      phone: "998901110001",
      zone_ids: [9, 7],
      create_account: true,
    });
    // auto — kiritilgan matn bo'lsa ham yuborilmaydi.
    expect(toCourierCreatePayload({ ...values, password: "secret1" })).not.toHaveProperty("password");
    const manual = { ...values, passwordMode: "manual" as const, password: "secret1" };
    expect(toCourierCreatePayload(manual).password).toBe("secret1");
    expect(toCourierCreatePayload({ ...manual, createAccount: false })).not.toHaveProperty("password");
  });

  it("diffs only changed fields, including zone order", () => {
    const form = courierToForm(courier);
    expect(form.phone).toBe("901110001");
    expect(diffCourierPatch(courier, form)).toEqual({});
    expect(diffCourierPatch(courier, { ...form, zoneIds: [9, 7] })).toEqual({ zone_ids: [9, 7] });
    expect(diffCourierPatch(courier, { ...form, phone: "901110002" })).toEqual({ phone: "998901110002" });
  });

});

describe("set-password modes", () => {
  it("validates only the manual password", () => {
    expect(setPasswordFormSchema.safeParse({ mode: "auto", password: "" }).success).toBe(true);
    expect(setPasswordFormSchema.safeParse({ mode: "manual", password: "12345" }).success).toBe(false);
    expect(setPasswordFormSchema.safeParse({ mode: "manual", password: "123456" }).success).toBe(true);
  });

  it("sends no password in auto mode", () => {
    expect(toSetPasswordPayload({ mode: "auto", password: "ignored" })).toEqual({});
    expect(toSetPasswordPayload({ mode: "manual", password: "secret1" })).toEqual({ password: "secret1" });
  });

  it("shows the server password once, falling back to the manual one", () => {
    expect(resolveOneTimePassword("auto", "", "x7k2m9pq")).toBe("x7k2m9pq");
    expect(resolveOneTimePassword("auto", "", null)).toBeNull();
    expect(resolveOneTimePassword("manual", "secret1", null)).toBe("secret1");
    expect(resolveOneTimePassword("manual", "secret1", "server1")).toBe("server1");
  });
});
