import { appUnavailableReasonLabel, confirmReasonLabel } from "@/features/orders/reasons";
import { confirmationChannelLabel } from "@/features/orders/types";
import type {
  AppUnavailableInfo,
  ClientInfo,
  OrderConfirmation,
  OrderConfirmer,
} from "@/features/orders/types";
import { abbreviateName, formatShortDateTime } from "@/lib/format";

/**
 * "Kim tasdiqladi" — shartnoma 2026-10-01 §4. Kartochka chipi, ro'yxat qatori,
 * detal qatori, toast va CSV shu bitta funksiyadan o'qiydi — bir buyurtma
 * har joyda bir xil gapirsin.
 *
 * Eski backend faqat `channel` (+ `confirmed_by` tur satri) yuboradi — u ham
 * o'qiladi; yangisi `confirmed_by {type,id,name}`, `reason`, `note`.
 */
export type ConfirmerKind =
  | "client_app"
  | "client_checkout"
  | "payment_webhook"
  | "operator"
  | "admin"
  | "logist"
  | "doctor";

export type ConfirmationView = {
  kind: ConfirmerKind | null;
  /** Mijozning o'zi ilovada tasdiqlagan — kuchli yashil "haqiqiy mijoz" belgisi. */
  isRealClient: boolean;
  /** Mijoz/tizim tasdiqlagan (yashil) yoki xodim (ko'k). */
  byClient: boolean;
  /** "Operator Dilnoza tasdiqladi". */
  title: string;
  /** Kartochka chipi: "Operator · D. Karimova". */
  chip: string;
  /** "telefon orqali" — faqat operator tasdig'ida. */
  channelText: string | null;
  reason: string;
  note: string | null;
  at: Date | null;
};

const STAFF_TYPES = new Set(["operator", "admin", "logist", "doctor"]);

const CHANNEL_KIND: Record<string, ConfirmerKind> = {
  client_app: "client_app",
  app_slide: "client_app",
  client_checkout: "client_checkout",
  app_checkout: "client_checkout",
  payment_webhook: "payment_webhook",
  phone: "operator",
  crm_force: "admin",
  doctor: "doctor",
};

/**
 * Xodim turi kanaldan ustun: logist tasdig'i backendda `crm_force` kanali
 * bilan yozilishi mumkin, lekin tasdiqlagan — logist.
 */
export function confirmerKind(
  confirmation: OrderConfirmation | null | undefined,
): ConfirmerKind | null {
  if (!confirmation) return null;
  const type = confirmation.confirmer?.type ?? confirmation.confirmedBy ?? null;
  if (type && STAFF_TYPES.has(type)) return type as ConfirmerKind;
  const byChannel = confirmation.channel ? CHANNEL_KIND[confirmation.channel] : undefined;
  if (byChannel) return byChannel;
  if (type === "client") return "client_app";
  if (type === "system") return "payment_webhook";
  return null;
}

type KindText = { title: string; chip: string };

function staffText(role: string, verb: string, name: string): KindText {
  if (!name) return { title: `${role} ${verb}`, chip: role };
  return { title: `${role} ${name} ${verb}`, chip: `${role} · ${abbreviateName(name)}` };
}

function kindText(kind: ConfirmerKind, name: string): KindText {
  switch (kind) {
    case "client_app":
      return { title: "Mijoz ilovada tasdiqladi", chip: "Mijoz tasdiqladi" };
    case "client_checkout":
      return { title: "Mijoz o'zi rasmiylashtirdi", chip: "O'zi buyurdi" };
    case "payment_webhook":
      return { title: "Onlayn to'lov bilan tasdiqlandi", chip: "Onlayn to'landi" };
    case "operator":
      return staffText("Operator", "tasdiqladi", name);
    case "admin":
      return staffText("Admin", "tasdiqladi", name);
    case "logist":
      return staffText("Logist", "tasdiqladi", name);
    case "doctor":
      return staffText("Shifokor", "yaratdi", name);
  }
}

export function confirmationView(
  confirmation: OrderConfirmation | null | undefined,
): ConfirmationView | null {
  if (!confirmation) return null;
  const kind = confirmerKind(confirmation);
  const name = confirmation.confirmer?.name.trim() ?? "";
  const base = {
    reason: confirmReasonLabel(confirmation.reason),
    note: confirmation.note,
    at: confirmation.confirmedAt,
  };

  if (!kind) {
    // Tanilmagan tur/kanal: server matni, bo'lmasa xom kanal; faqat vaqt
    // bo'lsa ham "tasdiqlangan" fakti yo'qolmasin.
    const fallback =
      confirmation.display ??
      (confirmationChannelLabel(confirmation.channel) ||
        (confirmation.confirmedAt ? "Tasdiqlandi" : ""));
    if (!fallback) return null;
    return {
      ...base,
      kind: null,
      isRealClient: false,
      byClient: false,
      title: fallback,
      chip: fallback,
      channelText: null,
    };
  }

  const text = kindText(kind, name);
  const byClient =
    kind === "client_app" || kind === "client_checkout" || kind === "payment_webhook";
  return {
    ...base,
    kind,
    isRealClient: kind === "client_app",
    byClient,
    title: text.title,
    chip: text.chip,
    channelText: kind === "operator" ? "telefon orqali" : null,
  };
}

/**
 * Bir qatorli to'liq matn: "Operator Dilnoza tasdiqladi · telefon orqali ·
 * Ilovani o'rnatish imkoni bo'lmadi · 01.10 14:22". Toast, tooltip va CSV uchun.
 */
export function confirmationSummary(
  view: ConfirmationView | null,
  { withNote = false }: { withNote?: boolean } = {},
): string {
  if (!view) return "";
  return [
    view.title,
    view.channelText,
    view.reason || null,
    withNote ? view.note : null,
    view.at ? formatShortDateTime(view.at) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Logist o'zi tasdiqlaganidan keyin: server javobida tasdiqlovchi ismi
 * bo'lmasa (eski backend), joriy foydalanuvchi bilan to'ldiriladi — toast
 * "Logist {men} tasdiqladi" desin. Server ism bergan bo'lsa unga tegilmaydi.
 */
export function withConfirmerFallback(
  confirmation: OrderConfirmation | null | undefined,
  fallback: { confirmer: OrderConfirmer; reason: string | null; at: Date },
): OrderConfirmation {
  const current = confirmation ?? null;
  if (current?.confirmer?.name) return current;
  const type = current?.confirmer?.type ?? current?.confirmedBy ?? fallback.confirmer.type;
  return {
    required: current?.required ?? false,
    confirmedAt: current?.confirmedAt ?? fallback.at,
    confirmedBy: type,
    confirmer: { ...fallback.confirmer, type },
    channel: current?.channel ?? null,
    reason: current?.reason ?? fallback.reason,
    note: current?.note ?? null,
    display: current?.display ?? null,
  };
}

// ── Ilova holati (shartnoma §1–§2) ────────────────────────────────────────

export type AppPresence = "unavailable" | "has" | "none";

/**
 * Ilova bor — yashil, yo'q — kulrang, o'rnatib bo'lmaydi — sariq; noma'lum —
 * `null` (hech narsa chizilmaydi). Ilova haqiqatan o'rnatilgan bo'lsa
 * (`has_app: true`) eski "o'rnatib bo'lmaydi" belgisi eskirgan — `has` ustun.
 */
export function appPresence(client: Pick<ClientInfo, "hasApp" | "appUnavailable">): AppPresence | null {
  if (client.hasApp === true) return "has";
  if (client.appUnavailable) return "unavailable";
  if (client.hasApp === false) return "none";
  return null;
}

/** Sariq belgi tooltipi: sabab · izoh · kim · qachon. */
export function appUnavailableTooltip(info: AppUnavailableInfo | null): string {
  if (!info) return "";
  const who = info.setBy?.name ? `Belgiladi: ${info.setBy.name}` : null;
  return [
    "Ilovani o'rnatish imkoni bo'lmadi",
    appUnavailableReasonLabel(info.reason) || null,
    info.note,
    who,
    info.setAt ? formatShortDateTime(info.setAt) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
