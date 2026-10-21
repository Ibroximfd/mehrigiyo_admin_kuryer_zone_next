"use client";

import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { useAuthStore } from "@/features/auth/hooks/auth-store";
import { LOCALE_NAMES, LOCALES, setLocale, useLocale, useT, type Locale } from "@/shared/i18n/locale";
import { formatPhone } from "@/shared/lib/phone";
import { Button } from "@/shared/ui/button";
import { SegmentedControl } from "@/shared/ui/segmented-control";

const THEMES = ["light", "dark", "system"] as const;
type Theme = (typeof THEMES)[number];

function isTheme(value: string | undefined): value is Theme {
  return THEMES.some((theme) => theme === value);
}

export function useSignOut() {
  const signOut = useAuthStore((state) => state.signOut);
  const queryClient = useQueryClient();
  return () => {
    // Keyingi foydalanuvchi oldingisining keshini ko'rmasin.
    queryClient.clear();
    signOut();
  };
}

/** Akkaunt sarlavhasi: telefon + rol. */
export function AccountSummary() {
  const t = useT();
  const user = useAuthStore((state) => state.user);
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-ink tabular">{user?.phone ? formatPhone(user.phone) : t.shell.account}</p>
      <p className="text-xs text-ink-faint">{user?.isSuperuser ? t.shell.superuser : t.shell.admin}</p>
    </div>
  );
}

/** Mavzu, til va chiqish — telefondagi menyu varag'ida to'liq ko'rinishda. */
export function AccountControls() {
  const t = useT();
  const locale = useLocale();
  const { theme, setTheme } = useTheme();
  const signOut = useSignOut();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-ink-faint">{t.shell.theme}</p>
        <SegmentedControl<Theme>
          label={t.shell.theme}
          value={isTheme(theme) ? theme : "system"}
          onValueChange={setTheme}
          options={[
            { value: "light", label: <><Sun className="size-4" aria-hidden />{t.shell.themeLight}</> },
            { value: "dark", label: <><Moon className="size-4" aria-hidden />{t.shell.themeDark}</> },
            { value: "system", label: <><Monitor className="size-4" aria-hidden />{t.shell.themeSystem}</> },
          ]}
        />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-ink-faint">{t.shell.language}</p>
        <SegmentedControl<Locale>
          label={t.shell.language}
          value={locale}
          onValueChange={setLocale}
          options={LOCALES.map((value) => ({ value, label: LOCALE_NAMES[value] }))}
        />
      </div>
      <Button variant="danger-ghost" className="justify-start" onClick={signOut}>
        <LogOut aria-hidden />
        {t.shell.logout}
      </Button>
    </div>
  );
}
