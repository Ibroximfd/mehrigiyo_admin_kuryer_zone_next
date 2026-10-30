"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, LoaderCircle, Package } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Field, inputClass } from "@/components/kit/field";
import { StatusPill } from "@/components/kit/status-pill";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchTransferDetail, updateTransferStatus } from "@/features/transfers/api";
import { transferErrorMessage } from "@/features/transfers/error-hints";
import {
  allowedTransferTransitions,
  transitionNeedsReason,
} from "@/features/transfers/permissions";
import { transferStatusInfo } from "@/features/transfers/types";
import type { FilialTransfer, TransferDirection } from "@/features/transfers/types";
import { errorMessage } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

/**
 * Transfer detal paneli (LOGIST-PLAN §8.2): itemlar jadvali, timeline
 * (kim/qachon holat o'zgartirgan) va egalikka mos holat tugmalari.
 */
export function TransferDetailSheet({
  transferId,
  direction,
  onClose,
}: {
  transferId: number | null;
  direction: TransferDirection;
  onClose: () => void;
}) {
  const detail = useQuery({
    queryKey: queryKeys.transferDetail(transferId ?? 0),
    queryFn: ({ signal }) => fetchTransferDetail(transferId as number, signal),
    enabled: transferId !== null,
  });

  const transfer = detail.data ?? null;
  const info = transfer ? transferStatusInfo(transfer.status) : null;

  return (
    <Sheet
      open={transferId !== null}
      onOpenChange={(next) => !next && onClose()}
    >
      <SheetContent
        side="right"
        className="flex w-[500px] max-w-[calc(100vw-1.5rem)] flex-col gap-0 p-0"
      >
        <div className="border-line border-b px-5 py-4 pr-12">
          <SheetTitle className="text-ink truncate text-base font-semibold">
            {transfer?.number ? (
              <span data-no-translit>{transfer.number}</span>
            ) : detail.isPending ? (
              "Yuklanmoqda..."
            ) : (
              "Zakaz"
            )}
          </SheetTitle>
          <SheetDescription asChild>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {transfer && info ? (
                <StatusPill label={info.label} color={info.color} size="sm" />
              ) : null}
              {transfer ? (
                <span className="text-ink-muted text-meta" data-no-translit>
                  {transfer.fromFilial.name} → {transfer.toFilial.name}
                </span>
              ) : null}
            </div>
          </SheetDescription>
        </div>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {detail.isPending ? (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          ) : null}

          {detail.isError ? (
            <p className="text-danger text-body">
              {errorMessage(detail.error, "Zakazni yuklashda xatolik")}
            </p>
          ) : null}

          {transfer ? (
            <TransferView transfer={transfer} direction={direction} />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function TransferView({
  transfer,
  direction,
}: {
  transfer: FilialTransfer;
  direction: TransferDirection;
}) {
  const queryClient = useQueryClient();
  const [reasonFor, setReasonFor] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const transitions = allowedTransferTransitions(transfer, direction);

  const change = useMutation({
    mutationFn: ({ to, why }: { to: string; why?: string | null }) =>
      updateTransferStatus(transfer.id, to, why),
    onSuccess: (updated) => {
      toast.success(
        `${updated.number} · ${transferStatusInfo(updated.status).label}`,
      );
      queryClient.setQueryData(queryKeys.transferDetail(transfer.id), updated);
      void queryClient.invalidateQueries({ queryKey: ["transfers"] });
      setReasonFor(null);
      setReason("");
    },
    onError: (error) =>
      toast.error(transferErrorMessage(error, "Holatni o'zgartirishda xatolik")),
  });

  return (
    <div className="space-y-5">
      {/* ── Amallar ───────────────────────────────────────────────────────── */}
      {transitions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {transitions.map((transition) => (
            <Button
              key={transition.to}
              size="sm"
              variant={transition.destructive ? "destructive" : "default"}
              disabled={change.isPending}
              onClick={() => {
                // Rad etishda sabab majburiy (§7 `reject_reason_required`).
                if (transitionNeedsReason(transition.to)) {
                  setReasonFor(transition.to);
                  return;
                }
                change.mutate({ to: transition.to });
              }}
            >
              {change.isPending ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : null}
              {transition.label}
            </Button>
          ))}
        </div>
      ) : null}

      {transfer.rejectReason ? (
        <p className="bg-danger-soft text-danger rounded-lg px-3 py-2.5 text-meta">
          Rad etish sababi: <span data-no-translit>{transfer.rejectReason}</span>
        </p>
      ) : null}

      {/* ── Ma'lumot ──────────────────────────────────────────────────────── */}
      <dl className="grid gap-3">
        <Row
          label="Buyurtmachi filial"
          value={transfer.fromFilial.name || "—"}
          raw
        />
        <Row label="Ta'minotchi filial" value={transfer.toFilial.name || "—"} raw />
        {transfer.createdBy ? (
          <Row label="Kim yaratgan" value={transfer.createdBy} raw />
        ) : null}
        <Row
          label="Sana"
          value={
            transfer.createdAt ? formatDateTime(transfer.createdAt) : "—"
          }
        />
        {transfer.note ? <Row label="Izoh" value={transfer.note} raw /> : null}
      </dl>

      {/* ── Itemlar — narxsiz, faqat miqdor (ichki hujjat) ────────────────── */}
      <section>
        <h3 className="text-ink flex items-center gap-2 text-dense font-semibold">
          <Package className="text-ink-faint size-4" />
          Mahsulotlar · {transfer.itemsCount}
        </h3>

        <ul className="border-line divide-line mt-2.5 divide-y overflow-hidden rounded-xl border">
          {transfer.items.map((item, index) => (
            <li
              key={`${item.product.id}-${index}`}
              className="flex items-center gap-3 p-2.5"
            >
              {item.product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.product.imageUrl}
                  alt=""
                  loading="lazy"
                  className="size-10 shrink-0 rounded-md object-cover"
                />
              ) : (
                <span className="bg-subtle flex size-10 shrink-0 items-center justify-center rounded-md">
                  <Package className="text-ink-faint size-4.5" />
                </span>
              )}

              <p className="text-ink min-w-0 flex-1 truncate text-dense font-medium" data-no-translit>
                {item.product.name || "—"}
              </p>

              <span className="text-ink tabular shrink-0 text-dense font-semibold">
                {item.quantity} dona
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Timeline ──────────────────────────────────────────────────────── */}
      {transfer.timeline.length > 0 ? (
        <section>
          <h3 className="text-ink-muted flex items-center gap-1.5 text-fine font-semibold tracking-wider uppercase">
            <History className="size-3.5" />
            Tarix
          </h3>
          <ol className="border-line divide-line mt-2 divide-y overflow-hidden rounded-xl border">
            {transfer.timeline.map((entry, index) => {
              const status = transferStatusInfo(entry.status);
              return (
                <li
                  key={`${entry.status}-${index}`}
                  className="flex items-center gap-2.5 px-3.5 py-2.5"
                >
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: status.mark }}
                  />
                  <span className="text-ink flex-1 text-dense font-medium">
                    {status.label}
                  </span>
                  <span className="text-ink-faint text-meta">
                    {[entry.by, entry.at ? formatDateTime(entry.at) : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      {/* ── Rad etish sababi oynasi ───────────────────────────────────────── */}
      <Dialog
        open={reasonFor !== null}
        onOpenChange={(next) => !next && setReasonFor(null)}
      >
        <DialogContent className="w-[24rem] max-w-[calc(100vw-2rem)]">
          <DialogTitle>Rad etish sababi</DialogTitle>
          <DialogDescription>
            Sabab buyurtmachi filialga ko&apos;rinadi.
          </DialogDescription>

          <div className="mt-3">
            <Field label="Sabab">
              <textarea
                rows={2}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Masalan: mahsulot qoldig'i yetarli emas"
                className={cn(inputClass, "h-auto resize-y py-2.5")}
              />
            </Field>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setReasonFor(null)}>
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              disabled={!reason.trim() || change.isPending}
              onClick={() =>
                change.mutate({ to: reasonFor as string, why: reason.trim() })
              }
            >
              {change.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              Rad etish
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** `raw` — qiymat ma'lumot (filial nomi, izoh): tarjima qilinmaydi. */
function Row({ label, value, raw = false }: { label: string; value: string; raw?: boolean }) {
  return (
    <div>
      <dt className="text-ink-muted text-meta">{label}</dt>
      <dd
        className="text-ink mt-0.5 text-body font-medium whitespace-pre-wrap"
        data-no-translit={raw ? "" : undefined}
      >
        {value}
      </dd>
    </div>
  );
}
