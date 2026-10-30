/**
 * Brauzerning parol menejeri bilan ishlash — Credential Management API.
 *
 * Uch vazifa:
 *   save   — muvaffaqiyatli login'dan keyin hisobni brauzerga saqlashni
 *            taklif qiladi (Chrome tepada "Parolni saqlaysizmi?" chiqaradi);
 *   get    — saqlangan hisobni qaytaradi. Chrome'da "avtomatik kirish"
 *            yoniq bo'lsa hech qanday so'roqsiz, jimgina keladi — operator
 *            login sahifasini ko'rmasdanoq ichkariga kiradi;
 *   preventSilentSignIn — operator o'zi "Chiqish"ni bosganidan keyin jim
 *            avto-kirish aylanib qaytib kelmasligi uchun to'siq.
 *
 * API faqat Chromium oilasida bor (Chrome, Edge, Arc). Safari/Firefox'da
 * hamma metod jim o'tib ketadi — u yerda brauzerning odatiy autofill'i
 * ishlayveradi (formadagi `autoComplete` atributlari buni ta'minlaydi).
 */

/* TypeScript'ning DOM kutubxonasida `PasswordCredential` yo'q (spec Chrome
   doirasida qolgan) — kamini shu yerda to'ldiramiz. */
declare global {
  interface PasswordCredentialData {
    id: string;
    password: string;
    name?: string;
    iconURL?: string;
  }

  interface PasswordCredential extends Credential {
    readonly password: string;
    readonly name: string;
  }

  var PasswordCredential: {
    prototype: PasswordCredential;
    new (data: PasswordCredentialData): PasswordCredential;
  };

  interface CredentialRequestOptions {
    /** Parol turidagi hisoblarni so'rash (Credential Management spec). */
    password?: boolean;
  }
}

const isSupported = () =>
  typeof window !== "undefined" && "PasswordCredential" in window;

export const credentials = {
  /** Hisobni brauzer parol menejeriga saqlashni taklif qiladi. */
  async save(phone: string, password: string): Promise<void> {
    if (!isSupported()) return;
    try {
      await navigator.credentials.store(
        new PasswordCredential({
          id: phone,
          password,
          name: "Mehrigiyo logist",
        }),
      );
    } catch {
      // Operator taklifni rad etdi yoki brauzer bloklagan — bu xato emas.
    }
  },

  /**
   * Saqlangan hisobni oladi. `mediation: "optional"` — bitta hisob bo'lsa va
   * avtomatik kirish yoniq bo'lsa jim qaytadi; bir nechta bo'lsa brauzer
   * o'zining tanlash oynachasini ko'rsatadi (bir bosish, terish yo'q).
   */
  async get(): Promise<{ phone: string; password: string } | null> {
    if (!isSupported()) return null;
    try {
      const credential = await navigator.credentials.get({
        password: true,
        mediation: "optional",
      });
      if (credential?.type === "password") {
        const { id, password } = credential as PasswordCredential;
        if (password) return { phone: id, password };
      }
    } catch {
      // Ruxsat yo'q yoki so'rov bekor qilingan — forma odatdagidek qoladi.
    }
    return null;
  },

  /**
   * Keyingi `get` jim o'tmasligini so'raydi — logout'dan keyin chaqiriladi,
   * aks holda "Chiqish" bosilgan zahoti avto-kirish qaytadan kiritib yuboradi.
   */
  async preventSilentSignIn(): Promise<void> {
    if (typeof navigator === "undefined" || !navigator.credentials) return;
    try {
      await navigator.credentials.preventSilentAccess();
    } catch {
      // Qo'llab-quvvatlanmasa ham hech narsa buzilmaydi.
    }
  },
};
