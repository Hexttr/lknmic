import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import type { SessionData } from "@/lib/session";
import { getSessionOptions } from "@/lib/session";

/**
 * Включить/выключить просмотр ЛК как пациент (только для role ADMIN).
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const enabled =
    typeof body === "object" &&
    body !== null &&
    "enabled" in body &&
    (body as { enabled: unknown }).enabled === true;

  const session = await getIronSession<SessionData>(
    await cookies(),
    getSessionOptions(),
  );
  if (!session.isLoggedIn || session.role !== Role.ADMIN) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  session.patientMode = enabled;
  await session.save();

  return NextResponse.json({ ok: true, patientMode: session.patientMode });
}
