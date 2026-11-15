"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { CopyButton } from "@/components/kit/copy-button";
import { Button } from "@/components/ui/button";
import { MASKED_SECRET } from "@/lib/password";
import { cn } from "@/lib/utils";

/**
 * Sir qiymat (parol): sukut bo'yicha yashirin, 👁 bosilganda ko'rinadi,
 * yonida nusxa tugmasi. Ekran yonidagi begona odam ko'rib qolmasin (hujjat 67).
 */
export function SecretValue({ value, label, className }: { value: string; label: string; className?: string }) {
  const [shown, setShown] = useState(false);
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="text-ink tabular text-title font-semibold tracking-wide" data-no-translit>
        {shown ? value : MASKED_SECRET}
      </span>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={shown ? `${label}: yashirish` : `${label}: ko'rsatish`}
        aria-pressed={shown}
        onClick={() => setShown((prev) => !prev)}
      >
        {shown ? <EyeOff /> : <Eye />}
      </Button>
      <CopyButton value={value} label={`${label}: nusxalash`} successMessage="Nusxalandi" />
    </span>
  );
}
