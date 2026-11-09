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
import { describePieces, hasPackage, packedQuantity, rowErrorsOf, splitPieces, toPieces } from "../packaging";
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

type LineDraft = { boxes: string; pieces: string };

const digits = (value: string) => value.replace(/\D/g, "");
const toInt = (value: string) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

function LoadRequestCard({ request }: { request: LoadRequest }) {
  const queryClient = useQueryClient();
  const pending = request.status === "pending";
  // Boshlang'ich qiymat — so'ralgan miqdor, karobkali mahsulotda karobka + dona ko'rinishida.
  const [drafts, setDrafts] = useState<Record<number, LineDraft>>(() =>
    Object.fromEntries(
      request.lines.map((line) => {
        const { boxes, pieces } = hasPackage(line.packageSize)
          ? splitPieces(line.quantity, line.packageSize)
          : { boxes: 0, pieces: line.quantity };
        return [line.item.id, { boxes: String(boxes), pieces: String(pieces) }];
      }),
    ),
  );
  /** Server qaytargan qator xatolari (`fields.lines[i]`) — mahsulot id si bo'yicha. */
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const lines = request.lines.map((line) => {
    const draft = drafts[line.item.id] ?? { boxes: "0", pieces: "0" };
    const boxes = hasPackage(line.packageSize) ? toInt(draft.boxes) : 0;
    const pieces = toInt(draft.pieces);
    const amount = toPieces(boxes, pieces, line.packageSize);
    return { line, draft, boxes, pieces, amount, over: amount > line.quantity };
  });
  // Faqat kamaytirilgan qatorlar yuboriladi; ko'rsatilmagani so'ralganicha qoladi (§4.2).
  const reduced = lines.filter((row) => !row.over && row.amount < row.line.quantity);
  const anyOver = lines.some((row) => row.over);
  const allZero = lines.every((row) => row.amount === 0);

  const setDraft = (itemId: number, patch: Partial<LineDraft>) => {
    setDrafts((current) => ({ ...current, [itemId]: { ...(current[itemId] ?? { boxes: "0", pieces: "0" }), ...patch } }));
    setRowErrors((current) => {
      if (!(itemId in current)) return current;
      const next = { ...current };
      delete next[itemId];
      return next;
    });
  };

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
    if (rowErrorsOf(error, "lines").some(Boolean)) {
      toast.error("Belgilangan qatorlardagi sonni tuzating");
      return;
    }
    toast.error(errorMessage(error, "Saqlab bo'lmadi"));
  };

  const approve = useMutation({
    mutationFn: async () => {
      const sent = reduced;
      try {
        await approveLoadRequest(
          request.id,
          sent.map(({ line, boxes, pieces }) => ({
            itemId: line.item.id,
            ...packedQuantity(boxes, pieces, line.packageSize),
          })),
        );
      } catch (error) {
        // `fields.lines[i]` — yuborilgan tartibda; indeksni mahsulotga qaytaramiz.
        const byIndex = rowErrorsOf(error, "lines");
        setRowErrors(
          Object.fromEntries(sent.flatMap((row, index) => (byIndex[index] ? [[row.line.item.id, byIndex[index]]] : []))),
        );
        throw error;
      }
    },
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
        {lines.map(({ line, draft, amount, over }) => {
          const boxed = hasPackage(line.packageSize);
          const rowError = over ? `So'ralgandan ko'p — ko'pi bilan ${line.quantity} dona` : rowErrors[line.item.id];
          return (
            <li key={line.item.id} className="py-2">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                <ProductThumb src={line.item.image} name={line.item.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-ink truncate text-dense" data-no-translit>
                    {line.item.name}
                  </p>
                  <p className="text-ink-faint text-fine">
                    <span>so&apos;raldi</span>{" "}
                    <span className="text-ink-muted font-medium">{describePieces(line.quantity, line.packageSize)}</span>
                    {boxed ? <span className="ml-1.5">{`· 1 kar. = ${line.packageSize} dona`}</span> : null}
                  </p>
                </div>
                {pending ? (
                  <div className="flex items-center gap-1.5">
                    {boxed ? (
                      <QtyInput
                        value={draft.boxes}
                        suffix="kar."
                        label={`${line.item.name}: karobka`}
                        invalid={Boolean(rowError)}
                        onChange={(boxes) => setDraft(line.item.id, { boxes })}
                      />
                    ) : null}
                    <QtyInput
                      value={draft.pieces}
                      suffix="dona"
                      label={`${line.item.name}: dona`}
                      invalid={Boolean(rowError)}
                      onChange={(pieces) => setDraft(line.item.id, { pieces })}
                    />
                    {boxed ? (
                      <span className="text-ink tabular w-12 text-right text-dense font-semibold">{`= ${amount}`}</span>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-ink tabular text-right text-dense font-semibold">
                    {line.approvedQuantity === null ? "—" : describePieces(line.approvedQuantity, line.packageSize)}
                  </span>
                )}
              </div>
              {pending && rowError ? (
                <p role="alert" className="text-danger mt-1 text-right text-fine">
                  {rowError}
                </p>
              ) : null}
            </li>
          );
        })}
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
            <Button disabled={busy || allZero || anyOver} onClick={() => approve.mutate()}>
              {approve.isPending ? <LoaderCircle className="animate-spin" /> : <Check />}
              {reduced.length ? "Qisman tasdiqlash" : "Tasdiqlash"}
            </Button>
          </div>
        )
      ) : null}
    </li>
  );
}

function QtyInput({
  value,
  suffix,
  label,
  invalid,
  onChange,
}: {
  value: string;
  suffix: string;
  label: string;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-1">
      <input
        inputMode="numeric"
        aria-label={label}
        aria-invalid={invalid || undefined}
        value={value}
        onFocus={(event) => event.target.select()}
        onChange={(event) => onChange(digits(event.target.value))}
        className={cn(inputClass, "tabular h-8 w-14 text-right")}
      />
      <span className="text-ink-faint text-fine">{suffix}</span>
    </label>
  );
}
