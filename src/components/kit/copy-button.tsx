"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

/**
 * Nusxalash tugmasi: bosilgach ikonka 1.5 soniyaga "bajarildi" holatiga
 * o'tadi. Operator kuniga o'nlab telefon raqam nusxalaydi — shuning uchun
 * tasdiq toast'dan tashqari joyning o'zida ham ko'rinadi.
 */
export function CopyButton({
  value,
  label,
  successMessage,
  className,
  children,
}: {
  value: string;
  /** Skrinrider uchun tavsif. */
  label: string;
  successMessage?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async (event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (successMessage) toast.success(successMessage);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Nusxalab bo'lmadi");
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      title={label}
      className={cn(
        "text-ink-muted hover:text-ink hover:bg-subtle inline-flex items-center gap-1.5 rounded-md",
        "px-1.5 py-0.5 transition-colors",
        className,
      )}
    >
      {children}
      {copied ? (
        <Check className="text-ok size-3.5 shrink-0" />
      ) : (
        <Copy className="size-3.5 shrink-0 opacity-60" />
      )}
    </button>
  );
}
