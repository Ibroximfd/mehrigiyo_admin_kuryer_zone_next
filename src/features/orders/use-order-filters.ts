"use client";

import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  useQueryState,
} from "nuqs";
import { useCallback } from "react";

import { DEFAULT_ORDER_PERIOD } from "@/features/orders/types";

/**
 * Buyurtmalar sahifasining barcha filtrlari — bitta joyda.
 *
 * Hammasi manzil qatorida (`nuqs`): sahifa yangilansa ham holat saqlanadi,
 * havolani hamkasbga tashlash mumkin. Ilgari o'n ikkita `useQueryState`
 * sahifaning o'zida yotardi, "hammasini tozalash" ro'yxati esa ikki joyda
 * takrorlanardi — endi tozalash va faol filtrlar soni shu yerda hisoblanadi
 * va sahifa ham, filtr qatori ham bitta manbadan o'qiydi.
 */
export function useOrderFilters() {
  const [period, setPeriod] = useQueryState(
    "period",
    /*
      Sukutda — barchasi. Ilgari "bugun" turardi va kecha tushgan, hali
      yetkazilmagan buyurtma ekranda yo'q bo'lib ketardi: logist uni faqat
      davrni qo'lda kengaytirgandagina ko'rardi. Ro'yxat to'liq ochiladi,
      toraytirish esa logistning ixtiyorida.
    */
    parseAsString
      .withDefault(DEFAULT_ORDER_PERIOD)
      .withOptions({ clearOnDefault: true }),
  );
  const [statuses, setStatuses] = useQueryState(
    "status",
    parseAsArrayOf(parseAsString).withDefault([]).withOptions({
      clearOnDefault: true,
    }),
  );
  const [dateFrom, setDateFrom] = useQueryState("from", parseAsString);
  const [dateTo, setDateTo] = useQueryState("to", parseAsString);
  const [courierId, setCourierId] = useQueryState("courier", parseAsInteger);
  /** Bosh kuryer (id yoki `none`) — logist zakazni bosh kuryerga beradi. */
  const [chief, setChief] = useQueryState("chief", parseAsString);
  /* Filial filtri yo'q: logist faqat o'z filialida ishlaydi — backend
     buyurtmalarni sessiyadagi filial bo'yicha o'zi cheklaydi. */
  const [source, setSource] = useQueryState("source", parseAsString);
  /* To'lov filtrlari serverda ishlaydi: `?payment_state=` (paid · unpaid ·
     refunded, 2026-10-01 C §11.2) va `?payment_method=`. Ular ham manzil qatorida — "kim to'lamagan"
     ro'yxatini hamkasbga havola qilib tashlash mumkin. */
  const [paidFilter, setPaidFilter] = useQueryState("paid", parseAsString);
  const [methodFilter, setMethodFilter] = useQueryState("pm", parseAsString);
  const [search, setSearch] = useQueryState(
    "q",
    parseAsString
      .withDefault("")
      .withOptions({ throttleMs: 400, clearOnDefault: true }),
  );
  /** Ro'yxat ustidagi klient-tomonlama saralashlar (URLda turadi). */
  const [tagFilter, setTagFilter] = useQueryState("tag", parseAsString);
  const [flagFilter, setFlagFilter] = useQueryState("flag", parseAsString);
  /**
   * Guruhlash — ko'rinish sozlamasi, filtr emas: u qatorlarni kamaytirmaydi.
   * Shuning uchun hisobga kirmaydi, lekin "tozalash" uni ham o'chiradi —
   * qatorda o'z pilli bor va tozalashdan keyin yolg'iz yonib turishi
   * "hammasi tozalandi" degan va'daga zid bo'lardi.
   */
  const [grouping, setGrouping] = useQueryState("group", parseAsString);
  /*
   * Yaratdi · Ilova · Yetk. sana · Viloyat · tezkor chip — server
   * parametrlariga aylanadi (`server-filters.ts`, 2026-10-01 C §11).
   * "Yangi" / "Yangi xabar" chiplari mijozda (`client-filters.ts`).
   */
  const [creator, setCreator] = useQueryState("creator", parseAsString);
  const [app, setApp] = useQueryState("app", parseAsString);
  const [deliveryDate, setDeliveryDate] = useQueryState("ddate", parseAsString);
  // Bir nechta viloyat (2026-10-29): `?region=fargona,andijon`.
  const [regions, setRegions] = useQueryState(
    "region",
    parseAsArrayOf(parseAsString).withDefault([]).withOptions({ clearOnDefault: true }),
  );
  const [quick, setQuick] = useQueryState("quick", parseAsString);
  /*
   * Hudud (2026-10-15): tuman kodlari, zona id lari (yoki `none` —
   * "Hududi noma'lum") va taklif bor/yo'q.
   */
  const [districts, setDistricts] = useQueryState(
    "district",
    parseAsArrayOf(parseAsString).withDefault([]).withOptions({ clearOnDefault: true }),
  );
  const [zones, setZones] = useQueryState(
    "zone",
    parseAsArrayOf(parseAsString).withDefault([]).withOptions({ clearOnDefault: true }),
  );
  const [suggested, setSuggested] = useQueryState("suggested", parseAsString);

  const hasCustomDates = Boolean(dateFrom || dateTo);
  const periodActive = period !== DEFAULT_ORDER_PERIOD || hasCustomDates;

  /**
   * Faol filtr guruhlari soni — "Tozalash · 3" yozuvi uchun. To'lov
   * holati va turi bitta guruh: ular bitta pillda turadi va foydalanuvchi
   * ularni bitta filtr deb o'qiydi.
   */
  const activeCount = [
    search.trim() !== "",
    periodActive,
    statuses.length > 0,
    courierId !== null,
    source !== null,
    paidFilter !== null || methodFilter !== null,
    tagFilter !== null,
    flagFilter !== null,
    creator !== null,
    app !== null,
    deliveryDate !== null,
    regions.length > 0,
    chief !== null,
    quick !== null,
    districts.length > 0,
    zones.length > 0,
    suggested !== null,
  ].filter(Boolean).length;

  const clearAll = useCallback(() => {
    void setSearch(null);
    void setPeriod(DEFAULT_ORDER_PERIOD);
    void setDateFrom(null);
    void setDateTo(null);
    void setStatuses(null);
    void setCourierId(null);
    void setSource(null);
    void setPaidFilter(null);
    void setMethodFilter(null);
    void setTagFilter(null);
    void setFlagFilter(null);
    void setGrouping(null);
    void setCreator(null);
    void setApp(null);
    void setDeliveryDate(null);
    void setRegions(null);
    void setChief(null);
    void setQuick(null);
    void setDistricts(null);
    void setZones(null);
    void setSuggested(null);
  }, [
    setSearch,
    setPeriod,
    setDateFrom,
    setDateTo,
    setStatuses,
    setCourierId,
    setSource,
    setPaidFilter,
    setMethodFilter,
    setTagFilter,
    setFlagFilter,
    setGrouping,
    setCreator,
    setApp,
    setDeliveryDate,
    setRegions,
    setChief,
    setQuick,
    setDistricts,
    setZones,
    setSuggested,
  ]);

  return {
    period,
    setPeriod,
    statuses,
    setStatuses,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    courierId,
    setCourierId,
    source,
    setSource,
    paidFilter,
    setPaidFilter,
    methodFilter,
    setMethodFilter,
    search,
    setSearch,
    tagFilter,
    setTagFilter,
    flagFilter,
    setFlagFilter,
    grouping,
    setGrouping,
    creator,
    setCreator,
    app,
    setApp,
    deliveryDate,
    setDeliveryDate,
    regions,
    setRegions,
    chief,
    setChief,
    quick,
    setQuick,
    districts,
    setDistricts,
    zones,
    setZones,
    suggested,
    setSuggested,
    hasCustomDates,
    periodActive,
    activeCount,
    clearAll,
  };
}

export type OrderFilters = ReturnType<typeof useOrderFilters>;
