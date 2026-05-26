import type { Role } from "@prisma/client";
import type { SessionOptions } from "iron-session";

export type SessionData = {
  userId?: string;
  isLoggedIn: boolean;
  role?: Role;
  /** Администратор смотрит ЛК как пациент (доступ к /lk, без /admin). */
  patientMode?: boolean;
};

function secureCookieEnabled(): boolean {
  const override = process.env.SESSION_COOKIE_SECURE?.trim().toLowerCase();
  if (override === "true") return true;
  if (override === "false") return false;
  return process.env.NODE_ENV === "production";
}

function sessionPassword(): string {
  const p = process.env.SESSION_SECRET;
  if (!p || p.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set and at least 32 characters long",
    );
  }
  return p;
}

export function getSessionOptions(): SessionOptions {
  return {
    cookieName: "nczd_session",
    password: sessionPassword(),
    ttl: 60 * 60 * 24 * 14,
    cookieOptions: {
      httpOnly: true,
      secure: secureCookieEnabled(),
      sameSite: "lax",
      path: "/",
    },
  };
}
