"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, MapPinned, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Field, inputClass } from "@/components/kit/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fixChiefOrderAddress, returnChiefOrder } from "@/features/chief/api";
import { dropOrder, storeOrderDetail } from "@/features/chief/order-cache";
import {
  ADDRESS_FIX_FIELDS,
  RETURN_FIELDS,
  addressFixErrors,
  chiefActionFailure,
  courierWasUnassigned,
  hasErrors,
  returnErrors,
} from "@/features/chief/order-action-rules";
import type { AddressFixField, FieldErrors, ReturnField } from "@/features/chief/order-action-rules";
import {
  ADDRESS_FIX_REASONS,
  ADDRESS_FIX_REASON_LABELS,
  RETURN_REASONS,
  RETURN_REASON_LABELS,
} from "@/features/chief/types";
import type { AddressFixReason, ReturnReason } from "@/features/chief/types";
import { regionLabel } from "@/features/orders/regions";
import type { LogistOrder } from "@/features/orders/types";
import { districtName } from "@/features/zones/types";
import { useRegionsDictionary } from "@/features/zones/use-zones";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useLocaleStore } from "@/stores/locale-store";

/**
 * «Manzilni tuzatish» (`25_MANZIL_OZGARISHI` §1, §3): faqat o'z viloyatlari
 * ichida — tuman (u viloyatni belgilaydi), ko'cha, mo'ljal va sabab. Boshqa
 * viloyat bo'lsa — logistga qaytariladi (viloyatni zakaz egasi hal qiladi).
 */
export function AddressFixDialog({
  order,
  regions,
  onClose,
}: {
  order: LogistOrder;
  /** Bosh kuryer viloyatlari (`chief/me`); bo'sh — hamma viloyat (`scope=all`). */
  regions: string[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const locale = useLocaleStore((state) => state.locale);
  const dictionary = useRegionsDictionary();
  const regionOptions = regions.length > 0 ? regions : (dictionary.data ?? []).map((item) => item.region);
  const orderRegion = order.deliveryInfo?.region ?? "";
  const initialRegion = regions.length === 0 || regions.includes(orderRegion) ? orderRegion : (regions[0] ?? "");
  const [region, setRegion] = useState(initialRegion);
  const [district, setDistrict] = useState(initialRegion === orderRegion ? (order.zoning.district ?? "") : "");
  const [addressText, setAddressText] = useState(order.deliveryInfo?.address ?? "");
  const [landmark, setLandmark] = useState(order.deliveryInfo?.landmark ?? "");
  const [reason, setReason] = useState<AddressFixReason | "">("");
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors<AddressFixField>>({});

  const districts = (dictionary.data ?? []).find((item) => item.region === region)?.districts.filter((item) => item.isActive) ?? [];
  const formErrors = addressFixErrors(
    { district, reason, note },
    districts.map((item) => item.code),
  );
  const valid = !hasErrors(formErrors);
  const errorOf = (field: AddressFixField) => (touched ? formErrors[field] : undefined) ?? serverErrors[field];
  const edit = <T,>(field: AddressFixField, set: (value: T) => void) => (value: T) => {
    set(value);
    setServerErrors((current) => ({ ...current, [field]: undefined }));
  };

  const save = useMutation({
    mutationFn: () =>
      fixChiefOrderAddress(order.id, { district, addressText, landmark, reason: reason as AddressFixReason, note }),
    onSuccess: (detail) => {
      storeOrderDetail(queryClient, detail);
      toast.success(`${order.orderNumber} — manzil tuzatildi`);
      if (courierWasUnassigned(order, detail.order)) {
        toast.info("Kuryer yangi zonada emas — zakazdan olindi va «Kelganlar» ga qaytdi");
      }
      onClose();
    },
    onError: (error) => {
      const failure = chiefActionFailure(error, ADDRESS_FIX_FIELDS, "Manzilni saqlashda xatolik");
      setServerErrors(failure.kind === "foreign_region" ? { district: failure.message } : failure.fields);
      toast.error(failure.message);
      if (failure.kind === "closed" || failure.kind === "gone") {
        if (failure.kind === "gone") dropOrder(queryClient, order.id);
        else void queryClient.invalidateQueries({ queryKey: queryKeys.chief });
        onClose();
      }
    },
  });

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setTouched(true);
            if (valid && !save.isPending) save.mutate();
          }}
        >
          <DialogTitle className="flex items-center gap-2">
            <MapPinned className="text-brand size-4" aria-hidden />
            Manzilni tuzatish
          </DialogTitle>
          <DialogDescription>
            <span data-no-translit>{order.orderNumber}</span>
            {" · faqat o'z viloyatlaringiz ichida. Boshqa viloyat bo'lsa — logistga qaytaring."}
          </DialogDescription>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {regionOptions.length > 1 ? (
              <Field label="Viloyat" htmlFor="fix-region" hint="Tuman tanlansa zakaz viloyati ham shunga o'tadi">
                <Select
                  value={region}
                  onValueChange={(next) => {
                    setRegion(next);
                    edit("district", setDistrict)("");
                  }}
                >
                  <SelectTrigger id="fix-region" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {regionOptions.map((code) => (
                      <SelectItem key={code} value={code}>
                        {regionLabel(code)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
            <Field
              label="Tuman yoki shahar"
              htmlFor="fix-district"
              className={regionOptions.length > 1 ? "" : "sm:col-span-2"}
              error={errorOf("district")}
            >
              <Select value={district} onValueChange={edit("district", setDistrict)}>
                <SelectTrigger id="fix-district" className="w-full" aria-invalid={Boolean(errorOf("district"))}>
                  <SelectValue placeholder={dictionary.isPending ? "Yuklanmoqda…" : "Tanlang"} />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((item) => (
                    <SelectItem key={item.code} value={item.code}>
                      <span data-no-translit>{districtName(item, locale)}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Ko'cha, uy" htmlFor="fix-address" className="sm:col-span-2" error={errorOf("address_text")}>
              <input
                id="fix-address"
                value={addressText}
                maxLength={255}
                aria-invalid={Boolean(errorOf("address_text"))}
                onChange={(event) => edit("address_text", setAddressText)(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field
              label="Mo'ljal"
              htmlFor="fix-landmark"
              hint="Ixtiyoriy — kuryerga yo'l ko'rsatadi"
              className="sm:col-span-2"
              error={errorOf("landmark")}
            >
              <input
                id="fix-landmark"
                value={landmark}
                maxLength={255}
                aria-invalid={Boolean(errorOf("landmark"))}
                onChange={(event) => edit("landmark", setLandmark)(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Sabab" htmlFor="fix-reason" error={errorOf("reason")}>
              <Select
                value={reason}
                onValueChange={(next) => edit("reason", setReason)(ADDRESS_FIX_REASONS.find((item) => item === next) ?? "")}
              >
                <SelectTrigger id="fix-reason" className="w-full" aria-invalid={Boolean(errorOf("reason"))}>
                  <SelectValue placeholder="Tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {ADDRESS_FIX_REASONS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {ADDRESS_FIX_REASON_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Izoh" htmlFor="fix-note" error={errorOf("note")}>
              <input
                id="fix-note"
                value={note}
                maxLength={255}
                aria-invalid={Boolean(errorOf("note"))}
                onChange={(event) => edit("note", setNote)(event.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={save.isPending || (touched && !valid)}>
              {save.isPending ? <LoaderCircle className="animate-spin" /> : null}
              Saqlash
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * «Logistga qaytarish» (§1, §4): bosh kuryer va kuryer olinadi, zakaz
 * logistning taqsimlash ro'yxatiga qaytadi. Qaytarib bo'lmaydigan amal —
 * oynaning o'zi tasdiq.
 */
export function ReturnDialog({ order, onClose, onReturned }: { order: LogistOrder; onClose: () => void; onReturned: () => void }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<ReturnReason | "">("");
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors<ReturnField>>({});
  const formErrors = returnErrors({ reason, note });
  const valid = !hasErrors(formErrors);
  const errorOf = (field: ReturnField) => (touched ? formErrors[field] : undefined) ?? serverErrors[field];

  const leave = () => {
    // Avval detal yopiladi (so'rov kuzatuvchisiz qoladi), keyin kesh tozalanadi — `404` qayta so'ralmaydi.
    onReturned();
    dropOrder(queryClient, order.id);
  };

  const send = useMutation({
    mutationFn: () => returnChiefOrder(order.id, { reason: reason as ReturnReason, note }),
    onSuccess: () => {
      toast.success(`${order.orderNumber} — logistga qaytarildi`);
      leave();
    },
    onError: (error) => {
      const failure = chiefActionFailure(error, RETURN_FIELDS, "Logistga qaytarishda xatolik");
      setServerErrors(failure.fields);
      toast.error(failure.message);
      if (failure.kind === "gone") leave();
      if (failure.kind === "closed") {
        void queryClient.invalidateQueries({ queryKey: queryKeys.chief });
        onClose();
      }
    },
  });

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setTouched(true);
            if (valid && !send.isPending) send.mutate();
          }}
        >
          <DialogTitle>Logistga qaytarish</DialogTitle>
          <DialogDescription>
            <span data-no-translit>{order.orderNumber}</span>
            {" · zakaz sizdan va kuryerdan olinadi, logist qayta taqsimlaydi."}
          </DialogDescription>
          <fieldset className="mt-4">
            <legend className="text-ink mb-2 text-dense font-medium">Sabab</legend>
            <div className="flex flex-col gap-1.5">
              {RETURN_REASONS.map((item) => (
                <label
                  key={item}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-dense",
                    reason === item ? "border-brand bg-brand-soft text-ink" : "border-line text-ink-muted hover:bg-subtle",
                  )}
                >
                  <input
                    type="radio"
                    name="return-reason"
                    checked={reason === item}
                    onChange={() => {
                      setReason(item);
                      setServerErrors({});
                    }}
                    className="accent-brand"
                  />
                  {RETURN_REASON_LABELS[item]}
                </label>
              ))}
            </div>
            {errorOf("reason") ? (
              <p role="alert" className="text-danger text-meta mt-1.5 font-medium">
                {errorOf("reason")}
              </p>
            ) : null}
          </fieldset>
          <Field
            label="Izoh"
            htmlFor="return-note"
            className="mt-3"
            error={errorOf("note")}
            hint={reason === "other" ? "«Boshqa sabab» uchun izoh majburiy" : "Ixtiyoriy — logist ko'radi"}
          >
            <textarea
              id="return-note"
              rows={2}
              value={note}
              maxLength={500}
              required={reason === "other"}
              aria-invalid={Boolean(errorOf("note"))}
              onChange={(event) => {
                setNote(event.target.value);
                setServerErrors((current) => ({ ...current, note: undefined }));
              }}
              className={cn(inputClass, "h-auto py-2")}
            />
          </Field>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Bekor qilish
            </Button>
            <Button type="submit" variant="destructive" disabled={send.isPending || (touched && !valid)}>
              {send.isPending ? <LoaderCircle className="animate-spin" /> : <Undo2 />}
              Logistga qaytarish
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
