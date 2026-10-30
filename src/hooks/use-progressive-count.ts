"use client";

import { useEffect, useState } from "react";

/**
 * Uzun ro'yxatni bosqichma-bosqich chizish: avval `initial` ta element,
 * keyin har kadrda yana `step` ta — 250 ta karta bitta uzun kadrda
 * chizilib sahifa qotib qolmaydi. Ro'yxat qisqarsa hisob ham qisqaradi;
 * o'sganda (sahifa davomi) yangi qismi ham bosqichma-bosqich qo'shiladi.
 */
export function useProgressiveCount(total: number, initial = 16, step = 16): number {
  const [count, setCount] = useState(() => Math.min(total, initial));

  useEffect(() => {
    if (count >= total) return;
    const frame = requestAnimationFrame(() => setCount((current) => Math.min(total, current + step)));
    return () => cancelAnimationFrame(frame);
  }, [count, total, step]);

  return Math.min(count, total);
}
