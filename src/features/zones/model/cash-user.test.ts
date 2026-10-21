import { describe, expect, it } from "vitest";

import { cashUsersResponseSchema, toCashPersonValue } from "./cash-user";

describe("cashUsersResponseSchema (GET /api/admin/cash-users/)", () => {
  it("parses the contract example", () => {
    const [user] = cashUsersResponseSchema.parse([
      {
        user_id: 15,
        full_name: "Dilnoza Kassir",
        username: "dilnoza",
        phone: "998901112233",
        filial: { id: 2, name: "Mehrigiyo Qo'qon" },
        is_logist: true,
        is_admin: false,
      },
    ]);
    expect(user).toEqual({
      userId: 15,
      name: "Dilnoza Kassir",
      username: "dilnoza",
      phone: "998901112233",
      filial: { id: 2, name: "Mehrigiyo Qo'qon" },
      isLogist: true,
      isAdmin: false,
    });
    if (!user) throw new Error("fixture");
    expect(toCashPersonValue(user)).toEqual({ userId: 15, name: "Dilnoza Kassir" });
  });

  it("falls back to username / phone / id for the name and allows a null filial", () => {
    const users = cashUsersResponseSchema.parse([
      { user_id: 1, full_name: " ", username: "op1", filial: null },
      { user_id: 2, phone: "998900000002" },
      { user_id: 3 },
    ]);
    expect(users.map((user) => user.name)).toEqual(["op1", "998900000002", "#3"]);
    expect(users[0]).toMatchObject({ filial: null, isLogist: false, isAdmin: false });
  });

  it("requires user_id", () => {
    expect(() => cashUsersResponseSchema.parse([{ full_name: "X" }])).toThrow();
  });
});
