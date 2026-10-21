import { describe, expect, it } from "vitest";

import { AppError } from "@/shared/lib/app-error";

import { describeError, validationMessage } from "./messages";
import { ru } from "./ru";
import { uz } from "./uz";

describe("describeError", () => {
  it("prefers the server detail for client errors", () => {
    const error = new AppError({ kind: "conflict", code: "phone_taken", detail: "Band: Ali" });
    expect(describeError(error, uz)).toBe("Band: Ali");
  });

  it("uses the kind message when there is no detail or the server failed", () => {
    expect(describeError(new AppError({ kind: "offline" }), uz)).toBe(uz.errors.offline);
    expect(describeError(new AppError({ kind: "server", detail: "Traceback…" }), ru)).toBe(ru.errors.server);
    expect(describeError(new AppError({ kind: "not-found" }), ru)).toBe(ru.errors.notFound);
    expect(describeError(new Error("boom"), uz)).toBe(uz.errors.unknown);
  });
});

describe("validationMessage", () => {
  it("translates known keys and passes server text through", () => {
    expect(validationMessage(uz, "required")).toBe(uz.validation.required);
    expect(validationMessage(ru, "passwordShort")).toBe(ru.validation.passwordShort);
    expect(validationMessage(uz, "Kamida 6 belgi")).toBe("Kamida 6 belgi");
    expect(validationMessage(uz, undefined)).toBeUndefined();
  });
});
