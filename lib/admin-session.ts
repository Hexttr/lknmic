import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import type { SessionData } from "@/lib/session";
import { getSessionOptions } from "@/lib/session";
import { resolveSessionRole } from "@/lib/session-role";

export type AdminSessionOptions = {
  /**
   * Если true (по умолчанию), в режиме «как пациент» доступ к админ-API запрещён.
   */
  panelOnly?: boolean;
};

export async function getAdminSession(
  options?: AdminSessionOptions,
): Promise<
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403 }
> {
  const panelOnly = options?.panelOnly !== false;
  const session = await getIronSession<SessionData>(
    await cookies(),
    getSessionOptions(),
  );
  if (!session.isLoggedIn || !session.userId) {
    return { ok: false, status: 401 };
  }

  const role = await resolveSessionRole(session);
  if (role === null) {
    return { ok: false, status: 401 };
  }
  if (role !== Role.ADMIN) {
    return { ok: false, status: 403 };
  }
  if (panelOnly && session.patientMode) {
    return { ok: false, status: 403 };
  }
  return { ok: true, userId: session.userId };
}
