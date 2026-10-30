"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { useState } from "react";
import { Toaster } from "sonner";

import { LocaleProvider } from "@/components/locale-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useLocaleRefetch } from "@/hooks/use-locale-refetch";
import { MouseScrollSupport } from "@/components/mouse-scroll-support";

/**
 * Global provayderlar — `main.dart` dagi `MultiBlocProvider` ning o'rni.
 *
 * • QueryClient — server ma'lumoti (kesh, yuklanish, xatolik, qayta yuklash)
 * • ThemeProvider — yorug'/qorong'i/tizim mavzusi
 * • NuqsAdapter — filtrlarni manzil qatorida saqlash
 * • LocaleProvider — tanlangan tilni (ru / uz-cyrl / uz-latn) DOM'ga qo'llash
 */
const THEME_SCRIPT_PROPS = typeof window === "undefined" ? undefined : ({ type: "application/json" } as const);

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Operator paneli — ma'lumot tez eskiradi, lekin sahifalar
            // orasida sakraganda qayta yuklab o'tirmasin.
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            // Boshqa oynadan qaytganda ma'lumot yangilansin.
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            retry: (failureCount, error) => {
              // 4xx — qayta urinishdan foyda yo'q.
              const status = (error as { status?: number })?.status;
              if (status && status >= 400 && status < 500) return false;
              return failureCount < 2;
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <LocaleRefetch />
      <LocaleProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        // React 19 klientda `<script>` uchun ogohlantiradi; skript faqat
        // serverda (HTML'da) kerak — klientda u JSON turi bilan bezarar.
        scriptProps={THEME_SCRIPT_PROPS}
        disableTransitionOnChange
      >
        <NuqsAdapter>
          <TooltipProvider delayDuration={300}>
            <MouseScrollSupport />
            {children}
            <Toaster
              position="bottom-right"
              richColors
              closeButton
              gap={8}
              toastOptions={{ duration: 3500 }}
            />
          </TooltipProvider>
        </NuqsAdapter>
      </ThemeProvider>
      </LocaleProvider>
    </QueryClientProvider>
  );
}

/** `useQueryClient` provayder ichida bo'lishi uchun alohida tugun. */
function LocaleRefetch() {
  useLocaleRefetch();
  return null;
}
