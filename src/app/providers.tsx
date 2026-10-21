"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";

import { useApplyLocale } from "@/shared/i18n/locale";
import { isAppError } from "@/shared/lib/app-error";
import { TooltipProvider } from "@/shared/ui/tooltip";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        // 4xx va shartnoma xatosi — qayta urinish foyda bermaydi.
        retry: (failureCount, error) => {
          if (isAppError(error) && ["validation", "unauthorized", "forbidden", "not-found", "conflict", "parse"].includes(error.kind)) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}

function LocaleSync() {
  useApplyLocale();
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <NuqsAdapter>
          <TooltipProvider delayDuration={300}>
            <LocaleSync />
            {children}
            <Toaster position="top-center" richColors closeButton duration={3500} />
          </TooltipProvider>
        </NuqsAdapter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
