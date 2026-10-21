"use client";

import { LoaderCircle } from "lucide-react";

import { useT } from "@/shared/i18n/locale";

import { BrandMark } from "./brand-mark";

export function Splash() {
  const t = useT();
  return (
    <div role="status" className="grid min-h-dvh place-items-center bg-canvas">
      <div className="flex flex-col items-center gap-4 text-ink-muted">
        <BrandMark className="size-12" />
        <LoaderCircle className="size-5 animate-spin" aria-hidden />
        <span className="sr-only">{t.auth.checking}</span>
      </div>
    </div>
  );
}
