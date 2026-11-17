"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, LoaderCircle, Send, TriangleAlert, UsersRound } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { ADAPTIVE_DIALOG } from "@/components/kit/adaptive-dialog";
import { SearchInput } from "@/components/kit/search-input";
import { EmptyView, ErrorView } from "@/components/kit/state-views";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { bulkAssignToCourier, fetchChiefCouriers } from "@/features/chief/api";
import { summarizeBulk } from "@/features/chief/bulk-result";
import type { BulkSummary } from "@/features/chief/bulk-result";
import type { DispatchFilters } from "@/features/chief/order-params";
import type { Courier } from "@/features/couriers/types";
import { ApiError, errorCode, errorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { matchesSearch } from "@/lib/search";
import { cn } from "@/lib/utils";

/**
 * Filtrdagi hamma kuryersiz zakazni bitta kuryerga (hujjat 68 §2.1). Server
 * ekrandagi filtrni o'zi qo'llaydi — ko'ringan va beriladigan zakazlar bir xil.
 * So'rov 300 zakazda ~20 soniya: tugma qulflanadi, kutish matni ko'rinadi.
 */
export function BulkAssignDialog({
  open,
  count,
  filters,
  filtered,
  onClose,
}: {
  open: boolean;
  /** Ro'yxatdagi `count` — tugmada va tasdiqda ko'rsatiladi. */
  count: number;
  filters: DispatchFilters;
  filtered: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className={cn(ADAPTIVE_DIALOG, "sm:max-w-lg")}>
        {open ? <Body count={count} filters={filters} filtered={filtered} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function failureText(error: unknown): string {
  switch (errorCode(error)) {
    case "courier_not_yours":
      return "Bu kuryer jamoangizda emas";
    case "courier_not_found":
      return "Kuryer topilmadi";
    case "courier_inactive":
      return "Kuryer nofaol — boshqasini tanlang";
    default:
      return errorMessage(error, "Kuryerga berishda xatolik");
  }
}

function Body({
  count,
  filters,
  filtered,
  onClose,
}: {
  count: number;
  filters: DispatchFilters;
  filtered: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const couriers = useQuery({ queryKey: queryKeys.chiefCouriers, queryFn: ({ signal }) => fetchChiefCouriers(signal) });
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Courier | null>(null);
  const [summary, setSummary] = useState<BulkSummary | null>(null);
  // Bir kadrdagi qo'sh bosish ham ikkinchi so'rov yubormasin.
  const sentRef = useRef(false);

  const assign = useMutation({
    mutationFn: (courier: Courier) => bulkAssignToCourier(courier.id, filters),
    onSuccess: (result) => setSummary(summarizeBulk(result)),
    onError: (error) => {
      // Javob kelmagan bo'lsa ham qayta bosish xavfsiz: server faqat hali berilmaganlarni oladi.
      const answered = error instanceof ApiError && error.status !== undefined;
      toast.error(answered ? failureText(error) : "Javob kelmadi — ro'yxat yangilandi, kerak bo'lsa qayta bosing");
    },
    onSettled: () => {
      sentRef.current = false;
      // Real vaqt hodisalari har zakazga keladi — ro'yxat amal tugagach bir marta yangilanadi.
      void queryClient.invalidateQueries({ queryKey: queryKeys.chief });
    },
  });

  const send = () => {
    if (!picked || sentRef.current) return;
    sentRef.current = true;
    assign.mutate(picked);
  };

  if (summary && picked) return <ResultView summary={summary} courier={picked} onClose={onClose} />;

  const active = (couriers.data ?? []).filter((courier) => courier.isActive);
  const visible = active
    .filter((courier) => matchesSearch(courier.fullName, query, courier.phone))
    .sort((a, b) => Number(b.live.onShift) - Number(a.live.onShift) || (a.load ?? 0) - (b.load ?? 0));

  return (
    <>
      <div className="border-line border-b px-5 pt-5 pb-4">
        <DialogTitle className="text-ink text-title">{`Kuryerga berish · ${count} ta zakaz`}</DialogTitle>
        <DialogDescription className="text-ink-muted mt-1 text-meta">
          Ekrandagi filtrga mos kuryersiz zakazlarning hammasi tanlangan kuryerga beriladi.
        </DialogDescription>
        {filtered ? null : (
          <p role="status" className="bg-warn-soft text-warn mt-3 flex items-start gap-2 rounded-xl px-3 py-2 text-meta">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Filtr yoqilmagan — barcha kelgan zakazlar, eskilari ham beriladi.
          </p>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-5 py-4">
        {active.length > 6 ? (
          <SearchInput value={query} onChange={setQuery} placeholder="Kuryer qidirish" autoFocusShortcut={false} />
        ) : null}
        <div className="scrollbar-thin -mx-1 min-h-48 flex-1 overflow-y-auto px-1">
          {couriers.isPending ? (
            <div className="space-y-2" aria-busy>
              {[0, 1, 2, 3].map((index) => (
                <Skeleton key={index} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : couriers.isError ? (
            <ErrorView
              message={errorMessage(couriers.error, "Kuryerlarni yuklashda xatolik")}
              onRetry={() => void couriers.refetch()}
            />
          ) : active.length === 0 ? (
            <EmptyView Icon={UsersRound} title="Faol kuryer yo'q" description="Avval «Kuryerlar» bo'limida kuryer qo'shing." />
          ) : visible.length === 0 ? (
            <p className="text-ink-faint py-8 text-center text-meta">Hech kim topilmadi</p>
          ) : (
            <ul role="radiogroup" aria-label="Kuryer" className="space-y-1.5">
              {visible.map((courier) => (
                <CourierOption
                  key={courier.id}
                  courier={courier}
                  checked={picked?.id === courier.id}
                  disabled={assign.isPending}
                  onPick={() => setPicked(courier)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="border-line bg-surface pb-safe-4 flex flex-wrap items-center gap-2 border-t px-5 pt-3.5">
        <p className="text-ink-muted min-w-0 flex-1 text-meta" aria-live="polite">
          {assign.isPending ? `Berilmoqda… ${count} ta — bir oz kuting` : picked ? picked.fullName : "Kuryerni tanlang"}
        </p>
        <Button variant="ghost" onClick={onClose} disabled={assign.isPending}>
          Bekor qilish
        </Button>
        <Button onClick={send} disabled={!picked || assign.isPending || count === 0}>
          {assign.isPending ? <LoaderCircle className="animate-spin" /> : <Send />}
          {`${count} ta zakazni berish`}
        </Button>
      </div>
    </>
  );
}

function CourierOption({
  courier,
  checked,
  disabled,
  onPick,
}: {
  courier: Courier;
  checked: boolean;
  disabled: boolean;
  onPick: () => void;
}) {
  const zone = courier.zones[0]?.name ?? null;
  return (
    <li>
      <button
        type="button"
        role="radio"
        aria-checked={checked}
        disabled={disabled}
        onClick={onPick}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
          "focus-visible:ring-brand/40 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60",
          checked ? "border-brand bg-brand-soft" : "border-line hover:bg-subtle",
        )}
      >
        <span
          aria-hidden
          className={cn("size-2 shrink-0 rounded-full", courier.live.onShift ? "bg-ok" : "bg-ink-faint")}
          title={courier.live.onShift ? "Smenada" : "Smenada emas"}
        />
        <span className="min-w-0 flex-1">
          <span className="text-ink block truncate text-dense font-semibold" data-no-translit>
            {courier.fullName}
          </span>
          <span className="text-ink-faint block truncate text-meta">
            {zone ? <span data-no-translit>{zone}</span> : "zonasiz"}
            {courier.live.onShift ? " · smenada" : " · smenada emas"}
          </span>
        </span>
        <span className="text-right">
          <span className="text-ink tabular block text-dense font-semibold">{courier.load ?? 0}</span>
          <span className="text-ink-faint block text-fine">qo&apos;lida</span>
        </span>
      </button>
    </li>
  );
}

function ResultView({ summary, courier, onClose }: { summary: BulkSummary; courier: Courier; onClose: () => void }) {
  const clean = summary.notGiven === 0;
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto px-5 py-8 text-center">
        <span className={cn("rounded-2xl p-3.5", clean ? "bg-ok-soft" : "bg-warn-soft")}>
          {clean ? <CircleCheck className="text-ok size-7" /> : <TriangleAlert className="text-warn size-7" />}
        </span>
        <DialogTitle className="text-ink text-title">
          {summary.matched === 0
            ? "Filtrga mos kuryersiz zakaz yo'q"
            : clean
              ? `${summary.given} ta zakaz berildi`
              : `${summary.matched} tadan ${summary.given} tasi berildi`}
        </DialogTitle>
        <DialogDescription className="text-ink-muted text-meta">
          <span data-no-translit>{courier.fullName}</span>
          {summary.matched === 0 ? " · hech narsa o'zgarmadi" : " · kuryerga push bir necha soniyada boradi"}
        </DialogDescription>
        {summary.notGiven > 0 ? (
          <ul className="bg-subtle w-full space-y-1.5 rounded-xl p-3 text-left">
            <li className="text-ink text-dense font-semibold">{`${summary.notGiven} tasi berilmadi`}</li>
            {summary.reasons.map((reason) => (
              <li key={reason.code} className="text-ink-muted flex justify-between gap-3 text-meta">
                <span>{reason.label}</span>
                <span className="tabular">{reason.count}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="border-line pb-safe-4 flex justify-end border-t px-5 pt-3.5">
        <Button onClick={onClose}>Tayyor</Button>
      </div>
    </>
  );
}
