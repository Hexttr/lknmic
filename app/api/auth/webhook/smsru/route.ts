import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function verifyToken(request: NextRequest): boolean {
  const secret = process.env.SMSRU_WEBHOOK_SECRET;
  if (!secret) return false;
  const q = request.nextUrl.searchParams.get("token");
  return q === secret;
}

/**
 * Webhook SMS.ru: укажите URL в настройках с параметрами ?token=...&check_id=...
 * (или настройте тот же секрет в query при поддержке со стороны SMS.ru).
 */
export async function GET(request: NextRequest) {
  if (!verifyToken(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 401 });
  }

  const checkId = request.nextUrl.searchParams.get("check_id");
  if (!checkId) {
    return NextResponse.json({ error: "check_id required" }, { status: 400 });
  }

  const pending = await prisma.pendingAuth.findUnique({
    where: { checkId },
  });
  if (!pending) {
    return NextResponse.json({ ok: true });
  }

  if (pending.expiresAt < new Date()) {
    await prisma.pendingAuth.delete({ where: { id: pending.id } });
    return NextResponse.json({ ok: true });
  }

  await prisma.pendingAuth.update({
    where: { id: pending.id },
    data: { verified: true },
  });

  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
