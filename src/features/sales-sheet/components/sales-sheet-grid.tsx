"use client";

import { ArrowDownToLine, ChevronDown, HandCoins, SlidersHorizontal, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { Fragment, useState } from "react";

import { Button } from "@/components/ui/button";
import type { CourierDocumentMode } from "@/features/sklad/courier-document";
import { oneOffHref } from "@/lib/filter-memory";
import { groupThousands } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { extraShareHint, refusedWithExtra } from "../addresses";
import { cashAction, cashWritable, sheetMoney } from "../cash-view";
import type { SheetMoney } from "../cash-view";
import { cellText, fullDate, moneyText, shortDate, signedCellText } from "../display";
import { netGiven } from "../given";
import { closingMismatch, idleCourierSheet, idleCouriers, issueOf } from "../issue";
import type { StockMismatch } from "../issue";
import { isSingleDay } from "../period";
import type { SheetRange } from "../period";
import type { RegionGroup } from "../regions";
import { cellOf, hasCells, hasCourierlessActivity, isZeroCell } from "../types";
import type { CellMap, CourierFee, CourierRef, CourierSheet, CourierlessSheet, IssuePlan, PlanCourier, SalesSheet, SheetDay, SheetFigures, SheetFlow, SheetProduct } from "../types";
import { CourierDiscountEditor } from "./courier-discount-editor";
import { CourierFeeEditor } from "./courier-fee-editor";
import { CourierOnlineEditor } from "./courier-online-editor";
import { CourierlessOrders } from "./courierless-orders";
import { IssueRowCells } from "./issue-row";
import type { GiveSource } from "./issue-row";
import { BLOCK_START, CELL, HeadCell, LeadCell, LeadHeads, ProductHeads, QtyCells, RowLabel, SheetScroll } from "./sheet-table";
import type { RowTone } from "./sheet-table";

type FlowRow = { flow: SheetFlow; label: string; tone: RowTone };

const FLOW_ROWS: readonly FlowRow[] = [
  { flow: "given", label: "Berilgan", tone: "plain" },
  { flow: "sold", label: "Sotilgan", tone: "ok" },
  { flow: "gift", label: "Sovg'a", tone: "gold" },
  { flow: "closing", label: "Qolgan", tone: "danger" },
];

/** «Kuryersiz» blokida faqat sotuv qatorlari: bu kuryer ombori emas — berilgan va qolgan yo'q (hujjat 125 C §4). */
const SALE_ROWS: readonly FlowRow[] = FLOW_ROWS.filter((row) => row.flow === "sold" || row.flow === "gift");

/**
 * Qo'shimcha mahsulot qatori — bugungi «Berish kerak» (kuryer blokida va «JAMI» da).
 * `render` — tahrirlanadigan qator (yorliq va kataklar o'zi chiziladi).
 */
type ExtraRow = {
  key: string;
  label: string;
  tone: RowTone;
  cells: CellMap;
  titleOf?: (product: SheetProduct) => string | undefined;
  render?: (start: boolean) => React.ReactNode;
};

type BlockRow = ExtraRow & { zero: "blank" | "show"; signed: boolean };

/** «Berilgan» tarkibi (§2.2): davr boshidagi qoldiq + davrda berilgan, qaytarish va tuzatish bo'lsa — u ham; katak izohida. */
function givenTitle(figures: SheetFigures, product: SheetProduct): string | undefined {
  const opening = cellOf(figures.opening, product.id);
  const issued = cellOf(figures.issued, product.id);
  const other = cellOf(figures.other, product.id);
  if (isZeroCell(opening) && isZeroCell(issued) && isZeroCell(other)) return undefined;
  const start = cellText(opening, product);
  const given = cellText(issued, product);
  if (isZeroCell(other)) return `Boshida ${start} + berildi ${given}`;
  return `Boshida ${start} + berildi ${given}, qaytarish va tuzatish ${signedCellText(other, product)}`;
}

/**
 * Egasi jadvalidagi to'rt qator: Berilgan − Sotilgan − Sovg'a = Qolgan.
 * Kuryerdan qaytarish va tuzatish alohida qator emas — «Berilgan» ichida
 * (`netGiven`), tafsiloti katak izohida. Bugun — oxirida «Berish kerak» (faqat bo'lsa).
 */
function rowsOf(figures: SheetFigures, products: readonly SheetProduct[], extra: ExtraRow | null, flowRows: readonly FlowRow[]): BlockRow[] {
  const flows = flowRows.map(
    (row): BlockRow => ({
      key: row.flow,
      label: row.label,
      tone: row.tone,
      cells: row.flow === "given" ? netGiven(figures, products) : figures[row.flow],
      zero: row.flow === "closing" ? "show" : "blank",
      signed: false,
      titleOf: row.flow === "given" ? (product) => givenTitle(figures, product) : undefined,
    }),
  );
  return extra ? [...flows, { ...extra, zero: "blank", signed: false }] : flows;
}

/**
 * «Berish kerak» qatori. Sklad yozish huquqi bor — doim, tahrirlanadigan
 * (`IssueRowCells`: sonlar oldindan yozilgan, «Berish» — darhol); yo'q — faqat
 * ko'rish va faqat kerak bo'lsa; katak izohida — zakazlarga kerak va qo'lidagi.
 */
function issueRow(courier: CourierRef, issue: PlanCourier | null, products: readonly SheetProduct[], source: GiveSource | null): ExtraRow | null {
  if (source) {
    return {
      key: "to-issue",
      label: "Berish kerak",
      tone: "brand",
      cells: {},
      render: (start) => <IssueRowCells key={courier.id} courier={courier} issue={issue} products={products} source={source} start={start} />,
    };
  }
  if (!issue || !hasCells(issue.toIssue)) return null;
  return {
    key: "to-issue",
    label: "Berish kerak",
    tone: "brand",
    cells: issue.toIssue,
    titleOf: (product) => `Zakazlarga kerak ${cellText(cellOf(issue.required, product.id), product)}, qo'lida ${cellText(cellOf(issue.onHand, product.id), product)}`,
  };
}

/** «JAMI» dagi «Berish kerak» — hamma kuryerga, omboringizdan (`store.to_issue`). */
function storeIssueRow(plan: IssuePlan | null): ExtraRow | null {
  if (!plan || !hasCells(plan.store.toIssue)) return null;
  return {
    key: "to-issue",
    label: "Berish kerak",
    tone: "brand",
    cells: plan.store.toIssue,
    titleOf: (product) => `Omboringizda ${cellText(cellOf(plan.store.onHand, product.id), product)}`,
  };
}

/** O'ngdagi pul va son ustunlari soni (`MoneyCells`) — guruh sarlavhasi butun qatorga cho'zilishi uchun. */
const MONEY_COLUMNS = 8;

/**
 * Jadvaldagi amallar (egasi, 2026-11-20: «Pul olish» va «Berish rejasi»
 * tablari shu jadvalga qo'shildi). Berilmasa — jadval faqat o'qish uchun.
 */
export type SheetActions = {
  /** «Oldim» dopuski (`cash.accept`). */
  canAccept: boolean;
  onReceipt: (courier: CourierRef) => void;
  /** Bugun ochiq: berish rejasi va sklad amallari; boshqa kunda — `null`. */
  today: {
    plan: IssuePlan | null;
    /** Sklad yozish huquqi bilan: berish shu ombordan; `null` — faqat ko'rish (berish, qabul, tuzatish yo'q). */
    source: GiveSource | null;
    /** Bosh kuryerning hamma o'z kuryeri (sklad) — harakatsizi ham jadvalda chiqadi (hujjat 104). */
    couriers: readonly CourierRef[];
    onDocument: (mode: ReturnMode, courier: CourierRef) => void;
  } | null;
};

/**
 * Kunlik sotuv jadvali (hujjat 83 §1–§2, 85 §2; egasi, 2026-11-20 — bosh
 * kuryerning yagona ish joyi): har kuryer — blok, mahsulot — ustun. O'ngda
 * umumiy summa (sovg'asiz), Click va skidka (qo'lda), kuryer xizmati (qo'lda),
 * topshirishi kerak, topshirdi («Oldim»), manzillar. Bugun — «Berish kerak»
 * qatori va kuryerga berish / qabul / tuzatish shu blokda. Hamma son serverdan.
 *
 * Viloyatlar kesimi (`regions` — `useSheetRegions`):
 *   • bitta kun — viloyat sarlavhasi, uning kuryerlari, «{viloyat} jami», oxirida «JAMI»;
 *   • hafta / oy / oraliq — kuryer bloklarisiz: har viloyat bitta blok, oxirida «JAMI».
 * `regions: null` (viloyat hali aniqlanmagan) — kuryerlar guruhsiz.
 */
export function SalesSheetGrid({
  sheet,
  range,
  onOpenDay,
  regions = null,
  actions = null,
}: {
  sheet: SalesSheet;
  range: SheetRange;
  onOpenDay: (day: string) => void;
  regions?: readonly RegionGroup[] | null;
  actions?: SheetActions | null;
}) {
  const single = isSingleDay(range);
  const columns = 2 + sheet.products.length + MONEY_COLUMNS;
  const plan = actions?.today?.plan ?? null;
  const idle = actions?.today ? idleCouriers(plan, sheet, actions.today.couriers) : [];
  // Davr almashsa blok yangidan quriladi — tahrirdagi summa boshqa kunga o'tib ketmaydi.
  const courierBlock = (courier: CourierSheet, isIdle = false) => (
    <CourierBlock
      key={`${courier.courier.id}:${range.dateFrom}:${range.dateTo}`}
      courier={courier}
      products={sheet.products}
      range={range}
      onOpenDay={onOpenDay}
      actions={actions}
      idle={isIdle}
      cashSince={sheet.totals.cash?.since ?? null}
    />
  );
  return (
      <SheetScroll label="Sotuv jadvali">
        <thead>
          <tr>
            <LeadHeads lead={regions && !single ? "Viloyat" : "Kuryer"} label="Qator" />
            <ProductHeads products={sheet.products} />
            <HeadCell align="right" className="min-w-28">
              Umumiy summa
            </HeadCell>
            {/* Bitta kunda — qo'lda yoziladi (maydon), oraliqda — faqat yig'indi. */}
            <HeadCell align="right" className="min-w-32">
              {single ? "Click / onlayn (qo'lda)" : "Click / onlayn"}
            </HeadCell>
            <HeadCell align="right" className="min-w-32">
              {single ? "Skidka (qo'lda)" : "Skidka"}
            </HeadCell>
            <HeadCell align="right" className="min-w-36">
              {single ? "Kuryer xizmati (qo'lda)" : "Kuryer xizmati"}
            </HeadCell>
            <HeadCell align="right" className="min-w-32">
              Topshirishi kerak
            </HeadCell>
            <HeadCell align="right" className="min-w-32">
              Topshirdi
            </HeadCell>
            <HeadCell className="min-w-16">Manzil soni</HeadCell>
            <HeadCell className="min-w-16">Borganda atkaz</HeadCell>
          </tr>
        </thead>
        {regions === null
          ? sheet.couriers.map((courier) => courierBlock(courier))
          : regions.map((region) =>
              single ? (
                <Fragment key={region.code ?? ""}>
                  <GroupHead title={region.name} couriers={region.couriers.length} columns={columns} />
                  {region.couriers.map((courier) => courierBlock(courier))}
                  <tbody>
                    <FigureRows
                      figures={region.totals}
                      products={sheet.products}
                      variant="region"
                      lead={<RegionLead title={`${region.name} jami`} couriers={region.couriers.length} />}
                      fee={<FeeSum fee={region.totals.fee} hint="qo'lda yozilgan" />}
                    />
                  </tbody>
                </Fragment>
              ) : (
                <tbody key={region.code ?? ""}>
                  <FigureRows
                    figures={region.totals}
                    products={sheet.products}
                    lead={<RegionLead title={region.name} couriers={region.couriers.length} />}
                    fee={<FeeSum fee={region.totals.fee} hint="kunma-kun yoziladi" />}
                  />
                </tbody>
              ),
            )}
        {idle.length > 0 ? (
          <>
            <GroupHead title="Bugun harakati yo'q kuryerlar" couriers={idle.length} columns={columns} />
            {idle.map((courier) => courierBlock(idleCourierSheet(courier), true))}
          </>
        ) : null}
        {sheet.courierless && hasCourierlessActivity(sheet.courierless) ? (
          <CourierlessBlock
            key={`courierless:${range.dateFrom}:${range.dateTo}`}
            block={sheet.courierless}
            products={sheet.products}
            columns={columns}
            onOpenDay={onOpenDay}
          />
        ) : null}
        <tfoot>
          <FigureRows
            figures={sheet.totals}
            products={sheet.products}
            variant="total"
            extra={storeIssueRow(plan)}
            lead={
              <>
                <span className="text-ink block text-title">JAMI</span>
                <span className="text-ink-muted block text-fine">{`${sheet.couriers.length} ta kuryer`}</span>
              </>
            }
            fee={<FeeSum fee={sheet.totals.fee} hint="qo'lda yozilgan" />}
          />
        </tfoot>
      </SheetScroll>
  );
}

/**
 * Guruh sarlavhasi (viloyat yoki bugun harakatsiz kuryerlar) — butun qatorga
 * cho'zilgan; nom chapda yopishgan: jadval yonga siljiganda ham ko'rinib turadi.
 */
function GroupHead({ title, couriers, columns }: { title: string; couriers: number; columns: number }) {
  return (
    <tbody>
      <tr>
        <th scope="rowgroup" colSpan={columns} className={cn("border-line bg-surface-3 border-b px-3 py-2 text-left font-normal", BLOCK_START)}>
          <span className="sticky left-3 inline-flex items-baseline gap-2">
            <span className="text-ink text-body font-bold">{title}</span>
            <span className="text-ink-muted text-meta">{`${couriers} ta kuryer`}</span>
          </span>
        </th>
      </tr>
    </tbody>
  );
}

/** Viloyat bloki boshi: nomi (yoki «… jami») va kuryerlar soni. Nom DOM'da tarjima qilinadi (lug'atdagi viloyat). */
function RegionLead({ title, couriers }: { title: string; couriers: number }) {
  return (
    <>
      <span className="text-ink block text-body font-bold">{title}</span>
      <span className="text-ink-muted block text-fine">{`${couriers} ta kuryer`}</span>
    </>
  );
}

function CourierBlock({
  courier,
  products,
  range,
  onOpenDay,
  actions,
  idle,
  cashSince,
}: {
  courier: CourierSheet;
  products: readonly SheetProduct[];
  range: SheetRange;
  onOpenDay: (day: string) => void;
  actions: SheetActions | null;
  /** Bugun harakati yo'q kuryer — raqamlar yo'q, faqat zakazlar va berish. */
  idle: boolean;
  /** Pul zanjiri boshi (`totals.cash.since`) — undan oldingi kunda pul yozilmaydi. */
  cashSince: string | null;
}) {
  const [daysOpen, setDaysOpen] = useState(false);
  const { id, fullName } = courier.courier;
  const single = isSingleDay(range);
  const today = actions?.today ?? null;
  const issue = today ? issueOf(today.plan, id) : null;
  // Tasdiqlanmagan sotuv bo'lsa solishtirilmaydi: u «Qolgan» ga kirgan, sklad qoldig'ida hali bo'lishi mumkin (97 §3).
  const mismatch = issue && !idle && !hasCells(issue.pending) ? closingMismatch(courier.closing, issue.onHand, products) : [];
  const ordersHref = issue
    ? oneOffHref(ROUTES.orders, { scope: "active", courier: id })
    : oneOffHref(ROUTES.orders, { scope: "delivered", courier: id, from: range.dateFrom, to: range.dateTo });
  return (
    <tbody>
      <FigureRows
        figures={courier}
        products={products}
        extra={today ? issueRow(courier.courier, issue, products, today.source) : null}
        lead={
          <>
            <span className="text-ink block truncate text-body font-bold" data-no-translit title={fullName}>
              {fullName}
            </span>
            <OrdersNote courier={courier} issue={issue} />
            <Link href={ordersHref} className="text-brand mt-0.5 block text-fine font-semibold hover:underline focus-visible:underline focus-visible:outline-none">
              Zakazlarini ochish
            </Link>
            {mismatch.length > 0 ? <MismatchNote mismatch={mismatch} /> : null}
            {today?.source ? <StockActions courier={courier.courier} onDocument={today.onDocument} /> : null}
            {courier.days.length > 0 ? (
              <button
                type="button"
                aria-expanded={daysOpen}
                onClick={() => setDaysOpen((open) => !open)}
                className="text-ink-muted hover:text-ink mt-1 inline-flex items-center gap-1 text-fine font-semibold focus-visible:underline focus-visible:outline-none"
              >
                Kunma-kun
                <ChevronDown aria-hidden className={cn("size-3.5 transition-transform", daysOpen && "rotate-180")} />
              </button>
            ) : null}
          </>
        }
        fee={
          idle ? (
            <FeeSum fee={null} hint="harakat yo'q" />
          ) : single ? (
            <CourierFeeEditor courier={courier.courier} date={range.dateFrom} fee={courier.fee} />
          ) : (
            <FeeSum fee={courier.fee} hint="kunma-kun yoziladi" />
          )
        }
        edit={single && !idle && cashWritable(range.dateFrom, cashSince) ? { courier: courier.courier, date: range.dateFrom, actions } : null}
      />
      {daysOpen ? courier.days.map((day) => <DayRow key={day.date} day={day} products={products} onOpen={() => onOpenDay(day.date)} />) : null}
    </tbody>
  );
}

/**
 * «Kuryersiz (bosh kuryer)» (hujjat 125 C §4): bosh kuryerning o'zida yopilgan
 * zakazlar — sotuvi kuryer omboridan emas, uning omboridan ayirilgan. Kuryer
 * qatorlarida yo'q, lekin «JAMI» ichida bor: shu qatorsiz kuryerlar yig'indisi
 * jamidan kam chiqardi. Faqat sotuv va pul; kuryer amallari («Oldim», xizmat
 * haqi, skidka, berish) yo'q — pul bosh kuryerning o'zida.
 */
function CourierlessBlock({
  block,
  products,
  columns,
  onOpenDay,
}: {
  block: CourierlessSheet;
  products: readonly SheetProduct[];
  columns: number;
  onOpenDay: (day: string) => void;
}) {
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [daysOpen, setDaysOpen] = useState(false);
  const toggle = "text-ink-muted hover:text-ink mt-1 mr-3 inline-flex items-center gap-1 text-fine font-semibold focus-visible:underline focus-visible:outline-none";
  return (
    <tbody>
      <FigureRows
        figures={block}
        products={products}
        variant="own"
        flows={SALE_ROWS}
        lead={
          <>
            <span className="text-ink block text-body font-bold">Kuryersiz (bosh kuryer)</span>
            <span className="text-ink-muted block text-fine">{`${groupThousands(block.ordersCount)} ta zakaz`}</span>
            <span className="text-ink-faint block text-fine">sotuv omboringizdan ayirilgan</span>
            {block.orders.length > 0 ? (
              <button type="button" aria-expanded={ordersOpen} onClick={() => setOrdersOpen((open) => !open)} className={toggle}>
                Zakazlari
                <ChevronDown aria-hidden className={cn("size-3.5 transition-transform", ordersOpen && "rotate-180")} />
              </button>
            ) : null}
            {block.days.length > 0 ? (
              <button type="button" aria-expanded={daysOpen} onClick={() => setDaysOpen((open) => !open)} className={toggle}>
                Kunma-kun
                <ChevronDown aria-hidden className={cn("size-3.5 transition-transform", daysOpen && "rotate-180")} />
              </button>
            ) : null}
          </>
        }
        fee={<FeeSum fee={null} hint="kuryer emas" />}
      />
      {ordersOpen ? <CourierlessOrders block={block} columns={columns} /> : null}
      {daysOpen ? block.days.map((day) => <DayRow key={day.date} day={day} products={products} onOpen={() => onOpenDay(day.date)} />) : null}
    </tbody>
  );
}

/** Kuryerdagi zakazlar: bugun — rejadagi (kechadan o'tgan + yangi), boshqa kun — davr oxirida qolgani. */
function OrdersNote({ courier, issue }: { courier: CourierSheet; issue: PlanCourier | null }) {
  if (issue) {
    const total = issue.carriedOrders + issue.newOrders;
    if (total === 0) return null;
    return (
      <span className="text-ink-muted block text-fine">
        {`${groupThousands(total)} ta zakaz`}
        {issue.newOrders > 0 ? ` · ${groupThousands(issue.newOrders)} ta yangi` : null}
      </span>
    );
  }
  return courier.openOrders > 0 ? <span className="text-ink-muted block text-fine">{`${groupThousands(courier.openOrders)} ta zakaz qoldi`}</span> : null;
}

/** «Qolgan» kuryerning skladdagi qoldig'idan farq qiladi — server ma'lumotida xato (hujjat 101 §3); tafsiloti izohda. */
function MismatchNote({ mismatch }: { mismatch: readonly StockMismatch[] }) {
  const details = mismatch.map((row) => `${row.product.name}: jadvalda ${cellText(row.closing, row.product)}, qo'lida ${cellText(row.onHand, row.product)}`).join("\n");
  return (
    <span role="status" title={details} className="text-danger mt-1 flex items-start gap-1 text-fine font-semibold">
      <TriangleAlert aria-hidden className="mt-px size-3 shrink-0" />
      <span>{`Qoldiq skladdan farq qiladi: ${mismatch.length} ta`}</span>
    </span>
  );
}

/** Qabul va tuzatish — oyna bilan (sklad hujjati §6). Berish — «Berish kerak» qatorida, oynasiz. */
export type ReturnMode = Extract<CourierDocumentMode, "courier_return" | "adjustment">;

function StockActions({ courier, onDocument }: { courier: CourierRef; onDocument: (mode: ReturnMode, courier: CourierRef) => void }) {
  return (
    <span className="mt-1.5 flex flex-wrap gap-1">
      <Button size="xs" variant="outline" aria-label={`${courier.fullName}: qabul`} onClick={() => onDocument("courier_return", courier)}>
        <ArrowDownToLine />
        Qabul
      </Button>
      <Button size="xs" variant="ghost" aria-label={`${courier.fullName}: tuzatish`} onClick={() => onDocument("adjustment", courier)}>
        <SlidersHorizontal />
        Tuzatish
      </Button>
    </span>
  );
}

/**
 * Blok turi: kuryer (yoki oraliqda viloyat) — oddiy; viloyat jami va «JAMI» — xira
 * fonli yig'indi; `own` — «Kuryersiz»: pul bosh kuryerning o'zida, topshirish yo'q.
 */
type BlockVariant = "plain" | "region" | "total" | "own";

/** Yig'indi bloklari xira fonda; kuryer va «Kuryersiz» — oddiy. */
const isSummary = (variant: BlockVariant) => variant === "region" || variant === "total";

/** Bitta kun ochiq kuryer bloki — qo'lda yoziladigan pul va «Oldim» shu yerda. */
type BlockEdit = { courier: CourierRef; date: string; actions: SheetActions | null };

/** Bitta blok qatorlari: chapda blok boshi, o'rtada mahsulot qatorlari, o'ngda pul kataklari (hamma qatorga cho'zilgan). */
function FigureRows({
  figures,
  products,
  lead,
  fee,
  variant = "plain",
  extra = null,
  edit = null,
  flows = FLOW_ROWS,
}: {
  figures: SheetFigures;
  products: readonly SheetProduct[];
  lead: React.ReactNode;
  fee: React.ReactNode;
  variant?: BlockVariant;
  extra?: ExtraRow | null;
  edit?: BlockEdit | null;
  /** Qaysi mahsulot qatorlari chiziladi — sukut to'rttasi. */
  flows?: readonly FlowRow[];
}) {
  const rows = rowsOf(figures, products, extra, flows);
  return (
    <>
      {rows.map((row, index) => (
        <tr key={row.key}>
          {index === 0 ? (
            <LeadCell rowSpan={rows.length} className={isSummary(variant) ? "bg-subtle" : undefined}>
              {lead}
            </LeadCell>
          ) : null}
          {row.render ? (
            row.render(index === 0)
          ) : (
            <>
              <RowLabel tone={row.tone} start={index === 0}>
                {row.label}
              </RowLabel>
              <QtyCells cells={row.cells} products={products} tone={row.tone} zero={row.zero} signed={row.signed} start={index === 0} titleOf={row.titleOf} />
            </>
          )}
          {index === 0 ? <MoneyCells figures={figures} rowSpan={rows.length} fee={fee} variant={variant} edit={edit} /> : null}
        </tr>
      ))}
    </>
  );
}

const MONEY = cn(CELL, BLOCK_START);

function MoneyCells({
  figures,
  rowSpan,
  fee,
  variant,
  edit,
}: {
  figures: SheetFigures;
  rowSpan: number;
  fee: React.ReactNode;
  variant: BlockVariant;
  edit: BlockEdit | null;
}) {
  const surface = isSummary(variant) ? "bg-subtle" : "bg-surface";
  const total = variant === "total";
  // «Kuryersiz»: pul bosh kuryerning o'zida — kuryerdan olinmaydi (`handover_due` doim 0, 125 C §4).
  const own = variant === "own";
  const money = sheetMoney(figures);
  const cash = figures.cash;
  const editing = edit !== null && cash !== null;
  // Qo'shimcha manzil «Borganda atkaz» ichida (2026-11-26, egasi) — alohida ustun emas.
  const refused = refusedWithExtra(figures);
  return (
    <>
      <td rowSpan={rowSpan} className={cn(MONEY, surface, "text-right")}>
        <Amount value={money.sales} hint="sovg'asiz" strong />
      </td>
      <td rowSpan={rowSpan} className={cn(MONEY, editing ? "bg-subtle" : surface, "text-right")}>
        {editing ? <CourierOnlineEditor courier={edit.courier} date={edit.date} cash={cash} /> : <Amount value={money.online} hint="Click · Payme" />}
      </td>
      <td rowSpan={rowSpan} className={cn(MONEY, editing ? "bg-subtle" : surface, "text-right")}>
        {editing ? <CourierDiscountEditor courier={edit.courier} date={edit.date} cash={cash} /> : <Amount value={money.discount} hint="ball + qo'lda" />}
      </td>
      <td rowSpan={rowSpan} className={cn(MONEY, "bg-subtle")}>
        {fee}
      </td>
      <td rowSpan={rowSpan} className={cn(MONEY, "text-right", total ? "bg-brand text-brand-ink" : "bg-brand-soft text-brand")}>
        <span className="tabular block text-body font-bold whitespace-nowrap">{own ? "—" : moneyText(money.due)}</span>
        <span className="block text-fine whitespace-nowrap">
          {own
            ? "pul sizda"
            : money.openingDebt !== null && money.openingDebt > 0
              ? `o'tgan qarz ${groupThousands(money.openingDebt)} bilan`
              : "kuryer topshiradi"}
        </span>
      </td>
      <td rowSpan={rowSpan} className={cn(MONEY, surface, "text-right")}>
        <Handed money={money} />
        {editing && edit.actions ? (
          <ReceiptAction action={cashAction(cash, { single: true, canAccept: edit.actions.canAccept })} courier={edit.courier} onOpen={edit.actions.onReceipt} />
        ) : null}
      </td>
      <td rowSpan={rowSpan} className={cn(MONEY, surface, "text-ink tabular text-center text-lg2 font-semibold")} title={addressHint(figures)}>
        <AddressCount figures={figures} />
      </td>
      <td
        rowSpan={rowSpan}
        className={cn(MONEY, surface, "tabular text-center text-lg2 font-semibold", refused > 0 ? "text-danger" : "text-ink-faint")}
        title={extraShareHint(figures)}
      >
        {groupThousands(refused)}
      </td>
    </>
  );
}

/**
 * Manzil soni (hujjat 108): kuryer «yetkazdim» bosgan zahoti sukut 1 bilan
 * hisoblanadi, logist tasdiqlaganda o'z soni bilan almashadi — tasdiqlanmagani ostida.
 */
function AddressCount({ figures }: { figures: Pick<SheetFigures, "addresses" | "pendingAddresses"> }) {
  return (
    <>
      {groupThousands(figures.addresses)}
      {figures.pendingAddresses > 0 ? (
        <span className="text-ink-muted block text-fine leading-tight font-normal">{`shundan ${groupThousands(figures.pendingAddresses)} tasdiqlanmagan`}</span>
      ) : null}
    </>
  );
}

function addressHint(figures: Pick<SheetFigures, "pendingAddresses">): string | undefined {
  return figures.pendingAddresses > 0 ? "Manzil kuryer bosgan zahoti hisoblangan, logist tasdig'ida aniqlashadi" : undefined;
}

/** «Topshirdi» — kuryerdan olingan pul («Oldim»), ostida qolgan qarz (ertaga o'tadi). Blok kelmasa — «—». */
function Handed({ money }: { money: SheetMoney }) {
  return (
    <>
      <span className={cn("tabular block text-body font-semibold whitespace-nowrap", money.received ? "text-ink" : "text-ink-faint")}>
        {money.received ? groupThousands(money.received) : "—"}
      </span>
      {money.debt !== null && money.debt > 0 ? (
        <span className="text-danger block text-fine font-medium whitespace-nowrap">{`qoldi ${groupThousands(money.debt)}`}</span>
      ) : money.debt !== null && money.due !== null && money.due > 0 ? (
        <span className="text-ok block text-fine font-medium">to&apos;liq</span>
      ) : null}
    </>
  );
}

/** «Oldim» (qarz bor) yoki «✓ olindi» (yozuvlarni ko'rish, kerak bo'lsa bekor qilish). */
function ReceiptAction({ action, courier, onOpen }: { action: ReturnType<typeof cashAction>; courier: CourierRef; onOpen: (courier: CourierRef) => void }) {
  if (action === "take") {
    return (
      <Button size="xs" className="mt-1.5 w-full" aria-label={`${courier.fullName}: pul oldim`} onClick={() => onOpen(courier)}>
        <HandCoins />
        Oldim
      </Button>
    );
  }
  if (action === "taken") {
    return (
      <Button size="xs" variant="ghost" className="text-ok mt-1 w-full" aria-label={`${courier.fullName}: olingan pullar`} onClick={() => onOpen(courier)}>
        ✓ olindi
      </Button>
    );
  }
  return null;
}

function Amount({ value, hint, strong = false }: { value: number | null; hint: string; strong?: boolean }) {
  return (
    <>
      <span className={cn("text-ink tabular block text-body whitespace-nowrap", strong ? "font-bold" : "font-semibold")}>{moneyText(value)}</span>
      <span className="text-ink-faint block text-fine">{hint}</span>
    </>
  );
}

/** Kuryer xizmati — faqat o'qish: oraliqda kunlik yozuvlar yig'indisi, «JAMI» da hamma kuryer. */
function FeeSum({ fee, hint }: { fee: CourierFee | null; hint: string }) {
  return (
    <div className="text-right">
      <span className="text-ink tabular block text-body font-semibold whitespace-nowrap">{moneyText(fee?.amount ?? null)}</span>
      <span className="text-ink-faint block text-fine">{hint}</span>
    </div>
  );
}

const DAY_CELL = cn(CELL, "bg-surface text-ink-muted tabular whitespace-nowrap");

/**
 * Kunma-kun (oraliqda, `days[]`): bir kun — bir qator, ustunlar jadval bilan
 * bir xil. Mahsulotlarda o'sha kunning sotuvi; sana bosilsa o'sha kun ochiladi
 * (to'liq qatorlar, qo'lda yoziladigan pul va «Oldim» shu yerda).
 */
function DayRow({ day, products, onOpen }: { day: SheetDay; products: readonly SheetProduct[]; onOpen: () => void }) {
  const money = sheetMoney(day);
  return (
    <tr>
      <th scope="row" className="border-line bg-surface sticky left-0 z-10 border-r border-b px-3 py-2 text-left font-normal">
        <button
          type="button"
          onClick={onOpen}
          aria-label={`${fullDate(day.date)} kunini ochish`}
          className="text-brand tabular text-meta font-semibold hover:underline focus-visible:underline focus-visible:outline-none"
        >
          {shortDate(day.date)}
        </button>
      </th>
      <RowLabel tone="ok">Sotilgan</RowLabel>
      <QtyCells cells={day.sold} products={products} tone="ok" />
      <td className={cn(DAY_CELL, "text-right")}>{moneyText(money.sales)}</td>
      <td className={cn(DAY_CELL, "text-right")}>{moneyText(money.online)}</td>
      <td className={cn(DAY_CELL, "text-right")}>{moneyText(money.discount)}</td>
      <td className={cn(DAY_CELL, "text-right")}>{moneyText(money.fee)}</td>
      <td className={cn(DAY_CELL, "text-brand text-right font-semibold")}>{moneyText(money.due)}</td>
      <td className={cn(DAY_CELL, "text-right")}>{moneyText(money.received)}</td>
      <td className={cn(DAY_CELL, "text-center")} title={addressHint(day)}>
        <AddressCount figures={day} />
      </td>
      <td className={cn(DAY_CELL, "text-center")} title={extraShareHint(day)}>
        {groupThousands(refusedWithExtra(day))}
      </td>
    </tr>
  );
}
