"use client";

import { Archive, CloudOff, PackageCheck, SearchX, Truck } from "lucide-react";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { useCallback, useMemo } from "react";

import { PageHeader } from "@/components/kit/page-header";
import { SearchInput } from "@/components/kit/search-input";
import { EmptyView, ErrorView } from "@/components/kit/state-views";
import { Button } from "@/components/ui/button";
import { LeadDetailSheet } from "@/features/pipeline/components/lead-detail-sheet";
import {
  PipelineBoardSkeleton,
  PipelineBoardView,
} from "@/features/pipeline/components/pipeline-board";
import type { PipelineLead } from "@/features/pipeline/types";
import { usePipelineBoard } from "@/features/pipeline/use-pipeline-board";
import type { PipelineStage } from "@/features/pipeline/use-pipeline-board";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { errorCode, errorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const TABS = ["delivery", "base"] as const;

const TAB_COPY: Record<PipelineStage, { label: string; Icon: typeof Truck }> = {
  delivery: { label: "Dostavka", Icon: Truck },
  base: { label: "Baza", Icon: Archive },
};

/**
 * Bitrix oqimi (`LOGIST_01` §3–4, §7): **Dostavka** — ochiq zakazi bor
 * mijozlar (ustun = eng yangi ochiq buyurtma holati) va **Baza** —
 * yetkazilganlar (faqat o'qish). Lidlar logistga yopiq.
 *
 * Holatlar: skeleton · backend kutilmoqda · xato+qayta · bo'sh ·
 * qidiruvda topilmadi · oflayn (kesh ko'rinadi, tepada banner) · tayyor.
 * Tab, qidiruv va ochiq lid URLda (`?tab=&q=&lead=`).
 */
export function PipelineScreen() {
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringLiteral(TABS).withDefault("delivery").withOptions({ clearOnDefault: true }),
  );
  const [search, setSearch] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
  );
  const [leadId, setLeadId] = useQueryState("lead", parseAsInteger);
  const online = useOnlineStatus();

  const query = useDebouncedValue(search.trim(), 350);
  const filters = useMemo(() => ({ search: query || null }), [query]);
  const board = usePipelineBoard(tab, filters);

  const total = board.board?.columns.reduce((sum, column) => sum + column.total, 0) ?? 0;
  const missing = errorCode(board.error) === "endpoint_missing";

  // Barqaror callback'lar — `memo` kartalar va ustunlar sababsiz chizilmasin.
  const openLead = useCallback((lead: PipelineLead) => void setLeadId(lead.id), [setLeadId]);
  const { loadMore } = board;
  const loadColumn = useCallback((columnKey: string) => void loadMore(columnKey), [loadMore]);

  let body: React.ReactNode;
  if (board.isPending) {
    body = <PipelineBoardSkeleton columns={tab === "delivery" ? 3 : 4} />;
  } else if (missing) {
    body = (
      <EmptyView
        Icon={PackageCheck}
        title="Dostavka va Baza backend'ni kutmoqda"
        description="Bitrix oqimi test serverda chiqarilgan — prodga chiqishi bilan bu yerda lid kartalari ko'rinadi."
      />
    );
  } else if (board.error && !board.board) {
    body = (
      <ErrorView
        message={
          online
            ? errorMessage(board.error, "Doskani yuklashda xatolik")
            : "Internet yo'q — ulanish tiklangach qayta urinib ko'ring"
        }
        onRetry={() => void board.refetch()}
      />
    );
  } else if (board.board && total === 0 && query) {
    body = (
      <EmptyView
        Icon={SearchX}
        title="Hech narsa topilmadi"
        description={`«${query}» bo'yicha karta yo'q — boshqa so'z bilan qidiring.`}
        action={
          <Button variant="outline" size="lg" onClick={() => void setSearch("")}>
            Qidiruvni tozalash
          </Button>
        }
      />
    );
  } else if (board.board && total === 0) {
    body = (
      <EmptyView
        Icon={TAB_COPY[tab].Icon}
        title={tab === "delivery" ? "Dostavkada karta yo'q" : "Bazada karta yo'q"}
        description={
          tab === "delivery"
            ? "Operator zakaz ochishi bilan mijoz kartasi shu yerga tushadi."
            : "Buyurtma yetkazilgach mijoz kartasi Bazaga o'tadi."
        }
      />
    );
  } else if (board.board) {
    body = (
      <PipelineBoardView
        board={board.board}
        onOpenLead={openLead}
        onLoadMore={loadColumn}
        isLoadingColumn={board.isLoadingColumn}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Dostavka va Baza"
        description="Mijoz kartalari — har mijozning hamma zakazi bitta kartada"
        onRefresh={() => void board.refetch()}
        isRefreshing={board.isFetching}
        updatedAt={board.updatedAt}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <div
            role="tablist"
            aria-label="Bo'lim"
            className="bg-subtle border-line flex w-fit items-center gap-0.5 rounded-full border p-0.5"
          >
            {TABS.map((value) => {
              const { label, Icon } = TAB_COPY[value];
              const active = tab === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => void setTab(value)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-dense font-medium transition-colors duration-(--dur-micro)",
                    active ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:text-ink",
                  )}
                >
                  <Icon className="size-3.5" aria-hidden />
                  {label}
                  {active && board.board ? (
                    <span className="text-ink-faint tabular text-fine">{total}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {tab === "base" ? (
            <span className="text-ink-muted bg-subtle rounded-full px-2.5 py-1 text-fine font-medium">
              Faqat ko&apos;rish
            </span>
          ) : null}
          <SearchInput
            value={search}
            onChange={(value) => void setSearch(value)}
            placeholder="Ism, telefon yoki buyurtma raqami"
            isSearching={board.isFetching && board.isPlaceholder}
            className="ml-auto w-full sm:w-72"
          />
        </div>
      </PageHeader>

      {!online && board.board ? (
        <p
          role="status"
          className="bg-subtle text-ink-muted mx-4 mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-meta sm:mx-6"
        >
          <CloudOff className="size-3.5 shrink-0" aria-hidden />
          Oflayn — oxirgi saqlangan holat ko&apos;rsatilmoqda
        </p>
      ) : null}
      {board.error && board.board && online ? (
        <p className="text-warn bg-warn-soft mx-4 mt-3 rounded-lg px-3 py-2 text-dense sm:mx-6">
          Yangilash muvaffaqiyatsiz tugadi — doskadagi ma&apos;lumot eskirgan bo&apos;lishi mumkin
        </p>
      ) : null}

      <div className="min-h-0 flex-1 pt-3">{body}</div>

      <LeadDetailSheet leadId={leadId} onClose={() => void setLeadId(null)} />
    </div>
  );
}
