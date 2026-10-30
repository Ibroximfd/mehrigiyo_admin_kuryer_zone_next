import { formatDeliveryAddress } from "@/features/orders/address";
import { giftSourceLabel } from "@/features/orders/gift-source";
import { itemPriceBadge } from "@/features/orders/item-pricing";
import { hasPointsDiscount } from "@/features/orders/points";
import {
  attemptReasonLabel,
  paymentSummary,
  paymentView,
} from "@/features/orders/types";
import type { LogistOrder, OrderItem } from "@/features/orders/types";
import { formatDateTime, formatPhone, formatSom } from "@/lib/format";
import { localizeDocumentHtml, rawHtml } from "@/lib/i18n/print";

/**
 * Yo'l varaqasi (LOGIST-PLAN §7.5) — chop etish uchun.
 *
 * Asosiy bundle'ga print-stylesheet qo'shilmaydi (§9 byudjeti): varaqa
 * yashirin iframe ichida mustaqil hujjat sifatida quriladi va o'sha yerdan
 * chop etiladi. Ommaviy rejim — tanlangan N ta buyurtma ketma-ket varaqlar
 * bilan bitta print oqimida (har biri yangi sahifadan boshlanadi).
 *
 * Har varaqda QR-kod: skanerlansa buyurtma sahifasi ochiladi. QR kutubxonasi
 * faqat chop etish paytida yuklanadi (dynamic import) — bundlega kirmaydi.
 */

/**
 * Tayyor HTML hujjatni yashirin iframe orqali chop etadi — umumiy helper.
 * Hujjat tanlangan tilga shu yerda o'giriladi (`localizeDocumentHtml`);
 * mijoz/server ma'lumoti `escapeData` bilan belgilanadi va tegilmaydi.
 */
export function printHtml(documentHtml: string) {
  if (typeof document === "undefined") return;
  documentHtml = localizeDocumentHtml(documentHtml);

  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  frame.setAttribute("aria-hidden", "true");

  frame.srcdoc = documentHtml;

  frame.onload = () => {
    const target = frame.contentWindow;
    if (!target) {
      frame.remove();
      return;
    }
    // Chop etish oynasi yopilgach iframe olib tashlanadi; ba'zi brauzerlar
    // `afterprint` yubormaydi — zaxira taymer ham bor.
    target.addEventListener("afterprint", () => frame.remove());
    setTimeout(() => frame.remove(), 60_000);
    target.focus();
    target.print();
  };

  document.body.append(frame);
}

export async function printWaybills(orders: LogistOrder[]) {
  if (typeof document === "undefined" || orders.length === 0) return;

  // QR — qulaylik: chiqmasa ham varaqa chiqaveradi.
  const qrByOrder: Record<string, string> = {};
  try {
    const { toDataURL } = await import("qrcode");
    await Promise.all(
      orders.map(async (order) => {
        const url = `${window.location.origin}/orders?order=${encodeURIComponent(order.id)}`;
        qrByOrder[order.id] = await toDataURL(url, {
          margin: 0,
          width: 108,
          errorCorrectionLevel: "M",
        });
      }),
    );
  } catch {
    // QR kutubxonasi yuklanmadi — varaqa QR'siz chiqadi.
  }

  printHtml(waybillsDocument(orders, qrByOrder));
}

// ─────────────────────────────────────────────────────────────────────────────

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Ism, manzil, izoh kabi ma'lumot — chop etishda tarjima qilinmaydi. */
export function escapeData(value: string): string {
  return rawHtml(escapeHtml(value));
}

function waybillsDocument(
  orders: LogistOrder[],
  qrByOrder: Record<string, string>,
): string {
  return `<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8" />
<title>Yo'l varaqasi</title>
<style>
  @page { size: A5; margin: 10mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font: 12px/1.45 -apple-system, "Segoe UI", Arial, sans-serif;
    color: #111;
  }
  .waybill { page-break-after: always; }
  .waybill:last-child { page-break-after: auto; }
  .head {
    display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 2px solid #111; padding-bottom: 6px; gap: 8px;
  }
  .head h1 { font-size: 15px; margin: 0; }
  .head .no { font-size: 14px; font-weight: 700; }
  .head img { width: 54px; height: 54px; }
  dl { display: grid; grid-template-columns: 32% 68%; gap: 3px 8px; margin: 10px 0; }
  dt { color: #555; }
  dd { margin: 0; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th, td { border: 1px solid #999; padding: 4px 6px; text-align: left; }
  th { background: #f0f0f0; font-size: 11px; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  .total { text-align: right; font-size: 13px; font-weight: 700; margin: 6px 0 14px; }
  .sign { display: flex; gap: 24px; margin-top: 18px; }
  .sign div { flex: 1; }
  .sign .line { border-bottom: 1px solid #111; height: 26px; }
  .sign p { margin: 3px 0 0; color: #555; font-size: 10px; }
  .cod { display: inline-block; border: 1.5px solid #111; border-radius: 4px;
         padding: 1px 6px; font-weight: 700; font-size: 11px; }
</style>
</head>
<body>
${orders.map((order) => waybillHtml(order, qrByOrder[order.id])).join("\n")}
</body>
</html>`;
}

/**
 * Kuryer pul olib kelishi kerakmi.
 *
 * Naqd — ha; karta tanlangan bo'lsa-yu to'lov tushmagan bo'lsa ham — ha.
 * Ilgari varaqada faqat "naqd" belgilanardi va to'lanmagan karta buyurtmasi
 * kuryerga to'langandek ko'rinardi.
 */
function collectsMoney(order: LogistOrder): boolean {
  const payment = paymentView(order);
  return payment.state === "cod" || payment.needsAttention;
}

/**
 * Mahsulot nomi yonidagi qavs: sovg'a manbasi yoki chegirma/aksiya belgisi.
 * Admin yorlig'i ("1+1") — server ma'lumoti, chop etishda o'girilmaydi.
 */
function itemNote(item: OrderItem): string {
  if (item.isGift) return ` (${escapeHtml(giftSourceLabel(item.giftSource))})`;
  const badge = itemPriceBadge(item);
  if (!badge) return "";
  return ` (${badge.fromServer ? escapeData(badge.label) : escapeHtml(badge.label)})`;
}

/**
 * Bitta varaqaning HTMLi — `printWaybills` shu yerdan yig'adi; test ham shuni
 * o'qiydi (sovg'a qatori tushib qolmasligi qadalgan).
 *
 * ⚠️ **Tarkib FILTRLANMAYDI.** Sovg'a qatori `is_gift: true`, summasi `0`
 * bo'lib keladi: uni "to'lanadigan qator" deb kesib tashlash kuryerga
 * yetmaydigan sovg'a degani, ya'ni mijoz sovg'asiz qoladi. Narx ustuni nol
 * bo'lsa ham qator qoladi va manbasi bilan belgilanadi.
 *
 * Chegirma/aksiya bilan sotilgan qator nomi yonida ixcham matn oladi
 * (`(−50%)`, `(1+1)`) — rang emas, chunki oq-qora bosmada rang yo'qoladi.
 */
export function waybillHtml(order: LogistOrder, qr?: string): string {
  const address = formatDeliveryAddress(order) ?? "";

  const rows = order.items
    .map(
      (item, index) => `<tr>
        <td class="num">${index + 1}</td>
        <td>${escapeData(item.name || "—")}${itemNote(item)}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${escapeHtml(formatSom(item.price))}</td>
      </tr>`,
    )
    .join("\n");

  return `<article class="waybill">
  <header class="head">
    <div>
      <h1>Mehrigiyo — yo'l varaqasi</h1>
      <span class="no">${escapeData(order.orderNumber || order.id.slice(0, 8))}</span>
    </div>${qr ? `\n    <img src="${qr}" alt="QR" />` : ""}
  </header>

  <dl>
    <dt>Sana</dt><dd>${order.createdAt ? escapeHtml(formatDateTime(order.createdAt)) : "—"}</dd>
    <dt>Mijoz</dt><dd>${escapeData(order.client.fullName || "—")}</dd>
    <dt>Telefon</dt><dd>${escapeHtml(formatPhone(order.client.phone))}</dd>
    <dt>Manzil</dt><dd>${escapeData(address || "—")}</dd>
    <dt>To'lov</dt><dd>${escapeHtml(paymentSummary(order) || "—")} ${
      collectsMoney(order) ? '<span class="cod">PUL OLINADI</span>' : ""
    }</dd>
    <dt>Kuryer</dt><dd>${escapeData(order.courier?.fullName ?? "________________")}</dd>${
      order.logistNote
        ? `\n    <dt>Izoh</dt><dd>${escapeData(order.logistNote)}</dd>`
        : ""
    }${
      order.deliveryAttempts.length > 0
        ? `\n    <dt>Urinishlar</dt><dd>${order.deliveryAttempts
            .map((attempt) => escapeHtml(attemptReasonLabel(attempt.reason)))
            .join(", ")}</dd>`
        : ""
    }
  </dl>

  <table>
    <thead>
      <tr><th class="num">№</th><th>Mahsulot</th><th class="num">Soni</th><th class="num">Summa</th></tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>

  <p class="total">${
    hasPointsDiscount(order)
      ? `Mahsulotlar: ${escapeHtml(formatSom(order.totalAmount))}<br />
     Ball chegirmasi: −${escapeHtml(formatSom(order.pointsDiscount))}<br />
     To'lanadi: ${escapeHtml(formatSom(order.payableAmount))}`
      : `Jami: ${escapeHtml(formatSom(order.totalAmount))}`
  }</p>

  <div class="sign">
    <div><div class="line"></div><p>Kuryer imzosi</p></div>
    <div><div class="line"></div><p>Mijoz imzosi</p></div>
  </div>
</article>`;
}
