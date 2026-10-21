"use client";

import Link from "next/link";

import { ROUTES } from "@/shared/config/routes";
import { useT } from "@/shared/i18n/locale";
import { BrandMark } from "@/shared/ui/brand-mark";
import { Button } from "@/shared/ui/button";

export default function NotFound() {
  const t = useT();
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <BrandMark className="size-12" />
        <h1 className="text-2xl font-semibold tracking-tight">{t.states.notFoundTitle}</h1>
        <p className="text-sm text-ink-muted">{t.states.notFoundText}</p>
        <Button asChild>
          <Link href={ROUTES.home}>{t.states.toHome}</Link>
        </Button>
      </div>
    </main>
  );
}
