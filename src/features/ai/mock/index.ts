import { ApiError } from "@/lib/api-client";

/**
 * AI tahlil mock — §9 qoidalari bo'yicha namuna topilmalar. «Qayta
 * tahlil» vaqtni yangilaydi va bitta topilmani aralashtiradi — UI
 * yangilanishi ko'rinsin.
 */
let generatedAt = new Date(new Date().setHours(6, 0, 0, 0)).toISOString();
let runs = 0;

const FINDINGS = [
  { id: "f1", severity: "urgent", area: "stock", title: "Toshkent shahrida «Asal-zanjabil siropi» 9 kunga yetadi", detail: "Uch omborda 90 dona, kuniga 14 sotilyapti. Minimal qoldiq 500.", fix: "300 dona kirim yozing", link: { screen: "sklad_region", region: "toshkent_shahar" } },
  { id: "f2", severity: "urgent", area: "stock", title: "Andijon — Davron Xasanovda manfiy qoldiq", detail: "«Immunitet balzami» −2 dona: yetkazilgan buyurtma kuryerda bo'lmagan moldan yozilgan.", fix: "Kuryer omborini tuzating", link: { screen: "sklad_courier", courier_id: 47 } },
  { id: "f3", severity: "urgent", area: "couriers", title: "Nodir Qosimov 6 kundan beri sotmayapti, unda 44 dona", detail: "Surxondaryo. Oxirgi sotuv 6 kun oldin, mol o'zida.", fix: "Kuryer bilan bog'laning yoki molni qabul qiling", link: { screen: "sklad_courier", courier_id: 55 } },
  { id: "f4", severity: "attention", area: "operators", title: "Kamola Ergashevada otkaz 3 barobar yuqori", detail: "Toshkent filiali: otkaz 19%, filial o'rtachasi 6%. Ko'pi «mijoz olmadi».", fix: "Buyurtmalarini tekshiring — tasdiqlash sifati", link: { screen: "moliya_operator", operator_id: 306 } },
  { id: "f5", severity: "attention", area: "finance", title: "«Shifo choy» sovg'asi haftada 2× oshdi, sotuvi 8% oshdi", detail: "Sovg'a 48 → 96 dona, sotuv 410 → 443 dona. Aksiya samarasi past.", fix: "1+1 shartini ko'rib chiqing", link: { screen: "moliya" } },
  { id: "f6", severity: "attention", area: "leads", title: "Bugun lid → buyurtma 34% — hafta o'rtachasidan 12 punkt past", detail: "Lid 118, buyurtma 40. Instagram manbasida tushish ko'proq.", fix: "Operatorlar yuklamasini tekshiring", link: { screen: "analitika" } },
  { id: "f7", severity: "good", area: "finance", title: "Tushum o'tgan davrdan 11% oshdi", detail: "Qoldi 297 mln → 331 mln. Logistika ulushi o'zgarmadi.", fix: null, link: { screen: "moliya" } },
  { id: "f8", severity: "good", area: "operators", title: "Nilufar Karimova — otkaz 2%, eng past", detail: "Qo'qon filiali, 84 yetkazildi, o'rtacha chek 268 ming.", fix: null, link: { screen: "moliya_operator", operator_id: 300 } },
  { id: "f9", severity: "good", area: "couriers", title: "2 kundan oshgan yo'lda buyurtma yo'q", detail: "18 ta yo'lda, hammasi 1 kun ichida.", fix: null, link: { screen: "analitika" } },
];

const latency = () => new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 200));

export async function mockAi(method: "get" | "post", path: string): Promise<unknown> {
  await latency();
  if (path === "/sklad/ai/run/" && method === "post") {
    runs += 1;
    generatedAt = new Date().toISOString();
    return { started: true };
  }
  if (path === "/sklad/ai/findings/") {
    const findings = runs % 2 === 1 ? FINDINGS.filter((finding) => finding.id !== "f9") : FINDINGS;
    return { generated_at: generatedAt, checked: ["stock", "finance", "operators", "couriers", "leads", "cancels"], findings };
  }
  throw new ApiError(`Mock: ${method.toUpperCase()} ${path} yo'q`, 404);
}
