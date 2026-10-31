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
import { errorCode, errorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useLocaleStore } from "@/stores/locale-store";

/** Backend javobi xato kodini tushunarli matnga (404 — endpoint hali yo'q). */
function actionError(error: unknown, fallback: string): string {
  const code = errorCode(error);
  if (code === "endpoint_missing") return "Bu amal backendda hali yo'q — backend kutilmoqda";
  if (code === "zone_other_region") return "Tuman o'z viloyatlaringizdan bo'lishi kerak";
  return errorMessage(error, fallback);
}

/**
 * «Manzilni tuzatish» (`25_MANZIL_OZGARISHI` §1, §3): faqat o'z viloyatlari
 * ichida — tuman, ko'cha, mo'ljal va sabab. Boshqa viloyat bo'lsa — logistga
 * qaytariladi (u yerda viloyatni zakaz egasi hal qiladi).
 */
export function AddressFixDialog({
  order,
  regions,
  onClose,
}: {
  order: LogistOrder;
  /** Bosh kuryer viloyatlari (`chief/me`). */
  regions: string[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const locale = useLocaleStore((state) => state.locale);
  const dictionary = useRegionsDictionary();
  const initialRegion = regions.includes(order.deliveryInfo?.region ?? "") ? (order.deliveryInfo?.region ?? "") : (regions[0] ?? "");
  const [region, setRegion] = useState(initialRegion);
  const [district, setDistrict] = useState(order.zoning.district ?? "");
  const [addressText, setAddressText] = useState(order.deliveryInfo?.address ?? "");
  const [landmark, setLandmark] = useState("");
  const [reason, setReason] = useState<AddressFixReason | "">("");
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);

  const districts = (dictionary.data ?? []).find((item) => item.region === region)?.districts.filter((item) => item.isActive) ?? [];
  const errors = {
    district: district && districts.some((item) => item.code === district) ? null : "Tumanni tanlang",
    reason: reason ? null : "Sababni tanlang",
    note: reason === "other" && !note.trim() ? "«Boshqa sabab» uchun izoh yozing" : null,
  };
  const valid = !errors.district && !errors.reason && !errors.note;

  const save = useMutation({
    mutationFn: () =>
      fixChiefOrderAddress(order.id, { district, addressText, landmark, reason: reason as AddressFixReason, note }),
    onSuccess: () => {
      toast.success(`${order.orderNumber} — manzil tuzatildi`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.chief });
      onClose();
    },
    onError: (error) => toast.error(actionError(error, "Manzilni saqlashda xatolik")),
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
            {regions.length > 1 ? (
              <Field label="Viloyat" htmlFor="fix-region">
                <Select
                  value={region}
                  onValueChange={(next) => {
                    setRegion(next);
                    setDistrict("");
                  }}
                >
                  <SelectTrigger id="fix-region" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((code) => (
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
              className={regions.length > 1 ? "" : "sm:col-span-2"}
              error={touched ? (errors.district ?? undefined) : undefined}
            >
              <Select value={district} onValueChange={setDistrict}>
                <SelectTrigger id="fix-district" className="w-full" aria-invalid={touched && Boolean(errors.district)}>
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
            <Field label="Ko'cha, uy" htmlFor="fix-address" className="sm:col-span-2">
              <input
                id="fix-address"
                value={addressText}
                maxLength={255}
                onChange={(event) => setAddressText(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Mo'ljal" htmlFor="fix-landmark" hint="Ixtiyoriy — kuryerga yo'l ko'rsatadi" className="sm:col-span-2">
              <input
                id="fix-landmark"
                value={landmark}
                maxLength={255}
                onChange={(event) => setLandmark(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Sabab" htmlFor="fix-reason" error={touched ? (errors.reason ?? undefined) : undefined}>
              <Select value={reason} onValueChange={(next) => setReason(ADDRESS_FIX_REASONS.find((item) => item === next) ?? "")}>
                <SelectTrigger id="fix-reason" className="w-full" aria-invalid={touched && Boolean(errors.reason)}>
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
            <Field label="Izoh" htmlFor="fix-note" error={touched ? (errors.note ?? undefined) : undefined}>
              <input
                id="fix-note"
                value={note}
                maxLength={255}
                aria-invalid={touched && Boolean(errors.note)}
                onChange={(event) => setNote(event.target.value)}
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
  const valid = reason !== "" && (reason !== "other" || note.trim().length > 0);

  const send = useMutation({
    mutationFn: () => returnChiefOrder(order.id, { reason: reason as ReturnReason, note }),
    onSuccess: () => {
      toast.success(`${order.orderNumber} — logistga qaytarildi`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.chief });
      onReturned();
    },
    onError: (error) => toast.error(actionError(error, "Logistga qaytarishda xatolik")),
  });

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault();
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
                  <input type="radio" name="return-reason" checked={reason === item} onChange={() => setReason(item)} className="accent-brand" />
                  {RETURN_REASON_LABELS[item]}
                </label>
              ))}
            </div>
          </fieldset>
          <Field
            label="Izoh"
            htmlFor="return-note"
            className="mt-3"
            hint={reason === "other" ? "«Boshqa sabab» uchun izoh majburiy" : "Ixtiyoriy — logist ko'radi"}
          >
            <textarea
              id="return-note"
              rows={2}
              value={note}
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
              className={cn(inputClass, "h-auto py-2")}
            />
          </Field>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Bekor qilish
            </Button>
            <Button type="submit" variant="destructive" disabled={!valid || send.isPending}>
              {send.isPending ? <LoaderCircle className="animate-spin" /> : <Undo2 />}
              Logistga qaytarish
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
