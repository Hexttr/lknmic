import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import { getAdminSession } from "@/lib/admin-session";
import type { SessionData } from "@/lib/session";
import { getSessionOptions } from "@/lib/session";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/**
 * Снять роль администратора (остаётся пациентом).
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const admin = await getAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: admin.status });
  }

  const { id } = await params;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.role !== Role.ADMIN) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });
  if (adminCount <= 1) {
    return NextResponse.json(
      { error: "Нельзя снять последнего администратора" },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id },
    data: { role: Role.PATIENT },
  });

  const session = await getIronSession<SessionData>(
    await cookies(),
    getSessionOptions(),
  );
  let demotedSelf = false;
  if (session.userId === id) {
    session.role = Role.PATIENT;
    session.patientMode = false;
    await session.save();
    demotedSelf = true;
  }

  return NextResponse.json({ ok: true, demotedSelf });
}
