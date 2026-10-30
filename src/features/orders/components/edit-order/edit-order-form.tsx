"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { LoaderCircle, RefreshCw, TriangleAlert, X } from "lucide-react";
import { useMemo, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import type { Path } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  SheetClose,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { updateOrder } from "@/features/orders/api";
import {
  isOperatorForbiddenError,
  isOperatorInvalidError,
  isOperatorRequiredError,
  needsCommissionOperator,
  operatorCandidates,
} from "@/features/orders/commission-operator";
import type { OperatorCandidate } from "@/features/orders/commission-operator";
import { ClientFields } from "@/features/orders/components/edit-order/client-fields";
import { DeliveryFields } from "@/features/orders/components/edit-order/delivery-fields";
import { DISTRICT_REPICK_MESSAGE } from "@/features/orders/delivery-address";
import {
  EditField,
  editInputClass,
} from "@/features/orders/components/edit-order/edit-field";
import { ItemsEditor } from "@/features/orders/components/edit-order/items-editor";
import { LogisticsFields } from "@/features/orders/components/edit-order/logistics-fields";
import { OperatorField } from "@/features/orders/components/edit-order/operator-field";
import { PaymentFields } from "@/features/orders/components/edit-order/payment-fields";
import { StatusTag } from "@/features/orders/components/status-tag";
import {
  EDIT_FIELD_LABELS,
  buildEditPatch,
  changedEditFields,
  editDrift,
  editMoneyLocks,
  missingOperator,
  editOrderSchema,
  editReasonRequired,
  EDIT_REASON_REQUIRED_MESSAGE,
  orderToEditValues,
} from "@/features/orders/edit-order";
import type { EditOrderValues } from "@/features/orders/edit-order";
import { orderErrorMessage } from "@/features/orders/error-hints";
import type { LogistOrder } from "@/features/orders/types";
import { useOrderPatchCache } from "@/features/orders/use-order-patch-cache";
import { errorCode, errorFields } from "@/lib/api-client";

/** Backend maydon nomi → forma maydoni (server xatosi to'g'ri maydonga tushsin). */
const SERVER_FIELDS: Record<string, Path<EditOrderValues>> = {
  client_name: "clientName",
  ordered_for_phone: "orderedForPhone",
  region: "region",
  district: "district",
  locality: "locality",
  delivery_date: "deliveryDate",
  delivery_window: "deliveryWindow",
  address_text: "addressText",
  items: "items",
  box_count: "boxCount",
  extra_product_note: "extraProductNote",
  gift_comment: "giftComment",
  payment_method: "paymentMethod",
  courier_id: "courierId",
  tags: "tags",
  logist_note: "logistNote",
  change_reason: "changeReason",
  // Yetkazilgan buyurtma tahriri sababi (`edit_reason_required`).
  note: "changeReason",
  operator_id: "operatorId",
};

const OPERATOR_REQUIRED_MESSAGE =
  "Buyurtma operator tavsiyasi orqali kelgan — tarkibni o'zgartirish uchun komissiya egasini tanlang";
const OPERATOR_INVALID_MESSAGE =
  "Bu operator filialingizning faol sotuvchisi emas — ro'yxatdan boshqasini tanlang";

type SaveVariables = {
  values: EditOrderValues;
  operatorRequired: boolean;
  /** Avtomatik qayta urinish bo'lgan — ikkinchisi yo'q (halqa bo'lmasin). */
  retried?: boolean;
};

/** Umumiy (maydonga bog'lanmagan) xatolar uchun do'stona izoh. */
function friendlyError(error: unknown): string {
  const code = errorCode(error);
  if (code === "field_not_allowed") {
    // `fields` bo'lsa sabablar maydon ostida; bo'lmasa (noma'lum maydon)
    // backend `detail` da nomlarni aytadi — o'shani ko'rsatamiz.
    const reasons = Object.values(errorFields(error)).flat().filter(Boolean);
    if (reasons.length > 0) return reasons.join(" · ");
    return error instanceof Error && error.message
      ? error.message
      : "Bu maydonni hozirgi bosqichda o'zgartirib bo'lmaydi";
  }
  if (code === "endpoint_missing" || code === "order_not_found") {
    return "Tahrir endpointi hali chiqmagan yoki buyurtma topilmadi — keyinroq urinib ko'ring.";
  }
  return orderErrorMessage(error, "Saqlashda xatolik");
}

/**
 * Tahrirlash formasi (dizayn `Logist_Edit_Order`, o'ng tomon): istalgan
 * bosqichda, o'zgargan maydonlar amber, sarlavhada "N maydon o'zgardi",
 * pastda ro'yxati. `PATCH` — faqat o'zgargan kalitlar + sabab.
 */
export function EditOrderForm({
  order,
  onClose,
}: {
  order: LogistOrder;
  onClose: () => void;
}) {
  /*
   * Diff **ochilgan paytdagi** nusxaga nisbatan: forma ochiq turganda
   * buyurtma WS/boshqa logist orqali yangilansa ham, logist tegmagan maydon
   * yuborilmaydi va birovning o'zgarishi jimgina eski qiymatga qaytmaydi.
   */
  const [opened, setOpened] = useState(() => orderToEditValues(order));
  const latest = useMemo(() => orderToEditValues(order), [order]);
  const applyPatch = useOrderPatchCache(order.id);
  const locks = editMoneyLocks(order);
  const candidates = useMemo(() => operatorCandidates(order), [order]);
  const [formError, setFormError] = useState<string | null>(null);
  const [serverAskedOperator, setServerAskedOperator] = useState(false);
  // Server "bu buyurtmaga operator_id mumkin emas" degan (egasi bor) — so'ralmaydi.
  const [operatorForbidden, setOperatorForbidden] = useState(false);
  const operatorRequired =
    !operatorForbidden &&
    (needsCommissionOperator(order) || serverAskedOperator);

  const form = useForm<EditOrderValues>({
    resolver: zodResolver(editOrderSchema),
    defaultValues: opened,
    mode: "onBlur",
  });
  const values = useWatch({ control: form.control }) as EditOrderValues;
  const current = { ...opened, ...values };
  const changedList = changedEditFields(opened, current);
  const changed = new Set(changedList);
  const drift = editDrift(opened, latest, current);
  const reasonRequired = editReasonRequired(order.status);

  const save = useMutation({
    mutationFn: ({
      values: next,
      operatorRequired: withOperator,
    }: SaveVariables) => {
      const patch = buildEditPatch(opened, next, {
        operatorRequired: withOperator,
        reasonAsNote: reasonRequired,
      });
      if (!patch) throw new Error("no_changes");
      return updateOrder(order.id, patch);
    },
    onSuccess: (updated, variables) => {
      const operator = sentOperatorName(opened, variables, candidates);
      toast.success(
        `${updated.orderNumber} · ${changedList.length} maydon o'zgardi${operator ? ` · komissiya: ${operator}` : ""}`,
      );
      applyPatch(updated);
      onClose();
    },
    onError: (error, variables) => {
      if (isOperatorInvalidError(error)) {
        form.setError(
          "operatorId",
          { message: OPERATOR_INVALID_MESSAGE },
          { shouldFocus: true },
        );
        setFormError(null);
        return;
      }
      /*
       * Egasi bor buyurtma — logist komissiya egasini almashtira olmaydi
       * (2026-10-01 §5.5 pul qulfi). Maydon yopiladi va so'rov bir marta
       * `operator_id` siz qayta ketadi.
       */
      if (isOperatorForbiddenError(error) && variables.operatorRequired) {
        setOperatorForbidden(true);
        setServerAskedOperator(false);
        if (!variables.retried) {
          save.mutate({
            values: variables.values,
            operatorRequired: false,
            retried: true,
          });
          return;
        }
      }
      if (isOperatorRequiredError(error)) {
        setServerAskedOperator(true);
        /*
         * Backend komissiya egasini so'radi. Operator buyurtmadan topilgan
         * bo'lsa — bir marta o'zi qayta yuboradi (logist ikkinchi marta
         * "Saqlash" bosib o'tirmaydi); topilmasa maydon ochilib, xato unda.
         * Ikkinchi urinish `operatorRequired: true` bilan ketadi — halqa yo'q.
         */
        if (
          !variables.retried &&
          !variables.operatorRequired &&
          variables.values.operatorId !== null
        ) {
          save.mutate({
            values: variables.values,
            operatorRequired: true,
            retried: true,
          });
          return;
        }
        form.setError("operatorId", { message: OPERATOR_REQUIRED_MESSAGE });
        setFormError(null);
        return;
      }
      if (errorCode(error) === "edit_reason_required") {
        form.setError(
          "changeReason",
          { message: EDIT_REASON_REQUIRED_MESSAGE },
          { shouldFocus: true },
        );
        setFormError(null);
        return;
      }
      const fields = errorFields(error);
      let mapped = false;
      for (const [key, messages] of Object.entries(fields)) {
        const target = SERVER_FIELDS[key];
        if (!target) continue;
        // `400 {district}` — nofaol/noma'lum kod (backend #3, #30): server matni inglizcha.
        const message = key === "district" ? DISTRICT_REPICK_MESSAGE : messages[0];
        form.setError(target, { message: message ?? "Noto'g'ri qiymat" });
        mapped = true;
      }
      setFormError(mapped ? null : friendlyError(error));
    },
  });

  const submit = form.handleSubmit((data) => {
    if (reasonRequired && !data.changeReason.trim()) {
      form.setError(
        "changeReason",
        { message: EDIT_REASON_REQUIRED_MESSAGE },
        { shouldFocus: true },
      );
      return;
    }
    if (missingOperator(opened, data, operatorRequired)) {
      form.setError(
        "operatorId",
        { message: OPERATOR_REQUIRED_MESSAGE },
        { shouldFocus: true },
      );
      return;
    }
    setFormError(null);
    save.mutate({ values: data, operatorRequired });
  });

  /** Boshqa joydagi o'zgarishlarni olish — logistning o'z tahriri tashlanadi. */
  const reloadLatest = () => {
    setOpened(latest);
    form.reset(latest);
    setFormError(null);
  };

  return (
    <FormProvider {...form}>
      <form
        noValidate
        autoComplete="off"
        onSubmit={(event) => void submit(event)}
        className="flex h-full min-h-0 flex-col"
      >
        <header className="border-line flex items-center gap-2.5 border-b px-5 py-4">
          <SheetTitle className="text-ink truncate text-lg2 font-bold">
            #{order.orderNumber} ni tahrirlash
          </SheetTitle>
          <SheetDescription className="sr-only">
            Istalgan bosqichda tahrirlash — har o&apos;zgarish tarixga tushadi
          </SheetDescription>
          <StatusTag status={order.status} label={order.statusDisplay} />
          {changedList.length > 0 ? (
            <span className="border-amber-line bg-amber-soft text-gold ml-auto shrink-0 rounded-md border px-2 py-0.5 text-fine font-semibold">
              {changedList.length} maydon o&apos;zgardi
            </span>
          ) : (
            <span className="ml-auto" />
          )}
          <SheetClose asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Yopish"
            >
              <X />
            </Button>
          </SheetClose>
        </header>

        <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-5 py-4">
          {formError ? (
            <p
              role="alert"
              className="bg-warn-soft text-warn flex items-start gap-2 rounded-lg px-3 py-2.5 text-meta"
            >
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              {formError}
            </p>
          ) : null}
          {drift.remote.length > 0 ? (
            <DriftNotice
              remote={drift.remote.map((field) => EDIT_FIELD_LABELS[field])}
              conflicts={drift.conflicts.map(
                (field) => EDIT_FIELD_LABELS[field],
              )}
              onReload={reloadLatest}
            />
          ) : null}
          <ClientFields phones={order.client.phones} changed={changed} />
          <DeliveryFields changed={changed} districtFallbackLabel={order.zoning.districtDisplay} />
          <ItemsEditor changed={changed} locked={locks.amountLocked} />
          {operatorRequired ? (
            <OperatorField
              candidates={candidates}
              highlighted={changed.has("items")}
            />
          ) : null}
          <PaymentFields changed={changed} locked={locks.methodLocked} />
          <LogisticsFields changed={changed} />
          <EditField
            id="edit-reason"
            label={
              reasonRequired
                ? "O'zgarish sababi (majburiy — buyurtma yetkazilgan)"
                : "O'zgarish sababi (tarix uchun)"
            }
            error={form.formState.errors.changeReason?.message}
          >
            <input
              id="edit-reason"
              {...form.register("changeReason")}
              placeholder="masalan: mijoz qo'ng'iroq qilib so'radi"
              className={editInputClass}
            />
          </EditField>
        </div>

        <footer className="border-line bg-canvas flex flex-wrap items-center gap-2 border-t px-5 py-3">
          <span
            className="text-ink-muted mr-auto min-w-0 truncate text-meta"
            aria-live="polite"
          >
            {changedList.length > 0
              ? `O'zgarganlar: ${changedList.map((field) => EDIT_FIELD_LABELS[field]).join(" · ")}`
              : "Hali o'zgarish yo'q"}
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={save.isPending}
          >
            Bekor
          </Button>
          <Button
            type="submit"
            disabled={changedList.length === 0 || save.isPending}
          >
            {save.isPending ? <LoaderCircle className="animate-spin" /> : null}
            Saqlash
          </Button>
        </footer>
      </form>
    </FormProvider>
  );
}

/** Tarkib bilan birga `operator_id` ketgan bo'lsa — kimga (toast uchun). */
function sentOperatorName(
  opened: EditOrderValues,
  variables: SaveVariables,
  candidates: OperatorCandidate[],
): string | null {
  const patch = buildEditPatch(opened, variables.values, {
    operatorRequired: variables.operatorRequired,
  });
  if (patch?.operatorId === undefined) return null;
  const match = candidates.find((item) => item.id === patch.operatorId);
  return match?.name || `#${patch.operatorId}`;
}

/**
 * Forma ochiq turganda buyurtma boshqa joyda o'zgargan. Logist tegmagan
 * maydonlar baribir yuborilmaydi; ikkala tomon o'zgartirgani — alohida
 * ogohlantiriladi (saqlansa logistniki yoziladi).
 */
function DriftNotice({
  remote,
  conflicts,
  onReload,
}: {
  remote: string[];
  conflicts: string[];
  onReload: () => void;
}) {
  return (
    <div
      role="status"
      className="bg-info-soft text-info flex flex-col gap-1.5 rounded-lg px-3 py-2.5 text-meta"
    >
      <p className="flex items-start gap-2">
        <RefreshCw className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          Buyurtma hozirgina boshqa joyda o&apos;zgardi:{" "}
          <b>{remote.join(" · ")}</b>. Siz tegmagan maydonlar yuborilmaydi.
          {conflicts.length > 0 ? (
            <>
              {" "}
              Siz ham o&apos;zgartirgan: <b>{conflicts.join(" · ")}</b> —
              saqlasangiz sizning qiymatingiz yoziladi.
            </>
          ) : null}
        </span>
      </p>
      <button
        type="button"
        onClick={onReload}
        className="text-link hover:text-brand self-start font-semibold"
      >
        Yangi qiymatlarni olish (tahriringiz tashlanadi)
      </button>
    </div>
  );
}
