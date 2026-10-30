"use client";

import { ChevronDown, LoaderCircle, MapPinOff, PanelRightClose, PanelRightOpen } from "lucide-react";
import { parseAsBoolean, parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";

import { ErrorView } from "@/components/kit/state-views";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  liveCounters,
  matchesLiveStatus,
  parseLiveStatus,
  sortLiveCouriers,
} from "@/features/couriers/live-map-view";
import type { LiveStatus } from "@/features/couriers/live-map-view";
import { liveCouriersParams, liveEmptyText } from "@/features/couriers/live-tracking";
import type { LiveFilter } from "@/features/couriers/live-tracking";
import { decideFocus, nextFocusRequest } from "@/features/couriers/map-focus";
import type { FocusRequest } from "@/features/couriers/map-focus";
import { useCourierTrack } from "@/features/couriers/use-courier-track";
import { useLiveCouriers, useNowTick } from "@/features/couriers/use-live-couriers";
import { useIsMobile } from "@/hooks/use-media-query";
import { errorMessage } from "@/lib/api-client";
import { todayIso } from "@/lib/format";
import { cn } from "@/lib/utils";

import { CourierListPanel, CourierListSkeleton } from "./courier-list-panel";
import { CourierMapCard } from "./courier-map-card";
import { LiveMapIsland } from "./live-map-island";
import { LiveMapSearch } from "./live-map-search";
import { LiveStatusChips } from "./live-status-chips";
import { TrackToolbar } from "./track-toolbar";

/** Sahifaning hudud filtri (Viloyat · Zona · Tuman) — jonli so'rovga ham qo'llanadi. */
export type LiveAreaFilter = Omit<LiveFilter, "includeOffShift">;

/**
 * "Xarita" sahifasi (§7.3, §8): butun balandlikdagi jonli xarita, tepada
 * qidiruv + hudud filtri + hisoblagich chiplari, o'ngda kuryerlar paneli
 * (mobilda — pastki varaq). URL: `?track=<id>&day=YYYY-MM-DD` (kun izi),
 * `?offshift=true`, `?status=shift|moving|lost`.
 *
 * Hudud filtri boshqa feature'dan (`zones`) — sahifa uni `filters` sloti
 * orqali beradi, bu komponent faqat qiymatini (`area`) oladi.
 */
export function LiveMapWorkspace({
  area,
  filters,
}: {
  area: LiveAreaFilter;
  filters?: React.ReactNode;
}) {
  const [trackId, setTrackId] = useQueryState("track", parseAsInteger);
  const [day, setDay] = useQueryState("day", parseAsString);
  const [offShift, setOffShift] = useQueryState("offshift", parseAsBoolean.withDefault(false));
  const [statusParam, setStatusParam] = useQueryState("status", parseAsString);
  const status = parseLiveStatus(statusParam, offShift);
  const setStatus = (next: LiveStatus | null) => void setStatusParam(next);
  const filter: LiveFilter = { ...area, includeOffShift: offShift };

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [focusedId, setFocusedId] = useState<number | null>(null);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [fitAllSignal, setFitAllSignal] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Panel mazmuni bitta joyda chiziladi: desktopda o'ng ustun, mobilda pastki varaq.
  const isMobile = useIsMobile();

  const live = useLiveCouriers(true, filter);
  const now = useNowTick();
  const couriers = live.data ?? [];
  const counters = liveCounters(couriers, now, offShift);
  const visible = couriers.filter((courier) => matchesLiveStatus(courier, status, now, offShift));
  const sorted = sortLiveCouriers(visible, now);
  const selected = couriers.find((courier) => courier.id === selectedId) ?? null;
  const trackDay = day ?? todayIso();
  const track = useCourierTrack(trackId, trackDay);
  const trackCourier = couriers.find((courier) => courier.id === trackId) ?? null;
  const emptyText = liveEmptyText(liveCouriersParams(filter));

  const openCard = (id: number) => {
    setSelectedId(id);
    setSheetOpen(true);
  };

  /**
   * Qidiruv, ro'yxat qatori yoki marker: HAR tanlovda xarita uchadi (o'sha
   * kuryer qayta tanlansa ham), karta kamera yetib kelgach ochiladi.
   * `null` — fokus yechiladi va hamma ko'rinadi.
   */
  const focus = (id: number | null) => {
    if (id === null) {
      fitAll();
      return;
    }
    const courier = couriers.find((item) => item.id === id);
    if (!courier) return;
    setFocusedId(id);
    if (decideFocus(courier).kind === "no-location") {
      toast.info("Kuryer joylashuvi hali yo'q");
      openCard(id);
      return;
    }
    setFocusRequest((previous) => nextFocusRequest(previous, id));
  };
  /** Kartani yopish kamerani joyidan qo'zg'atmaydi — faqat fokus yechiladi. */
  const closeCard = () => {
    if (focusedId === selectedId) setFocusedId(null);
    setSelectedId(null);
  };
  function fitAll() {
    setFocusedId(null);
    setFitAllSignal((n) => n + 1);
  }

  const panel = (
    <>
      {trackId !== null ? (
        <TrackToolbar
          courier={trackCourier}
          day={trackDay}
          onDay={(next) => void setDay(next === todayIso() ? null : next)}
          totalM={track.data?.totalM ?? null}
          pointCount={track.data?.points.length ?? null}
          isPending={track.isPending}
          error={track.isError ? track.error : null}
          onRetry={() => void track.refetch()}
          onClose={() => {
            void setTrackId(null);
            void setDay(null);
          }}
        />
      ) : null}

      {selected ? (
        <CourierMapCard
          courier={selected}
          now={now}
          onClose={closeCard}
          onTrack={() => void setTrackId(selected.id)}
          className="mx-3 mt-3 w-auto"
        />
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {live.isPending ? <CourierListSkeleton /> : null}
        {live.data ? (
          <CourierListPanel
            couriers={sorted}
            now={now}
            selectedId={selectedId}
            includeOffShift={offShift}
            onHover={setHighlightId}
            onPick={focus}
            emptyText={emptyText}
            filtered={status !== null}
            onClearFilter={() => setStatus(null)}
          />
        ) : null}
      </div>
    </>
  );

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden">
      <section aria-label="Jonli xarita" className="relative min-w-0 flex-1 pb-14 md:pb-0">
        {live.isPending ? <Skeleton className="h-full w-full rounded-none" /> : null}

        {live.isError && !live.data ? (
          <ErrorView
            message={errorMessage(live.error, "Jonli xaritani yuklashda xatolik")}
            onRetry={() => void live.refetch()}
            className="h-full"
          />
        ) : null}

        {live.data ? (
          <LiveMapIsland
            couriers={visible}
            now={now}
            focusedId={focusedId}
            focusRequest={focusRequest}
            onArrive={openCard}
            highlightId={highlightId}
            onSelect={focus}
            track={track.data ?? null}
            fitAllSignal={fitAllSignal}
            onFitAll={fitAll}
          />
        ) : null}

        {/* Tepa panel: qidiruv · hudud · smenadan tashqaridagilar · hisoblagichlar. */}
        <div className="pointer-events-none absolute inset-x-3 top-3 z-[600]">
          <div className="border-line bg-surface/95 elev-2 pointer-events-auto flex flex-wrap items-center gap-2 rounded-xl border p-2 backdrop-blur">
            <LiveMapSearch
              couriers={visible}
              now={now}
              focusedId={focusedId}
              onFocus={focus}
              className="w-full sm:w-72"
            />
            {filters}
            <div className="flex h-8 items-center gap-2 px-1">
              <Switch
                id="live-off-shift"
                checked={offShift}
                onCheckedChange={(checked) => void setOffShift(checked === true ? true : null)}
              />
              <label htmlFor="live-off-shift" className="text-ink cursor-pointer text-meta">
                Smenadan tashqaridagilar ham
              </label>
            </div>
            {live.data ? <LiveStatusChips
                counters={counters}
                value={status}
                onChange={setStatus}
                includeOffShift={offShift}
              /> : null}
            {live.isFetching && !live.isPending ? (
              <LoaderCircle className="text-ink-faint size-4 animate-spin" aria-label="Yangilanmoqda" />
            ) : null}
            {!panelOpen ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPanelOpen(true)}
                className="ml-auto hidden md:inline-flex"
              >
                <PanelRightOpen className="size-4" />
                Ro&apos;yxat
              </Button>
            ) : null}
          </div>
        </div>

        {live.data && couriers.length === 0 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-20 z-[500] flex justify-center px-4 md:bottom-16">
            <p className="border-line bg-surface/95 text-ink-muted elev-1 flex items-center gap-2 rounded-full border px-3.5 py-2 text-meta">
              <MapPinOff className="size-4" aria-hidden />
              {emptyText}
            </p>
          </div>
        ) : null}
      </section>

      {/* Desktop: o'ng panel (yig'iladi). */}
      {!isMobile && panelOpen ? (
        <aside
          aria-label="Kuryerlar"
          className="border-line bg-surface flex w-88 shrink-0 flex-col border-l"
        >
          <PanelHeader count={sorted.length}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPanelOpen(false)}
              aria-label="Panelni yig'ish"
              className="size-8"
            >
              <PanelRightClose className="size-4" />
            </Button>
          </PanelHeader>
          {panel}
        </aside>
      ) : null}

      {/* Mobil: pastki varaq. */}
      {isMobile ? (
      <aside
        aria-label="Kuryerlar"
        className={cn(
          "border-line bg-surface elev-3 absolute inset-x-0 bottom-0 z-[650] flex flex-col rounded-t-2xl border-t",
          sheetOpen ? "h-3/5" : "h-14",
        )}
      >
        <button
          type="button"
          onClick={() => setSheetOpen((open) => !open)}
          aria-expanded={sheetOpen}
          className="flex h-14 shrink-0 items-center gap-2 px-4 text-left"
        >
          <span aria-hidden className="bg-line absolute top-1.5 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full" />
          <span className="text-ink text-body font-semibold">Kuryerlar</span>
          <span className="text-ink-muted tabular text-meta">{sorted.length}</span>
          <ChevronDown
            className={cn(
              "text-ink-faint ml-auto size-4 transition-transform duration-(--dur-standard) motion-reduce:transition-none",
              !sheetOpen && "rotate-180",
            )}
            aria-hidden
          />
        </button>
        {sheetOpen ? <div className="border-line flex min-h-0 flex-1 flex-col border-t">{panel}</div> : null}
      </aside>
      ) : null}
    </div>
  );
}

function PanelHeader({ count, children }: { count: number; children?: React.ReactNode }) {
  return (
    <div className="border-line flex h-12 shrink-0 items-center gap-2 border-b px-4">
      <span className="text-ink text-body font-semibold">Kuryerlar</span>
      <span className="text-ink-muted tabular text-meta">{count}</span>
      <span className="ml-auto">{children}</span>
    </div>
  );
}
