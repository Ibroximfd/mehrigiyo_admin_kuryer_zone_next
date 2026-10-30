import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PaymentBadge } from "./components/payment-badge";

/**
 * `PaymentBadge` `cn()` orqali `text-micro`/`text-fine` ni ton rangi bilan
 * birga beradi. `cn` maxsus o'lchamni rang deb o'qigan paytda compact
 * nishoncha o'lchamini yo'qotardi (audit L-1) — bu test ildiz tuzatilganini
 * komponentning o'zida qadaydi.
 */
const base = {
  isPaid: null,
  paidAt: null,
  paidAmount: null,
  paymentMethod: "cash",
  payableAmount: 100000,
  // `cod_pending` → `gold` ton (`PAYMENT_STATUS_VIEWS`).
  paymentStatus: "cod_pending",
};

function classesOf(html: string): string {
  return /class="([^"]*)"/.exec(html)?.[1] ?? "";
}

describe("PaymentBadge — o'lcham va rang birga saqlanadi", () => {
  it("compact: `text-micro` ham, `text-gold` ham bor", () => {
    const classes = classesOf(
      renderToStaticMarkup(createElement(PaymentBadge, { order: base, compact: true })),
    );
    expect(classes).toContain("text-micro");
    expect(classes).toContain("text-gold");
    expect(classes).not.toContain("text-fine");
  });

  it("to'liq: `text-fine` ham, `text-gold` ham bor", () => {
    const classes = classesOf(
      renderToStaticMarkup(createElement(PaymentBadge, { order: base })),
    );
    expect(classes).toContain("text-fine");
    expect(classes).toContain("text-gold");
    expect(classes).not.toContain("text-micro");
  });

  it("chaqiruvchining `className` dagi rangi ustun, o'lcham qoladi", () => {
    const classes = classesOf(
      renderToStaticMarkup(
        createElement(PaymentBadge, { order: base, compact: true, className: "text-ink" }),
      ),
    );
    expect(classes).toContain("text-micro");
    expect(classes).toContain("text-ink");
    expect(classes).not.toContain("text-gold");
  });
});
