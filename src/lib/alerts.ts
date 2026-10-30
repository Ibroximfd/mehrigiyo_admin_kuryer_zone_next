/**
 * Ish stoli signallari — `core/notifications/platform/alerts_bridge_web.dart`
 * ning ko'chirmasi.
 *
 * Operator boshqa tabda ishlayotganda yangi lead yoki xabar kelganini
 * sezishi kerak. Uchta usul birga ishlaydi:
 *   1. brauzer bildirishnomasi (ruxsat berilgan bo'lsa);
 *   2. qisqa ovozli signal;
 *   3. tab sarlavhasida hisoblagich — `(3) Mehrigiyo Bosh kuryer`.
 */

const BASE_TITLE = "Mehrigiyo Bosh kuryer";

// ─────────────────────────────────────────────────────────────────────────────
// Tab sarlavhasi
// ─────────────────────────────────────────────────────────────────────────────

export function setTitleBadge(count: number) {
  if (typeof document === "undefined") return;
  document.title = count > 0 ? `(${count}) ${BASE_TITLE}` : BASE_TITLE;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ovoz
// ─────────────────────────────────────────────────────────────────────────────

let audioContext: AudioContext | null = null;

/**
 * Qisqa, xushmuomala "ding" — audio fayl yuklamasdan, Web Audio API bilan
 * sintez qilinadi (ikki nota, tez so'nuvchi).
 */
export function playChime() {
  if (typeof window === "undefined") return;

  try {
    audioContext ??= new AudioContext();
    // Brauzer avtomatik ijroni to'xtatgan bo'lishi mumkin.
    if (audioContext.state === "suspended") void audioContext.resume();

    const now = audioContext.currentTime;

    for (const [index, frequency] of [880, 1320].entries()) {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;

      const start = now + index * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.16, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);

      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.3);
    }
  } catch {
    // Ovoz — qo'shimcha qulaylik; ishlamasa jimgina o'tkazib yuboramiz.
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Brauzer bildirishnomasi
// ─────────────────────────────────────────────────────────────────────────────

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const result = await Notification.requestPermission();
  return result === "granted";
}

/**
 * Bildirishnoma ko'rsatadi. Faqat sahifa ko'rinmayotganda mantiqan to'g'ri —
 * shuning uchun chaqiruvchi `document.hidden` ni tekshiradi.
 */
export function showNotification({
  title,
  body,
  tag,
  onClick,
}: {
  title: string;
  body: string;
  /** Bir xil `tag` li bildirishnomalar ustma-ust to'planmaydi. */
  tag?: string;
  onClick?: () => void;
}) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    const notification = new Notification(title, {
      body,
      tag,
      icon: "/favicon.png",
      badge: "/favicon.png",
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      onClick?.();
    };
  } catch {
    // Ba'zi brauzerlar Service Worker'siz `new Notification` ni rad etadi.
  }
}
