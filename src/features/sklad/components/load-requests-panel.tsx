"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Inbox, LoaderCircle, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { inputClass } from "@/components/kit/field";
import { ProductThumb } from "@/components/kit/product-thumb";
import { EmptyView, ErrorView } from "@/components/kit/state-views";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, errorCode, errorMessage } from "@/lib/api-client";
import { groupThousands } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

import { approveLoadRequest, fetchLoadRequests, rejectLoadRequest } from "../api";
import { mapShortages, type LoadRequest, type LoadRequestStatus } from "../types";

const TABS: Array<[LoadRequestStatus, string]> = [
  ["pending", "Kutilmoqda"],
  ["approved", "Tasdiqlangan"],
  ["rejected", "Rad etilgan"],
];

function when(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/**
 * Kuryer kirim so'rovlari (sklad hujjati 2026-11-03 §4.2): bosh kuryer to'liq yoki qisman
 * tasdiqlaydi (faqat kamaytirish), yoki sabab bilan rad etadi. Zaxira yo'q — tasdiqda
 * `409 insufficient_stock` kelsa so'rov KUTILMOQDA qoladi, «rad etildi» deyilmaydi (§4.3).
 */
export function LoadRequestsPanel() {
  const [status, setStatus] = useState<LoadRequestStatus>("pending");
  const requests = useQuery({
    queryKey: queryKeys.chiefLoadRequests(status),
    queryFn: ({ signal }) => fetchLoadRequests(status, signal),
    refetchInterval: status === "pending" ? 60_000 : false,
  });

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label="So'rov holati" className="bg-surface-3 inline-flex w-fit gap-0.5 rounded-lg p-0.5">
        {TABS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={status === value}
            onClick={() => setStatus(value)}
            className={cn(
              "h-8 rounded-md px-3 text-dense font-semibold transition-colors",
              status === value ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink",
            )}
          >
            {label}
            {value === "pending" && status === "pending" && requests.data?.length ? (
              <span className="bg-brand ml-1.5 rounded-full px-1.5 text-fine text-white">{requests.data.length}</span>
            ) : null}
          </button>
        ))}
      </div>

      {requests.isPending ? (
        <Skeleton className="h-28 rounded-2xl" />
      ) : requests.isError ? (
        <ErrorView
          message={errorMessage(requests.error, "Kirim so'rovlarini yuklashda xatolik")}
          onRetry={() => void requests.refetch()}
          className="border-line bg-surface rounded-2xl border"
        />
      ) : requests.data.length === 0 ? (
        <EmptyView
          Icon={Inbox}
          title={status === "pending" ? "Kutilayotgan so'rov yo'q" : "So'rov yo'q"}
          description={status === "pending" ? "Kuryer ilovadan kirim so'rasa, shu yerda chiqadi." : undefined}
          className="border-line bg-surface rounded-2xl border"
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {requests.data.map((request) => (
            <LoadRequestCard key={request.id} request={request} />
          ))}
        </ul>
      )}
    </div>
  );
}

function LoadRequestCard({ request }: { request: LoadRequest }) {
  const queryClient = useQueryClient();
  const pending = request.status === "pending";
  const [approved, setApproved] = useState<Record<number, string>>(() =>
    Object.fromEntries(request.lines.map((line) => [line.item.id, String(line.quantity)])),
  );
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const amountOf = (itemId: number, max: number) => {
    const parsed = Number.parseInt(approved[itemId] ?? "", 10);
    return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), max) : 0;
  };
  // Faqat kamaytirilgan qatorlar yuboriladi; ko'rsatilmagani so'ralganicha qoladi (§4.2).
  const reduced = request.lines
    .map((line) => ({ itemId: line.item.id, quantity: amountOf(line.item.id, line.quantity), asked: line.quantity }))
    .filter((line) => line.quantity < line.asked);
  const allZero = request.lines.every((line) => amountOf(line.item.id, line.quantity) === 0);

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["chief", "sklad"] });
  const onError = (error: unknown) => {
    if (errorCode(error) === "insufficient_stock") {
      const shortages = error instanceof ApiError ? mapShortages(error.data) : [];
      toast.warning("Hozir qoldiq yetmayapti — keyinroq qayta urinib ko'ring", {
        description: shortages.map((row) => `${row.name}: ${row.available}/${row.need}`).join(", ") || undefined,
      });
      return;
    }
    if (errorCode(error) === "load_request_not_pending") {
      toast.info("Bu so'rov bo'yicha qaror allaqachon qabul qilingan");
      refresh();
      return;
    }
    toast.error(errorMessage(error, "Saqlab bo'lmadi"));
  };

  const approve = useMutation({
    mutationFn: () => approveLoadRequest(request.id, reduced.map(({ itemId, quantity }) => ({ itemId, quantity }))),
    onSuccess: () => {
      toast.success("So'rov tasdiqlandi — mol kuryerga o'tdi");
      refresh();
    },
    onError,
  });
  const reject = useMutation({
    mutationFn: () => rejectLoadRequest(request.id, reason.trim()),
    onSuccess: () => {
      toast.success("So'rov rad etildi");
      refresh();
    },
    onError,
  });
  const busy = approve.isPending || reject.isPending;

  return (
    <li className="border-line bg-surface rounded-2xl border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-ink text-dense font-semibold">
          <span data-no-translit>{request.courier.fullName}</span>
          <span className="text-ink-faint ml-2 text-meta font-normal">{`#${request.id} · ${when(request.createdAt)}`}</span>
        </p>
        <span className="text-ink-muted text-meta">
          {request.status === "approved"
            ? `Berildi ${groupThousands(request.approvedQty)} / ${groupThousands(request.totalQty)} dona`
            : `${groupThousands(request.totalQty)} dona so'ralgan`}
        </span>
      </div>
      {request.note ? <p className="text-ink-muted mt-1 text-meta" data-no-translit>{`«${request.note}»`}</p> : null}

      <ul className="divide-line mt-2 divide-y">
        {request.lines.map((line) => (
          <li key={line.item.id} className="flex items-center gap-2.5 py-1.5">
            <ProductThumb src={line.item.image} name={line.item.name} size="sm" />
            <span className="text-ink min-w-0 flex-1 truncate text-dense" data-no-translit>{line.item.name}</span>
            <span className="text-ink-faint tabular text-meta">{`so'raldi ${line.quantity}`}</span>
            {pending ? (
              <input
                inputMode="numeric"
                aria-label={`${line.item.name}: beriladi`}
                value={approved[line.item.id] ?? ""}
                onFocus={(event) => event.target.select()}
                onChange={(event) => setApproved((current) => ({ ...current, [line.item.id]: event.target.value.replace(/\D/g, "") }))}
                className={cn(inputClass, "tabular h-8 w-16 text-right")}
              />
            ) : (
              <span className="text-ink tabular w-16 text-right text-dense font-semibold">
                {line.approvedQuantity === null ? "—" : line.approvedQuantity}
              </span>
            )}
          </li>
        ))}
      </ul>

      {request.status === "rejected" && request.rejectReason ? (
        <p className="text-danger mt-2 text-meta" data-no-translit>{`Sabab: ${request.rejectReason}`}</p>
      ) : null}

      {pending ? (
        rejecting ? (
          <form
            className="mt-3 flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (reason.trim() && !busy) reject.mutate();
            }}
          >
            <input
              autoFocus
              value={reason}
              maxLength={255}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Rad etish sababi (majburiy)"
              aria-label="Rad etish sababi"
              className={cn(inputClass, "h-9 min-w-0 flex-1")}
            />
            <Button type="button" variant="ghost" onClick={() => setRejecting(false)}>
              Ortga
            </Button>
            <Button type="submit" variant="destructive" disabled={!reason.trim() || busy}>
              {reject.isPending ? <LoaderCircle className="animate-spin" /> : <X />}
              Rad etish
            </Button>
          </form>
        ) : (
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            {allZero ? <span className="text-warn mr-auto text-meta">Hammasi 0 — rad eting.</span> : null}
            <Button variant="outline" disabled={busy} onClick={() => setRejecting(true)}>
              <X />
              Rad etish
            </Button>
            <Button disabled={busy || allZero} onClick={() => approve.mutate()}>
              {approve.isPending ? <LoaderCircle className="animate-spin" /> : <Check />}
              {reduced.length ? "Qisman tasdiqlash" : "Tasdiqlash"}
            </Button>
          </div>
        )
      ) : null}
    </li>
  );
}
