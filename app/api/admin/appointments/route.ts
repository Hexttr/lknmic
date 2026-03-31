import { AppointmentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const admin = await getAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: admin.status });
  }

  const specialistId =
    request.nextUrl.searchParams.get("specialistId")?.trim() ?? "";
  const archivedParam = request.nextUrl.searchParams.get("archived")?.trim();
  const archivedOnly =
    archivedParam === "1" ||
    archivedParam?.toLowerCase() === "true";

  const orderParam = request.nextUrl.searchParams.get("order")?.trim().toLowerCase();
  const createdAtOrder = orderParam === "asc" ? "asc" : "desc";

  const rows = await prisma.appointmentRequest.findMany({
    where: {
      ...(specialistId ? { specialistTypeId: specialistId } : {}),
      ...(archivedOnly
        ? { status: AppointmentStatus.ARCHIVED }
        : { status: { not: AppointmentStatus.ARCHIVED } }),
    },
    orderBy: { createdAt: createdAtOrder },
    include: {
      user: { select: { phone: true } },
      specialistType: { select: { name: true, iconKey: true } },
    },
  });

  return NextResponse.json({ appointments: rows });
}
