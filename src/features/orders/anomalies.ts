import { api } from "@/lib/api-client";
import { ENDPOINTS } from "@/lib/api-constants";
import { asPage } from "@/lib/paginate";
import {
  asArray,
  asOptionalInt,
  asRecord,
  asString,
} from "@/lib/parse";

import { mapDeliveryProof } from "./delivery-proof";
import type { DeliveryProof } from "./delivery-proof";

/**
 * Shubhali yetkazishlar (`KURYER_SAYTLAR_LOGIST_OPERATOR.md` §2.7). Rad
 * etilmagan — hammasi qabul qilingan, logist ko'rib chiqadi.
 */
export type DeliveryAnomaly = {
  orderId: string;
  orderNumber: string;
  courier: { id: number; fullName: string } | null;
  flags: string[];
  proof: DeliveryProof | null;
};

export function mapDeliveryAnomaly(raw: unknown): DeliveryAnomaly {
  const json = asRecord(raw);
  const courier = asRecord(json.courier);
  const courierId = asOptionalInt(courier.id);
  return {
    orderId: asString(json.order_id),
    orderNumber: asString(json.order_number),
    courier:
      courierId === null
        ? null
        : { id: courierId, fullName: asString(courier.full_name ?? courier.name) },
    flags: asArray(json.flags)
      .map((flag) => asString(flag))
      .filter(Boolean),
    proof: mapDeliveryProof(json.proof),
  };
}

/** `date` (YYYY-MM-DD) bo'yicha; bo'sh bo'lsa oxirgi 200 ta. */
export async function fetchAnomalies(
  date: string | null,
  signal?: AbortSignal,
): Promise<DeliveryAnomaly[]> {
  const raw = await api.get<unknown>(ENDPOINTS.logistAnomalies, {
    searchParams: { date },
    signal,
    fallbackError: "Anomaliyalarni yuklashda xatolik",
  });
  return asPage(raw).items.map(mapDeliveryAnomaly);
}
