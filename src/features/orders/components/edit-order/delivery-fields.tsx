"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EditField,
  EditHeading,
  changedClass,
  editInputClass,
  editTextareaClass,
} from "@/features/orders/components/edit-order/edit-field";
import type { EditField as EditFieldKey, EditOrderValues } from "@/features/orders/edit-order";
import { REGIONS, isRegionKey } from "@/features/orders/regions";
import { DELIVERY_WINDOWS } from "@/features/orders/types";
import { DistrictSelect } from "@/features/zones/components/district-select";
import type { DistrictChoice } from "@/features/zones/components/district-select";
import { isActiveDistrictOf } from "@/features/zones/types";
import { useRegionsDictionary } from "@/features/zones/use-zones";
import { cn } from "@/lib/utils";

const NONE = "none";

/**
 * Yetkazish — manzil tuzilmasi CRM bilan bir xil (`delivery-address.ts`):
 * Viloyat → Tuman/shahar → [Tuman nomi, qo'lda] → Qishloq/mahalla →
 * Ko'cha, uy, mo'ljal; so'ng sana + oyna. Viloyat o'zgarsa tuman tozalanadi
 * (tuman viloyatsiz tanlanmaydi — kod viloyat prefiksi bilan).
 */
export function DeliveryFields({
  changed,
  districtFallbackLabel,
}: {
  changed: ReadonlySet<EditFieldKey>;
  /** Buyurtmadagi `district_display` — kod lug'atda topilmasa shu ko'rinadi. */
  districtFallbackLabel: string | null;
}) {
  const { register, control, formState, setValue } = useFormContext<EditOrderValues>();
  const errors = formState.errors;
  const [region, district, districtManual] = useWatch({
    control,
    name: ["region", "district", "districtManual"],
  });
  const dictionary = useRegionsDictionary();

  // Eski buyurtmadagi kod endi faol emas yoki viloyatga mos emas — saqlashni
  // to'smaydi (backend #3: tegilmagan tuman yuborilmaydi), faqat so'raydi.
  const staleDistrict =
    Boolean(district) &&
    !districtManual &&
    dictionary.data !== undefined &&
    !isActiveDistrictOf(dictionary.data, region, district);
  const districtHint = staleDistrict
    ? "Bu tuman ro'yxatda faol emas — tumanni qayta tanlang"
    : region && !district && !districtManual
      ? "Tumanni tanlang — kuryer tezroq biriktiriladi"
      : undefined;

  const setDistrict = (choice: DistrictChoice) => {
    setValue("district", choice.district, { shouldDirty: true, shouldValidate: true });
    setValue("districtManual", choice.manual, { shouldDirty: true });
    if (!choice.manual) setValue("districtManualName", "", { shouldDirty: true, shouldValidate: true });
  };

  return (
    <>
      <EditHeading>Yetkazish</EditHeading>
      <div className="grid gap-3 sm:grid-cols-2">
        <EditField id="edit-region" label="Viloyat" error={errors.region?.message}>
          <Controller
            control={control}
            name="region"
            render={({ field }) => (
              <Select
                value={field.value || NONE}
                onValueChange={(value) => {
                  // Radix bo'sh qiymat bilan chaqirsa (forma reset/autofill) — jimgina tozalanmasin.
                  if (!value) return;
                  const next = value === NONE ? "" : value;
                  if (next === field.value) return;
                  field.onChange(next);
                  setDistrict({ district: "", manual: false });
                }}
              >
                <SelectTrigger id="edit-region" className={cn("h-9 w-full", changedClass(changed.has("region")))}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Ko&apos;rsatilmagan</SelectItem>
                  {/* Backend enumdan tashqari eski qiymat yuborsa ham ko'rinsin. */}
                  {field.value && !isRegionKey(field.value) ? (
                    <SelectItem value={field.value}>{field.value}</SelectItem>
                  ) : null}
                  {REGIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </EditField>

        <EditField
          id="edit-district"
          label="Tuman / shahar"
          error={errors.district?.message}
          hint={districtHint}
        >
          <DistrictSelect
            id="edit-district"
            region={region}
            value={district}
            manual={districtManual}
            onChange={setDistrict}
            fallbackLabel={districtFallbackLabel}
            invalid={Boolean(errors.district)}
            describedBy={
              errors.district ? "edit-district-error" : districtHint ? "edit-district-hint" : undefined
            }
            className={changedClass(changed.has("district"))}
          />
        </EditField>

        {districtManual ? (
          <EditField id="edit-district-name" label="Tuman nomi" error={errors.districtManualName?.message}>
            <input
              id="edit-district-name"
              type="text"
              maxLength={120}
              placeholder="masalan: Yangihayot tumani"
              autoFocus
              {...register("districtManualName")}
              aria-invalid={Boolean(errors.districtManualName)}
              aria-describedby={errors.districtManualName ? "edit-district-name-error" : undefined}
              className={cn(editInputClass, changedClass(changed.has("district")))}
            />
          </EditField>
        ) : null}

        <EditField
          id="edit-locality"
          label="Qishloq / mahalla"
          error={errors.locality?.message}
          className={districtManual ? undefined : "sm:col-span-2"}
        >
          <input
            id="edit-locality"
            type="text"
            maxLength={120}
            placeholder="Ixtiyoriy"
            {...register("locality")}
            aria-invalid={Boolean(errors.locality)}
            aria-describedby={errors.locality ? "edit-locality-error" : undefined}
            className={cn(editInputClass, changedClass(changed.has("locality")))}
          />
        </EditField>

        <EditField
          id="edit-address"
          label="Ko'cha, uy, mo'ljal"
          error={errors.addressText?.message}
          className="sm:col-span-2"
        >
          <textarea
            id="edit-address"
            rows={2}
            {...register("addressText")}
            aria-invalid={Boolean(errors.addressText)}
            aria-describedby={errors.addressText ? "edit-address-error" : undefined}
            className={cn(editTextareaClass, changedClass(changed.has("addressText")))}
          />
        </EditField>

        <EditField id="edit-date" label="Yetkaziladigan sana · oyna" error={errors.deliveryDate?.message}>
          <div className="flex gap-2">
            <input
              id="edit-date"
              type="date"
              {...register("deliveryDate")}
              aria-invalid={Boolean(errors.deliveryDate)}
              className={cn(editInputClass, "tabular min-w-0 flex-1", changedClass(changed.has("deliveryDate")))}
            />
            <Controller
              control={control}
              name="deliveryWindow"
              render={({ field }) => (
                <Select
                  value={field.value || NONE}
                  onValueChange={(value) => {
                    // Radix bo'sh qiymat bilan chaqirsa (forma reset/autofill) — jimgina tozalanmasin.
                    if (value) field.onChange(value === NONE ? "" : value);
                  }}
                >
                  <SelectTrigger
                    aria-label="Yetkazish oynasi"
                    className={cn("h-9 w-32 shrink-0", changedClass(changed.has("deliveryWindow")))}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Oynasiz</SelectItem>
                    {DELIVERY_WINDOWS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </EditField>
      </div>
    </>
  );
}
