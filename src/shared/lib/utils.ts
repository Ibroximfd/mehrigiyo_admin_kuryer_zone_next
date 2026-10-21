import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Klasslarni birlashtiradi; to'qnashgan Tailwind klasslarida oxirgisi yutadi. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
