"use client";

import { useEffect } from "react";

import { useStaffUnreadTotal } from "@/features/staff-chat/use-staff-unread";
import { useBadgeStore } from "@/stores/badge-store";

/**
 * Brauzer tab'idagi hisoblagich: yangi ariza/buyurtma soni sarlavhaga
 * `(N)` bo'lib chiqadi, ikonkaga esa och qizil doira ichida chiziladi —
 * xuddi Gmail'dagidek.
 *
 * Nega ikonka? Tab sarlavhasi matniga rang berib bo'lmaydi (u brauzerning
 * o'z interfeysi) — qizil signalning yagona yo'li favicon'ning o'zini
 * canvas'da qayta chizish.
 */

const BASE_TITLE = "Mehrigiyo Bosh kuryer";
const ICON_URL = "/favicon.png";
const ICON_SIZE = 64;

/** Tab fonida ham yorqin ko'rinadigan och qizil. */
const BADGE_COLOR = "#f21d1d";

function drawBadgedIcon(image: HTMLImageElement, count: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = ICON_SIZE;
  canvas.height = ICON_SIZE;

  const context = canvas.getContext("2d");
  if (!context) return ICON_URL;

  context.drawImage(image, 0, 0, ICON_SIZE, ICON_SIZE);

  // O'ng yuqori burchakdagi qizil doira. Oq hoshiya uni logotipdan ajratib,
  // har qanday fonda o'qiladigan qiladi.
  const centerX = 43;
  const centerY = 21;
  const radius = 19;

  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fillStyle = BADGE_COLOR;
  context.fill();
  context.lineWidth = 4;
  context.strokeStyle = "rgb(255 255 255 / 0.9)";
  context.stroke();

  const label = count > 9 ? "9+" : String(count);
  context.fillStyle = "#ffffff";
  context.font = `bold ${label.length > 1 ? 22 : 26}px -apple-system, "Segoe UI", Arial, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, centerX, centerY + 1);

  return canvas.toDataURL("image/png");
}

/** `<link rel="icon">` ni topadi, bo'lmasa yaratadi. */
function iconLink(): HTMLLinkElement {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.append(link);
  }
  return link;
}

export function useTabBadge() {
  const records = useBadgeStore(
    (state) => state.newOrders + state.incomingTransfers,
  );
  // Xodimlar chatidagi yangi xabar ham tab'da ko'rinsin — boshqa tabda
  // ishlayotgan logist uni shu yerdan biladi.
  const staffUnread = useStaffUnreadTotal();
  const count = records + staffUnread;

  useEffect(() => {
    document.title = count > 0 ? `(${count}) ${BASE_TITLE}` : BASE_TITLE;

    if (count === 0) {
      iconLink().href = ICON_URL;
      return;
    }

    // Rasm keshdan keladi (birinchi yuklashdan keyin), shuning uchun badge
    // deyarli bir zumda yangilanadi.
    let cancelled = false;
    const image = new Image();
    image.src = ICON_URL;
    image.onload = () => {
      if (!cancelled) iconLink().href = drawBadgedIcon(image, count);
    };

    return () => {
      cancelled = true;
    };
  }, [count]);

  // Panel yopilganda (masalan, login'ga qaytganda) toza holatga qaytaramiz.
  useEffect(() => {
    return () => {
      document.title = BASE_TITLE;
      iconLink().href = ICON_URL;
    };
  }, []);
}
