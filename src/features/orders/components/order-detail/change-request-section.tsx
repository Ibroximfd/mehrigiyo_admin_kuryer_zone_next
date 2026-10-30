"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ImageIcon, LoaderCircle, MessageSquareDiff, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

import { inputClass } from "@/components/kit/field";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  acceptChangeRequest,
  fetchBranchOperators,
  fetchChangeRequests,
  rejectChangeRequest,
} from "@/features/orders/api";
import {
  changeRequestDelta,
  changeRequestKindLabel,
  changeRequestStatusLabel,
  isOpenChangeRequest,
} from "@/features/orders/change-request";
import type { ChangeRequest } from "@/features/orders/change-request";
import { DetailSection } from "@/features/orders/components/order-detail/section";
import { orderErrorMessage } from "@/features/orders/error-hints";
import type { LogistOrder } from "@/features/orders/types";
import { useOrderPatchCache } from "@/features/orders/use-order-patch-cache";
import { errorCode } from "@/lib/api-client";
import { formatShortDateTime, formatSom } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

const OPERATOR_REQUIRED_HINT =
  "Ilova buyurtmasi, lid egasi yo'q — komissiya kimga yozilishini tanlang va qayta qabul qiling";

/**
 * Eshikdagi o'zgarish so'rovi (`LOGIST_02` §2). Ochiq so'rov — logistning
 * birinchi ishi: kuryer mijoz oldida kutmoqda va so'rov yopilmaguncha
 * buyurtmani yakunlay olmaydi. Qabulda tarkib/summa serverda o'zgaradi,
 * kuryerga yangi summa pushi boradi.
 *
 * Yopilgan so'rovlar pastda tarix sifatida — kim, qachon, nima qaror.
 */
export function ChangeRequestSection({ order }: { order: LogistOrder }) {
  const list = useQuery({
    queryKey: queryKeys.orderChangeRequests(order.id),
    queryFn: ({ signal }) => fetchChangeRequests(order.id, signal),
    staleTime: 30_000,
  });
  const reduced = useReducedMotion();

  // Kartadagi nusxa — WS bilan eng tez yangilanadigan manba; ro'yxat zaxira.
  const open = isOpenChangeRequest(order.changeRequest)
    ? order.changeRequest
    : (list.data?.find((request) => isOpenChangeRequest(request)) ?? null);
  // `!isOpenChangeRequest` tur qo'riqchisi `never` ga toraytirardi — status bo'yicha.
  const history = (list.data ?? []).filter((request) => request.status !== "pending");

  if (!open && history.length === 0) return null;

  return (
    <DetailSection
      title={
        <>
          <MessageSquareDiff className="size-3.5" aria-hidden />
          Eshikdagi o&apos;zgarish
        </>
      }
      aside={open ? <span className="text-gold font-semibold">Kuryer kutmoqda</span> : null}
      className={open ? "border-amber-line" : undefined}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {open ? (
          <motion.div
            key={open.id}
            layout={!reduced}
            initial={reduced ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.22 }}
          >
            <OpenRequest order={order} request={open} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {history.length > 0 ? (
        <ul className="flex flex-col gap-1.5" aria-label="Avvalgi so'rovlar">
          {history.map((request) => (
            <HistoryRow key={request.id} request={request} />
          ))}
        </ul>
      ) : null}
    </DetailSection>
  );
}

function RequestItems({ request }: { request: ChangeRequest }) {
  if (request.items.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1 text-dense">
      {request.items.map((item, index) => (
        <li
          key={`${item.productId ?? "x"}-${index}`}
          className="flex items-baseline justify-between gap-3"
        >
          <span data-no-translit className="text-ink min-w-0 truncate">
            {item.title || "Mahsulot"}
          </span>
          <span className="text-ink-muted tabular shrink-0">
            {item.quantity} ×{" "}
            {item.unitPrice !== null ? formatSom(item.unitPrice) : "—"}
          </span>
        </li>
      ))}
    </ul>
  );
}

function OpenRequest({ order, request }: { order: LogistOrder; request: ChangeRequest }) {
  const queryClient = useQueryClient();
  const applyPatch = useOrderPatchCache(order.id);
  const [note, setNote] = useState("");
  const [operatorAsked, setOperatorAsked] = useState(false);
  const [operatorId, setOperatorId] = useState<number | null>(null);
  const delta = changeRequestDelta(request);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.orderChangeRequests(order.id) });
    // Ochiq lid kartasidagi buyurtma belgisi; doskaning o'zi WS bilan yamaladi.
    void queryClient.invalidateQueries({ queryKey: ["pipeline", "lead"], refetchType: "active" });
  };

  const accept = useMutation({
    mutationFn: () => acceptChangeRequest(order.id, request.id, { note, operatorId }),
    onSuccess: (updated) => {
      toast.success(
        `#${updated.orderNumber}: so'rov qabul qilindi · yangi summa ${formatSom(updated.payableAmount)}`,
      );
      applyPatch(updated);
      refresh();
    },
    onError: (error) => {
      if (errorCode(error) === "operator_required") {
        setOperatorAsked(true);
        toast.warning(OPERATOR_REQUIRED_HINT);
        return;
      }
      toast.error(orderErrorMessage(error, "So'rovni qabul qilishda xatolik"));
      if (errorCode(error) === "change_request_closed") refresh();
    },
  });

  const reject = useMutation({
    mutationFn: () => rejectChangeRequest(order.id, request.id, note),
    onSuccess: () => {
      toast.success(`#${order.orderNumber}: so'rov rad etildi`);
      applyPatch({ ...order, changeRequest: null });
      refresh();
    },
    onError: (error) => {
      toast.error(orderErrorMessage(error, "So'rovni rad etishda xatolik"));
      if (errorCode(error) === "change_request_closed") refresh();
    },
  });

  const busy = accept.isPending || reject.isPending;
  const acceptBlocked = operatorAsked && operatorId === null;

  return (
    <div className="bg-amber-soft/60 border-amber-line flex flex-col gap-3 rounded-lg border px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-ink text-dense font-semibold">
          {changeRequestKindLabel(request.kind)}
        </span>
        <span className="text-ink-muted text-meta">
          {[
            request.courier?.fullName,
            request.createdAt ? formatShortDateTime(request.createdAt) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
        {delta !== null ? (
          <span
            className={cn(
              "tabular ml-auto text-dense font-semibold",
              delta > 0 ? "text-ok" : delta < 0 ? "text-danger" : "text-ink-muted",
            )}
            title="Taxmin — yakuniy summani server hisoblaydi"
          >
            {delta > 0 ? "+" : ""}
            {formatSom(delta)}
          </span>
        ) : null}
      </div>

      <RequestItems request={request} />

      {request.note ? (
        <p className="text-ink text-dense leading-relaxed">«{request.note}»</p>
      ) : null}
      {request.photoUrl ? (
        <a
          href={request.photoUrl}
          target="_blank"
          rel="noreferrer"
          className="text-link inline-flex w-fit items-center gap-1.5 text-meta font-medium hover:underline"
        >
          <ImageIcon className="size-3.5" aria-hidden />
          Rasmni ochish
        </a>
      ) : null}

      {operatorAsked ? (
        <CommissionOperatorPicker
          order={order}
          value={operatorId}
          onChange={setOperatorId}
        />
      ) : null}

      <label className="flex flex-col gap-1">
        <span className="text-ink-muted text-meta">Izoh kuryerga (ixtiyoriy)</span>
        <input
          value={note}
          maxLength={300}
          onChange={(event) => setNote(event.target.value)}
          placeholder="masalan: mijozga yangi summani ayting"
          className={inputClass}
        />
      </label>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={busy}
          onClick={() => reject.mutate()}
        >
          {reject.isPending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <X className="size-4" />
          )}
          Rad etish
        </Button>
        <Button
          type="button"
          size="lg"
          disabled={busy || acceptBlocked}
          onClick={() => accept.mutate()}
        >
          {accept.isPending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          Qabul qilish
        </Button>
      </div>
    </div>
  );
}

/**
 * `400 operator_required` dan keyin chiqadi: ilova buyurtmasida komissiya
 * egasi yo'q. Tanlov filial ro'yxatidan — server `operator_id` ni shu
 * ro'yxat bilan tekshiradi.
 */
function CommissionOperatorPicker({
  order,
  value,
  onChange,
}: {
  order: LogistOrder;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const branch = useQuery({
    queryKey: queryKeys.branchOperators,
    queryFn: ({ signal }) => fetchBranchOperators(signal),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const people = branch.data ?? [];

  return (
    <div className="flex flex-col gap-1">
      <span className="text-warn text-meta font-medium">{OPERATOR_REQUIRED_HINT}</span>
      <Select
        value={value === null ? "" : String(value)}
        onValueChange={(next) => onChange(next ? Number(next) : null)}
        disabled={branch.isPending || people.length === 0}
      >
        <SelectTrigger aria-label="Komissiya egasi (operator)" className="w-full">
          <SelectValue
            placeholder={
              branch.isPending
                ? "Operatorlar yuklanmoqda…"
                : people.length === 0
                  ? "Operatorlar ro'yxati yo'q"
                  : "Operatorni tanlang"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {people.map((person) =>
            person.id === null ? null : (
              <SelectItem key={person.id} value={String(person.id)}>
                <span data-no-translit>{person.name || `#${person.id}`}</span>
                {person.id === order.leadAssignee?.id ? " · lid egasi" : ""}
              </SelectItem>
            ),
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

function HistoryRow({ request }: { request: ChangeRequest }) {
  const accepted = request.status === "accepted";
  return (
    <li className="border-line flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-dashed py-1.5 text-dense last:border-b-0">
      <span className="text-ink font-medium">{changeRequestKindLabel(request.kind)}</span>
      <span
        className={cn(
          "text-meta font-semibold",
          accepted ? "text-ok" : request.status === "rejected" ? "text-danger" : "text-ink-muted",
        )}
      >
        {changeRequestStatusLabel(request.status)}
      </span>
      <span className="text-ink-faint text-meta ml-auto">
        {[
          request.resolvedBy,
          request.resolvedAt ? formatShortDateTime(request.resolvedAt) : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </span>
      {request.decisionNote ? (
        <span className="text-ink-muted text-meta w-full">{request.decisionNote}</span>
      ) : null}
    </li>
  );
}
