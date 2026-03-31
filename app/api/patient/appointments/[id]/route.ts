import { NextResponse } from "next/server";
import { AppointmentStatus } from "@prisma/client";
import { getLkSession } from "@/lib/lk-session";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/** Отмена заявки пациентом (только своя заявка, статус NEW или AWAITING_PATIENT). */
export async function DELETE(_request: Request, { params }: Params) {
  const lk = await getLkSession();
  if (!lk.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: lk.status });
  }

  const { id } = await params;

  const row = await prisma.appointmentRequest.findFirst({
    where: { id, userId: lk.userId },
  });
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (
    row.status !== AppointmentStatus.NEW &&
    row.status !== AppointmentStatus.AWAITING_PATIENT
  ) {
    return NextResponse.json({ error: "cannot_cancel" }, { status: 400 });
  }

  await prisma.appointmentRequest.update({
    where: { id },
    data: { status: AppointmentStatus.CANCELLED },
  });

  return NextResponse.json({ ok: true });
}
