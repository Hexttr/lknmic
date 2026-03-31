import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionData } from "@/lib/session";

/** Десериализация cookie может отдавать строку; сравнение с enum иногда не срабатывает. */
export function normalizeRole(role: unknown): Role | undefined {
  if (role === Role.PATIENT || role === "PATIENT") return Role.PATIENT;
  if (role === Role.ADMIN || role === "ADMIN") return Role.ADMIN;
  return undefined;
}

/**
 * Роль из сессии или из БД (если в cookie старая запись без role).
 */
export async function resolveSessionRole(
  session: SessionData,
): Promise<Role | null> {
  const fromCookie = normalizeRole(session.role);
  if (fromCookie !== undefined) return fromCookie;
  if (!session.isLoggedIn || !session.userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true },
  });
  return user?.role ?? null;
}
