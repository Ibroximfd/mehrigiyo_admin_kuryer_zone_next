import { api, ApiError, type QueryValue } from "@/lib/api-client";
import { isEndpointMissing } from "@/lib/api-availability";
import { ENDPOINTS } from "@/lib/api-constants";
import { asPage } from "@/lib/paginate";

import { mapFilialTransfer, mapFilials } from "./types";
import type {
  FilialRef,
  FilialTransfer,
  TransferDirection,
  TransfersPage,
} from "./types";

/**
 * Filiallararo ta'minot zakazi — `BACKEND-LOGIST.md` §7 kontrakti.
 * Endpoint hali chiqmagan bo'lsa `endpoint_missing` kodli xato — sahifa
 * yumshoq "backend kutilmoqda" holatini ko'rsatadi.
 */

function notReadyError(): ApiError {
  return new ApiError(
    "Filiallararo almashinuv uchun backend hali chiqmagan",
    404,
    { code: "endpoint_missing" },
    "endpoint_missing",
  );
}

export type TransfersQuery = {
  direction: TransferDirection;
  status?: string | null;
  page?: number;
};

export async function fetchTransfers(
  query: TransfersQuery,
  signal?: AbortSignal,
): Promise<TransfersPage> {
  const params: Record<string, QueryValue> = {
    direction: query.direction,
    page: query.page ?? 1,
  };
  if (query.status) params.status = query.status;

  try {
    const raw = await api.get<unknown>(ENDPOINTS.logistTransfers, {
      searchParams: params,
      signal,
      fallbackError: "Zakazlarni yuklashda xatolik",
    });
    const page = asPage(raw);
    return {
      transfers: page.items.map(mapFilialTransfer),
      totalCount: page.total ?? page.items.length,
      hasNextPage: page.hasMore,
    };
  } catch (error) {
    if (isEndpointMissing(error)) throw notReadyError();
    throw error;
  }
}

export async function fetchTransferDetail(
  id: number,
  signal?: AbortSignal,
): Promise<FilialTransfer> {
  try {
    const raw = await api.get<unknown>(ENDPOINTS.logistTransferDetail(id), {
      signal,
      fallbackError: "Zakazni yuklashda xatolik",
    });
    return mapFilialTransfer(raw);
  } catch (error) {
    if (isEndpointMissing(error)) throw notReadyError();
    throw error;
  }
}

/** Filiallar ro'yxati (o'z filialisiz) — zakaz nishonini tanlash uchun. */
export async function fetchFilials(signal?: AbortSignal): Promise<FilialRef[]> {
  try {
    const raw = await api.get<unknown>(ENDPOINTS.logistFilials, {
      signal,
      fallbackError: "Filiallarni yuklashda xatolik",
    });
    return mapFilials(raw);
  } catch (error) {
    if (isEndpointMissing(error)) throw notReadyError();
    throw error;
  }
}

export async function createTransfer(input: {
  toFilialId: number;
  note?: string | null;
  items: Array<{ productId: number; quantity: number }>;
}): Promise<FilialTransfer> {
  try {
    const raw = await api.post<unknown>(ENDPOINTS.logistTransfersCreate, {
      json: {
        to_filial_id: input.toFilialId,
        note: input.note ?? "",
        items: input.items.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
        })),
      },
      fallbackError: "Zakaz yaratishda xatolik",
    });
    return mapFilialTransfer(raw);
  } catch (error) {
    if (isEndpointMissing(error)) throw notReadyError();
    throw error;
  }
}

/** Holat o'tishi — egalik jadvali qat'iy tekshiriladi (backend §7). */
export async function updateTransferStatus(
  id: number,
  status: string,
  reason?: string | null,
): Promise<FilialTransfer> {
  const json: Record<string, unknown> = { status };
  if (reason) json.reason = reason;

  try {
    const raw = await api.patch<unknown>(ENDPOINTS.logistTransferDetail(id), {
      json,
      fallbackError: "Holatni o'zgartirishda xatolik",
    });
    return mapFilialTransfer(raw);
  } catch (error) {
    if (isEndpointMissing(error)) throw notReadyError();
    throw error;
  }
}
