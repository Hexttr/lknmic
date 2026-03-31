import { NextRequest, NextResponse } from "next/server";
import { AppointmentStatus } from "@prisma/client";
import {
  APPOINTMENT_HOURLY_SLOTS,
  filterSlotsForAppointmentDate,
  isValidHourlySlot,
} from "@/lib/appointment-slots";
import { getLkSession } from "@/lib/lk-session";
import { prisma } from "@/lib/prisma";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Активные заявки пациента (для ЛК и формы записи). */
export async function GET() {
  const lk = await getLkSession();
  if (!lk.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: lk.status });
  }

  const appointments = await prisma.appointmentRequest.findMany({
    where: {
      userId: lk.userId,
      status: {
        in: [AppointmentStatus.NEW, AppointmentStatus.AWAITING_PATIENT],
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      specialistType: { select: { name: true, iconKey: true } },
    },
  });

  return NextResponse.json({ appointments });
}

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
  const timeSlot = String((body as { timeSlot?: unknown }).timeSlot ?? (body as { time?: unknown }).time ?? "").trim();

  if (!specialistTypeId) {
    return NextResponse.json({ error: "Выберите специалиста" }, { status: 400 });
  }
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: "Некорректная дата" }, { status: 400 });
  }
  if (!isValidHourlySlot(timeSlot)) {
    return NextResponse.json({ error: "Некорректный интервал времени" }, { status: 400 });
  }

  const allowedToday = filterSlotsForAppointmentDate(
    date,
    APPOINTMENT_HOURLY_SLOTS,
    new Date(),
  );
  if (!allowedToday.includes(timeSlot)) {
    return NextResponse.json(
      { error: "Это время уже недоступно. Выберите другой слот или дату." },
      { status: 400 },
    );
  }

  const spec = await prisma.specialistType.findUnique({
    where: { id: specialistTypeId },
  });
  if (!spec) {
    return NextResponse.json({ error: "Специалист не найден" }, { status: 400 });
  }

  const duplicateSameSpecialist = await prisma.appointmentRequest.findFirst({
    where: {
      userId: lk.userId,
      specialistTypeId,
      status: {
        in: [AppointmentStatus.NEW, AppointmentStatus.AWAITING_PATIENT],
      },
    },
  });
  if (duplicateSameSpecialist) {
    return NextResponse.json(
      {
        error:
          "У вас уже есть активная заявка к этому специалисту. Отмените её в личном кабинете или дождитесь обработки.",
      },
      { status: 400 },
    );
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
