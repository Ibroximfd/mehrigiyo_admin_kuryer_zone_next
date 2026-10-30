"use client";

import { PencilLine } from "lucide-react";

import { CallButton } from "@/components/kit/call-button";
import { CopyButton } from "@/components/kit/copy-button";
import { Button } from "@/components/ui/button";
import { formatDeliveryAddress } from "@/features/orders/address";
import { AddressChangedBadge } from "@/features/orders/components/address-changed-badge";
import { AddressIssueBadge } from "@/features/orders/components/address-issue-badge";
import {
  InlineLogistNote,
  InlineTags,
} from "@/features/orders/components/order-detail/delivery-inline-fields";
import { CourierInfo, InlineChiefPicker } from "@/features/chief/components/inline-chief-picker";
import {
  DistrictGuessChip,
  DistrictPicker,
  RegionAutoAssignNote,
  ZoneBadges,
} from "@/features/orders/components/zoning/zone-parts";
import { zoneState } from "@/features/orders/zoning";
import {
  DetailField,
  DetailSection,
  EMPTY_VALUE,
} from "@/features/orders/components/order-detail/section";
import { deliveryDateText } from "@/features/orders/delivery-labels";
import {
  geocodePrecisionLabel,
  needsAddressReview,
} from "@/features/orders/geocode";
import { regionLabel } from "@/features/orders/regions";
import { attemptReasonLabel, mapLink } from "@/features/orders/types";
import type { LogistOrder } from "@/features/orders/types";
import { formatPhone, formatShortDateTime } from "@/lib/format";

/**
 * Yetkazish: viloyat, sana+oyna, manzil, **joyida** kuryer tanlash, logist
 * izohi, urinishlar, teglar va "xaritada ochish" (`05` §6). Geokod
 * muammosida (2026-10-16 B4) "Manzilni aniqlashtiring" va tahrir tugmasi.
 * Manzil satri — `formatDeliveryAddress`: viloyat, tuman, mahalla, ko'cha
 * (karta va ro'yxat bilan bir xil, nusxalanganda to'liq ketadi).
 */
export function DeliverySection({
  order,
  locked,
  onPatched,
  onEdit,
}: {
  order: LogistOrder;
  locked: boolean;
  onPatched: (order: LogistOrder) => void;
  /** Manzil tahriri — mavjud "Tahrirlash" oynasi (`?edit=`). */
  onEdit?: () => void;
}) {
  const info = order.deliveryInfo;
  const link = mapLink(info);
  const region = info?.regionDisplay || regionLabel(info?.region);
  const review = needsAddressReview(order);
  const precision = geocodePrecisionLabel(order.geocode?.precision ?? null);
  const fullAddress = formatDeliveryAddress(order);

  return (
    <DetailSection
      title="Yetkazish"
      aside={
        link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="text-link hover:text-brand"
          >
            xaritada ochish
          </a>
        ) : null
      }
    >
      <div className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
        <DetailField label="Viloyat">
          {region ? (
            <span className="text-brand font-bold">{region}</span>
          ) : (
            EMPTY_VALUE
          )}
        </DetailField>
        <DetailField label="Yetkaziladigan sana · oyna">
          {order.deliveryDate ? (
            <span className="tabular">
              {deliveryDateText(order, { withYear: true, withHours: true })}
            </span>
          ) : (
            EMPTY_VALUE
          )}
        </DetailField>
        <DetailField label="Manzil" className="sm:col-span-2">
          {info?.address && fullAddress ? (
            <CopyButton
              value={fullAddress}
              label="Manzilni nusxalash"
              successMessage="Manzil nusxalandi"
              className="-ml-1.5"
            >
              <span className="text-left whitespace-pre-wrap" data-no-translit>
                {fullAddress}
              </span>
            </CopyButton>
          ) : (
            <span className="text-danger font-medium">
              ⚠ Ko&apos;rsatilmagan — mijozdan aniqlang
            </span>
          )}
          {info?.note ? (
            <span className="text-ink-faint block text-meta" data-no-translit>
              {info.note}
            </span>
          ) : null}
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            <AddressIssueBadge order={order} />
            <AddressChangedBadge order={order} />
            {precision ? (
              <span className="text-ink-faint text-fine">{`Geokod: ${precision}`}</span>
            ) : null}
          </span>
          {review ? (
            <AddressReviewHint locked={locked} onEdit={onEdit} />
          ) : null}
        </DetailField>
        {info?.contactName || info?.contactPhone ? (
          <DetailField label="Qabul qiluvchi" className="sm:col-span-2">
            <span className="flex items-center gap-1">
              <span data-no-translit>{info.contactName ?? "—"}</span>
              {info.contactPhone ? (
                <>
                  <span className="text-ink-faint tabular text-meta">
                    {formatPhone(info.contactPhone)}
                  </span>
                  <CallButton phone={info.contactPhone} />
                </>
              ) : null}
            </span>
          </DetailField>
        ) : null}
        <DetailField label="Tuman · zona" className="sm:col-span-2">
          <span className="flex flex-col gap-1.5">
            <DistrictPicker order={order} disabled={locked} />
            <ZoneBadges order={order} />
            {zoneState(order.zoning) === "district_without_zone" ? (
              <span className="text-warn text-meta">
                Zonasiz tuman — admin zonaga qo&apos;shsin
              </span>
            ) : null}
            {!locked ? <DistrictGuessChip order={order} /> : null}
            <RegionAutoAssignNote region={info?.region ?? null} />
          </span>
        </DetailField>
        <DetailField label="Bosh kuryer">
          <InlineChiefPicker order={order} disabled={locked} onPatched={onPatched} />
        </DetailField>
        <DetailField label="Kuryer">
          <CourierInfo order={order} />
        </DetailField>
        <DetailField label="Logist izohi">
          <InlineLogistNote
            key={order.logistNote ?? ""}
            order={order}
            disabled={locked}
            onPatched={onPatched}
          />
        </DetailField>
        <DetailField label="Urinishlar">
          <Attempts order={order} />
        </DetailField>
        <DetailField label="Teglar">
          <InlineTags order={order} disabled={locked} onPatched={onPatched} />
        </DetailField>
      </div>
    </DetailSection>
  );
}

/**
 * Geokod "taxminiy" yoki "tumandan tashqari" — kuryer adashishi mumkin.
 * Yechim — manzilni aniqlashtirish: mavjud tahrir oynasi ochiladi.
 */
function AddressReviewHint({
  locked,
  onEdit,
}: {
  locked: boolean;
  onEdit?: () => void;
}) {
  return (
    <span
      role="note"
      className="bg-warn-soft text-warn mt-1.5 flex flex-wrap items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-meta font-medium"
    >
      <span>
        Manzilni aniqlashtiring — mijoz bilan tekshirib, to&apos;g&apos;rilang.
      </span>
      {onEdit && !locked ? (
        <Button size="sm" variant="outline" onClick={onEdit} className="h-7">
          <PencilLine />
          Manzilni tahrirlash
        </Button>
      ) : null}
    </span>
  );
}

function Attempts({ order }: { order: LogistOrder }) {
  const attempts = order.deliveryAttempts;
  if (attempts.length === 0) return <span className="tabular">0</span>;
  return (
    <span className="flex flex-col gap-0.5">
      <span className="text-warn tabular font-semibold">{attempts.length}</span>
      {attempts.map((attempt) => (
        <span key={attempt.id} className="text-ink-muted text-meta">
          {attempt.createdAt
            ? `${formatShortDateTime(attempt.createdAt)} · `
            : ""}
          {attemptReasonLabel(attempt.reason)}
          {attempt.note ? (
            <>
              {" — "}
              <span data-no-translit>{attempt.note}</span>
            </>
          ) : null}
        </span>
      ))}
    </span>
  );
}
