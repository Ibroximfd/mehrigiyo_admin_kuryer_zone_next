"use client";

import { ChevronsUpDown, LogOut, UserRound } from "lucide-react";
import { useTheme } from "next-themes";

import { LOCALE_NAMES, LOCALES, setLocale, useLocale, useT } from "@/shared/i18n/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

import { AccountSummary, useSignOut } from "./account-controls";

/** Desktop yon panel pastidagi akkaunt menyusi. */
export function AccountMenu() {
  const t = useT();
  const locale = useLocale();
  const { theme, setTheme } = useTheme();
  const signOut = useSignOut();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-xl p-2 text-left outline-none transition hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-ring/40">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-soft-ink" aria-hidden>
          <UserRound className="size-5" />
        </span>
        <AccountSummary />
        <ChevronsUpDown className="ml-auto size-4 shrink-0 text-ink-faint" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-64">
        <DropdownMenuLabel>{t.shell.theme}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">{t.shell.themeLight}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">{t.shell.themeDark}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">{t.shell.themeSystem}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t.shell.language}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(value) => {
            const next = LOCALES.find((item) => item === value);
            if (next) setLocale(next);
          }}
        >
          {LOCALES.map((value) => (
            <DropdownMenuRadioItem key={value} value={value}>
              {LOCALE_NAMES[value]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem tone="danger" onSelect={signOut}>
          <LogOut aria-hidden />
          {t.shell.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
