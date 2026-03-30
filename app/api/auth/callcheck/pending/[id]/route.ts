import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { finalizeLoginForPhone } from "@/lib/auth";
import { callcheckStatus } from "@/lib/smsru";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const pending = await prisma.pendingAuth.findUnique({ where: { id } });
  if (!pending) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (pending.expiresAt < new Date()) {
    await prisma.pendingAuth.delete({ where: { id } });
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  if (pending.verified) {
    await finalizeLoginForPhone(pending.phone);
    await prisma.pendingAuth.delete({ where: { id: pending.id } });
    return NextResponse.json({ ok: true });
  }

  let status: Awaited<ReturnType<typeof callcheckStatus>>;
  try {
    status = await callcheckStatus(pending.checkId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("SMS_RU_API_ID")) {
      return NextResponse.json(
        { error: "Сервис подтверждения номера не настроен" },
        { status: 503 },
      );
    }
    throw e;
  }

  if (!status.ok) {
    return NextResponse.json({ error: status.error }, { status: 502 });
  }

  if (status.expired) {
    await prisma.pendingAuth.delete({ where: { id: pending.id } });
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  if (status.confirmed) {
    await finalizeLoginForPhone(pending.phone);
    await prisma.pendingAuth.delete({ where: { id: pending.id } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, pending: true });
}
