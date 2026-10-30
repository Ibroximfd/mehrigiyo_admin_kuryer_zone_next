"use client";

import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { queryKeys } from "@/lib/query-keys";

import { fetchSkladCourier } from "../api";
import { skladErrorMessage } from "../error-hints";
import type { SkladMe } from "../types";
import { DocumentDialog, type DocumentKind } from "./document-dialog";

/**
 * Viloyat panelidagi kuryer qatoridan «Berish / Qabul» — kuryerning
 * qoldig'i yuklangach katta oyna ochiladi (sahifadan chiqmasdan).
 */
export function CourierDocumentLauncher({
  courierId,
  kind,
  me,
  defaultLocationId,
  onClose,
}: {
  courierId: number;
  kind: DocumentKind;
  me: SkladMe | null;
  defaultLocationId: number | null;
  onClose: () => void;
}) {
  const detail = useQuery({
    queryKey: queryKeys.skladCourier(courierId),
    queryFn: ({ signal }) => fetchSkladCourier(courierId, signal),
    retry: false,
  });

  if (detail.isError) {
    return (
      <Dialog open onOpenChange={(next) => !next && onClose()}>
        <DialogContent className="w-[24rem] max-w-[calc(100vw-2rem)]">
          <DialogTitle>Kuryerni ochib bo&apos;lmadi</DialogTitle>
          <DialogDescription className="text-danger">
            {skladErrorMessage(detail.error, "Kuryerni yuklashda xatolik")}
          </DialogDescription>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Yopish
            </Button>
            <Button onClick={() => void detail.refetch()}>Qayta urinish</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  if (!detail.data) {
    return (
      <Dialog open onOpenChange={(next) => !next && onClose()}>
        <DialogContent className="w-[20rem] max-w-[calc(100vw-2rem)]">
          <DialogTitle className="flex items-center gap-2">
            <LoaderCircle className="text-brand size-4 animate-spin" />
            Kuryer ombori yuklanmoqda
          </DialogTitle>
          <DialogDescription>Bir soniya…</DialogDescription>
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <DocumentDialog
      kind={kind}
      kinds={["courier_load", "courier_return", "adjustment"]}
      me={me}
      open
      onOpenChange={(open) => !open && onClose()}
      courier={detail.data.courier}
      region={detail.data.courier.region}
      defaultLocationId={defaultLocationId}
    />
  );
}
