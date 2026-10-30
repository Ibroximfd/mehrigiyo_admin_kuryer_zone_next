import {
  escapeData,
  escapeHtml,
  printHtml,
} from "@/features/orders/components/waybill";
import type { OrdersBoard } from "@/features/orders/board";
import { isActiveOrder } from "@/features/orders/insights";
import type { LogistOrder } from "@/features/orders/types";
import type { Courier } from "@/features/couriers/types";
import { formatSom, formatUzFullDate, formatUzWeekday } from "@/lib/format";

/**
 * Kunlik yakun varag'i (LOGIST-PLAN §14): bugungi oqim kesimi bitta chop
 * etiladigan sahifada — planyorka va rahbarga hisobot uchun.
 *
 * Barcha sonlar server qiymatlari (doska `count`/`total_amount`, kuryer
 * `today.*`) — klientda pul hisoblanmaydi.
 */
export function printDailyReport({
  filialName,
  board,
  couriers,
}: {
  filialName: string | null;
  board: OrdersBoard<LogistOrder>;
  /** Kuryer bo'limi backend chiqmagan bo'lsa `null` — bo'lim tushiriladi. */
  couriers: Courier[] | null;
}) {
  const today = `${formatUzFullDate(new Date())}, ${formatUzWeekday(new Date())}`;

  const statusRows = board.columns
    .map(
      (column) => `<tr>
        <td>${escapeHtml(column.label)}</td>
        <td class="num">${column.count}</td>
        <td class="num">${
          column.totalAmount !== null
            ? escapeHtml(formatSom(column.totalAmount))
            : "—"
        }</td>
      </tr>`,
    )
    .join("\n");

  // Ogohlantirishlar — yuklangan kartalar bo'yicha (qisman bo'lishi mumkin).
  const loaded = board.columns.flatMap((column) => column.orders);
  const attempts = loaded.reduce(
    (sum, order) => sum + order.deliveryAttempts.length,
    0,
  );
  const noCourier = loaded.filter(
    (order) => isActiveOrder(order) && !order.courier,
  ).length;

  const courierSection = couriers?.length
    ? `<h2>Kuryerlar kesimi</h2>
  <table>
    <thead><tr><th>Kuryer</th><th class="num">Biriktirilgan</th><th class="num">Yetkazgan</th><th class="num">COD</th></tr></thead>
    <tbody>
      ${couriers
        .map(
          (courier) => `<tr>
        <td>${escapeData(courier.fullName)}${courier.isActive ? "" : " (faol emas)"}</td>
        <td class="num">${courier.today.assigned}</td>
        <td class="num">${courier.today.delivered}</td>
        <td class="num">${escapeHtml(formatSom(courier.today.codTotal))}</td>
      </tr>`,
        )
        .join("\n")}
    </tbody>
  </table>`
    : "";

  printHtml(`<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8" />
<title>Kunlik yakun</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 12px/1.5 -apple-system, "Segoe UI", Arial, sans-serif; color: #111; }
  header { border-bottom: 2px solid #111; padding-bottom: 6px; margin-bottom: 10px; }
  header h1 { font-size: 17px; margin: 0; }
  header p { margin: 2px 0 0; color: #555; }
  h2 { font-size: 13px; margin: 16px 0 5px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #999; padding: 5px 8px; text-align: left; }
  th { background: #f0f0f0; font-size: 11px; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  .warns { margin-top: 6px; color: #555; font-size: 11px; }
  footer { margin-top: 20px; display: flex; gap: 24px; }
  footer div { flex: 1; }
  footer .line { border-bottom: 1px solid #111; height: 26px; }
  footer p { margin: 3px 0 0; color: #555; font-size: 10px; }
</style>
</head>
<body>
  <header>
    <h1>Mehrigiyo Logist — kunlik yakun</h1>
    <p>${escapeHtml(today)}${filialName ? ` · ${escapeData(filialName)}` : ""}</p>
  </header>

  <h2>Oqim holati</h2>
  <table>
    <thead><tr><th>Bosqich</th><th class="num">Soni</th><th class="num">Summa</th></tr></thead>
    <tbody>${statusRows}</tbody>
  </table>

  <p class="warns">Muvaffaqiyatsiz urinishlar (yuklanganlar bo'yicha): ${attempts} ta ·
  Kuryersiz tasdiqlangan/yo'ldagi: ${noCourier} ta</p>

  ${courierSection}

  <footer>
    <div><div class="line"></div><p>Logist imzosi</p></div>
    <div><div class="line"></div><p>Filial rahbari</p></div>
  </footer>
</body>
</html>`);
}
