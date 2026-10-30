"use client";

import { Camera, MapPin, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { MediaLightbox } from "@/components/kit/media-lightbox";
import {
  DetailField,
  DetailSection,
  EMPTY_VALUE,
} from "@/features/orders/components/order-detail/section";
import {
  anomalyLabel,
  anomalyTone,
  deliveryStageLabel,
  isCourierWorking,
  paymentKindLabel,
  proofMapLink,
} from "@/features/orders/delivery-proof";
import type {
  DeliveryProof,
  DeliveryStage,
  ProofPhoto,
} from "@/features/orders/delivery-proof";
import type { LogistOrder } from "@/features/orders/types";
import { formatShortDateTime, formatSom } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Manzildan shuncha metrdan uzoq yopilsa ajratib ko'rsatiladi (backend bilan bir xil). */
const FAR_FROM_ADDRESS_M = 300;

/**
 * Kuryer ilovasidan kelgan ma'lumot: bosqich, marshrutdagi o'rni va
 * yetkazish isboti — rasmlar, GPS nuqtasi, olingan summa, anomaliyalar.
 * Kuryer biriktirilmagan va isbot yo'q bo'lsa bo'lim chiqmaydi.
 */
export function CourierProofSection({ order }: { order: LogistOrder }) {
  const stage = order.deliveryStage;
  const proof = order.deliveryProof;
  if (!order.courier && !proof && !stage) return null;

  return (
    <DetailSection
      title="Kuryer ilovasi"
      aside={
        order.routePosition !== null ? (
          <span className="tabular">
            {`Marshrutda ${order.routePosition}-nuqta`}
          </span>
        ) : null
      }
    >
      <div className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
        <DetailField label="Bosqich">
          {stage ? <StageChip stage={stage} /> : EMPTY_VALUE}
        </DetailField>
        {proof ? (
          <DetailField label="Yetkazilgan">
            {proof.deliveredAt ? (
              <span className="tabular">
                {formatShortDateTime(proof.deliveredAt)}
              </span>
            ) : (
              EMPTY_VALUE
            )}
          </DetailField>
        ) : null}
      </div>

      {proof ? <ProofDetails proof={proof} /> : null}
    </DetailSection>
  );
}

function StageChip({ stage }: { stage: DeliveryStage }) {
  const tone =
    stage === "delivered"
      ? "bg-ok-soft text-ok"
      : stage === "failed_attempt"
        ? "bg-danger-soft text-danger"
        : isCourierWorking(stage)
          ? "bg-brand-soft text-brand"
          : "bg-subtle text-ink-muted";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-meta font-semibold",
        tone,
      )}
    >
      {deliveryStageLabel(stage)}
    </span>
  );
}

function ProofDetails({ proof }: { proof: DeliveryProof }) {
  const mapLink = proofMapLink(proof);
  const amount =
    proof.receivedAmountDisplay ??
    (proof.receivedAmount !== null ? formatSom(proof.receivedAmount) : null);
  const far =
    proof.distanceToAddressM !== null &&
    proof.distanceToAddressM > FAR_FROM_ADDRESS_M;

  return (
    <>
      {proof.anomalyFlags.length > 0 ? (
        <ul
          aria-label="Anomaliyalar"
          className="bg-warn-soft flex flex-wrap gap-1.5 rounded-lg px-3 py-2"
        >
          {proof.anomalyFlags.map((flag) => (
            <li
              key={flag}
              className={cn(
                "flex items-center gap-1 text-meta font-semibold",
                anomalyTone(flag) === "danger" ? "text-danger" : "text-warn",
              )}
            >
              <TriangleAlert className="size-3.5" aria-hidden />
              {anomalyLabel(flag)}
            </li>
          ))}
        </ul>
      ) : null}

      <ProofPhotos photos={proof.photos} />

      <div className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
        <DetailField label="Olingan summa">
          {amount ? (
            <span className="tabular font-semibold">
              {amount}
              {paymentKindLabel(proof.paymentKind) ? (
                <span className="text-ink-muted font-normal">
                  {" · "}
                  {paymentKindLabel(proof.paymentKind)}
                </span>
              ) : null}
            </span>
          ) : (
            (paymentKindLabel(proof.paymentKind) ?? EMPTY_VALUE)
          )}
        </DetailField>
        <DetailField label="Joylashuv">
          {mapLink ? (
            <a
              href={mapLink}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "inline-flex items-center gap-1 hover:underline",
                far ? "text-warn font-semibold" : "text-link",
              )}
            >
              <MapPin className="size-3.5" aria-hidden />
              {proof.distanceToAddressM !== null
                ? `Manzildan ${proof.distanceToAddressM} m`
                : "Xaritada ochish"}
            </a>
          ) : (
            <span className="text-warn">GPS yo&apos;q</span>
          )}
        </DetailField>
        {proof.timeDriftS !== null && proof.timeDriftS > 0 ? (
          <DetailField label="Telefon soati farqi">
            <span className="tabular">{proof.timeDriftS} soniya</span>
          </DetailField>
        ) : null}
        {proof.note ? (
          <DetailField label="Kuryer izohi" className="sm:col-span-2">
            <span data-no-translit>{proof.note}</span>
          </DetailField>
        ) : null}
      </div>
    </>
  );
}

function ProofPhotos({ photos }: { photos: ProofPhoto[] }) {
  const [open, setOpen] = useState<ProofPhoto | null>(null);
  if (photos.length === 0) {
    return (
      <p className="text-danger flex items-center gap-1.5 text-meta font-medium">
        <Camera className="size-3.5" aria-hidden />
        Isbot rasmi yo&apos;q
      </p>
    );
  }
  return (
    <>
      <ul className="flex flex-wrap gap-2" aria-label="Isbot rasmlari">
        {photos.map((photo, index) => (
          <li key={photo.full}>
            <button
              type="button"
              onClick={() => setOpen(photo)}
              aria-label={`Isbot rasmi ${index + 1}`}
              className="border-line focus-visible:ring-brand block overflow-hidden rounded-lg border focus-visible:ring-2 focus-visible:outline-none"
            >
              {/* Server thumbnail'i (WebP) — next/image bu yerda keraksiz:
                  rasm backend hostidan, o'lchami allaqachon kichik. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.thumb}
                alt=""
                loading="lazy"
                className="size-24 object-cover"
              />
            </button>
          </li>
        ))}
      </ul>
      {open ? (
        <MediaLightbox
          open
          onOpenChange={(next) => {
            if (!next) setOpen(null);
          }}
          src={open.full}
          kind="image"
          name="Yetkazish isboti"
        />
      ) : null}
    </>
  );
}
