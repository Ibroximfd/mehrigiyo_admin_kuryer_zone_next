import {
  asOptionalInt,
  asOptionalString,
  asRecord,
  asString,
} from "@/lib/parse";

/**
 * Filial harakatlar jurnali (`BACKEND-LOGIST.md` §4.11).
 *
 * Yozuv shakli WS hodisasi bilan **bir xil** — `type` qiymatlari ham §4.9
 * hodisalari nomlari. Shu sababli lenta ikkala manbani (server tarixi va
 * jonli hodisalar) bitta komponent bilan chizadi: hodisa kelganda ekranda
 * darhol paydo bo'ladi, sahifa yangilanganda esa serverdan to'liq tarix
 * qaytadi.
 */
export type ActivityEntry = {
  id: string;
  /** ISO vaqt — saqlashda satr (`Date` persist bo'lmaydi). */
  at: string;
  /** §4.9 hodisa turi: `order_status_changed`, `order_courier_assigned`, ... */
  type: string;
  orderId: string | null;
  /** Odam o'qiydigan raqam — UUID emas. */
  orderNumber: string | null;
  transferId: number | null;
  /** Kim qilgani (`by` / `changed_by`); backend bermasa `null`. */
  actor: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  /** Qo'shimcha: kuryer ismi, urinish sababi, transfer natijasi va h.k. */
  note: string | null;
};

export type ActivityPage = {
  entries: ActivityEntry[];
  hasNextPage: boolean;
  totalCount: number | null;
};

/**
 * Server yozuvini lenta yozuviga aylantiradi.
 *
 * Backend har hodisa turida turli qo'shimcha maydon yuboradi (kuryer, sabab,
 * natija) — ular birgalikda bitta `note` satriga yig'iladi, chunki lentada
 * yozuv bir qatorlik bo'ladi.
 */
export function mapActivityEntry(raw: unknown, index = 0): ActivityEntry {
  const json = asRecord(raw);
  const courier = asRecord(json.courier);
  const at = asString(json.created_at ?? json.at);
  const type = asString(json.type ?? json.action);

  return {
    // Id — React kaliti; backend bermasa vaqt+tur+tartib bilan yasaymiz.
    id: asString(json.id) || `${type}-${at}-${index}`,
    at,
    type,
    orderId: asOptionalString(json.order_id),
    orderNumber: asOptionalString(json.order_number),
    transferId: asOptionalInt(json.transfer_id),
    actor: asOptionalString(json.by ?? json.changed_by ?? json.actor),
    fromStatus: asOptionalString(json.from_status),
    toStatus: asOptionalString(json.to_status ?? json.status),
    note: asOptionalString(
      json.note ??
        json.reason ??
        json.detail ??
        courier.full_name ??
        courier.name,
    ),
  };
}
