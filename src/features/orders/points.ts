import { formatSom, groupThousands } from "@/lib/format";

/**
 * Ball chegirmasi — model qoidalari (`OPERATOR_BALL_FRONTEND.md`).
 *
 * Mijoz ilovadan buyurtma berganda ball ishlatishi mumkin: 1 000 ball =
 * 100 000 so'm. Shundan keyin buyurtmada ikkita summa bo'ladi:
 *
 *   `totalAmount`   — mol summasi, faqat **tafsilot**;
 *   `payableAmount` — mijoz **haqiqatan to'laydigan** puli, hamma joyda
 *                     asosiy raqam.
 *
 * Ball ishlatilmagan buyurtmada ikkalasi teng, ya'ni eski buyurtmalarda
 * ko'rinish o'zgarmaydi.
 */
export type OrderAmountFacts = {
  totalAmount: number;
  payableAmount: number;
  pointsUsed: number;
  pointsDiscount: number;
};

export function hasPointsDiscount(
  order: Pick<OrderAmountFacts, "pointsUsed">,
): boolean {
  return order.pointsUsed > 0;
}

/**
 * Chop etiladigan varaqa va ulashish matni uchun qo'shimcha qator:
 * kuryer to'lanadigan summani ko'radi, mol summasi esa izoh bo'lib qoladi.
 * Ball yo'q bo'lsa — bo'sh satr, ya'ni matn avvalgidek qoladi.
 */
export function pointsNote(order: OrderAmountFacts): string {
  if (!hasPointsDiscount(order)) return "";
  return `${groupThousands(order.pointsUsed)} ball chegirma −${formatSom(
    order.pointsDiscount,
  )} (mahsulotlar ${formatSom(order.totalAmount)})`;
}
