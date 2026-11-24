/**
 * Ish stoli signallari — shoshilinch zakaz uchun (hujjat 123 §4). Bosh kuryer
 * boshqa tabda yoki boshqa sahifada bo'lsa ham sezishi kerak. Uch usul birga:
 *   1. ovozli signal (fayl yuklamasdan, Web Audio);
 *   2. tab sarlavhasida belgi — `(2) Shoshilinch · Mehrigiyo Bosh kuryer`;
 *   3. brauzer bildirishnomasi (ruxsat berilgan bo'lsa).
 * Yondashuv logist saytidagi `src/lib/alerts.ts` bilan bir xil.
 */

const BASE_TITLE = "Mehrigiyo Bosh kuryer";

/** Sarlavha — brauzer interfeysi (DOM tarjimoni tegmaydi), shuning uchun matn tashqaridan keladi. */
export function setTitleAlert(text: string | null) {
  if (typeof document === "undefined") return;
  const next = text ? `${text} · ${BASE_TITLE}` : BASE_TITLE;
  if (document.title !== next) document.title = next;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ovoz
// ─────────────────────────────────────────────────────────────────────────────

let audioContext: AudioContext | null = null;

/**
 * Brauzer foydalanuvchi bosmaguncha ovozga ruxsat bermaydi. Birinchi bosishda
 * chaqiriladi — keyingi signallar sahifa fonda bo'lsa ham chalinadi.
 */
export function unlockAudio() {
  if (typeof window === "undefined") return;
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === "suspended") void audioContext.resume();
  } catch {
    // Ovoz — qo'shimcha kanal; ishlamasa banner va sarlavha qoladi.
  }
}

/** Notalar (Hz) va har birining davomiyligi — oddiy «ding»dan ajralib turadigan uch juft signal. */
const ALARM_NOTES = [988, 740, 988, 740, 988, 740] as const;
const NOTE_SECONDS = 0.16;

/** Shoshilinch signal: qat'iy, lekin qisqa (~1 soniya). */
export function playUrgentAlarm() {
  if (typeof window === "undefined") return;
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === "suspended") void audioContext.resume();
    const now = audioContext.currentTime;

    for (const [index, frequency] of ALARM_NOTES.entries()) {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.value = frequency;

      const start = now + index * NOTE_SECONDS;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.22, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + NOTE_SECONDS - 0.01);

      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + NOTE_SECONDS);
    }
  } catch {
    // Ovoz ishlamasa jimgina o'tkazib yuboriladi.
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Brauzer bildirishnomasi
// ─────────────────────────────────────────────────────────────────────────────

/** Ruxsat so'rash — faqat foydalanuvchi bosganida (brauzer talabi); rad etilgan bo'lsa qayta so'ralmaydi. */
export function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "default") return;
  try {
    void Notification.requestPermission();
  } catch {
    // Eski Safari `requestPermission` ni promise'siz beradi — bildirishnomasiz ham ishlaydi.
  }
}

/** Sahifa ko'rinmayotganda ma'noli — chaqiruvchi `document.hidden` ni tekshiradi. */
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
    const notification = new Notification(title, { body, tag, icon: "/favicon.png", badge: "/favicon.png" });
    notification.onclick = () => {
      window.focus();
      notification.close();
      onClick?.();
    };
  } catch {
    // Ba'zi brauzerlar (Android Chrome) Service Worker'siz `new Notification` ni rad etadi.
  }
}
