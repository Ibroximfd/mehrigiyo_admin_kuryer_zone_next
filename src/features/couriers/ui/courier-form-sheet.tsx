"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { describeError, validationMessage } from "@/shared/i18n/messages";
import { useT } from "@/shared/i18n/locale";
import { isAppError, mapFieldErrors } from "@/shared/lib/app-error";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Field, FieldSet } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { NativeSelect } from "@/shared/ui/native-select";
import { PasswordInput } from "@/shared/ui/password-input";
import { PhoneInput } from "@/shared/ui/phone-input";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/shared/ui/sheet";

import { useCreateCourier, useUpdateCourier } from "../hooks/use-couriers";
import type { Courier } from "../model/courier";
import {
  COURIER_FIELD_ALIASES,
  COURIER_FORM_FIELDS,
  courierFormSchema,
  courierToForm,
  diffCourierPatch,
  emptyCourierForm,
  resolveOneTimePassword,
  toCourierCreatePayload,
  type CourierFormValues,
} from "../model/courier-form";
import { inferCourierRegion, zonesForRegion, type CourierRegionOption, type CourierZoneOption } from "../model/options";
import type { OneTimePassword } from "./one-time-password-dialog";
import { PasswordModeField } from "./password-mode-field";
import { ZoneOrderField } from "./zone-order-field";

const FORM_ID = "courier-form";
const PHONE_TAKEN = "phone_taken";

export type CourierSheetTarget = { mode: "create" } | { mode: "edit"; courier: Courier };

type CourierFormSheetProps = {
  target: CourierSheetTarget | null;
  onClose: () => void;
  zones: readonly CourierZoneOption[];
  regions: readonly CourierRegionOption[];
  defaultRegion: string | null;
  onPassword: (value: OneTimePassword) => void;
};

export function CourierFormSheet({ target, onClose, ...props }: CourierFormSheetProps) {
  const t = useT();
  const courier = target?.mode === "edit" ? target.courier : null;
  return (
    <Sheet open={target !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent closeLabel={t.common.close}>
        <SheetHeader>
          <SheetTitle>{courier ? t.couriers.editTitle : t.couriers.createTitle}</SheetTitle>
          <SheetDescription>{courier ? courier.fullName : t.couriers.description}</SheetDescription>
        </SheetHeader>
        {target ? <CourierForm key={courier?.id ?? "new"} courier={courier} onDone={onClose} {...props} /> : null}
      </SheetContent>
    </Sheet>
  );
}

type CourierFormProps = Omit<CourierFormSheetProps, "target" | "onClose"> & { courier: Courier | null; onDone: () => void };

function CourierForm({ courier, onDone, zones, regions, defaultRegion, onPassword }: CourierFormProps) {
  const t = useT();
  const create = useCreateCourier();
  const update = useUpdateCourier();
  const pending = create.isPending || update.isPending;

  const [region, setRegion] = useState<string | null>(() =>
    courier ? inferCourierRegion(courier, zones) : (defaultRegion ?? regions[0]?.code ?? null),
  );
  const regionZones = useMemo(() => zonesForRegion(zones, region), [zones, region]);

  const form = useForm<CourierFormValues>({
    resolver: zodResolver(courierFormSchema),
    mode: "onBlur",
    defaultValues: courier ? courierToForm(courier) : emptyCourierForm(),
  });
  const { errors } = form.formState;
  const createAccount = useWatch({ control: form.control, name: "createAccount" });
  const passwordMode = useWatch({ control: form.control, name: "passwordMode" });

  const applyServerErrors = (error: unknown) => {
    const mapping = mapFieldErrors(error, COURIER_FORM_FIELDS, COURIER_FIELD_ALIASES);
    for (const { name, message } of mapping.fields) form.setError(name, { type: "server", message });
    // 409 phone_taken — `detail` da kimligi yoziladi; telefon maydoni ostida ko'rsatamiz.
    if (isAppError(error) && error.code === PHONE_TAKEN) {
      form.setError("phone", { type: "server", message: error.detail ?? t.couriers.phoneTaken });
      return;
    }
    const root = [mapping.fields.length > 0 ? null : describeError(error, t), ...mapping.rest].filter(Boolean).join(" ");
    if (root) form.setError("root", { type: "server", message: root });
  };

  const submit = form.handleSubmit(async (values) => {
    if (pending) return;
    try {
      if (!courier) {
        const result = await create.mutateAsync(toCourierCreatePayload(values));
        toast.success(t.couriers.created);
        if (values.createAccount) {
          const password = resolveOneTimePassword(values.passwordMode, values.password, result.password);
          if (password) onPassword({ name: result.courier.fullName, phone: result.courier.phone, password });
          else toast.warning(t.couriers.passwordMissing);
        }
      } else {
        const patch = diffCourierPatch(courier, values);
        if (Object.keys(patch).length === 0) {
          toast.info(t.couriers.noChanges);
          onDone();
          return;
        }
        await update.mutateAsync({ id: courier.id, patch });
        toast.success(t.couriers.updated);
      }
      onDone();
    } catch (error) {
      applyServerErrors(error);
    }
  });

  return (
    <>
      <SheetBody>
        <form id={FORM_ID} onSubmit={submit} noValidate className="flex flex-col gap-5">
          <Field label={t.couriers.fullName} error={validationMessage(t, errors.fullName?.message)}>
            {(control) => (
              <Input {...control} placeholder={t.couriers.fullNamePlaceholder} autoComplete="off" {...form.register("fullName")} />
            )}
          </Field>

          <Field label={t.couriers.phone} error={validationMessage(t, errors.phone?.message)}>
            {(control) => (
              <Controller
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <PhoneInput
                    {...control}
                    ref={field.ref}
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                    autoComplete="off"
                  />
                )}
              />
            )}
          </Field>

          <FieldSet legend={t.couriers.zones} hint={t.couriers.zonesHint} error={validationMessage(t, errors.zoneIds?.message)}>
            <Field label={t.couriers.filterRegion}>
              {(control) => (
                <NativeSelect
                  {...control}
                  value={region ?? ""}
                  onChange={(event) => {
                    setRegion(event.target.value || null);
                    // Kuryer bitta viloyatda ishlaydi — boshqa viloyat zonalari tashlanadi.
                    form.setValue("zoneIds", [], { shouldDirty: true });
                  }}
                >
                  {region ? null : <option value="">{t.regions.placeholder}</option>}
                  {regions.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </Field>
            <Controller
              control={form.control}
              name="zoneIds"
              render={({ field }) => (
                <ZoneOrderField
                  value={field.value}
                  onChange={(ids) => {
                    field.onChange(ids);
                    if (ids.length > 0) form.clearErrors("zoneIds");
                  }}
                  available={regionZones}
                  allZones={zones}
                  invalid={Boolean(errors.zoneIds)}
                  disabled={!region}
                />
              )}
            />
            {region ? null : <p className="text-xs text-ink-faint">{t.couriers.zonesRegionHint}</p>}
          </FieldSet>

          {courier ? null : (
            <FieldSet legend={t.couriers.account}>
              <Controller
                control={form.control}
                name="createAccount"
                render={({ field }) => (
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4">
                    <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} className="mt-0.5" />
                    <span className="space-y-1">
                      <span className="block text-sm font-medium">{t.couriers.createAccount}</span>
                      <span className="block text-xs text-ink-faint">{t.couriers.createAccountHint}</span>
                    </span>
                  </label>
                )}
              />
              {createAccount ? (
                <Controller
                  control={form.control}
                  name="passwordMode"
                  render={({ field }) => (
                    <PasswordModeField
                      mode={field.value}
                      onModeChange={(next) => {
                        field.onChange(next);
                        form.clearErrors("password");
                      }}
                    />
                  )}
                />
              ) : null}
              {createAccount && passwordMode === "manual" ? (
                <Field
                  label={t.couriers.password}
                  hint={t.couriers.passwordManualHint}
                  error={validationMessage(t, errors.password?.message)}
                >
                  {(control) => <PasswordInput {...control} autoComplete="new-password" {...form.register("password")} />}
                </Field>
              ) : null}
            </FieldSet>
          )}

          {errors.root?.message ? (
            <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {errors.root.message}
            </p>
          ) : null}
        </form>
      </SheetBody>
      <SheetFooter>
        <Button variant="outline" onClick={onDone} disabled={pending}>
          {t.common.cancel}
        </Button>
        <Button type="submit" form={FORM_ID} pending={pending}>
          {pending ? t.common.saving : courier ? t.common.save : t.common.create}
        </Button>
      </SheetFooter>
    </>
  );
}
