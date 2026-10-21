import { describe, expect, it } from "vitest";

import { loginFormSchema, loginResponseSchema } from "./auth";

describe("loginResponseSchema", () => {
  it("parses the contract shape", () => {
    expect(
      loginResponseSchema.parse({
        access: "a",
        refresh: "r",
        user: { id: 1, phone: "998901234567", is_superuser: true },
        server_time: "2026-10-15T09:00:00Z",
      }),
    ).toEqual({ access: "a", refresh: "r", user: { id: 1, phone: "998901234567", isSuperuser: true } });
  });

  it("tolerates missing optional fields", () => {
    expect(loginResponseSchema.parse({ access: "a", user: { id: 1 } })).toEqual({
      access: "a",
      refresh: null,
      user: { id: 1, phone: "", isSuperuser: false },
    });
  });

  it("rejects a response without an access token", () => {
    expect(() => loginResponseSchema.parse({ access: "", user: { id: 1 } })).toThrow();
  });
});

describe("loginFormSchema", () => {
  it("requires a full phone and a password", () => {
    expect(loginFormSchema.safeParse({ phone: "90 123", password: "" }).success).toBe(false);
    expect(loginFormSchema.safeParse({ phone: "90 123 45 67", password: "x" }).success).toBe(true);
  });
});
