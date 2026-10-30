/**
 * Scroll xotirasi (2026-10-29): ustun, doska yoki sahifa qayerda turgani
 * kalit bo'yicha eslab qolinadi — detalga kirib Esc/«orqaga» bilan
 * qaytganda yoki boshqa bo'limga o'tib kelganda o'sha joydan davom etadi.
 *
 * Ikki qatlam: xotiradagi `Map` (tez, sahifalar orasida) va
 * `sessionStorage` (sahifa yangilansa ham shu tab ichida). Saqlash
 * imkonsiz bo'lsa (yopiq rejim) — faqat xotira, hech narsa yiqilmaydi.
 */
export type ScrollAxis = "y" | "x";

const STORAGE_KEY = "scroll-memory:v1";
/** Bitta tabda shuncha kalitdan ortig'i saqlanmaydi — eng eskisi tushadi. */
const MAX_KEYS = 200;

const memory = new Map<string, number>();
let hydrated = false;

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof value === "number" && Number.isFinite(value) && value > 0) memory.set(key, value);
      }
    }
  } catch {
    // sessionStorage yopiq — faqat xotira bilan ishlaymiz.
  }
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function persist() {
  if (persistTimer !== null) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(memory)));
    } catch {
      // Joy tugagan yoki yopiq — xotiradagi qiymat baribir ishlaydi.
    }
  }, 250);
}

export function readScroll(key: string): number {
  if (typeof window !== "undefined") hydrate();
  return memory.get(key) ?? 0;
}

export function writeScroll(key: string, value: number) {
  if (typeof window !== "undefined") hydrate();
  const rounded = Math.max(0, Math.round(value));
  memory.delete(key);
  if (rounded > 0) memory.set(key, rounded);
  while (memory.size > MAX_KEYS) {
    const oldest = memory.keys().next().value;
    if (oldest === undefined) break;
    memory.delete(oldest);
  }
  if (typeof window !== "undefined") persist();
}

/** Faqat testlar uchun. */
export function resetScrollMemory() {
  memory.clear();
  hydrated = true;
}

/**
 * Tiklash qaroridagi sof qoida: element ko'rinadimi, maqsadga yetdikmi,
 * yoki kontent hali qisqa (kartalar bosqichma-bosqich chizilmoqda) va
 * kutish kerakmi.
 */
export function restoreStep(input: {
  target: number;
  current: number;
  /** `scrollHeight - clientHeight` (yoki `x` o'qida kenglik bo'yicha). */
  max: number;
  visible: boolean;
}): "done" | "apply" | "wait" {
  if (input.target <= 0) return "done";
  if (!input.visible) return "wait";
  if (Math.abs(input.current - input.target) <= 1) return "done";
  // Kontent maqsadgacha yetmaydi — iloji boricha suramiz va o'sishini kutamiz.
  return input.max + 1 < input.target ? "wait" : "apply";
}
