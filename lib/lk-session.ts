import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import type { SessionData } from "@/lib/session";
import { getSessionOptions } from "@/lib/session";

/**
 * Доступ к функциям ЛК пациента: пациент или админ в режиме «как пациент».
 */
export async function getLkSession(): Promise<
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403 }
> {
  const session = await getIronSession<SessionData>(
    await cookies(),
    getSessionOptions(),
  );
  if (!session.isLoggedIn || !session.userId) {
    return { ok: false, status: 401 };
  }
  if (session.role === Role.PATIENT) {
    return { ok: true, userId: session.userId };
  }
  if (session.role === Role.ADMIN && session.patientMode) {
    return { ok: true, userId: session.userId };
  }
  return { ok: false, status: 403 };
}
