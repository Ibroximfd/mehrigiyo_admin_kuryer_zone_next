import { describe, expect, it } from "vitest";

import {
  composeDeliveryAddress,
  districtPayload,
  manualDistrictName,
  type DeliveryAddressFields,
} from "./delivery-address";

const base: DeliveryAddressFields = {
  region: "fargona",
  district: "fargona/qoqon_sh",
  districtManual: false,
  districtManualName: "",
  locality: "",
  addressText: "Navoiy ko'chasi 12",
};

/** Forma qiymatlari — `Pick` tipiga ortiqcha maydon bilan literal emas, o'zgaruvchi orqali. */
const fields = (patch: Partial<DeliveryAddressFields>): DeliveryAddressFields => ({ ...base, ...patch });

describe("composeDeliveryAddress", () => {
  it("ro'yxatdan tanlangan tuman ham, mahalla ham matnga qo'shilmaydi", () => {
    expect(composeDeliveryAddress(fields({ locality: " Yangiobod mahallasi " }))).toBe(
      "Navoiy ko'chasi 12",
    );
  });

  it("qo'lda yozilgan tuman boshiga qo'shiladi", () => {
    expect(
      composeDeliveryAddress(
        fields({ district: "", districtManual: true, districtManualName: " Yangihayot " }),
      ),
    ).toBe("Yangihayot, Navoiy ko'chasi 12");
  });

  it("bo'sh qismlar tashlanadi; ko'cha allaqachon qism bilan boshlansa takrorlanmaydi", () => {
    expect(composeDeliveryAddress(fields({ addressText: "  " }))).toBe("");
    expect(
      composeDeliveryAddress(
        fields({ districtManual: true, districtManualName: "Yangihayot", addressText: "yangihayot, Navoiy 12" }),
      ),
    ).toBe("yangihayot, Navoiy 12");
    expect(
      composeDeliveryAddress(fields({ districtManual: true, districtManualName: "Yangihayot", addressText: "" })),
    ).toBe("Yangihayot");
  });

  it("qo'lda rejim o'chiq bo'lsa yozilgan nom e'tiborsiz", () => {
    expect(manualDistrictName({ districtManual: false, districtManualName: "Yangihayot" })).toBe("");
    expect(manualDistrictName({ districtManual: true, districtManualName: " Yangihayot " })).toBe("Yangihayot");
  });
});

describe("districtPayload", () => {
  it("kod faqat ro'yxatdan tanlanganda", () => {
    expect(districtPayload(base)).toBe("fargona/qoqon_sh");
    expect(districtPayload({ district: "", districtManual: false })).toBeNull();
    expect(districtPayload({ district: "  ", districtManual: false })).toBeNull();
    expect(districtPayload({ district: "fargona/qoqon_sh", districtManual: true })).toBeNull();
  });
});
