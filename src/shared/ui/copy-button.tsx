"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { useT } from "@/shared/i18n/locale";

import { Button, type ButtonProps } from "./button";

/** Nusxalash; muvaffaqiyat 2 soniya tugmaning o'zida ko'rinadi (va e'lon qilinadi). */
export function CopyButton({ value, label, ...props }: { value: string; label?: string } & Omit<ButtonProps, "onClick">) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard ruxsati yo'q (HTTP yoki eski brauzer) — matn ekranda ko'rinib turibdi.
      setCopied(false);
    }
  };

  return (
    <Button variant="outline" onClick={copy} {...props}>
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      <span aria-live="polite">{copied ? t.common.copied : (label ?? t.common.copy)}</span>
    </Button>
  );
}
