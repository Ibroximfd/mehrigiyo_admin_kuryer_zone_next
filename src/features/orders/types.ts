import { resolveMediaUrl } from "@/lib/api-constants";
import { formatSom, parseDate } from "@/lib/format";
import {
  asArray,
  asBool,
  asInt,
  asNumber,
  asOptionalBool,
  asOptionalInt,
  asOptionalNumber,
  asOptionalString,
  asRecord,
  asString,
  isRecord,
} from "@/lib/parse";

import { mapOrderCashback } from "./cashback";
import { mapChangeRequest } from "./change-request";
import type { ChangeRequest } from "./change-request";
import type { OrderCashback } from "./cashback";
import { mapDeliveryProof, mapDeliveryStage } from "./delivery-proof";
import type { DeliveryProof, DeliveryStage } from "./delivery-proof";
import { mapNeedsReview, mapOrderGeocode } from "./geocode";
import type { OrderGeocode } from "./geocode";
import { asGiftSource } from "./gift-source";
import type { GiftSource } from "./gift-source";
import { asItemOffer, asPercent } from "./item-pricing";
import type { ItemOffer } from "./item-pricing";
import { cancelReasonLabel, revertReasonLabel } from "./reasons";
import { regionLabel } from "./regions";
import { asAddressChangedBy } from "./address";
import type { AddressChangedBy } from "./address";
import { mapOrderReview } from "./review";
import type { OrderReview } from "./review";
import { mapOrderZoning } from "./zoning";
import type { OrderZoning } from "./zoning";

/**
 * Logist ko'radigan buyurtma — CRM `OperatorOrder` ning ustiga
 * `BACKEND-LOGIST.md` §2 maydonlari qo'shilgan: kuryer, yetkazish rejasi,
 * logist izohi, urinishlar, transfer holati.
 *
 * Backend hali §2 ni chiqarmagan bo'lsa yangi maydonlar shunchaki `null`
 * keladi — parser hech qachon yiqilmaydi.
 */
export type LogistOrder = {
  id: string;
  orderNumber: string;
  status: string;
  statusDisplay: string;
  /** Mol summasi — chegirmagacha. Ekranda faqat tafsilot sifatida. */
  totalAmount: number;
  /**
   * Mijoz **haqiqatan to'laydigan** summa: `total_amount` dan ball
   * chegirmasi ayirilgan (`OPERATOR_BALL_FRONTEND.md` §1).
   *
   * Operator ham, kuryer ham aynan shu raqamni aytadi — aks holda kuryer
   * 250 000 yig'moqchi bo'lib, kassada farq chiqadi. Ball ishlatilmagan
   * buyurtmada `totalAmount` ga teng, shuning uchun eski buyurtmalarda
   * ko'rinish o'zgarmaydi.
   */
  payableAmount: number;
  /** Nechta ball ishlatilgan; `0` — chegirma yo'q. */
  pointsUsed: number;
  /** Chegirmaning so'mdagi qiymati (1 000 ball = 100 000 so'm). */
  pointsDiscount: number;
  /** Jami **dona** soni — qatorlar soni emas (3 dona bitta mahsulot = 1 qator). */
  itemCount: number;
  /**
   * Tarkibdagi **qatorlar** soni (`line_count`). Tarkib to'liq kelganini shu
   * bilan solishtiriladi: `items.length === lineCount`. `item_count` bilan
   * solishtirilsa 3 dona bitta mahsulot "tarkib kelmadi" bo'lib ko'rinardi.
   * Eski backend bu maydonni yubormaydi — o'shanda `null`.
   */
  lineCount: number | null;
  customerNotes: string | null;
  deliveryInfo: DeliveryInfo | null;
  /**
   * Manzil geokodi (2026-10-16 B4): `delivery.geocode{…}` yoki yassi
   * `geocode_status`/`geocode_precision`. Eski javobda `null`.
   */
  geocode: OrderGeocode | null;
  /** Server "manzilni aniqlashtiring" deydi; bermasa `null`. */
  needsReview: boolean | null;
  client: ClientInfo;
  items: OrderItem[];
  paymentMethod: string | null;
  /**
   * To'lov haqiqatan tushganmi. **Buyurtma statusidan mustaqil** — `null`
   * "backend bu maydonni yubormayapti" degani, `false` emas.
   */
  isPaid: boolean | null;
  /**
   * Backendning to'lov holati kaliti. Hozirgi backend to'rttasini yuboradi:
   * `paid` · `pending` · `cancelled` · `refunded`. (`failed` yuborilmaydi —
   * bazada bunday signal yo'q.)
   */
  paymentStatus: string | null;
  paidAt: Date | null;
  /** Qisman to'lovni ko'rsatish uchun; yo'q bo'lsa `null`. */
  paidAmount: number | null;
  /**
   * `payment_info.provider` — webhook yozadigan xom kalit
   * (`click_merchant`, `payme_merchant`…). Ro'yxatdan tashqarida bo'lishi
   * mumkin, shuning uchun xom holida saqlanadi.
   */
  paymentProvider: string | null;
  /** Provayder tranzaksiyasi — kassa bilan solishtirish uchun. */
  paymentTransactionId: string | null;
  source: string;
  createdAt: Date | null;

  // ── Logist maydonlari (§2) ────────────────────────────────────────────────
  courier: CourierRef | null;
  deliveryScheduledAt: string | null;
  deliveryWindow: DeliveryWindow | null;
  logistNote: string | null;
  deliveryAttempts: DeliveryAttempt[];
  deliveredAt: Date | null;
  /** Kuryer ilovasidagi bosqich (`picked_up`, `on_the_way`…); eski javobda `null`. */
  deliveryStage: DeliveryStage | null;
  /** Kuryer ilovasidan yetkazish isboti: rasmlar, GPS, anomaliyalar. */
  deliveryProof: DeliveryProof | null;
  /** Kuryer o'zi tuzgan marshrut tartibi (1…n). */
  routePosition: number | null;
  /** Boshqa filialga o'tkazish jarayoni; yo'q bo'lsa `null` (§8). */
  transfer: OrderTransferInfo | null;
  /** Tez belgilar (§4.13): `recall`, `payment`, `big`, `urgent`. */
  tags: string[];
  /**
   * Backend `tags` maydonini yuborganmi. Yubormasa teglar shu qurilmada
   * saqlanadi (`stores/tags-store.ts`) — eski javob bilan ham ishlaydi.
   */
  tagsFromServer: boolean;

  // ── Yagona domain model (`02_DOMAIN_MODEL` §2.2, §5) ─────────────────────
  // Backend hali chiqarmagan bo'lsa hammasi `null`/bo'sh — UI badge'larni
  // yashiradi, hech narsa taxmin qilinmaydi.

  /** `pending` bo'lsa nima kutilayotgani; boshqa statusda `null`. */
  pendingReason: PendingReason | null;
  /** Kim, qachon, qaysi kanal orqali tasdiqlagani. */
  confirmation: OrderConfirmation | null;
  /** Bekor qilingan buyurtmaning sababi va izohi. */
  cancel: OrderCancelInfo | null;
  /** Buyurtmani kim yaratgan: operator / shifokor / mijozning o'zi… */
  createdBy: OrderCreator | null;
  /** Admin operator nomidan yaratgan bo'lsa — o'sha operator. */
  onBehalfOf: PersonRef | null;
  /** Komissiya egasi — lidning mas'ul operatori. */
  responsibleOperator: PersonRef | null;
  doctor: PersonRef | null;
  /** Bitrix "ҚЎШИМЧА МАҲСУЛОТ/СОНИ" — erkin matn. */
  extraProductNote: string | null;
  /** Bitrix "СОВҒА/КОМЕНТАРИЯ". */
  giftComment: string | null;
  /** Bitrix "КОРОПКА СОНИ"; yuborilmasa `null`. */
  boxCount: number | null;
  /**
   * Mijoz bilan kelishilgan yetkazish sanasi (`YYYY-MM-DD`, Bitrix "Заказ
   * етказиладиган сана"). Logistning o'z rejasi `deliveryScheduledAt` da.
   */
  deliveryDate: string | null;
  /**
   * Buyurtma filiali. Logist faqat o'z filialini ko'radi (backend cheklaydi),
   * shuning uchun UIda chiqarilmaydi; transfer oqimi uchun saqlanadi.
   */
  filial: FilialRef | null;
  confirmedAt: Date | null;
  /**
   * `shipping` ga o'tgan payt (2026-10-01 C §7). Keyin o'zgarmaydi; eski
   * qatorlarda backfill `operator_locked_at` ni qo'ygan — "eng yaxshi
   * taxmin" (§7.2). Reja emas — reja `deliveryDate`.
   */
  shippedAt: Date | null;
  /**
   * JORIY statusga o'tgan payt (`status_changed_at`, §7.1) — doska
   * tartibining asosi (`?ordering=-status_changed_at`). `.update()` bilan
   * yozilgan kamdan-kam qatorda `null` — ko'rsatishda zaxira `createdAt`.
   */
  statusChangedAt: Date | null;
  /**
   * Qatorga oxirgi tegilgan payt (`updated_at`, har tahrirda) — status vaqti
   * EMAS. "Ko'rilmagan o'zgarish" belgisi uchun. WS dagisi bir qadam orqada
   * bo'lishi mumkin (§9.1) — faqat REST dan olinadi.
   */
  updatedAt: Date | null;
  /** Qo'lda sudrab qo'yilgan tartib (`board_position`); kelmasa `null`. */
  boardPosition: number | null;
  /** Ball keshbegi (§3); blok kelmasa `null`. */
  cashback: OrderCashback | null;
  /**
   * Qadalgan payt (`pinned_at`). Server tartibida qadalgan buyurtma doim
   * tepada (`?ordering=` uni tushirmaydi, 2026-10-01 §10.12) — mijozdagi
   * tartib ham shunga ergashadi. Kalit kelmasa `null`.
   */
  pinnedAt: Date | null;

  // ── Komissiya egasi (tahrirda `operator_id`) ─────────────────────────────
  /**
   * Buyurtma operator tavsiyasi orqali kelgan bo'lsa — tavsiya id si.
   * Bunday buyurtmada tarkib o'zgarsa backend `operator_id` ni talab qiladi.
   */
  recommendationId: number | null;
  /** Tavsiyani yuborgan (komissiya egasi) operator; bo'lmasa `null`. */
  recommendationOperator: PersonRef | null;
  /** Lidning mas'ul operatori (`lead.assigned_to`). */
  leadAssignee: PersonRef | null;

  // ── "Oldim" belgisi (filial bo'yicha umumiy) ─────────────────────────────
  /**
   * Buyurtmani kim "oldi" (ishga olgan logistlar). `null` — backend bu
   * maydonni hali yubormayapti (zaxira: shu qurilmadagi belgi).
   */
  acknowledgedBy: OrderAck[] | null;

  // ── Hudud va taqsimlash (2026-10-15) ─────────────────────────────────────
  /** Tuman, zona, kuryer zonasi mosligi, taklif, GPS taxmini (`zoning.ts`). */
  zoning: OrderZoning;

  // ── Dostavka xatolari (2026-10-27, `LOGIST_02`/`LOGIST_03`) ──────────────
  /** Kuryerning ochiq eshikdagi o'zgarish so'rovi; yo'q yoki eski deploy — `null`. */
  changeRequest: ChangeRequest | null;
  /** Buyurtma qaysi yetkazish to'xtashida; alohida — `null`. */
  stopId: number | null;
  /** Kuryer/operator natijasi va logist yakuni (`review.ts`, 2026-10-30). */
  review: OrderReview;
  /**
   * Bosh kuryer (backend K1 §C 1.1): logist zakazni unga bergan — u o'z
   * kuryeriga taqsimlaydi. Kuryer biriktirilsa ham ko'rsatiladi.
   */
  chiefCourier: CourierRef | null;
};

export type OrderAck = {
  /**
   * **Operator profili** id si — satr (backend `acknowledged_by[].id`,
   * `user_id` EMAS; auth `CurrentUser.id` ham operator profili id si).
   */
  userId: string | null;
  name: string;
  at: Date | null;
  /**
   * Migratsiya qo'ygan "Tizim" yozuvi (`is_system: true`, 2026-10-01 §10.11).
   * U buyurtmani "yangi" emas qiladi, lekin "Oldi: …" qatorida chizilmaydi.
   */
  isSystem: boolean;
};

export type PendingReason =
  "awaiting_client_confirmation" | "awaiting_online_payment";

/**
 * Tasdiq kanali. `client_app`/`client_checkout`/`doctor` — 2026-10-01
 * shartnomasi; `app_slide`/`app_checkout` — eski backend nomlari (bir xil
 * ma'no), ikkalasi ham o'qiladi.
 */
export type ConfirmationChannel =
  | "client_app"
  | "client_checkout"
  | "app_slide"
  | "app_checkout"
  | "phone"
  | "crm_force"
  | "doctor"
  | "payment_webhook"
  | "auto_confirm";

/** Kim tasdiqlagani — `confirmation.confirmed_by {type,id,name}`. */
export type OrderConfirmer = {
  /** `client` · `operator` · `admin` · `logist` · `doctor` · `system`; noma'lum — xom. */
  type: string | null;
  id: number | null;
  name: string;
};

export type OrderConfirmation = {
  required: boolean;
  confirmedAt: Date | null;
  /** Tasdiqlovchining **turi** (`client` · `operator` · …) — eski maydon, `confirmer.type` bilan bir xil. */
  confirmedBy: string | null;
  /** Tasdiqlovchi: tur + ism; eski backend faqat tur satrini yuboradi. */
  confirmer: OrderConfirmer | null;
  channel: ConfirmationChannel | null;
  /** Xodim tasdiqlaganda sabab kaliti (`app_unavailable`, `client_confirmed_by_phone` …). */
  reason: string | null;
  note: string | null;
  /** Server tayyor matni — faqat tanilmagan kanal/tur uchun zaxira. */
  display: string | null;
};

/** `client.app_unavailable` — mijozga ilova o'rnatib bo'lmaydi (shartnoma §2). */
export type AppUnavailableInfo = {
  /** `push_button_phone` · `phone_unsupported` · `no_smartphone_access` · `other`; noma'lum — xom. */
  reason: string | null;
  note: string | null;
  setBy: { id: number | null; name: string; role: string | null } | null;
  setAt: Date | null;
};

export type OrderCancelInfo = {
  reason: string | null;
  note: string | null;
  by: string | null;
  /** Kim bekor qilgani — rol (`operator` · `logist` · `client` …). */
  byType: string | null;
  at: Date | null;
};

export type CreatorKind =
  "operator" | "admin" | "doctor" | "client" | "reception";

export type PersonRef = {
  id: number | null;
  name: string;
  phone: string | null;
};

export type OrderCreator = PersonRef & {
  /** Noma'lum kalit xom holida saqlanadi — backend yangi rol qo'shsa ko'rinsin. */
  kind: CreatorKind | string;
};

export type ClientInfo = {
  /** Asosiy raqam — `phones[0]` bilan bir xil. */
  phone: string;
  fullName: string;
  /** Liddagi **barcha** raqamlar; backend bermasa `[phone]`. */
  phones: string[];
  /** Buyurtma kimning raqamiga rasmiylashtirilgan (Bitrix "Номер"). */
  orderedForPhone: string | null;
  /** Mijozda ilova bormi; `null` — backend yubormayapti. */
  hasApp: boolean | null;
  /** Ilovani o'rnatish imkoni bo'lmadi belgisi; yo'q yoki backend yubormasa `null`. */
  appUnavailable: AppUnavailableInfo | null;
  userId: number | null;
};

export type DeliveryInfo = {
  address: string | null;
  /**
   * Mahalla / qishloq (`delivery.locality`, `HUDUD_BACKEND_TALABLAR_3` §1) —
   * erkin matn, tuman bilan birga "Qo'qon sh. · Navbahor MFY" bo'lib
   * ko'rinadi. Eski javobda `null`.
   */
  locality: string | null;
  /**
   * Manzilni oxirgi marta kim o'zgartirgan (`delivery.address_changed_by`,
   * §2) — kartadagi "Manzil o'zgartirilgan (kuryer)" belgisi. Yo'q — `null`.
   */
  addressChangedBy: AddressChangedBy | null;
  region: string | null;
  /** Viloyatning o'qiladigan nomi (`region_display`); bo'lmasa `region`. */
  regionDisplay: string | null;
  note: string | null;
  contactName: string | null;
  contactPhone: string | null;
  /** Koordinata bo'lsa "Xaritada ochish" tugmasi chiqadi (§7.4). */
  lat: number | null;
  lng: number | null;
};

export type OrderItem = {
  id: string | null;
  productId: number | null;
  /** Sovg'a qatori — to'lanmaydi, ammo kuryer uni ham olib ketadi. */
  isGift: boolean;
  /** Sovg'a qaysi manbadan (`gift_source`); noma'lum qiymat — `null`. */
  giftSource: GiftSource | null;
  name: string;
  imageUrl: string | null;
  quantity: number;
  /**
   * Qator jami (`total`) — chegirma/aksiya qo'llangan, mijoz shu qator uchun
   * to'laydigani. Uchala ko'rinishning asosiy summasi shu.
   */
  price: number;
  /**
   * Sotilgan dona narxi (`unit_price`) — faqat server aytsa, aks holda `null`.
   *
   * ⚠️ `total / quantity` dan HISOBLANMAYDI va o'lchangan javobdagi `price`
   * ham EMAS: u ASL narx — chegirmali qatorda "dona 250 000 × 1 = jami
   * 125 000" degan o'ziga zid ko'rinish berardi.
   */
  serverUnitPrice: number | null;
  /** Asl dona narxi (`original_price`); chegirma/aksiya bo'lmasa `null`. */
  originalPrice: number | null;
  /** Katalog chegirmasi foizi (`discount_percent`, server); yo'q — `0`. */
  discountPercent: number;
  /** Buyurtma paytida muhrlangan taklif (`offer`); yo'q — `null`. */
  offer: ItemOffer | null;
};

export type CourierRef = {
  id: number;
  fullName: string;
  phone: string | null;
};

export type DeliveryWindow = "morning" | "afternoon" | "evening";

export const DELIVERY_WINDOWS: Array<{ value: DeliveryWindow; label: string }> =
  [
    { value: "morning", label: "Ertalab" },
    { value: "afternoon", label: "Kunduzi" },
    { value: "evening", label: "Kechqurun" },
  ];

export type DeliveryAttemptReason =
  "client_unavailable" | "wrong_address" | "client_refused" | "other";

export const ATTEMPT_REASONS: Array<{
  value: DeliveryAttemptReason;
  label: string;
}> = [
  { value: "client_unavailable", label: "Mijoz javob bermadi" },
  { value: "wrong_address", label: "Manzil noto'g'ri" },
  { value: "client_refused", label: "Mijoz rad etdi" },
  { value: "other", label: "Boshqa sabab" },
];

export function attemptReasonLabel(reason: string): string {
  return (
    ATTEMPT_REASONS.find((item) => item.value === reason)?.label ||
    reason ||
    "—"
  );
}

export type DeliveryAttempt = {
  id: number;
  reason: string;
  note: string | null;
  createdBy: string | null;
  createdAt: Date | null;
};

export type OrderTransferInfo = {
  id: number;
  status: string;
  fromFilial: FilialRef | null;
  toFilial: FilialRef | null;
  reason: string | null;
};

export type FilialRef = { id: number; name: string };

export type LogistOrdersPage = {
  orders: LogistOrder[];
  totalCount: number;
  hasNextPage: boolean;
  /** Filtrga tushgan **barcha** buyurtmalar summasi — joriy sahifa emas. */
  totalAmount: number | null;
  /**
   * O'sha buyurtmalar bo'yicha mijoz **to'laydigan** summa
   * (`total_payable_amount`, ball chegirmasidan keyin). Ustun sarlavhasi
   * shuni afzal ko'radi; backend bermasa `null`.
   */
  totalPayableAmount: number | null;
  /**
   * O'shalarning to'lanmagan qismi (`total_unpaid_amount`, bekor
   * qilinganlarsiz). Backend bermasa `null` — nol emas.
   */
  totalUnpaidAmount: number | null;
};

/**
 * Buyurtma statuslari — ranglar mavzu tokenlariga bog'langan.
 *
 * Har statusda IKKITA rang bor va ular almashtirilmaydi:
 *
 *   `color` — MATN va yorliq uchun. To'q, sirtga qarshi AA 4.5:1.
 *   `mark`  — BELGI uchun: ustun, umurtqa, nuqta, ulush chizig'i.
 *             Yorqin va to'yingan; matn sifatida ishlatilmaydi.
 *
 * Ilgari bitta qiymat ikkala rolni bajarardi. U matn kontrasti bo'yicha
 * tanlangani uchun to'q edi va grafiklarda sakkizta loyqa dog' bo'lib
 * ko'rinardi — aynan shu narsa interfeysni "iflos" qilardi.
 */
/**
 * Kanonik 5 bosqich — `02_DOMAIN_MODEL` §2.1, barcha loyihalar uchun bitta.
 *
 * `logistDraggable` — logist kartani sudray oladimi. `pending` ham: logist
 * mijoz tasdig'ini sabab bilan chetlab o'tishi mumkin (`02` §2.3).
 */
export const ORDER_STATUSES = [
  {
    value: "pending",
    label: "Kutilmoqda",
    labelRu: "Ожидает",
    color: "var(--order-pending)",
    mark: "var(--order-pending-mark)",
    logistDraggable: true,
  },
  {
    value: "confirmed",
    label: "Tasdiqlangan",
    labelRu: "Подтверждён",
    color: "var(--order-confirmed)",
    mark: "var(--order-confirmed-mark)",
    logistDraggable: true,
  },
  {
    value: "shipping",
    label: "Yo'lga chiqarilgan",
    labelRu: "Отправлен",
    color: "var(--order-shipping)",
    mark: "var(--order-shipping-mark)",
    logistDraggable: true,
  },
  {
    value: "delivered",
    label: "Yetkazilgan",
    labelRu: "Доставлен",
    color: "var(--order-delivered)",
    mark: "var(--order-delivered-mark)",
    logistDraggable: true,
  },
  {
    value: "cancelled",
    label: "Atkaz",
    labelRu: "Отказ",
    color: "var(--order-cancelled)",
    mark: "var(--order-cancelled-mark)",
    logistDraggable: true,
  },
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number]["value"];

/**
 * Logist ko'radigan bosqichlar (2026-10-29): `pending` logistga kerak emas —
 * u mijoz/operator bosqichi, logist faqat tasdiqlangandan keyin javob
 * beradi. `pending` `ORDER_STATUSES` da qoladi (eski javob o'qilsin), lekin
 * doska, filtr va statistikada chizilmaydi.
 */
export const LOGIST_STATUSES = ORDER_STATUSES.filter(
  (status) => status.value !== "pending",
);

/** Backend tanimagan qiymat yuborsa status shu bo'ladi — `pending` EMAS. */
export const UNKNOWN_STATUS = "unknown";

/** Logist ishlaydigan faol bosqichlar — SLA va ogohlantirishlar shularda. */
export const ACTIVE_STATUSES: readonly OrderStatus[] = [
  "confirmed",
  "shipping",
];

/**
 * Eski (bekor qilingan) qiymatlar → kanonik (`02` §2.1 migratsiyasi).
 * Faqat himoya: backend eski qiymat yubormasligi kerak, lekin yuborib
 * qolsa doska buzilmasin.
 */
const DEPRECATED_STATUS: Record<string, OrderStatus> = {
  confirming: "pending",
  paid: "confirmed",
  preparing: "confirmed",
};

export function isOrderStatus(value: string): value is OrderStatus {
  return ORDER_STATUSES.some((item) => item.value === value);
}

export function normalizeStatus(
  raw: string,
): OrderStatus | typeof UNKNOWN_STATUS {
  const key = raw.trim().toLowerCase();
  if (isOrderStatus(key)) return key;
  return DEPRECATED_STATUS[key] ?? UNKNOWN_STATUS;
}

const PENDING_REASON_LABELS: Record<PendingReason, string> = {
  awaiting_client_confirmation: "Mijoz tasdig'i kutilmoqda",
  awaiting_online_payment: "Onlayn to'lov kutilmoqda",
};

/** `pending` sababi chipi uchun; noma'lum kalit xom holida. */
export function pendingReasonLabel(reason: string | null | undefined): string {
  const key = (reason ?? "").trim();
  if (!key) return "";
  return PENDING_REASON_LABELS[key as PendingReason] ?? key;
}

const CONFIRMATION_CHANNEL_LABELS: Record<ConfirmationChannel, string> = {
  client_app: "Mijoz ilovada tasdiqladi",
  client_checkout: "Mijoz o'zi rasmiylashtirdi",
  app_slide: "Mijoz ilovada tasdiqladi",
  app_checkout: "Mijoz ilovadan o'zi buyurdi",
  phone: "Telefon orqali tasdiqlandi",
  crm_force: "Majburan tasdiqlandi (CRM)",
  doctor: "Shifokor yaratdi",
  payment_webhook: "Onlayn to'lov bilan tasdiqlandi",
  // Ilova zakazi 10/60 daqiqada o'zi tasdiqlanadi (backend 2026-10-30 §I).
  auto_confirm: "Avto tasdiq (tizim)",
};

export function confirmationChannelLabel(
  channel: string | null | undefined,
): string {
  const key = (channel ?? "").trim();
  if (!key) return "";
  return CONFIRMATION_CHANNEL_LABELS[key as ConfirmationChannel] ?? key;
}

/** Kartochka chipi uchun qisqa yozuvlar (tasdiqlangan dizayn). */
const CONFIRMATION_CHANNEL_SHORT: Record<ConfirmationChannel, string> = {
  client_app: "Mijoz tasdiqladi",
  client_checkout: "O'zi buyurdi",
  doctor: "Shifokor",
  app_slide: "Mijoz tasdiqladi",
  app_checkout: "O'zi buyurdi",
  phone: "Telefon orqali",
  crm_force: "Majburan (CRM)",
  payment_webhook: "Onlayn to'landi",
  auto_confirm: "Avto tasdiq",
};

export function confirmationShortLabel(
  channel: string | null | undefined,
): string {
  const key = (channel ?? "").trim();
  if (!key) return "";
  return CONFIRMATION_CHANNEL_SHORT[key as ConfirmationChannel] ?? key;
}

/**
 * Kim tasdiqlagani — `confirmation.confirmed_by` / WS `order_confirmed.by`.
 * Bu **tur** (`client|operator|admin|logist|system`), id EMAS (§4.2).
 */
const CONFIRMED_BY_LABELS: Record<string, string> = {
  client: "Mijoz ilovada",
  operator: "Operator",
  admin: "Admin",
  logist: "Logist",
  system: "Onlayn to'lov",
};

export function confirmedByLabel(by: string | null | undefined): string {
  const key = (by ?? "").trim().toLowerCase();
  if (!key) return "";
  return CONFIRMED_BY_LABELS[key] ?? key;
}

/** Mijoz o'zi tasdiqlagan/buyurgan — bayram chipi shu kanallarda. */
export function isClientConfirmation(
  channel: string | null | undefined,
): boolean {
  return (
    channel === "client_app" ||
    channel === "client_checkout" ||
    channel === "app_slide" ||
    channel === "app_checkout" ||
    channel === "payment_webhook"
  );
}

export function orderStatusInfo(status: string) {
  return (
    ORDER_STATUSES.find((item) => item.value === status) ?? {
      value: status,
      label: status === UNKNOWN_STATUS || !status ? "Noma'lum" : status,
      labelRu: status === UNKNOWN_STATUS || !status ? "Неизвестно" : status,
      color: "var(--ink-muted)",
      mark: "var(--ink-faint)",
      logistDraggable: false,
    }
  );
}

/**
 * Davr presetlari. **"Barchasi" birinchi turadi va sukut bo'yicha yoqiq.**
 *
 * Ilgari sukut "Bugun" edi va bu jimgina yo'qotishga olib kelardi: kecha
 * tushgan, hali yetkazilmagan buyurtma ekranda umuman ko'rinmasdi — logist
 * uni faqat davrni qo'lda kengaytirgandagina topardi. Ro'yxat to'liq
 * ochilib, keyin toraytiriladi; teskarisi emas.
 */
export const ORDER_PERIODS = [
  { value: "all", label: "Barchasi" },
  { value: "today", label: "Bugun" },
  { value: "month", label: "Oy" },
  { value: "year", label: "Yil" },
] as const;

/** Buyurtmalar ro'yxati va doskasi shu davr bilan ochiladi. */
export const DEFAULT_ORDER_PERIOD: OrderPeriod = "all";

export type OrderPeriod = (typeof ORDER_PERIODS)[number]["value"];

/**
 * Naqd to'lov — kuryer puli (COD) sifatida alohida belgilanadi.
 *
 * `manual` ham shu ro'yxatda: backendda "yetkazishda to'lanadi" qoidasi
 * `payment_method in ("cash", "manual")` bo'yicha ishlaydi (xorijiy
 * buyurtmalar `manual` bilan keladi). Uni tashlab ketish naqd buyurtmani
 * "to'lanmagan karta" qilib ko'rsatardi.
 */
export function isCashPayment(method: string | null | undefined): boolean {
  const value = (method ?? "").trim().toLowerCase();
  return (
    value === "cash" ||
    value === "manual" ||
    value === "naqd" ||
    value === "naqd pul"
  );
}

/**
 * To'lov turining o'qiladigan nomi.
 *
 * Backend mashina kalitini qaytaradi (`cash`, `card`, `click`…), ro'yxatda esa
 * ilgari o'sha kalitning o'zi chiqarib qo'yilardi — logist ekranda `card` deb
 * o'qirdi. Noma'lum kalit yashirilmaydi, xom holida ko'rinadi: backend yangi
 * usul qo'shsa jimgina yo'qolgandan ko'ra ko'ringani yaxshi.
 */
const PAYMENT_LABELS: Record<string, string> = {
  // Backenddagi **usul** to'plami (`payment_method`): to'rtta kalit.
  cash: "Naqd",
  card: "Karta",
  cashback: "Keshbek",
  manual: "Qo'lda",
  // **Provayder** to'plami (`payment_info.provider`) — usul emas, lekin
  // ba'zi eski javoblarda usul o'rnida ham uchraydi.
  click: "Click",
  click_merchant: "Click",
  payme: "Payme",
  payme_merchant: "Payme",
  uzum: "Uzum",
  paynet: "Paynet",
  transfer: "O'tkazma",
  online: "Onlayn",
  // Eski, tarjima qilingan kalitlar — arxiv buyurtmalarda qoladi.
  naqd: "Naqd",
  "naqd pul": "Naqd",
  karta: "Karta",
};

export function paymentMethodLabel(method: string | null | undefined): string {
  const key = (method ?? "").trim().toLowerCase();
  if (!key) return "";
  return PAYMENT_LABELS[key] ?? method!.trim();
}

/**
 * Provayder nomi: `click_merchant` → "Click".
 *
 * Backend bu maydonni **xom** qaytaradi va u ro'yxatdan tashqarida bo'lishi
 * mumkin, shuning uchun tanilmagan qo'shimchalar (`_merchant`, `_provider`)
 * kesiladi va shundan keyin ham topilmasa qiymat o'zi ko'rsatiladi —
 * jimgina yo'qolgandan ko'ra ko'ringani yaxshi.
 */
export function paymentProviderLabel(
  provider: string | null | undefined,
): string {
  const key = (provider ?? "").trim().toLowerCase();
  if (!key) return "";
  const base = key.replace(/_(merchant|provider|gateway)$/, "");
  return PAYMENT_LABELS[key] ?? PAYMENT_LABELS[base] ?? provider!.trim();
}

/**
 * To'lov turi bo'yicha filtr chiplari.
 *
 * Bitta chip bir nechta backend kalitini yuboradi (`payment_method=cash,manual`):
 * backend usullarni birlashtirmadi, `manual` esa naqdning bir turi
 * (xorijiy buyurtma) — logist uchun ular bitta tugma.
 */
export const PAYMENT_METHOD_FILTERS = [
  { value: "card", label: "Karta", methods: ["card"] },
  { value: "cash", label: "Naqd", methods: ["cash", "manual"] },
  { value: "cashback", label: "Keshbek", methods: ["cashback"] },
] as const;

export type PaymentMethodFilter =
  (typeof PAYMENT_METHOD_FILTERS)[number]["value"];

/**
 * To'lov holati bo'yicha filtr (`?payment_state=`, 2026-10-01 C §11.2).
 *
 * "To'lanmagan" birinchi turadi — logist aynan shu ro'yxatni qidiradi.
 * Server `unpaid` dan qaytarilganlarni o'zi chiqarib tashlaydi (§11.3):
 * hech qachon kelmaydigan pul uchun qo'ng'iroq qilinmaydi.
 */
export const PAYMENT_STATE_FILTERS = [
  { value: "unpaid", label: "To'lanmagan" },
  { value: "with_courier", label: "Pul kuryerda" },
  { value: "paid", label: "To'langan" },
  { value: "refunded", label: "Qaytarilgan" },
] as const;

/** Chip qiymatidan backend kalitlariga; noma'lum chip — filtrsiz. */
export function paymentMethodKeys(value: string | null): string[] {
  return [
    ...(PAYMENT_METHOD_FILTERS.find((item) => item.value === value)?.methods ??
      []),
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// To'lov holati — buyurtma statusidan ALOHIDA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ⚠️ Eng muhim qoida: **to'lov holati buyurtma statusidan chiqarilmaydi.**
 *
 * `02_DOMAIN_MODEL` §2.2: `payment.status` statusdan mustaqil maydon
 * (`not_selected · cod_pending · online_pending · paid · refunded ·
 * partially_refunded`). Pul haqidagi haqiqat faqat to'lov maydonlaridan
 * olinadi: `is_paid`, `payment_status`, `paid_at`.
 *
 * Backend ularni hali yubormasa holat "noma'lum" bo'lib qoladi —
 * "to'langan" DEB TAXMIN QILINMAYDI. Kontrakt: `../mehrigiyo_platform_tz/
 * 03_BACKEND_TZ.md` §1–§3. Eski backend kalitlari (`pending`, `success`…)
 * ham o'qiladi — arxiv buyurtmalar uchun.
 */
export type PaymentState =
  | "paid"
  | "partial"
  | "unpaid"
  | "cod"
  /** Mijoz to'lagan, pul kuryerda — haftalik yig'imgacha kassaga tushmagan. */
  | "with_courier"
  | "refunded"
  /** Buyurtma bekor, lekin pul BIZDA — qaytarish kutilmoqda (§8.3). */
  | "refund_due"
  | "cancelled"
  | "unknown";

export type PaymentView = {
  state: PaymentState;
  /** Holat matni: "To'langan", "To'lanmagan", "Yetkazishda olinadi"… */
  label: string;
  /** Rang roli — komponent shundan sinf tanlaydi. */
  tone: "ok" | "warn" | "gold" | "muted";
  /** To'lov kutilayotgan pul (karta uchun) — ro'yxatda ajratib ko'rsatiladi. */
  needsAttention: boolean;
};

/** Backendlarda uchraydigan "to'landi" kalitlari. */
const PAID_KEYS = new Set([
  "paid",
  "success",
  "successful",
  "succeeded",
  "completed",
  "complete",
  "confirmed",
  "done",
]);

/**
 * "Hali to'lanmadi" kalitlari — bularda holat aniq, noma'lum emas.
 *
 * `cancelled` va `refunded` bu ro'yxatda EMAS: ular alohida holat. Ilgari
 * shu yerda turardi va bekor qilingan buyurtma qizil "To'lanmagan" bo'lib,
 * kuryerning "PUL OLINADI" ro'yxatiga tushib qolardi.
 */
const UNPAID_KEYS = new Set([
  "unpaid",
  "not_paid",
  "pending",
  "waiting",
  "processing",
  "created",
  "new",
  "failed",
  "error",
  "expired",
]);

/** Pul qaytarilgan — tushgan, keyin qaytib ketgan. */
const REFUNDED_KEYS = new Set(["refunded", "refund", "reversed"]);

/** To'lov bekor qilingan — pul kutilmaydi. */
const CANCELLED_KEYS = new Set(["cancelled", "canceled", "voided"]);

export type PaymentFacts = Pick<
  LogistOrder,
  | "isPaid"
  | "paymentStatus"
  | "paidAt"
  | "paidAmount"
  | "paymentMethod"
  // Qisman to'lov to'lanadigan summaga nisbatan o'lchanadi, mol summasiga
  // emas — aks holda ball ishlatgan mijoz to'liq to'lasa ham "qisman"
  // bo'lib ko'rinardi (`OPERATOR_BALL_FRONTEND.md` §1).
  | "payableAmount"
> &
  /**
   * Buyurtma statusi — faqat "bekor + to'langan" holatini ajratish uchun
   * (`FLUTTER_ORDER_PIPELINE_V2` §8.4.2). Pul holati undan HISOBLANMAYDI.
   */
  Partial<Pick<LogistOrder, "status">>;

/**
 * Yangi `payment.status` enum'i (`02` §2.2) — bir ma'noli, taxminsiz.
 * `paid` va `refunded` eski kalitlar bilan bir xil, shuning uchun bu yerda
 * emas, umumiy mantiqda.
 */
const PAYMENT_STATUS_VIEWS: Record<string, PaymentView> = {
  /*
   * Naqd buyurtma yetkazildi: mijoz to'lagan (`is_paid=true`), lekin pul
   * kuryerda — haftalik yig'imda logist qabul qilgach `paid` bo'ladi
   * (`KURYER_SAYTLAR_LOGIST_OPERATOR.md` §1.1). "To'langan" deyilsa kassa
   * bilan mos kelmaydi.
   */
  with_courier: {
    state: "with_courier",
    label: "Pul kuryerda",
    tone: "gold",
    needsAttention: false,
  },
  cod_pending: {
    state: "cod",
    label: "Naqd · olganda",
    tone: "gold",
    needsAttention: false,
  },
  online_pending: {
    state: "unpaid",
    label: "Onlayn kutilmoqda",
    tone: "warn",
    needsAttention: true,
  },
  not_selected: {
    state: "unknown",
    label: "To'lov usuli tanlanmagan",
    tone: "muted",
    needsAttention: false,
  },
  partially_refunded: {
    state: "refunded",
    label: "Qisman qaytarilgan",
    tone: "muted",
    needsAttention: false,
  },
};

/** `payment.status` kalitining o'qiladigan nomi — audit va filtrlar uchun. */
export function paymentStatusLabel(status: string | null | undefined): string {
  const key = (status ?? "").trim().toLowerCase();
  if (!key) return "";
  if (PAYMENT_STATUS_VIEWS[key]) return PAYMENT_STATUS_VIEWS[key].label;
  if (PAID_KEYS.has(key)) return "To'langan";
  if (REFUNDED_KEYS.has(key)) return "Qaytarilgan";
  if (CANCELLED_KEYS.has(key)) return "Bekor qilingan";
  if (UNPAID_KEYS.has(key)) return "To'lanmagan";
  return status!.trim();
}

export function paymentView(order: PaymentFacts): PaymentView {
  const status = (order.paymentStatus ?? "").trim().toLowerCase();
  const cash = isCashPayment(order.paymentMethod);

  /*
   * Bekor qilingan, lekin pul kelgan buyurtma — `payment_status` ataylab
   * `paid` bo'lib qoladi (§8.3): Payme'da sotuvchi pulni o'zi qaytara
   * olmaydi, qaytarish qo'lda. "Pul qaytarildi" ham, "To'langan" ham
   * yolg'on bo'lardi — bu bajarilishi kerak bo'lgan ish.
   */
  if (
    order.status === "cancelled" &&
    (status === "paid" ||
      status === "partially_refunded" ||
      (status === "" && order.isPaid === true))
  ) {
    return {
      state: "refund_due",
      label: "Qaytarilishi kerak",
      tone: "warn",
      needsAttention: false,
    };
  }

  // Yangi enum bir ma'noli — `is_paid` bilan solishtirib o'tirmaymiz.
  const explicit = PAYMENT_STATUS_VIEWS[status];
  if (explicit) return explicit;

  const paid =
    order.isPaid === true ||
    (order.isPaid === null && (order.paidAt !== null || PAID_KEYS.has(status)));

  if (paid) {
    return {
      state: "paid",
      label: "To'langan",
      tone: "ok",
      needsAttention: false,
    };
  }

  /*
   * Qaytarilgan va bekor qilingan to'lov — "to'lanmagan" EMAS: ularda
   * kuryerdan ham, kassadan ham pul kutilmaydi. Shuning uchun ular naqd
   * tekshiruvidan OLDIN turadi: bekor qilingan naqd buyurtma "Yetkazishda
   * olinadi" bo'lib ko'rinmasligi kerak.
   */
  if (REFUNDED_KEYS.has(status)) {
    return {
      state: "refunded",
      label: "Qaytarilgan",
      tone: "muted",
      needsAttention: false,
    };
  }

  if (CANCELLED_KEYS.has(status)) {
    return {
      state: "cancelled",
      label: "Bekor qilingan",
      tone: "muted",
      needsAttention: false,
    };
  }

  if (
    order.paidAmount !== null &&
    order.paidAmount > 0 &&
    order.paidAmount < order.payableAmount
  ) {
    return {
      state: "partial",
      label: `Qisman: ${formatSom(order.paidAmount)}`,
      tone: "warn",
      needsAttention: true,
    };
  }

  // Naqd — pul kuryerda olinadi, ya'ni "to'lanmagan" emas, "hali navbati
  // kelmagan". Uni qizil qilib ko'rsatish shovqin bo'lardi.
  if (cash) {
    return {
      state: "cod",
      label: "Yetkazishda olinadi",
      tone: "gold",
      needsAttention: false,
    };
  }

  if (order.isPaid === false || UNPAID_KEYS.has(status)) {
    return {
      state: "unpaid",
      label: "To'lanmagan",
      tone: "warn",
      needsAttention: true,
    };
  }

  return {
    state: "unknown",
    label: "To'lov tasdiqlanmagan",
    tone: "muted",
    needsAttention: false,
  };
}

/**
 * Provayder va tranzaksiya raqami: "Click · 66f0…" — "kassadan tekshiring"
 * degani shu ikki qiymat bilan bajariladi.
 *
 * Bog'liqlik **tranzaksiyaga**: `payment_info.provider` kartali buyurtmada
 * to'lovsiz ham to'lib turadi (`click_merchant`, `transaction_id: null`) va
 * uni yolg'iz ko'rsatish "pul Click orqali tushgan" degan yolg'on taassurot
 * berardi — ayniqsa buyurtma naqdga o'tgandan keyin.
 */
export function paymentReference(
  order: Pick<LogistOrder, "paymentProvider" | "paymentTransactionId">,
): string | null {
  if (order.paymentTransactionId === null) return null;

  const provider = paymentProviderLabel(order.paymentProvider);
  return provider
    ? `${provider} · ${order.paymentTransactionId}`
    : order.paymentTransactionId;
}

/** To'lov turi + holati bitta satrda: "Karta · To'lanmagan". */
export function paymentSummary(order: PaymentFacts): string {
  const method = paymentMethodLabel(order.paymentMethod);
  const view = paymentView(order);
  return method ? `${method} · ${view.label}` : view.label;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parserlar
// ─────────────────────────────────────────────────────────────────────────────

/** `status_display` oddiy satr ham, `{uz, ru, en}` obyekti ham bo'lishi mumkin. */
function mapStatusDisplay(raw: unknown): string | null {
  if (typeof raw === "string") return raw || null;
  if (isRecord(raw)) {
    return (
      asOptionalString(raw.uz) ??
      asOptionalString(raw.ru) ??
      asOptionalString(raw.en) ??
      asOptionalString(Object.values(raw)[0])
    );
  }
  return null;
}

/**
 * Rasm manzilini topadi.
 *
 * Backend uni to'rt xil shaklda qaytaradi va biri ham kafolatlanmagan:
 * qator ustida yassi satr (`medicine_image`), ichma-ich obyektda
 * (`medicine.image` — mobil ilova aynan shuni o'qiydi), obyekt ichida
 * (`{url}`), yoki massiv bo'lib (`images[]`). Ilgari faqat ikkitasi
 * o'qilardi va logist ekranida mahsulot rasmsiz — quruq matn bo'lib
 * ko'rinardi. Topilmagani `""`.
 */
function pickImage(...candidates: unknown[]): string {
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const found = pickImage(...candidate);
      if (found) return found;
      continue;
    }
    if (isRecord(candidate)) {
      const found = pickImage(
        candidate.url,
        candidate.image,
        candidate.photo,
        candidate.src,
        candidate.file,
      );
      if (found) return found;
      continue;
    }
    const text = asString(candidate).trim();
    if (text) return text;
  }
  return "";
}

function mapOrderItem(raw: unknown): OrderItem {
  const json = asRecord(raw);
  const product = isRecord(json.medicine)
    ? json.medicine
    : isRecord(json.product)
      ? json.product
      : {};

  const image = pickImage(
    json.medicine_image,
    json.image,
    json.photo,
    json.image_url,
    json.product_image,
    product.image,
    product.photo,
    product.image_url,
    product.images,
    product.medicine_image,
  );

  // Qator jami. O'lchangan operator serializeri (2026-10-09) `total` beradi
  // va u yerda `price` — ASL dona narxi; `02` §5 shaklida `total` yo'q,
  // `price` esa jami (`unit_price` yonida). Pul hech qachon hisoblanmaydi:
  // na `price × quantity`, na `total / quantity` (`item-pricing.ts`).
  const total = asNumber(json.total ?? json.total_price ?? json.price);

  return {
    id: asOptionalString(json.id),
    isGift: asBool(json.is_gift),
    giftSource: asGiftSource(json.gift_source),
    // O'lchangan operator qatorida `medicine` — obyekt emas, FK id (son).
    productId: asOptionalInt(
      json.medicine_id ?? json.product_id ?? product.id ?? (isRecord(json.medicine) ? null : json.medicine),
    ),
    name:
      asString(json.medicine_name) ||
      asString(product.title) ||
      asString(product.name) ||
      asString(json.product_name),
    imageUrl: image ? resolveMediaUrl(image) : null,
    quantity: asInt(json.quantity, 1),
    price: total,
    serverUnitPrice: asOptionalNumber(json.unit_price),
    originalPrice: asOptionalNumber(json.original_price),
    discountPercent: asPercent(json.discount_percent),
    offer: asItemOffer(json.offer),
  };
}

/**
 * Manzil bloki ikki shaklda keladi: eski `delivery_info {address, region…}`
 * yoki yangi `delivery {address_text, region, region_display…}` (`02` §5).
 * Ikkalasi ham bitta shaklga tushadi; hech biri bo'lmasa `null`.
 */
function mapDeliveryInfo(raw: unknown): DeliveryInfo | null {
  if (isRecord(raw)) {
    const info: DeliveryInfo = {
      address: asOptionalString(raw.address_text ?? raw.address),
      locality: asOptionalString(raw.locality),
      addressChangedBy: asAddressChangedBy(raw.address_changed_by),
      region: asOptionalString(raw.region),
      regionDisplay: asOptionalString(raw.region_display),
      note: asOptionalString(raw.note),
      contactName: asOptionalString(raw.contact_name),
      contactPhone: asOptionalString(raw.contact_phone),
      lat: asOptionalNumber(raw.lat),
      lng: asOptionalNumber(raw.lng),
    };
    return Object.values(info).some((value) => value !== null) ? info : null;
  }
  // API ba'zan oddiy manzil satrini qaytaradi, masalan "Toshkent".
  const address = asOptionalString(raw);
  return address
    ? {
        address,
        locality: null,
        addressChangedBy: null,
        region: null,
        regionDisplay: null,
        note: null,
        contactName: null,
        contactPhone: null,
        lat: null,
        lng: null,
      }
    : null;
}

/**
 * Manzil uch joydan yig'iladi: `delivery_info` (eski), `delivery` (`02` §5)
 * va buyurtmaning yuqori darajasi (`region`). Ilgari faqat birinchisi
 * o'qilardi — operator CRM'da faqat viloyatni tanlasa (`delivery.region`),
 * `delivery_info` esa manzilsiz kelsa, viloyat kartada umuman chiqmasdi.
 * Viloyat nomi server bermasa mahalliy lug'atdan olinadi.
 */
function mergeDeliveryInfo(json: Record<string, unknown>): DeliveryInfo | null {
  const sources = [json.delivery_info, json.delivery]
    .map(mapDeliveryInfo)
    .filter((info): info is DeliveryInfo => info !== null);
  const first = <K extends keyof DeliveryInfo>(
    key: K,
  ): DeliveryInfo[K] | null =>
    sources.find((info) => info[key] !== null)?.[key] ?? null;
  const region = first("region") ?? asOptionalString(json.region);
  const regionDisplay =
    first("regionDisplay") ??
    asOptionalString(json.region_display) ??
    (region ? regionLabel(region) : null);
  const info: DeliveryInfo = {
    address: first("address"),
    locality: first("locality"),
    addressChangedBy: first("addressChangedBy"),
    region,
    regionDisplay,
    note: first("note"),
    contactName: first("contactName"),
    contactPhone: first("contactPhone"),
    lat: first("lat"),
    lng: first("lng"),
  };
  return Object.values(info).some((value) => value !== null) ? info : null;
}

/**
 * Yetkazish sanasi `YYYY-MM-DD` ko'rinishida saqlanadi. Server sanani
 * datetime qilib yuborsa (`2026-10-02T19:00:00Z`) tahrir formasi bo'sh
 * ochilib, logist sanani qayta kiritishga majbur bo'lardi — mahalliy kunga
 * keltiriladi.
 */
export function toDateKey(raw: unknown): string | null {
  const text = asOptionalString(raw)?.trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return /^(\d{4}-\d{2}-\d{2})/.exec(text)?.[1] ?? null;
  }
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function mapPersonRef(raw: unknown): PersonRef | null {
  if (!isRecord(raw)) return null;
  const name = asString(raw.name ?? raw.full_name).trim();
  const id = asOptionalInt(raw.id);
  if (!name && id === null) return null;
  return { id, name, phone: asOptionalString(raw.phone) };
}

function mapCreator(raw: unknown): OrderCreator | null {
  if (!isRecord(raw)) return null;
  const kind = asOptionalString(raw.kind);
  if (!kind) return null;
  // "Mijoz o'zi" yaratgan buyurtmada ism bo'lmasligi mumkin — tur baribir muhim.
  const person = mapPersonRef(raw) ?? {
    id: null,
    name: "",
    phone: asOptionalString(raw.phone),
  };
  return { ...person, kind: kind.toLowerCase() };
}

const PENDING_REASONS = new Set<PendingReason>([
  "awaiting_client_confirmation",
  "awaiting_online_payment",
]);

export function mapPendingReason(raw: unknown): PendingReason | null {
  const value = asOptionalString(raw);
  return value && PENDING_REASONS.has(value as PendingReason)
    ? (value as PendingReason)
    : null;
}

const CONFIRMATION_CHANNELS = new Set<ConfirmationChannel>([
  "client_app",
  "client_checkout",
  "doctor",
  "app_slide",
  "app_checkout",
  "phone",
  "crm_force",
  "payment_webhook",
]);

/**
 * `confirmed_by` ikki shaklda keladi: eski backend — tur satri
 * (`"operator"`), yangisi — `{type, id, name}` obyekti.
 */
function mapConfirmer(raw: unknown): OrderConfirmer | null {
  if (isRecord(raw)) {
    const type =
      asOptionalString(raw.type ?? raw.kind ?? raw.role)?.toLowerCase() ?? null;
    const name = asString(raw.name ?? raw.full_name).trim();
    const id = asOptionalInt(raw.id);
    if (!type && !name && id === null) return null;
    return { type, id, name };
  }
  const type = asOptionalString(raw)?.toLowerCase() ?? null;
  return type ? { type, id: null, name: "" } : null;
}

/**
 * `confirmation` bloki (2026-10-01 §4.5, §10.2). Kalitlar almashtirilmagan,
 * yangilari YONIDA: `confirmed_by` — eski TUR satri, obyekt —
 * `confirmed_by_party {type, id, name}` (`name` `null` bo'lishi mumkin);
 * `channel` — xom baza qiymati, `channel_code` — panel enumi. Yangisi ustun,
 * eskisi zaxira. `reason`/`note` hozircha deyarli doim `null` (§10.16).
 */
export function mapConfirmation(raw: unknown): OrderConfirmation | null {
  if (!isRecord(raw)) return null;
  const channel =
    asOptionalString(raw.channel_code) ?? asOptionalString(raw.channel);
  const party = mapConfirmer(raw.confirmed_by_party);
  const legacy = mapConfirmer(raw.confirmed_by);
  const confirmer = party
    ? { ...party, type: party.type ?? legacy?.type ?? null }
    : legacy;
  return {
    required: asBool(raw.required),
    confirmedAt: parseDate(raw.confirmed_at),
    confirmedBy: confirmer?.type ?? null,
    confirmer,
    channel:
      channel && CONFIRMATION_CHANNELS.has(channel as ConfirmationChannel)
        ? (channel as ConfirmationChannel)
        : null,
    reason: asOptionalString(raw.reason ?? raw.confirm_reason),
    note: asOptionalString(raw.note),
    display: asOptionalString(raw.display ?? raw.channel_display),
  };
}

export function mapAppUnavailable(raw: unknown): AppUnavailableInfo | null {
  if (!isRecord(raw)) return null;
  const setBy = isRecord(raw.set_by)
    ? {
        id: asOptionalInt(raw.set_by.id),
        name: asString(raw.set_by.name ?? raw.set_by.full_name).trim(),
        role: asOptionalString(raw.set_by.role)?.toLowerCase() ?? null,
      }
    : null;
  return {
    reason: asOptionalString(raw.reason),
    note: asOptionalString(raw.note),
    setBy,
    setAt: parseDate(raw.set_at),
  };
}

export function mapCancelInfo(raw: unknown): OrderCancelInfo | null {
  if (!isRecord(raw)) return null;
  const by = isRecord(raw.by)
    ? asOptionalString(raw.by.name ?? raw.by.full_name)
    : asOptionalString(raw.by);
  const byType = isRecord(raw.by)
    ? asOptionalString(raw.by.type ?? raw.by.kind)
    : asOptionalString(raw.by_type);
  return {
    reason: asOptionalString(raw.reason),
    note: asOptionalString(raw.note),
    by,
    byType: byType?.toLowerCase() ?? null,
    at: parseDate(raw.at),
  };
}

/**
 * Telefonni solishtirish kaliti — faqat raqamlar.
 *
 * Backend raqamni `+` siz saqlaydi (`998901234567`, §9.1), eski yozuvlar va
 * qo'lda kiritilganlar esa `+998 90 …` bo'lishi mumkin. Kalitsiz solishtirilsa
 * bitta raqam ikki marta ko'rinadi.
 */
export function phoneKey(phone: string | null | undefined): string {
  return (phone ?? "").replace(/\D/g, "");
}

/** Telefonlar — satrlar ham, `{number}` obyektlari ham; bo'shlari va takrorlari tashlanadi. */
function mapPhones(raw: unknown): string[] {
  const seen = new Set<string>();
  const phones: string[] = [];
  for (const item of asArray(raw)) {
    const phone = (
      isRecord(item) ? asString(item.number) : asString(item)
    ).trim();
    const key = phoneKey(phone);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    phones.push(phone);
  }
  return phones;
}

function mapClient(raw: unknown): ClientInfo {
  const json = asRecord(raw);
  const phones = mapPhones(json.phones);
  const primary =
    asOptionalString(json.phone ?? json.primary_phone) ?? phones[0] ?? "";
  // Asosiy raqam ro'yxatning boshida turadi — `PhoneList` birinchisini ko'rsatadi.
  const ordered = primary
    ? [
        primary,
        ...phones.filter((phone) => phoneKey(phone) !== phoneKey(primary)),
      ]
    : phones;

  return {
    phone: primary,
    fullName: asString(json.full_name ?? json.name),
    phones: ordered,
    orderedForPhone: asOptionalString(json.ordered_for_phone),
    hasApp: asOptionalBool(json.has_app),
    appUnavailable: mapAppUnavailable(json.app_unavailable),
    userId: asOptionalInt(json.user_id),
  };
}

export function mapCourierRef(raw: unknown): CourierRef | null {
  if (!isRecord(raw)) return null;
  const id = asOptionalInt(raw.id);
  if (id === null) return null;
  return {
    id,
    fullName: asString(raw.full_name ?? raw.name),
    phone: asOptionalString(raw.phone),
  };
}

export function mapFilialRef(raw: unknown): FilialRef | null {
  if (!isRecord(raw)) return null;
  const id = asOptionalInt(raw.id);
  if (id === null) return null;
  return { id, name: asString(raw.name) };
}

function mapDeliveryAttempt(raw: unknown): DeliveryAttempt {
  const json = asRecord(raw);
  return {
    id: asInt(json.id),
    reason: asString(json.reason),
    note: asOptionalString(json.note),
    createdBy: asOptionalString(json.created_by),
    createdAt: parseDate(json.created_at),
  };
}

function mapOrderTransferInfo(raw: unknown): OrderTransferInfo | null {
  if (!isRecord(raw)) return null;
  const id = asOptionalInt(raw.id);
  if (id === null) return null;
  return {
    id,
    status: asString(raw.status),
    fromFilial: mapFilialRef(raw.from_filial),
    toFilial: mapFilialRef(raw.to_filial),
    reason: asOptionalString(raw.reason),
  };
}

/** Teglar — faqat satrlar, bo'shlari tashlanadi (§4.13). */
function mapTags(raw: unknown): string[] {
  return asArray(raw)
    .map((item) => asString(item).trim())
    .filter((tag) => tag.length > 0);
}

function mapDeliveryWindow(raw: unknown): DeliveryWindow | null {
  const value = asOptionalString(raw);
  if (value === "morning" || value === "afternoon" || value === "evening") {
    return value;
  }
  return null;
}

/**
 * To'lov haqiqati. Maydonlar buyurtmaning o'zida ham, `payment_info`
 * ichida ham kelishi mumkin (mijoz ilovasi `payment_info` ni o'qiydi) —
 * ikkalasi ham qaraladi. Hech biri bo'lmasa hammasi `null` bo'lib qoladi
 * va UI "noma'lum" deb ko'rsatadi, "to'langan" deb emas.
 */
function mapPayment(
  json: Record<string, unknown>,
): Pick<
  LogistOrder,
  | "isPaid"
  | "paymentStatus"
  | "paidAt"
  | "paidAmount"
  | "paymentProvider"
  | "paymentTransactionId"
> {
  // Yangi kontrakt (`02` §2.2) — `payment {...}`; eski — `payment_info`.
  const info = asRecord(json.payment_info);
  const payment = asRecord(json.payment);

  return {
    /*
     * `payment.is_paid` (= `payment_status == "paid"`) — yangi va bir
     * ma'noli; yuqori darajadagi eski `is_paid` statusdan hisoblanadi va
     * faqat zaxira (`FLUTTER_ORDER_PIPELINE_V2` §8.1).
     */
    isPaid:
      payment.is_paid === undefined &&
      typeof payment.status === "string" &&
      payment.status
        ? // Yagona haqiqat — `payment.status == "paid"` (2026-10-01 §9.1).
          payment.status === "paid" || payment.status === "with_courier"
        : asOptionalBool(
            payment.is_paid ??
              json.is_paid ??
              json.paid ??
              info.is_paid ??
              info.paid,
          ),
    paymentStatus: asOptionalString(
      payment.status ?? json.payment_status ?? info.status ?? info.state,
    ),
    paidAt: parseDate(payment.paid_at ?? json.paid_at ?? info.paid_at),
    paidAmount: asOptionalNumber(
      payment.paid_amount ??
        json.paid_amount ??
        info.paid_amount ??
        info.amount,
    ),
    paymentProvider: asOptionalString(
      payment.provider ?? info.provider ?? json.payment_provider,
    ),
    paymentTransactionId: asOptionalString(
      payment.transaction_id ?? info.transaction_id ?? json.transaction_id,
    ),
  };
}

/**
 * Ball chegirmasi (`OPERATOR_BALL_FRONTEND.md` §1).
 *
 * Eski backend `payable_amount` yubormaydi — o'shanda to'lanadigan summa
 * mol summasiga teng. Nolga tushib qolmasligi uchun aynan `??` ishlatiladi:
 * to'liq ball bilan to'langan buyurtmada `payable_amount` haqiqatan `0`
 * bo'ladi va u saqlanib qolishi kerak.
 */
function mapPoints(
  json: Record<string, unknown>,
  totalAmount: number,
): Pick<LogistOrder, "payableAmount" | "pointsUsed" | "pointsDiscount"> {
  return {
    payableAmount: asOptionalNumber(json.payable_amount) ?? totalAmount,
    pointsUsed: asInt(json.points_used),
    pointsDiscount: asNumber(json.points_discount),
  };
}

export function mapLogistOrder(raw: unknown): LogistOrder {
  const json = asRecord(raw);
  const items = asArray(json.items);
  const totalAmount = asNumber(json.total_amount);
  const rawStatus = asString(json.status);
  const status = normalizeStatus(rawStatus);
  // Yangi kontraktda yetkazish maydonlari `delivery {...}` ichida (`02` §5);
  // eski javobda ular buyurtmaning o'zida. Ikkalasi ham o'qiladi.
  const delivery = asRecord(json.delivery);
  const crmBlock = asRecord(json.crm);
  const payment = asRecord(json.payment);

  return {
    id: asString(json.id),
    orderNumber: asString(json.order_number),
    status,
    /*
     * Zaxira — mahalliy tarjima, mashina statusi EMAS: backend
     * `status_display` yubormasa nishonchada `confirmed` kabi kalit chiqib
     * qolmasin. Eski (normalizatsiya qilingan) status kelsa backend yorlig'i
     * ham eski — o'shanda faqat mahalliy yorliq ishlatiladi.
     */
    statusDisplay: isOrderStatus(status)
      ? /*
         * Yopiq to'plam — mahalliy yorliq ustun: server matni (`uz`) ustun
         * sarlavhasidan farq qiladi ("Yetkazilmoqda" / "Yo'lga chiqarilgan")
         * va tarjima qatlamida qolib ketadi. Server matni faqat tanilmagan
         * status uchun.
         */
        orderStatusInfo(status).label
      : (mapStatusDisplay(json.status_display) ??
        orderStatusInfo(status).label),
    totalAmount,
    ...mapPoints(json, totalAmount),
    itemCount: asInt(json.item_count, items.length),
    // `line_count` — qatorlar soni; eski javobda yo'q, o'shanda `null`.
    lineCount: asOptionalInt(json.line_count),
    customerNotes: asOptionalString(json.customer_notes ?? crmBlock.customer_notes),
    deliveryInfo: mergeDeliveryInfo(json),
    geocode: mapOrderGeocode(delivery),
    needsReview: mapNeedsReview(json),
    client: mapClient(json.client),
    items: items.map(mapOrderItem),
    paymentMethod: asOptionalString(
      payment.method ?? json.payment_method ?? json.payment_type,
    ),
    ...mapPayment(json),
    source: asString(json.source),
    createdAt: parseDate(json.created_at),

    courier: mapCourierRef(json.courier ?? delivery.courier),
    deliveryScheduledAt: asOptionalString(
      json.delivery_scheduled_at ?? delivery.scheduled_at,
    ),
    // Yangi javob: `delivery.window` (backend 2026-10-28 §2), eski kalitlar — zaxira.
    deliveryWindow: mapDeliveryWindow(
      delivery.window ?? json.delivery_window ?? delivery.delivery_window,
    ),
    logistNote: asOptionalString(json.logist_note),
    deliveryAttempts: asArray(json.delivery_attempts ?? delivery.attempts).map(
      mapDeliveryAttempt,
    ),
    deliveredAt: parseDate(json.delivered_at ?? delivery.delivered_at),
    deliveryStage: mapDeliveryStage(json.delivery_stage),
    deliveryProof: mapDeliveryProof(json.delivery_proof),
    routePosition: asOptionalInt(json.route_position),
    transfer: mapOrderTransferInfo(json.transfer),
    tags: mapTags(json.tags),
    tagsFromServer: Array.isArray(json.tags),

    pendingReason: mapPendingReason(json.pending_reason),
    confirmation: mapConfirmation(json.confirmation),
    cancel: mapCancelInfo(json.cancel),
    createdBy: mapCreator(json.created_by),
    onBehalfOf: mapPersonRef(json.on_behalf_of),
    responsibleOperator: mapPersonRef(json.responsible_operator),
    doctor: mapPersonRef(json.doctor),
    /*
     * CRM maydonlari `crm{}` blokida (backend 2026-10-28 §2: operator
     * yaratishda yuborgani saqlanadi va shu yerda qaytadi). Eski javob —
     * yuqori darajada.
     */
    extraProductNote: asOptionalString(crmBlock.extra_product_note ?? json.extra_product_note),
    giftComment: asOptionalString(crmBlock.gift_comment ?? json.gift_comment),
    boxCount: asOptionalInt(crmBlock.box_count ?? json.box_count),
    deliveryDate: toDateKey(json.delivery_date ?? delivery.delivery_date),
    filial: mapFilialRef(json.filial),
    confirmedAt:
      parseDate(json.confirmed_at) ??
      parseDate(asRecord(json.confirmation).confirmed_at),
    shippedAt: parseDate(json.shipped_at),
    statusChangedAt: parseDate(json.status_changed_at),
    updatedAt: parseDate(json.updated_at),
    pinnedAt: parseDate(json.pinned_at),
    boardPosition: asOptionalInt(json.board_position),
    cashback: mapOrderCashback(json.cashback),
    ...mapRecommendation(json),
    leadAssignee: mapPersonRef(asRecord(json.lead).assigned_to),
    acknowledgedBy: mapAcks(json.acknowledged_by),
    zoning: mapOrderZoning(json),
    changeRequest: mapChangeRequest(json.change_request),
    stopId: asOptionalInt(json.stop_id),
    review: mapOrderReview(json),
    chiefCourier: mapCourierRef(json.chief_courier),
  };
}

/**
 * Tavsiya va uning operatori. Backend shaklni hali qat'iylashtirmagan —
 * uchala nom ham o'qiladi: `recommendation {id, operator}`,
 * `operator_recommendation {…}` (yoki faqat id), `recommendation_id`.
 * Operator yolg'iz `operator_id` bo'lib kelsa ham olinadi (ismsiz).
 */
function mapRecommendation(
  json: Record<string, unknown>,
): Pick<LogistOrder, "recommendationId" | "recommendationOperator"> {
  const recommendation = asRecord(
    json.recommendation ?? json.operator_recommendation,
  );
  const idOnly = isRecord(json.operator_recommendation)
    ? null
    : asOptionalInt(json.operator_recommendation);
  const operatorId = asOptionalInt(json.operator_id);
  return {
    recommendationId: asOptionalInt(
      json.recommendation_id ??
        json.operator_recommendation_id ??
        recommendation.id ??
        idOnly,
    ),
    recommendationOperator:
      mapPersonRef(recommendation.operator) ??
      mapPersonRef(json.recommended_by) ??
      mapPersonRef(json.operator) ??
      (operatorId !== null ? { id: operatorId, name: "", phone: null } : null),
  };
}

/**
 * `acknowledged_by: [{id, name, at, is_system}]` (2026-10-01 §5.3) — DOIM
 * massiv, bo'sh bo'lsa `[]`. Massiv bo'lmasa (`null` / kalit yo'q) — backend
 * bu xususiyatni bilmaydi, panel zaxira rejimiga o'tadi.
 */
export function mapAcks(raw: unknown): OrderAck[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.filter(isRecord).map((item) => {
    const user = asRecord(item.user);
    const id = item.id ?? user.id;
    return {
      userId: id === undefined || id === null || id === "" ? null : String(id),
      name: asString(
        item.name ?? item.full_name ?? user.full_name ?? user.name,
      ).trim(),
      at: parseDate(item.at ?? item.acknowledged_at ?? item.created_at),
      isSystem: asBool(item.is_system),
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit-jurnal
// ─────────────────────────────────────────────────────────────────────────────

/** Bitta maydon qanday o'zgargani: `{status: {from, to}}`. */
export type OrderChanges = Record<
  string,
  { from: string | null; to: string | null }
>;

export type OrderAuditEntry = {
  id: number;
  action: string;
  actionDisplay: string;
  admin: string | null;
  onBehalfOf: string | null;
  changes: OrderChanges;
  createdAt: Date | null;
};

export type LogistOrderDetail = {
  order: LogistOrder;
  /** Eng yangisi birinchi. */
  audit: OrderAuditEntry[];
};

export function mapOrderChanges(raw: unknown): OrderChanges {
  const changes: OrderChanges = {};

  for (const [key, value] of Object.entries(asRecord(raw))) {
    if (!isRecord(value)) continue;
    changes[key] = {
      from: asOptionalString(value.from),
      to: asOptionalString(value.to),
    };
  }

  return changes;
}

/** Yangi logist action'lari ham shu yerda (§2 audit kengaytmasi). */
const AUDIT_ACTIONS: Record<string, string> = {
  create_on_behalf: "Operator nomidan yaratdi",
  edit: "Tahrirladi",
  status_change: "Statusni o'zgartirdi",
  courier_assigned: "Kuryer biriktirdi",
  delivery_note: "Yetkazish izohini yozdi",
  delivery_attempt: "Yetkazib bo'lmadi deb belgiladi",
  transfer_out: "Boshqa filialga o'tkazdi",
  transfer_in: "Boshqa filialdan qabul qildi",
  payment_confirmed: "To'lovni tasdiqladi",
  payment_changed: "To'lov turini o'zgartirdi",
};

export function mapOrderAudit(raw: unknown): OrderAuditEntry {
  const json = asRecord(raw);
  const action = asString(json.action);

  return {
    id: asInt(json.id),
    action,
    actionDisplay:
      asOptionalString(json.action_display) ?? AUDIT_ACTIONS[action] ?? action,
    admin: asOptionalString(json.admin ?? json.by),
    onBehalfOf: asOptionalString(json.on_behalf_of),
    changes: mapOrderChanges(json.changes),
    createdAt: parseDate(json.created_at),
  };
}

const CHANGE_LABELS: Record<string, string> = {
  total_amount: "Jami summa",
  status: "Status",
  customer_notes: "Izoh",
  delivery_address: "Manzil",
  operator: "Operator",
  courier: "Kuryer",
  courier_id: "Kuryer",
  logist_note: "Logist izohi",
  delivery_scheduled_at: "Rejalashtirilgan sana",
  delivery_window: "Yetkazish oynasi",
  payment_method: "To'lov turi",
  payment_status: "To'lov holati",
  is_paid: "To'lov",
  paid_amount: "To'langan summa",
  payable_amount: "To'lanadigan summa",
  points_used: "Ishlatilgan ball",
  points_discount: "Ball chegirmasi",
  // `02` §2.5 / §5 maydonlari — logist tahriri va status sabablari.
  cancel_reason: "Bekor sababi",
  cancel_note: "Bekor izohi",
  revert_reason: "Qaytarish sababi",
  note: "Izoh",
  delivery_date: "Yetkazish sanasi",
  box_count: "Qutilar soni",
  gift_comment: "Sovg'a / izoh",
  extra_product_note: "Qo'shimcha mahsulot",
  region: "Viloyat",
  ordered_for_phone: "Buyurtma raqami (telefon)",
  client_phones: "Mijoz telefonlari",
  full_name: "Mijoz ismi",
  client_name: "Mijoz ismi",
  address_text: "Manzil",
  delivery_address_text: "Manzil",
  address: "Manzil",
  // `order.address_changed` (HUDUD_3 §2) — tuman kodi, mahalla, nuqta.
  locality: "Mahalla / qishloq",
  district: "Tuman",
  coordinates: "Koordinata",
  items: "Tarkib",
  tags: "Teglar",
  change_reason: "O'zgarish sababi",
};

/** Backend maydon nomining yorlig'i; tanilmasa nomning o'zi. */
export function changeFieldLabel(key: string): string {
  return CHANGE_LABELS[key] ?? key;
}

/**
 * Audit yozuvidagi bitta o'zgarishni odam o'qiy oladigan holga keltiradi:
 * status mashina nomi emas yorlig'i bilan, summa esa pul formatida.
 */
export function describeChange(
  key: string,
  change: { from: string | null; to: string | null },
): { label: string; from: string; to: string } {
  const format = (value: string | null) => {
    if (value === null) return "—";
    if (
      key === "total_amount" ||
      key === "paid_amount" ||
      key === "payable_amount" ||
      key === "points_discount"
    ) {
      return formatSom(asNumber(value));
    }
    if (key === "status") return orderStatusInfo(normalizeStatus(value)).label;
    if (key === "payment_method") return paymentMethodLabel(value) || value;
    if (key === "payment_status") return paymentStatusLabel(value) || value;
    if (key === "cancel_reason") return cancelReasonLabel(value) || value;
    if (key === "revert_reason") return revertReasonLabel(value) || value;
    if (key === "region") return regionLabel(value) || value;
    if (key === "delivery_window") {
      return (
        DELIVERY_WINDOWS.find((item) => item.value === value)?.label ?? value
      );
    }
    if (key === "is_paid") {
      // Audit qiymatlari satr bo'lib keladi (`"true"` / `"False"` / `"1"`);
      // tanilmagan qiymat xom holida chiqadi, taxmin qilinmaydi.
      const flag = asOptionalBool(value.trim().toLowerCase());
      if (flag === null) return value;
      return flag ? "To'langan" : "To'lanmagan";
    }
    return value;
  };

  return {
    label: CHANGE_LABELS[key] ?? key,
    from: format(change.from),
    to: format(change.to),
  };
}

/**
 * Rejalashtirilgan sanasi o'tib ketgan, hali yopilmagan buyurtma —
 * doska/ro'yxatda "Kechikkan" belgisi bilan ajralib turadi (§7.7 debochasi).
 * `YYYY-MM-DD` leksikografik solishtiruvda ham xronologik — `Date` kerak emas.
 */
export function isDeliveryLate(
  order: Pick<LogistOrder, "status" | "deliveryScheduledAt">,
): boolean {
  if (!order.deliveryScheduledAt) return false;
  if (isClosedStatus(order.status)) return false;
  return order.deliveryScheduledAt < localDateKey(new Date());
}

/** Yakunlangan bosqichlar — ularda sana ogohlantirishlari ma'nosiz. */
function isClosedStatus(status: string): boolean {
  return status === "delivered" || status === "cancelled";
}

/** `YYYY-MM-DD` — mahalliy vaqt bo'yicha (server sanasi ham shu shaklda). */
export function localDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export type DeliveryDateTone = "today" | "overdue" | "upcoming";

/**
 * Mijoz bilan kelishilgan sana (`delivery_date`) qanday ohangda ko'rinadi:
 * bugun — ko'k, o'tgan va hali yetkazilmagan — qizil, qolgani betaraf.
 * Sana yo'q bo'lsa `null` — chip chizilmaydi.
 */
export function deliveryDateTone(
  order: Pick<LogistOrder, "status" | "deliveryDate">,
  now: Date = new Date(),
): DeliveryDateTone | null {
  if (!order.deliveryDate) return null;
  const today = localDateKey(now);
  if (order.deliveryDate === today) return "today";
  if (order.deliveryDate < today && !isClosedStatus(order.status)) {
    return "overdue";
  }
  return "upcoming";
}

// ─────────────────────────────────────────────────────────────────────────────
// Xarita havolasi (§7.4 — SDK'siz, faqat havola)
// ─────────────────────────────────────────────────────────────────────────────

/** Koordinata bo'lsa nuqtaga, bo'lmasa matnli qidiruvga havola. */
export function mapLink(info: DeliveryInfo | null): string | null {
  if (!info) return null;
  if (info.lat !== null && info.lng !== null) {
    return `https://yandex.uz/maps/?pt=${info.lng},${info.lat}&z=16`;
  }
  const query = [info.address, info.region].filter(Boolean).join(", ");
  if (!query) return null;
  return `https://yandex.uz/maps/?text=${encodeURIComponent(query)}`;
}
