import {
  escapeData,
  escapeHtml,
  printHtml,
} from "@/features/orders/components/waybill";
import { pointsNote } from "@/features/orders/points";
import { mapLink, paymentView } from "@/features/orders/types";
import type { LogistOrder } from "@/features/orders/types";
import { formatPhone, formatSom, formatUzFullDate } from "@/lib/format";
import type { Courier } from "./types";

/** Kuryer shu to'xtashda pul olishi kerakmi: naqd yoki to'lanmagan karta. */
function collectsMoney(order: LogistOrder): boolean {
  const payment = paymentView(order);
  return payment.state === "cod" || payment.needsAttention;
}

/**
 * Kuryer marshrut varag'i (LOGIST-PLAN §14): kuryerning faol buyurtmalari
 * region bo'yicha guruhlangan bitta chop etiladigan ro'yxat — bir hududga
 * ketadiganlar yonma-yon turadi, kuryer yo'lini o'zi tez tuzadi.
 */
export function printRouteSheet(courier: Courier, orders: LogistOrder[]) {
  if (orders.length === 0) return;

  // Region bo'yicha guruhlash; nomsizlari oxirida.
  const groups = new Map<string, LogistOrder[]>();
  for (const order of orders) {
    const region = order.deliveryInfo?.region?.trim() || "Region ko'rsatilmagan";
    const list = groups.get(region) ?? [];
    list.push(order);
    groups.set(region, list);
  }
  const sorted = [...groups.entries()].sort(([a], [b]) =>
    a === "Region ko'rsatilmagan" ? 1 : b === "Region ko'rsatilmagan" ? -1 : a.localeCompare(b),
  );

  let stop = 0;
  const sections = sorted
    .map(([region, list]) => {
      const rows = list
        .map((order) => {
          stop += 1;
          const map = mapLink(order.deliveryInfo);
          const points = pointsNote(order);
          return `<tr>
            <td class="num">${stop}</td>
            <td>
              <b>${escapeData(order.orderNumber || order.id.slice(0, 8))}</b>
              — ${order.deliveryInfo?.address ? escapeData(order.deliveryInfo.address) : "manzil yo'q"}
              ${map ? `<br /><span class="map">${escapeData(map)}</span>` : ""}
              ${order.logistNote ? `<br /><i>${escapeData(order.logistNote)}</i>` : ""}
            </td>
            <td class="num">${escapeHtml(formatPhone(order.client.phone))}</td>
            <td class="num">${escapeHtml(formatSom(order.payableAmount))}${
              // Ball bilan chegirilgan bo'lsa kuryer nega kam pul olishini
              // bilib tursin — aks holda mijoz bilan bahslashadi.
              points ? `<br /><span class="map">${escapeHtml(points)}</span>` : ""
            }${
              // Pul olinadigan har bir to'xtash ajralib tursin: naqd ham,
              // to'lanmagan karta ham (aks holda kuryer pulsiz qaytadi).
              collectsMoney(order) ? "<br /><b>PUL OLINADI</b>" : ""
            }</td>
            <td class="check"></td>
          </tr>`;
        })
        .join("\n");

      return `<h2>${escapeHtml(region)} · ${list.length} ta</h2>
      <table>
        <thead><tr><th class="num">№</th><th>Buyurtma / manzil</th><th>Telefon</th><th>Summa</th><th>✓</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    })
    .join("\n");

  // `Intl` emas, `date-fns` — chop etilgan varaqada ingliz oyi chiqib
  // qolmasligi uchun (izoh `lib/format.ts` da).
  const today = formatUzFullDate(new Date());

  printHtml(`<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8" />
<title>Marshrut — ${escapeHtml(courier.fullName)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 12px/1.5 -apple-system, "Segoe UI", Arial, sans-serif; color: #111; }
  header { display: flex; justify-content: space-between; align-items: baseline;
           border-bottom: 2px solid #111; padding-bottom: 6px; margin-bottom: 6px; }
  header h1 { font-size: 16px; margin: 0; }
  h2 { font-size: 13px; margin: 14px 0 4px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #999; padding: 5px 6px; text-align: left; vertical-align: top; }
  th { background: #f0f0f0; font-size: 11px; }
  td.num, th.num { white-space: nowrap; }
  td.check { width: 28px; }
  .map { color: #555; font-size: 10px; word-break: break-all; }
  footer { margin-top: 16px; display: flex; gap: 24px; }
  footer div { flex: 1; }
  footer .line { border-bottom: 1px solid #111; height: 26px; }
  footer p { margin: 3px 0 0; color: #555; font-size: 10px; }
</style>
</head>
<body>
  <header>
    <h1>Marshrut varag'i — ${escapeData(courier.fullName)}</h1>
    <span>${escapeHtml(today)} · ${orders.length} ta buyurtma</span>
  </header>
  ${sections}
  <footer>
    <div><div class="line"></div><p>Kuryer imzosi</p></div>
    <div><div class="line"></div><p>Logist imzosi</p></div>
  </footer>
</body>
</html>`);
}
