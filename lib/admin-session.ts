import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import type { SessionData } from "@/lib/session";
import { getSessionOptions } from "@/lib/session";

export async function getAdminSession(): Promise<
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
  if (session.role !== Role.ADMIN) {
    return { ok: false, status: 403 };
  }
  return { ok: true, userId: session.userId };
}
