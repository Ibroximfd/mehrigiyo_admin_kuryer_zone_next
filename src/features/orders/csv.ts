import { fetchOrders } from "./api";
import type { OrdersQuery } from "./api";
import { formatDateTime } from "@/lib/format";
import { tr } from "@/lib/i18n/now";

import { creatorKindLabel } from "./creator";
import { confirmationSummary, confirmationView } from "./confirmation";
import {
  orderStatusInfo,
  paymentMethodLabel,
  paymentView,
} from "./types";
import { orderChannelLabel } from "./source";

/**
 * Joriy filtr bo'yicha buyurtmalarni CSVga eksport (LOGIST-PLAN §14).
 *
 * Server sahifalarini ketma-ket yig'adi (100 talik, ko'pi bilan 1000 ta —
 * hisobot uchun yetarli, backendni ham bosmaydi). Excel kirillni to'g'ri
 * ochishi uchun UTF-8 BOM bilan yoziladi.
 *
 * Ustunlar `02` §5 bo'yicha: yaratuvchi, barcha telefonlar, ilova, tasdiq
 * kanali, yetkazish sanasi, qutilar. Filial ustuni yo'q — logist faqat o'z
 * filialida ishlaydi (backend cheklaydi). Backend bermagan maydon bo'sh
 * katak — ustun joyi o'zgarmaydi.
 */
const PAGE_SIZE = 100;
const MAX_ROWS = 1000;

function csvCell(value: string | number | null | undefined): string {
  const text = String(value ?? "");
  return /[",;\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** `true/false/null` → "Bor/Yo'q/—": ustun bo'sh qolmasin, taxmin ham bo'lmasin. */
function csvFlag(value: boolean | null): string {
  if (value === null) return "";
  return tr(value ? "Bor" : "Yo'q");
}

/** Yorliq (status, to'lov turi) — tanlangan tilda; ma'lumot esa o'zgarishsiz. */
function labelCell(label: string): string {
  return csvCell(label ? tr(label) : "");
}

const HEADER = [
  "Raqam",
  "Sana",
  "Status",
  "Mijoz",
  "Telefon",
  "Barcha telefonlar",
  "Ilova",
  "Yaratdi",
  "Yaratuvchi ismi",
  "Tasdiq kanali",
  "Region",
  "Manzil",
  "Yetkazish sanasi",
  "Qutilar",
  "Mahsulotlar summasi",
  "Ball",
  "To'lanadigan summa",
  "To'lov turi",
  "To'lov holati",
  "Kuryer",
  "Manba",
];

export async function exportOrdersCsv(query: OrdersQuery): Promise<number> {
  const rows: string[] = [HEADER.map((title) => csvCell(tr(title))).join(";")];

  let total = 0;
  for (let page = 1; total < MAX_ROWS; page += 1) {
    const result = await fetchOrders({ ...query, page, pageSize: PAGE_SIZE });

    for (const order of result.orders) {
      rows.push(
        [
          csvCell(order.orderNumber || order.id),
          csvCell(order.createdAt ? formatDateTime(order.createdAt) : ""),
          labelCell(orderStatusInfo(order.status).label),
          csvCell(order.client.fullName),
          csvCell(order.client.phone),
          csvCell(order.client.phones.join(", ")),
          csvCell(csvFlag(order.client.hasApp)),
          labelCell(order.createdBy ? creatorKindLabel(order.createdBy.kind) : ""),
          csvCell(order.createdBy?.name ?? ""),
          labelCell(confirmationSummary(confirmationView(order.confirmation))),
          csvCell(order.deliveryInfo?.regionDisplay ?? order.deliveryInfo?.region ?? ""),
          csvCell(order.deliveryInfo?.address ?? ""),
          csvCell(order.deliveryDate ?? ""),
          csvCell(order.boxCount),
          csvCell(order.totalAmount),
          csvCell(order.pointsUsed),
          csvCell(order.payableAmount),
          labelCell(paymentMethodLabel(order.paymentMethod)),
          labelCell(paymentView(order).label),
          csvCell(order.courier?.fullName ?? ""),
          labelCell(orderChannelLabel(order.source)),
        ].join(";"),
      );
      total += 1;
      if (total >= MAX_ROWS) break;
    }

    if (!result.hasNextPage || result.orders.length === 0) break;
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob(["﻿" + rows.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `buyurtmalar-${stamp}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);

  return total;
}
