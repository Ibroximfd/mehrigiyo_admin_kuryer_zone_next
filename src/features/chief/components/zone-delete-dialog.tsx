"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, PackageX, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { deleteChiefZone } from "@/features/chief/api";
import type { Zone } from "@/features/zones/types";
import { errorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import { shortOrderNumber } from "../order-view";
import { isZoneGone, zoneBusyOf } from "../zone-stats";

/**
 * Zonani o'chirish (71-javob §2). Zonada faol zakaz bo'lsa server rad etadi —
 * oyna yopilmaydi, nima qilish kerakligini shu yerda aytadi. Zona yumshoq
 * o'chadi: tumanlari zonasiz bo'ladi, eski zakaz va hisobotlar nomini saqlaydi.
 */
export function ZoneDeleteDialog({
  zone,
  couriers,
  onClose,
}: {
  zone: Zone | null;
  /** Shu zonadagi faol kuryerlar — o'chirilgach zonasiz qoladi. */
  couriers: number;
  onClose: () => void;
}) {
  return (
    <Dialog open={zone !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        {zone ? <Body key={zone.id} zone={zone} couriers={couriers} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function Body({ zone, couriers, onClose }: { zone: Zone; couriers: number; onClose: () => void }) {
  const queryClient = useQueryClient();
  const done = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.chief });
    onClose();
  };
  const remove = useMutation({
    mutationFn: () => deleteChiefZone(zone.id),
    onSuccess: () => {
      toast.success(`${zone.name} o'chirildi`);
      done();
    },
    onError: (error) => {
      if (zoneBusyOf(error)) return;
      if (isZoneGone(error)) {
        // Ikkinchi bosish yoki boshqa oynada o'chirilgan — natija bir xil.
        toast.info(`${zone.name} allaqachon o'chirilgan`);
        done();
        return;
      }
      toast.error(errorMessage(error, "Zonani o'chirishda xatolik"));
    },
  });
  const busy = zoneBusyOf(remove.error);

  return (
    <div>
      <div className="flex gap-3">
        <span className="bg-danger-soft h-fit rounded-xl p-2.5">
          <Trash2 className="text-danger size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <DialogTitle>{`«${zone.name}» o'chirilsinmi?`}</DialogTitle>
          <DialogDescription className="mt-1">
            {`${zone.districtCodes.length} ta tuman zonasiz qoladi`}
            {couriers > 0 ? ` · ${couriers} kuryer zonasiz qoladi` : ""}
          </DialogDescription>
        </div>
      </div>

      {busy ? (
        <div role="alert" className="bg-warn-soft mt-4 rounded-xl p-3.5">
          <p className="text-warn flex items-center gap-2 text-dense font-semibold">
            <PackageX className="size-4 shrink-0" aria-hidden />
            {`Zonada ${busy.count} ta faol zakaz bor`}
          </p>
          <p className="text-ink-muted mt-1 text-meta">
            Avval ularni bo&apos;shating — yetkazing yoki boshqa zonaga o&apos;tkazing, keyin o&apos;chiring.
          </p>
          {busy.numbers.length > 0 ? (
            <p className="text-ink tabular mt-2 text-meta" data-no-translit>
              {busy.numbers.map((number) => `#${shortOrderNumber(number)}`).join(", ")}
              {busy.count > busy.numbers.length ? " …" : ""}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-ink-muted mt-4 flex items-start gap-2 text-meta">
          <TriangleAlert className="text-warn mt-0.5 size-3.5 shrink-0" aria-hidden />
          Zonada faol zakaz bo&apos;lsa o&apos;chirilmaydi. Yakunlangan zakazlar va hisobotlarga tegilmaydi.
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={remove.isPending}>
          {busy ? "Yopish" : "Bekor qilish"}
        </Button>
        {busy ? null : (
          <Button variant="destructive" onClick={() => remove.mutate()} disabled={remove.isPending}>
            {remove.isPending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
            O&apos;chirish
          </Button>
        )}
      </div>
    </div>
  );
}
