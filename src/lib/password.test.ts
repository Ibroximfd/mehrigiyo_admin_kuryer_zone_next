import { describe, expect, it } from "vitest";

import { ApiError } from "./api-client";
import { apiFieldError, passwordError } from "./password";

describe("passwordError", () => {
  it("talab qilinganda bo'sh parolni rad etadi", () => {
    expect(passwordError("")).toBe("Parolni kiriting");
    expect(passwordError("", { optional: true })).toBeNull();
  });

  it("kamida 6 belgi", () => {
    expect(passwordError("abc12")).not.toBeNull();
    expect(passwordError("  abc12  ")).not.toBeNull();
    expect(passwordError("abc123")).toBeNull();
  });
});

describe("apiFieldError", () => {
  it("fields{} ichidan va tekis DRF shaklidan o'qiydi", () => {
    const nested = new ApiError("x", 400, { code: "validation_error", fields: { password: ["Qisqa"] } });
    const flat = new ApiError("x", 400, { username: ["Bu login band"] });
    expect(apiFieldError(nested, "password")).toBe("Qisqa");
    expect(apiFieldError(flat, "username")).toBe("Bu login band");
    expect(apiFieldError(flat, "password")).toBeNull();
    expect(apiFieldError(new Error("x"), "password")).toBeNull();
  });
});
