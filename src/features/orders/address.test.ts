import { describe, expect, it } from "vitest";

import { addressChangedBadge, formatDeliveryAddress } from "./address";
import { mergeDeliveryInfoSnapshot, mergeOrderSnapshot } from "./order-snapshot";
import { mapLogistOrder } from "./types";

const base = {
  id: "o1",
  order_number: "DA-1",
  status: "confirmed",
  client: { full_name: "Bekzod", phone: "+998914004040" },
  items: [],
};

describe("formatDeliveryAddress — viloyat, tuman, mahalla, ko'cha (CRM bilan bir xil)", () => {
  it("to'liq tartib; mahalla trim qilinadi; eski javobda faqat viloyat va ko'cha", () => {
    const fresh = mapLogistOrder({
      ...base,
      delivery: {
        region: "fargona",
        address_text: "Turkiston 7",
        locality: " Navbahor MFY ",
        district: "fargona/qoqon_sh",
        district_display: "Qo'qon sh.",
      },
    });
    expect(fresh.deliveryInfo?.locality).toBe("Navbahor MFY");
    expect(formatDeliveryAddress(fresh)).toBe("Farg'ona viloyati, Qo'qon sh., Navbahor MFY, Turkiston 7");
    expect(formatDeliveryAddress(fresh, { withRegion: false })).toBe("Qo'qon sh., Navbahor MFY, Turkiston 7");

    const old = mapLogistOrder({ ...base, delivery: { region: "buxoro", address_text: "Turkiston 7" } });
    expect(old.deliveryInfo?.locality).toBeNull();
    expect(formatDeliveryAddress(old)).toBe("Buxoro viloyati, Turkiston 7");
  });

  it("faqat tuman (kod zaxira) yoki faqat mahalla bo'lsa — o'sha; hech narsa yo'q — null", () => {
    const districtOnly = mapLogistOrder({ ...base, delivery: { district: "fargona/qoqon_sh" } });
    expect(formatDeliveryAddress(districtOnly)).toBe("fargona/qoqon_sh");
    const localityOnly = mapLogistOrder({ ...base, delivery: { locality: "Beshariq" } });
    expect(formatDeliveryAddress(localityOnly)).toBe("Beshariq");
    expect(formatDeliveryAddress(mapLogistOrder(base))).toBeNull();
    expect(formatDeliveryAddress(mapLogistOrder({ ...base, delivery: { address_text: "  " } }))).toBeNull();
  });

  it("ko'cha matnida tuman yoki mahalla allaqachon bo'lsa qism takrorlanmaydi (eski yozuvlar)", () => {
    const order = mapLogistOrder({
      ...base,
      delivery: {
        region: "fargona",
        district: "fargona/qoqon_sh",
        district_display: "Qo'qon shahri",
        locality: "Navbahor MFY",
        address_text: "qo'qon shahri, Navbahor MFY, Turkiston 7",
      },
    });
    expect(formatDeliveryAddress(order)).toBe("Farg'ona viloyati, qo'qon shahri, Navbahor MFY, Turkiston 7");
    const onlyLocality = mapLogistOrder({
      ...base,
      delivery: { locality: "Navbahor MFY", address_text: "Navbahor MFY, Turkiston 7" },
    });
    expect(formatDeliveryAddress(onlyLocality)).toBe("Navbahor MFY, Turkiston 7");
  });
});

describe("address_changed_by belgisi (HUDUD_3 §2)", () => {
  it("kuryer / logist / mijoz; yo'q yoki noma'lum — belgisiz", () => {
    const courier = mapLogistOrder({ ...base, delivery: { address_changed_by: "courier" } });
    expect(addressChangedBadge(courier)).toMatchObject({
      by: "courier",
      label: "Manzil o'zgartirilgan (kuryer)",
    });
    const logist = mapLogistOrder({ ...base, delivery: { address_changed_by: "logist" } });
    expect(addressChangedBadge(logist)?.label).toBe("Manzil o'zgartirilgan (logist)");

    expect(addressChangedBadge(mapLogistOrder({ ...base, delivery: { address_changed_by: null } }))).toBeNull();
    expect(addressChangedBadge(mapLogistOrder({ ...base, delivery: { address_changed_by: "robot" } }))).toBeNull();
    expect(addressChangedBadge(mapLogistOrder(base))).toBeNull();
  });
});

describe("WS qisqa karta — delivery manzil yamog'i", () => {
  const order = mapLogistOrder({
    ...base,
    delivery: {
      region: "fargona",
      address_text: "Turkiston 5",
      locality: null,
      district: "fargona/qoqon_sh",
      district_display: "Qo'qon sh.",
    },
  });

  it("faqat kelgan kalitlar o'zgaradi, qolgani joyida", () => {
    const merged = mergeOrderSnapshot(order, {
      id: "o1",
      status: "confirmed",
      delivery: {
        address_text: "Turkiston 7",
        locality: "Navbahor MFY",
        address_changed_by: "courier",
      },
    });
    expect(merged.deliveryInfo).toMatchObject({
      address: "Turkiston 7",
      locality: "Navbahor MFY",
      addressChangedBy: "courier",
      region: "fargona",
    });
    expect(merged.zoning.districtDisplay).toBe("Qo'qon sh.");
    expect(formatDeliveryAddress(merged)).toBe("Farg'ona viloyati, Qo'qon sh., Navbahor MFY, Turkiston 7");
  });

  it("`null` — tozalangan; `delivery` bo'lmasa manzil tegilmaydi", () => {
    const cleared = mergeDeliveryInfoSnapshot(order.deliveryInfo, { locality: null });
    expect(cleared?.locality).toBeNull();
    expect(cleared?.address).toBe("Turkiston 5");

    const untouched = mergeOrderSnapshot(order, { id: "o1", status: "shipping" });
    expect(untouched.deliveryInfo).toEqual(order.deliveryInfo);
  });

  it("manzilsiz buyurtmaga delivery kelsa — yangi blok", () => {
    const empty = mapLogistOrder(base);
    expect(empty.deliveryInfo).toBeNull();
    const merged = mergeOrderSnapshot(empty, { id: "o1", delivery: { locality: "Beshariq" } });
    expect(merged.deliveryInfo?.locality).toBe("Beshariq");
  });
});
