"use client";

import Link from "next/link";
import { Fragment, useMemo } from "react";
import { toast } from "sonner";

import { linkify } from "@/lib/linkify";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

/**
 * Matndagi havola, telefon va buyurtma raqamlarini bosiladigan qiladi —
 * Telegram'dagi kabi. Ajratish `lib/linkify.ts` da (sof funksiya), bu yer
 * faqat chizadi:
 *
 *   url   — yangi oynada ochiladi (`noopener`), `href` faqat `http(s)`;
 *   phone — `tel:` havola; bosilganda raqam buferga ham tushadi (operator
 *           ko'pincha CRM'ga nusxalaydi, dialerga emas);
 *   order — panelning o'zida buyurtma qidiruvi (`/orders?q=…`).
 *
 * Ota element (`<p>`) o'z uslubini beradi — bu komponent faqat bo'laklarni
 * qaytaradi. Bosish hodisasi yuqoriga chiqmaydi: pufakning "javob berish"
 * yoki kartaning "ochish" bosishi ishga tushib ketmasin.
 */
export function LinkifiedText({
  text,
  linkClassName = "text-link",
}: {
  text: string;
  /** Fon rangiga qarab: brend pufakda oq (`text-link-on-brand`), oddiyda brend rangi. */
  linkClassName?: string;
}) {
  const segments = useMemo(() => linkify(text), [text]);

  if (segments.every((segment) => segment.type === "text")) {
    return <>{text}</>;
  }

  const className = cn(
    "cursor-pointer break-all underline underline-offset-2 hover:no-underline",
    linkClassName,
  );
  const stop = (event: React.MouseEvent) => event.stopPropagation();

  return (
    <>
      {segments.map((segment, index) => {
        switch (segment.type) {
          case "url":
            return (
              <a
                key={index}
                href={segment.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={stop}
                className={className}
              >
                {segment.value}
              </a>
            );
          case "phone":
            return (
              <a
                key={index}
                href={`tel:+${segment.digits}`}
                onClick={(event) => {
                  stop(event);
                  void copyPhone(segment.digits);
                }}
                title="Telefon raqamini nusxalash"
                className={cn(className, "tabular")}
              >
                {segment.value}
              </a>
            );
          case "order":
            return (
              <Link
                key={index}
                href={ROUTES.orderSearch(segment.orderNumber)}
                onClick={stop}
                title="Buyurtmani ochish"
                className={className}
              >
                {segment.value}
              </Link>
            );
          default:
            return <Fragment key={index}>{segment.value}</Fragment>;
        }
      })}
    </>
  );
}

/** Raqam buferga `+998…` ko'rinishida tushadi; bufer yopiq bo'lsa jim. */
async function copyPhone(digits: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(`+${digits}`);
    toast.success("Telefon raqami nusxalandi");
  } catch {
    // Dialer baribir ochiladi — nusxa muvaffaqiyatsizligi xato emas.
  }
}
