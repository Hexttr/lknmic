import type { SessionOptions } from "iron-session";

export type SessionData = {
  userId?: string;
  isLoggedIn: boolean;
};

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
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  };
}
