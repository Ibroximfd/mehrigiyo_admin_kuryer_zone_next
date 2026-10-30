import { describe, expect, it } from "vitest";

import { can, isRoleDefault, mapLogistTree, mapMyPermissions, mapPermissionCatalog } from "./types";

describe("logistlar daraxtdan", () => {
  it("bo'lim va bo'limsiz o'rinlardan faqat logistlar, takrorsiz", () => {
    const tree = mapLogistTree({
      me: { roles: [{ id: 1, role: "chief_logist", scope_kind: "all" }] },
      filials: [
        {
          id: 2,
          name: "Qo'qon",
          departments: [
            {
              seats: [
                { id: 10, username: "op", full_name: "Operator", roles: [{ id: 5, role: "seller", scope_kind: "seat" }] },
                { id: 11, username: "lg", full_name: "Aziz", is_logist: true },
              ],
            },
          ],
          unassigned_seats: [
            { id: 11, username: "lg", full_name: "Aziz", is_logist: true },
            { id: 12, username: "lg2", full_name: "Bobur", roles: [{ id: 6, role: "logist", scope_kind: "filial" }] },
          ],
        },
      ],
    });
    expect(tree.meRoles[0]!.scopeKind).toBe("all");
    expect(tree.filials[0]!.logists.map((seat) => seat.id)).toEqual([11, 12]);
    expect(tree.filials[0]!.logists[0]!.filialId).toBe(2);
  });

  it("yopilgan logist roli logist qilmaydi", () => {
    const tree = mapLogistTree({
      filials: [
        {
          id: 1,
          unassigned_seats: [
            { id: 3, username: "x", roles: [{ id: 9, role: "logist", until: "2020-01-01T00:00:00Z" }] },
          ],
        },
      ],
    });
    expect(tree.filials[0]!.logists).toHaveLength(0);
  });
});

describe("dopusklar", () => {
  it("faqat `true`; yuklanmagan — yo'q", () => {
    const me = mapMyPermissions({ permissions: { "logist.create": true, "logist.grant": false } });
    expect(can(me, "logist.create")).toBe(true);
    expect(can(me, "logist.grant")).toBe(false);
    expect(can(undefined, "logist.create")).toBe(false);
  });

  it("katalogdan faqat logistikaga oid kalitlar", () => {
    expect(mapPermissionCatalog(["seat.create", "view.finance", "orders.manage"]).map((item) => item.key)).toEqual([
      "view.finance",
      "orders.manage",
    ]);
    expect(isRoleDefault("logist", "orders.manage")).toBe(true);
    expect(isRoleDefault("logist", "view.finance")).toBe(false);
    expect(isRoleDefault("chief_logist", "view.finance")).toBe(true);
  });
});
