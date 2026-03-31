import { NextResponse } from "next/server";
import { AppointmentStatus, Role } from "@prisma/client";
import { getAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: admin.status });
  }

  try {
  const patientCount = await prisma.user.count({
    where: { role: Role.PATIENT },
  });

  const specialistTypeCount = await prisma.specialistType.count();

  const activeRequestsCount = await prisma.appointmentRequest.count({
    where: {
      status: {
        notIn: [AppointmentStatus.ARCHIVED, AppointmentStatus.CANCELLED],
      },
    },
  });

  const types = await prisma.specialistType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, iconKey: true },
  });

  const specialistCards = await Promise.all(
    types.map(async (t) => {
      const total = await prisma.appointmentRequest.count({
        where: { specialistTypeId: t.id },
      });
      const pending = await prisma.appointmentRequest.count({
        where: {
          specialistTypeId: t.id,
          status: {
            in: [AppointmentStatus.NEW, AppointmentStatus.AWAITING_PATIENT],
          },
        },
      });
      const hasUnprocessed = pending > 0;
      return {
        id: t.id,
        name: t.name,
        iconKey: t.iconKey,
        totalRequests: total,
        hasUnprocessed,
      };
    }),
  );

  return NextResponse.json({
    patientCount,
    specialistTypeCount,
    activeRequestsCount,
    specialistCards,
  });
  } catch (e) {
    console.error("overview", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
