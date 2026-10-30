"use client";

import { PhoneCall } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatPhone } from "@/lib/format";
import { sipCallUrl } from "@/lib/sip";
import { cn } from "@/lib/utils";

/**
 * MicroSIP orqali qo'ng'iroq qilish tugmasi. `sip:` havolasi tizim
 * tomonidan MicroSIP ilovasiga uzatiladi va raqam terila boshlaydi.
 * `target` yo'q — protokol havolasi sahifadan olib chiqmaydi, bo'sh tab
 * ham ochilmaydi.
 */
export function CallButton({
  phone,
  className,
  size = "sm",
}: {
  phone: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const href = sipCallUrl(phone);
  if (!href) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={href}
          onClick={(event) => event.stopPropagation()}
          aria-label={`${formatPhone(phone)} raqamiga qo'ng'iroq qilish`}
          className={cn(
            "text-ink-faint hover:text-brand hover:bg-brand-soft inline-flex shrink-0 items-center justify-center rounded-md transition-colors",
            size === "sm" ? "p-1" : "p-2",
            className,
          )}
        >
          <PhoneCall className={size === "sm" ? "size-3.5" : "size-4"} />
        </a>
      </TooltipTrigger>
      <TooltipContent>MicroSIP orqali qo&apos;ng&apos;iroq</TooltipContent>
    </Tooltip>
  );
}
