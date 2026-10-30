import {
  asArray,
  asInt,
  asNumber,
  asOptionalInt,
  asOptionalNumber,
  asRecord,
  asString,
} from "@/lib/parse";

/**
 * Logist statistikasi — `GET /operator/logist/statistics/`
 * (2026-10-01 C §14).
 *
 * Hamma son **serverdan**; panel faqat nisbat chiqaradi (kuryer
 * muvaffaqiyati `delivered / assigned`, §14.4).
 *
 * ⚠️ Uch xil SANA MAYDONI — uch xil to'plam (§14.5 ogohlantirishi):
 *   `delivered*`            — `delivered_at` davrida;
 *   `cancelled`             — `cancelled_at` davrida;
 *   `orders`, `inProgress`, `payableAmount`, `attempts` — `created_at` davrida.
 * Shuning uchun `orders ≠ delivered + cancelled + inProgress`, va ular bir
 * butunning qismlari sifatida (ulush, 100 % chiziq) KO'RSATILMAYDI.
 *
 * Yangi kalitlar test serverda, prodda hali yo'q — kelmasa `null` ("—"),
 * nol EMAS.
 */
export type LogistStatistics = {
  totals: {
    delivered: number;
    /** MOL summasi (`total_amount`) — chegirma va balldan OLDIN. Kassa emas. */
    deliveredAmount: number;
    /** Mijoz haqiqatan to'lagan (`delivered_payable_amount`) — kassa tushumi. */
    deliveredPayableAmount: number | null;
    cancelled: number;
    attempts: number;
    /** `confirmed → delivered` o'rtachasi; ma'lumot yo'q — `null`. */
    avgDeliveryMinutes: number | null;
    /** Naqd yetkazilganlarning TO'LANADIGAN summasi. */
    codTotal: number | null;
    /** Davrda YARATILGAN buyurtmalar. */
    orders: number | null;
    /** Davrda yaratilgan, `delivered`/`cancelled` dan boshqa statusdagilar. */
    inProgress: number | null;
    /** Davrning hamma buyurtmasi bo'yicha to'lanadigan summa. */
    payableAmount: number | null;
    /** "Xato bosildi" — `delivered`/`cancelled` dan qaytarishlar (`LOGIST_04` A5). */
    reverts: number | null;
    /**
     * Manzil soni (`stops`): to'xtashsiz yetkazilgan + alohida to'xtashlar
     * (`LOGIST_03` §3) + logistning qo'lda tuzatishi. 1 manzil = 1 to'lov.
     */
    stops: number | null;
    /** Shundan logist qo'lda qo'shgan/ayirgani (`stops_manual`); eski deploy — `null`. */
    stopsManual: number | null;
    /** Stavka, so'm / manzil; belgilanmagan — `0`. */
    courierPayRate: number | null;
    /** `stops × stavka` (yetkazish kuniga amal qilgan stavka). */
    courierPay: number | null;
  };
  /** Kim necha marta orqaga qaytargan — ko'pi birinchi. */
  revertsBy: Array<{ actorName: string; count: number }>;
  /**
   * Kunlik dinamika, eskidan yangiga. `amount` — yetkazilganlarning MOL
   * summasi. `sum(cancelled)` `totals.cancelled` dan kichik bo'lishi mumkin
   * (`cancelled_at` bo'sh eski qatorlar kunlik qatorga tushmaydi, §14.3) —
   * jami kunliklardan HISOBLANMAYDI.
   */
  daily: Array<{
    date: string;
    delivered: number;
    amount: number;
    /** Shu kuni yaratilgan; eski deploy bermasa `null`. */
    orders: number | null;
    /** Shu kuni bekor qilingan; eski deploy bermasa `null`. */
    cancelled: number | null;
  }>;
  /** Kuryerlar — server tartibida (yetkazgani ko'pi, oxirida `delivered: 0`). */
  couriers: Array<{
    id: number;
    fullName: string;
    delivered: number;
    avgMinutes: number | null;
    codTotal: number;
    /** Davrda biriktirilgan; eski deploy bermasa `null`. */
    assigned: number | null;
    /** Davrdagi yetkazish urinishlari; eski deploy bermasa `null`. */
    attempts: number | null;
    /** Manzil soni (avto + qo'lda) va kuryer haqi; eski deploy bermasa `null`. */
    stops: number | null;
    /** Shundan qo'lda tuzatish (+/−); eski deploy — `null`. */
    stopsManual: number | null;
    pay: number | null;
  }>;
};

export function mapLogistStatistics(raw: unknown): LogistStatistics {
  const json = asRecord(raw);
  const totals = asRecord(json.totals);

  return {
    totals: {
      delivered: asInt(totals.delivered),
      deliveredAmount: asNumber(totals.delivered_amount),
      deliveredPayableAmount: asOptionalNumber(totals.delivered_payable_amount),
      cancelled: asInt(totals.cancelled),
      attempts: asInt(totals.attempts),
      avgDeliveryMinutes: asOptionalInt(totals.avg_delivery_minutes),
      codTotal: asOptionalNumber(totals.cod_total),
      orders: asOptionalInt(totals.orders),
      inProgress: asOptionalInt(totals.in_progress),
      payableAmount: asOptionalNumber(totals.payable_amount),
      reverts: asOptionalInt(totals.reverts),
      stops: asOptionalInt(totals.stops),
      stopsManual: asOptionalInt(totals.stops_manual),
      courierPayRate: asOptionalNumber(totals.courier_pay_rate),
      courierPay: asOptionalNumber(totals.courier_pay),
    },

    revertsBy: asArray(json.reverts_by)
      .map((item) => {
        const row = asRecord(item);
        return { actorName: asString(row.actor_name), count: asInt(row.count) };
      })
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count),

    // Server `date` bo'yicha o'sish tartibida beradi (§14.3).
    daily: asArray(json.daily)
      .map((item) => {
        const day = asRecord(item);
        return {
          date: asString(day.date),
          delivered: asInt(day.delivered),
          amount: asNumber(day.amount),
          orders: asOptionalInt(day.orders),
          cancelled: asOptionalInt(day.cancelled),
        };
      })
      .filter((day) => day.date),

    // Server tartibi (§14.4) saqlanadi: ishlamayotgan kuryerlar oxirida.
    couriers: asArray(json.couriers).map((item) => {
      const courier = asRecord(item);
      return {
        id: asInt(courier.id),
        fullName: asString(courier.full_name),
        delivered: asInt(courier.delivered),
        avgMinutes: asOptionalInt(courier.avg_minutes),
        codTotal: asNumber(courier.cod_total),
        assigned: asOptionalInt(courier.assigned),
        attempts: asOptionalInt(courier.attempts),
        stops: asOptionalInt(courier.stops),
        stopsManual: asOptionalInt(courier.stops_manual),
        pay: asOptionalNumber(courier.pay),
      };
    }),
  };
}
