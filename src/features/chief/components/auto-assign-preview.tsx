"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CircleOff, LoaderCircle, MapPinOff, RotateCcw, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ADAPTIVE_DIALOG } from "@/components/kit/adaptive-dialog";
import { ProductThumbs } from "@/components/kit/product-thumb";
import { SelectField } from "@/components/kit/select-field";
import { EmptyView, ErrorView } from "@/components/kit/state-views";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { applyAutoAssign, fetchChiefCouriers, fetchChiefZones, fetchIncomingOrders, previewAutoAssign } from "@/features/chief/api";
import type { IncomingProgress } from "@/features/chief/api";
import { AUTO_ASSIGN_REASONS } from "@/features/chief/types";
import type { AutoAssignPreviewRow } from "@/features/chief/types";
import type { Courier } from "@/features/couriers/types";
import { formatDeliveryAddress } from "@/features/orders/address";
import type { LogistOrder } from "@/features/orders/types";
import type { Zone } from "@/features/zones/types";
import { ApiError, errorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

import { courierOptions, pickCourier, planFromPreview, previewHasOrders, readyRows } from "../auto-plan";
import type { PlanRow } from "../auto-plan";
import { orderProductsLine } from "../order-view";

/**
 * Avto-taqsimlash — avval reja (`auto-assign/preview/`): har zakaz qaysi
 * zonaga va qaysi kuryerga ketishi ko'rinadi, zonasi topilmaganlar alohida.
 * Bosh kuryer zonani yoki kuryerni almashtiradi, zakazni chiqaradi;
 * «Taqsimlash» bosilgandagina `auto-assign/apply/` bilan yuboriladi.
 */
export function AutoAssignPreview({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  // Reja har ochilishda yangidan — eski reja yuborilmasin.
  const preview = useQuery({
    queryKey: queryKeys.chiefAutoAssignPreview,
    queryFn: ({ signal }) => previewAutoAssign(signal),
    staleTime: 0,
    gcTime: 0,
  });
  // Server rejani zakaz kartalari bilan bersa (51-javob, `include_order`) — zakazlar alohida so'ralmaydi.
  // Bermasa (eski server) — reja bilan parallel yuklanadi, kutish uzaymasin.
  const ordersInPlan = preview.data !== undefined && previewHasOrders(preview.data);
  const ordersKey = queryKeys.chiefOrders({ scope: "incoming", plan: true });
  const [progress, setProgress] = useState<IncomingProgress | null>(null);
  const orders = useQuery({
    queryKey: ordersKey,
    queryFn: ({ signal }) => fetchIncomingOrders(signal, setProgress),
    staleTime: 0,
    enabled: !ordersInPlan,
  });
  useEffect(() => {
    if (ordersInPlan) void queryClient.cancelQueries({ queryKey: ordersKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- kalit doimiy
  }, [ordersInPlan, queryClient]);
  const zones = useQuery({ queryKey: queryKeys.chiefZones, queryFn: ({ signal }) => fetchChiefZones(signal) });
  const couriers = useQuery({ queryKey: queryKeys.chiefCouriers, queryFn: ({ signal }) => fetchChiefCouriers(signal) });
  const planOrders = ordersInPlan ? [] : orders.data;
  const failed = (ordersInPlan ? null : orders.error) ?? preview.error ?? zones.error ?? couriers.error;

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className={cn(ADAPTIVE_DIALOG, "sm:max-w-4xl")}>
        <div className="border-line border-b px-5 pt-5 pb-4">
          <DialogTitle className="text-ink text-title">Avto taqsimlash rejasi</DialogTitle>
          <DialogDescription className="text-ink-muted mt-1 text-meta">
            Tekshiring: zona yoki kuryer xato bo&apos;lsa — shu yerda almashtiring. Yuborish «Taqsimlash» bilan.
          </DialogDescription>
        </div>
        {failed ? (
          <ErrorView
            message={errorMessage(failed, "Rejani tuzishda xatolik")}
            onRetry={() => {
              void orders.refetch();
              void preview.refetch();
              void zones.refetch();
              void couriers.refetch();
            }}
          />
        ) : planOrders && preview.data && zones.data && couriers.data ? (
          <PlanEditor
            preview={preview.data}
            orders={planOrders}
            zones={zones.data.zones.filter((zone) => zone.isActive)}
            couriers={couriers.data.filter((courier) => courier.isActive)}
            onClose={onClose}
          />
        ) : (
          <PlanLoading
            ordersNeeded={!ordersInPlan}
            ordersDone={orders.isSuccess}
            progress={progress}
            previewDone={preview.isSuccess}
            couriersDone={zones.isSuccess && couriers.isSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Reja tuzilayotganda — bo'sh oyna emas: qaysi bosqich ketayotgani va nechta
 * zakaz yuklangani matn bilan (egasi, 2026-11-10: «kutishda hech reaksiya yo'q»).
 */
function PlanLoading({
  ordersNeeded,
  ordersDone,
  progress,
  previewDone,
  couriersDone,
}: {
  ordersNeeded: boolean;
  ordersDone: boolean;
  progress: IncomingProgress | null;
  previewDone: boolean;
  couriersDone: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 p-5" role="status" aria-live="polite">
      <ul className="border-line bg-subtle flex flex-col gap-2.5 rounded-xl border px-4 py-3.5">
        <LoadingStep done={previewDone}>
          <span>Server zona va kuryerlarni hisoblayapti</span>
        </LoadingStep>
        {ordersNeeded ? (
          <LoadingStep done={ordersDone}>
            <span>Kelgan zakazlar yuklanmoqda</span>
            {progress && progress.loaded > 0 ? (
              <span className="text-ink-faint tabular" data-no-translit>
                {progress.total === null ? progress.loaded : `${progress.loaded} / ${progress.total}`}
              </span>
            ) : null}
          </LoadingStep>
        ) : null}
        <LoadingStep done={couriersDone}>
          <span>Zonalar va kuryerlar</span>
        </LoadingStep>
      </ul>
      <div className="flex flex-col gap-2" aria-hidden>
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function LoadingStep({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <li className={cn("flex items-center gap-2.5 text-dense", done ? "text-ink-muted" : "text-ink")}>
      {done ? (
        <Check className="text-ok size-4 shrink-0" aria-hidden />
      ) : (
        <LoaderCircle className="text-brand size-4 shrink-0 animate-spin" aria-hidden />
      )}
      {children}
    </li>
  );
}

function PlanEditor({
  preview,
  orders,
  zones,
  couriers,
  onClose,
}: {
  preview: AutoAssignPreviewRow[];
  orders: LogistOrder[];
  zones: Zone[];
  couriers: Courier[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<PlanRow[]>(() => planFromPreview(preview, orders));
  // Bo'limlar boshlang'ich reja bo'yicha — zona tanlanganda qator joyidan sakramaydi.
  // «Zonasi topilmadi» — faqat server `no_zone` degan qatorlar: `ok` + `zone: null` (kuryer bor) ham bo'ladi.
  const [initiallyUnzoned] = useState(() => new Set(rows.filter((row) => row.reason === "no_zone").map((row) => row.order.id)));
  const [clientActionId] = useState(() => crypto.randomUUID());
  const ready = readyRows(rows);
  const unzoned = rows.filter((row) => initiallyUnzoned.has(row.order.id));
  const zoned = rows.filter((row) => !initiallyUnzoned.has(row.order.id));

  const update = (orderId: string, patch: Partial<PlanRow>) =>
    setRows((current) => current.map((row) => (row.order.id === orderId ? { ...row, ...patch } : row)));

  const changeZone = (row: PlanRow, zoneId: number | null) =>
    update(row.order.id, { zoneId, courierId: pickCourier(couriers, zoneId)?.id ?? null });

  // `client_action_id` serverda saqlanmaydi (takror himoyasi yo'q) — ikki marta yuborilmasligini shu yerda qulflaymiz:
  // ref — bir kadrdagi qo'sh bosishga, holat — tugmani bloklashga.
  const sentRef = useRef(false);
  const [sent, setSent] = useState(false);
  const lock = (value: boolean) => {
    sentRef.current = value;
    setSent(value);
  };

  const submit = useMutation({
    mutationFn: () =>
      applyAutoAssign(
        ready.map((row) => ({ orderId: row.order.id, courierId: row.courierId })),
        clientActionId,
      ),
    onSuccess: (result) => {
      const numberOf = (id: string) => rows.find((row) => row.order.id === id)?.order.orderNumber ?? id;
      if (result.failed.length === 0) toast.success(`${result.assigned.length} ta zakaz kuryerlarga taqsimlandi`);
      else
        toast.error(
          `${result.assigned.length} ta taqsimlandi · ${result.failed.length} tasi o'tmadi: ${result.failed.map((row) => numberOf(row.id)).join(", ")}`,
        );
      void queryClient.invalidateQueries({ queryKey: queryKeys.chief });
      onClose();
    },
    onError: (error) => {
      // Server rad etdi (javob keldi) — hech narsa yozilmagan, qayta yuborish xavfsiz. Javobsiz (tarmoq, vaqt) —
      // natija noma'lum: qulf qoladi, ro'yxat yangilanadi.
      const answered = error instanceof ApiError && error.status !== undefined && error.status < 500;
      if (answered) {
        lock(false);
        toast.error(errorMessage(error, "Avto taqsimlashda xatolik"));
        return;
      }
      toast.error("Javob kelmadi — taqsimlangan bo'lishi mumkin. Ro'yxatni tekshiring, keyin qayta oching");
      void queryClient.invalidateQueries({ queryKey: queryKeys.chief });
    },
  });
  const send = () => {
    if (sentRef.current || ready.length === 0) return;
    lock(true);
    submit.mutate();
  };
  const busy = sent || submit.isPending;

  if (rows.length === 0) {
    return (
      <EmptyView Icon={CircleOff} title="Taqsimlanadigan zakaz yo'q" description="Kelgan zakazlar hammasi kuryerlarda." />
    );
  }

  const editorProps = { zones, couriers, disabled: busy, onZone: changeZone, update };
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {unzoned.length > 0 ? (
          <section className="mb-5">
            <h3 className="text-warn mb-2 flex items-center gap-1.5 text-dense font-semibold">
              <MapPinOff className="size-4" aria-hidden />
              {`Zonasi topilmadi · ${unzoned.length}`}
            </h3>
            <p className="text-ink-muted mb-2 text-meta">Zonani o&apos;zingiz tanlang yoki zakazni chiqarib qo&apos;ying.</p>
            <PlanList rows={unzoned} {...editorProps} />
          </section>
        ) : null}
        {zoned.length > 0 ? (
          <section>
            <h3 className="text-ink mb-2 text-dense font-semibold">{`Zona bo'yicha · ${zoned.length}`}</h3>
            <PlanList rows={zoned} {...editorProps} />
          </section>
        ) : null}
      </div>
      <div className="border-line bg-surface flex flex-wrap items-center gap-3 border-t px-5 py-3.5">
        <p className="text-ink-muted min-w-0 flex-1 text-meta">
          {`${ready.length} ta zakaz yuboriladi · ${rows.length - ready.length} tasi qoladi`}
        </p>
        <Button variant="ghost" onClick={onClose} disabled={submit.isPending}>
          Bekor qilish
        </Button>
        <Button onClick={send} disabled={ready.length === 0 || busy}>
          {submit.isPending ? <LoaderCircle className="animate-spin" /> : <Send />}
          Taqsimlash
        </Button>
      </div>
    </>
  );
}

function PlanList({
  rows,
  zones,
  couriers,
  disabled,
  onZone,
  update,
}: {
  rows: PlanRow[];
  zones: Zone[];
  couriers: Courier[];
  disabled: boolean;
  onZone: (row: PlanRow, zoneId: number | null) => void;
  update: (orderId: string, patch: Partial<PlanRow>) => void;
}) {
  return (
    <ul className="border-line divide-line divide-y overflow-hidden rounded-xl border">
      {rows.map((row) => {
        const zoneCouriers = courierOptions(couriers, row);
        return (
          <li
            key={row.order.id}
            className={cn("flex flex-col gap-2.5 px-3.5 py-3 md:flex-row md:items-center", row.excluded && "bg-subtle opacity-60")}
          >
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2">
                <span className="text-ink tabular text-dense font-semibold" data-no-translit>{row.order.orderNumber}</span>
                <span className="text-ink-muted truncate text-dense" data-no-translit>{row.order.client.fullName}</span>
              </p>
              <p className="text-ink-faint truncate text-meta" data-no-translit>
                {formatDeliveryAddress(row.order) ?? "Manzil yo'q"}
              </p>
              <p className="mt-1 flex min-w-0 items-center gap-2">
                <ProductThumbs items={row.order.items} />
                <span className="text-ink-muted truncate text-meta" data-no-translit>{orderProductsLine(row.order)}</span>
              </p>
              {row.courierId === null && AUTO_ASSIGN_REASONS[row.reason] ? (
                <p className="text-warn text-meta">{AUTO_ASSIGN_REASONS[row.reason]}</p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2 md:w-96 md:shrink-0">
              <SelectField
                label={`${row.order.orderNumber}: zona`}
                allLabel="Zona tanlang"
                value={row.zoneId === null ? null : String(row.zoneId)}
                options={zones.map((zone) => ({ value: String(zone.id), label: zone.name, translate: false }))}
                onChange={(value) => onZone(row, value === null ? null : Number(value))}
                className={cn(row.zoneId === null && "border-warn text-warn")}
              />
              <SelectField
                label={`${row.order.orderNumber}: kuryer`}
                allLabel={zoneCouriers.length === 0 ? "Kuryer yo'q" : "Kuryer tanlang"}
                value={row.courierId === null ? null : String(row.courierId)}
                options={zoneCouriers.map((courier) => ({
                  value: String(courier.id),
                  label: `${courier.fullName} · ${courier.load ?? 0}`,
                  translate: false,
                }))}
                onChange={(value) => update(row.order.id, { courierId: value === null ? null : Number(value) })}
              />
            </div>
            <Button
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={() => update(row.order.id, { excluded: !row.excluded })}
              className="self-end md:self-center"
            >
              {row.excluded ? <RotateCcw /> : <X />}
              {row.excluded ? "Qaytarish" : "Chiqarish"}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
