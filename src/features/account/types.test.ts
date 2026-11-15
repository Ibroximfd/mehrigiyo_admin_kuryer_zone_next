import { describe, expect, it } from "vitest";

import { credentialsPatch, mapMyCredentials } from "./types";

const current = mapMyCredentials({ id: 165, full_name: "Bosh", username: "flutter_chief", password: null, is_admin: false });

describe("mapMyCredentials", () => {
  it("null parolni saqlaydi", () => {
    expect(current).toEqual({ id: 165, fullName: "Bosh", username: "flutter_chief", password: null });
  });
});

describe("credentialsPatch", () => {
  it("faqat o'zgargan maydonlarni yuboradi", () => {
    expect(credentialsPatch(current, { username: "flutter_chief", password: "" })).toBeNull();
    expect(credentialsPatch(current, { username: " flutter_chief ", password: "yangi123" })).toEqual({ password: "yangi123" });
    expect(credentialsPatch(current, { username: "boshqa", password: "" })).toEqual({ username: "boshqa" });
  });
});
