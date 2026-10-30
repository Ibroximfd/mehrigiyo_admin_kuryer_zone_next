"use client";

import { useLayoutEffect } from "react";

import {
  TEXT_ATTRIBUTES,
  convertAttribute,
  convertChildText,
  convertText,
  convertTree,
  restoreTree,
} from "@/lib/i18n/dom";
import { localeInfo } from "@/lib/i18n/locale";
import { converterFor } from "@/lib/i18n/translate";
import { useLocaleStore } from "@/stores/locale-store";

/** Boot skripti qo'yadigan atribut: til qo'llanguncha sahifa ko'rinmaydi. */
export const LOCALE_PENDING_ATTRIBUTE = "data-i18n-pending";

/**
 * Tanlangan tilni butun sahifaga qo'llaydi.
 *
 * Mavjud DOM bir marta o'giriladi, so'ng `MutationObserver` React chizgan
 * yangi tugunlarni ham ushlaydi (kuzatuvchi mikrovazifada ishlaydi — ya'ni
 * chizishdan OLDIN, lotin matn ekranda bir kadr ham ko'rinmaydi). Til
 * almashganda avval asl matnlar tiklanadi, keyin yangisi qo'llanadi.
 *
 * `useLayoutEffect` — birinchi chizishdan oldin; Radix portallari va sonner
 * ham `body` ichida, shuning uchun ular ham qamrab olinadi.
 */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocaleStore((state) => state.locale);
  const hydrated = useLocaleStore((state) => state.hydrated);

  useLayoutEffect(() => {
    void useLocaleStore.persist.rehydrate();
  }, []);

  useLayoutEffect(() => {
    if (!hydrated) return;
    document.documentElement.lang = localeInfo(locale).htmlLang;

    const convert = converterFor(locale);
    const body = document.body;
    const reveal = () =>
      document.documentElement.removeAttribute(LOCALE_PENDING_ATTRIBUTE);

    if (!convert) {
      reveal();
      return;
    }

    convertTree(body, convert);
    reveal();

    // Chetlatish qoidalarini `dom.ts` o'zi tekshiradi va o'z yozganini qayta
    // ishlamaydi — kuzatuvchini uzib-ulash shart emas, halqa hosil bo'lmaydi.
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "characterData") {
          if (record.target.nodeType === Node.TEXT_NODE) {
            convertText(record.target as Text, convert);
          }
          continue;
        }

        if (record.type === "attributes") {
          if (record.attributeName) {
            convertAttribute(record.target as Element, record.attributeName, convert);
          }
          continue;
        }

        for (const added of record.addedNodes) convertTree(added, convert);
        // Qo'shni matn tuguni olib tashlansa, qolganlari qayta yig'iladi.
        if (record.removedNodes.length > 0) convertChildText(record.target, convert);
      }
    });

    observer.observe(body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: TEXT_ATTRIBUTES,
    });

    return () => {
      observer.disconnect();
      restoreTree(body);
    };
  }, [locale, hydrated]);

  return <>{children}</>;
}
