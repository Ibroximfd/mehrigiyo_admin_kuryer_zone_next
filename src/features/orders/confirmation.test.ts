import { describe, expect, it } from "vitest";

import {
  appPresence,
  appUnavailableTooltip,
  confirmationSummary,
  confirmationView,
  confirmerKind,
  withConfirmerFallback,
} from "./confirmation";
import { appUnavailableReasonLabel, confirmReasonLabel } from "./reasons";
import { mapAppUnavailable, mapConfirmation } from "./types";

const AT = "2026-10-01T09:22:00";

function confirmation(raw: Record<string, unknown>) {
  return mapConfirmation({ confirmed_at: AT, ...raw });
}

describe("mapConfirmation", () => {
  it("yangi shakl: confirmed_by obyekt, reason, note", () => {
    const value = confirmation({
      channel: "phone",
      confirmed_by: { type: "operator", id: 7, name: "Dilnoza" },
      reason: "app_unavailable",
      note: "knopkali",
    });
    expect(value?.confirmer).toEqual({ type: "operator", id: 7, name: "Dilnoza" });
    expect(value?.confirmedBy).toBe("operator");
    expect(value?.reason).toBe("app_unavailable");
    expect(value?.note).toBe("knopkali");
  });

  it("eski shakl: confirmed_by satr", () => {
    const value = confirmation({ channel: "app_slide", confirmed_by: "client" });
    expect(value?.confirmer).toEqual({ type: "client", id: null, name: "" });
    expect(value?.reason).toBeNull();
  });

  it("yangi kanal nomlari taniladi", () => {
    expect(confirmation({ channel: "client_app" })?.channel).toBe("client_app");
    expect(confirmation({ channel: "client_checkout" })?.channel).toBe("client_checkout");
    expect(confirmation({ channel: "doctor" })?.channel).toBe("doctor");
  });
});

describe("confirmerKind", () => {
  it("xodim turi kanaldan ustun (logist crm_force bilan)", () => {
    expect(
      confirmerKind(confirmation({ channel: "crm_force", confirmed_by: { type: "logist", name: "Aziz" } })),
    ).toBe("logist");
  });

  it("faqat kanal bo'lsa — kanaldan", () => {
    expect(confirmerKind(confirmation({ channel: "phone" }))).toBe("operator");
    expect(confirmerKind(confirmation({ channel: "crm_force" }))).toBe("admin");
    expect(confirmerKind(confirmation({ channel: "app_slide" }))).toBe("client_app");
    expect(confirmerKind(confirmation({ channel: "app_checkout" }))).toBe("client_checkout");
    expect(confirmerKind(confirmation({ channel: "payment_webhook" }))).toBe("payment_webhook");
  });

  it("faqat tur bo'lsa — mijoz/tizim", () => {
    expect(confirmerKind(confirmation({ confirmed_by: "client" }))).toBe("client_app");
    expect(confirmerKind(confirmation({ confirmed_by: "system" }))).toBe("payment_webhook");
    expect(confirmerKind(null)).toBeNull();
  });
});

describe("confirmationView", () => {
  it("mijoz ilovada — haqiqiy mijoz belgisi", () => {
    const view = confirmationView(confirmation({ channel: "client_app", confirmed_by: { type: "client" } }));
    expect(view?.title).toBe("Mijoz ilovada tasdiqladi");
    expect(view?.isRealClient).toBe(true);
    expect(view?.byClient).toBe(true);
  });

  it("checkout va webhook — mijoz tomoni, lekin 'haqiqiy mijoz' emas", () => {
    const checkout = confirmationView(confirmation({ channel: "client_checkout" }));
    expect(checkout?.title).toBe("Mijoz o'zi rasmiylashtirdi");
    expect(checkout?.isRealClient).toBe(false);
    expect(confirmationView(confirmation({ channel: "payment_webhook" }))?.title).toBe(
      "Onlayn to'lov bilan tasdiqlandi",
    );
  });

  it("operator: ism + telefon orqali + sabab + vaqt", () => {
    const view = confirmationView(
      confirmation({
        channel: "phone",
        confirmed_by: { type: "operator", id: 7, name: "Dilnoza" },
        reason: "app_unavailable",
      }),
    );
    expect(view?.chip).toBe("Operator · Dilnoza");
    expect(confirmationSummary(view)).toBe(
      "Operator Dilnoza tasdiqladi · telefon orqali · Ilovani o'rnatish imkoni bo'lmadi · 01.10 09:22",
    );
  });

  it("admin, logist, shifokor", () => {
    expect(
      confirmationView(confirmation({ channel: "crm_force", confirmed_by: { type: "admin", name: "Bobur Aliyev" } }))
        ?.chip,
    ).toBe("Admin · B. Aliyev");
    expect(
      confirmationView(confirmation({ confirmed_by: { type: "logist", name: "Aziz" } }))?.title,
    ).toBe("Logist Aziz tasdiqladi");
    expect(
      confirmationView(confirmation({ channel: "doctor", confirmed_by: { type: "doctor", name: "Karimov" } }))
        ?.title,
    ).toBe("Shifokor Karimov yaratdi");
  });

  it("ismsiz eski javob — rol bilan", () => {
    expect(confirmationView(confirmation({ channel: "phone" }))?.title).toBe("Operator tasdiqladi");
  });

  it("tanilmagan — server matni, bo'lmasa faqat vaqt bilan 'Tasdiqlandi'", () => {
    expect(
      confirmationView(confirmation({ confirmed_by: "reception", display: "Qabulxona tasdiqladi" }))?.title,
    ).toBe("Qabulxona tasdiqladi");
    expect(confirmationView(confirmation({ confirmed_by: "reception" }))?.title).toBe("Tasdiqlandi");
    expect(confirmationView(mapConfirmation({ confirmed_by: "reception" }))).toBeNull();
  });

  it("izoh faqat so'ralganda summaryga qo'shiladi", () => {
    const view = confirmationView(
      confirmation({ confirmed_by: { type: "logist", name: "Aziz" }, reason: "other", note: "shoshilinch" }),
    );
    expect(confirmationSummary(view)).not.toContain("shoshilinch");
    expect(confirmationSummary(view, { withNote: true })).toContain("Boshqa sabab · shoshilinch");
  });
});

describe("withConfirmerFallback", () => {
  const fallback = {
    confirmer: { type: "logist", id: 3, name: "Aziz" },
    reason: "client_no_app",
    at: new Date(AT),
  };

  it("server ism bermasa — joriy logist bilan", () => {
    const view = confirmationView(withConfirmerFallback(confirmation({ confirmed_by: "logist" }), fallback));
    expect(confirmationSummary(view)).toBe(
      "Logist Aziz tasdiqladi · Ilova yo'q yoki ishlamayapti · 01.10 09:22",
    );
  });

  it("confirmation umuman yo'q bo'lsa ham", () => {
    expect(confirmationView(withConfirmerFallback(null, fallback))?.title).toBe("Logist Aziz tasdiqladi");
  });

  it("server ism bergan bo'lsa tegilmaydi", () => {
    const server = confirmation({ confirmed_by: { type: "logist", name: "Server" } });
    expect(withConfirmerFallback(server, fallback)).toBe(server);
  });
});

describe("sabab yorliqlari", () => {
  it("logist va operator kalitlari bitta funksiyada", () => {
    expect(confirmReasonLabel("client_confirmed_by_phone")).toBe("Mijoz telefonda tasdiqladi");
    expect(confirmReasonLabel("client_no_app")).toBe("Ilova yo'q yoki ishlamayapti");
    expect(confirmReasonLabel("app_unavailable")).toBe("Ilovani o'rnatish imkoni bo'lmadi");
    expect(confirmReasonLabel("app_not_working")).toBe("Ilova ishlamayapti");
    expect(confirmReasonLabel("new_key")).toBe("new_key");
    expect(confirmReasonLabel(null)).toBe("");
  });

  it("ilova o'rnatib bo'lmaydi sabablari", () => {
    expect(appUnavailableReasonLabel("push_button_phone")).toBe("Knopkali telefon");
    expect(appUnavailableReasonLabel("phone_unsupported")).toBe("Telefon ilovani ko'tarmaydi");
    expect(appUnavailableReasonLabel("no_smartphone_access")).toBe("Smartfon yo'q");
  });
});

describe("ilova holati", () => {
  const unavailable = mapAppUnavailable({
    reason: "push_button_phone",
    note: "eski Nokia",
    set_by: { id: 7, name: "Dilnoza", role: "operator" },
    set_at: AT,
  });

  it("appPresence", () => {
    expect(appPresence({ hasApp: null, appUnavailable: unavailable })).toBe("unavailable");
    expect(appPresence({ hasApp: false, appUnavailable: unavailable })).toBe("unavailable");
    expect(appPresence({ hasApp: true, appUnavailable: unavailable })).toBe("has");
    expect(appPresence({ hasApp: false, appUnavailable: null })).toBe("none");
    expect(appPresence({ hasApp: null, appUnavailable: null })).toBeNull();
  });

  it("tooltip: sabab · izoh · kim · qachon", () => {
    expect(appUnavailableTooltip(unavailable)).toBe(
      "Ilovani o'rnatish imkoni bo'lmadi · Knopkali telefon · eski Nokia · Belgiladi: Dilnoza · 01.10 09:22",
    );
    expect(appUnavailableTooltip(null)).toBe("");
  });

  it("mapAppUnavailable — obyekt bo'lmasa null", () => {
    expect(mapAppUnavailable(null)).toBeNull();
    expect(mapAppUnavailable(undefined)).toBeNull();
  });
});

describe("rus tarjimasi (DOM qatlami)", () => {
  it("ism bilan yig'ilgan matn shablon orqali tarjima qilinadi", async () => {
    const { translateText } = await import("@/lib/i18n/translate");
    expect(
      translateText("Operator Dilnoza tasdiqladi · telefon orqali · Ilovani o'rnatish imkoni bo'lmadi", "ru"),
    ).toBe("Оператор Dilnoza подтвердил · по телефону · Установить приложение невозможно");
    expect(translateText("Logist Aziz tasdiqladi", "ru")).toBe("Логист Aziz подтвердил");
    expect(translateText("Operator · D. Karimova", "ru")).toBe("Оператор · D. Karimova");
  });
});

describe("2026-10-01 §4.5 — `confirmation` bloki (backend misoli)", () => {
  const BLOCK = {
    required: false,
    confirmed_at: "2026-10-01T09:22:00+00:00",
    confirmed_by: "operator",
    channel: "phone",
    channel_code: "phone",
    confirmed_by_party: { type: "operator", id: 7, name: "Dilnoza" },
    reason: "app_unavailable",
    note: "Telefonda tasdiqladi",
  };

  it("`confirmed_by` — SATR, obyekt `confirmed_by_party` da (§10.2)", () => {
    const value = mapConfirmation(BLOCK);
    expect(value?.confirmer).toEqual({ type: "operator", id: 7, name: "Dilnoza" });
    expect(value?.confirmedBy).toBe("operator");
    expect(value?.channel).toBe("phone");
    expect(confirmationView(value)?.title).toBe("Operator Dilnoza tasdiqladi");
    expect(confirmationView(value)?.reason).toBe("Ilovani o'rnatish imkoni bo'lmadi");
  });

  it("`channel_code` ustun: `app_slide` → `client_app`", () => {
    const value = mapConfirmation({ ...BLOCK, channel: "app_slide", channel_code: "client_app", confirmed_by: "client", confirmed_by_party: { type: "client", id: 12, name: null } });
    expect(value?.channel).toBe("client_app");
    expect(confirmerKind(value)).toBe("client_app");
  });

  it("logist tasdig'i: `crm_force` + party.type logist, sabab `null` (§10.16)", () => {
    const value = mapConfirmation({
      ...BLOCK,
      confirmed_by: "logist",
      channel: "crm_force",
      channel_code: "crm_force",
      confirmed_by_party: { type: "logist", id: 5, name: null },
      reason: null,
      note: null,
    });
    expect(confirmerKind(value)).toBe("logist");
    expect(confirmationView(value)?.title).toBe("Logist tasdiqladi");
    expect(confirmationView(value)?.reason).toBe("");
  });
});
