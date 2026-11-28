"use client";

import { ChevronDown, Hourglass, Info, PackageOpen, Table, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { KeyFigures } from "@/components/kit/key-figures";
import { EmptyView } from "@/components/kit/state-views";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { chiefCan } from "@/features/chief/types";
import type { ChiefMe } from "@/features/chief/types";
import { CourierDocumentDialog } from "@/features/sklad/components/courier-document-dialog";
import { LoadRequestsPanel } from "@/features/sklad/components/load-requests-panel";
import type { ChiefSklad, CourierStock } from "@/features/sklad/types";
import { useChiefSklad } from "@/features/sklad/use-chief-sklad";
import { useLoadRequests } from "@/features/sklad/use-load-requests";
import { CenterSelect } from "@/features/sales-centers/components/center-select";
import { NotSplitNote } from "@/features/sales-centers/components/not-split-note";
import { useCenterParam, useSalesCenters } from "@/features/sales-centers/use-sales-centers";
import { groupThousands, todayIso } from "@/lib/format";
import { cn } from "@/lib/utils";

import { cashWritable, sheetMoney } from "../cash-view";
import { cellText, filledCells, fullDate, moneyText, shortDate } from "../display";
import { idleCouriers, todayProducts } from "../issue";
import { isSingleDay } from "../period";
import type { SheetRange } from "../period";
import type { RegionGroup } from "../regions";
import { cellOf } from "../types";
import type { CourierRef, IssuePlan, SalesSheet, SheetPending } from "../types";
import { useIssuePlan, useSalesSheet } from "../use-sales-sheet";
import { useSheetPeriod } from "../use-sheet-period";
import { useSheetRegions } from "../use-sheet-regions";
import { CashReceiptDialog } from "./cash-receipt-dialog";
import { SalesSheetGrid } from "./sales-sheet-grid";
import type { ReturnMode, SheetActions } from "./sales-sheet-grid";
import { SheetExcelButton } from "./sheet-excel-button";
import { SheetPeriodBar } from "./sheet-period-bar";
import { SheetQueryState } from "./sheet-query-state";
import { SheetTelegramButton } from "./sheet-telegram-button";

type ReadySklad = Extract<ChiefSklad, { kind: "ready" }>;

/** Bugun ochiq jadvalning qo'shimchalari: berish rejasi va sklad (kuryerga berish / qabul / tuzatish). */
export type TodayData = {
  plan: IssuePlan | null;
  /** `null` — dopusk yo'q, sklad biriktirilmagan yoki hali yuklanmagan: hujjat tugmalari chiqmaydi. */
  sklad: ReadySklad | null;
};

/**
 * «Sotuv jadvali» — bosh kuryerning yagona ish joyi (hujjat 83 §1–§4, 85 §2;
 * egasi, 2026-11-20): «Pul olish» va «Berish rejasi» tablari shu jadvalga
 * qo'shildi. Davr URLda, sukut — bugun. Bugun ochiq bo'lsa — har kuryerda
 * «Berish kerak» va berish / qabul / tuzatish, kirim so'rovlari, ombor
 * yetishmovchiligi; jadval o'zi yangilanib turadi. Kuryerlar viloyat bo'yicha
 * guruhlanadi (`useSheetRegions`); Telegram matni sarlavhasi — filial nomi.
 *
 * Markaz (136-javob): sotuv, sovg'a, pul va manzillar — markaz bo'yicha; sklad
 * qoldig'i, xizmat haqi, pul topshirig'i va qarz umumiy. Shuning uchun markaz
 * tanlanganda jadval faqat ko'rish uchun: berish, «Oldim», xizmat haqi, Click
 * va skidka — «Hamma markaz» ko'rinishida (aks holda umumiy pul bir markaz
 * sonlari yonida yozilardi).
 */
export function SalesSheetView({ me }: { me: ChiefMe }) {
  const controls = useSheetPeriod();
  const center = useCenterParam();
  const { centers } = useSalesCenters();
  const centerName = center.salesFilial ? (centers?.find((item) => String(item.id) === center.salesFilial)?.name ?? null) : null;
  const filtered = center.salesFilial !== null;
  const sheet = useSalesSheet(controls.range, center.salesFilial);
  const regions = useSheetRegions(sheet.data);
  const today = todayIso();
  const isToday = isSingleDay(controls.range) && controls.range.dateFrom === today && !filtered;
  const plan = useIssuePlan(today, isToday);
  const sklad = useChiefSklad(isToday && chiefCan(me, "warehouse.view_courier_stores"));
  const todayData: TodayData | null = isToday ? { plan: plan.data ?? null, sklad: sklad.data?.kind === "ready" ? sklad.data : null } : null;

  return (
    <div className="flex flex-col gap-4">
      <SheetPeriodBar controls={controls}>
        <CenterSelect value={center.center} onChange={center.setCenter} className="w-48" />
        <SheetTelegramButton
          sheet={sheet.data}
          regions={regions}
          range={controls.range}
          title={me.filial?.name || me.seat.fullName}
          center={centerName}
        />
        <SheetExcelButton range={controls.range} salesFilial={center.salesFilial} />
      </SheetPeriodBar>
      <SheetQueryState
        query={sheet}
        deniedTitle="Sotuv jadvali sizga ochilmagan"
        missingTitle="Sotuv jadvali — server hali chiqarmagan"
        skeleton={<SheetSkeleton />}
      >
        {(data) =>
          data.couriers.length === 0 && (todayData === null || idleCouriers(todayData.plan, data, ownCouriers(todayData.sklad)).length === 0) ? (
            <EmptyView
              Icon={Table}
              title="Bu davrda sotuv yo'q"
              description="Kuryerlarga mol berilmagan va yetkazilgan zakaz yo'q. Boshqa kunni yoki kengroq oraliqni tanlang."
              action={
                controls.period === "day" ? (
                  <Button variant="outline" onClick={() => controls.shiftDay(-1)}>
                    Oldingi kunni ko&apos;rish
                  </Button>
                ) : undefined
              }
              className="border-line bg-surface rounded-2xl border"
            />
          ) : (
            <SalesSheetBody
              sheet={data}
              range={controls.range}
              regions={regions}
              onOpenDay={controls.setDay}
              canAccept={!filtered && chiefCan(me, "cash.accept")}
              today={todayData}
              readOnly={filtered}
            />
          )
        }
      </SheetQueryState>
    </div>
  );
}

/** Ochiq oyna: kuryerdan qabul / tuzatish yoki «Oldim». Berish — jadval qatorida, oynasiz. */
type OpenDialog = { kind: "document"; mode: ReturnMode; courier: CourierRef } | { kind: "receipt"; courier: CourierRef };

/**
 * Tayyor holat: asosiy raqamlar, ogohlantirishlar, kirim so'rovlari, jadval va
 * qatorlar izohi; oynalar shu yerda (kuryer qatoridan ochiladi). `today: null`
 * — o'tgan kun yoki oraliq: berish va sklad amallari yo'q, pul amallari faqat
 * bitta kun ochiq bo'lsa (`canAccept` — «Oldim» dopuski).
 */
export function SalesSheetBody({
  sheet,
  range,
  regions = null,
  onOpenDay,
  canAccept = false,
  today = null,
  readOnly = false,
}: {
  sheet: SalesSheet;
  range: SheetRange;
  regions?: readonly RegionGroup[] | null;
  onOpenDay: (day: string) => void;
  canAccept?: boolean;
  today?: TodayData | null;
  /** Markaz filtri (136-javob) — jadval faqat ko'rish uchun, amallar yo'q. */
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState<OpenDialog | null>(null);
  const close = () => setOpen(null);
  const sklad = today?.sklad ?? null;
  // Mol shu ombordan beriladi: rejadagi ombor, bo'lmasa skladning asosiy ombori.
  const locationId = today?.plan?.store.locationId ?? sklad?.store?.id ?? null;
  const actions: SheetActions = {
    canAccept,
    onReceipt: (courier) => setOpen({ kind: "receipt", courier }),
    today: today
      ? {
          plan: today.plan,
          source: sklad?.canWrite && locationId !== null ? { locationId, stock: sklad.stock } : null,
          couriers: ownCouriers(sklad),
          onDocument: (mode, courier) => setOpen({ kind: "document", mode, courier }),
        }
      : null,
  };
  // Bugun — «Berish kerak» har doim ochiq: harakatsiz kunda ham hamma mahsulot ustuni bor.
  const gridSheet = today ? { ...sheet, products: todayProducts(sheet.products, today.plan, sklad?.stock.map((row) => row.item) ?? []) } : sheet;
  const money = sheetMoney(sheet.totals);
  return (
    <>
      <KeyFigures
        className="sm:grid-cols-3 xl:grid-cols-6"
        items={[
          { label: "Umumiy sotuv", value: moneyText(money.sales), hint: "sovg'a qo'shilmaydi" },
          { label: "Click / onlayn", value: moneyText(money.online), hint: "qo'lda + ilovada oldindan" },
          { label: "Skidka", value: moneyText(money.discount), hint: "qo'lda + ball" },
          // Markaz filtrida xizmat haqi, topshiriq va qarz umumiy (136-javob §4) — izohda aytiladi.
          // Javob 140 §5: xizmat 28.11 dan qarzdan ayirilmaydi — kuryerga alohida beriladi.
          { label: "Kuryer xizmati", value: moneyText(money.fee), hint: readOnly ? "umumiy" : "alohida beriladi, qarzdan ayirilmaydi" },
          { label: "Topshirishi kerak", value: moneyText(money.due), hint: readOnly ? "umumiy" : "kuryerlar topshiradigan pul" },
          {
            label: "Topshirdi",
            value: moneyText(money.received),
            hint: readOnly ? "umumiy" : money.debt !== null && money.debt > 0 ? `qoldi ${groupThousands(money.debt)}` : "kuryerlardan olingan",
            tone: !readOnly && money.debt !== null && money.debt > 0 ? "warn" : "default",
          },
        ]}
      />
      <CashSinceNote sheet={sheet} range={range} />
      <PendingNote sheet={sheet} />
      {today?.plan ? <ShortageNote plan={today.plan} /> : null}
      {sklad ? <LoadRequestsSection /> : null}
      {readOnly ? (
        <NotSplitNote
          split="sotuv, sovg'a, naqd va onlayn pul, skidka, manzillar."
          common="sklad qoldig'i, kuryer xizmati, pul topshirig'i va qarz — ular hamma markaz uchun birga. Tahrir va «Oldim» — «Hamma markaz» ko'rinishida."
        />
      ) : null}
      {/* Daftar (sklad) markazga bo'linmaydi — markaz filtrida solishtirish yolg'on farq ko'rsatardi. */}
      {readOnly ? null : <ChecksNote sheet={sheet} />}
      <SalesSheetGrid sheet={gridSheet} range={range} regions={regions} onOpenDay={onOpenDay} actions={readOnly ? null : actions} />
      <SheetLegend today={today !== null} addressesOnPress={sheet.addressesOnPress} feeDeducted={(money.feeDeducted ?? 0) > 0} />
      {open?.kind === "receipt" ? <ReceiptDialog sheet={sheet} courier={open.courier} date={range.dateFrom} canAccept={canAccept} onClose={close} /> : null}
      {open?.kind === "document" && sklad ? (
        <CourierDocumentDialog
          key={`${open.mode}-${open.courier.id}`}
          mode={open.mode}
          courier={courierStock(sklad, open.courier)}
          stock={sklad.stock}
          store={sklad.store}
          onClose={close}
        />
      ) : null}
    </>
  );
}

/** Bosh kuryerning o'z kuryerlari (`sklad/couriers`) — sklad yuklanmagan bo'lsa bo'sh. */
function ownCouriers(sklad: ReadySklad | null): CourierRef[] {
  return sklad ? sklad.couriers.map((row) => ({ id: row.courier.id, fullName: row.courier.fullName })) : [];
}

/** Kuryer skladi — sklad ro'yxatida bo'lmasa (qo'lida hech narsa yo'q) bo'sh holda. */
function courierStock(sklad: ReadySklad, courier: CourierRef): CourierStock {
  return sklad.couriers.find((row) => row.courier.id === courier.id) ?? { courier: { ...courier, onShift: false }, onHand: 0, items: [] };
}

/** «Oldim» oynasi — kuryerning joriy raqamlari jadvaldan: yozuv bekor qilinsa yangi raqamlar bilan qayta chiziladi. */
function ReceiptDialog({ sheet, courier, date, canAccept, onClose }: { sheet: SalesSheet; courier: CourierRef; date: string; canAccept: boolean; onClose: () => void }) {
  const cash = sheet.couriers.find((row) => row.courier.id === courier.id)?.cash ?? null;
  if (!cash) return null;
  return <CashReceiptDialog courier={courier} date={date} cash={cash} canAccept={canAccept} onClose={onClose} />;
}

/**
 * Kuryer «yetkazdim» bosgan, logist hali tasdiqlamagan sotuv (97 §3). Egasi
 * (2026-11-20, hujjat 101 §6): bosh kuryerda hech narsa tasdiqni kutmaydi —
 * sotuv va pul darhol hisoblanadi. Manzil soni ham (21.11, hujjat 108) sukut 1
 * bilan darhol kiradi, logist tasdig'ida aniqlashadi; borganda atkaz manzili
 * esa logist qaroriga bog'liq — tasdiqdan keyin. Server biror qismni hali
 * kiritmagan bo'lsa (`moneyIncluded` / `addressesIncluded: false`) — shuni ochiq
 * aytadi, raqamlar mos kelmayotgandek ko'rinmasin.
 */
function PendingNote({ sheet }: { sheet: SalesSheet }) {
  const pending = sheet.pending;
  if (!pending) return null;
  const waitingAddresses = pending.addresses > 0 || pending.refusedAddresses > 0;
  return (
    <div role="status" className="bg-info-soft text-ink flex items-start gap-2 rounded-2xl px-4 py-3 text-dense">
      <Hourglass aria-hidden className="text-info mt-0.5 size-4 shrink-0" />
      <p>
        {pending.salesAmount > 0 ? (
          <span className="font-semibold">{`Logist hali tasdiqlamagan sotuv: ${moneyText(pending.salesAmount)}`}</span>
        ) : (
          <span className="font-semibold">Logist tasdig&apos;ini kutayotgan manzillar bor</span>
        )}
        {pending.cashAmount > 0 ? (
          <>
            {" · "}
            <span>{`shundan naqd ${moneyText(pending.cashAmount)}`}</span>
          </>
        ) : null}
        {waitingAddresses ? (
          <span className="block text-meta">
            {pending.addressesIncluded
              ? `Tasdiqlanmagan: ${pending.addresses} ta yetkazilgan manzil (soniga kirgan), ${pending.refusedAddresses} ta borganda atkaz`
              : `Kutilmoqda: ${pending.addresses} ta yetkazilgan manzil, ${pending.refusedAddresses} ta borganda atkaz`}
          </span>
        ) : null}
        <span className="text-ink-muted block text-meta">{pendingExplanation(pending)}</span>
      </p>
    </div>
  );
}

function pendingExplanation(pending: SheetPending): string {
  if (!pending.moneyIncluded) {
    return "Sotilgan sonlarga kuryer «yetkazdim» bosgan kuni kirdi. Pul — server yangilanmaguncha logist tasdiqlagandan keyin «Topshirishi kerak»ga qo'shiladi.";
  }
  return pending.addressesIncluded
    ? "Sotuv, pul va manzil soni kuryer «yetkazdim» bosgan zahoti hisoblangan — manzil soni logist tasdig'ida aniqlashadi. Borganda atkaz — logist tasdiqlagandan keyin qo'shiladi."
    : "Sotuv va pul kuryer «yetkazdim» bosgan zahoti hisoblangan. Manzil soni va borganda atkaz — logist tasdiqlagandan keyin qo'shiladi.";
}

/** Pul zanjiri boshidan oldingi kun (javob 104: toza boshlash 21.11) — pul yozilmaydi, buni ochiq aytamiz. */
function CashSinceNote({ sheet, range }: { sheet: SalesSheet; range: SheetRange }) {
  const since = sheet.totals.cash?.since ?? null;
  if (!isSingleDay(range) || cashWritable(range.dateFrom, since) || since === null) return null;
  return (
    <p role="status" className="bg-subtle text-ink-muted flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-meta">
      <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      <span>{`Pul hisobi ${fullDate(since)} dan yangidan boshlangan — bu kunga Click, skidka va «Oldim» yozilmaydi.`}</span>
    </p>
  );
}

/** Omboringizda yetmaydi (`store.shortage`, §4): uch son ham serverdan — logistdan mol so'rash vaqti. */
function ShortageNote({ plan }: { plan: IssuePlan }) {
  const short = filledCells(plan.store.shortage, plan.products);
  if (short.length === 0) return null;
  return (
    <div role="status" className="border-warn bg-warn-soft text-warn flex items-start gap-2 rounded-2xl border px-4 py-3 text-dense">
      <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <p className="font-bold">Omboringizda yetmaydi — logistdan mol so&apos;rang</p>
        <ul className="mt-1 flex flex-col gap-0.5">
          {short.map(({ product, cell }) => (
            <li key={product.id}>
              <span className="font-semibold" data-no-translit>
                {product.name}
              </span>
              {` — ${cellText(cellOf(plan.store.toIssue, product.id), product)} berish kerak, omboringizda ${cellText(cellOf(plan.store.onHand, product.id), product)}, ${cellText(cell, product)} yetmaydi`}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Kuryerlar ilovadan so'ragan mol (sklad hujjati 2026-11-03 §4) — «Kuryerlar
 * ombori» tabi olib tashlangach shu yerda. Kutilayotgani bo'lsa ochiq turadi.
 */
function LoadRequestsSection() {
  const pending = useLoadRequests("pending").data?.length ?? 0;
  const [expanded, setExpanded] = useState<boolean | null>(null);
  const shown = expanded ?? pending > 0;
  return (
    <section aria-label="Kuryerlarning mol so'rovlari" className="border-line bg-surface rounded-2xl border">
      <button
        type="button"
        aria-expanded={shown}
        onClick={() => setExpanded(!shown)}
        className="hover:bg-subtle flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45"
      >
        <PackageOpen aria-hidden className="text-ink-muted size-4 shrink-0" />
        <span className="text-ink text-body font-semibold">Kuryerlarning mol so&apos;rovlari</span>
        {pending > 0 ? (
          <span className="bg-brand text-brand-ink rounded-full px-2 text-fine font-semibold">{`${pending} ta kutilmoqda`}</span>
        ) : (
          <span className="text-ink-faint text-meta">kutilayotgani yo&apos;q</span>
        )}
        <ChevronDown aria-hidden className={cn("text-ink-muted ml-auto size-4 transition-transform", shown && "rotate-180")} />
      </button>
      {shown ? (
        <div className="border-line border-t px-4 py-3">
          <LoadRequestsPanel />
        </div>
      ) : null}
    </section>
  );
}

/**
 * Daftar ≠ zakazlar (`checks[]`, §2.10). Odatda chiqmaydi: daftar va zakaz
 * sotuvi bitta hodisadan yoziladi. Chiqsa — farq ochiq ko'rsatiladi, jadval
 * raqami o'zgartirilmaydi.
 */
function ChecksNote({ sheet }: { sheet: SalesSheet }) {
  if (sheet.checks.length === 0) return null;
  const courierName = (id: number | null) => sheet.couriers.find((row) => row.courier.id === id)?.courier.fullName ?? "—";
  const productOf = (id: number | null) => sheet.products.find((product) => product.id === id);
  return (
    <section role="status" aria-label="Daftar va zakazlar farqi" className="border-warn bg-warn-soft flex items-start gap-2 rounded-2xl border px-4 py-3">
      <TriangleAlert aria-hidden className="text-warn mt-0.5 size-4 shrink-0" />
      <div className="text-ink min-w-0 text-dense">
        <p className="font-semibold">{`Sklad daftari zakazlardagi sotuvdan farq qiladi — ${sheet.checks.length} ta qator`}</p>
        <p className="text-ink-muted mt-0.5 text-meta">Jadval raqamlari daftar bo&apos;yicha. Sabab odatda — qo&apos;lda tuzatish; farqni bosh logist bilan tekshiring.</p>
        <ul className="mt-2 flex flex-col gap-1">
          {sheet.checks.map((check) => {
            const product = productOf(check.productId);
            return (
              <li key={`${check.date}-${check.courierId}-${check.flow}-${check.productId}`}>
                <span className="tabular">{shortDate(check.date)}</span>
                {" · "}
                <span data-no-translit>{courierName(check.courierId)}</span>
                {check.flow === "gift" ? " · Sovg'a · " : " · Sotilgan · "}
                <span className="font-semibold" data-no-translit>
                  {product?.name ?? "—"}
                </span>
                {`: daftarda ${cellText(check.ledger, product)}, zakazlarda ${cellText(check.orders, product)}`}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** Qatorlar va ustunlar ma'nosi — rang yagona signal bo'lmasin. */
/**
 * `feeDeducted` — oraliqda 28.11 dan oldingi kun bor va o'sha kunlarda xizmat
 * qarzdan ayirilgan (javob 140 §5): formulada «− kuryer xizmati (28.11 gacha)».
 */
function SheetLegend({ today, addressesOnPress, feeDeducted }: { today: boolean; addressesOnPress: boolean; feeDeducted: boolean }) {
  return (
    <ul className="text-ink-muted flex flex-col gap-x-6 gap-y-1 text-meta lg:flex-row lg:flex-wrap">
      <li>
        <strong className="text-ink font-semibold">Berilgan</strong>
        <span> = davr boshidagi qoldiq + davrda berilgan − kuryerdan qaytarilgan ± tuzatish (katak ustida — tafsiloti)</span>
      </li>
      <li>
        <strong className="text-ok font-semibold">Sotilgan</strong>
        <span> — kuryer ilovada «yetkazdim» qilgan zakazlardan, o&apos;zi yoziladi</span>
      </li>
      <li>
        <strong className="text-gold font-semibold">Sovg&apos;a</strong>
        <span> — sovg&apos;a qilib berilgan; pulga qo&apos;shilmaydi</span>
      </li>
      <li>
        <strong className="text-danger font-semibold">Qolgan</strong>
        <span> = berilgan − sotilgan − sovg&apos;a; ertangi kunga o&apos;zi o&apos;tadi</span>
      </li>
      {today ? (
        <li>
          <strong className="text-brand font-semibold">Berish kerak</strong>
          <span> = zakazlarga kerak − qo&apos;lida; sonni o&apos;zgartirsa bo&apos;ladi, «Berish» bosilsa darhol beriladi</span>
        </li>
      ) : null}
      <li>
        <strong className="text-ink font-semibold">Manzil soni / borganda atkaz</strong>
        <span>
          {addressesOnPress
            ? " — manzil kuryer «yetkazdim» bosgan zahoti 1 bo'lib qo'shiladi, logist tasdiqlaganda o'z soniga almashadi; borganda atkaz — logist tasdiqlagandan keyin"
            : " — logist tasdiqlagandan keyin qo'shiladi; sotuv va pul — kuryer «yetkazdim» bosgan zahoti"}
        </span>
      </li>
      <li>
        <strong className="text-brand font-semibold">Topshirishi kerak</strong>
        <span>
          {feeDeducted
            ? " = umumiy summa − Click − skidka − kuryer xizmati (28.11 gacha) + o'tgan qarz"
            : " = umumiy summa − Click − skidka + o'tgan qarz"}
        </span>
      </li>
      <li>
        <strong className="text-ink font-semibold">Kuryer xizmati</strong>
        <span> — kuryerga alohida beriladi, qarzdan ayirilmaydi (28.11 dan)</span>
      </li>
      <li>
        <strong className="text-ink font-semibold">Topshirdi</strong>
        <span> — «Oldim» bilan kuryerdan olingan; qolgani ertangi kunga qarz bo&apos;lib o&apos;tadi</span>
      </li>
    </ul>
  );
}

function SheetSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-label="Yuklanmoqda">
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}
