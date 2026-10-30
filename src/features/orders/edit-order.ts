import { z } from "zod";

import { defaultCommissionOperatorId } from "./commission-operator";
import { composeDeliveryAddress, districtPayload, manualDistrictName } from "./delivery-address";
import { GIFT_SOURCES } from "./gift-source";
import { ITEM_OFFER_KIND_VALUES, struckOriginalPrice } from "./item-pricing";
import type { LogistOrderPatch, OrderItemPatch } from "./order-patch";
import { isCashPayment, phoneKey } from "./types";
import type { DeliveryWindow, LogistOrder } from "./types";

/**
 * Buyurtmani tahrirlash formasi (`05` §6 `EditOrderSheet`) — sxema, boshlang'ich
 * qiymatlar va **faqat o'zgargan** kalitlardan PATCH yig'ish.
 *
 * Logist istalgan bosqichda tahrirlaydi (`02` §2.4); har PATCH tarixga
 * `order.updated {changes}` bo'lib tushadi, shuning uchun tegilmagan maydon
 * hech qachon yuborilmaydi — aks holda tarix "o'zgarmagan o'zgarishlar"
 * bilan to'lib ketardi.
 */

export const PAYMENT_METHOD_OPTIONS = [
  { value: "cash", label: "Naqd · olganda" },
  { value: "click", label: "Click" },
  { value: "payme", label: "Payme" },
] as const;

export type EditPaymentMethod = (typeof PAYMENT_METHOD_OPTIONS)[number]["value"];

/**
 * Serverdagi qatorning narxi — **faqat ko'rsatish**: PATCH ga ham, "o'zgardi"
 * solishtiruviga ham kirmaydi (`itemsSignature`). Qiymatlar `OrderItem` dan
 * so'zma-so'z, hech biri hisoblanmagan.
 */
export const editLinePriceSchema = z.object({
  /** Qator jami (`total`) — faqat `quantity` dona uchun to'g'ri. */
  total: z.number(),
  /** Forma ochilgan paytdagi soni — `total` shu son uchun. */
  quantity: z.number().int(),
  /** Server dona narxi (`unit_price`); yo'q — `null`. */
  unitPrice: z.number().nullable(),
  originalPrice: z.number().nullable(),
  discountPercent: z.number(),
  offer: z
    .object({ kind: z.enum(ITEM_OFFER_KIND_VALUES), label: z.string(), percent: z.number() })
    .nullable(),
});

export type EditLinePrice = z.infer<typeof editLinePriceSchema>;

export const editItemSchema = z.object({
  /** Forma ichidagi barqaror kalit (React `key`). */
  key: z.string(),
  lineId: z.string().nullable(),
  productId: z.number().int().nullable(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  /** Katalogdan qo'shilgan qatorning dona narxi — qidiruvda ko'rsatilgani. */
  catalogPrice: z.number().nullable(),
  /** Serverdagi qatorning narxi; yangi (katalog) qatorda `null`. */
  linePrice: editLinePriceSchema.nullable(),
  quantity: z.number().int().min(1, "Kamida 1 dona").max(999),
  isGift: z.boolean(),
  /** Faqat ko'rsatish uchun: sovg'a manbasini logist o'zgartirmaydi. */
  giftSource: z.enum(GIFT_SOURCES).nullable(),
});

export type EditOrderItem = z.infer<typeof editItemSchema>;

const PHONE_DIGITS = /^\+?\d[\d\s()-]{7,}$/;

export const editOrderSchema = z.object({
  clientName: z.string().trim().min(2, "Ism kamida 2 harf").max(120),
  orderedForPhone: z
    .string()
    .trim()
    .refine((value) => value === "" || PHONE_DIGITS.test(value), {
      message: "Telefon raqam noto'g'ri",
    }),
  region: z.string(),
  /**
   * Manzil tuzilmasi CRM bilan bir xil (`delivery-address.ts`): tuman kodi
   * (`""` — tanlanmagan yoki qo'lda), qo'lda yozilgan tuman nomi, mahalla,
   * ko'cha-uy. Qo'lda nom `address_text` boshiga qo'shilib ketadi.
   */
  district: z.string(),
  districtManual: z.boolean(),
  districtManualName: z.string().trim().max(120, "Juda uzun"),
  deliveryDate: z
    .string()
    .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), {
      message: "Sana noto'g'ri",
    }),
  deliveryWindow: z.enum(["", "morning", "afternoon", "evening"]),
  /** Ko'cha, uy, mo'ljal — yig'ilgan `address_text` ham 500 dan oshmasin (quyida). */
  addressText: z.string().trim().max(500, "Manzil juda uzun"),
  /** Qishloq / mahalla (`HUDUD_3` §1) — erkin matn, serverda ham faqat trim + 120. */
  locality: z.string().trim().max(120, "120 belgidan oshmasin"),
  items: z.array(editItemSchema).min(1, "Tarkibda kamida bitta mahsulot bo'lsin"),
  boxCount: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{1,3}$/.test(value), {
      message: "Butun son kiriting",
    }),
  extraProductNote: z.string().trim().max(300),
  giftComment: z.string().trim().max(300),
  paymentMethod: z.enum(["", "cash", "click", "payme"]),
  courierId: z.number().int().nullable(),
  tags: z.array(z.string()),
  logistNote: z.string().trim().max(500),
  changeReason: z.string().trim().max(300),
  /**
   * Komissiya egasi — tarix maydoni emas (hisoblagichga kirmaydi), faqat
   * tavsiya buyurtmasining tarkibi o'zgarganda `operator_id` bo'lib ketadi.
   */
  operatorId: z.number().int().positive().nullable(),
}).superRefine((values, ctx) => {
  if (values.districtManual && !values.districtManualName.trim()) {
    ctx.addIssue({ code: "custom", path: ["districtManualName"], message: "Tuman nomini yozing" });
  }
  if (composeDeliveryAddress(values).length > 500) {
    ctx.addIssue({ code: "custom", path: ["addressText"], message: "Manzil juda uzun" });
  }
});

export type EditOrderValues = z.infer<typeof editOrderSchema>;

/** Maydon → footer/hisoblagichdagi qisqa nomi (dizayn: "sana · manzil · kuryer"). */
export const EDIT_FIELD_LABELS = {
  clientName: "ism",
  orderedForPhone: "telefon",
  region: "viloyat",
  /** Tuman kodi + qo'lda yozilgan nom — bitta "tuman" maydoni. */
  district: "tuman",
  deliveryDate: "sana",
  deliveryWindow: "oyna",
  addressText: "manzil",
  locality: "mahalla",
  items: "tarkib",
  boxCount: "qutilar",
  extraProductNote: "qo'shimcha",
  giftComment: "sovg'a",
  paymentMethod: "to'lov",
  courierId: "kuryer",
  tags: "teglar",
  logistNote: "logist izohi",
} as const satisfies Partial<Record<keyof EditOrderValues, string>>;

export type EditField = keyof typeof EDIT_FIELD_LABELS;

const EDIT_FIELDS = Object.keys(EDIT_FIELD_LABELS) as EditField[];

function normalizePaymentMethod(method: string | null): EditPaymentMethod | "" {
  const key = (method ?? "").trim().toLowerCase();
  if (key === "cash" || key === "manual" || key === "naqd") return "cash";
  if (key.startsWith("click")) return "click";
  if (key.startsWith("payme")) return "payme";
  return "";
}

export function orderToEditValues(order: LogistOrder): EditOrderValues {
  return {
    clientName: order.client.fullName,
    orderedForPhone: order.client.orderedForPhone ?? order.client.phone,
    region: order.deliveryInfo?.region ?? "",
    district: order.zoning.district ?? "",
    districtManual: false,
    districtManualName: "",
    deliveryDate: order.deliveryDate ?? "",
    deliveryWindow: (order.deliveryWindow ?? "") as EditOrderValues["deliveryWindow"],
    addressText: order.deliveryInfo?.address ?? "",
    locality: order.deliveryInfo?.locality ?? "",
    items: order.items.map((item, index) => ({
      key: item.id ?? `line-${index}`,
      lineId: item.id,
      productId: item.productId,
      name: item.name,
      imageUrl: item.imageUrl,
      catalogPrice: null,
      linePrice: {
        total: item.price,
        quantity: item.quantity,
        unitPrice: item.serverUnitPrice,
        originalPrice: item.originalPrice,
        discountPercent: item.discountPercent,
        offer: item.offer,
      },
      quantity: item.quantity,
      isGift: item.isGift,
      giftSource: item.giftSource,
    })),
    boxCount: order.boxCount === null ? "" : String(order.boxCount),
    extraProductNote: order.extraProductNote ?? "",
    giftComment: order.giftComment ?? "",
    paymentMethod: normalizePaymentMethod(order.paymentMethod),
    courierId: order.courier?.id ?? null,
    tags: [...order.tags],
    logistNote: order.logistNote ?? "",
    changeReason: "",
    operatorId: defaultCommissionOperatorId(order),
  };
}

/**
 * Tahrir qatoridagi narx katagi nimani ko'rsatadi:
 *   `unit`    — dona narxi: server `unit_price` (asl narx chizilgan bo'lishi
 *               mumkin) yoki katalogdan qo'shilgan qatorning narxi;
 *   `total`   — server dona narxini bermagan, son o'zgarmagan: qator jami;
 *   `pending` — son o'zgargan va dona narxi yo'q: eski jami endi yolg'on,
 *               yangi summa pastda serverdan (`PreviewTotal`).
 *
 * Bu yerda pul hisoblanmaydi — faqat serverning qaysi raqami hozir to'g'ri
 * ekani tanlanadi.
 */
export type EditItemPriceView =
  | { kind: "unit"; amount: number; struck: number | null }
  | { kind: "total"; amount: number }
  | { kind: "pending" };

export function editItemPriceView(
  item: Pick<EditOrderItem, "isGift" | "quantity" | "catalogPrice" | "linePrice">,
): EditItemPriceView {
  const line = item.linePrice;
  if (!line) {
    return item.catalogPrice === null
      ? { kind: "pending" }
      : { kind: "unit", amount: item.catalogPrice, struck: null };
  }
  if (line.unitPrice !== null) {
    return {
      kind: "unit",
      amount: line.unitPrice,
      struck: struckOriginalPrice({
        isGift: item.isGift,
        unitPrice: line.unitPrice,
        originalPrice: line.originalPrice,
      }),
    };
  }
  return item.quantity === line.quantity ? { kind: "total", amount: line.total } : { kind: "pending" };
}

/** Tarkib solishtiruvi: mahsulot, soni va sovg'a belgisi — tartib bilan. */
function itemsSignature(items: EditOrderItem[]): string {
  return items
    .map((item) => `${item.lineId ?? ""}:${item.productId ?? ""}:${item.quantity}:${item.isGift ? 1 : 0}`)
    .join("|");
}

function sameTags(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((tag) => set.has(tag));
}

function isFieldChanged(
  field: EditField,
  initial: EditOrderValues,
  current: EditOrderValues,
): boolean {
  if (field === "items") return itemsSignature(initial.items) !== itemsSignature(current.items);
  if (field === "tags") return !sameTags(initial.tags, current.tags);
  // `+998 90 …` va `998901234567` — bitta raqam (§9.1), o'zgarish emas.
  if (field === "orderedForPhone") {
    return phoneKey(initial.orderedForPhone) !== phoneKey(current.orderedForPhone);
  }
  // Tuman: kod yoki qo'lda yozilgan nom — ikkisi bitta maydon.
  if (field === "district") {
    return (
      districtPayload(initial) !== districtPayload(current) ||
      manualDistrictName(initial) !== manualDistrictName(current)
    );
  }
  // Manzil matni serverga yig'ilgan holda ketadi — o'zgarish ham shu bo'yicha.
  if (field === "addressText") {
    return composeDeliveryAddress(initial) !== composeDeliveryAddress(current);
  }
  const before = initial[field];
  const after = current[field];
  if (typeof before === "string" && typeof after === "string") {
    return before.trim() !== after.trim();
  }
  return before !== after;
}

export function changedEditFields(
  initial: EditOrderValues,
  current: EditOrderValues,
): EditField[] {
  return EDIT_FIELDS.filter((field) => isFieldChanged(field, initial, current));
}

const blankToNull = (value: string): string | null => value.trim() || null;

function toItemPatch(item: EditOrderItem): OrderItemPatch {
  return {
    lineId: item.lineId,
    productId: item.productId,
    quantity: item.quantity,
    isGift: item.isGift,
  };
}

/** Bitta maydonni PATCH kalitiga yozadi — yagona joy, `switch` kompilyator nazoratida. */
function writeField(
  patch: LogistOrderPatch,
  field: EditField,
  values: EditOrderValues,
): void {
  switch (field) {
    case "clientName":
      patch.clientName = values.clientName.trim();
      return;
    case "orderedForPhone":
      // Backend raqamni `+` siz saqlaydi (§9.1) — faqat raqamlar ketadi.
      patch.orderedForPhone = phoneKey(values.orderedForPhone) || null;
      return;
    case "region":
      patch.region = blankToNull(values.region);
      return;
    case "district":
      // Kod faqat ro'yxatdan; qo'lda yozilgan tuman — `null` + nom matnda.
      patch.district = districtPayload(values);
      return;
    case "deliveryDate":
      patch.deliveryDate = blankToNull(values.deliveryDate);
      return;
    case "deliveryWindow":
      patch.deliveryWindow = (values.deliveryWindow || null) as DeliveryWindow | null;
      return;
    case "addressText":
      patch.addressText = blankToNull(composeDeliveryAddress(values));
      return;
    case "locality":
      patch.locality = blankToNull(values.locality);
      return;
    case "items":
      patch.items = values.items.map(toItemPatch);
      return;
    case "boxCount":
      patch.boxCount = values.boxCount.trim() === "" ? null : Number(values.boxCount);
      return;
    case "extraProductNote":
      patch.extraProductNote = blankToNull(values.extraProductNote);
      return;
    case "giftComment":
      patch.giftComment = blankToNull(values.giftComment);
      return;
    case "paymentMethod":
      patch.paymentMethod = values.paymentMethod || null;
      return;
    case "courierId":
      patch.courierId = values.courierId;
      return;
    case "tags":
      patch.tags = [...values.tags];
      return;
    case "logistNote":
      patch.logistNote = blankToNull(values.logistNote);
      return;
  }
}

/**
 * Faqat o'zgargan kalitlardan PATCH. Hech narsa o'zgarmagan bo'lsa `null` —
 * "Saqlash" tugmasi o'chiq turadi. Sabab faqat o'zgarish bor bo'lsa ketadi.
 */
export type EditPatchOptions = {
  /**
   * Backend bu buyurtma uchun `operator_id` talab qiladi (tavsiya buyurtmasi
   * yoki server shuni aytgan). Faqat tarkib o'zgarganda yuboriladi.
   */
  operatorRequired?: boolean;
  /**
   * Buyurtma `delivered` — backend sababni `note` da kutadi va usiz
   * `400 edit_reason_required` qaytaradi (`LOGIST_02` §3).
   */
  reasonAsNote?: boolean;
};

export function buildEditPatch(
  initial: EditOrderValues,
  current: EditOrderValues,
  { operatorRequired = false, reasonAsNote = false }: EditPatchOptions = {},
): LogistOrderPatch | null {
  const fields = changedEditFields(initial, current);
  if (fields.length === 0) return null;

  const patch: LogistOrderPatch = {};
  for (const field of fields) writeField(patch, field, current);

  if (operatorRequired && fields.includes("items") && current.operatorId !== null) {
    patch.operatorId = current.operatorId;
  }

  const reason = current.changeReason.trim();
  if (reason) patch.changeReason = reason;
  if (reason && reasonAsNote) patch.note = reason;
  return patch;
}

/**
 * Yetkazilgan buyurtmadagi tahrir sababsiz saqlanmaydi (`LOGIST_02` §3,
 * C5) — lentaga `order.edited_after_delivery` bo'lib tushadi.
 */
export function editReasonRequired(status: string): boolean {
  return status === "delivered";
}

export const EDIT_REASON_REQUIRED_MESSAGE =
  "Yetkazilgan buyurtmani o'zgartirish sababi yozilishi shart";

/**
 * Tavsiya buyurtmasining tarkibi o'zgaryapti-yu, komissiya egasi yo'q —
 * "Saqlash" dan oldin forma shu maydonni so'raydi (server rad etmasin).
 */
export function missingOperator(
  initial: EditOrderValues,
  current: EditOrderValues,
  operatorRequired: boolean,
): boolean {
  if (!operatorRequired || current.operatorId !== null) return false;
  return changedEditFields(initial, current).includes("items");
}

/**
 * Forma ochiq turganda buyurtma boshqa joyda (boshqa logist, WS) o'zgarganmi.
 * Diff **ochilgan paytdagi** nusxaga nisbatan hisoblanadi — shuning uchun
 * logist tegmagan maydon hech qachon yuborilmaydi va birovning o'zgarishi
 * jimgina eski qiymatga qaytarilmaydi. Bu ro'yxat faqat ogohlantirish uchun;
 * `conflicts` — ikkala tomon ham o'zgartirgan maydonlar.
 */
export function editDrift(
  opened: EditOrderValues,
  latest: EditOrderValues,
  current: EditOrderValues,
): { remote: EditField[]; conflicts: EditField[] } {
  const remote = changedEditFields(opened, latest);
  const mine = new Set(changedEditFields(opened, current));
  return { remote, conflicts: remote.filter((field) => mine.has(field)) };
}

/** Onlayn usulga o'tish — mijozga to'lov havolasi ketadi (dizayn ogohlantirishi). */
export function isOnlineMethod(method: string): boolean {
  return method === "click" || method === "payme";
}

// ─────────────────────────────────────────────────────────────────────────────
// Pul qorovullari (`FLUTTER_ORDER_PIPELINE_V2` §7.5, §8.2)
// ─────────────────────────────────────────────────────────────────────────────

/** Onlayn to'lov boshlangan yoki yakunlangan `payment_status` qiymatlari. */
const ONLINE_MONEY_STATUSES = new Set([
  "online_pending",
  "paid",
  "refunded",
  "partially_refunded",
]);

export type EditMoneyLocks = {
  /** Tarkib va summa — onlayn to'langan buyurtmada qulf (`paid_order_amount_locked`). */
  amountLocked: boolean;
  /** To'lov usuli — onlayn to'lov boshlangan bo'lsa qulf (`online_payment_in_progress`). */
  methodLocked: boolean;
};

/**
 * Server baribir rad etadigan pul o'zgarishlarini forma oldindan qulflaydi:
 * "Saqlash" dan keyin xato ko'rish o'rniga logist sababini darhol ko'radi.
 * Izoh, manzil, sana va kuryer ochiq qoladi.
 *
 * Naqd (`cash`/`manual`) buyurtma `delivered` da to'langan bo'ladi — uning
 * summasi qulflanmaydi, bu qoida faqat onlayn to'lovga tegishli.
 */
export function editMoneyLocks(
  order: Pick<LogistOrder, "paymentStatus" | "isPaid" | "paymentMethod">,
): EditMoneyLocks {
  const status = (order.paymentStatus ?? "").trim().toLowerCase();
  const online = !isCashPayment(order.paymentMethod);
  const paid = status === "paid" || (status === "" && order.isPaid === true);
  return {
    amountLocked: online && paid,
    methodLocked: online && ONLINE_MONEY_STATUSES.has(status),
  };
}
