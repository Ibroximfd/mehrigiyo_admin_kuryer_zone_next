import { describe, expect, it } from "vitest";

import { credentialsPatch, mapMyCredentials } from "./types";

// Soxta qiymatlar — haqiqiy login/parol testga yozilmaydi.
const LOGIN = "login_a";
const NEW_SECRET = "x".repeat(6);

const current = mapMyCredentials({ id: 165, full_name: "Bosh", username: LOGIN, password: null, is_admin: false });

describe("mapMyCredentials", () => {
  it("null parolni saqlaydi", () => {
    expect(current).toEqual({ id: 165, fullName: "Bosh", username: LOGIN, password: null });
  });
});

describe("credentialsPatch", () => {
  it("faqat o'zgargan maydonlarni yuboradi", () => {
    expect(credentialsPatch(current, { username: LOGIN, password: "" })).toBeNull();
    expect(credentialsPatch(current, { username: ` ${LOGIN} `, password: NEW_SECRET })).toEqual({ password: NEW_SECRET });
    expect(credentialsPatch(current, { username: "login_b", password: "" })).toEqual({ username: "login_b" });
  });
});
