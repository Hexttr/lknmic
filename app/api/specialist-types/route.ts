import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import type { SessionData } from "@/lib/session";
import { getSessionOptions } from "@/lib/session";
import { prisma } from "@/lib/prisma";

/** Справочник специалистов — для авторизованных пользователей (ЛК и админка). */
export async function GET() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    getSessionOptions(),
  );
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const types = await prisma.specialistType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      iconKey: true,
      sortOrder: true,
    },
  });

  return NextResponse.json({ specialistTypes: types });
}
