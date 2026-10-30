"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CloudOff, Layers } from "lucide-react";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";

import { inputClass } from "@/components/kit/field";
import { FilterChips } from "@/components/kit/filter-chips";
import { StaggerItem, StaggerList } from "@/components/kit/motion";
import { PageHeader } from "@/components/kit/page-header";
import { EmptyView, ErrorView } from "@/components/kit/state-views";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createAutoStops,
  createStop,
  fetchStops,
  fetchStopSuggestions,
  removeOrderFromStop,
} from "@/features/stops/api";
import { PayRateCard } from "@/features/stops/components/pay-rate-card";
import { StopCard } from "@/features/stops/components/stop-card";
import { SuggestionsPanel } from "@/features/stops/components/suggestions-panel";
import { stopErrorMessage } from "@/features/stops/error-hints";
import { STOP_STATUS_FILTERS, suggestionKey } from "@/features/stops/types";
import type { DeliveryStop, StopSuggestion } from "@/features/stops/types";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { errorCode } from "@/lib/api-client";
import { todayIso } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

const STATUS_VALUES = STOP_STATUS_FILTERS.map((item) => item.value);

/**
 * To'xtashlar (`LOGIST_03` §2): bir kuryer bir manzilga bir kunda olib
 * boradigan buyurtmalar bitta to'xtash — kuryer bir marta boradi, bir
 * marta haq oladi. Sahifa: kun tanlovi, avto-takliflar, to'xtashlar va
 * stavka (faqat bosh filial tahrirlaydi). Kun va holat URLda.
 */
export function StopsScreen() {
  const queryClient = useQueryClient();
  const online = useOnlineStatus();
  const [date, setDate] = useQueryState("date", parseAsString.withDefault(todayIso()));
  const [status, setStatus] = useQueryState(
    "status",
    parseAsStringLiteral(STATUS_VALUES).withDefault("open").withOptions({ clearOnDefault: true }),
  );
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [removingOrderId, setRemovingOrderId] = useState<string | null>(null);

  const stops = useQuery({
    queryKey: queryKeys.stops({ date, status }),
    queryFn: ({ signal }) => fetchStops({ date, status }, signal),
    placeholderData: keepPreviousData,
    retry: 1,
  });
  const suggestions = useQuery({
    queryKey: queryKeys.stopSuggestions(date),
    queryFn: ({ signal }) => fetchStopSuggestions(date, signal),
    retry: false,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["stops"] });
    // Kartadagi `stop_id` belgisi va kuryer haqi statistikasi ham o'zgaradi.
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
    void queryClient.invalidateQueries({ queryKey: ["statistics"] });
  };

  const merge = useMutation({
    mutationFn: (suggestion: StopSuggestion) => createStop(suggestion.orderIds),
    onMutate: (suggestion) => setPendingKey(suggestionKey(suggestion)),
    onSuccess: (stop) => {
      toast.success(stop ? `Manzil #${stop.id} birlashtirildi` : "Manzil birlashtirildi");
      refresh();
    },
    onError: (error) => toast.error(stopErrorMessage(error, "Manzilni birlashtirishda xatolik")),
    onSettled: () => setPendingKey(null),
  });

  const auto = useMutation({
    mutationFn: () => createAutoStops(date),
    onSuccess: (result) => {
      toast.success(
        result.count > 0 ? `${result.count} ta manzil birlashtirildi` : "Birlashtiradigan guruh qolmadi",
      );
      refresh();
    },
    onError: (error) => toast.error(stopErrorMessage(error, "Avto-birlashtirishda xatolik")),
  });

  const detach = useMutation({
    mutationFn: ({ stop, orderId }: { stop: DeliveryStop; orderId: string; orderNumber: string }) =>
      removeOrderFromStop(stop.id, orderId),
    onMutate: ({ orderId }) => setRemovingOrderId(orderId),
    onSuccess: (_, { stop, orderNumber }) => {
      toast.success(
        stop.orderIds.length <= 2
          ? `${orderNumber} chiqarildi — manzil #${stop.id} tarqatildi`
          : `${orderNumber} manzildan chiqarildi`,
      );
      refresh();
    },
    onError: (error) => toast.error(stopErrorMessage(error, "Buyurtmani ajratishda xatolik")),
    onSettled: () => setRemovingOrderId(null),
  });

  const missing = errorCode(stops.error) === "endpoint_missing";
  const list = stops.data ?? [];

  let body: React.ReactNode;
  if (stops.isPending) {
    body = (
      <div className="grid gap-3 md:grid-cols-2" aria-hidden>
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-36 rounded-xl" />
        ))}
      </div>
    );
  } else if (missing) {
    body = (
      <EmptyView
        Icon={Layers}
        title="Manzillar backend'ni kutmoqda"
        description="Manzillar va kuryer haqi test serverda — prodga chiqishi bilan shu yerda ishlaydi."
      />
    );
  } else if (stops.error && !stops.data) {
    body = (
      <ErrorView
        message={
          online
            ? stopErrorMessage(stops.error, "Manzillarni yuklashda xatolik")
            : "Internet yo'q — ulanish tiklangach qayta urinib ko'ring"
        }
        onRetry={() => void stops.refetch()}
      />
    );
  } else if (list.length === 0) {
    const filtered = status !== "all";
    body = (
      <EmptyView
        Icon={Layers}
        title={filtered ? "Bu holatda manzil yo'q" : "Bu kunda birlashtirilgan manzil yo'q"}
        description={
          filtered
            ? "Boshqa holatni tanlang yoki «Hammasi» ni ko'ring."
            : "Bir manzilga ikki zakaz bo'lsa — yuqoridagi takliflardan birlashtiring yoki doskada belgilab «Bir manzil» bosing."
        }
        action={
          filtered ? (
            <Button variant="outline" size="lg" onClick={() => void setStatus("all")}>
              Hammasini ko&apos;rsatish
            </Button>
          ) : undefined
        }
      />
    );
  } else {
    body = (
      <StaggerList className={cn("grid gap-3 md:grid-cols-2", stops.isPlaceholderData && "opacity-60")}>
        {list.map((stop) => (
          <StaggerItem key={stop.id}>
            <StopCard
              stop={stop}
              removingOrderId={removingOrderId}
              onRemoveOrder={(target, orderId, orderNumber) =>
                detach.mutate({ stop: target, orderId, orderNumber })
              }
            />
          </StaggerItem>
        ))}
      </StaggerList>
    );
  }

  return (
    <>
      <PageHeader
        title="Manzillar"
        description="Bir manzil — bir borish — bir to'lov"
        onRefresh={refresh}
        isRefreshing={stops.isFetching}
        updatedAt={stops.dataUpdatedAt ? new Date(stops.dataUpdatedAt) : null}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="flex items-center gap-2">
            <span className="text-ink-muted text-meta">Kun</span>
            <input
              type="date"
              value={date}
              onChange={(event) => void setDate(event.target.value || todayIso())}
              className={cn(inputClass, "w-40")}
            />
          </label>
          <FilterChips
            options={STOP_STATUS_FILTERS.map((item) => ({ value: item.value, label: item.label }))}
            value={status}
            onChange={(value) => void setStatus(value)}
          />
        </div>
      </PageHeader>

      <div className="grid gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          {!online && stops.data ? (
            <p role="status" className="bg-subtle text-ink-muted flex items-center gap-2 rounded-lg px-3 py-2 text-meta">
              <CloudOff className="size-3.5 shrink-0" aria-hidden />
              Oflayn — oxirgi saqlangan holat ko&apos;rsatilmoqda
            </p>
          ) : null}
          {!missing ? (
            <SuggestionsPanel
              suggestions={suggestions.data ?? []}
              pendingKey={pendingKey}
              autoPending={auto.isPending}
              onMerge={(suggestion) => merge.mutate(suggestion)}
              onMergeAll={() => auto.mutate()}
            />
          ) : null}
          {body}
        </div>
        <aside className="flex flex-col gap-4">
          <PayRateCard />
        </aside>
      </div>
    </>
  );
}
