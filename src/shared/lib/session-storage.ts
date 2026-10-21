import { z } from "zod";

/**
 * Admin sessiyasi `localStorage` da. Kalitlar logist saytidan farq qiladi —
 * bitta brauzerda ikkala panel ochilsa, bir-birining tokenini ezmaydi.
 */

const sessionUserSchema = z.object({
  id: z.number(),
  phone: z.string(),
  isSuperuser: z.boolean(),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;

export type StoredSession = {
  access: string;
  refresh: string | null;
  user: SessionUser | null;
};

const KEYS = {
  access: "mehrigiyo_admin_access",
  refresh: "mehrigiyo_admin_refresh",
  user: "mehrigiyo_admin_user",
} as const;

function read(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    // Xususiy rejim yoki bloklangan saqlash — sessiya yo'q deb hisoblaymiz.
    return null;
  }
}

function write(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null || value === "") window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Saqlab bo'lmasa sessiya faqat shu sahifa umrida yashaydi — qabul qilinadi.
  }
}

function readUser(): SessionUser | null {
  const raw = read(KEYS.user);
  if (!raw) return null;
  try {
    const parsed = sessionUserSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export const sessionStorage = {
  get accessToken(): string | null {
    return read(KEYS.access);
  },

  get refreshToken(): string | null {
    return read(KEYS.refresh);
  },

  read(): StoredSession | null {
    const access = read(KEYS.access);
    if (!access) return null;
    return { access, refresh: read(KEYS.refresh), user: readUser() };
  },

  save(session: StoredSession): void {
    write(KEYS.access, session.access);
    write(KEYS.refresh, session.refresh);
    write(KEYS.user, session.user ? JSON.stringify(session.user) : null);
  },

  saveTokens(access: string, refresh: string | null): void {
    write(KEYS.access, access);
    if (refresh) write(KEYS.refresh, refresh);
  },

  clear(): void {
    for (const key of Object.values(KEYS)) write(key, null);
  },
};
