"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { describeError, validationMessage } from "@/shared/i18n/messages";
import { useT } from "@/shared/i18n/locale";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Field, FieldSet } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/shared/ui/sheet";
import { InlineError } from "@/shared/ui/states";
import { Switch } from "@/shared/ui/switch";

import { useCreateZone, useFilials, useUpdateZone } from "../hooks/use-zones";
import { districtLabel, humanizeDistrictCodes, type DistrictOption } from "../model/district-groups";
import { groupFilialOptions } from "../model/filial";
import type { Zone } from "../model/zone";
import {
  diffZonePatch,
  emptyZoneForm,
  isEmptyPatch,
  mapZoneServerErrors,
  toZoneCreatePayload,
  zoneFormSchema,
  zoneToForm,
  type ZoneFormValues,
} from "../model/zone-form";
import { CashUserPicker } from "./cash-user-picker";
import { DistrictPicker } from "./district-picker";
import { FilialSelect } from "./filial-select";
import { NeighborPicker } from "./neighbor-picker";

const FORM_ID = "zone-form";

export type ZoneSheetTarget = { mode: "create" } | { mode: "edit"; zone: Zone };

type ZoneFormSheetProps = {
  target: ZoneSheetTarget | null;
  onClose: () => void;
  region: string;
  regionName: string;
  regionZones: readonly Zone[];
  districtOptions: readonly DistrictOption[];
  districtNames: ReadonlyMap<string, string>;
  onSaved: () => void;
};

export function ZoneFormSheet({ target, onClose, ...props }: ZoneFormSheetProps) {
  const t = useT();
  const zone = target?.mode === "edit" ? target.zone : null;
  return (
    <Sheet open={target !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent closeLabel={t.common.close}>
        <SheetHeader>
          <SheetTitle>{zone ? t.zones.editTitle : t.zones.createTitle}</SheetTitle>
          <SheetDescription>{zone ? `${zone.name} · ${props.regionName}` : t.zones.formDescription(props.regionName)}</SheetDescription>
        </SheetHeader>
        {target ? <ZoneForm key={zone?.id ?? "new"} zone={zone} onDone={onClose} {...props} /> : null}
      </SheetContent>
    </Sheet>
  );
}

type ZoneFormProps = Omit<ZoneFormSheetProps, "target" | "onClose"> & { zone: Zone | null; onDone: () => void };

function ZoneForm({ zone, onDone, region, regionZones, districtOptions, districtNames, onSaved }: ZoneFormProps) {
  const t = useT();
  const create = useCreateZone(onSaved);
  const update = useUpdateZone(onSaved);
  const filials = useFilials();
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const form = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneFormSchema),
    mode: "onBlur",
    defaultValues: zone ? zoneToForm(zone) : emptyZoneForm(),
  });
  const { errors } = form.formState;
  const cashPointKind = useWatch({ control: form.control, name: "cashPointKind" });
  const pending = create.isPending || update.isPending;

  const filialGroups = useMemo(() => {
    const point = zone?.cashPoint;
    const current = point?.kind === "filial" && point.filialId !== null ? { id: point.filialId, name: point.name } : null;
    return groupFilialOptions(filials.data ?? [], region, current);
  }, [filials.data, region, zone]);
  const zoneNames = useMemo(() => new Map(regionZones.map((item) => [item.id, item.name])), [regionZones]);
  const neighborCandidates = useMemo(
    () => regionZones.filter((item) => item.id !== zone?.id && (item.isActive || zone?.neighborZoneIds.includes(item.id))),
    [regionZones, zone],
  );

  const applyServerErrors = (error: unknown) => {
    const mapping = mapZoneServerErrors(error);
    for (const { name, message } of mapping.fields) {
      const text = name === "districtCodes" ? humanizeDistrictCodes(message, districtNames) : message;
      form.setError(name, { type: "server", message: text });
    }
    const conflict = mapping.districtConflict;
    if (conflict) {
      // 409: tuman nomi bizning ma'lumotnomadan, zona nomi shu viloyat zonalaridan
      // (tuman zonasi viloyatdan chiqmaydi); topilmasa server `detail` i.
      const district = conflict.districtCode ? districtLabel(districtNames, conflict.districtCode) : "—";
      const zoneName = (conflict.zoneId !== null ? zoneNames.get(conflict.zoneId) : undefined) ?? conflict.detail ?? `#${conflict.zoneId ?? "?"}`;
      form.setError("districtCodes", { type: "server", message: t.zones.districtConflict(district, zoneName) });
    }
    if (mapping.cashPointMissing) {
      form.setError(form.getValues("cashPointKind") === "filial" ? "filialId" : "person", {
        type: "server",
        message: "cashPointRequired",
      });
    }
    const handled = mapping.fields.length > 0 || conflict !== null || mapping.cashPointMissing;
    const root = [handled ? null : describeError(error, t), ...mapping.rest].filter(Boolean).join(" ");
    if (root) form.setError("root", { type: "server", message: root });
  };

  const submit = form.handleSubmit(async (values) => {
    if (pending) return;
    try {
      if (!zone) {
        await create.mutateAsync(toZoneCreatePayload(region, values));
        toast.success(t.zones.created);
      } else {
        const patch = diffZonePatch(zone, values);
        if (isEmptyPatch(patch)) {
          toast.info(t.zones.noChanges);
          onDone();
          return;
        }
        await update.mutateAsync({ id: zone.id, patch });
        toast.success(t.zones.updated);
      }
      onDone();
    } catch (error) {
      applyServerErrors(error);
    }
  });

  return (
    <>
      <SheetBody>
        <form id={FORM_ID} onSubmit={submit} noValidate className="flex flex-col gap-6">
          <Field label={t.zones.name} error={validationMessage(t, errors.name?.message)}>
            {(control) => <Input {...control} placeholder={t.zones.namePlaceholder} autoComplete="off" {...form.register("name")} />}
          </Field>

          <FieldSet
            legend={t.zones.districts}
            hint={t.zones.districtsHint}
            error={errors.districtCodes?.message}
          >
            <Controller
              control={form.control}
              name="districtCodes"
              render={({ field }) => (
                <DistrictPicker
                  options={districtOptions}
                  editingZoneId={zone?.id ?? null}
                  zoneNames={zoneNames}
                  value={field.value}
                  onChange={field.onChange}
                  invalid={Boolean(errors.districtCodes)}
                />
              )}
            />
          </FieldSet>

          <FieldSet legend={t.zones.cashPoint} hint={t.zones.cashPointHint}>
            <Controller
              control={form.control}
              name="cashPointKind"
              render={({ field }) => (
                <SegmentedControl
                  label={t.zones.cashPoint}
                  value={field.value}
                  onValueChange={field.onChange}
                  options={[
                    { value: "filial", label: t.zones.cashFilial },
                    { value: "person", label: t.zones.cashPerson },
                  ]}
                />
              )}
            />
            {cashPointKind === "filial" ? (
              <Field label={t.zones.filial} error={validationMessage(t, errors.filialId?.message)}>
                {(control) =>
                  filials.isError ? (
                    <InlineError error={filials.error} onRetry={() => void filials.refetch()} />
                  ) : (
                    <Controller
                      control={form.control}
                      name="filialId"
                      render={({ field }) => (
                        <FilialSelect
                          {...control}
                          ref={field.ref}
                          groups={filialGroups}
                          isLoading={filials.isPending}
                          value={field.value}
                          onValueChange={field.onChange}
                          onBlur={field.onBlur}
                        />
                      )}
                    />
                  )
                }
              </Field>
            ) : (
              <FieldSet legend={t.zones.person} hint={t.zones.personHint} error={validationMessage(t, errors.person?.message)}>
                <Controller
                  control={form.control}
                  name="person"
                  render={({ field }) => (
                    <CashUserPicker
                      value={field.value}
                      onChange={(next) => {
                        field.onChange(next);
                        form.clearErrors("person");
                      }}
                      invalid={Boolean(errors.person)}
                    />
                  )}
                />
              </FieldSet>
            )}
          </FieldSet>

          <FieldSet legend={t.zones.neighbors} hint={t.zones.neighborsHint} error={errors.neighborZoneIds?.message}>
            <Controller
              control={form.control}
              name="neighborZoneIds"
              render={({ field }) => <NeighborPicker zones={neighborCandidates} value={field.value} onChange={field.onChange} />}
            />
          </FieldSet>

          {zone ? (
            <Controller
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-line p-4">
                  <span className="space-y-1">
                    <span className="block text-sm font-medium">{t.zones.isActive}</span>
                    <span className="block text-xs text-ink-faint">{t.zones.isActiveHint}</span>
                  </span>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(next) => (next ? field.onChange(true) : setConfirmDeactivate(true))}
                  />
                </label>
              )}
            />
          ) : null}

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
          {pending ? t.common.saving : zone ? t.common.save : t.common.create}
        </Button>
      </SheetFooter>

      <ConfirmDialog
        open={confirmDeactivate}
        onOpenChange={setConfirmDeactivate}
        title={t.zones.deactivateTitle(zone?.name ?? "")}
        description={t.zones.deactivateText}
        confirmLabel={t.zones.deactivateConfirm}
        onConfirm={() => {
          form.setValue("isActive", false, { shouldDirty: true });
          setConfirmDeactivate(false);
        }}
      />
    </>
  );
}
