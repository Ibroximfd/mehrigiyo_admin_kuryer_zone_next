"use client";

import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, MapPinned, Send, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchChiefOptions } from "@/features/chief/api";
import { dispatchPlan, groupByRegion } from "@/features/chief/dispatch";
import type { ChiefOption } from "@/features/chief/types";
import { BulkProgressView, BulkSummaryView } from "@/features/orders/components/bulk/bulk-summary";
import { bulkOrders } from "@/features/orders/api";
import { summarizeBulk } from "@/features/orders/bulk";
import type { BulkProgress, BulkStepResult, BulkSummary } from "@/features/orders/bulk";
import { regionLabel } from "@/features/orders/regions";
import type { LogistOrder } from "@/features/orders/types";
import { errorCode } from "@/lib/api-client";
import { formatSom } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";

const NONE = "none";

/**
 * Zakazlarni viloyatlar bo'yicha bosh kuryerlarga berish — logistning
 * yagona taqsimlash yo'li (2026-10-30). Har viloyatga mos bosh kuryer
 * sukutda tanlanadi; logist almashtiradi yoki «berilmasin» qiladi. Zakazlar
 * bosh kuryer bo'yicha bitta `assign_chief` so'rovi bilan ketadi (backend
 * 2026-10-30 §2), xatolar sabab bo'yicha bitta xulosada.
 */
export function RegionDispatchDialog({
  orders,
  open,
  onOpenChange,
  onDone,
  isLoading = false,
}: {
  orders: LogistOrder[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
  /** Zakazlar hali yuklanmoqda (taqsimlash sahifasidan ochilganda). */
  isLoading?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-[34rem] max-w-[calc(100vw-2rem)] flex-col">
        {open ? (
          <DispatchBody orders={orders} isLoading={isLoading} onClose={() => onOpenChange(false)} onDone={onDone} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DispatchBody({
  orders,
  isLoading,
  onClose,
  onDone,
}: {
  orders: LogistOrder[];
  isLoading: boolean;
  onClose: () => void;
  onDone?: () => void;
}) {
  const queryClient = useQueryClient();
  const [overrides, setOverrides] = useState<Record<string, number | null>>({});
  const [progress, setProgress] = useState<BulkProgress | null>(null);
  const [summary, setSummary] = useState<BulkSummary | null>(null);
  const chiefs = useQuery({
    queryKey: queryKeys.chiefOptions(null),
    queryFn: ({ signal }) => fetchChiefOptions(null, signal),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const chiefList = useMemo(() => chiefs.data ?? [], [chiefs.data]);

  // Har viloyatning sukut bosh kuryeri — `?region=` so'rovidagi `is_default`.
  const regions = useMemo(
    () => [...new Set(orders.map((order) => order.deliveryInfo?.region?.trim() ?? "").filter(Boolean))],
    [orders],
  );
  const byRegion = useQueries({
    queries: regions.map((region) => ({
      queryKey: queryKeys.chiefOptions(region),
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchChiefOptions(region, signal),
      staleTime: 5 * 60_000,
      retry: false,
    })),
  });
  const regionLists = new Map(regions.map((region, index) => [region, byRegion[index]?.data]));

  const groups = groupByRegion(
    orders.map((order) => ({ ...order, region: order.deliveryInfo?.region ?? null })),
    (region) => regionLists.get(region) ?? chiefList,
  );
  const plan = dispatchPlan(groups, overrides);
  const eligible = groups.reduce((sum, group) => sum + group.orders.length, 0);
  const skippedStatus = orders.length - eligible;
  const numberOf = (id: string) => orders.find((order) => order.id === id)?.orderNumber ?? id.slice(0, 8);

  /** Bosh kuryer bo'yicha bitta `assign_chief` (100 tadan bo'laklab — `bulkOrders`). */
  const submit = async () => {
    const byChief = new Map<number, string[]>();
    for (const [orderId, chiefId] of plan) byChief.set(chiefId, [...(byChief.get(chiefId) ?? []), orderId]);
    const total = plan.size;
    let done = 0;
    const results: BulkStepResult<null>[] = [];
    setProgress({ done, total });
    for (const [chiefId, ids] of byChief) {
      try {
        const result = await bulkOrders(ids, { action: "assign_chief", chiefCourierId: chiefId });
        for (const id of result.applied) results.push({ id, ok: true, value: null });
        for (const failure of result.failed) results.push({ id: failure.id, ok: false, code: failure.code });
      } catch (error) {
        for (const id of ids) results.push({ id, ok: false, code: errorCode(error) ?? "unknown" });
      }
      done += ids.length;
      setProgress({ done, total });
    }
    setProgress(null);
    const next = summarizeBulk(results, total);
    setSummary(next);
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
    void queryClient.invalidateQueries({ queryKey: ["chief"] });
    if (next.failed.length === 0) {
      onDone?.();
      onClose();
    }
  };
  const running = progress !== null;

  return (
    <>
      <DialogTitle className="flex items-center gap-2">
        <MapPinned className="text-brand size-4.5" />
        Bosh kuryerlarga berish
      </DialogTitle>
      <DialogDescription>
        Zakazlar viloyat bo&apos;yicha — har biri o&apos;sha viloyat bosh kuryeriga. Kuryerni bosh kuryer tanlaydi.
        {skippedStatus > 0 ? ` ${skippedStatus} ta zakaz «Tasdiqlangan» emas — o'tkaziladi.` : ""}
      </DialogDescription>

      <div className="scrollbar-thin -mx-1 mt-2 min-h-0 flex-1 overflow-y-auto px-1">
        {summary ? (
          <BulkSummaryView summary={summary} successLabel="bosh kuryerga berildi" numberOf={numberOf} />
        ) : progress ? (
          <BulkProgressView progress={progress} />
        ) : isLoading || chiefs.isPending ? (
          <div className="space-y-2">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : chiefList.length === 0 ? (
          <p className="bg-warn-soft text-warn flex items-start gap-2 rounded-lg px-3 py-2.5 text-meta leading-relaxed">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            Bosh kuryer tayinlanmagan — bosh logist viloyatlarga bosh kuryer bergach shu yerda taqsimlanadi.
          </p>
        ) : groups.length === 0 ? (
          <p className="text-ink-faint py-8 text-center text-meta">Beriladigan zakaz yo&apos;q</p>
        ) : (
          <ul className="space-y-2">
            {groups.map((group) => {
              const chiefId = group.region in overrides ? overrides[group.region] : group.suggestedChiefId;
              return (
                <RegionRow
                  key={group.region || "unknown"}
                  label={group.region ? regionLabel(group.region) : "Viloyati aniqlanmagan"}
                  count={group.orders.length}
                  amount={group.amount}
                  chiefs={chiefList}
                  chiefId={chiefId ?? null}
                  suggested={group.suggestedChiefId !== null}
                  onChange={(next) => setOverrides((current) => ({ ...current, [group.region]: next }))}
                />
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={running}>
          {summary ? "Yopish" : "Bekor"}
        </Button>
        {summary ? null : (
          <Button disabled={plan.size === 0 || running} onClick={() => void submit()}>
            {running ? <LoaderCircle className="animate-spin" /> : <Send />}
            {`Berish · ${plan.size} ta`}
          </Button>
        )}
      </div>
    </>
  );
}

function RegionRow({
  label,
  count,
  amount,
  chiefs,
  chiefId,
  suggested,
  onChange,
}: {
  label: string;
  count: number;
  amount: number;
  chiefs: ChiefOption[];
  chiefId: number | null;
  suggested: boolean;
  onChange: (chiefId: number | null) => void;
}) {
  return (
    <li className="border-line flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-3 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="text-ink block truncate text-dense font-semibold">{label}</span>
        <span className="text-ink-faint tabular text-meta">{`${count} ta · ${formatSom(amount)}`}</span>
      </span>
      <Select value={chiefId === null ? NONE : String(chiefId)} onValueChange={(value) => onChange(value === NONE ? null : Number(value))}>
        <SelectTrigger className="h-9 w-56" aria-label={`${label}: bosh kuryer`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{suggested ? "Berilmasin" : "Bosh kuryer yo'q — tanlang"}</SelectItem>
          {chiefs.map((chief) => (
            <SelectItem key={chief.id} value={String(chief.id)}>
              <span data-no-translit>{chief.fullName}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </li>
  );
}
