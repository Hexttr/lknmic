import { NextResponse } from "next/server";
import { AppointmentStatus } from "@prisma/client";
import { getAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";

/** Количество заявок, ожидающих обработки (NEW и AWAITING_PATIENT). */
export async function GET() {
  const admin = await getAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: admin.status });
  }

  const count = await prisma.appointmentRequest.count({
    where: {
      status: {
        in: [AppointmentStatus.NEW, AppointmentStatus.AWAITING_PATIENT],
      },
    },
  });

  return NextResponse.json({ count });
}
