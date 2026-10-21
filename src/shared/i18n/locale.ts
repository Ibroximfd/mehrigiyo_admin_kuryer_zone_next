"use client";

import { useEffect, useSyncExternalStore } from "react";

import { setApiLanguage } from "@/shared/lib/api-client";

import { ru } from "./ru";
import { uz, type Dictionary } from "./uz";

/**
 * Til tanlovi: `uz` (lotin, sukut) va `ru`. Tanlov `localStorage` da;
 * server render va birinchi gidratatsiya har doim `uz` — keyin
 * `useSyncExternalStore` saqlangan tilga o'tkazadi (gidratatsiya xatosiz).
 */

export const LOCALES = ["uz", "ru"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "uz";
const STORAGE_KEY = "mehrigiyo_admin_locale";

const DICTIONARIES: Record<Locale, Dictionary> = { uz, ru };

/** Brauzer `lang` atributi va backend `X-Lang` qiymati. */
export const LOCALE_TAGS: Record<Locale, string> = { uz: "uz-Latn", ru: "ru" };

export const LOCALE_NAMES: Record<Locale, string> = { uz: "O'zbekcha", ru: "Русский" };

const listeners = new Set<() => void>();

function isLocale(value: string | null): value is Locale {
  return LOCALES.some((locale) => locale === value);
}

function readStoredLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isLocale(stored) ? stored : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

function applyLocale(locale: Locale): void {
  document.documentElement.lang = LOCALE_TAGS[locale];
  setApiLanguage(locale);
}

export function setLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Saqlab bo'lmasa ham joriy sahifa tilni almashtiradi.
  }
  applyLocale(locale);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, readStoredLocale, () => DEFAULT_LOCALE);
}

/** `<html lang>` va API tilini joriy tanlovga moslaydi — provayderda bir marta. */
export function useApplyLocale(): void {
  const locale = useLocale();
  useEffect(() => applyLocale(locale), [locale]);
}

/** Joriy til lug'ati — komponentlardagi barcha matn shu yerdan. */
export function useT(): Dictionary {
  return DICTIONARIES[useLocale()];
}
