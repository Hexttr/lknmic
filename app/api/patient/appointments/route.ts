import { NextRequest, NextResponse } from "next/server";
import { getLkSession } from "@/lib/lk-session";
import { prisma } from "@/lib/prisma";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

export async function POST(request: NextRequest) {
  const lk = await getLkSession();
  if (!lk.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: lk.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const specialistTypeId = String(
    (body as { specialistTypeId?: unknown }).specialistTypeId ?? "",
  ).trim();
  const date = String((body as { date?: unknown }).date ?? "").trim();
  const timeSlot = String((body as { time?: unknown }).time ?? "").trim();

  if (!specialistTypeId) {
    return NextResponse.json({ error: "Выберите специалиста" }, { status: 400 });
  }
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: "Некорректная дата" }, { status: 400 });
  }
  if (!TIME_RE.test(timeSlot)) {
    return NextResponse.json({ error: "Некорректное время" }, { status: 400 });
  }

  const spec = await prisma.specialistType.findUnique({
    where: { id: specialistTypeId },
  });
  if (!spec) {
    return NextResponse.json({ error: "Специалист не найден" }, { status: 400 });
  }

  const created = await prisma.appointmentRequest.create({
    data: {
      userId: lk.userId,
      specialistTypeId,
      date,
      timeSlot,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: created.id });
}
